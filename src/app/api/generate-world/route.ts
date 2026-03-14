import { NextRequest, NextResponse } from "next/server";
import { generateWorldFromUrl, pollOperation } from "@/lib/marble";

export async function POST(request: NextRequest) {
  try {
    const { photoUrl, displayName } = await request.json();

    if (!photoUrl) {
      return NextResponse.json(
        { error: "photoUrl is required" },
        { status: 400 }
      );
    }

    // Convert relative URL to absolute for the Marble API
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const absoluteUrl = photoUrl.startsWith("http")
      ? photoUrl
      : `${protocol}://${host}${photoUrl}`;

    const { operationId } = await generateWorldFromUrl(
      absoluteUrl,
      displayName || "Memory World"
    );

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
