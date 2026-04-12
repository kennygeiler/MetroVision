/** In sync with boundary split validation (Boundary HITL). */
export const MIN_SHOT_SPLIT_MARGIN_SEC = 0.25;

export function shotAllowsKeyboardSplit(startTc: number | null, endTc: number | null): boolean {
  if (startTc == null || endTc == null) {
    return false;
  }
  return endTc - startTc > MIN_SHOT_SPLIT_MARGIN_SEC * 2;
}

export function isTimelineHoverSplitFeasible(
  shotDurationSec: number,
  hoverIntoShotSec: number | null,
): hoverIntoShotSec is number {
  if (hoverIntoShotSec == null || shotDurationSec <= 0) {
    return false;
  }
  return (
    hoverIntoShotSec > MIN_SHOT_SPLIT_MARGIN_SEC &&
    hoverIntoShotSec < shotDurationSec - MIN_SHOT_SPLIT_MARGIN_SEC
  );
}
