"use client";

import {
  formatShotDuration,
  getBlockingDisplayName,
  getDepthDisplayName,
  getDurationCategoryDisplayName,
  getFramingDisplayName,
  getHorizontalAngleDisplayName,
  getLightingDirectionDisplayName,
  getLightingQualityDisplayName,
  getShotSizeDisplayName,
  getVerticalAngleDisplayName,
} from "@/lib/shot-display";
import { getFramingColor } from "@/lib/timeline-colors";
import { colorForCategorySlug } from "@/lib/viz-colors";
import type { ShotWithDetails } from "@/lib/types";

type ShotCompositionPanelProps = {
  shot: ShotWithDetails;
};

function Chip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border px-3 py-2.5 sm:px-4"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: accent,
        borderTopColor: "color-mix(in oklch, var(--color-border-default) 65%, transparent)",
        borderRightColor: "color-mix(in oklch, var(--color-border-default) 65%, transparent)",
        borderBottomColor: "color-mix(in oklch, var(--color-border-default) 65%, transparent)",
        backgroundColor: `color-mix(in oklch, ${accent} 14%, var(--color-surface-secondary))`,
      }}
    >
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
        {label}
      </p>
      <p
        className="mt-1 text-sm font-semibold leading-snug text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
    </div>
  );
}

/** Composition metadata above the player — color keys match timeline / viz taxonomy hues. */
export function ShotCompositionPanel({ shot }: ShotCompositionPanelProps) {
  const { film, metadata, duration } = shot;

  const framingAccent = getFramingColor(metadata.framing);
  const shotSizeAccent = colorForCategorySlug(metadata.shotSize, 52, 46);
  const depthAccent = colorForCategorySlug(metadata.depth, 50, 44);
  const blockingAccent = colorForCategorySlug(metadata.blocking, 54, 42);
  const lightingAccent = colorForCategorySlug(metadata.lightingDirection, 48, 46);
  const durationCatAccent = colorForCategorySlug(metadata.durationCategory, 46, 48);
  const angleAccent = colorForCategorySlug(metadata.angleVertical, 50, 45);

  return (
    <div
      className="rounded-t-[calc(var(--radius-xl)_+_6px)] border-b px-4 py-4 sm:px-5 sm:py-5"
      style={{
        borderBottomColor: "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
        backgroundColor: "color-mix(in oklch, var(--color-surface-secondary) 55%, transparent)",
      }}
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-accent)]">
            Composition record
          </p>
          <p
            className="mt-1 text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {film.title}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {film.director}
            {film.year != null ? ` · ${film.year}` : null}
          </p>
        </div>
        <p className="font-mono text-sm tabular-nums text-[var(--color-text-tertiary)]">
          Clip {formatShotDuration(duration)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Chip label="Framing" value={getFramingDisplayName(metadata.framing)} accent={framingAccent} />
        <Chip label="Shot size" value={getShotSizeDisplayName(metadata.shotSize)} accent={shotSizeAccent} />
        <Chip label="Depth" value={getDepthDisplayName(metadata.depth)} accent={depthAccent} />
        <Chip label="Blocking" value={getBlockingDisplayName(metadata.blocking)} accent={blockingAccent} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Chip
          label="Lighting"
          value={`${getLightingDirectionDisplayName(metadata.lightingDirection)} · ${getLightingQualityDisplayName(metadata.lightingQuality)}`}
          accent={lightingAccent}
        />
        <Chip
          label="Length category"
          value={getDurationCategoryDisplayName(metadata.durationCategory)}
          accent={durationCatAccent}
        />
        <Chip
          label="Camera angle"
          value={`${getVerticalAngleDisplayName(metadata.angleVertical)} · ${getHorizontalAngleDisplayName(metadata.angleHorizontal)}`}
          accent={angleAccent}
        />
      </div>
    </div>
  );
}
