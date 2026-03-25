# MetroVision Creative Direction

## Color Philosophy

The palette is built around a **cool-neutral base** (260deg hue in OKLCH) that evokes the blue-tinged darkness of a cinema screening room. Pure blacks are avoided -- the deepest surface (950) carries a subtle cool chroma that gives depth without feeling flat. This is not a generic dark theme; it is a projection-room aesthetic.

The **accent is violet** (280deg), chosen to feel simultaneously technical and cinematic. Violet sits between blue (technology, precision) and red (cinema, passion). It is uncommon enough in UI design to feel distinctive without being garish. The accent is used sparingly -- interactive elements, links, highlights -- never as a background fill.

**Signal colors** serve specific data roles:
- **Warm amber** (55deg) is the annotation color for video overlays. It reads clearly against dark video frames and evokes film lighting gels. This is the color of metadata overlaid on moving images.
- **Cool cyan** (210deg) is the data readout color. Timestamps, technical measurements, coordinate data. It reads as "instrument panel."
- Red and green are reserved strictly for errors and confirmations. They never appear in the data visualization palette.

**D3 visualization colors** should draw from the accent + signal palette, NOT from a default D3 color scheme. Charts should feel like they belong to the same visual world as the UI.

## Typography Rationale

The type system prioritizes **density without clutter**. MetroVision surfaces are information-rich (taxonomy labels, shot metadata, timecodes, classification confidence scores), so the type scale must accommodate many levels of hierarchy within tight spaces.

Recommended typefaces:
- **Headings**: A geometric sans-serif (Geist, DM Sans, or Satoshi). Tight letter-spacing (-0.04em) at display sizes gives a cinematic title card feel.
- **Body**: The same family or a complementary humanist sans. Readable at 14px-16px for dense metadata tables.
- **Mono**: JetBrains Mono or Geist Mono for timecodes, API responses, taxonomy slugs. Monospace data should look intentional, not like a debugging afterthought.

**All-caps labels** use wide letter-spacing (0.08em) for a technical-instrument feel -- think heads-up display or Avid editing software UI chrome. Use for section headers, filter categories, metadata field labels.

## Spacing Rhythm

The 4px base grid creates a dense-but-organized feel. Key principles:

- **Cards use 16px (space-4) padding.** Not 24px -- MetroVision is information-dense, not a marketing page.
- **Between cards: 32px (space-8).** Enough breathing room to distinguish items without wasting space.
- **Section gaps: 48-64px (space-12 to space-16).** Page sections are clearly separated.
- **Inline metadata: 4-8px (space-1 to space-2).** Taxonomy tags, timecodes, and badges sit tight against their labels.

The overall density target is closer to Spotify (dense, browseable, visually rich) than to a typical SaaS dashboard (sparse, card-heavy, lots of whitespace).

## Reference Analysis

**ShotDeck**: Learn from the shot browsing grid -- thumbnail-dominant with metadata on hover/expand. MetroVision should match this density but add the temporal dimension (video playback, timecodes, motion data) that ShotDeck lacks.

**Object detection annotation UIs**: The metadata overlay should borrow from annotation tools -- bounding boxes, directional arrows, confidence scores rendered directly on the image/video. But elevated: smoother animations, more refined typography, the warm amber color instead of raw primary colors.

**Spotify**: The browse/hierarchy UX model. Film is the album, scene is the track list, shot is the track. The navigation pattern of drilling from broad (library) to specific (track) applies directly. Dark theme, image-forward, compact information density.

**CamCloneMaster**: Reference for how camera movement data is visualized. MetroVision should exceed this in both data richness and visual polish.

## Explicit Ban List

- **No Tailwind default gray scale.** Use the custom neutral scale with 260deg cool undertone.
- **No blue-500 (#3b82f6) accent.** The accent is violet (280deg OKLCH).
- **No pure black (#000000) backgrounds.** Always use the near-black with chroma (neutral-950).
- **No pure white (#ffffff) text.** Use the off-white neutral-50.
- **No generic SaaS card layouts** with excessive whitespace and rounded corners. Dense, purposeful layouts.
- **No clinical/academic chart styling.** D3 charts use the project color palette with cinematic polish.
- **No ChatGPT-style chat UI.** The chat interface must feel like a different product -- visual-dominant, not text-dominant.
- **No default D3 color schemes** (d3.schemeCategory10, etc.). Charts use project tokens.
- **No Inter as the heading font.** Inter is acceptable for body text only if no better option is available, but headings need a more distinctive typeface.
- **No box-shadow: 0 2px 4px rgba(0,0,0,0.1).** Use layered shadows with OKLCH black if shadows are needed at all (prefer border-based elevation in a dark theme).
