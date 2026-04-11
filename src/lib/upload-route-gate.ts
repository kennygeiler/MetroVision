/**
 * Optional gate for POST /api/upload-video. When METROVISION_UPLOAD_ROUTE_SECRET is set,
 * callers must send the same value in x-metrovision-upload-route (e.g. internal tools).
 * Browser-based ingest cannot send this without exposing the secret — prefer S3 / videoUrl
 * flows in production, or leave this env unset for trusted networks.
 */

import { timingSafeEqual } from "node:crypto";

const HEADER = "x-metrovision-upload-route";

export function getUploadRouteSecret(): string | undefined {
  const s = process.env.METROVISION_UPLOAD_ROUTE_SECRET?.trim();
  return s || undefined;
}

export function rejectIfUploadRouteGated(request: Request): Response | null {
  const secret = getUploadRouteSecret();
  if (!secret) return null;

  const presented = request.headers.get(HEADER)?.trim() ?? "";
  const a = Buffer.from(secret);
  const b = Buffer.from(presented);
  const ok = a.length === b.length && timingSafeEqual(a, b);

  if (!ok) {
    return Response.json(
      {
        error:
          "Upload route gated: send x-metrovision-upload-route matching METROVISION_UPLOAD_ROUTE_SECRET, or unset that env for open local access.",
      },
      { status: 401 },
    );
  }
  return null;
}
