import { NextResponse } from "next/server";

import { getPresignedUrl } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GET_EXPIRY_SEC = 86_400; // 24h — long enough for worker ingest / FFmpeg

/**
 * Keys from browser uploads follow `films/{slug}/source/{filename}` (see buildS3Key).
 * Reject traversal and weird paths so callers cannot presign arbitrary objects.
 */
function isAllowedSourceReuseKey(key: string): boolean {
  const k = key.trim();
  if (!k || k.length > 512 || k.includes("..") || k.startsWith("/")) return false;
  const parts = k.split("/");
  if (parts.length < 4) return false;
  if (parts[0] !== "films" || parts[2] !== "source") return false;
  const slug = parts[1]!;
  const file = parts.slice(3).join("/");
  if (!slug || !file) return false;
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) return false;
  if (!/^[a-zA-Z0-9._-]+$/.test(file)) return false;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { key?: string };
    const key = typeof body.key === "string" ? body.key.trim() : "";
    if (!key) {
      return NextResponse.json({ error: "key is required." }, { status: 400 });
    }
    if (!isAllowedSourceReuseKey(key)) {
      return NextResponse.json(
        { error: "Key must look like films/{slug}/source/{filename} (no path tricks)." },
        { status: 400 },
      );
    }

    const videoUrl = await getPresignedUrl(key, GET_EXPIRY_SEC);
    return NextResponse.json({ videoUrl, key, expiresIn: GET_EXPIRY_SEC });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to presign GET";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
