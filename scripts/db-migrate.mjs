/**
 * Apply pending SQL migrations in ./drizzle (Neon HTTP driver).
 * Runnable with plain `node` so production installs can omit devDependencies (tsx / drizzle-kit).
 *
 * If the database was first provisioned with `drizzle-kit push` (or otherwise has no journal rows),
 * `migrate()` would replay 0000 and fail with "relation already exists". We detect that case and
 * insert a baseline row into drizzle.__drizzle_migrations so only truly pending migrations run.
 */
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import crypto from "node:crypto";
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

function readJournalMigrationEntries() {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  const entries = journal.entries ?? [];
  return entries.map((e) => {
    const fp = path.join(migrationsFolder, `${e.tag}.sql`);
    const query = readFileSync(fp, "utf8");
    const hash = crypto.createHash("sha256").update(query).digest("hex");
    return { tag: e.tag, when: e.when, hash };
  });
}

async function ensureMigrationsTable(db) {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

function firstRow(result) {
  const rows = result?.rows;
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function tableExists(db, schema, name) {
  const res = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = ${schema}
        AND table_name = ${name}
    ) AS exists
  `);
  const row = firstRow(res);
  const v = row?.exists;
  return v === true || v === "true" || v === "t" || v === 1;
}

async function migrationRowCount(db) {
  const res = await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM drizzle.__drizzle_migrations
  `);
  const row = firstRow(res);
  const c = row?.c;
  return typeof c === "number" ? c : parseInt(String(c ?? "0"), 10) || 0;
}

/**
 * When public schema already has `films` but the Drizzle journal is empty, stamp the journal at the
 * latest migration we infer is already applied so migrate() only runs newer SQL (e.g. 0011).
 */
async function maybeBaselinePushWithoutJournal(db) {
  await ensureMigrationsTable(db);
  const appliedCount = await migrationRowCount(db);
  if (appliedCount > 0) {
    return;
  }

  const hasFilms = await tableExists(db, "public", "films");
  if (!hasFilms) {
    return;
  }

  const entries = readJournalMigrationEntries();
  if (entries.length === 0) {
    return;
  }

  const hasIngestAsyncJobs = await tableExists(db, "public", "ingest_async_jobs");
  const baselineIndex = hasIngestAsyncJobs
    ? entries.length - 1
    : Math.max(0, entries.length - 2);
  const entry = entries[baselineIndex];
  if (!entry) {
    return;
  }

  console.warn(
    `[db-migrate] Baseline: journal was empty but public.films exists — stamping migration "${entry.tag}" ` +
      `(ingest_async_jobs=${hasIngestAsyncJobs}). This matches databases created with drizzle-kit push.`,
  );

  await db.execute(
    sql`INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") VALUES (${entry.hash}, ${entry.when})`,
  );
}

const db = drizzle(neon(resolveDatabaseUrlForNeon()));

await maybeBaselinePushWithoutJournal(db);
await migrate(db, { migrationsFolder });
console.log("[db-migrate] done.");
