import { NextResponse } from "next/server";

import { detectObjectsFromVideo } from "@/lib/object-detection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DetectObjectsRequest = {
  shotId?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DetectObjectsRequest;
    const shotId = typeof body.shotId === "string" ? body.shotId.trim() : "";

    if (!shotId) {
      return NextResponse.json({ error: "shotId is required." }, { status: 400 });
    }

    const tracks = await detectObjectsFromVideo(shotId);

    return NextResponse.json({
      shotId,
      trackCount: tracks.length,
      tracks,
    });
  } catch (error) {
    console.error("Failed to detect shot objects.", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Object detection failed.",
      },
      { status: 500 },
    );
  }
}
