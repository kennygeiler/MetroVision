<!-- status: complete -->
# Patterns & Quality Guide

## TL;DR
Key patterns: App Router Server Components only (no Pages Router), single `db` import from `src/db/index.ts`, RAF loops always have cancelAnimationFrame cleanup. Known pitfalls: taxonomy drift between TS and Python (PF-001), Drizzle pgvector extension must be enabled before migration (PF-003), filter state in useState breaks shareable URLs (PF-011). Test approach: zero test infrastructure currently exists (PF-013) — any new test setup should use Vitest with mocked Neon HTTP client.

---

## Patterns

### P-001: App Router Only — No Pages Router Patterns
- **Category**: structure
- **Rule**: All pages, data fetching, and API handlers must use Next.js 15 App Router conventions. `getServerSideProps`, `getStaticProps`, `_app.tsx`, and a `pages/` directory are forbidden.
- **Example**:
  ```tsx
  // CORRECT: src/app/films/[id]/page.tsx
  export default async function FilmPage({ params }: { params: { id: string } }) {
    const film = await db.query.films.findFirst({ where: eq(films.id, params.id) });
    return <FilmDetail film={film} />;
  }
  ```
- **Counter-example**:
  ```ts
  // WRONG — Pages Router
  export async function getServerSideProps(context) { ... }
  ```

### P-002: Single DB Import
- **Category**: data-flow
- **Rule**: Import `db` exclusively from `src/db/index.ts`. Never instantiate `neon()` or `drizzle()` inside a component or route handler. This avoids connection pool exhaustion (PF-006).
- **Example**:
  ```ts
  // CORRECT
  import { db } from "@/db";
  const films = await db.select().from(schema.films);
  ```
- **Counter-example**:
  ```ts
  // WRONG — creates a new connection per request
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  ```

### P-003: Drizzle Builder API (Not db.query.*)
- **Category**: data-flow
- **Rule**: Prefer the `db.select().from().where()` builder pattern over `db.query.*` relational API. The builder API is more stable across Drizzle minor versions (pin `~0.38.x` per PF-010).
- **Example**:
  ```ts
  // CORRECT
  const shots = await db
    .select()
    .from(schema.shots)
    .where(eq(schema.shots.filmId, filmId))
    .orderBy(schema.shots.startTc);
  ```

### P-004: Drizzle Schema Type Inference
- **Category**: naming
- **Rule**: Export `$inferSelect` and `$inferInsert` types from `src/db/schema.ts` for every table. Do not hand-write redundant type declarations.
- **Example**:
  ```ts
  // In schema.ts
  export type Film = typeof films.$inferSelect;
  export type NewFilm = typeof films.$inferInsert;
  ```

### P-005: RAF Cleanup in useEffect
- **Category**: async
- **Rule**: Every `requestAnimationFrame` loop inside a React component must be cancelled in the `useEffect` cleanup function. Omitting this causes memory leaks and errors on navigation (PF-005).
- **Example**:
  ```tsx
  useEffect(() => {
    let rafId: number;
    const loop = () => {
      // render frame
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);
  ```

### P-006: URL Params for Filter State
- **Category**: data-flow
- **Rule**: Filter and browse state must live in URL search params via `useSearchParams` + `useRouter`, never in local `useState`. This enables shareable URLs, browser back/forward, and bookmarks (see PF-011).
- **Example**:
  ```tsx
  'use client';
  import { useSearchParams, useRouter } from 'next/navigation';

  const searchParams = useSearchParams();
  const router = useRouter();
  const activeFilter = searchParams.get('movementType') ?? 'all';

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set('movementType', value);
    router.push(`?${params.toString()}`);
  }
  ```

### P-007: Route Handler Error Pattern
- **Category**: error-handling
- **Rule**: All Route Handlers wrap their logic in try/catch, return `Response.json({ error: '...' }, { status: 500 })` on failure, and never let unhandled exceptions escape. Use `NextRequest` (not plain `Request`) to access `nextUrl.searchParams`.
- **Example**:
  ```ts
  export async function GET(request: NextRequest) {
    try {
      const query = request.nextUrl.searchParams.get('q')?.trim();
      // ...
      return Response.json(result);
    } catch (error) {
      console.error('Failed to ...', error);
      return Response.json({ error: 'Failed to ...' }, { status: 500 });
    }
  }
  ```

### P-008: Taxonomy Constants — Dual-File Rule
- **Category**: structure
- **Rule**: Camera movement taxonomy slugs are defined in both `src/lib/taxonomy.ts` (TS object with `{ slug, displayName }`) and `pipeline/taxonomy.py` (plain lists). Any change to a slug must be made in both files in the same commit, and the Python pipeline must assert `movement_type in MOVEMENT_TYPES` before any DB write (see PF-001).
- **Example**:
  ```ts
  // src/lib/taxonomy.ts — TS side
  export const MOVEMENT_TYPES = {
    dolly: { slug: 'dolly', displayName: 'Dolly' },
    // ...
  } as const;
  export type MovementTypeSlug = keyof typeof MOVEMENT_TYPES;
  ```
  ```python
  # pipeline/taxonomy.py — Python side (must mirror slugs exactly)
  MOVEMENT_TYPES = ['static', 'pan', 'tilt', 'dolly', ...]
  assert movement_type in MOVEMENT_TYPES, f"Unknown movement type: {movement_type}"
  ```

### P-009: pgvector Custom Type in Schema
- **Category**: data-flow
- **Rule**: Drizzle does not have a built-in pgvector column type. Use the `customType` helper from `drizzle-orm/pg-core` with explicit `toDriver` (formats as `[n,n,n]` string) and `fromDriver` (parses back to `number[]`) converters. The pgvector extension must be enabled in Neon BEFORE running `drizzle-kit push` (see PF-003).
- **Example**:
  ```ts
  const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
    dataType(config) { return `vector(${config?.dimensions ?? 768})`; },
    toDriver(value) { return `[${value.join(',')}]`; },
    fromDriver(value) {
      return value.slice(1, -1).split(',').filter(Boolean).map(Number);
    },
  });
  // Usage:
  embedding: vector('embedding', { dimensions: 768 }).notNull(),
  ```

### P-010: pgvector Cosine Distance Raw SQL
- **Category**: data-flow
- **Rule**: Use raw SQL with explicit cast for pgvector cosine distance queries. `drizzle-orm`'s `cosineDistance` helper (available 0.33+) may also be used if available. Never rely on TypeScript compilation alone to verify query correctness — test against real Neon data (see PF-012).
- **Example**:
  ```ts
  // Raw SQL fallback
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;
  const results = await db.execute(
    sql`SELECT id, 1 - (embedding <=> ${vectorLiteral}::vector) AS score
        FROM shot_embeddings
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT 20`
  );
  ```

### P-011: Two-Lane Pipeline Architecture
- **Category**: structure
- **Rule**: Interactive single-film ingestion flows exclusively through the TS Worker (`worker/src/ingest.ts`) via SSE. Bulk ingestion flows through the Python Batch Worker (`pipeline/batch_worker.py`) using Postgres SKIP LOCKED + Gemini Batch API. These are two canonical paths, not one replacing the other. The Next.js `detect-shots` route must not exist (AC-23).
- **Example flow**:
  ```
  Web UI -> POST /api/ingest-film -> TS Worker SSE -> Gemini Flash (real-time) -> Postgres
  Admin submit -> batch_jobs table -> Python Worker (SKIP LOCKED) -> Gemini Batch API -> Postgres
  ```

### P-012: Rate Limiting — Both Languages
- **Category**: async
- **Rule**: All Gemini API calls must be rate-limited. TS Worker: token-bucket at 130 RPM with `concurrency = min(tier_limit * 0.85, 50)`. Python pipeline: asyncio Semaphore + token-bucket at 130 RPM Tier 1. Never fire Gemini calls without rate limiting (AC-07).
- **Example (Python)**:
  ```python
  semaphore = asyncio.Semaphore(50)
  async def classify_with_limit(clip_path):
      async with semaphore:
          await asyncio.sleep(60 / 130)  # token bucket
          return await classify_clip(clip_path)
  ```

### P-013: Gemini File API — No Persistent IDs
- **Category**: data-flow
- **Rule**: Never persist Gemini File API IDs to the database or pipeline state. File references expire after 48 hours. Always re-upload video files fresh at the start of each classification run (AC-13, PF-007).

### P-014: D3 Components — Standalone useRef + useEffect
- **Category**: structure
- **Rule**: D3 visualization components mount via `useRef` + `useEffect` and receive fully complete typed JSON payloads before mounting. D3 components never mount on partial/streaming data (AC-09). Each D3 chart lives in `src/components/visualize/`.
- **Example**:
  ```tsx
  'use client';
  export function RhythmStream({ data }: { data: RhythmData }) {
    const svgRef = useRef<SVGSVGElement>(null);
    useEffect(() => {
      if (!svgRef.current || !data) return;
      const svg = d3.select(svgRef.current);
      // ... full d3 render
    }, [data]);
    return <svg ref={svgRef} />;
  }
  ```

### P-015: No LLM-Generated Code Execution in Chat
- **Category**: structure
- **Rule**: The chat Generative UI maps tool call names to pre-registered React/D3 components. Tool results are typed JSON payloads. The client never evaluates or executes LLM-generated code (AC-08).
- **Example**:
  ```ts
  const TOOL_COMPONENT_MAP = {
    render_rhythm_stream: RhythmStream,
    render_pacing_heatmap: PacingHeatmap,
    render_director_radar: DirectorRadar,
    // ...
  } as const;
  // On tool_result event: mount TOOL_COMPONENT_MAP[toolName] with payload
  ```

### P-016: ComfyUI IS_CHANGED = float("NaN")
- **Category**: structure
- **Rule**: ComfyUI nodes that query external APIs must return `float("NaN")` from `IS_CHANGED`, not `True` (which is silently ignored by ComfyUI). This forces re-execution on every run (AC-12).
- **Example**:
  ```python
  @classmethod
  def IS_CHANGED(cls, **kwargs):
      return float("NaN")
  ```

### P-017: NEXT_PUBLIC_ Prefix for Client Env Vars
- **Category**: structure
- **Rule**: Any environment variable accessed in a `'use client'` component must have the `NEXT_PUBLIC_` prefix. Server-only secrets (database URL, API keys) must never be `NEXT_PUBLIC_`. Missing this prefix returns `undefined` silently at runtime with no build error (PF-008).

### P-018: Postgres SKIP LOCKED for Job Queue
- **Category**: async
- **Rule**: The batch job queue uses PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` on the `pipeline_jobs` or `batch_jobs` table. No Redis, no BullMQ (AC-06). This pattern prevents two worker processes from claiming the same job.
- **Example (Python asyncpg)**:
  ```python
  async with conn.transaction():
      job = await conn.fetchrow(
          "SELECT * FROM batch_jobs WHERE status = 'pending' LIMIT 1 FOR UPDATE SKIP LOCKED"
      )
  ```

### P-019: pnpm Exclusively After M1
- **Category**: structure
- **Rule**: After Milestone 1 migration, pnpm is the sole package manager across all workspaces (root and worker). No npm lockfiles may exist anywhere in the repository tree (AC-17).

### P-020: Schema Tables Use $inferSelect / $inferInsert
- **Category**: naming
- **Rule**: All Drizzle table type exports follow the pattern `export type Foo = typeof fooTable.$inferSelect` and `export type NewFoo = typeof fooTable.$inferInsert`. The `New` prefix names the insert type. This is the established convention in `src/db/schema.ts`.

---

## Pitfalls
(see `/Users/kennygeiler/Documents/Vibing Coding Projects 2026/SceneDeck/.kiln/docs/pitfalls.md` for full detail)

Key pitfall IDs: PF-001 (taxonomy drift), PF-002 (Pages Router), PF-003 (pgvector extension), PF-004 (Vercel timeout), PF-005 (RAF memory leak), PF-006 (Neon pool exhaustion), PF-007 (Gemini file expiry), PF-008 (NEXT_PUBLIC_ prefix), PF-009 (PySceneDetect threshold tuning), PF-010 (Drizzle version drift), PF-011 (filter useState), PF-012 (pgvector Drizzle syntax), PF-013 (zero test coverage), PF-014 (dual package managers), PF-015 (dual ingest pipelines).
