import { afterEach, describe, expect, it, vi } from "vitest";

import { logServerEvent } from "../server-log";

describe("logServerEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits JSON with event and level", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerEvent("error", "test_event", { filmId: "x" });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0]![0] as string;
    const o = JSON.parse(line) as Record<string, unknown>;
    expect(o.level).toBe("error");
    expect(o.event).toBe("test_event");
    expect(o.service).toBe("metrovision");
    expect(o.filmId).toBe("x");
    expect(typeof o.ts).toBe("string");
  });
});
