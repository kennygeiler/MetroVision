/**
 * Run production shot-boundary detection only (no DB, no Gemini, no S3).
 * Writes JSON compatible with `pnpm eval:pipeline` (cutsSec + metadata).
 *
 *   pnpm detect:export-cuts -- /path/to/film.mp4 [--start 0] [--end 720] [--out pred.json]
 *   pnpm detect:export-cuts -- video.mp4 --gold eval/gold/ran-first-12m.json --tol 0.5 --ledger
 *
 * Honors the same env as worker ingest: METROVISION_BOUNDARY_DETECTOR, METROVISION_BOUNDARY_MERGE_GAP_SEC,
 * METROVISION_EXTRA_BOUNDARY_CUTS_JSON (merged with optional --extra-cuts file in addition to ingest-pipeline's file load).
 *
 * Note: `detectShotsForIngest` already merges `METROVISION_EXTRA_BOUNDARY_CUTS_JSON` from the environment.
 * `--extra-cuts` adds film-absolute seconds from a JSON array file for this run only (merged like ingest `extraBoundaryCuts`).
 * `--fusion-policy` controls how primary detector cuts merge with those extras (and file env extras): `merge_flat` (default), `auxiliary_near_primary`, `pairwise_min_sources`.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { evalBoundaryCuts } from "@/lib/boundary-eval";
import {
  parseBoundaryFusionPolicy,
  type BoundaryFusionPolicy,
} from "@/lib/boundary-fusion";
import { extractCutsSecFromEvalJson } from "@/lib/eval-cut-json";
import { boundaryMergeEpsilonSec } from "@/lib/boundary-ensemble";
import {
  clipDetectedSplitsToWindow,
  detectShotsForIngest,
  offsetDetectedSplits,
  prepareIngestTimelineAnalysisMedia,
  roundTime,
  type DetectedSplit,
} from "@/lib/ingest-pipeline";

export type DetectExportPayload = {
  schemaVersion: "1.1";
  source: "metrovision_detect_export";
  generatedAt: string;
  videoPath: string;
  videoPathResolved: string;
  ingestStartSec?: number;
  ingestEndSec?: number;
  filmTitle?: string;
  runId?: string;
  cutsSec: number[];
  shotCount: number;
  splits: Array<{ start: number; end: number; index: number }>;
  boundary: {
    boundaryLabel: string;
    usedEnsemble: boolean;
    resolvedDetector: string;
    extraCutsMerged: number;
    mergeGapSec: number;
    fusionPolicy: BoundaryFusionPolicy;
    boundaryDetectorEnv: string;
    extraBoundaryCutsJsonEnv: string;
  };
  evalAgainstGold?: {
    goldPath: string;
    toleranceSec: number;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1: number;
  };
};

function usage(): never {
  console.error(`
Usage:
  pnpm detect:export-cuts -- <videoPath> [options]

Options:
  --start SEC              ingestStartSec (film-absolute), optional
  --end SEC                ingestEndSec, optional
  --detector adaptive|content   passed to detectShotsForIngest (ensemble ignores family choice)
  --extra-cuts PATH        JSON array of film-absolute cut seconds (merged this run only)
  --fusion-policy POLICY   merge_flat | auxiliary_near_primary | pairwise_min_sources (default: merge_flat)
  --out PATH               write JSON file; default: stdout
  --gold PATH              human verified cuts JSON (cutsSec) — compute metrics and embed in output
  --tol SEC                tolerance for --gold (default: 0.5)
  --ledger                 append one JSON line to eval/runs/ledger.jsonl
  --run-id ID              label for ledger / metadata
  --film-title TEXT        stored in JSON only (tracking)

Environment (same as worker):
  METROVISION_BOUNDARY_DETECTOR, METROVISION_BOUNDARY_MERGE_GAP_SEC,
  METROVISION_EXTRA_BOUNDARY_CUTS_JSON, SCENEDETECT_PATH, …
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let start: number | undefined;
  let end: number | undefined;
  let detector: "content" | "adaptive" = "adaptive";
  let extraCutsPath: string | undefined;
  let fusionPolicyRaw: string | undefined;
  let outPath: string | undefined;
  let goldPath: string | undefined;
  let tol = 0.5;
  let ledger = false;
  let runId: string | undefined;
  let filmTitle: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--start") start = Number(argv[++i]);
    else if (a === "--end") end = Number(argv[++i]);
    else if (a === "--detector") {
      const d = argv[++i];
      if (d !== "content" && d !== "adaptive") usage();
      detector = d;
    } else if (a === "--extra-cuts") extraCutsPath = argv[++i]!;
    else if (a === "--fusion-policy") fusionPolicyRaw = argv[++i]!;
    else if (a === "--out") outPath = argv[++i]!;
    else if (a === "--gold") goldPath = argv[++i]!;
    else if (a === "--tol") tol = Number(argv[++i]);
    else if (a === "--ledger") ledger = true;
    else if (a === "--run-id") runId = argv[++i]!;
    else if (a === "--film-title") filmTitle = argv[++i]!;
    else if (a.startsWith("-")) usage();
    else positional.push(a);
  }

  const videoPath = positional[0];
  if (!videoPath) usage();
  if (positional.length > 1) usage();
  if (start !== undefined && !Number.isFinite(start)) usage();
  if (end !== undefined && !Number.isFinite(end)) usage();
  if (!Number.isFinite(tol) || tol < 0) usage();

  let fusionPolicy: BoundaryFusionPolicy = "merge_flat";
  if (fusionPolicyRaw !== undefined) {
    const p = parseBoundaryFusionPolicy(fusionPolicyRaw);
    if (!p) {
      console.error(
        `[detect-export-cuts] invalid --fusion-policy "${fusionPolicyRaw}"`,
      );
      usage();
    }
    fusionPolicy = p;
  }

  return {
    videoPath,
    timeline: { startSec: start, endSec: end } as {
      startSec?: number;
      endSec?: number;
    },
    detector,
    extraCutsPath,
    fusionPolicy,
    outPath,
    goldPath,
    tol,
    ledger,
    runId,
    filmTitle,
  };
}

function loadJsonArrayCuts(filePath: string): number[] {
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) {
    throw new Error(`${filePath}: expected a JSON array of numbers`);
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

function resolveVideoPathOrUrl(videoPath: string): string {
  const t = videoPath.trim();
  return /^https?:\/\//i.test(t) ? t : path.resolve(t);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const resolved = resolveVideoPathOrUrl(args.videoPath);
  const timeline = args.timeline;

  const inlineExtra = args.extraCutsPath
    ? loadJsonArrayCuts(path.resolve(args.extraCutsPath))
    : [];

  const timelinePlan = await prepareIngestTimelineAnalysisMedia(resolved, timeline);
  let splits: DetectedSplit[];
  let boundaryLabel: string;
  let usedEnsemble: boolean;
  let resolvedDetector: string;
  let extraCutsMerged: number;
  try {
    const r = await detectShotsForIngest(timelinePlan.analysisPath, args.detector, {
      inlineExtraBoundaryCuts: inlineExtra,
      boundaryFusionPolicy: args.fusionPolicy,
      segmentFilmWindow: timelinePlan.segmentFilmWindow,
    });
    splits = r.splits;
    boundaryLabel = r.ctx.boundaryLabel;
    usedEnsemble = r.ctx.usedEnsemble;
    resolvedDetector = r.ctx.resolvedDetector;
    extraCutsMerged = r.ctx.extraCutsMerged;
    if (timelinePlan.splitTimeOffsetSec !== 0) {
      splits = offsetDetectedSplits(splits, timelinePlan.splitTimeOffsetSec);
    }
  } finally {
    await timelinePlan.disposeSegment?.();
  }

  splits = clipDetectedSplitsToWindow(splits, timeline);
  const cutsSec = splitsToCutsSec(splits);
  const mergeGapSec = boundaryMergeEpsilonSec();

  let evalAgainstGold: DetectExportPayload["evalAgainstGold"];
  if (args.goldPath) {
    const goldRaw = JSON.parse(
      readFileSync(path.resolve(args.goldPath), "utf-8"),
    ) as unknown;
    const humanVerifiedCuts = extractCutsSecFromEvalJson(goldRaw);
    const ev = evalBoundaryCuts(humanVerifiedCuts, cutsSec, args.tol);
    evalAgainstGold = {
      goldPath: path.resolve(args.goldPath),
      toleranceSec: args.tol,
      truePositives: ev.truePositives,
      falsePositives: ev.falsePositives,
      falseNegatives: ev.falseNegatives,
      precision: ev.precision,
      recall: ev.recall,
      f1: ev.f1,
    };
    console.error(
      `[detect-export-cuts] vs human verified cuts: P=${ev.precision.toFixed(3)} R=${ev.recall.toFixed(3)} F1=${ev.f1.toFixed(3)} (tol=${args.tol}s) tp=${ev.truePositives} fp=${ev.falsePositives} fn=${ev.falseNegatives}`,
    );
  }

  const payload: DetectExportPayload = {
    schemaVersion: "1.1",
    source: "metrovision_detect_export",
    generatedAt: new Date().toISOString(),
    videoPath: args.videoPath,
    videoPathResolved: resolved,
    ingestStartSec: timeline.startSec,
    ingestEndSec: timeline.endSec,
    filmTitle: args.filmTitle,
    runId: args.runId,
    cutsSec,
    shotCount: splits.length,
    splits: splits.map((s) => ({
      start: roundTime(s.start),
      end: roundTime(s.end),
      index: s.index,
    })),
    boundary: {
      boundaryLabel,
      usedEnsemble,
      resolvedDetector,
      extraCutsMerged,
      mergeGapSec,
      fusionPolicy: args.fusionPolicy,
      boundaryDetectorEnv: (process.env.METROVISION_BOUNDARY_DETECTOR ?? "").trim(),
      extraBoundaryCutsJsonEnv: (process.env.METROVISION_EXTRA_BOUNDARY_CUTS_JSON ?? "").trim(),
    },
    evalAgainstGold,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (args.outPath) {
    const out = path.resolve(args.outPath);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, json);
    console.error(`[detect-export-cuts] wrote ${out} (${cutsSec.length} interior cuts, ${splits.length} shots)`);
  } else {
    process.stdout.write(json);
  }

  if (args.ledger) {
    const ledgerPath = path.join(process.cwd(), "eval", "runs", "ledger.jsonl");
    mkdirSync(path.dirname(ledgerPath), { recursive: true });
    const line = {
      ts: payload.generatedAt,
      runId: args.runId ?? null,
      filmTitle: args.filmTitle ?? null,
      videoPathResolved: resolved,
      ingestStartSec: timeline.startSec ?? null,
      ingestEndSec: timeline.endSec ?? null,
      goldPath: args.goldPath ? path.resolve(args.goldPath) : null,
      tol: args.goldPath ? args.tol : null,
      precision: evalAgainstGold?.precision ?? null,
      recall: evalAgainstGold?.recall ?? null,
      f1: evalAgainstGold?.f1 ?? null,
      tp: evalAgainstGold?.truePositives ?? null,
      fp: evalAgainstGold?.falsePositives ?? null,
      fn: evalAgainstGold?.falseNegatives ?? null,
      predInteriorCuts: cutsSec.length,
      boundaryLabel,
      mergeGapSec,
      fusionPolicy: args.fusionPolicy,
      boundaryDetectorEnv: payload.boundary.boundaryDetectorEnv || null,
      outPath: args.outPath ? path.resolve(args.outPath) : null,
    };
    appendFileSync(ledgerPath, `${JSON.stringify(line)}\n`);
    console.error(`[detect-export-cuts] appended ${ledgerPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
