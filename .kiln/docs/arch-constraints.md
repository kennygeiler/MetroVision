# Architectural Constraints

Hard constraints that planners and builders must respect. Violating any of these will cause build failures, data corruption, or architectural regression.

---

### AC-01: Vercel Serverless 60-Second Timeout
- **Constraint**: No video processing (ffmpeg, PySceneDetect) in Vercel serverless functions. Route Handlers must only read/write metadata.
- **Scope**: All files under `src/app/api/`
- **Consequence of violation**: 504 Gateway Timeout, partial DB writes, orphaned uploads (PF-004)

### AC-02: Taxonomy Sync Between TS and Python
- **Constraint**: **Composition** taxonomy slugs (framing, depth, blocking, symmetry, dominant lines, lighting, color temperature, shot size, angles, duration category) must stay identical in `src/lib/taxonomy.ts` and `pipeline/taxonomy.py`. Any change requires updating both files in the same commit. CI runs `pnpm check:taxonomy` / `taxonomy-parity.yml`. Legacy camera **movement** enums were removed from the shared taxonomy; do not reintroduce them without a migration and parity update.
- **Consequence of violation**: Silent data corruption — shots stored with slugs the web app does not recognize (PF-001)

### AC-03: pgvector Extension Before Migration
- **Constraint**: `CREATE EXTENSION IF NOT EXISTS vector;` must run in Neon SQL editor BEFORE any `drizzle-kit push` that includes vector columns.
- **Consequence of violation**: Migration fails with `type "vector" does not exist` (PF-003)

### AC-04: Single Drizzle Client Instance
- **Constraint**: Never instantiate `neon()` or a new Drizzle client inside a component or route handler. Always import `db` from `src/db/index.ts`.
- **Consequence of violation**: Connection pool exhaustion on Neon free tier (PF-006)

### AC-05: App Router Only (No Pages Router Patterns)
- **Constraint**: No `getServerSideProps`, `getStaticProps`, `_app.tsx`, or `pages/` directory. Use async Server Components or Route Handlers.
- **Consequence of violation**: Silent data fetching failures (PF-002)

### AC-06: No BullMQ / No Redis
- **Constraint**: Do not use or build on bullmq/ioredis. Job queue is Postgres SKIP LOCKED. Remove these dependencies when encountered.
- **Consequence of violation**: Unnecessary infrastructure complexity, cross-language queue confusion

### AC-07: Gemini Rate Limiting Required
- **Constraint**: All Gemini API calls (TS and Python) must use a rate limiter. TS worker: bounded concurrency tuned to API tier. Python: asyncio.Semaphore + token bucket at 130 RPM (Tier 1) or 450 RPM (Tier 2).
- **Consequence of violation**: Intermittent 429 errors that corrupt pipeline runs

### AC-08: No LLM-Generated Code Execution in Chat
- **Constraint**: Chat interface renders pre-registered React/D3 components from typed JSON payloads (Generative UI pattern). Never eval/execute LLM-generated JavaScript or D3 code.
- **Consequence of violation**: XSS risk, ~40-60% failure rate on generated code (research finding)

### AC-09: D3 Components Require Complete Data Before Mount
- **Constraint**: D3 visualization components must receive complete datasets before rendering. Do not stream partial data into D3 components. Text can stream in parallel.
- **Consequence of violation**: Render errors, broken visualizations

### AC-10: URL Params for Filter State (Not useState)
- **Constraint**: Browse/search filter state must use URL search params (`useSearchParams` + `useRouter`), not local React state.
- **Consequence of violation**: Non-shareable URLs, broken back navigation (PF-011)

### AC-11: Neon Free Tier Storage (0.5GB)
- **Constraint**: At 768-dim vectors (3KB/shot), approximately 166K shots fit in 0.5GB. Monitor storage as dataset grows. Corpus embeddings at 1536 dims consume 6KB/chunk.
- **Action**: Monitor storage utilization; plan Neon tier upgrade before 5,000-film milestone if needed.

### AC-12: ComfyUI IS_CHANGED Must Return float("NaN")
- **Constraint**: For ComfyUI nodes that query external APIs, `IS_CHANGED` must return `float("NaN")`. Returning `True` is silently ignored because `True == True` evaluates as no change.
- **Consequence of violation**: Stale cached results, node never re-queries API

### AC-13: Gemini File API References Expire in 48 Hours
- **Constraint**: Never persist Gemini File API IDs to the database. Always re-upload video files before classification.
- **Consequence of violation**: Classification fails with 404 on expired file reference (PF-007)

### AC-14: Drizzle ORM Version Pin
- **Constraint**: Pin `drizzle-orm` to `^0.45.1` in root and worker `package.json` (single line; verify with `pnpm why drizzle-orm`). Earlier docs targeted `~0.38.x`; the project standard is now 0.45.x. Prefer `db.select().from().where()` builder API over `db.query.*` for stability.
- **Consequence of violation**: TypeScript compilation errors, runtime query failures (PF-010)

### AC-15: NEXT_PUBLIC_ Prefix for Client Env Vars
- **Constraint**: Environment variables accessed in `'use client'` components must be prefixed `NEXT_PUBLIC_`. Server-only secrets (DB URL, API keys) must never have this prefix.
- **Consequence of violation**: Silent undefined values in browser, API calls fail (PF-008)

### AC-16: requestAnimationFrame Cleanup
- **Constraint**: Every `requestAnimationFrame` loop in a React component must have a corresponding `cancelAnimationFrame` in the `useEffect` cleanup return.
- **Consequence of violation**: Memory leak, console errors on navigation (PF-005)

### AC-17: Package Manager Standardization (pnpm)
- **Constraint**: Use pnpm exclusively across the project. The worker directory must be migrated from npm to pnpm workspace.
- **Consequence of violation**: Dependency mismatches, version skew between root and worker (PF-014)

### AC-18: Zero Manual Coding
- **Constraint**: All code must be generated by AI agents. Operator may only: prompt, approve, add API keys, permission services, do work relays, update environment variables.
- **Consequence of violation**: Violates project constraint and portfolio demonstration goal

### AC-19: 500-Film Gate Before Product Surface Launch
- **Constraint**: No public-facing product surface until 500 films are classified with structured metadata at 85% accuracy baseline.
- **Consequence of violation**: Thin dataset undermines every product surface (non-negotiable per vision)

### AC-20: Two-Lane Pipeline Architecture
- **Constraint**: TS worker for interactive single-film ingestion (SSE). Python batch worker for bulk catalogue (Gemini Batch API + Postgres SKIP LOCKED). Both are canonical. Do not merge them into one language.
- **Consequence of violation**: Loss of SSE streaming UX (if Python-only) or loss of ML ecosystem access (if TS-only)

### AC-21: No Authentication in v1
- **Constraint**: No user accounts, no login, no session management. The QA verification system is open. Defer auth to post-launch.
- **Consequence of violation**: Unnecessary complexity for pre-launch phase

### AC-22: Metadata Overlay is the Hero Feature
- **Constraint**: Video playback with metadata overlay (movement type, direction arrows, trajectory, shot size, speed) must receive the most design and engineering attention. Must be visually striking, screen-recordable, and synchronized to video currentTime via requestAnimationFrame.
- **Architecture**: HTML5 Canvas (per-frame rendering) + SVG (vector graphics) + Framer Motion (transitions) layered over video element

### AC-23: No Next.js detect-shots Shell-Out (Retired Route)
- **Constraint**: The legacy Next.js route `src/app/api/detect-shots/route.ts` **must not exist** (it previously shelled out to Python). Interactive single-film ingest must go through `src/app/api/ingest-film/stream` and the TS worker (`worker/src/ingest.ts`); do not reintroduce a parallel Next.js shot-detection shell.
- **Consequence of violation**: Side channel bypasses worker, inconsistent pipeline behavior

### AC-24: Gemini Batch API Video Support Needs Validation
- **Constraint**: Before committing to Gemini Batch API as the bulk classification path, run a small prototype test to confirm video content can be submitted via batch mode using File API references. This is documented for text/image but less explicitly for video.
- **Consequence of violation**: Bulk pipeline architecture may need redesign if video batch is not supported
