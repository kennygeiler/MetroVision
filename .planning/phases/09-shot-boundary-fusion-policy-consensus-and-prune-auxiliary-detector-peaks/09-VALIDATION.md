---
phase: 09
slug: shot-boundary-fusion-policy-consensus-and-prune-auxiliary-detector-peaks
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 09 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Quick command** | `pnpm test` |
| **Benchmark command** | `pnpm eval:pipeline -- eval/gold/gold-ran-2026-04-10.json <pred.json> --tol 0.5` |

## Benchmarks (must read `eval/runs/STATUS.md`)

| Check | Pass condition |
|-------|----------------|
| **Ran primary** | vs `eval/gold/gold-ran-2026-04-10.json`, window 0–780 implied by gold, **tol 0.5** |
| **Baseline** | F1 **0.714**, R **0.634**, P **0.818** (reference preds in STATUS) |
| **Near-term goal** | F1 **≥ 0.75** and R **≥ 0.70** *or* documented tradeoff (table in PR / `eval/runs/` note) |
| **Regression** | `pnpm eval:smoke` green; Ran F1 not below **0.70** without explicit “precision-first” label |

## Per-Task Map

| Task | Automated | Manual |
|------|-----------|--------|
| 09-01 | Vitest fusion unit tests | — |
| 09-02 | `pnpm test`; optional `eval:pipeline` on committed pred if new JSON added | Compare markdown note in `eval/runs/` |

## Validation Sign-Off

- [x] STATUS.md updated (Phase 9 implemented pointer + logging note)
- [x] `pnpm test` green (`boundary-fusion.test.ts`)

**Offline fusion-only CLI (`eval:fusion-offline`):** deferred per 09-02-03 — use **`detect-export-cuts`** + **`--extra-cuts`** / env extras.

**Approval:** 2026-04-10
