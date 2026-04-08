/**
 * Offload the full ingest SSE pipeline to the long-running TS worker (Express + PySceneDetect + real disk).
 * Set `INGEST_WORKER_URL` (server-only) or `NEXT_PUBLIC_WORKER_URL` on Vercel so `/api/ingest-film/stream`
 * proxies to the worker — the browser only talks to your Next app (no CORS, one deployment story).
 *
 * Disable: `METROVISION_DELEGATE_INGEST=0`
 */

const PROXY_TIMEOUT_MS = 890_000;

export function resolveIngestWorkerProxyTarget(): string | null {
  if (process.env.METROVISION_DELEGATE_INGEST === "0") return null;
  const base =
    process.env.INGEST_WORKER_URL?.trim() || process.env.NEXT_PUBLIC_WORKER_URL?.trim();
  if (!base) return null;
  return base.replace(/\/$/, "");
}

/** POST body must already be validated; forwards JSON as-is and streams the SSE response back. */
export async function forwardIngestFilmStreamToWorker(
  workerOrigin: string,
  bodyText: string,
): Promise<Response> {
  const url = `${workerOrigin.replace(/\/$/, "")}/api/ingest-film/stream`;
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), PROXY_TIMEOUT_MS);
  try {
    const workerRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyText,
      signal: ac.signal,
    });

    const headers = new Headers();
    const ct = workerRes.headers.get("Content-Type");
    if (ct) headers.set("Content-Type", ct);
    headers.set(
      "Cache-Control",
      workerRes.headers.get("Cache-Control") ?? "no-cache, no-transform",
    );
    headers.set("Connection", "keep-alive");
    headers.set("X-Accel-Buffering", "no");

    return new Response(workerRes.body, {
      status: workerRes.status,
      headers,
    });
  } finally {
    clearTimeout(timeout);
  }
}
