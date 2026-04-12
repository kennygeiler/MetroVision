import {
  BLOCKING_TYPES,
  COLOR_TEMPERATURES,
  DEPTH_TYPES,
  DOMINANT_LINES,
  DURATION_CATEGORIES,
  FRAMINGS,
  HORIZONTAL_ANGLES,
  LIGHTING_DIRECTIONS,
  LIGHTING_QUALITIES,
  SHOT_SIZES,
  SYMMETRY_TYPES,
  VERTICAL_ANGLES,
  type BlockingTypeSlug,
  type ColorTemperatureSlug,
  type DepthTypeSlug,
  type DominantLineSlug,
  type DurationCategorySlug,
  type FramingSlug,
  type HorizontalAngleSlug,
  type LightingDirectionSlug,
  type LightingQualitySlug,
  type ShotSizeSlug,
  type SymmetryTypeSlug,
  type VerticalAngleSlug,
} from "@/lib/taxonomy";

const formatFallbackLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

function getDisplayName<T extends Record<string, { displayName: string }>>(
  dictionary: T,
  slug: string | null | undefined,
) {
  if (!slug) return "—";
  return dictionary[slug as keyof T]?.displayName ?? formatFallbackLabel(slug);
}

export function getFramingDisplayName(slug: FramingSlug | null | undefined) {
  return getDisplayName(FRAMINGS, slug);
}

export function getDepthDisplayName(slug: DepthTypeSlug | null | undefined) {
  return getDisplayName(DEPTH_TYPES, slug);
}

export function getBlockingDisplayName(slug: BlockingTypeSlug | null | undefined) {
  return getDisplayName(BLOCKING_TYPES, slug);
}

export function getSymmetryDisplayName(slug: SymmetryTypeSlug | null | undefined) {
  return getDisplayName(SYMMETRY_TYPES, slug);
}

export function getDominantLineDisplayName(slug: DominantLineSlug | null | undefined) {
  return getDisplayName(DOMINANT_LINES, slug);
}

export function getLightingDirectionDisplayName(slug: LightingDirectionSlug | null | undefined) {
  return getDisplayName(LIGHTING_DIRECTIONS, slug);
}

export function getLightingQualityDisplayName(slug: LightingQualitySlug | null | undefined) {
  return getDisplayName(LIGHTING_QUALITIES, slug);
}

export function getColorTemperatureDisplayName(slug: ColorTemperatureSlug | null | undefined) {
  return getDisplayName(COLOR_TEMPERATURES, slug);
}

export function getShotSizeDisplayName(slug: ShotSizeSlug | null | undefined) {
  return getDisplayName(SHOT_SIZES, slug);
}

export function getVerticalAngleDisplayName(slug: VerticalAngleSlug | null | undefined) {
  return getDisplayName(VERTICAL_ANGLES, slug);
}

export function getHorizontalAngleDisplayName(slug: HorizontalAngleSlug | null | undefined) {
  return getDisplayName(HORIZONTAL_ANGLES, slug);
}

export function getDurationCategoryDisplayName(slug: DurationCategorySlug | null | undefined) {
  return getDisplayName(DURATION_CATEGORIES, slug);
}

export function formatShotDuration(duration: number) {
  if (!Number.isFinite(duration) || duration < 0) {
    return "—";
  }
  if (duration <= 60) {
    return `${duration.toFixed(1)}s`;
  }
  const mins = Math.floor(duration / 60);
  const secs = duration - mins * 60;
  const roundedSecs = Number(secs.toFixed(3));
  if (roundedSecs < 0.05) {
    return `${mins}m`;
  }
  return `${mins}m ${roundedSecs.toFixed(1)}s`;
}
