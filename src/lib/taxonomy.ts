// ---------------------------------------------------------------------------
// MetroVision Shot Composition Taxonomy
// Replaces camera movement taxonomy with frame-level composition analysis
// ---------------------------------------------------------------------------

export const FRAMINGS = {
  rule_of_thirds_left: { slug: "rule_of_thirds_left", displayName: "Rule of Thirds (Left)" },
  rule_of_thirds_right: { slug: "rule_of_thirds_right", displayName: "Rule of Thirds (Right)" },
  centered: { slug: "centered", displayName: "Centered" },
  off_center: { slug: "off_center", displayName: "Off Center" },
  split: { slug: "split", displayName: "Split Frame" },
  frame_within_frame: { slug: "frame_within_frame", displayName: "Frame Within Frame" },
  negative_space_dominant: { slug: "negative_space_dominant", displayName: "Negative Space Dominant" },
  filled: { slug: "filled", displayName: "Filled Frame" },
  leading_lines: { slug: "leading_lines", displayName: "Leading Lines" },
  golden_ratio: { slug: "golden_ratio", displayName: "Golden Ratio" },
} as const;

export const DEPTH_TYPES = {
  shallow: { slug: "shallow", displayName: "Shallow" },
  medium: { slug: "medium", displayName: "Medium" },
  deep_staging: { slug: "deep_staging", displayName: "Deep Staging" },
  flat: { slug: "flat", displayName: "Flat" },
  layered: { slug: "layered", displayName: "Layered" },
  rack_focus: { slug: "rack_focus", displayName: "Rack Focus" },
} as const;

export const BLOCKING_TYPES = {
  single: { slug: "single", displayName: "Single Figure" },
  two_figure: { slug: "two_figure", displayName: "Two Figure" },
  two_figure_separation: { slug: "two_figure_separation", displayName: "Two Figure (Separated)" },
  group: { slug: "group", displayName: "Group" },
  crowd: { slug: "crowd", displayName: "Crowd" },
  empty: { slug: "empty", displayName: "Empty Frame" },
  silhouette: { slug: "silhouette", displayName: "Silhouette" },
  reflection: { slug: "reflection", displayName: "Reflection" },
} as const;

export const SYMMETRY_TYPES = {
  symmetric: { slug: "symmetric", displayName: "Symmetric" },
  asymmetric: { slug: "asymmetric", displayName: "Asymmetric" },
  balanced: { slug: "balanced", displayName: "Balanced" },
  unbalanced: { slug: "unbalanced", displayName: "Unbalanced" },
} as const;

export const DOMINANT_LINES = {
  vertical: { slug: "vertical", displayName: "Vertical" },
  horizontal: { slug: "horizontal", displayName: "Horizontal" },
  diagonal: { slug: "diagonal", displayName: "Diagonal" },
  curved: { slug: "curved", displayName: "Curved" },
  converging: { slug: "converging", displayName: "Converging" },
  radiating: { slug: "radiating", displayName: "Radiating" },
  none: { slug: "none", displayName: "None" },
} as const;

export const LIGHTING_DIRECTIONS = {
  front: { slug: "front", displayName: "Front" },
  side: { slug: "side", displayName: "Side" },
  back: { slug: "back", displayName: "Back / Rim" },
  top: { slug: "top", displayName: "Top / Overhead" },
  bottom: { slug: "bottom", displayName: "Bottom / Under" },
  natural: { slug: "natural", displayName: "Natural / Available" },
  mixed: { slug: "mixed", displayName: "Mixed" },
} as const;

export const LIGHTING_QUALITIES = {
  hard: { slug: "hard", displayName: "Hard" },
  soft: { slug: "soft", displayName: "Soft" },
  diffused: { slug: "diffused", displayName: "Diffused" },
  high_contrast: { slug: "high_contrast", displayName: "High Contrast" },
  low_contrast: { slug: "low_contrast", displayName: "Low Contrast" },
  chiaroscuro: { slug: "chiaroscuro", displayName: "Chiaroscuro" },
} as const;

export const COLOR_TEMPERATURES = {
  warm: { slug: "warm", displayName: "Warm" },
  cool: { slug: "cool", displayName: "Cool" },
  neutral: { slug: "neutral", displayName: "Neutral" },
  mixed: { slug: "mixed", displayName: "Mixed" },
  desaturated: { slug: "desaturated", displayName: "Desaturated" },
  saturated: { slug: "saturated", displayName: "Saturated" },
} as const;

// Keep shot sizes — these are universal
export const SHOT_SIZES = {
  extreme_wide: { slug: "extreme_wide", displayName: "Extreme Wide" },
  wide: { slug: "wide", displayName: "Wide" },
  full: { slug: "full", displayName: "Full" },
  medium_wide: { slug: "medium_wide", displayName: "Medium Wide" },
  medium: { slug: "medium", displayName: "Medium" },
  medium_close: { slug: "medium_close", displayName: "Medium Close" },
  close: { slug: "close", displayName: "Close" },
  extreme_close: { slug: "extreme_close", displayName: "Extreme Close" },
  insert: { slug: "insert", displayName: "Insert" },
  two_shot: { slug: "two_shot", displayName: "Two Shot" },
  three_shot: { slug: "three_shot", displayName: "Three Shot" },
  group: { slug: "group", displayName: "Group" },
  ots: { slug: "ots", displayName: "OTS" },
  pov: { slug: "pov", displayName: "POV" },
  reaction: { slug: "reaction", displayName: "Reaction" },
} as const;

// Keep vertical angles — composition includes camera angle
export const VERTICAL_ANGLES = {
  eye_level: { slug: "eye_level", displayName: "Eye Level" },
  high_angle: { slug: "high_angle", displayName: "High Angle" },
  low_angle: { slug: "low_angle", displayName: "Low Angle" },
  birds_eye: { slug: "birds_eye", displayName: "Bird's Eye" },
  worms_eye: { slug: "worms_eye", displayName: "Worm's Eye" },
  overhead: { slug: "overhead", displayName: "Overhead" },
} as const;

export const HORIZONTAL_ANGLES = {
  frontal: { slug: "frontal", displayName: "Frontal" },
  profile: { slug: "profile", displayName: "Profile" },
  three_quarter: { slug: "three_quarter", displayName: "Three Quarter" },
  rear: { slug: "rear", displayName: "Rear" },
  ots: { slug: "ots", displayName: "OTS" },
} as const;

export const DURATION_CATEGORIES = {
  flash: { slug: "flash", displayName: "Flash" },
  brief: { slug: "brief", displayName: "Brief" },
  standard: { slug: "standard", displayName: "Standard" },
  extended: { slug: "extended", displayName: "Extended" },
  long_take: { slug: "long_take", displayName: "Long Take" },
  oner: { slug: "oner", displayName: "Oner" },
} as const;

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type FramingKey = keyof typeof FRAMINGS;
export type Framing = (typeof FRAMINGS)[FramingKey];
export type FramingSlug = Framing["slug"];

export type DepthTypeKey = keyof typeof DEPTH_TYPES;
export type DepthType = (typeof DEPTH_TYPES)[DepthTypeKey];
export type DepthTypeSlug = DepthType["slug"];

export type BlockingTypeKey = keyof typeof BLOCKING_TYPES;
export type BlockingType = (typeof BLOCKING_TYPES)[BlockingTypeKey];
export type BlockingTypeSlug = BlockingType["slug"];

export type SymmetryTypeKey = keyof typeof SYMMETRY_TYPES;
export type SymmetryType = (typeof SYMMETRY_TYPES)[SymmetryTypeKey];
export type SymmetryTypeSlug = SymmetryType["slug"];

export type DominantLineKey = keyof typeof DOMINANT_LINES;
export type DominantLine = (typeof DOMINANT_LINES)[DominantLineKey];
export type DominantLineSlug = DominantLine["slug"];

export type LightingDirectionKey = keyof typeof LIGHTING_DIRECTIONS;
export type LightingDirection = (typeof LIGHTING_DIRECTIONS)[LightingDirectionKey];
export type LightingDirectionSlug = LightingDirection["slug"];

export type LightingQualityKey = keyof typeof LIGHTING_QUALITIES;
export type LightingQuality = (typeof LIGHTING_QUALITIES)[LightingQualityKey];
export type LightingQualitySlug = LightingQuality["slug"];

export type ColorTemperatureKey = keyof typeof COLOR_TEMPERATURES;
export type ColorTemperature = (typeof COLOR_TEMPERATURES)[ColorTemperatureKey];
export type ColorTemperatureSlug = ColorTemperature["slug"];

export type ShotSizeKey = keyof typeof SHOT_SIZES;
export type ShotSize = (typeof SHOT_SIZES)[ShotSizeKey];
export type ShotSizeSlug = ShotSize["slug"];

export type VerticalAngleKey = keyof typeof VERTICAL_ANGLES;
export type VerticalAngle = (typeof VERTICAL_ANGLES)[VerticalAngleKey];
export type VerticalAngleSlug = VerticalAngle["slug"];

export type HorizontalAngleKey = keyof typeof HORIZONTAL_ANGLES;
export type HorizontalAngle = (typeof HORIZONTAL_ANGLES)[HorizontalAngleKey];
export type HorizontalAngleSlug = HorizontalAngle["slug"];

export type DurationCategoryKey = keyof typeof DURATION_CATEGORIES;
export type DurationCategory = (typeof DURATION_CATEGORIES)[DurationCategoryKey];
export type DurationCategorySlug = DurationCategory["slug"];

// Removed: MOVEMENT_TYPES, DIRECTIONS, SPEEDS, SPECIAL_ANGLES
// These belonged to the camera movement taxonomy and are no longer used.
