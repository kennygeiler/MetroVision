/**
 * Matched-pair timing stats for human verified cuts vs predicted cuts (complements F1).
 *
 *   npm run eval:boundary-deltas -- --gold eval/gold/a.json --pred eval/predicted/b.json --tol 0.5
 *   npm run eval:boundary-deltas -- --gold eval/gold/a.json --pred p1.json --pred p2.json --out eval/runs/report.md
 *
 * For each TP under greedy matching: |pred−gt|, signed (pred−gt), histogram, mean/median.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { evalBoundaryCuts } from "@/lib/boundary-eval";
import { extractCutsSecFromEvalJson } from "@/lib/eval-cut-json";

function loadJsonSync(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Build monotonic edges from 0 through tol for histogram bins. */
function buildHistogramEdges(tol: number): number[] {
  const candidates = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5];
  const inner = candidates.filter((x) => x > 0 && x < tol);
  return [0, ...inner, tol];
}

function histogramAbs(abs: number[], tol: number): { label: string; count: number }[] {
  const edges = buildHistogramEdges(tol);
  const rows: { label: string; count: number }[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i]!;
    const hi = edges[i + 1]!;
    const last = i === edges.length - 2;
    const count = abs.filter((d) =>
      last ? d >= lo && d <= hi + 1e-9 : d >= lo && d < hi,
    ).length;
    const label = last
      ? `[${lo.toFixed(3)}, ${hi.toFixed(3)}] s`
      : `[${lo.toFixed(3)}, ${hi.toFixed(3)}) s`;
    rows.push({ label, count });
  }
  return rows;
}

function sectionMarkdown(
  predPath: string,
  tol: number,
  humanVerifiedCuts: number[],
  predCuts: number[],
): string {
  const ev = evalBoundaryCuts(humanVerifiedCuts, predCuts, tol);
  const pairs = ev.matchedPairs.map(({ gt, pred, deltaSec }) => ({
    gt,
    pred,
    absSec: deltaSec,
    signedSec: pred - gt,
  }));
  const absD = pairs.map((p) => p.absSec);
  const signed = pairs.map((p) => p.signedSec);
  const hist = histogramAbs(absD, tol);

  const lines: string[] = [];
  lines.push(`### Predicted: \`${path.relative(process.cwd(), predPath) || predPath}\``);
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Tolerance (match window) | ${tol} s |`);
  lines.push(`| Human verified interior cuts | ${humanVerifiedCuts.length} |`);
  lines.push(`| Pred interior cuts | ${predCuts.length} |`);
  lines.push(`| TP / FP / FN | ${ev.truePositives} / ${ev.falsePositives} / ${ev.falseNegatives} |`);
  lines.push(`| Precision / Recall / F1 | ${ev.precision.toFixed(4)} / ${ev.recall.toFixed(4)} / ${ev.f1.toFixed(4)} |`);
  lines.push(`| **Mean \\|pred−gt\\| (matched only)** | **${mean(absD).toFixed(4)} s** |`);
  lines.push(`| **Median \\|pred−gt\\|** | **${median(absD).toFixed(4)} s** |`);
  lines.push(`| Mean (pred−gt), signed | ${mean(signed).toFixed(4)} s |`);
  lines.push(`| Median (pred−gt), signed | ${median(signed).toFixed(4)} s |`);
  lines.push("");
  lines.push(
    "*Signed mean: **positive** ⇒ predicted cut is **later** than human verified cut on average; **negative** ⇒ predicted is **earlier** (e.g. human reaction lag marking after the splice).*",
  );
  lines.push("");
  lines.push("#### |pred−gt| histogram (matched pairs)");
  lines.push("");
  lines.push("| Bin | Count |");
  lines.push("|-----|-------|");
  for (const { label, count } of hist) {
    lines.push(`| ${label} | ${count} |`);
  }
  lines.push("");
  lines.push("#### All matched pairs");
  lines.push("");
  lines.push("| # | human verified (s) | pred (s) | \\|Δ\\| (s) | pred−gt (s) |");
  lines.push("|---|----------|----------|---------|-------------|");
  pairs.forEach((p, i) => {
    lines.push(
      `| ${i + 1} | ${p.gt.toFixed(3)} | ${p.pred.toFixed(3)} | ${p.absSec.toFixed(4)} | ${p.signedSec >= 0 ? "+" : ""}${p.signedSec.toFixed(4)} |`,
    );
  });
  lines.push("");
  return lines.join("\n");
}

function parseArgs(argv: string[]) {
  let gold = "";
  const preds: string[] = [];
  let tol = 0.5;
  let out = "";

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--gold") gold = argv[++i]!;
    else if (a === "--pred") preds.push(argv[++i]!);
    else if (a === "--tol") tol = Number(argv[++i]);
    else if (a === "--out") out = argv[++i]!;
    else if (!gold) gold = a;
    else preds.push(a);
  }

  if (!gold || preds.length === 0) {
    console.error(
      "Usage: npm run eval:boundary-deltas -- --gold <human-verified-cuts.json> --pred <pred.json> [--pred <p2.json>] [--tol 0.5] [--out report.md]",
    );
    process.exit(1);
  }
  if (!Number.isFinite(tol) || tol <= 0) {
    console.error("--tol must be a positive number");
    process.exit(1);
  }
  return { gold, preds, tol, out };
}

function main() {
  const { gold, preds, tol, out } = parseArgs(process.argv.slice(2));
  const goldPath = path.resolve(gold);
  const humanVerifiedCuts = extractCutsSecFromEvalJson(loadJsonSync(goldPath));

  const parts: string[] = [];
  parts.push("# Boundary timing — matched human verified cuts vs predicted cuts");
  parts.push("");
  parts.push(`- **Generated:** ${new Date().toISOString()}`);
  parts.push(
    `- **Human verified cuts:** \`${path.relative(process.cwd(), goldPath) || goldPath}\``,
  );
  parts.push(`- **Match tolerance:** ${tol} s (same as boundary eval F1)`);
  parts.push("");
  parts.push(
    "Statistics below apply only to **true positive** pairs from the same greedy one-to-one matching as `evalBoundaryCuts` / `pnpm eval:pipeline`.",
  );
  parts.push("");

  for (const p of preds) {
    const predPath = path.resolve(p);
    const predCuts = extractCutsSecFromEvalJson(loadJsonSync(predPath));
    parts.push(sectionMarkdown(predPath, tol, humanVerifiedCuts, predCuts));
  }

  const md = `${parts.join("\n")}\n`;
  if (out) {
    const outPath = path.resolve(out);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, md);
    console.info(`Wrote ${outPath}`);
  } else {
    console.info(md);
  }
}

main();
