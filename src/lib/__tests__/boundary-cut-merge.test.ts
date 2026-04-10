import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mergeInteriorCutSec } from "../boundary-cut-merge";

describe("mergeInteriorCutSec", () => {
  const prev = process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC;

  beforeEach(() => {
    process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC = "0.35";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC;
    else process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC = prev;
  });

  it("merges nearby duplicates from base and extras", () => {
    const out = mergeInteriorCutSec([10, 20], [10.1]);
    expect(out.length).toBe(2);
    expect(out[0]).toBeGreaterThanOrEqual(10);
    expect(out[0]).toBeLessThanOrEqual(10.1);
    expect(out[1]).toBe(20);
  });
});
