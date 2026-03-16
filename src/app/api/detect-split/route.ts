import { constants } from "node:fs";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DetectSplitRequest = {
  sourcePath?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

type DetectRegionPayload = {
  cuts?: Array<{
    time?: unknown;
    confidence?: unknown;
  }>;
};

function roundTime(value: number) {
  return Number(value.toFixed(3));
}

function runProcess(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(stderr.trim() || `${command} exited with code ${code ?? "unknown"}.`),
      );
    });
  });
}

function parseRequestBody(body: DetectSplitRequest) {
  const sourcePath =
    typeof body.sourcePath === "string" ? body.sourcePath.trim() : "";
  const startTime = Number(body.startTime);
  const endTime = Number(body.endTime);

  if (!sourcePath) {
    throw new Error("A local sourcePath is required for split detection.");
  }

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    throw new Error("startTime and endTime must be finite numbers.");
  }

  if (endTime <= startTime) {
    throw new Error("endTime must be greater than startTime.");
  }

  return {
    sourcePath: path.resolve(sourcePath),
    startTime: Math.max(0, startTime),
    endTime: Math.max(0, endTime),
  };
}

export async function POST(request: Request) {
  let tempDir: string | null = null;

  try {
    const payload = parseRequestBody((await request.json()) as DetectSplitRequest);
    await access(payload.sourcePath, constants.R_OK);

    tempDir = await mkdtemp(path.join(tmpdir(), "scenedeck-detect-"));
    const segmentPath = path.join(tempDir, "region.mp4");
    const duration = Math.max(0.05, payload.endTime - payload.startTime);

    await runProcess("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      payload.startTime.toFixed(3),
      "-t",
      duration.toFixed(3),
      "-i",
      payload.sourcePath,
      "-map",
      "0:v:0",
      "-an",
      "-sn",
      "-dn",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      segmentPath,
    ]);

    const pythonBinary = process.env.SCENEDECK_PYTHON_BIN || "python3";
    const scriptPath = path.join(process.cwd(), "pipeline", "detect_region.py");
    const { stdout } = await runProcess(pythonBinary, [scriptPath, segmentPath]);

    const detection = JSON.parse(stdout) as DetectRegionPayload;
    const cuts = Array.isArray(detection.cuts)
      ? detection.cuts
          .map((cut) => ({
            time: roundTime(payload.startTime + Number(cut.time)),
            confidence: Number(cut.confidence),
          }))
          .filter(
            (cut) =>
              Number.isFinite(cut.time) &&
              Number.isFinite(cut.confidence) &&
              cut.time > payload.startTime &&
              cut.time < payload.endTime,
          )
      : [];

    return NextResponse.json({ cuts });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Split detection failed. Confirm local ffmpeg and Python dependencies are installed.";
    const status =
      error instanceof Error &&
      (message.includes("required") ||
        message.includes("must be") ||
        message.includes("greater than"))
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
