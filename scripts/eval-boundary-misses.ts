/**
 * List false-negative gold cuts and false-positive predictions (same greedy matching as eval:pipeline).
 *
 *   pnpm eval:boundary-misses -- eval/gold/foo.json eval/predicted/foo.json [--tol 0.5] [--json] [--markdown] [--out PATH]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { evalBoundaryCuts } from "@/lib/boundary-eval";
import { extractCutsSecFromEvalJson } from "@/lib/eval-cut-json";

function loadJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function parseArgs(argv: string[]) {
  let tol = 0.5;
  let jsonOut = false;
  let markdownOut = false;
  let outPath: string | undefined;
  const files: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--tol" && argv[i + 1]) {
      tol = Number(argv[++i]);
      if (!Number.isFinite(tol) || tol < 0) throw new Error("--tol must be a non-negative number");
    } else if (a === "--json") {
      jsonOut = true;
    } else if (a === "--markdown") {
      markdownOut = true;
    } else if (a === "--out" && argv[i + 1]) {
      outPath = argv[++i]!;
    } else if (!a.startsWith("-")) {
      files.push(a);
    }
  }
  if (files.length < 2) {
    console.error(`Usage: eval:boundary-misses -- <gold.json> <predicted.json> [options]

Options:
  --tol SEC       match tolerance (default: 0.5)
  --json          stdout or --out file: JSON payload
  --markdown      stdout or --out file: Markdown report
  --out PATH      write selected format to PATH (UTF-8); stderr logs "[eval:boundary-misses] wrote PATH"
                  Without --out: plain text to stdout unless --json or --markdown`);
    process.exit(1);
  }
  if (jsonOut && markdownOut) {
    console.error("eval:boundary-misses: use only one of --json or --markdown");
    process.exit(1);
  }
  return { goldPath: files[0]!, predPath: files[1]!, tol, jsonOut, markdownOut, outPath };
}

function buildJsonPayload(
  goldPath: string,
  predPath: string,
  ev: ReturnType<typeof evalBoundaryCuts>,
) {
  return {
    goldPath,
    predPath,
    toleranceSec: ev.toleranceSec,
    precision: ev.precision,
    recall: ev.recall,
    f1: ev.f1,
    truePositives: ev.truePositives,
    falsePositives: ev.falsePositives,
    falseNegatives: ev.falseNegatives,
    unmatchedGoldSec: ev.unmatchedGoldSec,
    unmatchedPredSec: ev.unmatchedPredSec,
    matchedPairs: ev.matchedPairs,
  };
}

function buildPlainText(
  goldPath: string,
  predPath: string,
  ev: ReturnType<typeof evalBoundaryCuts>,
): string {
  const lines: string[] = [];
  lines.push(`Gold: ${goldPath}`);
  lines.push(`Pred: ${predPath}`);
  lines.push(`Tolerance: ${ev.toleranceSec}s`);
  lines.push(
    `P=${ev.precision.toFixed(4)} R=${ev.recall.toFixed(4)} F1=${ev.f1.toFixed(4)} TP=${ev.truePositives} FP=${ev.falsePositives} FN=${ev.falseNegatives}`,
  );
  lines.push("");
  lines.push(`False negatives (gold, no pred within tol): ${ev.unmatchedGoldSec.length}`);
  for (const t of ev.unmatchedGoldSec) {
    lines.push(`  ${t}`);
  }
  lines.push("");
  lines.push(`False positives (pred, no gold within tol): ${ev.unmatchedPredSec.length}`);
  for (const t of ev.unmatchedPredSec) {
    lines.push(`  ${t}`);
  }
  return `${lines.join("\n")}\n`;
}

function buildMarkdown(
  goldPath: string,
  predPath: string,
  ev: ReturnType<typeof evalBoundaryCuts>,
): string {
  const lines: string[] = [];
  lines.push("# Boundary misses (gold vs predicted)");
  lines.push("");
  lines.push(`- **Gold:** \`${goldPath}\``);
  lines.push(`- **Pred:** \`${predPath}\``);
  lines.push(`- **Tolerance:** ${ev.toleranceSec}s`);
  lines.push(
    `- **P / R / F1:** ${ev.precision.toFixed(4)} / ${ev.recall.toFixed(4)} / ${ev.f1.toFixed(4)} (TP=${ev.truePositives} FP=${ev.falsePositives} FN=${ev.falseNegatives})`,
  );
  lines.push("");
  lines.push("## False negatives (gold)");
  lines.push("");
  for (const t of ev.unmatchedGoldSec) {
    lines.push(`- ${t}`);
  }
  if (ev.unmatchedGoldSec.length === 0) {
    lines.push("*(none)*");
  }
  lines.push("");
  lines.push("## False positives (pred)");
  lines.push("");
  for (const t of ev.unmatchedPredSec) {
    lines.push(`- ${t}`);
  }
  if (ev.unmatchedPredSec.length === 0) {
    lines.push("*(none)*");
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  const { goldPath, predPath, tol, jsonOut, markdownOut, outPath } = parseArgs(
    process.argv.slice(2),
  );
  const goldCuts = extractCutsSecFromEvalJson(loadJson(goldPath));
  const predCuts = extractCutsSecFromEvalJson(loadJson(predPath));
  const ev = evalBoundaryCuts(goldCuts, predCuts, tol);

  let body: string;
  if (jsonOut) {
    body = `${JSON.stringify(buildJsonPayload(goldPath, predPath, ev), null, 2)}\n`;
  } else if (markdownOut) {
    body = buildMarkdown(goldPath, predPath, ev);
  } else {
    body = buildPlainText(goldPath, predPath, ev);
  }

  if (outPath) {
    const abs = path.resolve(outPath);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, body, "utf8");
    console.error(`[eval:boundary-misses] wrote ${abs}`);
    return;
  }

  process.stdout.write(body);
}

main();
