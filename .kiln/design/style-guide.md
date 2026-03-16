# SceneDeck Style Guide

## Visual Approach

**Technical precision meets cinematic elegance.** SceneDeck should feel like a film-analysis instrument: information-dense, visually controlled, and designed to let the footage remain the hero while metadata overlays read with absolute clarity.

## Color System

- Base surfaces use the OKLCH neutral scale with a cool undertone at hue 260.
- Interactive accent color is cyan at hue 200 for active controls and motion arrows.
- Overlay trajectory paths use violet to stay distinct from directional arrows.
- Metadata badges and attention markers use amber for warmth and legibility.
- Avoid pure black and pure white; depth comes from the neutral scale, not absolute extremes.

## Overlay Palette

- Motion arrows: cyan
- Trajectories and path lines: violet
- Badges and labels: amber
- Verified status: green
- Error states: red

## Typography Hierarchy

- Hero titles and page headers: Inter Variable, bold, tight tracking.
- Section headings and controls: Inter Variable, semibold.
- Body copy and supporting UI text: Inter Variable, regular or medium.
- Technical data, slugs, timecodes, and machine-derived labels: JetBrains Mono.
- Do not use bold for inline emphasis in body copy; use color or spacing contrast instead.

## Spacing And Radius

- Use a 4px base rhythm across all layouts.
- Tight spacing tokens (`--space-1` to `--space-3`) are for compact metadata and badges.
- Core layout spacing tokens (`--space-4` to `--space-8`) are for cards, forms, and grid gaps.
- Large spacing tokens (`--space-10` to `--space-32`) are for hero sections and page-level separation.
- Radii are intentional: precise surfaces use small corners, cards and panels use medium or large, pills use full radius.

## Animation Timing

- Hover and pressed states: 150ms, fast and restrained.
- Overlay reveals and cinematic UI transitions: 400ms to 700ms with ease-out timing.
- Avoid generic `transition: all` patterns; animate only the property that needs motion.

## Ban List

1. No bland dashboards.
2. No generic SaaS templates.
3. No academic or raw aesthetic.
4. No pure black or pure white.
5. No Tailwind default blue.
6. No default gray scale.
7. No `transition: all 0.3s ease`.
8. No decorative gradients.
9. No rounded-everything.
10. No stock icons without curation.
