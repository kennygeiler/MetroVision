import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy private Vercel Blob URLs so the browser can access them.
 * Usage: /api/blob/{blobUrl} where blobUrl is the full private blob URL (encoded).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: segments } = await params;
    const blobUrl = decodeURIComponent(segments.join("/"));

    // Ensure it's a valid blob URL
    if (!blobUrl.includes("blob.vercel-storage.com")) {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 });
    }

    const fullUrl = blobUrl.startsWith("https://") ? blobUrl : `https://${blobUrl}`;

    // Fetch from blob with the token
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    const response = await fetch(fullUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Blob fetch failed: ${response.status}` },
        { status: response.status },
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Blob proxy failed" },
      { status: 500 },
    );
  }
}
