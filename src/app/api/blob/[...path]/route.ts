import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy private Vercel Blob URLs so the browser can access them.
 * Supports Range requests for HTML5 video playback (seek, scrub, play).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: segments } = await params;
    const blobUrl = decodeURIComponent(segments.join("/"));

    if (!blobUrl.includes("blob.vercel-storage.com")) {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 });
    }

    const fullUrl = blobUrl.startsWith("https://") ? blobUrl : `https://${blobUrl}`;
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

    // Forward Range header from browser for video seeking
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const rangeHeader = request.headers.get("Range");
    if (rangeHeader) headers["Range"] = rangeHeader;

    const response = await fetch(fullUrl, { headers });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Blob fetch failed: ${response.status}` },
        { status: response.status },
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges");
    const body = await response.arrayBuffer();

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": acceptRanges || "bytes",
    };
    if (contentLength) responseHeaders["Content-Length"] = contentLength;
    if (contentRange) responseHeaders["Content-Range"] = contentRange;

    return new NextResponse(body, {
      status: response.status, // 200 or 206 for partial content
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Blob proxy failed" },
      { status: 500 },
    );
  }
}
