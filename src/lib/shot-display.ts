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
  slug: string,
) {
  return dictionary[slug as keyof T]?.displayName ?? formatFallbackLabel(slug);
}

export function getFramingDisplayName(slug: FramingSlug) {
  return getDisplayName(FRAMINGS, slug);
}

export function getDepthDisplayName(slug: DepthTypeSlug) {
  return getDisplayName(DEPTH_TYPES, slug);
}

export function getBlockingDisplayName(slug: BlockingTypeSlug) {
  return getDisplayName(BLOCKING_TYPES, slug);
}

export function getSymmetryDisplayName(slug: SymmetryTypeSlug) {
  return getDisplayName(SYMMETRY_TYPES, slug);
}

export function getDominantLineDisplayName(slug: DominantLineSlug) {
  return getDisplayName(DOMINANT_LINES, slug);
}

export function getLightingDirectionDisplayName(slug: LightingDirectionSlug) {
  return getDisplayName(LIGHTING_DIRECTIONS, slug);
}

export function getLightingQualityDisplayName(slug: LightingQualitySlug) {
  return getDisplayName(LIGHTING_QUALITIES, slug);
}

export function getColorTemperatureDisplayName(slug: ColorTemperatureSlug) {
  return getDisplayName(COLOR_TEMPERATURES, slug);
}

export function getShotSizeDisplayName(slug: ShotSizeSlug) {
  return getDisplayName(SHOT_SIZES, slug);
}

export function getVerticalAngleDisplayName(slug: VerticalAngleSlug) {
  return getDisplayName(VERTICAL_ANGLES, slug);
}

export function getHorizontalAngleDisplayName(slug: HorizontalAngleSlug) {
  return getDisplayName(HORIZONTAL_ANGLES, slug);
}

export function getDurationCategoryDisplayName(slug: DurationCategorySlug) {
  return getDisplayName(DURATION_CATEGORIES, slug);
}

export function formatShotDuration(duration: number) {
  return `${duration.toFixed(1)}s`;
}
