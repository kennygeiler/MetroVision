# Tech Stack

## Languages

| Language | Role | Rationale |
|----------|------|-----------|
| TypeScript | Web app, API routes, TS ingest worker | Largest AI training corpus, Next.js native, SSE streaming natural fit |
| Python | Batch pipeline, ML tooling, ComfyUI nodes | PySceneDetect, Gemini Batch API JSONL, numpy/cv2, ComfyUI ecosystem are Python-native |

Both languages are canonical and long-term. This is not technical debt -- it is the correct split for the workload types.

## Frontend

| Dependency | Version | Rationale |
|------------|---------|-----------|
| Next.js | 15 (App Router) | Full-stack framework, largest AI training corpus, Vercel-native deployment |
| React | 19 | Server Components, concurrent features, required by Next.js 15 |
| TypeScript | ~5.x | Type safety across codebase |
| shadcn/ui | latest | Accessible, customizable component primitives; copy-paste model avoids lock-in |
| D3 | ^7 | 6 existing visualization types; standalone useRef+useEffect components |
| Framer Motion | ^11 | Overlay state transitions, animation |
| Tailwind CSS | ^3 | Utility-first styling, shadcn/ui dependency |

## Backend / API

| Dependency | Version | Rationale |
|------------|---------|-----------|
| Next.js API Routes | 15 | Serverless API handlers co-located with frontend |
| Express (worker) | ^4 | TS ingest worker HTTP server with SSE streaming |
| Drizzle ORM | ~0.38.x | Type-safe ORM, pgvector support, active development (pin minor version per PF-010) |
| @neondatabase/serverless | latest | HTTP driver for Neon, connection-stateless (avoids pool exhaustion per PF-006) |

## Database

| Service | Purpose | Notes |
|---------|---------|-------|
| Neon PostgreSQL | Primary data store | Free tier 0.5GB; pgvector extension must be enabled before migration (AC-03) |
| pgvector | Vector similarity search | Cosine distance for embeddings; use `cosineDistance` helper from drizzle-orm 0.33+ |
| tsvector/ts_rank | Full-text search (BM25-approximate) | Native Postgres; ParadeDB pg_bm25 if available on Neon |

### Schema (Existing Tables)
- films, scenes, shots, shot_embeddings, verifications

### Schema (New Tables)
- corpus_chunks (id, source, chunk_index, content, context_statement, embedding vector(1536), tsv tsvector)
- scene_embeddings (id, scene_id, search_text, embedding vector(768))
- film_embeddings (id, film_id, search_text, embedding vector(768))
- batch_jobs (id, status, jsonl_path, submitted_at, completed_at, result_count, error)

## AI / ML Services

| Service | Purpose | Model / Tier | Notes |
|---------|---------|-------------|-------|
| Gemini 2.5 Flash | Shot classification | Paid Tier 1+ (150-300 RPM) | Interactive: rate-limited async; Batch: JSONL API (50% cost savings) |
| Gemini Batch API | Bulk classification | 200K requests/job, 24h turnaround | Primary path for 5,000-film scale |
| OpenAI Embeddings | Shot-level embeddings | text-embedding-3-small (768 dims) | Cost-efficient for high-volume shot embeddings |
| OpenAI Embeddings | Corpus embeddings | text-embedding-3-large (1536 dims) | Higher quality for knowledge corpus retrieval |
| Claude / Gemini | RAG reasoning engine | Latest available | Foundation model for chat + intelligence layer |
| TMDB API | Film metadata | v3 | Title, director, cast, year, genre |

## Python Pipeline

| Dependency | Purpose | Notes |
|------------|---------|-------|
| PySceneDetect | Shot boundary detection | AdaptiveDetector, CPU-only, per-film threshold tuning (PF-009) |
| asyncpg | Postgres access (batch worker) | Async Postgres driver for Python batch worker |
| asyncio | Concurrency | Semaphore-bounded rate-limited Gemini calls |
| google-generativeai | Gemini API client | Batch API + interactive classification |
| ffmpeg (system) | Frame extraction, video re-encoding | Required system dependency |
| python-dotenv | Environment config | API key management in local pipeline |

## Object Storage

| Service | Purpose | Notes |
|---------|---------|-------|
| AWS S3 | Video clips, keyframes, thumbnails | Pre-signed URLs for playback; canonical storage (replaces earlier Vercel Blob) |

## Infrastructure

| Service | Purpose | Notes |
|---------|---------|-------|
| Vercel | Web app hosting | App Router, serverless functions (60s timeout hobby tier) |
| Docker | Worker containers | TS worker (Node 20 + ffmpeg + scenedetect) + Python batch worker |
| pnpm | Package manager | Standardize across entire project; migrate worker from npm (AC-17) |

## Removed / Deprecated Dependencies

| Dependency | Status | Rationale |
|------------|--------|-----------|
| bullmq | REMOVE | Zero implementation exists; dead dependency (research confirmed) |
| ioredis | REMOVE | No Redis needed; Postgres SKIP LOCKED replaces job queue |
| Vercel Blob | DEPRECATED | Replaced by AWS S3 for media storage |
| TensorFlow.js / COCO-SSD | EVALUATE | Client-side runtime dep causing bundle bloat; evaluate necessity |

## ComfyUI Node Package

| Item | Detail |
|------|--------|
| Language | Python |
| Target API | V1 (widest compatibility), V3 upgrade path |
| Dependencies | requests or httpx |
| Distribution | pip-installable package or ComfyUI Manager listing |

## Dev Tooling

| Tool | Purpose |
|------|---------|
| Claude Code / Cursor | AI-assisted development (zero manual coding constraint) |
| pnpm | Node.js package manager |
| uv or pip | Python package manager for pipeline |
| ESLint + Prettier | Code quality |
| Turbopack | Next.js dev server bundler |

## Version Pinning Policy

- Pin major versions only (e.g., `next@15`, not `next@15.2.1`). Let minor/patch float for security fixes.
- Exception: Drizzle ORM -- pin minor version (`~0.38.x`) due to active API changes (PF-010).
- Lock files (pnpm-lock.yaml, requirements.txt) committed to source control.
