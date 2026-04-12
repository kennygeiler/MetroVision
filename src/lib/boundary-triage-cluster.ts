/** Heuristic buckets for boundary triage tabs (extend when Python pipeline writes structured tags). */
export const BOUNDARY_TRIAGE_CLUSTERS = [
  "all",
  "strobe_lights",
  "whip_pans",
  "uncategorized",
] as const;

export type BoundaryTriageCluster = (typeof BOUNDARY_TRIAGE_CLUSTERS)[number];

export type BoundaryClusterSource = {
  techniqueNotes?: string | null;
  description?: string | null;
  mood?: string | null;
  lighting?: string | null;
};

export function deriveBoundaryCluster(source: BoundaryClusterSource): Exclude<BoundaryTriageCluster, "all"> {
  const blob = [
    source.techniqueNotes,
    source.description,
    source.mood,
    source.lighting,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(strobe|strobing|flashing\s+lights?|light\s*strobe|club\s+lights?)\b/.test(blob)) {
    return "strobe_lights";
  }
  if (/\b(whip\s*pan|whippan|whip-pan|fast\s+pan|rapid\s+pan|camera\s+whip)\b/.test(blob)) {
    return "whip_pans";
  }
  return "uncategorized";
}

export function boundaryClusterLabel(cluster: BoundaryTriageCluster): string {
  switch (cluster) {
    case "all":
      return "All";
    case "strobe_lights":
      return "Strobe lights";
    case "whip_pans":
      return "Whip pans";
    case "uncategorized":
      return "Uncategorized";
    default:
      return cluster;
  }
}
