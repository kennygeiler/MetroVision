import { eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "../db/schema";

type IngestDb = NeonHttpDatabase<typeof schema>;

/**
 * Remove all ingest-derived rows for a film before a new full ingest.
 * Prevents orphan scenes (group step committed, shot loop died) and duplicate stacks on re-run.
 * Keeps the `films` row; clears shots (cascades metadata, embeddings, verifications, etc.), scenes, and film-scoped jobs.
 */
export async function resetFilmIngestArtifacts(database: IngestDb, filmId: string): Promise<void> {
  await database.delete(schema.pipelineJobs).where(eq(schema.pipelineJobs.filmId, filmId));
  await database.delete(schema.batchJobs).where(eq(schema.batchJobs.filmId, filmId));
  await database.delete(schema.shots).where(eq(schema.shots.filmId, filmId));
  await database.delete(schema.scenes).where(eq(schema.scenes.filmId, filmId));
}
