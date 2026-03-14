"use client";

import { useState, useEffect, useCallback } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { VoiceInterface } from "@/components/VoiceInterface";
import { WorldViewer } from "@/components/WorldViewer";
import type { PhotoMetadata } from "@/lib/types";

type AppView = "upload" | "main";

export default function Home() {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [view, setView] = useState<AppView>("upload");
  const [worldUrl, setWorldUrl] = useState<string | undefined>();
  const [splatUrl, setSplatUrl] = useState<string | undefined>();
  const [worldCaption, setWorldCaption] = useState<string | undefined>();
  const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
  const [highlightedPhotoIds, setHighlightedPhotoIds] = useState<string[]>([]);

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
  }, []);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Memory Reliver</h1>
              <p className="text-xs text-white/40">Powered by Marble AI + LiveKit</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setView("upload")}
              className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                view === "upload"
                  ? "bg-primary/20 text-primary"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setView("main")}
              className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                view === "main"
                  ? "bg-primary/20 text-primary"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Relive
            </button>
            {photos.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-surface-lighter text-xs text-white/50">
                {photos.length} memories
              </span>
            )}
          </nav>
        </div>
      </header>

      <div className="pt-24 pb-12 px-6">
        {view === "upload" ? (
          /* Upload View */
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-accent to-primary bg-clip-text text-transparent">
                Upload Your Memories
              </h2>
              <p className="text-white/50 max-w-lg mx-auto">
                Drop in photos from your life. We&apos;ll read the dates from EXIF data
                and make them searchable by voice.
              </p>
            </div>

            <PhotoUploader onPhotosUploaded={handlePhotosUploaded} />

            <PhotoGallery photos={photos} />

            {photos.length > 0 && (
              <div className="text-center">
                <button
                  onClick={() => setView("main")}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-medium hover:scale-105 transition-transform"
                >
                  Start Reliving Memories
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Main Experience View */
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[70vh]">
              {/* Left: Voice Interface + Photos */}
              <div className="space-y-8">
                <div className="glass rounded-2xl p-8">
                  <VoiceInterface onWorldGenerated={handleWorldGenerated} />
                </div>

                {/* Transcript / suggestions */}
                <div className="glass rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
                    Try saying...
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
                        className="px-4 py-3 rounded-xl bg-surface-lighter/50 text-sm text-white/60 hover:text-white/80 transition-colors cursor-default"
                      >
                        &ldquo;{suggestion}&rdquo;
                      </div>
                    ))}
                  </div>
                </div>

                {photos.length > 0 && (
                  <PhotoGallery photos={photos} highlightedIds={highlightedPhotoIds} />
                )}
              </div>

              {/* Right: World Viewer */}
              <div className="space-y-6">
                <WorldViewer
                  worldUrl={worldUrl}
                  splatUrl={splatUrl}
                  caption={worldCaption}
                  isGenerating={isGeneratingWorld}
                />

                {/* World generation controls */}
                {!worldUrl && !isGeneratingWorld && photos.length > 0 && (
                  <div className="glass rounded-2xl p-6 text-center space-y-3">
                    <p className="text-sm text-white/50">
                      Ask the voice agent about a memory, or click a photo to generate
                      a 3D world from it
                    </p>
                  </div>
                )}

                {/* Manual world generation for demo */}
                {photos.length > 0 && !isGeneratingWorld && (
                  <div className="glass rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
                      Quick Generate
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.slice(0, 6).map((photo) => (
                        <button
                          key={photo.id}
                          onClick={async () => {
                            setIsGeneratingWorld(true);
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
                              if (data.worldUrl) {
                                handleWorldGenerated(data.worldUrl, data.splatUrl);
                                if (data.caption) setWorldCaption(data.caption);
                              }
                            } catch (err) {
                              console.error("World generation failed:", err);
                              setIsGeneratingWorld(false);
                            }
                          }}
                          className="relative aspect-square rounded-xl overflow-hidden group hover:ring-2 hover:ring-primary transition-all"
                        >
                          <img
                            src={photo.url}
                            alt={photo.originalName}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
