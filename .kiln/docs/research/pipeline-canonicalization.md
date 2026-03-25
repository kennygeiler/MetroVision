# Pipeline Canonicalization: Single Canonical Pipeline Architecture

## Finding

MetroVision currently has three overlapping pipeline implementations: (1) `pipeline/` — a Python CLI using PySceneDetect + psycopg2 writes directly to Neon, with serial Gemini classification via the File API; (2) `worker/` — a TypeScript Express service with SSE streaming, S3 asset storage, Drizzle ORM, TMDB integration, OpenAI embeddings, and a `processInParallel` helper for concurrent Gemini calls using inline base64; (3) `src/app/api/detect-shots/` — a Next.js API route that shells out to Python for shot detection only. The root `package.json` also contains installed but entirely unused `bullmq@^5.71.0` and `ioredis@^5.10.1` dependencies, indicating an abandoned BullMQ/Redis job queue design.

**The TypeScript worker (`worker/src/ingest.ts`) is the more capable and production-oriented pipeline.** It has: SSE streaming progress (critical for UX on long film ingestions), TMDB metadata enrichment, OpenAI vector embeddings, S3 asset storage, scene grouping logic, and partial concurrency for Gemini calls. The Python pipeline, while well-structured, lacks all of these features and writes to Vercel Blob (deprecated in favor of S3 in the worker). It also uses psycopg2 for direct DB writes vs Drizzle ORM, creating dual write paths for the same tables.

**The Python pipeline retains two genuine strengths:** (a) PySceneDetect's `AdaptiveDetector` (more reliable for film content than the TS worker's `detect-content` threshold tuning); and (b) the Python ecosystem is better suited for future ML-heavy operations (frame-level object detection, custom models, numpy/cv2 pipelines). The TS worker shells out to the `scenedetect` CLI binary for detection — functionally equivalent but less configurable than direct PySceneDetect Python API usage.

**BullMQ/Redis should be removed, not built out.** The existing DB-backed job queue (Postgres `films` and `shots` tables with status tracking) is sufficient for the scale of 5,000 films if paired with a simple worker polling loop or Celery. BullMQ is a Node.js-native queue — adding Redis as an operational dependency for a Python-primary ML pipeline introduces cross-language complexity with no advantage over a simpler Postgres-based approach. The project already uses Neon Postgres; using `SELECT ... FOR UPDATE SKIP LOCKED` (a well-established Postgres queue pattern) avoids an extra infrastructure component entirely.

**Recommended canonical architecture — Python-primary, TS worker as API layer:**
- Retire the Python CLI (`pipeline/main.py`) as the primary ingest trigger; it becomes a library used by a new Python batch worker.
- The TS worker (`worker/`) becomes the interactive ingest API (single-film SSE streaming). It stays TypeScript because SSE streaming, TMDB calls, and S3 uploads are I/O-bound operations where Node.js async is a natural fit.
- Add a Python batch worker (`pipeline/batch_worker.py`) that: polls a Postgres jobs table using `SKIP LOCKED`, calls PySceneDetect directly (not via CLI), submits Gemini Batch API jobs for classification, and writes results via psycopg2 or asyncpg. This handles the 5,000-film bulk catalogue.
- Remove `bullmq` and `ioredis` from `package.json`. Drop the `worker/` Redis dependency path entirely.
- The Next.js API route `detect-shots` (which shells to Python) should be consolidated — shot detection for interactive use should hit the TS worker's `/api/ingest-film/stream` endpoint, not bypass it via a separate Next.js shell.

**Why not Python-only?** The TS worker has production UX features (SSE streaming, real-time shot-level progress events) that would require significant re-implementation in Python. FastAPI + SSE is feasible but the TS worker is already deployed and working. The risk of rewriting working streaming infrastructure outweighs the benefit of language unification.

**Why not retire Python entirely?** PySceneDetect, numpy/cv2 pipelines, and future Gemini Batch API jobs all have superior Python library support. The Gemini Batch API JSONL workflow is trivially expressed in Python and awkward in TypeScript. ML-adjacent work should stay in Python.

## Recommendation

Adopt a two-lane architecture: keep the TS worker for interactive single-film ingestion (SSE streaming to the UI), and build a new Python batch worker for bulk catalogue processing that uses PySceneDetect directly + Gemini Batch API + Postgres SKIP LOCKED queue. Retire `bullmq`/`ioredis` from `package.json` immediately — they add zero value over the existing Postgres tables. Retire the Python CLI's `run_pipeline` entrypoint in favor of the library functions it wraps, used by the new batch worker.

## Key Facts

- TS worker (`worker/src/ingest.ts`): 443 lines, SSE streaming, TMDB + OpenAI embeddings, S3 storage, `processInParallel` with up to 15 Gemini workers
- Python pipeline (`pipeline/main.py`): serial processing, Vercel Blob storage, psycopg2 direct writes, no TMDB/embeddings
- `package.json` declares `bullmq@^5.71.0` and `ioredis@^5.10.1`; no BullMQ queue implementation exists anywhere in `src/` or `worker/src/`
- TS worker shells to `scenedetect` CLI binary; Python pipeline uses PySceneDetect Python API directly (more configurable)
- Both pipelines write to the same Neon Postgres tables via different ORMs (psycopg2 vs Drizzle), creating dual write paths
- PySceneDetect single-video parallelism is not effective; multi-film parallelism must be done at orchestration level (multiple worker processes)
- Postgres `SELECT FOR UPDATE SKIP LOCKED` is a proven pattern for DB-backed job queues, eliminating Redis as a dependency
- Celery (Python) is the dominant distributed task queue for Python ML pipelines; ARQ (asyncio-native, lighter) is a viable alternative for lower complexity
- Next.js route `src/app/api/detect-shots/route.ts` spawns a Python subprocess — this is a side channel bypassing the worker and should be consolidated
- The TS worker's `classifyShot` uses inline base64 + REST API; the Python pipeline uses `client.files.upload` (File API) — the File API approach is more reliable for production but the TS worker's re-encoded small clip strategy is better for throughput

## Sources

- [Choosing The Right Python Task Queue — Judoscale](https://judoscale.com/blog/choose-python-task-queue)
- [Python Background Tasks in 2025: Celery vs RQ vs Dramatiq — DevPro Portal](https://devproportal.com/languages/python/python-background-tasks-celery-rq-dramatiq-comparison-2025/)
- [Bull vs Celery vs Sidekiq: Job Queue Comparison — Index.dev](https://www.index.dev/skill-vs-skill/backend-sidekiq-vs-celery-vs-bull)
- [Task queues in different languages — Feng's Notes](https://ofeng.org/posts/task-queues-in-different-langueages/)
- [Batch Mode in the Gemini API: Process more for less — Google Developers Blog](https://developers.googleblog.com/scale-your-ai-workloads-batch-mode-gemini-api/)
- [Modern Queueing Architectures: Celery, RabbitMQ, Redis, or Temporal? — Medium](https://medium.com/@pranavprakash4777/modern-queueing-architectures-celery-rabbitmq-redis-or-temporal-f93ea7c526ec)
- [Codebase: /Users/kennygeiler/Documents/Vibing Coding Projects 2026/SceneDeck/worker/src/ingest.ts]
- [Codebase: /Users/kennygeiler/Documents/Vibing Coding Projects 2026/SceneDeck/pipeline/main.py]
- [Codebase: /Users/kennygeiler/Documents/Vibing Coding Projects 2026/SceneDeck/pipeline/classify.py]
- [Codebase: /Users/kennygeiler/Documents/Vibing Coding Projects 2026/SceneDeck/src/app/api/detect-shots/route.ts]

## Confidence

0.87 — Architecture recommendation is grounded in direct codebase analysis of all three pipeline implementations. The BullMQ/Redis finding is definitive (deps installed, zero implementation exists). The two-lane TS+Python recommendation reflects established patterns for mixed-language ML pipelines. Primary uncertainty is whether the team wants to maintain two languages long-term vs absorbing the cost of rewriting TS SSE streaming in Python/FastAPI.
