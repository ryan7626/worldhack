"use client";

import type { PhotoMetadata } from "@/lib/types";
import Image from "next/image";

interface PhotoGalleryProps {
  photos: PhotoMetadata[];
  highlightedIds?: string[];
}

export function PhotoGallery({ photos, highlightedIds = [] }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="space-y-8 mt-12">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-xs uppercase tracking-widest text-muted font-bold">
          Cloud Archive ({photos.length})
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Live Stream</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
        {photos.map((photo) => {
          const isHighlighted = highlightedIds.includes(photo.id);
          const date = photo.dateTaken
            ? new Date(photo.dateTaken).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "Unknown Date";

          return (
            <div
              key={photo.id}
              className={`group flex flex-col gap-3 transition-all duration-500 ${
                isHighlighted ? "opacity-100 scale-[1.02]" : "hover:opacity-100"
              }`}
            >
              <div 
                className={`relative aspect-4/3 w-full overflow-hidden bg-white shadow-sm transition-all duration-500 ${
                  isHighlighted ? "border-2 border-primary ring-4 ring-primary/10" : "border border-slate-100"
                }`}
              >
                <Image
                  src={photo.url}
                  alt={photo.description || photo.originalName}
                  fill
                  className={`object-cover transition-all duration-1000 ${
                    isHighlighted ? "grayscale-0 scale-105" : "grayscale-50 group-hover:grayscale-0 group-hover:scale-105"
                  }`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                
                {/* Metadata Overlay on Hover */}
                <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-md p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 border-t border-slate-100">
                  <div className="space-y-2">
                    {photo.camera?.model && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted uppercase tracking-tighter font-bold">Device</span>
                        <span className="text-[9px] text-main font-bold truncate max-w-[100px]">{photo.camera.model}</span>
                      </div>
                    )}
                    {photo.width && photo.height && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted uppercase tracking-tighter font-bold">Resolution</span>
                        <span className="text-[9px] text-main font-bold">{photo.width} × {photo.height}</span>
                      </div>
                    )}
                    {photo.location?.latitude && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted uppercase tracking-tighter font-bold">Coordinates</span>
                        <span className="text-[9px] text-main font-bold truncate max-w-[100px]">
                          {photo.location.latitude.toFixed(3)}, {photo.location.longitude?.toFixed(3)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="px-1 flex justify-between items-baseline gap-4">
                <p className="text-[10px] text-main font-bold truncate uppercase tracking-widest flex-1">
                  {photo.originalName.replace(/\.[^/.]+$/, "")}
                </p>
                <span className="text-[9px] text-muted tracking-widest font-bold whitespace-nowrap">
                  {date}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
