import { afterEach, describe, expect, it } from "vitest";

import {
  BUILD_PLACEHOLDER_DATABASE_URL,
  isValidNeonHttpConnectionString,
  resolveDatabaseUrlForNeon,
} from "@/db/neon-connection-url";

describe("isValidNeonHttpConnectionString", () => {
  it("accepts user@host with database path", () => {
    expect(isValidNeonHttpConnectionString("postgresql://ci:ci@127.0.0.1:5432/ci")).toBe(true);
    expect(isValidNeonHttpConnectionString("postgres://u:p@ep-test.us-east-2.aws.neon.tech/neondb")).toBe(
      true,
    );
  });

  it("rejects URLs without username (common bad local shorthand)", () => {
    expect(isValidNeonHttpConnectionString("postgresql://localhost:5432/placeholder")).toBe(false);
  });

  it("rejects missing database name", () => {
    expect(isValidNeonHttpConnectionString("postgresql://u:p@host.com/")).toBe(false);
  });
});

describe("resolveDatabaseUrlForNeon", () => {
  const origPhase = process.env.NEXT_PHASE;
  const origDb = process.env.DATABASE_URL;

  afterEach(() => {
    if (origPhase === undefined) {
      delete process.env.NEXT_PHASE;
    } else {
      process.env.NEXT_PHASE = origPhase;
    }
    if (origDb === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = origDb;
    }
  });

  it("uses placeholder during production build when URL is invalid", () => {
    process.env.NEXT_PHASE = "phase-production-build";
    process.env.DATABASE_URL = "postgresql://localhost:5432/placeholder";
    expect(resolveDatabaseUrlForNeon()).toBe(BUILD_PLACEHOLDER_DATABASE_URL);
  });

  it("throws at runtime when URL is invalid outside build", () => {
    delete process.env.NEXT_PHASE;
    process.env.DATABASE_URL = "postgresql://localhost:5432/placeholder";
    expect(() => resolveDatabaseUrlForNeon()).toThrow(/DATABASE_URL must be a PostgreSQL URL/);
  });

  it("returns valid URL as-is when set", () => {
    delete process.env.NEXT_PHASE;
    process.env.DATABASE_URL = "postgresql://a:b@127.0.0.1:5432/db";
    expect(resolveDatabaseUrlForNeon()).toBe("postgresql://a:b@127.0.0.1:5432/db");
  });
});
