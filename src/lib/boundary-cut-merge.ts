import { boundaryMergeEpsilonSec, clusterCutTimes } from "./boundary-ensemble";
import { roundTime } from "./ingest-pipeline";

/**
 * Merge baseline and extra interior cut instants using the same epsilon as ingest
 * (`METROVISION_BOUNDARY_MERGE_GAP_SEC` via `boundaryMergeEpsilonSec`).
 */
export function mergeInteriorCutSec(
  baseCuts: number[],
  extraCuts: number[],
): number[] {
  const all = [...baseCuts, ...extraCuts]
    .filter((t) => Number.isFinite(t) && t >= 0)
    .map((t) => roundTime(t));
  if (all.length === 0) return [];
  return clusterCutTimes(all, boundaryMergeEpsilonSec());
}
