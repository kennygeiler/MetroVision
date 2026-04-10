# Phase 8 — Research: local refinement on FN windows

**Gathered:** 2026-04-10  
**Status:** Complete

## Findings

- **`detectShotsForIngest`** (`src/lib/ingest-pipeline.ts`) already accepts **`segmentFilmWindow`** (`IngestAbsoluteWindow`: `absStart`, `absEnd`). When set, detection runs on a temp segment via **`prepareIngestTimelineAnalysisMedia`** + FFmpeg remux; splits are **offset** back to film-absolute times (`splitTimeOffsetSec`).
- **`scripts/detect-export-cuts.ts`** is the reference CLI pattern: `prepareIngestTimelineAnalysisMedia` → `detectShotsForIngest` with `{ segmentFilmWindow, inlineExtraBoundaryCuts }` → `offsetDetectedSplits` → `clipDetectedSplitsToWindow` → `splitsToCutsSec`.
- **Merge policy:** Interior cut instants should be merged with the **baseline** predicted cuts using **`clusterCutTimes`** + **`boundaryMergeEpsilonSec()`** from **`src/lib/boundary-ensemble.ts`** (same epsilon as ingest merge gap semantics).
- **Cost:** One PyScene/ffmpeg pass **per FN window** — acceptable for tuning / offline CLI; must document runtime and suggest **`--max-windows`** or similar guard for long FN lists.
- **Inputs:** FN times from **`evalBoundaryCuts(...).unmatchedGoldSec`** + baseline **`cutsSec`** from predicted JSON + **`extractCutsSecFromEvalJson`** (Phase 7).

## Validation Architecture

- **Unit:** Pure helper tests for “merge baseline + candidate cuts with epsilon” if factored to `src/lib/` (optional small export).
- **Integration / manual:** Run script on `eval/gold/smoke.json` with synthetic pred missing a cut — expect new cut recovered or documented limitation; run on Ran sample with `--max-windows 3` to limit time.
- **Regression:** `pnpm test`, `pnpm eval:smoke` unchanged.

## RESEARCH COMPLETE
