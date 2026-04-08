import { existsSync } from "node:fs";

import ffmpegStatic from "ffmpeg-static";

import ffprobePkg from "ffprobe-static";

/**
 * Shown when spawn() fails with ENOENT so logs point to setup instead of a raw stack trace.
 */
export const FFMPEG_SPAWN_ENOENT_HINT =
  "FFmpeg/ffprobe not found. On macOS: brew install ffmpeg. On Linux: apt install ffmpeg (includes ffprobe). " +
  "Or set FFMPEG_PATH / FFPROBE_PATH to absolute binary paths. " +
  "Vercel serverless has no system ffmpeg — point NEXT_PUBLIC_WORKER_URL at the TS worker or a host with ffmpeg. " +
  "After install, run `pnpm exec node node_modules/ffmpeg-static/install.js` if the bundled ffmpeg binary is missing (pnpm may skip dependency scripts until approved).";

export function getFfmpegPath(): string {
  const env = process.env.FFMPEG_PATH?.trim();
  if (env) return env;
  if (typeof ffmpegStatic === "string" && ffmpegStatic.length > 0 && existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return "ffmpeg";
}

export function getFfprobePath(): string {
  const env = process.env.FFPROBE_PATH?.trim();
  if (env) return env;
  const bundled = ffprobePkg.path;
  if (bundled.length > 0 && existsSync(bundled)) return bundled;
  return "ffprobe";
}
