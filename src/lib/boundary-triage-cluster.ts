/** Single triage queue — all rows are the same cut-boundary type (no heuristic sub-tabs). */
export const BOUNDARY_TRIAGE_KIND = "cut_boundary" as const;
export type BoundaryTriageCluster = typeof BOUNDARY_TRIAGE_KIND;

/** Kept for call-site stability; always returns the one queue kind. */
export function deriveBoundaryCluster(): BoundaryTriageCluster {
  return BOUNDARY_TRIAGE_KIND;
}
