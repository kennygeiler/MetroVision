import { NextResponse } from "next/server";

import { getFilmDistinctShotSourceFiles, getFilmReclassifyTargets } from "@/db/queries";
import { sanitize } from "@/lib/ingest-pipeline";
import { listFilmFolderSourceVideoKeys } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickSuggestedSourceKey(keys: string[], sourceHints: string[]): string | null {
  if (keys.length === 0) return null;
  const hintSet = new Set<string>();
  for (const h of sourceHints) {
    const t = h.trim();
    if (!t) continue;
    hintSet.add(t);
    const last = t.split(/[/\\]/).filter(Boolean).pop();
    if (last) hintSet.add(last);
  }
  if (hintSet.size === 0) return keys[0] ?? null;
  for (const k of keys) {
    const base = k.split("/").pop() ?? "";
    if (hintSet.has(base) || hintSet.has(k)) return k;
  }
  return keys[0] ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await getFilmReclassifyTargets(id);
  if (!data) {
    return NextResponse.json({ error: "Film not found" }, { status: 404 });
  }

  let suggestedSourceKey: string | null = null;
  try {
    const yearNum =
      data.film.year != null && Number.isFinite(data.film.year)
        ? Math.trunc(data.film.year)
        : 0;
    const slug = `${sanitize(data.film.title)}-${yearNum}`;
    const folderKeys = await listFilmFolderSourceVideoKeys(slug, 80);
    const hints = await getFilmDistinctShotSourceFiles(id);
    suggestedSourceKey = pickSuggestedSourceKey(folderKeys, hints);
  } catch {
    suggestedSourceKey = null;
  }

  return NextResponse.json({ ...data, suggestedSourceKey });
}
