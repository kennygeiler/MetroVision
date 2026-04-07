# Architectural Decision Records

## ADR-001: Next.js 15 Monolith on Vercel
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: Need a full-stack framework for a portfolio demo web app with video playback, search, and metadata management. Must be buildable entirely by AI coding agents (zero manual coding constraint).
- **Decision**: Use Next.js 15 (App Router) deployed on Vercel as a monolithic application. API routes handle all backend logic. No separate backend service.
- **Alternatives**: SvelteKit (smaller AI training corpus), Remix (weaker Vercel integration), separate frontend + Express backend (unnecessary complexity for demo scale)
- **Rationale**: Next.js has the largest AI training corpus of any framework, making it the safest choice for vibe-coded development. Vercel provides zero-config deployment with native Next.js support. A monolith eliminates deployment coordination overhead. Research confidence: 0.85.
- **Consequences**: All server logic must fit within Vercel serverless function limits (60s timeout on hobby tier, 4.5 MB function size). Acceptable for 50-100 shot dataset.

## ADR-002: Gemini 2.0 Flash as Primary Camera Motion Classifier
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: No off-the-shelf camera motion classifier exists (research finding). Need to classify video clips into a 21-type taxonomy. Options: (a) vision LLM, (b) custom RAFT optical flow pipeline on GPU.
- **Decision**: Use Gemini 2.0 Flash as the primary classifier. Upload video clips via Google Files API, receive structured JSON taxonomy output. RAFT on Modal is the fallback, built only if Gemini accuracy is below threshold after human QA of first 10-20 clips.
- **Alternatives**: Build RAFT pipeline first (higher accuracy ceiling but days of engineering), fine-tune VideoMAE (requires labeled training data we don't have), CameraCtrl extraction (outputs 6-DoF poses, not taxonomy labels)
- **Rationale**: Eliminates GPU infrastructure from the critical path. Under $5 for 100 clips. Implementable in under 50 lines of Python. Human QA (0-5 rating system) catches classification errors. The vision's design explicitly supports a correctable pipeline (KD-05).
- **Consequences**: Classification accuracy is untested and may vary by movement type. Compound movements and subtle distinctions (dolly vs. zoom) may be harder for an LLM. Mitigation: human QA is already a core feature.

## ADR-003: Neon PostgreSQL with pgvector for All Data + Search
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: Need a database for shot metadata and semantic search capability for natural language queries across 50-100 shots.
- **Decision**: Use a single Neon PostgreSQL instance (via Vercel Marketplace) with pgvector extension for semantic vector search. No separate search service.
- **Alternatives**: Neon + Typesense (adds a separate service to manage), Neon + Elasticsearch (overkill), SQLite (no serverless, no vector search), Supabase (viable but less integrated with Vercel)
- **Rationale**: Keeps everything in one database. pgvector is sufficient for 100 vectors. Neon free tier provides 0.5 GB storage and auto env var injection via Vercel Marketplace. Drizzle ORM supports pgvector. No operational overhead of a second service.
- **Consequences**: Search quality depends on embedding model choice. At 100 shots, even naive keyword search works well. pgvector adds ~10ms per query at this scale.

## ADR-004: PySceneDetect AdaptiveDetector for Shot Boundary Detection
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: Need to detect shot boundaries (cuts) in source video files to decompose scenes into individual shots.
- **Decision**: Use PySceneDetect with AdaptiveDetector. CPU-only, pip-installable, clean Python API.
- **Alternatives**: TransNetV2 (F1 ~0.93 vs ~0.75-0.80 but requires TF2 manual setup), FFmpeg scene filter (no Python API, no dissolve modeling)
- **Rationale**: Lower integration friction matters more than the accuracy delta. Human review is already planned for all seed data. AI coding agents can write PySceneDetect integration reliably. TransNetV2's TF2 dependency adds vibe-coding risk.
- **Consequences**: F1 ~0.75-0.80 means some false positives/negatives in shot boundaries. Acceptable because human QA reviews all shots. Per-film threshold tuning may be needed for art house cinema with unconventional editing.

## ADR-005: Offline Python Pipeline (Not Serverless)
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: The data ingestion pipeline (shot detection, classification, upload) needs to process video files. Where should it run?
- **Decision**: Pipeline runs as a local Python script on the operator's machine (or GitHub Actions). It is not deployed on Vercel. It writes to Neon and Vercel Blob via their APIs.
- **Alternatives**: Vercel serverless functions (60s timeout too short for video processing), Modal end-to-end (adds infrastructure complexity), dedicated server (unnecessary for 50-100 shots)
- **Rationale**: Video processing (FFmpeg, PySceneDetect) requires filesystem access and can take minutes per scene. Local execution is simplest. The pipeline only needs to run a handful of times to process the seed dataset.
- **Consequences**: Pipeline is not auto-triggered. Operator manually runs it. Acceptable for a portfolio demo with a fixed seed dataset.

## ADR-006: Vercel Blob for Video Storage
- **Date**: 2026-03-15
- **Status**: superseded by ADR-010
- **Context**: Need CDN-backed storage for 50-100 video clips (10-30 seconds each) and thumbnails.
- **Decision**: Use Vercel Blob for all media storage. Videos served directly from Blob CDN URLs.
- **Alternatives**: AWS S3 + CloudFront (more setup, separate billing), Cloudflare R2 (cheaper but separate platform), Mux (adaptive streaming, overkill for short clips)
- **Rationale**: Vercel Blob integrates natively with the Vercel platform. CDN-backed with global distribution. Total storage under 1 GB. Pay-as-you-go pricing is negligible at this scale. No separate service to configure.
- **Consequences**: Locked into Vercel ecosystem for media. Acceptable for a portfolio demo. Migration to S3/R2 is straightforward if needed later.

## ADR-007: LLM Vision for Scene Grouping
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: After shot boundary detection, shots need to be grouped into narrative scenes (which shots belong together in a sequence).
- **Decision**: Use Gemini/Claude vision API to analyze keyframes from consecutive shots and identify scene boundaries. Send a batch of keyframes with a structured prompt.
- **Alternatives**: CLIP embedding clustering (fails on shot-reverse-shot patterns), audio-based diarization (requires separate audio pipeline), manual grouping (viable at 50-100 shots)
- **Rationale**: For a 50-100 shot seed dataset, LLM vision is the most accurate and cheapest approach. A single API call can analyze an entire film's worth of keyframes. Already using Gemini for classification, so no new service dependency.
- **Consequences**: Cost is negligible. Accuracy for narrative scene grouping is high with modern vision LLMs.

## ADR-008: HTML5 Canvas + SVG Overlay Architecture for Metadata Visualization
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: The metadata overlay on video playback is the hero feature (C-12). Need to render camera motion type, direction arrows, trajectory paths, shot size, and speed indicators synchronized to video playback.
- **Decision**: Use a layered architecture: vidstack or react-player for video control, absolutely-positioned HTML5 Canvas for real-time frame-by-frame overlay rendering (arrows, trajectories), SVG for vector graphics (motion paths, annotations), Framer Motion for overlay state transitions. Sync via requestAnimationFrame tied to video.currentTime.
- **Alternatives**: WebGL (overkill for 2D overlays), pure CSS animations (insufficient for dynamic data-driven overlays), third-party annotation library (none exist for this specific use case)
- **Rationale**: Canvas + SVG is the standard web approach for video annotation. Canvas handles per-frame rendering; SVG handles crisp vector graphics at any resolution. Framer Motion (already in stack) handles animated transitions between states. This pattern is well-documented and AI agents can generate it reliably.
- **Consequences**: Requires careful synchronization between video playback and overlay rendering. requestAnimationFrame loop must be performant. Testing on mobile may reveal performance issues (acceptable -- portfolio demo is primarily desktop).

## ADR-009: Architecture Review Before Build (Kiln Pipeline)
- **Date**: 2026-03-24
- **Status**: accepted
- **Context**: Starting a new Kiln pipeline run on an existing brownfield codebase with ~392 files and 10 module boundaries.
- **Decision**: Operator will review the architecture plan before the pipeline auto-proceeds to build phase.
- **Rationale**: Complex brownfield project with dual pipelines, multiple integrations, and zero test coverage warrants human review of any architectural changes before automated building begins.

## ADR-010: AWS S3 Replaces Vercel Blob for Media Storage
- **Date**: 2026-03-24
- **Status**: accepted (supersedes ADR-006)
- **Context**: The codebase has already migrated from Vercel Blob to AWS S3 for media storage. The TS worker writes to S3, and the existing S3 pipeline is operational.
- **Decision**: AWS S3 is the canonical media storage service. Pre-signed URLs serve video clips and keyframes to the browser. Vercel Blob references should be removed from new code.
- **Alternatives**: Keep Vercel Blob (already migrated away), Cloudflare R2 (migration cost for no clear benefit)
- **Rationale**: S3 is already in production use. It provides more control over storage policies, lifecycle rules, and cost at the 5,000-film scale. The migration is already done.
- **Consequences**: Requires AWS credentials management. S3 costs scale linearly with storage but are well-understood.

## ADR-011: Two-Lane Pipeline Architecture (TS Interactive + Python Batch)
- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: Three overlapping pipeline implementations exist: Python CLI, TS Express worker, and a Next.js API route that shells to Python. BullMQ and ioredis are declared as dependencies but have zero implementation. Research confirmed the TS worker is more capable (SSE, TMDB, embeddings, S3, concurrency) while Python has genuine strengths (PySceneDetect API, ML ecosystem, Gemini Batch API JSONL).
- **Decision**: Adopt a two-lane architecture. Lane 1: TS worker for interactive single-film ingestion with SSE streaming to the UI. Lane 2: New Python batch worker for bulk catalogue processing using PySceneDetect Python API + Gemini Batch API + Postgres SKIP LOCKED queue. Remove bullmq and ioredis. Retire the Python CLI entrypoint (keep as library). The legacy Next.js `detect-shots` shell-out route is retired — interactive detection uses the worker + `ingest-film/stream` only (AC-23).
- **Alternatives**: Python-only (would require rewriting working SSE streaming infrastructure), TS-only (poor fit for ML ecosystem and Gemini Batch API JSONL workflows), build out BullMQ/Redis (adds unnecessary infrastructure; Postgres SKIP LOCKED is sufficient)
- **Rationale**: Each language handles what it does best. TS handles I/O-bound streaming; Python handles ML-adjacent batch processing. Postgres SKIP LOCKED eliminates Redis as a dependency. Research confidence: 0.87.
- **Consequences**: Two languages to maintain long-term. Taxonomy must stay in sync (PF-001). Acceptable tradeoff given the distinct workload characteristics.

## ADR-012: Gemini Batch API for Bulk Classification
- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: At Gemini 2.5 Flash Tier 1 (150-300 RPM, 1,500 RPD), serial processing of 150,000 shots takes approximately 100 days. The 5,000-film goal requires a fundamentally different approach to classification at scale.
- **Decision**: Adopt the Gemini Batch API as the primary bulk ingestion path. JSONL manifests of up to 200,000 requests per job, processed within 24 hours at 50% cost savings versus synchronous calls. Interactive single-film classification retains the existing real-time Gemini path with rate limiting.
- **Alternatives**: Multi-project API key rotation (complex, fragile), serial processing at Tier 2 (still ~15 days for 150K shots), alternative classification model (no viable alternative identified)
- **Rationale**: Batch API eliminates RPM/RPD constraints for bulk work. 50% cost savings compounds significantly at 150,000 shots. 24-hour turnaround is acceptable for catalogue ingestion (not latency-sensitive). Research confidence: 0.85.
- **Consequences**: Video-via-File-API-reference in batch mode needs prototype validation before full commitment (AC-24). 24-hour latency means batch results are not real-time.

## ADR-013: Postgres SKIP LOCKED as Job Queue (No Redis)
- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: The project needs a job queue for the Python batch worker. BullMQ (Node.js-native) and ioredis are declared as dependencies but have zero implementation. Adding Redis introduces a new infrastructure component.
- **Decision**: Use PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` as the job queue for the batch pipeline. No Redis, no BullMQ, no Celery with Redis backend.
- **Alternatives**: BullMQ + Redis (adds infrastructure, cross-language complexity), Celery + Redis (adds two dependencies for a single-worker use case), AWS SQS (adds cloud dependency)
- **Rationale**: The project already runs Neon Postgres. SKIP LOCKED is a proven queue pattern that eliminates an entirely separate infrastructure component. For a single batch worker processing films sequentially, Postgres queue throughput is more than sufficient.
- **Consequences**: No built-in retry/backoff mechanisms from a queue library; must implement manually. Acceptable for the scale and complexity of this workload.

## ADR-014: Three-Layer RAG Retrieval Architecture
- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: The intelligence layer needs to serve two distinct query audiences: academic researchers (long natural-language queries about directorial technique) and AI filmmakers (short specific queries about shot types). Pure vector search achieves approximately 62% precision. The knowledge corpus (textbooks, research papers) requires different chunking than structured film metadata.
- **Decision**: Implement three-layer retrieval: (1) enriched shot-level vector search using existing shot_embeddings with scene context, (2) new corpus_chunks table for cinematography knowledge at 512-token recursive splits with contextual enrichment (Anthropic-style), (3) hybrid search via PostgreSQL tsvector BM25 + pgvector cosine similarity fused with Reciprocal Rank Fusion (RRF). Use text-embedding-3-large (1536 dims) for corpus; retain text-embedding-3-small (768 dims) for shots.
- **Alternatives**: Pure vector search (62% precision, insufficient), semantic chunking (54% accuracy in benchmarks, worse than recursive), single embedding model for all content (suboptimal cost/quality tradeoff), external search service like Elasticsearch (unnecessary infrastructure)
- **Rationale**: Hybrid BM25+vector with RRF raises precision from ~62% to ~84%. Contextual enrichment reduces failed retrievals by 49%. Multi-granularity embeddings (shot/scene/film) provide +20-35% relevance on hierarchical data. All of this runs within the existing Postgres instance. Research confidence: 0.82.
- **Consequences**: More complex retrieval logic. Corpus ingestion requires LLM-generated context statements per chunk (one-time cost). Two embedding models to manage. Storage increases with multi-granularity embeddings (monitor AC-11).

## ADR-015: Generative UI Pattern for Chat Visual Output
- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: The chat interface must produce visual output (D3 charts, shotlists, reference decks), not text-dominant responses. The codebase already has SSE streaming with tool_call/tool_result events and six standalone D3 components, but tool_result payloads are currently discarded by the client.
- **Decision**: Adopt the tool-call-to-component (Generative UI) pattern. LLM tools return typed JSON payloads; the chat client maps tool results to pre-registered React/D3 components mounted inline in the message thread. Add viz tools: render_rhythm_stream, render_pacing_heatmap, render_director_radar, render_shotlist, render_reference_deck, render_comparison_table. Complete tool result JSON fully before mounting D3 components; text streams in parallel.
- **Alternatives**: LLM-generated D3 code execution (40-60% failure rate, XSS risk), text-only responses (violates vision KD-08), iframe sandboxed code execution (complex, fragile)
- **Rationale**: The codebase already has ~70% of the infrastructure (SSE streaming, tool events, D3 components with typed props). The gap is connecting tool results to component rendering. Industry standard validated by Vercel AI SDK, Scott Logic research, Observable study. Research confidence: 0.88.
- **Consequences**: Fixed set of visualization types (not arbitrary). New chart types require adding a tool definition and a React component. This is acceptable because the six existing D3 components cover the known use cases.

## ADR-016: ComfyUI V1 Node Contract
- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: ComfyUI is the primary integration target for AI filmmaker workflows. V1 and V3 node contracts exist; V3 is still stabilizing.
- **Decision**: Build the MetroVision ComfyUI node package targeting the V1 contract (INPUT_TYPES, RETURN_TYPES, FUNCTION, CATEGORY, NODE_CLASS_MAPPINGS). Plan V3 upgrade path but do not target V3 for initial release.
- **Alternatives**: Target V3 only (smaller install base, API still changing), dual V1+V3 package (unnecessary complexity for launch)
- **Rationale**: V1 has the widest compatibility across the ComfyUI ecosystem. V3 is still stabilizing in 2026. IS_CHANGED must return float("NaN") for API-querying nodes. Research confidence: 0.82.
- **Consequences**: Will need a V3 migration at some point. Acceptable given V1 compatibility is the priority for adoption.
