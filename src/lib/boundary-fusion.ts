import {
  boundaryMergeEpsilonSec,
  clusterCutTimes,
} from "./boundary-ensemble";

/** Same millisecond rounding as `ingest-pipeline.roundTime` (avoid importing ingest-pipeline → cycle). */
function roundTime(t: number): number {
  return Math.round(t * 1000) / 1000;
}

export const BOUNDARY_FUSION_POLICIES = [
  "merge_flat",
  "auxiliary_near_primary",
  "pairwise_min_sources",
] as const;

export type BoundaryFusionPolicy = (typeof BOUNDARY_FUSION_POLICIES)[number];

export function parseBoundaryFusionPolicy(
  raw: string,
): BoundaryFusionPolicy | null {
  const s = raw.trim();
  return BOUNDARY_FUSION_POLICIES.includes(s as BoundaryFusionPolicy)
    ? (s as BoundaryFusionPolicy)
    : null;
}

/**
 * **`merge_flat`** — Concatenate primary + auxiliary interior cuts and cluster once with ε (same as
 * `mergeInteriorCutSec` when primary/aux map to base/extra).
 *
 * **`auxiliary_near_primary`** — Start from primary cuts already clustered at ε; keep an auxiliary
 * instant only if it lies within ε of at least one primary cut; then one final ε-cluster to dedupe.
 *
 * **`pairwise_min_sources`** — Output comes only from primary/auxiliary pairs with |p−a| ≤ ε/2;
 * each match contributes the midpoint of (p, a), then ε-cluster those midpoints. Drops primary-only
 * and auxiliary-only peaks.
 */
export function fuseBoundaryCutStreams(
  primarySec: number[],
  auxiliarySec: number[],
  policy: BoundaryFusionPolicy,
  epsSec?: number,
): number[] {
  const eps = epsSec ?? boundaryMergeEpsilonSec();
  const primary = primarySec
    .filter((t) => Number.isFinite(t) && t >= 0)
    .map((t) => roundTime(t));
  const auxiliary = auxiliarySec
    .filter((t) => Number.isFinite(t) && t >= 0)
    .map((t) => roundTime(t));

  if (policy === "merge_flat") {
    const all = [...primary, ...auxiliary];
    if (all.length === 0) return [];
    return clusterCutTimes(all, eps);
  }

  const primaryClustered = clusterCutTimes(primary, eps);

  if (policy === "auxiliary_near_primary") {
    if (primaryClustered.length === 0) return [];
    const keptAux: number[] = [];
    for (const a of [...new Set(auxiliary)].sort((x, y) => x - y)) {
      if (primaryClustered.some((p) => Math.abs(a - p) <= eps)) {
        keptAux.push(a);
      }
    }
    return clusterCutTimes([...primaryClustered, ...keptAux], eps);
  }

  /* pairwise_min_sources */
  const half = eps / 2;
  const mids: number[] = [];
  for (const a of auxiliary) {
    for (const p of primaryClustered) {
      if (Math.abs(a - p) <= half) {
        mids.push(roundTime((a + p) / 2));
      }
    }
  }
  if (mids.length === 0) return [];
  return clusterCutTimes(mids, eps);
}
