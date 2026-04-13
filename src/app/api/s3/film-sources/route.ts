import { NextResponse } from "next/server";

import { listFilmSourceVideoKeys } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/s3/film-sources
 * Lists object keys for uploaded film sources (video files under `films/.../source/`).
 */
export async function GET() {
  try {
    const keys = await listFilmSourceVideoKeys(500);
    return NextResponse.json({ keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list S3 objects";
    return NextResponse.json({ keys: [] as string[], error: message }, { status: 200 });
  }
}
