/**
 * Shared parsing for eval JSON: raw `number[]` or `{ cutsSec: number[] }`.
 * Does not normalize/dedupe — `evalBoundaryCuts` / `normalizeCutList` handle that.
 */

const EXPECTED =
  "Expected a number[] or an object with cutsSec: number[]";

export function extractCutsSecFromEvalJson(data: unknown): number[] {
  if (Array.isArray(data)) {
    return data.map(Number).filter((x) => Number.isFinite(x) && x >= 0);
  }
  if (data && typeof data === "object" && "cutsSec" in data) {
    const c = (data as { cutsSec: unknown }).cutsSec;
    if (Array.isArray(c)) {
      return c.map(Number).filter((x) => Number.isFinite(x) && x >= 0);
    }
  }
  throw new Error(EXPECTED);
}
