import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { arch as osArch, platform as osPlatform } from "node:os";
import path from "node:path";

import ffmpegStatic from "ffmpeg-static";

import ffprobePkg from "ffprobe-static";

const require = createRequire(import.meta.url);

/**
 * Shown when spawn() fails with ENOENT so logs point to setup instead of a raw stack trace.
 */
export const FFMPEG_SPAWN_ENOENT_HINT =
  "FFmpeg/ffprobe not found. On macOS: `brew install ffmpeg`. On Linux: `apt install ffmpeg`. " +
  "Or set `FFMPEG_PATH` and `FFPROBE_PATH` (or `FFMPEG_BIN` — same as ffmpeg-static) to absolute binary paths. " +
  "Ensure `pnpm install` ran `scripts/ensure-ffmpeg-static.cjs` so `node_modules/ffmpeg-static/ffmpeg` exists. " +
  "Vercel: binaries are bundled via `outputFileTracingIncludes` in next.config; if deploy still fails, set those env vars or use `NEXT_PUBLIC_WORKER_URL`.";

function ffmpegFromNodeModulesRoot(root: string): string | null {
  const name = osPlatform() === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const p = path.join(root, "node_modules", "ffmpeg-static", name);
  return existsSync(p) ? p : null;
}

function ffprobeFromNodeModulesRoot(root: string): string | null {
  const plat = osPlatform();
  const a = osArch();
  const name = plat === "win32" ? "ffprobe.exe" : "ffprobe";
  const p = path.join(root, "node_modules", "ffprobe-static", "bin", plat, a, name);
  return existsSync(p) ? p : null;
}

/** Resolves the real package dir (works with pnpm `.pnpm` layout). */
function ffmpegFromRequireResolve(): string | null {
  try {
    const pkg = require.resolve("ffmpeg-static/package.json");
    const dir = path.dirname(pkg);
    const name = osPlatform() === "win32" ? "ffmpeg.exe" : "ffmpeg";
    const p = path.join(dir, name);
    return existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

function ffprobeFromRequireResolve(): string | null {
  try {
    const pkg = require.resolve("ffprobe-static/package.json");
    const dir = path.dirname(pkg);
    const plat = osPlatform();
    const a = osArch();
    const name = plat === "win32" ? "ffprobe.exe" : "ffprobe";
    const p = path.join(dir, "bin", plat, a, name);
    return existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

export function getFfmpegPath(): string {
  const fromEnv = process.env.FFMPEG_PATH?.trim() || process.env.FFMPEG_BIN?.trim();
  if (fromEnv) return fromEnv;
  const resolved = ffmpegFromRequireResolve();
  if (resolved) return resolved;
  if (typeof ffmpegStatic === "string" && ffmpegStatic.length > 0 && existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  const cwd = process.cwd();
  const fallback = ffmpegFromNodeModulesRoot(cwd);
  if (fallback) return fallback;
  return "ffmpeg";
}

export function getFfprobePath(): string {
  const env = process.env.FFPROBE_PATH?.trim();
  if (env) return env;
  const resolved = ffprobeFromRequireResolve();
  if (resolved) return resolved;
  const bundled = ffprobePkg.path;
  if (bundled.length > 0 && existsSync(bundled)) return bundled;
  const cwd = process.cwd();
  const fallback = ffprobeFromNodeModulesRoot(cwd);
  if (fallback) return fallback;
  return "ffprobe";
}
