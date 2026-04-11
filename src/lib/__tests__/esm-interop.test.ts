import { describe, expect, it } from "vitest";

import { interopNamespace } from "../esm-interop";

describe("interopNamespace", () => {
  it("returns default export when present", () => {
    const mod = { default: { x: 1 }, x: 2 };
    expect(interopNamespace(mod as { default?: { x: number }; x: number })).toEqual({ x: 1 });
  });

  it("returns namespace when no default", () => {
    const mod = { a: "ns" };
    expect(interopNamespace(mod)).toEqual({ a: "ns" });
  });
});
