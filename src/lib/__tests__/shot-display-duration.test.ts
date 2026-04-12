import { describe, expect, it } from "vitest";

import { formatMediaClock, formatShotDuration } from "@/lib/shot-display";

describe("formatMediaClock", () => {
  it("formats like a video player (no trailing s)", () => {
    expect(formatMediaClock(0)).toBe("0:00");
    expect(formatMediaClock(4.3)).toBe("0:04.3");
    expect(formatMediaClock(17)).toBe("0:17");
    expect(formatMediaClock(60)).toBe("1:00");
    expect(formatMediaClock(90.5)).toBe("1:30.5");
    expect(formatMediaClock(125)).toBe("2:05");
    expect(formatMediaClock(120)).toBe("2:00");
  });

  it("adds hours when needed", () => {
    expect(formatMediaClock(3601)).toBe("1:00:01");
    expect(formatMediaClock(7325)).toBe("2:02:05");
  });
});

describe("formatShotDuration", () => {
  it("matches media clock for valid durations", () => {
    expect(formatShotDuration(0)).toBe("0:00");
    expect(formatShotDuration(60)).toBe("1:00");
    expect(formatShotDuration(90.5)).toBe("1:30.5");
    expect(formatShotDuration(125)).toBe("2:05");
    expect(formatShotDuration(120)).toBe("2:00");
  });

  it("returns em dash for invalid", () => {
    expect(formatShotDuration(Number.NaN)).toBe("—");
    expect(formatShotDuration(-1)).toBe("—");
  });
});
