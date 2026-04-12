import { describe, expect, it } from "vitest";

/**
 * Mirrors `ShotPlayer` segment math: file offset = startTc - anchorTc, play window length = duration.
 * After a DB split, head and tail share one file anchored at the original segment start.
 */
function fileSegmentWindow(startTc: number, duration: number, anchorTc: number) {
  const offset = startTc - anchorTc;
  return { offset, end: offset + duration };
}

describe("post-split shared-clip segment windows", () => {
  const originalStart = 100;
  const originalEnd = 200;
  const splitAt = 140;

  it("head plays from file 0 for head duration (not full original clip)", () => {
    const headDuration = splitAt - originalStart;
    const w = fileSegmentWindow(originalStart, headDuration, originalStart);
    expect(w).toEqual({ offset: 0, end: headDuration });
    expect(w.end).toBe(40);
  });

  it("tail plays from mid-file for tail duration", () => {
    const tailDuration = originalEnd - splitAt;
    const w = fileSegmentWindow(splitAt, tailDuration, originalStart);
    expect(w.offset).toBe(40);
    expect(w.end).toBe(100);
  });

  it("head and tail windows partition the original file span", () => {
    const headD = splitAt - originalStart;
    const tailD = originalEnd - splitAt;
    const headW = fileSegmentWindow(originalStart, headD, originalStart);
    const tailW = fileSegmentWindow(splitAt, tailD, originalStart);
    expect(headW.end - headW.offset + (tailW.end - tailW.offset)).toBe(originalEnd - originalStart);
  });
});
