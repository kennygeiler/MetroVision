# Boundary timing — matched gold vs predicted cuts

- **Generated:** 2026-04-10T01:57:42.859Z
- **Gold:** `eval/gold/gold-ran-2026-04-10.json`
- **Match tolerance:** 0.5 s (same as boundary eval F1)

Statistics below apply only to **true positive** pairs from the same greedy one-to-one matching as `evalBoundaryCuts` / `pnpm eval:pipeline`.

### Predicted: `eval/predicted/ran-detect-ensemble-gap022.json`

| Metric | Value |
|--------|-------|
| Tolerance (match window) | 0.5 s |
| Gold interior cuts | 71 |
| Pred interior cuts | 55 |
| TP / FP / FN | 45 / 10 / 26 |
| Precision / Recall / F1 | 0.8182 / 0.6338 / 0.7143 |
| **Mean \|pred−gt\| (matched only)** | **0.3056 s** |
| **Median \|pred−gt\|** | **0.3490 s** |
| Mean (pred−gt), signed | -0.3056 s |
| Median (pred−gt), signed | -0.3490 s |

*Signed mean: **positive** ⇒ predicted cut is **later** than gold on average; **negative** ⇒ predicted is **earlier** (e.g. human reaction lag marking after the splice).*

#### |pred−gt| histogram (matched pairs)

| Bin | Count |
|-----|-------|
| [0.000, 0.050) s | 0 |
| [0.050, 0.100) s | 1 |
| [0.100, 0.150) s | 5 |
| [0.150, 0.200) s | 3 |
| [0.200, 0.250) s | 3 |
| [0.250, 0.300) s | 6 |
| [0.300, 0.400) s | 19 |
| [0.400, 0.500] s | 8 |

#### All matched pairs

| # | gold (s) | pred (s) | \|Δ\| (s) | pred−gt (s) |
|---|----------|----------|---------|-------------|
| 1 | 132.131 | 132.064 | 0.0670 | -0.0670 |
| 2 | 136.669 | 136.565 | 0.1040 | -0.1040 |
| 3 | 366.054 | 365.938 | 0.1160 | -0.1160 |
| 4 | 72.598 | 72.471 | 0.1270 | -0.1270 |
| 5 | 61.605 | 61.469 | 0.1360 | -0.1360 |
| 6 | 318.486 | 318.346 | 0.1400 | -0.1400 |
| 7 | 381.119 | 380.940 | 0.1790 | -0.1790 |
| 8 | 55.149 | 54.968 | 0.1810 | -0.1810 |
| 9 | 118.503 | 118.312 | 0.1910 | -0.1910 |
| 10 | 143.601 | 143.400 | 0.2010 | -0.2010 |
| 11 | 442.795 | 442.576 | 0.2190 | -0.2190 |
| 12 | 98.182 | 97.933 | 0.2490 | -0.2490 |
| 13 | 125.192 | 124.938 | 0.2540 | -0.2540 |
| 14 | 361.993 | 361.729 | 0.2640 | -0.2640 |
| 15 | 326.366 | 326.098 | 0.2680 | -0.2680 |
| 16 | 211.138 | 210.869 | 0.2690 | -0.2690 |
| 17 | 341.430 | 341.142 | 0.2880 | -0.2880 |
| 18 | 154.362 | 154.068 | 0.2940 | -0.2940 |
| 19 | 303.896 | 303.594 | 0.3020 | -0.3020 |
| 20 | 46.782 | 46.466 | 0.3160 | -0.3160 |
| 21 | 41.285 | 40.965 | 0.3200 | -0.3200 |
| 22 | 109.894 | 109.560 | 0.3340 | -0.3340 |
| 23 | 89.823 | 89.474 | 0.3490 | -0.3490 |
| 24 | 187.715 | 187.365 | 0.3500 | -0.3500 |
| 25 | 262.063 | 261.712 | 0.3510 | -0.3510 |
| 26 | 133.801 | 133.440 | 0.3610 | -0.3610 |
| 27 | 306.288 | 305.927 | 0.3610 | -0.3610 |
| 28 | 83.834 | 83.473 | 0.3610 | -0.3610 |
| 29 | 115.632 | 115.270 | 0.3620 | -0.3620 |
| 30 | 268.995 | 268.629 | 0.3660 | -0.3660 |
| 31 | 34.830 | 34.464 | 0.3660 | -0.3660 |
| 32 | 78.339 | 77.972 | 0.3670 | -0.3670 |
| 33 | 254.414 | 254.044 | 0.3700 | -0.3700 |
| 34 | 67.344 | 66.970 | 0.3740 | -0.3740 |
| 35 | 108.934 | 108.560 | 0.3740 | -0.3740 |
| 36 | 120.896 | 120.521 | 0.3750 | -0.3750 |
| 37 | 175.739 | 175.363 | 0.3760 | -0.3760 |
| 38 | 106.549 | 106.143 | 0.4060 | -0.4060 |
| 39 | 123.760 | 123.354 | 0.4060 | -0.4060 |
| 40 | 28.374 | 27.963 | 0.4110 | -0.4110 |
| 41 | 168.575 | 168.154 | 0.4210 | -0.4210 |
| 42 | 322.070 | 321.638 | 0.4320 | -0.4320 |
| 43 | 195.597 | 195.158 | 0.4390 | -0.4390 |
| 44 | 150.532 | 150.067 | 0.4650 | -0.4650 |
| 45 | 280.704 | 280.215 | 0.4890 | -0.4890 |

### Predicted: `eval/predicted/ran-detect-from-s3.mov.json`

| Metric | Value |
|--------|-------|
| Tolerance (match window) | 0.5 s |
| Gold interior cuts | 71 |
| Pred interior cuts | 37 |
| TP / FP / FN | 28 / 9 / 43 |
| Precision / Recall / F1 | 0.7568 / 0.3944 / 0.5185 |
| **Mean \|pred−gt\| (matched only)** | **0.2931 s** |
| **Median \|pred−gt\|** | **0.3190 s** |
| Mean (pred−gt), signed | -0.2931 s |
| Median (pred−gt), signed | -0.3190 s |

*Signed mean: **positive** ⇒ predicted cut is **later** than gold on average; **negative** ⇒ predicted is **earlier** (e.g. human reaction lag marking after the splice).*

#### |pred−gt| histogram (matched pairs)

| Bin | Count |
|-----|-------|
| [0.000, 0.050) s | 0 |
| [0.050, 0.100) s | 2 |
| [0.100, 0.150) s | 5 |
| [0.150, 0.200) s | 0 |
| [0.200, 0.250) s | 2 |
| [0.250, 0.300) s | 4 |
| [0.300, 0.400) s | 10 |
| [0.400, 0.500] s | 5 |

#### All matched pairs

| # | gold (s) | pred (s) | \|Δ\| (s) | pred−gt (s) |
|---|----------|----------|---------|-------------|
| 1 | 366.054 | 366.000 | 0.0540 | -0.0540 |
| 2 | 72.598 | 72.500 | 0.0980 | -0.0980 |
| 3 | 143.601 | 143.500 | 0.1010 | -0.1010 |
| 4 | 61.605 | 61.500 | 0.1050 | -0.1050 |
| 5 | 381.119 | 381.000 | 0.1190 | -0.1190 |
| 6 | 132.131 | 132.000 | 0.1310 | -0.1310 |
| 7 | 55.149 | 55.000 | 0.1490 | -0.1490 |
| 8 | 318.486 | 318.250 | 0.2360 | -0.2360 |
| 9 | 361.993 | 361.750 | 0.2430 | -0.2430 |
| 10 | 46.782 | 46.500 | 0.2820 | -0.2820 |
| 11 | 41.285 | 41.000 | 0.2850 | -0.2850 |
| 12 | 306.288 | 306.000 | 0.2880 | -0.2880 |
| 13 | 442.795 | 442.500 | 0.2950 | -0.2950 |
| 14 | 262.063 | 261.750 | 0.3130 | -0.3130 |
| 15 | 168.575 | 168.250 | 0.3250 | -0.3250 |
| 16 | 34.830 | 34.500 | 0.3300 | -0.3300 |
| 17 | 83.834 | 83.500 | 0.3340 | -0.3340 |
| 18 | 67.344 | 67.000 | 0.3440 | -0.3440 |
| 19 | 195.597 | 195.250 | 0.3470 | -0.3470 |
| 20 | 154.362 | 154.000 | 0.3620 | -0.3620 |
| 21 | 326.366 | 326.000 | 0.3660 | -0.3660 |
| 22 | 211.138 | 210.750 | 0.3880 | -0.3880 |
| 23 | 303.896 | 303.500 | 0.3960 | -0.3960 |
| 24 | 254.414 | 254.000 | 0.4140 | -0.4140 |
| 25 | 280.704 | 280.250 | 0.4540 | -0.4540 |
| 26 | 187.715 | 187.250 | 0.4650 | -0.4650 |
| 27 | 175.739 | 175.250 | 0.4890 | -0.4890 |
| 28 | 268.995 | 268.500 | 0.4950 | -0.4950 |

---

## Commentary (Ran hand gold vs auto cuts, tol = 0.5 s)

- **Ensemble + gap 0.22:** For the **45** matched pairs, **|pred−gt|** averages **~0.31 s** and median **~0.35 s**. Almost all **pred−gt** are **negative** → the **algorithm’s cut is earlier** than your gold mark on average. That lines up with **reaction lag**: you tend to place the cut **slightly after** the visible transition, while the detector hugs the frame change.
- **Within 0.5 s:** Matches are spread across the histogram; **none** in the tightest bin **[0, 0.05) s** for the ensemble run — so at **0.5 s** tolerance you are counting agreement as “same edit,” not “same frame.” For **tighter editorial alignment**, you’d compare at a smaller **`--tol`** or report mean **|pred−gt|** on matched pairs (this table).
- **FFmpeg fallback:** Fewer TPs (**28**); mean **|pred−gt|** among matches is still **~0.35 s** but the set of pairs is different (recall was much lower overall).

*Re-run after new predictions:*  
`npm run eval:boundary-deltas -- --gold eval/gold/gold-ran-2026-04-10.json --pred eval/predicted/<new>.json --tol 0.5 --out eval/runs/2026-04-10-ran-boundary-timing.md`

