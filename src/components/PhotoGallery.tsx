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
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
        Your Memories ({photos.length} photos)
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((photo) => {
          const isHighlighted = highlightedIds.includes(photo.id);
          const date = photo.dateTaken
            ? new Date(photo.dateTaken).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "No date";

          return (
            <div
              key={photo.id}
              className={`group relative aspect-square rounded-xl overflow-hidden transition-all duration-300 ${
                isHighlighted
                  ? "ring-2 ring-primary scale-105 shadow-lg shadow-primary/20"
                  : "hover:scale-105"
              }`}
            >
              <Image
                src={photo.url}
                alt={photo.description || photo.originalName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-xs text-white/90 truncate">
                    {photo.originalName}
                  </p>
                  <p className="text-xs text-white/60">{date}</p>
                </div>
              </div>
              {isHighlighted && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
