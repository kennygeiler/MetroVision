export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { and, count, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { deriveBoundaryCluster } from "@/lib/boundary-triage-cluster";

type SqlBoundaryRow = {
  shotId: string;
  filmId: string;
  filmTitle: string;
  startTc: string | number | null;
  prevShotId: string | null;
  prevThumbnailUrl: string | null;
  thumbnailUrl: string | null;
  confidence: string | number | null;
  reviewStatus: string;
  classificationSource: string | null;
  techniqueNotes: string | null;
  description: string | null;
  mood: string | null;
  lighting: string | null;
  duration: string | number | null;
};

function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filmId = searchParams.get("filmId")?.trim() ?? "";
    const reviewStatus = searchParams.get("reviewStatus")?.trim() || "needs_review";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "500", 10) || 500, 1000);

    const films = await db
      .selectDistinct({
        id: schema.films.id,
        title: schema.films.title,
      })
      .from(schema.films)
      .innerJoin(schema.shots, eq(schema.shots.filmId, schema.films.id))
      .innerJoin(schema.shotMetadata, eq(schema.shotMetadata.shotId, schema.shots.id))
      .where(eq(schema.shotMetadata.reviewStatus, reviewStatus))
      .orderBy(schema.films.title);

    if (!filmId) {
      return NextResponse.json({ rows: [], total: 0, films });
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(schema.shots)
      .innerJoin(schema.shotMetadata, eq(schema.shotMetadata.shotId, schema.shots.id))
      .where(
        and(
          eq(schema.shots.filmId, filmId),
          eq(schema.shotMetadata.reviewStatus, reviewStatus),
        ),
      );

    const result = await db.execute(sql<SqlBoundaryRow>`
      WITH base AS (
        SELECT
          s.id::text AS "shotId",
          s.film_id::text AS "filmId",
          f.title AS "filmTitle",
          s.start_tc AS "startTc",
          LAG(s.id::text) OVER (
            PARTITION BY s.film_id
            ORDER BY s.start_tc ASC NULLS LAST, s.id ASC
          ) AS "prevShotId",
          LAG(s.thumbnail_url) OVER (
            PARTITION BY s.film_id
            ORDER BY s.start_tc ASC NULLS LAST, s.id ASC
          ) AS "prevThumbnailUrl",
          s.thumbnail_url AS "thumbnailUrl",
          sm.confidence AS "confidence",
          sm.review_status AS "reviewStatus",
          sm.classification_source AS "classificationSource",
          ss.technique_notes AS "techniqueNotes",
          ss.description AS "description",
          ss.mood AS "mood",
          ss.lighting AS "lighting",
          s.duration AS "duration"
        FROM ${schema.shots} s
        INNER JOIN ${schema.shotMetadata} sm ON sm.shot_id = s.id
        LEFT JOIN ${schema.shotSemantic} ss ON ss.shot_id = s.id
        INNER JOIN ${schema.films} f ON f.id = s.film_id
        WHERE sm.review_status = ${reviewStatus}
          AND s.film_id = ${filmId}::uuid
      )
      SELECT * FROM base
      ORDER BY "startTc" ASC NULLS LAST, "shotId" ASC
      LIMIT ${limit}
    `);

    const rows = (result.rows as SqlBoundaryRow[]).map((r) => {
      const cluster = deriveBoundaryCluster();

      return {
        shotId: r.shotId,
        filmId: r.filmId,
        filmTitle: r.filmTitle,
        startTc: toNum(r.startTc),
        prevShotId: r.prevShotId,
        prevThumbnailUrl: r.prevThumbnailUrl,
        thumbnailUrl: r.thumbnailUrl,
        confidence: toNum(r.confidence),
        reviewStatus: r.reviewStatus,
        classificationSource: r.classificationSource,
        techniqueNotes: r.techniqueNotes,
        description: r.description,
        mood: r.mood,
        lighting: r.lighting,
        duration: toNum(r.duration),
        cluster,
      };
    });

    return NextResponse.json({ rows, total, films });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load boundary triage queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
