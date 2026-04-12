/**
 * Stable colors for composition taxonomy slugs used in D3 views.
 * Falls back to deterministic HSL for unknown slugs (future taxonomy adds).
 */

const FRAMING_HUES: Record<string, number> = {
  rule_of_thirds_left: 200,
  rule_of_thirds_right: 210,
  centered: 175,
  off_center: 165,
  split: 145,
  frame_within_frame: 125,
  negative_space_dominant: 255,
  filled: 35,
  leading_lines: 95,
  golden_ratio: 305,
};

export function colorForFraming(slug: string): string {
  const hue = FRAMING_HUES[slug];
  if (hue != null) {
    return `hsl(${hue} 52% 48%)`;
  }
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return `hsl(${h % 360} 48% 45%)`;
}

export function colorForCategorySlug(
  slug: string | null | undefined,
  saturation: number,
  lightness: number,
): string {
  const s = slug ?? "";
  let h = 216;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `hsl(${h % 360} ${saturation}% ${lightness}%)`;
}
