/**
 * Neon’s HTTP `neon()` driver rejects URLs without user, host, and DB path (e.g. `postgresql://localhost/db`).
 * During `next build`, Next still loads API route modules; a malformed local DATABASE_URL must not crash the build.
 */

export const BUILD_PLACEHOLDER_DATABASE_URL =
  "postgresql://ci:ci@127.0.0.1:5432/ci";

export function isValidNeonHttpConnectionString(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    if (u.protocol !== "postgresql:" && u.protocol !== "postgres:") {
      return false;
    }
    if (!u.username) {
      return false;
    }
    if (!u.hostname) {
      return false;
    }
    if (!u.pathname || u.pathname === "/") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function resolveDatabaseUrlForNeon(): string {
  const raw = process.env.DATABASE_URL;
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

  if (!raw) {
    if (isProductionBuild) {
      return BUILD_PLACEHOLDER_DATABASE_URL;
    }
    throw new Error("DATABASE_URL is not set.");
  }

  if (isValidNeonHttpConnectionString(raw)) {
    return raw;
  }

  if (isProductionBuild) {
    return BUILD_PLACEHOLDER_DATABASE_URL;
  }

  throw new Error(
    "DATABASE_URL must be a PostgreSQL URL with user, host, and database name, e.g. postgresql://user:password@host.example/dbname (required by @neondatabase/serverless).",
  );
}
