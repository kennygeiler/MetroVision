# MetroVision Master Plan

Generated: 2026-03-25 | Synthesized by: plato
Priority order: P1 (training infrastructure / scale) > P2 (visual-first UI) > P3 (intelligence layer + integrations)

---

## Codebase State Summary

**Brownfield project** with ~392 files. Significant existing infrastructure:

**Already Built (Do Not Rebuild):**
- Next.js 15 + React 19 + TypeScript frontend with shadcn/ui
- Drizzle ORM + Neon Postgres + pgvector (5 tables: films, scenes, shots, shot_embeddings, verifications)
- TS ingest worker with SSE streaming, TMDB, S3, Gemini classification, OpenAI embeddings
- Python pipeline with PySceneDetect (dual implementation, partially functional)
- 6 D3 visualization components (RhythmStream, HierarchySunburst, PacingHeatmap, ChordDiagram, CompositionScatter, DirectorRadar)
- AI agent with SSE streaming and tool_call/tool_result events
- HITL verification workflow UI
- AWS S3 media storage (operational)
- Camera movement taxonomy (21 movement types, TS + Python)

**Must Be Built:**
- Python batch worker (Postgres SKIP LOCKED + Gemini Batch API)
- Rate limiting in both TS and Python pipelines (currently absent -- highest urgency gap)
- Dead dependency removal (bullmq, ioredis, Vercel Blob)
- pnpm standardization across workspaces
- New DB tables: batch_jobs, corpus_chunks, scene_embeddings, film_embeddings
- Knowledge corpus ingestion pipeline (chunking, enrichment, embedding)
- Hybrid retrieval engine (BM25 + pgvector + RRF fusion)
- Chat Generative UI (connect tool_result payloads to D3 components)
- Metadata overlay hero feature (Canvas + SVG synchronized to video currentTime)
- Film browse hierarchy with URL-param filter state
- API portal (REST endpoints, API key auth)
- ComfyUI node package (Python, V1 contract)

---

## Milestones

---

### Milestone 1: Foundation Repair

**Goal**: Eliminate technical debt and ambiguity before building anything new. Dead dependencies, dual package managers, and missing rate limiting are active blockers to scale.

**Deliverables**:
- [ ] bullmq and ioredis removed from all package.json dependencies
- [ ] Vercel Blob references removed from active code paths; S3 is canonical
- [ ] Worker directory migrated from npm to pnpm workspace; single lockfile covers all workspaces
- [ ] AWS SDK version aligned between root and worker
- [ ] TensorFlow.js/COCO-SSD evaluated and removed if not actively used
- [ ] Token-bucket rate limiter in TS worker for Gemini calls (130 RPM Tier 1 target)
- [ ] Asyncio rate limiter in Python pipeline (Semaphore + token bucket, 130 RPM Tier 1)
- [x] AC-23: Legacy `src/app/api/detect-shots/route.ts` absent; interactive ingest uses `ingest-film/stream` + TS worker (do not reintroduce shell-out route)
- [ ] review-splits page moved inside (site) route group
- [ ] Package name updated from "scenedeck" to "metrovision" to complete rebrand
- [ ] Taxonomy slug assertion added in Python pipeline: validate movement_type against canonical taxonomy before DB write (AC-02)

**Dependencies**: None (must be first)

**Acceptance Criteria**:
- pnpm install succeeds from root with no npm lockfiles anywhere in the tree
- No bullmq, ioredis, or Vercel Blob imports remain in active code paths
- TS worker processes 10 rapid-fire single-film classifications without a 429 error
- Python pipeline processes a test batch without rate-limit errors
- Legacy detect-shots Next route is absent; interactive ingest flows through TS worker + `ingest-film/stream`
- Application starts and renders without TF.js bundle if removed
- Taxonomy slug assertion passes on all existing shots in DB

**Scope Boundaries**: No new features. No batch pipeline. No schema changes beyond cleanup.

---

### Milestone 2: Batch Pipeline Infrastructure

**Goal**: Build the Python batch worker that enables bulk film ingestion at scale using Gemini Batch API and Postgres SKIP LOCKED queue. Validate Gemini Batch API video support before committing to bulk architecture.

**Deliverables**:
- [ ] batch_jobs table added to Postgres schema (id, status, jsonl_path, submitted_at, completed_at, result_count, error)
- [ ] Gemini Batch API prototype: submit 5-10 video clips via File API references in a JSONL batch to confirm video support (AC-24 gate -- run this FIRST before building the rest)
- [ ] Python batch worker: poll batch_jobs with SKIP LOCKED, run PySceneDetect (AdaptiveDetector with per-film threshold), extract frames, assemble JSONL manifest, submit to Gemini Batch API, parse results, write to Postgres
- [ ] Multi-process orchestration at film level (one process per film)
- [ ] Graceful shutdown and resume capability (worker can restart and pick up where it left off)
- [ ] Job submission endpoint: accept film IDs, insert batch_jobs rows
- [ ] Simple admin panel for batch job submission and status monitoring
- [ ] Two-lane architecture documented (AC-20)

**Dependencies**: Milestone 1

**Acceptance Criteria**:
- Gemini Batch API prototype returns structured classification output for at least 5 video clips (AC-24 gate passed)
- Batch worker processes a queue of 10 test films end-to-end without crashes
- batch_jobs table reflects accurate status transitions: pending -> submitted -> complete
- SKIP LOCKED correctly prevents two worker processes from claiming the same job
- All batch shot writes pass taxonomy slug validation
- Worker handles graceful shutdown and resumes from last checkpoint

**Scope Boundaries**: Not the 500-film scale run (that is M3). Not schema changes for RAG tables. Not the HITL hardening for scale.

**Risk Gate (AC-24)**: Gemini Batch API video support is the highest-risk unknown in the project. The prototype must run FIRST in this milestone. If batch mode does not support video-via-File-API, the fallback is synchronous Python with asyncio concurrency at Tier 2 RPM (~150 films/day at 450 RPM). This fallback is slower but requires no architectural redesign.

---

### Milestone 3: Dataset Scale to 500 Films

**Goal**: Classify a minimum of 500 films with structured camera movement metadata at 85% accuracy baseline. This is the non-negotiable gate before any product surface launches (AC-19, KD-03).

**Deliverables**:
- [ ] 500+ film video files sourced, identified, and queued for processing
- [ ] Batch worker run against full 500-film queue with monitoring
- [ ] HITL review pipeline hardened: classifications below confidence threshold auto-routed to review queue with needs_review flag
- [ ] Confidence threshold defined and implemented for automatic review routing
- [ ] HITL corrections written back to shots table; corrections feed prompt engineering improvements
- [ ] Accuracy measurement methodology: sample 100 shots per 100-film tranche, human-grade against taxonomy, calculate agreement rate
- [ ] 85% classification accuracy achieved on human-reviewed sample
- [ ] Neon storage utilization monitored (AC-11); tier upgrade planned if approaching 80% capacity
- [ ] Per-film threshold tuning documented as an operator runbook
- [ ] Embeddings generated for all classified shots

**Dependencies**: Milestone 2

**Acceptance Criteria**:
- 500+ films in films table with shots, scenes, and camera movement metadata populated
- Shot count per film is plausible (no films with fewer than 5 or more than 2000 shots without operator review)
- 85% classification accuracy confirmed on a human-reviewed sample of 500+ shots
- HITL review queue contains only shots below confidence threshold
- Neon storage below 80% capacity at 500-film mark
- No batch job fails silently; all failures logged in batch_jobs.error column

**Scope Boundaries**: No product surface work. No web app UI. No RAG. This is purely operational: run the pipeline, review quality, hit the gate.

---

### Milestone 4: Web Application and Hero Features

**Goal**: Ship the primary academic product surface: film-to-scene-to-shot browse hierarchy, semantic search, the metadata overlay hero feature, D3 visualizations, and data export. This is the first public-facing surface.

**Deliverables**:
- [ ] Film browse landing page: grid/list of all classified films with poster, director, year, genre from TMDB
- [ ] Film detail page: scene list with shot counts, D3 coverage visualizations
- [ ] Scene detail page: shot-level grid with keyframe thumbnails, taxonomy tags, confidence indicators
- [ ] Shot detail page: video playback with metadata overlay (hero feature per AC-22)
- [ ] Metadata overlay: Canvas + SVG layered over video element, synchronized to currentTime via requestAnimationFrame; displays movement type, direction arrows, trajectory, shot size, speed (AC-22)
- [ ] requestAnimationFrame cleanup in all useEffect hooks (AC-16)
- [ ] Semantic search powered by existing shot embeddings with cosineDistance (pgvector)
- [ ] Browse filter state uses URL search params exclusively -- no useState for filters (AC-10)
- [ ] Data export: CSV, Excel (XLSX), JSON download for shot/scene/film data
- [ ] Reference deck creation workflow (JSON export; PDF deferred)
- [ ] D3 visualizations on film and scene detail pages with cinematic aesthetics
- [ ] Visual design: technical precision + cinematic elegance; not a generic SaaS template

**Dependencies**: Milestone 3 (500-film gate must be cleared)

**Acceptance Criteria**:
- All 500+ films browsable from landing page; page load under 2 seconds on desktop
- Metadata overlay renders correctly during video playback with synchronized camera motion annotations; visually striking and screen-recordable
- Semantic search returns ranked results for queries like "dolly push into face" and "wide establishing shot cityscape"
- Filter state preserved in URL; survives page reload and browser back/forward navigation
- CSV/Excel/JSON export produces valid files with correct taxonomy data
- Reference deck export contains selected shots with keyframe images and metadata
- No Pages Router patterns anywhere (AC-05)
- No memory leaks from unmounted RAF loops (verified in DevTools)
- All 6 D3 chart types render correctly with production data

**Scope Boundaries**: No RAG intelligence. No chat interface. No API portal. Semantic search uses existing shot embeddings only (not corpus or multi-granularity).

---

### Milestone 5: RAG Intelligence Layer

**Goal**: Build the three-layer RAG retrieval architecture with knowledge corpus ingestion, multi-granularity embeddings, and hybrid retrieval engine. Wire to a foundation model for cinematography-grounded responses.

**Deliverables**:
- [ ] corpus_chunks table created (embedding vector(1536), tsvector column, GIN indexes)
- [ ] scene_embeddings table created (embedding vector(768))
- [ ] film_embeddings table created (embedding vector(768))
- [ ] pgvector extension confirmed enabled before migration (AC-03)
- [ ] Knowledge corpus ingestion pipeline: read sources, apply 512-token recursive splits with 10-20% overlap, LLM-generated context statement per chunk, embed with text-embedding-3-large
- [ ] Scene-level and film-level embedding generation from existing shot data (text-embedding-3-small)
- [ ] Hybrid retrieval engine: pgvector cosine similarity + PostgreSQL tsvector/ts_rank + Reciprocal Rank Fusion
- [ ] Query routing: long NL queries to corpus + scene-level search; short specific queries to shot-level metadata + vector similarity
- [ ] Foundation model integration (Claude or Gemini) with RAG-augmented prompts
- [ ] Multi-granularity retrieval: shot-level search with parent-child expansion to scene context
- [ ] Chunk size empirical test: compare retrieval quality at 400, 512, and 600 tokens before full corpus ingestion
- [ ] Neon storage monitored after adding all embedding tables (AC-11)

**Dependencies**: Milestone 3 (needs 500+ films of data to retrieve against)

**Acceptance Criteria**:
- Natural-language query about directorial technique returns relevant corpus chunks AND matching film data from the dataset
- Hybrid search demonstrably outperforms pure vector search (manual comparison on 5+ test queries)
- Foundation model responses cite specific films, scenes, or shots from the dataset
- Query routing correctly dispatches long vs. short queries to appropriate retrieval paths
- Response latency under 5 seconds for retrieval + generation
- corpus_chunks populated with at least 3 cinematography sources (textbook, research paper, critical analysis)
- scene_embeddings and film_embeddings populated for all 500+ classified films
- Neon storage within tier limit after adding all embedding tables

**Scope Boundaries**: No chat UI. No Generative UI components. The intelligence layer is the retrieval engine and foundation model integration only.

---

### Milestone 6: Chat Interface with Generative UI

**Goal**: Transform the existing chat into a visual-output interface using the Generative UI pattern. Mount D3 components inline from tool-call results. Chat returns visualizations and structured data, not text-dominant responses.

**Deliverables**:
- [ ] Viz tool definitions added to the agent layer: render_rhythm_stream, render_pacing_heatmap, render_director_radar, render_shotlist, render_reference_deck, render_comparison_table
- [ ] Tool-call-to-component mapping: tool_result payloads mount matching pre-registered React/D3 components inline in message thread (AC-08: no eval/execute of LLM-generated code)
- [ ] Complete tool result JSON received before D3 mount (AC-09: no partial data)
- [ ] Text streams in parallel with component rendering
- [ ] SSE streaming with hybrid text + structured parts
- [ ] Chat queries routed through the hybrid retrieval engine (M5)
- [ ] Chat handles multi-turn conversation threads without SSE connection drops

**Dependencies**: Milestone 4 (D3 components polished in production), Milestone 5 (RAG powers chat responses)

**Acceptance Criteria**:
- "Show me the pacing of [film]" renders an inline PacingHeatmap, not text
- "Compare camera movements between [director A] and [director B]" renders a DirectorRadar or comparison table
- At least 4 of the 6 D3 chart types mountable from chat tool calls
- Text and visual components render in the same message thread
- No LLM-generated code evaluated or executed anywhere in the chat pipeline (AC-08)
- Chat handles a 10-message thread without SSE drops
- Total response time (retrieval + generation) under 60 seconds (Vercel timeout, AC-01)

**Scope Boundaries**: No API portal. No ComfyUI. Chat uses existing D3 components -- does not create new visualization types.

---

### Milestone 7: API Portal and ComfyUI Integration

**Goal**: Ship a public REST API for programmatic dataset access and a pip-installable ComfyUI node package that queries it. Enables external integrations and AI filmmaker workflows.

**Deliverables**:
- [ ] REST API endpoints: /api/v1/films, /api/v1/scenes, /api/v1/shots, /api/v1/search, /api/v1/taxonomy
- [ ] API key-based authentication: keys table in Postgres (key_hash, created_at, last_used_at, revoked); operator-issued keys only; no OAuth, no user accounts (AC-21)
- [ ] Search endpoint supports semantic query + metadata filtering
- [ ] Pagination on all list endpoints
- [ ] Rate limiting per API key
- [ ] API documentation page within the web app
- [ ] ComfyUI Python node package: SceneQuery node with V1 contract (INPUT_TYPES, RETURN_TYPES, FUNCTION, CATEGORY)
- [ ] IS_CHANGED returns float("NaN") for API-querying nodes (AC-12)
- [ ] NODE_CLASS_MAPPINGS registration
- [ ] pip-installable package structure

**Dependencies**: Milestone 5 (semantic search via RAG layer)

**Acceptance Criteria**:
- All API endpoints return valid JSON with consistent response structure
- Invalid or missing API key returns 401
- Search endpoint returns relevant results for both natural-language and metadata queries
- Pagination works correctly
- API documentation accessible at a URL with example requests and responses
- ComfyUI SceneQuery node appears in ComfyUI after pip install
- Node successfully queries the MetroVision API and returns results
- Node re-executes on each run (IS_CHANGED = NaN confirmed)
- Package installs cleanly via pip
- No stale cache bug: changing inputs fires a new API call

**Scope Boundaries**: No self-serve API key signup. No OAuth. No V3 ComfyUI contract (V1 only). No secondary integrations (Krea.ai, FLORA, Higsfield).

---

## Dependency Graph

```
M1 (Foundation Repair)
  |
  +---> M2 (Batch Pipeline)
          |
          +---> M3 (Dataset Scale: 500 Films) [HARD GATE per AC-19]
                  |
                  +---> M4 (Web Application + Hero Features) [P2]
                  |       |
                  |       +---> M6 (Chat Generative UI) [also needs M5]
                  |
                  +---> M5 (RAG Intelligence Layer) [P3]
                          |
                          +---> M6 (Chat Generative UI) [also needs M4]
                          |
                          +---> M7 (API Portal + ComfyUI)
```

**Critical path**: M1 -> M2 -> M3 -> M4 (parallel with M5) -> M6
**M4 and M5 can run in parallel** after M3 clears the 500-film gate.
**M7 depends only on M5** (needs semantic search); can run parallel with M6.

---

## Risk Register

| ID | Risk | Milestones | Likelihood | Impact | Mitigation |
|----|------|-----------|------------|--------|------------|
| R-AC24 | Gemini Batch API does not support video-via-File-API in batch mode | M2, M3 | Medium | Critical | Prototype FIRST in M2 before building batch worker. Fallback: synchronous Python with asyncio at Tier 2 RPM |
| R-ACC | Classification accuracy plateaus below 85% | M3 | Medium | High | Refine prompt with few-shot HITL examples; tune per-film threshold; process in 50-film tranches with early course correction |
| R-SCALE | Neon free tier storage exhausted before 5,000-film goal | M3, M5 | High | Medium | Monitor actively; plan paid tier upgrade before M3 is 60% complete |
| R-CORPUS | Knowledge corpus quality insufficient for intelligence depth | M5 | Medium | High | Curate before ingestion; prioritize academic textbooks and peer-reviewed sources |
| R-TIMEOUT | Vercel 60s timeout exceeded by RAG + LLM generation in chat | M6 | Medium | High | Retrieval under 10s, generation under 30s; add timeout monitoring from day one |
| R-TAXONOMY | Taxonomy drift between TS and Python causes silent data corruption | All | Low | High | Assert slug validation in Python (M1); consider CI check |
| R-OVERLAY | Metadata overlay performance or memory leaks | M4 | Low | Medium | Progressive enhancement (text first, arrows/trajectories later); cancelAnimationFrame cleanup mandatory |
| R-VIBEWALL | AI agent vibe coding hits a wall on complex infrastructure | M2, M5 | Medium | High | Use managed services; keep implementations simple; prefer library calls over custom algorithms |

---

## Architectural Constraints Quick Reference

All milestones must respect these. Violations cause build failures, data corruption, or architectural regression. Full details in arch-constraints.md.

- AC-01: No video processing in Vercel serverless (60s timeout)
- AC-02: Taxonomy slugs match in TS and Python -- same commit for any change
- AC-03: pgvector extension enabled before migration
- AC-04: Single db import from src/db/index.ts
- AC-05: App Router only -- no Pages Router patterns
- AC-06: No BullMQ / No Redis -- Postgres SKIP LOCKED is the queue
- AC-07: Rate limiting on all Gemini API calls (both languages)
- AC-08: No LLM-generated code execution in chat
- AC-09: D3 components require complete data before mount
- AC-10: Filter state in URL params, not useState
- AC-11: Monitor Neon storage; plan tier upgrade before 5K films
- AC-12: ComfyUI IS_CHANGED = float("NaN"), not True
- AC-13: Never persist Gemini File API IDs to DB
- AC-14: Pin drizzle-orm to ^0.45.1; prefer builder API
- AC-16: cancelAnimationFrame cleanup in every RAF loop
- AC-17: pnpm exclusively (after M1 migration)
- AC-19: 500-film gate before any product surface
- AC-20: Two-lane pipeline -- TS interactive + Python batch
- AC-21: No auth in v1 -- API keys only
- AC-22: Metadata overlay is the hero feature
- AC-23: detect-shots route retired
- AC-24: Prototype Gemini Batch API video support before committing

---

## Priority Sequencing Rationale

**P1 (M1 -> M2 -> M3)**: The dataset IS the product. Rate limiting (M1) unblocks reliable pipeline runs. Batch worker (M2) unlocks scale. 500-film execution (M3) clears the hard launch gate. All energy goes here first.

**P2 (M4)**: Web application with hero features is the primary academic surface. Ships only after the 500-film gate clears. Maximum design attention on the metadata overlay (AC-22).

**P3 (M5, M6, M7)**: RAG intelligence, chat, API, ComfyUI. These amplify dataset value but do not create it. M4 and M5 can run in parallel after M3. If time runs short, M4 (visual-first product surface) is prioritized over M5-M7 per KD-13.
