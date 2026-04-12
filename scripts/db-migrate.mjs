/**
 * Apply pending SQL migrations in ./drizzle (Neon HTTP driver).
 * Runnable with plain `node` so production installs can omit devDependencies (tsx / drizzle-kit).
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  const fileContents = readFileSync(envPath, "utf8");
  for (const line of fileContents.split(/\r?\n/u)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }
    const normalizedLine = trimmedLine.startsWith("export ")
      ? trimmedLine.slice(7)
      : trimmedLine;
    const separatorIndex = normalizedLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = normalizedLine.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }
    let value = normalizedLine.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/gu, "\n");
  }
}

function resolveDatabaseUrlForNeon() {
  loadLocalEnv();
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set.");
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== "postgresql:" && u.protocol !== "postgres:") {
      throw new Error();
    }
    if (!u.username || !u.hostname || !u.pathname || u.pathname === "/") {
      throw new Error();
    }
  } catch {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL URL with user, host, and database name, e.g. postgresql://user:password@host.example/dbname (required by @neondatabase/serverless).",
    );
  }
  return raw;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "..", "drizzle");

const db = drizzle(neon(resolveDatabaseUrlForNeon()));

await migrate(db, { migrationsFolder });
console.log("[db-migrate] done.");
