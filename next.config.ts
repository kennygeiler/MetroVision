import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  /**
   * PySceneDetect ingest pulls ffmpeg/ffprobe via `ffmpeg-static` / `ffprobe-static`.
   * The actual binaries are not discovered by file tracing unless we include them,
   * otherwise production (e.g. Vercel) resolves to `ffmpeg` on PATH → ENOENT.
   */
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/ffmpeg-static/**",
      "./node_modules/ffprobe-static/**",
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
