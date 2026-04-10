import { describe, expect, it } from "vitest";

import { mergeInteriorCutSec } from "../boundary-cut-merge";
import {
  fuseBoundaryCutStreams,
  parseBoundaryFusionPolicy,
} from "../boundary-fusion";

describe("fuseBoundaryCutStreams", () => {
  it("merge_flat matches mergeInteriorCutSec for same inputs", () => {
    const base = [1.2, 45.678, 120];
    const extra = [45.9, 200];
    expect(fuseBoundaryCutStreams(base, extra, "merge_flat")).toEqual(
      mergeInteriorCutSec(base, extra),
    );
  });

  it("auxiliary_near_primary rejects auxiliary with no primary within eps", () => {
    const out = fuseBoundaryCutStreams(
      [10],
      [100],
      "auxiliary_near_primary",
      0.5,
    );
    expect(out).toEqual([10]);
  });

  it("auxiliary_near_primary returns empty when primary is empty", () => {
    expect(
      fuseBoundaryCutStreams([], [5, 6], "auxiliary_near_primary", 0.5),
    ).toEqual([]);
  });

  it("pairwise_min_sources drops isolated auxiliary peak", () => {
    expect(
      fuseBoundaryCutStreams([10], [100], "pairwise_min_sources", 1),
    ).toEqual([]);
  });

  it("pairwise_min_sources keeps midpoint when primary and auxiliary agree within eps/2", () => {
    const out = fuseBoundaryCutStreams(
      [10],
      [10.2],
      "pairwise_min_sources",
      1,
    );
    expect(out).toEqual([10.1]);
  });
});

describe("parseBoundaryFusionPolicy", () => {
  it("accepts known slugs", () => {
    expect(parseBoundaryFusionPolicy("merge_flat")).toBe("merge_flat");
    expect(parseBoundaryFusionPolicy(" auxiliary_near_primary ")).toBe(
      "auxiliary_near_primary",
    );
  });

  it("rejects unknown", () => {
    expect(parseBoundaryFusionPolicy("nope")).toBe(null);
    expect(parseBoundaryFusionPolicy("")).toBe(null);
  });
});
