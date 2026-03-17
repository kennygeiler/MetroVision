import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DetectShotsPayload = {
  splits?: Array<{
    start?: unknown;
    end?: unknown;
    duration?: unknown;
  }>;
};

function roundTime(value: number) {
  return Number(value.toFixed(3));
}

function sanitizeFilename(filename: string) {
  const trimmed = path.basename(filename).trim() || "upload.mp4";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function runProcess(command: string, args: string[], cwd?: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
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

async function runShotDetection(videoPath: string) {
  const pythonBinary = process.env.SCENEDECK_PYTHON_BIN || "python3";
  const pipelineDir = path.join(process.cwd(), "pipeline");
  const exportPath = path.join(path.dirname(videoPath), "splits.json");
  const script = [
    "import contextlib",
    "import io",
    "import json",
    "from shot_detect import detect_and_export",
    `video_path = ${JSON.stringify(videoPath)}`,
    `export_path = ${JSON.stringify(exportPath)}`,
    "buffer = io.StringIO()",
    "with contextlib.redirect_stdout(buffer):",
    "    splits = detect_and_export(video_path, export_path)",
    "print(json.dumps({'splits': splits}))",
  ].join("\n");

  const { stdout } = await runProcess(pythonBinary, ["-c", script], pipelineDir);
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lastLine = lines.at(-1);

  if (!lastLine) {
    throw new Error("Shot detection did not return a result.");
  }

  const payload = JSON.parse(lastLine) as DetectShotsPayload;
  return Array.isArray(payload.splits) ? payload.splits : [];
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("video");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A video file upload is required." }, { status: 400 });
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Uploaded file must be a video." }, { status: 400 });
    }

    const sessionDir = path.join(tmpdir(), "scenedeck-review", randomUUID());
    await mkdir(sessionDir, { recursive: true });

    const filename = sanitizeFilename(file.name);
    const videoPath = path.join(sessionDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(videoPath, buffer);

    const splits = await runShotDetection(videoPath);
    const normalizedSplits = splits
      .map((split) => {
        const start = Number(split.start);
        const end = Number(split.end);
        const duration = Number(split.duration);

        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          return null;
        }

        return {
          start: roundTime(start),
          end: roundTime(end),
          duration: Number.isFinite(duration) ? roundTime(duration) : roundTime(end - start),
        };
      })
      .filter((split): split is NonNullable<typeof split> => split !== null);

    return NextResponse.json({
      videoPath,
      splits: normalizedSplits,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Shot detection failed. Confirm local ffmpeg, ffprobe, and Python dependencies are installed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
