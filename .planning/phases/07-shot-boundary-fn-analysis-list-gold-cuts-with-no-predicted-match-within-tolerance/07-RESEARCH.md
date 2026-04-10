# Phase 7 — Research: shot boundary FN analysis

**Gathered:** 2026-04-10  
**Status:** Complete (inline; `/gsd-plan-phase 7 --skip-research` equivalent)

## Findings

- **Core matching** lives in `src/lib/boundary-eval.ts` (`evalBoundaryCuts`, `unmatchedGoldSec` / `unmatchedPredSec`). Same greedy one-to-one match as `eval:pipeline`.
- **CLI listing** exists: `scripts/eval-boundary-misses.ts` (`pnpm eval:boundary-misses`), flags `--tol`, `--json`.
- **In-app:** `src/components/eval/gold-annotate-workspace.tsx` already computes `evalBoundaryCuts` and surfaces FN/FP copy when a predicted artifact is loaded (tolerance UI).
- **Duplication:** `extractCuts` / JSON loading is duplicated across `eval-pipeline.ts`, `eval-boundary-misses.ts`, `eval-boundary-deltas.ts`, `detect-export-cuts.ts` (gold path). A shared helper reduces drift risk.
- **Operator workflow:** `docs/tuning-flow.md` and `eval/runs/README.md` should explicitly reference `eval:boundary-misses` + optional `--out` for markdown reports appended under `eval/runs/`.

## Validation Architecture

- **Automated:** `pnpm test` (Vitest) — unit tests for any new `src/lib/eval-cuts.ts` (or equivalent) helpers; optional script-level test via importing a tiny exported `parseArgs`/`main` split (only if low cost).
- **Manual:** Run `pnpm eval:boundary-misses -- eval/gold/smoke.json eval/predicted/smoke.json --tol 0.5` and confirm exit 0 + expected counts; run with `--json` and validate JSON schema keys: `unmatchedGoldSec`, `unmatchedPredSec`, `matchedPairs`.
- **Regression:** `pnpm eval:smoke` unchanged (boundary-eval invariants).

## RESEARCH COMPLETE
