"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BoundaryHitlTools } from "@/components/shots/boundary-hitl-tools";
import { ShotPlayer } from "@/components/video/shot-player";
import {
  isTimelineHoverSplitFeasible,
  shotAllowsKeyboardSplit,
} from "@/lib/boundary-split-margin";
import { getShotPlaybackSegment } from "@/lib/shot-playback-segment";
import { spaceTargetKeepsNativeBehavior } from "@/lib/shot-detail-space-key";
import type { ShotWithDetails } from "@/lib/types";

type ShotDetailVideoBlockProps = {
  shot: ShotWithDetails;
  nextShotId: string | null;
};

export function ShotDetailVideoBlock({ shot, nextShotId }: ShotDetailVideoBlockProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [splitAt, setSplitAt] = useState("");
  const [timelineHoverIntoShotSec, setTimelineHoverIntoShotSec] = useState<number | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [splitFlash, setSplitFlash] = useState<{
    id: number;
    mode: "hover" | "playhead";
  } | null>(null);
  const playbackSegment = useMemo(() => getShotPlaybackSegment(shot), [shot]);

  const shotDuration =
    shot.startTc != null && shot.endTc != null ? shot.endTc - shot.startTc : 0;
  const hoverSplitArmed =
    playbackSegment != null &&
    isTimelineHoverSplitFeasible(shotDuration, timelineHoverIntoShotSec);
  const canKeyboardSplit = shotAllowsKeyboardSplit(shot.startTc, shot.endTc);

  const handleSplitSucceeded = useCallback((info: { mode: "hover" | "playhead" }) => {
    setSplitFlash({ id: Date.now(), mode: info.mode });
  }, []);

  useEffect(() => {
    setSplitAt("");
    setTimelineHoverIntoShotSec(null);
    setSplitFlash(null);
  }, [shot.id]);

  useEffect(() => {
    const onSpaceDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") {
        return;
      }
      if (spaceTargetKeepsNativeBehavior(e.target)) {
        return;
      }
      setSpaceHeld(true);
    };
    const onSpaceUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
      }
    };
    const onBlur = () => setSpaceHeld(false);
    window.addEventListener("keydown", onSpaceDown, true);
    window.addEventListener("keyup", onSpaceUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onSpaceDown, true);
      window.removeEventListener("keyup", onSpaceUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <div className="space-y-4">
      <ShotPlayer
        shot={shot}
        videoRef={videoRef}
        splitAt={splitAt}
        onSplitAtChange={setSplitAt}
        onTimelineHoverIntoShotChange={setTimelineHoverIntoShotSec}
        playbackFeedback={{
          spaceHeld,
          hoverSplitArmed,
          canKeyboardSplit,
          splitFlash,
          onSplitFlashDone: () => setSplitFlash(null),
        }}
      />
      <BoundaryHitlTools
        shotId={shot.id}
        startTc={shot.startTc}
        endTc={shot.endTc}
        clipMediaAnchorStartTc={shot.clipMediaAnchorStartTc}
        nextShotId={nextShotId}
        videoRef={videoRef}
        hasVideoClip={Boolean(shot.videoUrl)}
        videoUrlKey={shot.videoUrl}
        splitAt={splitAt}
        onSplitAtChange={setSplitAt}
        playheadSyncedByTransport={playbackSegment != null}
        timelineHoverIntoShotSec={timelineHoverIntoShotSec}
        onSplitSucceeded={handleSplitSucceeded}
      />
    </div>
  );
}
