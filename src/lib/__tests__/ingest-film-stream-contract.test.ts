import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/ingest-film/stream/route";

function minimalValidBody(): string {
  return JSON.stringify({
    videoPath: "/tmp/metrovision-contract-test-nonexistent.mp4",
    filmTitle: "Contract Test Film",
    director: "Vitest",
    year: 2020,
  });
}

describe("POST /api/ingest-film/stream contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(
      new Request("http://127.0.0.1/api/ingest-film/stream", {
        method: "POST",
        body: "{not-json",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing required fields with 400", async () => {
    const res = await POST(
      new Request("http://127.0.0.1/api/ingest-film/stream", {
        method: "POST",
        body: JSON.stringify({ filmTitle: "x" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid timeline window with 400", async () => {
    const res = await POST(
      new Request("http://127.0.0.1/api/ingest-film/stream", {
        method: "POST",
        body: JSON.stringify({
          videoPath: "/tmp/x.mp4",
          filmTitle: "A",
          director: "B",
          year: 2000,
          ingestStartSec: 100,
          ingestEndSec: 50,
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 503 on Vercel when worker proxy is not configured", async () => {
    const saved = {
      VERCEL: process.env.VERCEL,
      INGEST: process.env.INGEST_WORKER_URL,
      NEXT_PUBLIC: process.env.NEXT_PUBLIC_WORKER_URL,
      DELEGATE: process.env.METROVISION_DELEGATE_INGEST,
    };
    try {
      process.env.VERCEL = "1";
      delete process.env.INGEST_WORKER_URL;
      delete process.env.NEXT_PUBLIC_WORKER_URL;
      delete process.env.METROVISION_DELEGATE_INGEST;

      const res = await POST(
        new Request("http://127.0.0.1/api/ingest-film/stream", {
          method: "POST",
          body: minimalValidBody(),
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(res.status).toBe(503);
      const json = (await res.json()) as { error?: string };
      expect(json.error ?? "").toMatch(/INGEST_WORKER_URL|NEXT_PUBLIC_WORKER_URL/i);
    } finally {
      if (saved.VERCEL === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = saved.VERCEL;
      if (saved.INGEST === undefined) delete process.env.INGEST_WORKER_URL;
      else process.env.INGEST_WORKER_URL = saved.INGEST;
      if (saved.NEXT_PUBLIC === undefined) delete process.env.NEXT_PUBLIC_WORKER_URL;
      else process.env.NEXT_PUBLIC_WORKER_URL = saved.NEXT_PUBLIC;
      if (saved.DELEGATE === undefined) delete process.env.METROVISION_DELEGATE_INGEST;
      else process.env.METROVISION_DELEGATE_INGEST = saved.DELEGATE;
    }
  });

  it("forwards worker ingest gate header when proxying to worker", async () => {
    const saved = {
      INGEST: process.env.INGEST_WORKER_URL,
      SECRET: process.env.METROVISION_WORKER_INGEST_SECRET,
      VERCEL: process.env.VERCEL,
    };
    const fetchMock = vi.fn(async () => {
      return new Response("data: {}\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      delete process.env.VERCEL;
      process.env.INGEST_WORKER_URL = "https://worker.contract.test";
      process.env.METROVISION_WORKER_INGEST_SECRET = "proxy-shared-secret";

      await POST(
        new Request("http://127.0.0.1/api/ingest-film/stream", {
          method: "POST",
          body: minimalValidBody(),
          headers: { "Content-Type": "application/json" },
        }),
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const init = fetchMock.mock.calls[0][1] as RequestInit | undefined;
      expect(init).toBeDefined();
      const headers = new Headers(init?.headers);
      expect(headers.get("x-metrovision-worker-ingest")).toBe("proxy-shared-secret");
    } finally {
      if (saved.INGEST === undefined) delete process.env.INGEST_WORKER_URL;
      else process.env.INGEST_WORKER_URL = saved.INGEST;
      if (saved.SECRET === undefined) delete process.env.METROVISION_WORKER_INGEST_SECRET;
      else process.env.METROVISION_WORKER_INGEST_SECRET = saved.SECRET;
      if (saved.VERCEL === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = saved.VERCEL;
    }
  });
});
