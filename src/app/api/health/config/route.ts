import { NextResponse } from "next/server";

/**
 * Presence-only config check (no secret values). Handy after Vercel env changes.
 *
 * **Optional lock:** set `METROVISION_CONFIG_CHECK_SECRET` in Vercel; then call
 * `GET /api/health/config` with header `Authorization: Bearer <same value>`.
 * If the secret is set and the header is wrong → 401 (avoids enumerating your stack publicly).
 */

export const dynamic = "force-dynamic";

function present(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
}

export async function GET(request: Request) {
  const secret = process.env.METROVISION_CONFIG_CHECK_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization")?.trim();
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const checks: Record<string, boolean> = {
    DATABASE_URL: present("DATABASE_URL"),
    GOOGLE_API_KEY: present("GOOGLE_API_KEY"),
    OPENAI_API_KEY: present("OPENAI_API_KEY"),
    TMDB_API_KEY: present("TMDB_API_KEY"),
    AWS_ACCESS_KEY_ID: present("AWS_ACCESS_KEY_ID"),
    AWS_SECRET_ACCESS_KEY: present("AWS_SECRET_ACCESS_KEY"),
    AWS_S3_BUCKET: present("AWS_S3_BUCKET"),
    AWS_REGION: present("AWS_REGION"),
    NEXT_PUBLIC_SITE_URL: present("NEXT_PUBLIC_SITE_URL"),
    INGEST_WORKER_URL: present("INGEST_WORKER_URL"),
    NEXT_PUBLIC_WORKER_URL: present("NEXT_PUBLIC_WORKER_URL"),
    REPLICATE_API_TOKEN: present("REPLICATE_API_TOKEN"),
    METROVISION_LLM_GATE_SECRET: present("METROVISION_LLM_GATE_SECRET"),
    METROVISION_EVAL_ARTIFACT_ADMIN_SECRET: present("METROVISION_EVAL_ARTIFACT_ADMIN_SECRET"),
  };

  const ingestDelegateTarget = present("INGEST_WORKER_URL") || present("NEXT_PUBLIC_WORKER_URL");
  const criticalOk =
    checks.DATABASE_URL &&
    checks.GOOGLE_API_KEY &&
    checks.AWS_ACCESS_KEY_ID &&
    checks.AWS_SECRET_ACCESS_KEY &&
    checks.AWS_S3_BUCKET;

  return NextResponse.json({
    ok: criticalOk,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    vercel: process.env.VERCEL === "1",
    ingestWillProxyToWorker:
      ingestDelegateTarget && process.env.METROVISION_DELEGATE_INGEST !== "0",
    checks,
    hints: {
      core: "Need DATABASE_URL, GOOGLE_API_KEY, AWS_* for S3, TMDB_API_KEY for ingest metadata.",
      ingest:
        "For long jobs on Vercel: set INGEST_WORKER_URL or NEXT_PUBLIC_WORKER_URL so /api/ingest-film/stream can proxy (unless METROVISION_DELEGATE_INGEST=0).",
      lockThisRoute:
        "Set METROVISION_CONFIG_CHECK_SECRET and pass Authorization: Bearer <value>.",
    },
  });
}
