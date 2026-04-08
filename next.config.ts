import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  /**
   * PySceneDetect ingest pulls ffmpeg/ffprobe via `ffmpeg-static` / `ffprobe-static`.
   * The actual binaries are not discovered by file tracing unless we include them,
   * otherwise production (e.g. Vercel) resolves to `ffmpeg` on PATH → ENOENT.
   */
  outputFileTracingIncludes: {
    // Keys are matched with picomatch against the *normalized route* (e.g. `/api/ingest-film/stream`).
    // `/*` does NOT match nested paths, so includes never ran and Vercel omitted the binaries.
    "/api/**/*": [
      "./node_modules/ffmpeg-static/**",
      "./node_modules/ffprobe-static/**",
      // pnpm stores packages under .pnpm; symlinks may not pull the binary into the trace
      "./node_modules/.pnpm/**/ffmpeg-static/**",
      "./node_modules/.pnpm/**/ffprobe-static/**",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
