/**
 * Build film "scene" rows from Gemini's per-shot `scene_title`.
 *
 * - Contiguous shots only: the same title returning later in the film gets a new scene row
 *   (fixes incorrect merging when a location repeats).
 * - Normalized grouping key: minor punctuation/case/whitespace differences still group
 *   (fixes duplicate scenes from LLM inconsistency).
 */

export type SceneTitleFields = { scene_title?: string | null };

export type ContiguousScenePlan = {
  /** Stored on `scenes.title` (first shot in run, trimmed). */
  displayTitle: string;
  shotIndices: number[];
};

const UNTITLED = "Untitled Scene";

export function displaySceneTitle(raw: string | null | undefined): string {
  const t = (raw ?? "").normalize("NFKC").trim();
  return t.length > 0 ? t : UNTITLED;
}

/** Key used to compare adjacent shots for continuity — not shown in the UI. */
export function normalizeSceneTitleKey(raw: string | null | undefined): string {
  const base = displaySceneTitle(raw);
  return base
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Partition shots in timeline order into scene groups. Adjacent shots merge when their
 * normalized keys match; a non-adjacent repeat starts a new group.
 */
export function planContiguousScenesByNormalizedTitle<T extends SceneTitleFields>(
  classifications: T[],
): ContiguousScenePlan[] {
  if (classifications.length === 0) return [];

  const plans: ContiguousScenePlan[] = [];
  let currentKey = normalizeSceneTitleKey(classifications[0].scene_title);
  let currentDisplay = displaySceneTitle(classifications[0].scene_title);
  let currentIndices: number[] = [0];

  for (let i = 1; i < classifications.length; i++) {
    const key = normalizeSceneTitleKey(classifications[i].scene_title);
    if (key === currentKey) {
      currentIndices.push(i);
    } else {
      plans.push({ displayTitle: currentDisplay, shotIndices: currentIndices });
      currentKey = key;
      currentDisplay = displaySceneTitle(classifications[i].scene_title);
      currentIndices = [i];
    }
  }
  plans.push({ displayTitle: currentDisplay, shotIndices: currentIndices });
  return plans;
}
