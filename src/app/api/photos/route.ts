import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { PhotoMetadata } from "@/lib/types";

// Helper to map DB record to PhotoMetadata interface
function mapPhotoRecord(record: any): PhotoMetadata {
  return {
    id: record.id,
    filename: record.filename,
    originalName: record.original_name,
    dateTaken: record.date_taken,
    description: record.description || "",
    tags: record.tags || [],
    width: record.width,
    height: record.height,
    location: {
      latitude: record.latitude,
      longitude: record.longitude,
      name: record.location_name
    },
    camera: {
      make: record.camera_make,
      model: record.camera_model
    },
    uploadedAt: record.uploaded_at,
    url: record.storage_url
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const id = searchParams.get("id");

  try {
    // 1. Get by ID
    if (id) {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      }
      return NextResponse.json({ photo: mapPhotoRecord(data) });
    }

    // 2. Search by Text/Date
    if (query) {
      // Basic text search across multiple columns
      // Note: For more advanced searching, we could use PG full-text search 
      // but ilike works for initial queries.
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .or(`original_name.ilike.%${query}%,description.ilike.%${query}%,location_name.ilike.%${query}%`)
        .order("date_taken", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ photos: (data || []).map(mapPhotoRecord) });
    }

    // 3. Get All
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("date_taken", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ photos: (data || []).map(mapPhotoRecord) });

  } catch (error) {
    console.error("Photos API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
