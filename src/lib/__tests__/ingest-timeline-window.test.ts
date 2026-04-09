import { describe, expect, it } from "vitest";

import {
  offsetDetectedSplits,
  relativizeAbsoluteBoundaryCutsForSegment,
  resolveIngestAbsoluteWindow,
} from "../ingest-pipeline";

describe("resolveIngestAbsoluteWindow", () => {
  it("returns null when no bounds", () => {
    expect(resolveIngestAbsoluteWindow({}, 100)).toBeNull();
  });

  it("uses 0..duration when only end is set", () => {
    expect(resolveIngestAbsoluteWindow({ endSec: 50 }, 100)).toEqual({
      absStart: 0,
      absEnd: 50,
    });
  });

  it("uses start..duration when only start is set", () => {
    expect(resolveIngestAbsoluteWindow({ startSec: 10 }, 100)).toEqual({
      absStart: 10,
      absEnd: 100,
    });
  });

  it("clamps to duration", () => {
    expect(
      resolveIngestAbsoluteWindow({ startSec: 5, endSec: 999 }, 100),
    ).toEqual({ absStart: 5, absEnd: 100 });
  });

  it("throws when end required but duration unknown", () => {
    expect(() =>
      resolveIngestAbsoluteWindow({ startSec: 10 }, 0),
    ).toThrow(/ingestEndSec is required/);
  });
});

describe("relativizeAbsoluteBoundaryCutsForSegment", () => {
  it("shifts interior cuts only", () => {
    expect(
      relativizeAbsoluteBoundaryCutsForSegment([5, 50, 100, 150], 40, 120),
    ).toEqual([10, 60]);
  });
});

describe("offsetDetectedSplits", () => {
  it("adds offset and reindexes", () => {
    const o = offsetDetectedSplits(
      [
        { start: 0, end: 1, index: 0 },
        { start: 1, end: 2, index: 1 },
      ],
      100,
    );
    expect(o[0]!.start).toBe(100);
    expect(o[1]!.end).toBe(102);
    expect(o[0]!.index).toBe(0);
    expect(o[1]!.index).toBe(1);
  });

  it("returns same ref when offset 0", () => {
    const s = [{ start: 0, end: 1, index: 0 }];
    expect(offsetDetectedSplits(s, 0)).toBe(s);
  });
});
