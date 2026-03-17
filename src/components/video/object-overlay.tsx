"use client";

import type { CSSProperties } from "react";

import type { ShotObjectKeyframe } from "@/db/schema";

type ObjectOverlayProps = {
  tracks: Array<{
    id: string;
    trackId: string;
    label: string;
    category: string | null;
    confidence: number | null;
    keyframes: Array<{ t: number; x: number; y: number; w: number; h: number }>;
    startTime: number;
    endTime: number;
    attributes: Record<string, string> | null;
  }>;
  currentTime: number;
  visible: boolean;
};

type InterpolatedBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const CATEGORY_COLORS = {
  person: "var(--color-overlay-object-person)",
  vehicle: "var(--color-overlay-object-vehicle)",
  object: "var(--color-overlay-object-object)",
  environment: "var(--color-overlay-object-environment)",
  animal: "var(--color-overlay-object-animal)",
  text: "var(--color-overlay-object-text)",
} as const;

const CORNERS = [
  "left-0 top-0 border-l-[2px] border-t-[2px]",
  "right-0 top-0 border-r-[2px] border-t-[2px]",
  "bottom-0 left-0 border-b-[2px] border-l-[2px]",
  "bottom-0 right-0 border-b-[2px] border-r-[2px]",
] as const;

const ENTRY_BUFFER_SECONDS = 0.15;
const EXIT_BUFFER_SECONDS = 0.1;
const MAX_VISIBLE_TRACKS = 10;

function getCategoryColor(category: string | null) {
  return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] ?? CATEGORY_COLORS.object;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function interpolateBbox(keyframes: ShotObjectKeyframe[], time: number): InterpolatedBox | null {
  if (keyframes.length === 0) {
    return null;
  }

  const before = [...keyframes].reverse().find((keyframe) => keyframe.t <= time);
  const after = keyframes.find((keyframe) => keyframe.t > time);

  if (!before && !after) {
    return null;
  }

  if (!before) {
    return after ? { x: after.x, y: after.y, w: after.w, h: after.h } : null;
  }

  if (!after) {
    return { x: before.x, y: before.y, w: before.w, h: before.h };
  }

  const progress = (time - before.t) / (after.t - before.t);

  return {
    x: before.x + (after.x - before.x) * progress,
    y: before.y + (after.y - before.y) * progress,
    w: before.w + (after.w - before.w) * progress,
    h: before.h + (after.h - before.h) * progress,
  };
}

function getMotionVector(keyframes: ShotObjectKeyframe[], time: number) {
  if (keyframes.length < 2) {
    return { x: 0, y: 0, moving: false };
  }

  const previousIndex = keyframes.findIndex((keyframe) => keyframe.t >= time);
  const afterIndex = previousIndex <= 0 ? 1 : previousIndex;
  const before = keyframes[clamp(afterIndex - 1, 0, keyframes.length - 1)];
  const after = keyframes[clamp(afterIndex, 0, keyframes.length - 1)];
  if (!before || !after || before.t === after.t) {
    return { x: 0, y: 0, moving: false };
  }

  const beforeCenter = { x: before.x + before.w / 2, y: before.y + before.h / 2 };
  const afterCenter = { x: after.x + after.w / 2, y: after.y + after.h / 2 };
  const dx = afterCenter.x - beforeCenter.x;
  const dy = afterCenter.y - beforeCenter.y;
  const magnitude = Math.hypot(dx, dy);

  return magnitude < 0.002
    ? { x: 0, y: 0, moving: false }
    : { x: (dx / magnitude) * 2, y: (dy / magnitude) * 2, moving: true };
}

function formatLabel(label: string, confidence: number | null) {
  const percentage =
    typeof confidence === "number" ? `${Math.round(confidence * 100)}%` : "--%";
  return `${label.toUpperCase()}  ${percentage}`;
}

export function ObjectOverlay({
  tracks,
  currentTime,
  visible,
}: ObjectOverlayProps) {
  if (!visible || tracks.length === 0) {
    return null;
  }

  const activeTracks = tracks
    .filter(
      (track) =>
        track.keyframes.length > 0 &&
        currentTime >= track.startTime - ENTRY_BUFFER_SECONDS &&
        currentTime <= track.endTime + EXIT_BUFFER_SECONDS,
    )
    .map((track) => {
      const sampleTime = clamp(currentTime, track.startTime, track.endTime);
      const bbox = interpolateBbox(track.keyframes, sampleTime);
      if (!bbox) {
        return null;
      }

      return {
        ...track,
        bbox,
        color: getCategoryColor(track.category),
        labelText: formatLabel(track.label, track.confidence),
        motion: getMotionVector(track.keyframes, sampleTime),
        isVisible: currentTime >= track.startTime && currentTime <= track.endTime,
        confidenceRank: track.confidence ?? 0,
      };
    })
    .filter((track): track is NonNullable<typeof track> => track !== null)
    .sort((left, right) => right.confidenceRank - left.confidenceRank)
    .slice(0, MAX_VISIBLE_TRACKS);

  if (activeTracks.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {activeTracks.map((track) => {
        const wrapperStyle = {
          width: `${track.bbox.w * 100}%`,
          height: `${track.bbox.h * 100}%`,
          transform: `translate(${track.bbox.x * 100}%, ${track.bbox.y * 100}%)`,
          opacity: track.isVisible ? 1 : 0,
          transition: "opacity 150ms linear",
          ["--track-color" as string]: track.color,
        } satisfies CSSProperties;
        const ghostStyle = {
          transform: `translate(${track.motion.x}px, ${track.motion.y}px)`,
          opacity: track.motion.moving ? 0.5 : 0,
        } satisfies CSSProperties;

        return (
          <div
            key={track.id}
            className="group absolute left-0 top-0 pointer-events-auto will-change-transform"
            style={wrapperStyle}
          >
            <div
              className="absolute left-0 top-0 h-full w-full border border-[color:var(--track-color)] opacity-0 transition-opacity duration-150 group-hover:opacity-30"
            />

            <div
              className="absolute left-0 top-0 flex h-[18px] -translate-y-full items-center bg-[color:var(--track-color)] px-[6px] font-mono text-[9px] uppercase tracking-[0.16em] text-white"
              style={{ whiteSpace: "pre" }}
            >
              {track.labelText}
            </div>

            {track.motion.moving
              ? CORNERS.map((cornerClassName) => (
                  <div
                    key={`${track.id}-${cornerClassName}-ghost`}
                    className={`absolute h-4 w-4 border-[color:var(--track-color)] ${cornerClassName}`}
                    style={ghostStyle}
                  />
                ))
              : null}

            {CORNERS.map((cornerClassName) => (
              <div
                key={`${track.id}-${cornerClassName}`}
                className={`absolute h-4 w-4 border-[color:var(--track-color)] ${cornerClassName}`}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
