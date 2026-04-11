#!/usr/bin/env npx tsx
/**
 * Lightweight probe for uptime monitors / cron: GET {origin}/health on the TS worker.
 * Exit 0 when JSON has status ok; exit 1 otherwise.
 *
 * Usage:
 *   INGEST_WORKER_URL=https://your-worker.fly.dev pnpm exec tsx scripts/worker-reachability-smoke.ts
 *   # or
 *   WORKER_HEALTH_URL=https://your-worker.fly.dev/health pnpm exec tsx scripts/worker-reachability-smoke.ts
 */

function normalizeHealthUrl(): string {
  const direct = process.env.WORKER_HEALTH_URL?.trim();
  if (direct) return direct.replace(/\/+$/, "");

  const origin = process.env.INGEST_WORKER_URL?.trim() || process.env.NEXT_PUBLIC_WORKER_URL?.trim();
  if (!origin) {
    console.error(
      "[worker-reachability-smoke] Set WORKER_HEALTH_URL or INGEST_WORKER_URL / NEXT_PUBLIC_WORKER_URL (origin only).",
    );
    process.exit(1);
  }
  const withScheme = /^https?:\/\//i.test(origin) ? origin : `https://${origin}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    console.error("[worker-reachability-smoke] Invalid worker URL.");
    process.exit(1);
  }
  return `${u.origin}/health`;
}

async function main(): Promise<void> {
  const url = normalizeHealthUrl();
  const ac = AbortSignal.timeout(12_000);
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, signal: ac });
  } catch (e) {
    console.error("[worker-reachability-smoke] Fetch failed:", (e as Error).message);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`[worker-reachability-smoke] HTTP ${res.status} from ${url}`);
    process.exit(1);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    console.error("[worker-reachability-smoke] Response is not JSON.");
    process.exit(1);
  }
  const rec = body as { status?: string; service?: string };
  if (rec.status !== "ok" || rec.service !== "metrovision-worker") {
    console.error("[worker-reachability-smoke] Unexpected health payload:", body);
    process.exit(1);
  }
  console.log("[worker-reachability-smoke] ok", url);
}

void main();
