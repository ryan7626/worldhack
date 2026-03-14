"use client";

import { useEffect, useRef, useState } from "react";

interface WorldViewerProps {
  worldUrl?: string;
  splatUrl?: string;
  caption?: string;
  isGenerating?: boolean;
}

export function WorldViewer({
  worldUrl,
  splatUrl,
  caption,
  isGenerating = false,
}: WorldViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [useIframe, setUseIframe] = useState(true);
  const rendererInitialized = useRef(false);

  // Try SparkJS renderer for splat URLs, fallback to iframe for worldUrl
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
        scene.background = new THREE.Color(0x0f0f1a);

        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 1, 3);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;

        const splats = new SplatMesh({ url: splatUrl });
        scene.add(splats);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        let animating = true;
        function animate() {
          if (!animating) return;
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        }
        animate();

        const handleResize = () => {
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener("resize", handleResize);

        setUseIframe(false);
        rendererInitialized.current = true;

        cleanup = () => {
          animating = false;
          window.removeEventListener("resize", handleResize);
          renderer.dispose();
          container.removeChild(renderer.domElement);
        };
      } catch (err) {
        console.warn("SparkJS renderer failed, falling back to iframe:", err);
        setUseIframe(true);
      }
    }

    initSplatRenderer();

    return () => cleanup?.();
  }, [splatUrl]);

  if (isGenerating) {
    return (
      <div className="relative rounded-2xl overflow-hidden glass aspect-video flex items-center justify-center">
        <div className="text-center space-y-6">
          {/* Animated orb */}
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent opacity-30 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary to-accent opacity-50 animate-float" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-accent animate-float" style={{ animationDelay: "0.5s" }} />
          </div>
          <div>
            <p className="text-lg font-medium text-white/90">
              Generating your memory world...
            </p>
            <p className="text-sm text-white/50 mt-1">
              Marble AI is transforming your photo into an explorable 3D environment
            </p>
          </div>
          <div className="flex justify-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1.5 h-8 bg-primary/60 rounded-full voice-bar"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!worldUrl && !splatUrl) {
    return (
      <div className="rounded-2xl glass aspect-video flex items-center justify-center">
        <div className="text-center space-y-3 text-white/40">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <p className="text-sm">Your 3D memory world will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden glass">
      {caption && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="glass rounded-xl px-4 py-2">
            <p className="text-sm text-white/80">{caption}</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="aspect-video w-full">
        {useIframe && worldUrl && (
          <iframe
            src={worldUrl}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
          />
        )}
      </div>

      {worldUrl && (
        <div className="absolute bottom-4 right-4 z-10">
          <a
            href={worldUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass rounded-xl px-4 py-2 text-xs text-white/70 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Marble
          </a>
        </div>
      )}
    </div>
  );
}
