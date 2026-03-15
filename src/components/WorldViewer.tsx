"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneParams } from "@/app/api/scene-edit/route";

export interface WorldViewerHandle {
  applySceneEdit: (params: SceneParams) => void;
}

interface WorldViewerProps {
  worldUrl?: string;
  splatUrl?: string;
  splatUrls?: { "100k"?: string; "500k"?: string; full_res?: string };
  thumbnailUrl?: string;
  caption?: string;
  isGenerating?: boolean;
  fullscreen?: boolean;
}

// Global scene edit function — set by the active WorldViewer instance
export function applySceneEditGlobal(params: SceneParams) {
  const fn = (window as any).__applySceneEdit__;
  if (fn) fn(params);
  else console.error("No active WorldViewer to edit");
}

export function WorldViewer({
  worldUrl,
  splatUrl,
  splatUrls,
  thumbnailUrl,
  caption,
  isGenerating = false,
  fullscreen = false,
}: WorldViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadPhase, setLoadPhase] = useState<"init" | "low" | "medium" | "high" | "done">("init");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const hasSplat = splatUrl || splatUrls?.full_res || splatUrls?.["500k"] || splatUrls?.["100k"];
    if (!hasSplat || !containerRef.current) return;

    let cancelled = false;
    let cleanupFn: (() => void) | undefined;

    async function initSplatRenderer() {
      try {
        const THREE = await import("three");
        const { SparkRenderer, SplatMesh } = await import("@sparkjsdev/spark");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

        if (cancelled) return;

        const container = containerRef.current!;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        // Camera
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(0, 0, 0);

        // WebGL renderer — antialias OFF per Spark docs (multisampling doesn't
        // improve splat rendering and adds significant overhead)
        const glRenderer = new THREE.WebGLRenderer({
          powerPreference: "high-performance",
          antialias: false,
        });
        glRenderer.setSize(width, height);
        // Cap pixel ratio at 2 to avoid excessive GPU cost on high-DPI screens
        glRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(glRenderer.domElement);

        // SparkRenderer — handles sorting, accumulation, and drawing of all
        // SplatMesh instances in a single optimized instanced draw call
        const spark = new SparkRenderer({
          renderer: glRenderer,
          maxStdDev: Math.sqrt(8),
          maxPixelRadius: 512,
          clipXY: 1.4,
          falloff: 1.0,
          focalAdjustment: 1.0,
        });
        scene.add(spark);

        // Controls
        const controls = new OrbitControls(camera, glRenderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.target.set(0, 0, -1);
        controls.update();

        // Ambient light for scene edit compatibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        // Track the current active splat mesh for scene edits
        let activeSplats: InstanceType<typeof SplatMesh> | null = null;

        // Store original values for reset
        const originalBg = new THREE.Color(0x000000);
        const originalLightColor = ambientLight.color.clone();
        const originalLightIntensity = ambientLight.intensity;

        // --- Progressive Loading ---
        // Load splats in order: 100k (dots) → 500k (medium) → full_res (final)
        // Each replaces the previous for a smooth refinement effect

        function loadSplatMesh(url: string): Promise<InstanceType<typeof SplatMesh>> {
          return new Promise((resolve, reject) => {
            let loaded = false;
            const mesh: InstanceType<typeof SplatMesh> = new SplatMesh({
              url,
              onLoad: () => { loaded = true; resolve(mesh); },
            });
            mesh.maxSh = 3;
            mesh.updateGenerator();
            mesh.position.set(0, 0, 0);
            mesh.quaternion.set(1, 0, 0, 0);
            setTimeout(() => { if (!loaded) reject(new Error(`Timeout loading ${url}`)); }, 120000);
          });
        }

        function swapSplats(newMesh: InstanceType<typeof SplatMesh>) {
          if (activeSplats) {
            scene.remove(activeSplats);
            activeSplats.dispose();
          }
          scene.add(newMesh);
          activeSplats = newMesh;
        }

        // Build load queue from available URLs (low → med → high)
        const loadQueue: { url: string; phase: "low" | "medium" | "high" }[] = [];

        const url100k = splatUrls?.["100k"];
        const url500k = splatUrls?.["500k"];
        const urlFull = splatUrls?.full_res;

        if (url100k) loadQueue.push({ url: url100k, phase: "low" });
        if (url500k) loadQueue.push({ url: url500k, phase: "medium" });
        if (urlFull) loadQueue.push({ url: urlFull, phase: "high" });

        // If we only have a single splatUrl (no variants), use it directly
        if (loadQueue.length === 0 && splatUrl) {
          loadQueue.push({ url: splatUrl, phase: "high" });
        }

        // Load progressively
        (async () => {
          for (const { url, phase } of loadQueue) {
            if (cancelled) return;
            try {
              const mesh = await loadSplatMesh(url);
              if (cancelled) {
                mesh.dispose();
                return;
              }
              swapSplats(mesh);
              setLoadPhase(phase);
            } catch (err) {
              console.warn(`Failed to load ${phase} splat:`, err);
              // Continue to next resolution if available
            }
          }
          if (!cancelled) setLoadPhase("done");
        })();

        // Register global scene edit function
        (window as any).__applySceneEdit__ = (params: SceneParams) => {
          if (!activeSplats) return;

          const isReset = params.description?.toLowerCase().includes("reset") ||
                          params.description?.toLowerCase().includes("default");

          if (isReset) {
            scene.background = originalBg.clone();
            ambientLight.color.copy(originalLightColor);
            ambientLight.intensity = originalLightIntensity;
            activeSplats.recolor = new THREE.Color(1, 1, 1);
            activeSplats.opacity = 1.0;
            scene.fog = null;
            return;
          }

          const [br, bg, bb] = params.backgroundColor;
          (scene.background as InstanceType<typeof THREE.Color>).setRGB(br / 255, bg / 255, bb / 255);

          const [lr, lg, lb] = params.ambientLightColor;
          ambientLight.color.setRGB(lr / 255, lg / 255, lb / 255);
          ambientLight.intensity = params.ambientLightIntensity;

          if (params.splatTint) {
            const [sr, sg, sb] = params.splatTint;
            activeSplats.recolor = new THREE.Color(sr / 255, sg / 255, sb / 255);
          } else {
            activeSplats.recolor = new THREE.Color(1, 1, 1);
          }

          activeSplats.opacity = params.splatOpacity;

          if (params.fogColor && params.fogDensity > 0) {
            const [fr, fg, fb] = params.fogColor;
            scene.fog = new THREE.FogExp2(
              new THREE.Color(fr / 255, fg / 255, fb / 255).getHex(),
              params.fogDensity
            );
          } else {
            scene.fog = null;
          }
        };

        // Render loop
        glRenderer.setAnimationLoop(() => {
          controls.update();
          glRenderer.render(scene, camera);
        });

        // Handle resize
        const handleResize = () => {
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          glRenderer.setSize(w, h);
        };
        window.addEventListener("resize", handleResize);

        cleanupFn = () => {
          window.removeEventListener("resize", handleResize);
          glRenderer.setAnimationLoop(null);
          if (activeSplats) {
            scene.remove(activeSplats);
            activeSplats.dispose();
          }
          scene.remove(spark);
          glRenderer.dispose();
          const canvas = container.querySelector("canvas");
          if (canvas) canvas.remove();
          (window as any).__applySceneEdit__ = null;
        };
      } catch (err) {
        console.error("SparkJS renderer failed:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load 3D world");
      }
    }

    initSplatRenderer();

    return () => {
      cancelled = true;
      if (cleanupFn) cleanupFn();
      else {
        // Fallback cleanup if init didn't finish
        const container = containerRef.current;
        if (container) {
          const canvas = container.querySelector("canvas");
          if (canvas) canvas.remove();
        }
        (window as any).__applySceneEdit__ = null;
      }
    };
  }, [splatUrl, splatUrls]);

  if (isGenerating) {
    return (
      <div className="relative border border-slate-100 bg-white/50 backdrop-blur-sm aspect-video flex items-center justify-center">
        <div className="text-center space-y-8 max-w-xs px-6">
          <div className="text-xs uppercase tracking-widest text-primary font-bold animate-pulse">
            Reconstructing...
          </div>
          <div className="h-px w-full bg-slate-100 overflow-hidden">
             <div className="h-full bg-primary w-1/3 animate-shimmer shadow-[0_0_10px_rgba(230,126,34,0.5)]" />
          </div>
        </div>
      </div>
    );
  }

  const hasSplat = splatUrl || splatUrls?.full_res || splatUrls?.["500k"] || splatUrls?.["100k"];
  if (!worldUrl && !hasSplat) {
    return (
      <div className="border border-dashed border-slate-300 bg-white aspect-video flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-6">
          <p className="text-xs uppercase tracking-widest text-muted font-bold">Awaiting Recall</p>
        </div>
      </div>
    );
  }

  const sizeClass = fullscreen ? "w-full h-full" : "aspect-video w-full";
  const isLoading = loadPhase === "init";

  return (
    <div className={`relative border border-slate-100 bg-black group ${fullscreen ? "w-full h-full border-none" : ""}`}>
      {/* 3D splat renderer container */}
      <div ref={containerRef} className={sizeClass}>
        {/* Show thumbnail while initial splat loads */}
        {isLoading && !loadError && thumbnailUrl && (
          <div className="w-full h-full relative">
            <img src={thumbnailUrl} alt="World preview" className="w-full h-full object-cover grayscale-50" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">Loading world...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error fallback */}
        {loadError && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8 relative">
            {thumbnailUrl && (
              <img src={thumbnailUrl} alt="World preview" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" />
            )}
            <p className="text-xs uppercase tracking-widest text-red-600 font-bold relative z-10">{loadError}</p>
            {worldUrl && (
              <a
                href={worldUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 px-8 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary-dark shadow-xl shadow-primary/20 transition-all"
              >
                Open in Marble
              </a>
            )}
          </div>
        )}
      </div>

      {/* Progressive loading indicator */}
      {loadPhase !== "init" && loadPhase !== "done" && (
        <div className="absolute bottom-4 left-4 z-10">
          <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold">
            {loadPhase === "low" ? "Loading detail..." : loadPhase === "medium" ? "Enhancing..." : "Finalizing..."}
          </p>
        </div>
      )}

      {worldUrl && !fullscreen && (
        <div className="absolute bottom-6 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={worldUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-primary-dark transition-all border border-primary/20"
          >
            Expand View
          </a>
        </div>
      )}
    </div>
  );
}
