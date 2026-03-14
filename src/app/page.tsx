"use client";

import { useState, useEffect, useCallback } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { VoiceInterface } from "@/components/VoiceInterface";
import { WorldViewer, applySceneEditGlobal } from "@/components/WorldViewer";
import { SceneEditBar } from "@/components/SceneEditBar";
import { NetworkBackground } from "@/components/NetworkBackground";
import type { PhotoMetadata } from "@/lib/types";

type AppView = "upload" | "main";

export default function Home() {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [view, setView] = useState<AppView>("upload");
  const [worldUrl, setWorldUrl] = useState<string | undefined>();
  const [splatUrl, setSplatUrl] = useState<string | undefined>();
  const [worldCaption, setWorldCaption] = useState<string | undefined>();
  const [worldThumbnail, setWorldThumbnail] = useState<string | undefined>();
  const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [highlightedPhotoIds, setHighlightedPhotoIds] = useState<string[]>([]);
  const [showLightbox, setShowLightbox] = useState(false);

  // Load existing photos on mount
  useEffect(() => {
    fetch("/api/photos")
      .then((res) => res.json())
      .then((data) => {
        if (data.photos?.length > 0) {
          setPhotos(data.photos);
        }
      })
      .catch(console.error);
  }, []);

  const handlePhotosUploaded = useCallback((newPhotos: PhotoMetadata[]) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  const handleWorldGenerated = useCallback((url: string, splat?: string) => {
    setWorldUrl(url);
    if (splat) setSplatUrl(splat);
    setIsGeneratingWorld(false);
    setShowLightbox(true);
  }, []);

  return (
    <main className="min-h-screen bg-transparent selection:bg-orange-100">
      <NetworkBackground />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent spatial-header __enableXr__">
        <div className="max-w-screen-2xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold tracking-widest text-primary uppercase">
              Memory Reliver
            </h1>
          </div>

          <nav className="flex items-center gap-6">
            <button
              onClick={() => setView("upload")}
              className={`text-xs tracking-widest uppercase transition-colors font-bold ${
                view === "upload"
                  ? "text-primary"
                  : "text-muted hover:text-primary"
              }`}
            >
              Add Photos
            </button>
            <button
              onClick={() => setView("main")}
              className={`text-xs tracking-widest uppercase transition-colors font-bold ${
                view === "main"
                  ? "text-primary"
                  : "text-muted hover:text-primary"
              }`}
            >
              Explore
            </button>
          </nav>
        </div>
      </header>

      <div className="pt-40 pb-20 px-6">
        {view === "upload" ? (
          /* Upload View */
          <div className="max-w-4xl mx-auto space-y-16">
            <div className="text-center space-y-6">
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-main">
                Gather your memories.
              </h2>
              <p className="text-xl text-muted max-w-2xl mx-auto font-light">
                Add photos from your life. We&apos;ll help you step back into them whenever you like.
              </p>
            </div>

                  <div className="bg-white/50 backdrop-blur-sm border border-slate-100 p-12 spatial-panel spatial-elevated __enableXr__">
              <PhotoUploader onPhotosUploaded={handlePhotosUploaded} />
            </div>

            {photos.length > 0 && (
              <div className="space-y-12">
                <PhotoGallery photos={photos} />
                
                <div className="text-center pt-12">
                  <button
                    onClick={() => setView("main")}
                    className="px-12 py-5 bg-primary text-white text-xs tracking-widest uppercase font-bold hover:bg-primary-dark transition-all hover:shadow-lg hover:shadow-primary/20"
                  >
                    Start Exploring
                  </button>
                </div>
              </div>
            )}
            
            {/* Minimal footer */}
            <div className="w-full text-center pt-32 pb-8">
               <p className="text-xs tracking-widest uppercase text-muted font-bold">
                 © 2026 — SYSTEM ALIVE
               </p>
            </div>
          </div>
        ) : (
          /* Main Experience View */
          <div className="max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[450px_1fr] gap-12 min-h-[75vh]">
              {/* Left Column: Voice Interface + Photos */}
              <div className="space-y-12 pr-4 xl:border-r border-slate-100">
                {/* Voice Card */}
                          <div className="bg-white/50 backdrop-blur-sm border border-slate-100 p-8 spatial-panel spatial-voice __enableXr__">
                  <VoiceInterface onWorldGenerated={handleWorldGenerated} />
                </div>

                {/* Suggestions Card */}
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-muted mb-6 font-bold">
                    Suggested Prompts
                  </h3>
                  <div className="space-y-2">
                    {[
                      "What was I doing on December 1st, 2009?",
                      "Show me my summer vacation photos",
                      "Take me back to my birthday party",
                      "Find photos from 2015",
                    ].map((suggestion, i) => (
                      <div
                        key={i}
                        className="py-3 border-b border-slate-50 text-sm text-main hover:text-primary transition-colors cursor-default"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini Gallery */}
                {photos.length > 0 && (
                  <div>
                    <PhotoGallery photos={photos} highlightedIds={highlightedPhotoIds} />
                  </div>
                )}
              </div>

              {/* Right Column: World Viewer */}
              <div className="space-y-12">
                <div className="sticky top-40">
                  {worldUrl || splatUrl ? (
                    <button
                      onClick={() => setShowLightbox(true)}
                      className="w-full relative overflow-hidden bg-white border border-slate-100 aspect-video group cursor-pointer shadow-sm"
                    >
                      {worldThumbnail ? (
                        <img src={worldThumbnail} alt="World preview" className="w-full h-full object-cover grayscale-50 group-hover:grayscale-0 transition-all duration-1000" />
                      ) : (
                        <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                           <span className="text-xs uppercase tracking-widest text-muted font-bold">World Ready</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="px-8 py-4 bg-primary text-white text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/40">
                          Step Into Memory
                        </div>
                      </div>
                    </button>
                  ) : (
                    <WorldViewer
                      isGenerating={isGeneratingWorld}
                    />
                  )}

                  {generationError && (
                    <div className="mt-8 border border-red-100 p-6 text-center bg-white/50 backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-widest font-bold text-red-600">{generationError}</p>
                      <button
                        onClick={() => setGenerationError(null)}
                        className="mt-4 text-[10px] tracking-widest uppercase text-red-600 hover:text-red-800 transition-colors font-bold underline underline-offset-4"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {!worldUrl && !isGeneratingWorld && photos.length > 0 && (
                    <div className="mt-8 text-center bg-white/30 p-4 border border-dashed border-slate-200">
                      <p className="text-xs text-muted font-bold uppercase tracking-widest">
                        Talk to the assistant to generate a world.
                      </p>
                    </div>
                  )}

                  {/* Manual world generation for demo */}
                              {photos.length > 0 && !isGeneratingWorld && (
                    <div className="mt-12 bg-white/50 backdrop-blur-sm p-8 border border-slate-100 spatial-panel-thin spatial-elevated __enableXr__">
                      <h3 className="text-xs uppercase tracking-widest text-primary mb-8 text-center font-bold">
                        Quick Generation Demo
                      </h3>
                      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {photos.slice(0, 16).map((photo) => (
                          <button
                            key={photo.id}
                            title={photo.originalName}
                            onClick={async () => {
                              setIsGeneratingWorld(true);
                              setGenerationError(null);
                              setHighlightedPhotoIds([photo.id]);
                              try {
                                const res = await fetch("/api/generate-world", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    photoUrl: photo.url,
                                    displayName: photo.description || photo.originalName,
                                  }),
                                });
                                const data = await res.json();
                                if (data.error) {
                                  setGenerationError(data.details || data.error);
                                  setIsGeneratingWorld(false);
                                } else if (data.worldUrl) {
                                  handleWorldGenerated(data.worldUrl, data.splatUrl);
                                  if (data.caption) setWorldCaption(data.caption);
                                  if (data.thumbnailUrl) setWorldThumbnail(data.thumbnailUrl);
                                } else {
                                  setGenerationError("Generation timed out. Try again.");
                                  setIsGeneratingWorld(false);
                                }
                              } catch (err) {
                                console.error("World generation failed:", err);
                                setGenerationError(err instanceof Error ? err.message : "Failed to generate world");
                                setIsGeneratingWorld(false);
                              }
                            }}
                            className="relative aspect-square overflow-hidden group hover:opacity-80 transition-opacity bg-slate-100 border border-slate-200"
                          >
                            <img
                              src={photo.url}
                              alt={photo.originalName}
                              className="w-full h-full object-cover filter grayscale-50 group-hover:grayscale-0 transition-all duration-700"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Minimal footer */}
            <div className="w-full text-center pt-24 pb-8">
               <p className="text-xs tracking-widest uppercase text-muted font-bold">
                 © 2026 — SYSTEM ALIVE
               </p>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      {showLightbox && (worldUrl || splatUrl) && (
        <div className="fixed inset-0 z-100 bg-(--bg-main) spatial-lightbox spatial-world __enableXr__">
          {/* Floating Controls */}
          <div className="absolute top-8 right-8 z-110 flex items-center gap-4 group/controls">
            {worldCaption && (
              <div className="relative group/info">
                <div className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all font-bold shadow-xl cursor-help">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                {/* Caption Popup */}
                <div className="absolute top-14 right-0 w-80 p-6 bg-white/95 backdrop-blur-xl border border-primary/20 shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all duration-300">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-black mb-3 border-b border-primary/10 pb-2">
                    Memory Reconstruction
                  </p>
                  <p className="text-xs text-main leading-relaxed tracking-wide font-medium italic">
                    "{worldCaption}"
                  </p>
                </div>
              </div>
            )}

            {worldUrl && (
              <a
                href={worldUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white/10 backdrop-blur-md border border-primary/20 text-xs text-primary font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-2 shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in Marble
              </a>
            )}
            <button
              onClick={() => setShowLightbox(false)}
              className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all font-bold shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>


          {/* Fullscreen world viewer */}
          <div className="w-full h-full relative">
            <WorldViewer
              worldUrl={worldUrl}
              splatUrl={splatUrl}
              thumbnailUrl={worldThumbnail}
              caption={worldCaption}
              isGenerating={false}
              fullscreen
            />
            <SceneEditBar
              onSceneEdit={applySceneEditGlobal}
            />
          </div>
        </div>
      )}

    </main>
  );
}
