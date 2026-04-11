/**
 * Scan tolerance values for two static eval JSON files (local what-if).
 *
 *   pnpm eval:sweep-tol -- eval/gold/smoke.json eval/predicted/smoke.json  (human verified cuts JSON first)
 */
import { readFileSync } from "node:fs";

import { evalBoundaryCuts } from "@/lib/boundary-eval";
import { extractCutsSecFromEvalJson } from "@/lib/eval-cut-json";

function loadJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function main() {
  const [goldPath, predPath] = process.argv.slice(2);
  if (!goldPath || !predPath) {
    console.error(
      "Usage: pnpm eval:sweep-tol -- <human-verified-cuts.json> <predicted.json>",
    );
    process.exit(1);
  }

  const humanVerifiedCuts = extractCutsSecFromEvalJson(loadJson(goldPath));
  const pCuts = extractCutsSecFromEvalJson(loadJson(predPath));

  for (let tol = 0.05; tol <= 1.01; tol += 0.05) {
    const t = Math.round(tol * 100) / 100;
    const r = evalBoundaryCuts(humanVerifiedCuts, pCuts, t);
    console.info(
      JSON.stringify({
        tol: t,
        precision: r.precision,
        recall: r.recall,
        f1: r.f1,
        tp: r.truePositives,
        fp: r.falsePositives,
        fn: r.falseNegatives,
      }),
    );
  }
}

main();
