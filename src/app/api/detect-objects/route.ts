import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import {
  detectObjectsFromImageBuffer,
  fetchAssetBuffer,
  replaceShotObjects,
} from "@/lib/object-detection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DetectObjectsRequest = {
  shotId?: unknown;
};

function runProcess(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `${command} exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function extractKeyframeFromVideoBuffer(videoBuffer: Buffer, midpoint: number) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "scenedeck-detect-"));
  const inputPath = path.join(tempDir, "input.mp4");
  const outputPath = path.join(tempDir, "frame.jpg");

  try {
    await writeFile(inputPath, videoBuffer);
    await runProcess("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      midpoint.toFixed(3),
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      outputPath,
    ]);

    const frameBuffer = Buffer.from(await readFile(outputPath));
    return {
      buffer: frameBuffer,
      contentType: "image/jpeg",
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DetectObjectsRequest;
    const shotId = typeof body.shotId === "string" ? body.shotId.trim() : "";

    if (!shotId) {
      return NextResponse.json({ error: "shotId is required." }, { status: 400 });
    }

    const [shot] = await db
      .select({
        id: schema.shots.id,
        startTc: schema.shots.startTc,
        endTc: schema.shots.endTc,
        duration: schema.shots.duration,
        videoUrl: schema.shots.videoUrl,
        thumbnailUrl: schema.shots.thumbnailUrl,
      })
      .from(schema.shots)
      .where(eq(schema.shots.id, shotId))
      .limit(1);

    if (!shot) {
      return NextResponse.json({ error: "Shot not found." }, { status: 404 });
    }

    if (!shot.thumbnailUrl && !shot.videoUrl) {
      return NextResponse.json(
        { error: "Shot does not have a thumbnail or video asset." },
        { status: 400 },
      );
    }

    const midpoint =
      typeof shot.startTc === "number" && typeof shot.endTc === "number"
        ? Number(((shot.startTc + shot.endTc) / 2).toFixed(3))
        : shot.duration ?? null;
    let imageAsset: { buffer: Buffer; contentType: string };

    if (shot.thumbnailUrl) {
      imageAsset = await fetchAssetBuffer(shot.thumbnailUrl);
    } else {
      const { buffer } = await fetchAssetBuffer(shot.videoUrl!);
      imageAsset = await extractKeyframeFromVideoBuffer(buffer, midpoint ?? 0);
    }

    const objects = await detectObjectsFromImageBuffer(
      imageAsset.buffer,
      imageAsset.contentType,
    );
    const storedObjects = await replaceShotObjects(shot.id, objects, midpoint);

    return NextResponse.json({
      shotId: shot.id,
      objectCount: storedObjects.length,
      objects: storedObjects,
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
