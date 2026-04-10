# TransNet threshold × merge-gap sweep

- **Generated:** 2026-04-10T02:23:33.816Z
- **Video:** `../videos/ranshort.mov`
- **Gold:** `eval/gold/gold-ran-2026-04-10.json` (71 interior cuts)
- **Window:** start=0 end=780 · **tol**=0.5s
- **Detector:** PyScene via `METROVISION_BOUNDARY_DETECTOR` (expect ensemble) + **adaptive** request family
- **TransNet device:** cpu

## Results

| merge gap | TransNet thr | TN cuts | pred cuts | TP | FP | FN | P | R | F1 | boundary (short) |
|----------:|-------------|--------:|----------:|---:|---:|---:|--:|--:|---:|------------------|
| 0.22 | — | 0 | 55 | 45 | 10 | 26 | 0.818 | 0.634 | 0.714 | ens |
| 0.22 | 0.4 | 55 | 56 | 44 | 12 | 27 | 0.786 | 0.620 | 0.693 | ens+extra_inline |
| 0.22 | 0.5 | 54 | 56 | 44 | 12 | 27 | 0.786 | 0.620 | 0.693 | ens+extra_inline |
| 0.22 | 0.6 | 53 | 56 | 44 | 12 | 27 | 0.786 | 0.620 | 0.693 | ens+extra_inline |
| 0.35 | — | 0 | 55 | 45 | 10 | 26 | 0.818 | 0.634 | 0.714 | ens |
| 0.35 | 0.4 | 55 | 56 | 44 | 12 | 27 | 0.786 | 0.620 | 0.693 | ens+extra_inline |
| 0.35 | 0.5 | 54 | 56 | 44 | 12 | 27 | 0.786 | 0.620 | 0.693 | ens+extra_inline |
| 0.35 | 0.6 | 53 | 56 | 44 | 12 | 27 | 0.786 | 0.620 | 0.693 | ens+extra_inline |

- **Best F1:** merge_gap=0.22, transnet_thr=—, F1=0.714
- **Best recall:** merge_gap=0.22, transnet_thr=—, R=0.634 (F1=0.714)

## Distance to “reliable” (engineering view)

“Reliable” depends on product bar. For **boundary detection** alone, a practical internal ladder is:

1. **Operational:** `scenedetect` on PATH; `boundaryLabel` shows **ensemble**, not `ffmpeg_scene` fallback.
2. **Stability:** Same gold + same clip → metrics reproducible within small drift when env is pinned.
3. **Quality (example bars):** F1 **≥ 0.80** and recall **≥ 0.75** at your chosen **tol** (e.g. 0.5 s) on a **representative** hand-cut gold — stricter if you need frame-level agreement.

**This sweep’s best F1 = 0.714**, best recall = **0.634** — below an illustrative **0.80** F1 bar; closing the gap is mostly **more tuning** (TransNet threshold, merge gap, optional second-pass review), not missing plumbing.

**Full-film reliability** also needs: provenance on every ingest, optional HITL on ambiguous segments, and the same **timebase** between gold and source.
