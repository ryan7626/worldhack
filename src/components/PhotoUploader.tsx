"use client";

import { useCallback, useState, useRef } from "react";
import type { PhotoMetadata } from "@/lib/types";

interface PhotoUploaderProps {
  onPhotosUploaded: (photos: PhotoMetadata[]) => void;
}

export function PhotoUploader({ onPhotosUploaded }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        formData.append("photos", file);
      }

      try {
        const res = await fetch("/api/upload-photos", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        setUploadProgress(100);
        onPhotosUploaded(data.photos);
      } catch (error) {
        console.error("Upload failed:", error);
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    [onPhotosUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 p-8 text-center cursor-pointer ${
        isDragging
          ? "border-primary bg-primary/10 scale-[1.02]"
          : "border-surface-lighter hover:border-accent/50 hover:bg-surface-light/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      {uploading ? (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-accent">Uploading memories...</p>
          <div className="w-48 mx-auto h-2 bg-surface-lighter rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-lighter flex items-center justify-center">
            <svg
              className="w-8 h-8 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-medium text-white/90">
              Drop your memories here
            </p>
            <p className="text-sm text-white/50 mt-1">
              Upload photos from your life — we&apos;ll extract dates automatically
              from EXIF data
            </p>
          </div>
          <p className="text-xs text-white/30">
            JPG, PNG, HEIC supported
          </p>
        </div>
      )}
    </div>
  );
}
