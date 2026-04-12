import { describe, expect, it } from "vitest";

import { formatShotDuration } from "@/lib/shot-display";

describe("formatShotDuration", () => {
  it("uses seconds at 60 and below", () => {
    expect(formatShotDuration(0)).toBe("0.0s");
    expect(formatShotDuration(60)).toBe("60.0s");
  });

  it("uses minutes above 60 seconds", () => {
    expect(formatShotDuration(90.5)).toBe("1m 30.5s");
    expect(formatShotDuration(125)).toBe("2m 5.0s");
  });

  it("omits zero remainder seconds for whole minutes", () => {
    expect(formatShotDuration(120)).toBe("2m");
  });
});
