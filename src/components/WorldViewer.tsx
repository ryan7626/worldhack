"use client";

import { useEffect, useRef, useState } from "react";

interface WorldViewerProps {
  worldUrl?: string;
  splatUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  isGenerating?: boolean;
  fullscreen?: boolean;
}

export function WorldViewer({
  worldUrl,
  splatUrl,
  thumbnailUrl,
  caption,
  isGenerating = false,
  fullscreen = false,
}: WorldViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splatLoaded, setSplatLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const rendererInitialized = useRef(false);

  useEffect(() => {
    if (!splatUrl || !containerRef.current || rendererInitialized.current) return;

    let cleanup: (() => void) | undefined;

    async function initSplatRenderer() {
      try {
        const THREE = await import("three");
        const { SplatMesh } = await import("@sparkjsdev/spark");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const container = containerRef.current!;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfcfaf7); // Warm off-white background

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
          powerPreference: "high-performance",
          antialias: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.target.set(0, 0, -1);
        controls.update();

        // Place splat at origin with correct orientation
        const splats = new SplatMesh({
          url: splatUrl,
          onLoad: () => {
            setSplatLoaded(true);
          },
        });
        splats.maxSh = 3;
        splats.updateGenerator();
        splats.position.set(0, 0, 0);
        splats.quaternion.set(1, 0, 0, 0);
        scene.add(splats);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        rendererInitialized.current = true;

        renderer.setAnimationLoop(() => {
          controls.update();
          renderer.render(scene, camera);
        });

        const handleResize = () => {
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener("resize", handleResize);

        cleanup = () => {
          renderer.setAnimationLoop(null);
          window.removeEventListener("resize", handleResize);
          controls.dispose();
          splats.dispose();
          renderer.dispose();
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        console.error("SparkJS renderer failed:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load 3D world");
      }
    }

    initSplatRenderer();

    return () => cleanup?.();
  }, [splatUrl]);

  if (isGenerating) {
    return (
      <div className="relative border border-slate-100 bg-white/50 backdrop-blur-sm aspect-video flex items-center justify-center">
        <div className="text-center space-y-8 max-w-xs px-6">
          <div className="text-xs uppercase tracking-widest text-primary font-bold animate-pulse">
            Reconstructing...
          </div>
          <div className="h-px w-full bg-slate-100 overflow-hidden">
             <div className="h-full bg-primary w-1/3 animate-shimmer shadow-[0_0_10px_rgba(230,126,34,0.4)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!worldUrl && !splatUrl) {
    return (
      <div className="border border-dashed border-slate-300 bg-white aspect-video flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-6">
          <p className="text-xs uppercase tracking-widest text-muted font-bold">Awaiting Recall</p>
        </div>
      </div>
    );
  }

  const shortCaption = caption
    ? caption.split(". ").slice(0, 2).join(". ") + "."
    : undefined;

  const sizeClass = fullscreen ? "w-full h-full" : "aspect-video w-full";

  return (
    <div className={`relative border border-slate-100 bg-white group ${fullscreen ? "w-full h-full border-none" : ""}`}>


      {/* 3D splat renderer container */}
      <div ref={containerRef} className={sizeClass}>
        {/* Show thumbnail while splat loads */}
        {!splatLoaded && !loadError && thumbnailUrl && (
          <div className="w-full h-full relative">
            <img src={thumbnailUrl} alt="World preview" className="w-full h-full object-cover grayscale-50" />
            <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
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
