# Boundary eval — current status (living notes)

**Purpose:** Single place for **where we are** on shot-boundary evaluation: canonical gold/pred files, latest numbers, decisions, and **benchmark targets**. Update this when a run changes the baseline or when strategy shifts.

**Deeper narrative:** [`docs/tuning-flow.md`](../docs/tuning-flow.md) · **Env / workflow:** [`docs/pipeline-analysis.md`](../docs/pipeline-analysis.md) §3.

---

## Canonical benchmark (Ran / `ranshort`, hand gold)

| Field | Value |
|-------|--------|
| **Gold JSON** | [`eval/gold/gold-ran-2026-04-10.json`](../gold/gold-ran-2026-04-10.json) — dense **hard-cut** instants (interior `cutsSec`; see [`eval/gold/README.md`](../gold/README.md)) |
| **Eval window** | **0–780 s** film-absolute (`--start 0 --end 780` on detect / gold-aligned segment) |
| **Match tolerance** | **`0.5 s`** (`evalBoundaryCuts` greedy one-to-one — same as `pnpm eval:pipeline` / `detect-export-cuts --gold`) |
| **Primary metric** | **F1** at fixed tol; **recall** is the main bottleneck historically |

### Registered baseline (ensemble + merge gap)

**Config (detect / ingest-aligned):**

- `METROVISION_BOUNDARY_DETECTOR=pyscenedetect_ensemble_pyscene`
- `METROVISION_BOUNDARY_MERGE_GAP_SEC=0.22`
- PyScene CLI on `PATH` (avoid `ffmpeg_scene+ensemble_fallback` for apples-to-apples)

**Predicted JSON in repo (reference):**

- [`eval/predicted/ran-detect-ensemble-gap022.json`](../predicted/ran-detect-ensemble-gap022.json)
- [`eval/predicted/ran-presigned-local-20260410.json`](../predicted/ran-presigned-local-20260410.json) — 2026-04-10 re-run from presigned S3 download + local file; **same cuts/metrics** as `ran-detect-ensemble-gap022` (repro check)

**Numbers @ tol 0.5 s** (gold vs either baseline file):

| Metric | Value |
|--------|------:|
| TP | 45 |
| FP | 10 |
| FN | 26 |
| Precision | **0.818** |
| Recall | **0.634** |
| F1 | **0.714** |
| Interior pred cuts | 55 |
| **`boundaryLabel`** | `pyscenedetect_ensemble_pyscene` |

**Interpretation:** Localization for matched pairs is good; **coverage** (recall) limits F1. Improving eval *quality* here means raising **TP** and/or lowering **FN** without a larger FP explosion.

---

## Improvement targets (product / tuning)

These are **goals**, not guarantees — track progress only against the **canonical benchmark** above unless you add a second film (Phase 11).

| Tier | F1 @ 0.5 s | Recall @ 0.5 s | Notes |
|------|------------|----------------|--------|
| **Baseline (current)** | ≈ **0.71** | ≈ **0.63** | Locked to table above |
| **Near-term** | **≥ 0.75** | **≥ 0.70** | Credible step from FN-centric work + fusion/refine |
| **Stretch** | **> 0.80** | **> 0.75** | Requires ~+9 TP on ~71 gold at fixed precision band (order-of-magnitude from prior lab notes) |

**Secondary checks (same gold/pred, tol 0.5):**

- `pnpm eval:boundary-deltas` — mean/median **|pred−gt|** on TPs; watch for systematic bias when changing detectors.
- `pnpm eval:boundary-misses -- … --markdown --out eval/runs/…` — FN/FP lists for scrubbing.

**Regression guard:**

- `pnpm eval:smoke` — CI smoke JSON, F1 = 1 on tiny fixture.
- Do not regress **Ran baseline** F1 materially without a documented tradeoff (e.g. precision for recall).

---

## Decisions already logged

- **TransNet threshold × merge-gap sweeps** on this clip did **not** beat **ensemble-only @ gap 0.22** — see [`2026-04-10-transnet-threshold-sweep.md`](2026-04-10-transnet-threshold-sweep.md) and [`docs/tuning-flow.md`](../docs/tuning-flow.md) decision block. Next lever is **FN analysis → local refine → fusion policy** (roadmap Phases 7–9), not more TransNet grid on Ran alone.

---

## Operational notes (2026-04-10)

- **S3 presigned URLs:** `curl` GET may work when `HEAD` returns 403. **FFmpeg** direct on long presigned URLs failed in one environment; **download to local path** then `detect:export-cuts` succeeded. See commit history / `detect-export-cuts` HTTPS path handling.
- **Ledger:** optional `eval/runs/ledger.jsonl` via `detect-export-cuts --ledger`.

---

## Next roadmap slice

**Phase 9 (implemented in code):** **`src/lib/boundary-fusion.ts`**, **`detect-export-cuts --fusion-policy`**, **`detectShotsForIngest({ boundaryFusionPolicy })`**. When claiming a metric improvement vs the baseline table above, record **predicted JSON path**, **`fusionPolicy`**, **`boundaryLabel`**, merge gap, and detector env (see **`eval/runs/README.md`**). Roadmap / acceptance notes: [`.planning/phases/09-shot-boundary-fusion-policy-consensus-and-prune-auxiliary-detector-peaks/`](../../.planning/phases/09-shot-boundary-fusion-policy-consensus-and-prune-auxiliary-detector-peaks/).
