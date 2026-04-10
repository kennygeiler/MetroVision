# Ran `ranshort.mov` — PyScene ensemble + TransNet extra cuts vs ensemble only

**Gold:** `eval/gold/gold-ran-2026-04-10.json` (71 interior cuts) · **tol:** 0.5 s  
**Video:** `/home/paperspace/videos/ranshort.mov` · **Window:** `--start 0 --end 780`  
**Env:** `METROVISION_BOUNDARY_DETECTOR=pyscenedetect_ensemble_pyscene`, `METROVISION_BOUNDARY_MERGE_GAP_SEC=0.22`, `PATH` includes `~/.local/bin` (PyScene CLI).

## TransNet artifact

```bash
python3 -m pipeline.transnet_cuts /home/paperspace/videos/ranshort.mov \
  -o eval/extra-cuts/ran-ranshort-transnet.json --device cpu
```

→ **54** interior cuts (`eval/extra-cuts/ran-ranshort-transnet.json`).

## Detect-export commands

**A — Ensemble only (baseline for this comparison)**  
`--out eval/predicted/ran-detect-ensemble-gap022.json`  
(no `--extra-cuts`)

**B — Ensemble + TransNet (inline merge)**  
`--extra-cuts eval/extra-cuts/ran-ranshort-transnet.json`  
`--out eval/predicted/ran-detect-ensemble-transnet.json`  
`boundaryLabel`: `pyscenedetect_ensemble_pyscene+extra_inline`, `extraCutsMerged`: 54

## Results (2026-04-10)

| Run | Pred interior cuts | TP | FP | FN | Precision | Recall | F1 |
|-----|-------------------:|---:|---:|---:|----------:|-------:|---:|
| **A Ensemble + gap 0.22** | 55 | 45 | 10 | 26 | 0.818 | 0.634 | **0.714** |
| **B + TransNet inline** | 56 | 44 | 12 | 27 | 0.786 | 0.620 | **0.693** |

## Implication

On **this** clip, with **default TransNet threshold (0.5)** and **merge gap 0.22**, fusing **54** TransNet cuts did **not** reduce false negatives vs ensemble-only; **F1 dropped ~0.02** (one fewer TP, more FP/FN). Likely causes: TransNet **spurious** or **misaligned** candidates that absorb matches or shift the greedy pairing, or **threshold** too sensitive / insensitive for this material.

## Suggested follow-ups (not run here)

- Sweep **TransNet `--threshold`** (e.g. 0.4 / 0.6) and re-merge.  
- Try **TransNet without** tightening merge gap (ensemble + default 0.35 + extra cuts).  
- **CUDA** TransNet if available to iterate faster (here: **CPU** ~85 s for `ranshort.mov`).
