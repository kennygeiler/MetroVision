# Phase 9 — Research: boundary fusion policy

**Gathered:** 2026-04-10  
**Status:** Complete (inline)

## Findings

- **Today:** Extra cut streams (TransNet JSON, `extraBoundaryCuts`, FN-window refinement) merge with PyScene output via **`clusterCutTimes`** + **`boundaryMergeEpsilonSec()`** (`src/lib/boundary-ensemble.ts`, `src/lib/boundary-cut-merge.ts`). Single stream = average-within-epsilon; no notion of **primary vs auxiliary** or **consensus**.
- **Failure mode observed (Ran):** Merging TransNet peaks at several thresholds did **not** beat ensemble-only — auxiliary peaks added **FP** without enough **FN** recovery (`eval/runs/2026-04-10-transnet-threshold-sweep.md`).
- **Gap:** A **policy layer** can (a) require confirmation from two sources within ε, (b) gate auxiliary peaks on proximity to primary candidates, (c) apply **per-film presets** (“dense gold” vs “default”) without forking the whole detector stack.
- **Code touchpoints:** `detectShotsForIngest` / `detect-export-cuts` post-processing; optional worker ingest body env; **`eval:fusion-sweep`** style CLI for offline grid vs static `cutsSec` arrays.

## Validation Architecture

- **Unit:** Vitest on pure `fuseBoundaryCuts` (or equivalent) — no FFmpeg.
- **Integration:** Ran gold JSON + synthetic primary/auxiliary peak fixtures; assert TP/FN/FP vs known greedy match.
- **Benchmark:** Per **`eval/runs/STATUS.md`** — Ran baseline F1 **0.714**; improvement = **strict improvement** on same gold/pred generation path OR documented P/R tradeoff table.

## RESEARCH COMPLETE
