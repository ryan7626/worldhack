import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { supabase } from "@/lib/supabase";
import type { PhotoMetadata } from "@/lib/types";
import path from "path";

const HEIC_EXTENSIONS = new Set([".heic", ".heif"]);

// Convert DMS array [degrees, minutes, seconds] to decimal
function toDecimal(dms: number | number[]): number {
  if (typeof dms === "number") return dms;
  if (Array.isArray(dms) && dms.length >= 3) {
    return dms[0] + dms[1] / 60 + dms[2] / 3600;
  }
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const uploaded: PhotoMetadata[] = [];

    for (const file of files) {
      const id = uuidv4();
      const originalExt = path.extname(file.name).toLowerCase() || ".jpg";
      let buffer = Buffer.from(await file.arrayBuffer() as any);

      // 1. Image Processing & Conversion
      const ext = HEIC_EXTENSIONS.has(originalExt) ? ".jpg" : originalExt;
      if (HEIC_EXTENSIONS.has(originalExt)) {
        buffer = await sharp(buffer).jpeg({ quality: 95 }).toBuffer();
      }

      // 2. Extract Metadata (EXIF + Sharp Fallbacks)
      let width: number | undefined;
      let height: number | undefined;
      try {
        const metadata = await sharp(buffer).metadata();
        width = metadata.width;
        height = metadata.height;
      } catch (e) {
        console.warn("Sharp metadata extraction failed for", file.name, e);
      }

      let dateTaken: string | null = null;
      let camera: { make?: string; model?: string } = {};
      let location: { latitude?: number; longitude?: number; name?: string } = {};

      try {
        const exifr = await import("exifr");
        const exifData = await exifr.default.parse(buffer, {
          pick: [
            "DateTimeOriginal", "CreateDate", "ModifyDate", 
            "GPSLatitude", "GPSLongitude",
            "GPSLatitudeRef", "GPSLongitudeRef",
            "Make", "Model"
          ],
        });

        if (exifData) {
          const dateField = exifData.DateTimeOriginal || exifData.CreateDate || exifData.ModifyDate;
          if (dateField) dateTaken = new Date(dateField).toISOString();
          
          if (exifData.Make || exifData.Model) {
            camera = { make: exifData.Make, model: exifData.Model };
          }

          if (exifData.GPSLatitude != null && exifData.GPSLongitude != null) {
            let lat = toDecimal(exifData.GPSLatitude);
            let lon = toDecimal(exifData.GPSLongitude);
            // Apply hemisphere sign: S = negative lat, W = negative lon
            if (exifData.GPSLatitudeRef === "S") lat = -lat;
            if (exifData.GPSLongitudeRef === "W") lon = -lon;
            location = { latitude: lat, longitude: lon };
          }
        }
      } catch (e) {
        console.warn("EXIF extraction failed for", file.name, e);
      }

      // Provided date override
      const providedDate = formData.get(`date_${file.name}`) as string | null;
      if (providedDate && !dateTaken) {
        dateTaken = new Date(providedDate).toISOString();
      }

      const description = (formData.get(`description_${file.name}`) as string) || "";
      const filename = `${id}${ext}`;

      // 3. Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from("memories")
        .upload(filename, buffer, {
          contentType: file.type === "image/heic" || file.type === "image/heif" ? "image/jpeg" : file.type,
          upsert: true
        });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from("memories")
        .getPublicUrl(filename);

      // 4. Save to Supabase Database
      const photoRecord = {
        id,
        filename,
        original_name: file.name,
        date_taken: dateTaken,
        description,
        width,
        height,
        latitude: location.latitude,
        longitude: location.longitude,
        storage_url: publicUrl,
        camera_make: camera.make,
        camera_model: camera.model,
        uploaded_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from("photos")
        .insert([photoRecord]);

      if (dbError) throw dbError;

      uploaded.push({
        id,
        filename,
        originalName: file.name,
        dateTaken,
        description,
        tags: [],
        width,
        height,
        location,
        camera,
        uploadedAt: photoRecord.uploaded_at,
        url: publicUrl
      });
    }

    return NextResponse.json({ photos: uploaded });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
