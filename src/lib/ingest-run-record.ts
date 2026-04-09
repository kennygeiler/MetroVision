import { eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "../db/schema";

type IngestDb = NeonHttpDatabase<typeof schema>;

export async function createIngestRunRecord(database: IngestDb, filmId: string): Promise<string> {
  const [row] = await database
    .insert(schema.ingestRuns)
    .values({ filmId, status: "running", stage: "group" })
    .returning({ id: schema.ingestRuns.id });
  return row!.id;
}

export async function setIngestRunStage(database: IngestDb, runId: string, stage: string): Promise<void> {
  await database
    .update(schema.ingestRuns)
    .set({ stage, updatedAt: new Date() })
    .where(eq(schema.ingestRuns.id, runId));
}

export async function completeIngestRunRecord(
  database: IngestDb,
  runId: string,
  shotCount: number,
  sceneCount: number,
): Promise<void> {
  await database
    .update(schema.ingestRuns)
    .set({
      status: "completed",
      stage: "complete",
      shotCount,
      sceneCount,
      updatedAt: new Date(),
    })
    .where(eq(schema.ingestRuns.id, runId));
}

export async function failIngestRunRecord(database: IngestDb, runId: string, message: string): Promise<void> {
  const errorMessage = message.trim().slice(0, 4000) || "Pipeline failed";
  await database
    .update(schema.ingestRuns)
    .set({
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(schema.ingestRuns.id, runId));
}
