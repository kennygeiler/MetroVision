import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { NextResponse } from "next/server";

import { rejectIfUploadRouteGated } from "@/lib/upload-route-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Pro/Enterprise: **800s**; Hobby: use **300**. */
export const maxDuration = 800;

const UPLOAD_DIR = path.join(tmpdir(), "metrovision-uploads");

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024;

function maxUploadBytes(): number {
  const raw = process.env.METROVISION_UPLOAD_MAX_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_BYTES;
}

export async function POST(request: Request) {
  const gated = rejectIfUploadRouteGated(request);
  if (gated) return gated;

  try {
    const formData = await request.formData();
    const file = formData.get("video");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No video file provided." },
        { status: 400 },
      );
    }

    const limit = maxUploadBytes();
    if (file.size > limit) {
      return NextResponse.json(
        { error: `File exceeds maximum size (${limit} bytes).` },
        { status: 413 },
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(UPLOAD_DIR, `${Date.now()}-${sanitizedName}`);

    // Stream the file to disk instead of buffering in memory
    const webStream = file.stream();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeReadable = Readable.fromWeb(webStream as any);
    const writeStream = createWriteStream(filePath);
    await pipeline(nodeReadable, writeStream);

    return NextResponse.json({
      videoPath: filePath,
      fileName: file.name,
      size: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
