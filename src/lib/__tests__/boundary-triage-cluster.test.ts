import { describe, expect, it } from "vitest";

import { BOUNDARY_TRIAGE_KIND, deriveBoundaryCluster } from "../boundary-triage-cluster";

describe("deriveBoundaryCluster", () => {
  it("always returns the single cut-boundary kind", () => {
    expect(deriveBoundaryCluster()).toBe(BOUNDARY_TRIAGE_KIND);
  });
});
