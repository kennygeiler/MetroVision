import { describe, expect, it } from "vitest";

import { extractCutsSecFromEvalJson } from "../eval-cut-json";

describe("extractCutsSecFromEvalJson", () => {
  it("parses cutsSec with numeric coercion", () => {
    expect(
      extractCutsSecFromEvalJson({ cutsSec: [1, 2.5, "3"] }),
    ).toEqual([1, 2.5, 3]);
  });

  it("filters raw array to finite non-negative", () => {
    expect(extractCutsSecFromEvalJson([10, NaN, -1, 20])).toEqual([10, 20]);
  });

  it("throws on empty object with expected message", () => {
    expect(() => extractCutsSecFromEvalJson({})).toThrow(
      /cutsSec: number\[\]/,
    );
  });
});
