/**
 * Optional shared secret between Next (ingest proxy) and the Express worker.
 * When METROVISION_WORKER_INGEST_SECRET is set on both, worker routes require
 * header x-metrovision-worker-ingest (constant-time compare). When unset, routes stay open.
 */

import { timingSafeEqual } from "node:crypto";

export const WORKER_INGEST_SECRET_HEADER = "x-metrovision-worker-ingest";

export function getWorkerIngestSecret(): string | undefined {
  const s = process.env.METROVISION_WORKER_INGEST_SECRET?.trim();
  return s || undefined;
}

/** Headers for Next → worker fetch when a gate secret is configured. */
export function workerIngestHeadersForProxy(): HeadersInit {
  const secret = getWorkerIngestSecret();
  if (!secret) return {};
  return { [WORKER_INGEST_SECRET_HEADER]: secret };
}

export type WorkerIngestGateResult =
  | { ok: true }
  | { ok: false; status: number; body: Record<string, unknown> };

export function checkWorkerIngestSecret(
  getHeader: (name: string) => string | null | undefined,
): WorkerIngestGateResult {
  const secret = getWorkerIngestSecret();
  if (!secret) return { ok: true };

  const presented = getHeader(WORKER_INGEST_SECRET_HEADER)?.trim() ?? "";
  const a = Buffer.from(secret);
  const b = Buffer.from(presented);
  const match = a.length === b.length && timingSafeEqual(a, b);

  if (!match) {
    return {
      ok: false,
      status: 401,
      body: {
        error:
          "Worker ingest gated: set METROVISION_WORKER_INGEST_SECRET on Next and the worker; Next proxy sends x-metrovision-worker-ingest automatically.",
      },
    };
  }
  return { ok: true };
}
