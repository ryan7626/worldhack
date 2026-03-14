import { NextRequest, NextResponse } from "next/server";
import { generateWorldFromUrl, pollOperation } from "@/lib/marble";
import { enhancePrompt } from "@/lib/prompt-enhancer";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { photoUrl, displayName, photoId, metadata } = await request.json();

    if (!photoUrl) {
      return NextResponse.json(
        { error: "photoUrl is required" },
        { status: 400 }
      );
    }

    // Generate an enhanced text prompt from photo metadata
    let textPrompt: string | undefined;
    try {
      textPrompt = await enhancePrompt({
        dateTaken: metadata?.dateTaken,
        latitude: metadata?.latitude,
        longitude: metadata?.longitude,
        description: displayName,
        originalName: metadata?.originalName,
      });
      console.log("Enhanced prompt:", textPrompt);
    } catch (e) {
      console.warn("Prompt enhancement skipped:", e);
    }

    const { operationId } = await generateWorldFromUrl(
      photoUrl,
      displayName || "Memory World",
      textPrompt
    );

    // Initial record in worlds table
    if (photoId) {
      const { error: initialError } = await supabase
        .from("worlds")
        .insert([{
          display_name: displayName || "Memory World",
          world_marble_url: "",
          status: "generating",
          operation_id: operationId,
          source_photo_id: photoId
        }]);
      
      if (initialError) console.warn("Failed to create initial world record:", initialError);
    }

    // Poll for completion
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      try {
        const result = await pollOperation(operationId);
        if (result.done && result.world) {
          const splatUrl = result.world.splatUrls?.full_res || result.world.splatUrls?.["500k"];
          
          if (photoId) {
            await supabase
              .from("worlds")
              .update({
                world_marble_url: result.world.worldMarbleUrl,
                status: "completed",
                thumbnail_url: result.world.thumbnailUrl,
                panorama_url: result.world.panoramaUrl,
                caption: result.world.caption,
                asset_ids: result.world.splatUrls
              })
              .eq("operation_id", operationId);
          }

          return NextResponse.json({
            worldUrl: result.world.worldMarbleUrl,
            worldId: result.world.id,
            caption: result.world.caption,
            thumbnailUrl: result.world.thumbnailUrl,
            panoramaUrl: result.world.panoramaUrl,
            splatUrl: splatUrl,
          });
        }
      } catch (pollError) {
        console.error("Poll error:", pollError);
      }
    }

    return NextResponse.json({
      operationId,
      status: "still_generating",
    });
  } catch (error) {
    console.error("World generation error:", error);
    return NextResponse.json(
      { error: "World generation failed" },
      { status: 500 }
    );
  }
}
