import type { ShotWithDetails } from "@/lib/types";

export type ShotPlaybackSegment = {
  offset: number;
  end: number;
  mediaAnchor: number;
  startTc: number;
  endTc: number;
};

/** Window within the media file that corresponds to this shot (for clamping + custom transport). */
export function getShotPlaybackSegment(shot: ShotWithDetails): ShotPlaybackSegment | null {
  const anchorTc = shot.clipMediaAnchorStartTc ?? shot.startTc ?? null;
  if (
    !shot.videoUrl ||
    shot.startTc == null ||
    shot.endTc == null ||
    shot.duration <= 0 ||
    anchorTc == null
  ) {
    return null;
  }
  const offset = shot.startTc - anchorTc;
  const end = offset + shot.duration;
  if (!Number.isFinite(offset) || !Number.isFinite(end)) {
    return null;
  }
  return {
    offset,
    end,
    mediaAnchor: anchorTc,
    startTc: shot.startTc,
    endTc: shot.endTc,
  };
}
