import { afterEach, describe, expect, it } from "vitest";

import {
  boundaryMergeEpsilonSec,
  DEFAULT_BOUNDARY_MERGE_GAP_SEC,
} from "@/lib/boundary-ensemble";

describe("boundaryMergeEpsilonSec", () => {
  const prev = process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC;

  afterEach(() => {
    if (prev === undefined) delete process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC;
    else process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC = prev;
  });

  it("uses recall-first default when env unset", () => {
    delete process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC;
    expect(boundaryMergeEpsilonSec()).toBe(DEFAULT_BOUNDARY_MERGE_GAP_SEC);
  });

  it("honors valid env", () => {
    process.env.METROVISION_BOUNDARY_MERGE_GAP_SEC = "0.22";
    expect(boundaryMergeEpsilonSec()).toBe(0.22);
  });
});
