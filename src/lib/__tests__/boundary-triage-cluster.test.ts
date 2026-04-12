import { describe, expect, it } from "vitest";

import { deriveBoundaryCluster } from "../boundary-triage-cluster";

describe("deriveBoundaryCluster", () => {
  it("detects strobe from technique notes", () => {
    expect(
      deriveBoundaryCluster({ techniqueNotes: "Heavy strobe during club scene" }),
    ).toBe("strobe_lights");
  });

  it("detects whip pan from description", () => {
    expect(deriveBoundaryCluster({ description: "Whip pan to the subject" })).toBe("whip_pans");
  });

  it("defaults to uncategorized", () => {
    expect(deriveBoundaryCluster({ description: "Static two-shot" })).toBe("uncategorized");
  });

  it("prioritizes strobe when both hints exist", () => {
    expect(
      deriveBoundaryCluster({
        techniqueNotes: "strobing lights",
        description: "whip pan exit",
      }),
    ).toBe("strobe_lights");
  });
});
