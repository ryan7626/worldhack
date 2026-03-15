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
  const [error, setError] = useState<string | null>(null);
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
        setError(null);
        const res = await fetch("/api/upload-photos", {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || `Upload failed (${res.status})`);
        }

        setUploadProgress(100);
        onPhotosUploaded(data.photos);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        console.error("Upload failed:", message);
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
      className={`relative border transition-all duration-300 p-6 text-center cursor-pointer ${
        isDragging
          ? "border-main bg-slate-50"
          : "border-dashed border-slate-300 hover:border-main hover:bg-slate-50"
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

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-[10px] uppercase tracking-widest">
          {error}
        </div>
      )}

      {uploading ? (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Uploading...</p>
          <div className="w-full h-[1px] bg-slate-100">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(230,126,34,0.5)]"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] text-muted uppercase tracking-widest font-medium">
            Drop photos here or click to upload
          </p>
          <button className="px-6 py-2.5 border border-primary text-primary text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-white transition-all">
            Add Photos
          </button>
        </div>
      )}

    </div>
  );
}

