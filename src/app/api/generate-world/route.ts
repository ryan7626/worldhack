import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { generateWorldFromImageFile, generateWorldFromUrl, pollOperation } from "@/lib/marble";

export async function POST(request: NextRequest) {
  try {
    const { photoUrl, displayName } = await request.json();

    if (!photoUrl) {
      return NextResponse.json(
        { error: "photoUrl is required" },
        { status: 400 }
      );
    }

    let operationId: string;

    if (photoUrl.startsWith("http")) {
      // External URL — pass directly to Marble
      ({ operationId } = await generateWorldFromUrl(
        photoUrl,
        displayName || "Memory World"
      ));
    } else {
      // Local file — upload directly to Marble via media asset
      const filePath = path.join(process.cwd(), "public", photoUrl);
      const fileBuffer = await readFile(filePath);
      const fileName = path.basename(photoUrl);
      ({ operationId } = await generateWorldFromImageFile(
        fileBuffer,
        fileName,
        displayName || "Memory World"
      ));
    }

    // Poll for completion (with timeout for hackathon demo)
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds
      attempts++;

      try {
        const result = await pollOperation(operationId);
        if (result.done && result.world) {
          return NextResponse.json({
            worldUrl: result.world.worldMarbleUrl,
            worldId: result.world.id,
            caption: result.world.caption,
            thumbnailUrl: result.world.thumbnailUrl,
            panoramaUrl: result.world.panoramaUrl,
            splatUrl: result.world.splatUrls?.["500k"] || result.world.splatUrls?.full_res,
          });
        }
      } catch (pollError) {
        console.error("Poll error:", pollError);
      }
    }

    // Return the operation ID if we timeout
    return NextResponse.json({
      operationId,
      status: "still_generating",
      message: "World is still being generated. Use the operation ID to check status.",
    });
  } catch (error) {
    console.error("World generation error:", error);
    return NextResponse.json(
      {
        error: "World generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
