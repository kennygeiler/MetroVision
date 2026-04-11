/**
 * TransNet threshold sweep × merge-gap grid vs human verified cuts (F1 / tp / fp / fn).
 *
 * Runs `python3 -m pipeline.transnet_cuts` once per threshold, then reuses that JSON
 * while varying METROVISION_BOUNDARY_MERGE_GAP_SEC + PyScene ensemble (same as detect-export-cuts).
 *
 *   export PATH="$HOME/.local/bin:$PATH"
 *   METROVISION_BOUNDARY_DETECTOR=pyscenedetect_ensemble_pyscene \
 *     npm run eval:sweep-transnet -- \
 *       --video /path/to/clip.mov \
 *       --gold eval/gold/gold.json \
 *       --start 0 --end 780 \
 *       --thresholds 0.4,0.5,0.6 \
 *       --merge-gaps 0.22,0.35 \
 *       --device cpu \
 *       --out eval/runs/sweep-transnet-report.md
 *
 * Requires: scenedetect on PATH; TransNet deps (`pip install transnetv2-pytorch` or requirements-transnet).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { boundaryMergeEpsilonSec } from "@/lib/boundary-ensemble";
import { evalBoundaryCuts } from "@/lib/boundary-eval";
import { extractCutsSecFromEvalJson } from "@/lib/eval-cut-json";
import {
  clipDetectedSplitsToWindow,
  detectShotsForIngest,
  offsetDetectedSplits,
  prepareIngestTimelineAnalysisMedia,
  roundTime,
  type DetectedSplit,
} from "@/lib/ingest-pipeline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function parseNumList(s: string): number[] {
  return s
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n));
}

function loadJsonArrayCuts(filePath: string): number[] {
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) {
    throw new Error(`${filePath}: expected JSON array of numbers`);
  }
  return data
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x >= 0)
    .map((x) => roundTime(x));
}

function splitsToCutsSec(splits: DetectedSplit[]): number[] {
  const sorted = [...splits].sort((a, b) => a.start - b.start);
  if (sorted.length < 2) return [];
  return sorted.slice(1).map((s) => roundTime(s.start));
}

type Row = {
  mergeGap: number;
  transnetThreshold: string;
  transnetInteriorCuts: number;
  predInteriorCuts: number;
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
  boundaryLabel: string;
};

async function runMergedDetect(
  videoResolved: string,
  timeline: { startSec?: number; endSec?: number },
  inlineExtra: number[],
  detector: "adaptive" | "content",
): Promise<{ cutsSec: number[]; boundaryLabel: string; extraCutsMerged: number }> {
  const timelinePlan = await prepareIngestTimelineAnalysisMedia(videoResolved, timeline);
  try {
    const r = await detectShotsForIngest(timelinePlan.analysisPath, detector, {
      inlineExtraBoundaryCuts: inlineExtra,
      segmentFilmWindow: timelinePlan.segmentFilmWindow,
    });
    let splits = r.splits;
    if (timelinePlan.splitTimeOffsetSec !== 0) {
      splits = offsetDetectedSplits(splits, timelinePlan.splitTimeOffsetSec);
    }
    splits = clipDetectedSplitsToWindow(splits, timeline);
    return {
      cutsSec: splitsToCutsSec(splits),
      boundaryLabel: r.ctx.boundaryLabel,
      extraCutsMerged: r.ctx.extraCutsMerged,
    };
  } finally {
    await timelinePlan.disposeSegment?.();
  }
}

function runTransNetExport(
  videoPath: string,
  outJson: string,
  threshold: number,
  device: string,
): void {
  const r = spawnSync(
    "python3",
    [
      "-m",
      "pipeline.transnet_cuts",
      videoPath,
      "-o",
      outJson,
      "--threshold",
      String(threshold),
      "--device",
      device,
    ],
    { cwd: REPO_ROOT, stdio: "inherit", encoding: "utf-8" },
  );
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`transnet_cuts exited ${r.status}`);
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let video = "";
  let gold = "";
  let start: number | undefined;
  let end: number | undefined;
  let tol = 0.5;
  let device = "cpu";
  let thresholds = "0.4,0.5,0.6";
  let mergeGaps = "0.22,0.35";
  let out = path.join(REPO_ROOT, "eval", "runs", "sweep-transnet-report.md");
  let detector: "adaptive" | "content" = "adaptive";

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--video") video = argv[++i]!;
    else if (a === "--gold") gold = argv[++i]!;
    else if (a === "--start") start = Number(argv[++i]);
    else if (a === "--end") end = Number(argv[++i]);
    else if (a === "--tol") tol = Number(argv[++i]);
    else if (a === "--device") device = argv[++i]!;
    else if (a === "--thresholds") thresholds = argv[++i]!;
    else if (a === "--merge-gaps") mergeGaps = argv[++i]!;
    else if (a === "--out") out = argv[++i]!;
    else if (a === "--detector") {
      const d = argv[++i];
      if (d !== "content" && d !== "adaptive") throw new Error("--detector adaptive|content");
      detector = d;
    }
  }

  if (!video || !gold) {
    console.error(
      "Usage: npm run eval:sweep-transnet -- --video PATH --gold PATH [--start 0] [--end 780] [--tol 0.5] [--thresholds 0.4,0.5,0.6] [--merge-gaps 0.22,0.35] [--device cpu] [--out report.md]",
    );
    process.exit(1);
  }
  return {
    video: path.resolve(video),
    gold: path.resolve(gold),
    timeline: { startSec: start, endSec: end } as {
      startSec?: number;
      endSec?: number;
    },
    tol,
    device,
    thresholdList: parseNumList(thresholds),
    mergeGapList: parseNumList(mergeGaps),
    out: path.resolve(out),
    detector,
  };
}

async function main() {
  const opts = parseArgs();
  if (opts.thresholdList.length === 0 || opts.mergeGapList.length === 0) {
    throw new Error("Need at least one threshold and one merge gap");
  }

  const humanVerifiedCuts = extractCutsSecFromEvalJson(
    JSON.parse(readFileSync(opts.gold, "utf-8")) as unknown,
  );
  const tmpDir = mkdtempSync(path.join(tmpdir(), "metrovision-transnet-sweep-"));
  const transnetFiles = new Map<number, string>();

  console.error(`[sweep-transnet] tmp: ${tmpDir}`);
  for (const t of opts.thresholdList) {
    const fp = path.join(tmpDir, `transnet-${t}.json`);
    console.error(`[sweep-transnet] TransNet threshold=${t} → ${fp}`);
    runTransNetExport(opts.video, fp, t, opts.device);
    transnetFiles.set(t, fp);
  }

  const rows: Row[] = [];

  for (const mergeGap of opts.mergeGapList) {
    process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC = String(mergeGap);
    const effectiveGap = boundaryMergeEpsilonSec();
    console.error(`[sweep-transnet] merge gap env → ${effectiveGap}s`);

    // Baseline: no TransNet
    const base = await runMergedDetect(opts.video, opts.timeline, [], opts.detector);
    const ev0 = evalBoundaryCuts(humanVerifiedCuts, base.cutsSec, opts.tol);
    rows.push({
      mergeGap: effectiveGap,
      transnetThreshold: "—",
      transnetInteriorCuts: 0,
      predInteriorCuts: base.cutsSec.length,
      tp: ev0.truePositives,
      fp: ev0.falsePositives,
      fn: ev0.falseNegatives,
      precision: ev0.precision,
      recall: ev0.recall,
      f1: ev0.f1,
      boundaryLabel: base.boundaryLabel,
    });

    for (const t of opts.thresholdList) {
      const f = transnetFiles.get(t)!;
      const extra = loadJsonArrayCuts(f);
      const merged = await runMergedDetect(opts.video, opts.timeline, extra, opts.detector);
      const ev = evalBoundaryCuts(humanVerifiedCuts, merged.cutsSec, opts.tol);
      rows.push({
        mergeGap: effectiveGap,
        transnetThreshold: String(t),
        transnetInteriorCuts: extra.length,
        predInteriorCuts: merged.cutsSec.length,
        tp: ev.truePositives,
        fp: ev.falsePositives,
        fn: ev.falseNegatives,
        precision: ev.precision,
        recall: ev.recall,
        f1: ev.f1,
        boundaryLabel: merged.boundaryLabel,
      });
    }
  }

  rmSync(tmpDir, { recursive: true, force: true });

  const best = rows.reduce((a, b) => (b.f1 > a.f1 ? b : a), rows[0]!);
  const bestRecall = rows.reduce((a, b) => (b.recall > a.recall ? b : a), rows[0]!);

  const md: string[] = [];
  md.push("# TransNet threshold × merge-gap sweep");
  md.push("");
  md.push(`- **Generated:** ${new Date().toISOString()}`);
  md.push(`- **Video:** \`${path.relative(REPO_ROOT, opts.video) || opts.video}\``);
  md.push(
    `- **Human verified cuts:** \`${path.relative(REPO_ROOT, opts.gold) || opts.gold}\` (${humanVerifiedCuts.length} interior cuts)`,
  );
  md.push(
    `- **Window:** start=${opts.timeline.startSec ?? "∅"} end=${opts.timeline.endSec ?? "∅"} · **tol**=${opts.tol}s`,
  );
  md.push(`- **Detector:** PyScene via \`METROVISION_BOUNDARY_DETECTOR\` (expect ensemble) + **adaptive** request family`);
  md.push(`- **TransNet device:** ${opts.device}`);
  md.push("");
  md.push("## Results");
  md.push("");
  md.push(
    "| merge gap | TransNet thr | TN cuts | pred cuts | TP | FP | FN | P | R | F1 | boundary (short) |",
  );
  md.push("|----------:|-------------|--------:|----------:|---:|---:|---:|--:|--:|---:|------------------|");
  for (const r of rows) {
    const bl = r.boundaryLabel.replace("pyscenedetect_ensemble_pyscene", "ens").slice(0, 28);
    md.push(
      `| ${r.mergeGap} | ${r.transnetThreshold} | ${r.transnetInteriorCuts} | ${r.predInteriorCuts} | ${r.tp} | ${r.fp} | ${r.fn} | ${r.precision.toFixed(3)} | ${r.recall.toFixed(3)} | ${r.f1.toFixed(3)} | ${bl} |`,
    );
  }
  md.push("");
  md.push(`- **Best F1:** merge_gap=${best.mergeGap}, transnet_thr=${best.transnetThreshold}, F1=${best.f1.toFixed(3)}`);
  md.push(
    `- **Best recall:** merge_gap=${bestRecall.mergeGap}, transnet_thr=${bestRecall.transnetThreshold}, R=${bestRecall.recall.toFixed(3)} (F1=${bestRecall.f1.toFixed(3)})`,
  );
  md.push("");
  md.push("## Distance to “reliable” (engineering view)");
  md.push("");
  md.push(
    "“Reliable” depends on product bar. For **boundary detection** alone, a practical internal ladder is:",
  );
  md.push("");
  md.push(
    "1. **Operational:** `scenedetect` on PATH; `boundaryLabel` shows **ensemble**, not `ffmpeg_scene` fallback.",
  );
  md.push(
    "2. **Stability:** Same human verified cuts file + same clip → metrics reproducible within small drift when env is pinned.",
  );
  md.push(
    "3. **Quality (example bars):** F1 **≥ 0.80** and recall **≥ 0.75** at your chosen **tol** (e.g. 0.5 s) on a **representative** hand-cut reference — stricter if you need frame-level agreement.",
  );
  md.push("");
  md.push(
    `**This sweep’s best F1 = ${best.f1.toFixed(3)}**, best recall = **${bestRecall.recall.toFixed(3)}** — ${best.f1 >= 0.8 ? "at/above" : "below"} an illustrative **0.80** F1 bar; closing the gap is mostly **more tuning** (TransNet threshold, merge gap, optional second-pass review), not missing plumbing.`,
  );
  md.push("");
  md.push(
    "**Full-film reliability** also needs: provenance on every ingest, optional HITL on ambiguous segments, and the same **timebase** between human verified cuts and source.",
  );
  md.push("");

  writeFileSync(opts.out, md.join("\n"));
  console.error(`[sweep-transnet] wrote ${opts.out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
