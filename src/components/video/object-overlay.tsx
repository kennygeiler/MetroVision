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

const ENTRY_DURATION_SECONDS = 0.2;
const EXIT_DURATION_SECONDS = 0.15;
const MAX_VISIBLE_TRACKS = 20;

function getCategoryColor(category: string | null) {
  switch (category) {
    case "person":
      return "var(--color-overlay-motion)";
    case "vehicle":
      return "var(--color-overlay-badge)";
    case "object":
      return "var(--color-overlay-trajectory)";
    case "environment":
      return "var(--color-overlay-info)";
    case "animal":
      return "var(--color-signal-amber)";
    case "text":
      return "var(--color-text-secondary)";
    default:
      return "var(--color-overlay-speed)";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function interpolateBbox(keyframes: ShotObjectKeyframe[], time: number): InterpolatedBox | null {
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

function formatConfidence(confidence: number | null) {
  if (typeof confidence !== "number") {
    return null;
  }

  return `${Math.round(confidence * 100)}%`;
}

function buildTrajectoryPoints(keyframes: ShotObjectKeyframe[]) {
  return keyframes
    .map((keyframe) => {
      const x = (keyframe.x + keyframe.w / 2) * 100;
      const y = (keyframe.y + keyframe.h / 2) * 100;
      return `${x},${y}`;
    })
    .join(" ");
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
        currentTime >= track.startTime &&
        currentTime <= track.endTime + EXIT_DURATION_SECONDS,
    )
    .map((track) => {
      const sampleTime = clamp(currentTime, track.startTime, track.endTime);
      const bbox = interpolateBbox(track.keyframes, sampleTime);

      if (!bbox) {
        return null;
      }

      const entryProgress = clamp(
        (currentTime - track.startTime) / ENTRY_DURATION_SECONDS,
        0,
        1,
      );
      const exitProgress =
        currentTime <= track.endTime
          ? 1
          : 1 -
            clamp(
              (currentTime - track.endTime) / EXIT_DURATION_SECONDS,
              0,
              1,
            );
      const opacity = entryProgress * exitProgress;
      const scale = 0.9 + entryProgress * 0.1;

      return {
        ...track,
        bbox,
        opacity,
        scale,
        confidenceRank: track.confidence ?? 0,
      };
    })
    .filter((track): track is NonNullable<typeof track> => Boolean(track))
    .sort((left, right) => right.confidenceRank - left.confidenceRank)
    .slice(0, MAX_VISIBLE_TRACKS);

  if (activeTracks.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {activeTracks.map((track) =>
          track.keyframes.length > 1 ? (
            <polyline
              key={`${track.id}-trajectory`}
              points={buildTrajectoryPoints(track.keyframes)}
              fill="none"
              stroke={getCategoryColor(track.category)}
              strokeDasharray="1.5 2.5"
              strokeWidth="0.18"
              opacity={0.2}
              vectorEffect="non-scaling-stroke"
            />
          ) : null,
        )}
      </svg>

      {activeTracks.map((track) => {
        const color = getCategoryColor(track.category);
        const confidence = formatConfidence(track.confidence);
        const label = `${track.label}${confidence ? ` ${confidence}` : ""}`.toUpperCase();
        const wrapperStyle = {
          transform: `translate3d(${track.bbox.x * 100}%, ${track.bbox.y * 100}%, 0)`,
          opacity: track.opacity,
        } satisfies CSSProperties;
        const boxStyle = {
          width: `${track.bbox.w * 100}%`,
          height: `${track.bbox.h * 100}%`,
          transform: `scale(${track.scale})`,
          transformOrigin: "top left",
          transition:
            "opacity 150ms linear, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          backgroundColor: `color-mix(in oklch, ${color} 4%, transparent)`,
          ["--track-color" as string]: color,
        } satisfies CSSProperties;

        return (
          <div
            key={track.id}
            className="absolute inset-0 will-change-transform"
            style={wrapperStyle}
          >
            <div className="relative h-full will-change-transform" style={boxStyle}>
              <div
                className="absolute -left-px -top-6 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white shadow-[var(--shadow-lg)] backdrop-blur-md"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: `color-mix(in oklch, ${color} 85%, transparent)`,
                  borderColor: `color-mix(in oklch, ${color} 48%, transparent)`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>

              <div
                className="absolute -left-px -top-px h-3 w-3 border-l-[1.5px] border-t-[1.5px]"
                style={{ borderColor: color }}
              />
              <div
                className="absolute -right-px -top-px h-3 w-3 border-r-[1.5px] border-t-[1.5px]"
                style={{ borderColor: color }}
              />
              <div
                className="absolute -bottom-px -left-px h-3 w-3 border-b-[1.5px] border-l-[1.5px]"
                style={{ borderColor: color }}
              />
              <div
                className="absolute -bottom-px -right-px h-3 w-3 border-b-[1.5px] border-r-[1.5px]"
                style={{ borderColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { interpolateBbox };
