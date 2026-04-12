import type { ShotWithDetails } from "@/lib/types";

/**
 * Shots where automated composition labels are unreliable or explicitly queued for another pipeline pass.
 * Used for film timeline highlighting and "re-run ingest" prompts — not human verification ratings.
 */
export function shotNeedsReliableClassification(shot: ShotWithDetails): boolean {
  const src = shot.metadata.classificationSource?.trim().toLowerCase() ?? "";
  if (src === "gemini_fallback") return true;
  const rs = shot.metadata.reviewStatus?.trim() ?? "";
  if (rs === "needs_review") return true;
  return false;
}

export function countShotsNeedingReliableClassification(shots: ShotWithDetails[]): number {
  return shots.filter(shotNeedsReliableClassification).length;
}
