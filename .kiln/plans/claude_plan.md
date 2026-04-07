# MetroVision Master Plan

Generated: 2026-03-25 | Planner: confucius
Priority order follows vision-priorities.md: P1 (training infrastructure/scale) > P2 (visual-first UI) > P3 (intelligence layer + integrations).

## Codebase State Summary

This is a **brownfield** project with ~392 files. Key existing assets:
- Next.js 15 + React 19 + TypeScript frontend with shadcn/ui
- Drizzle ORM + Neon Postgres + pgvector (8 tables)
- TS ingest worker with SSE streaming, TMDB, S3, embeddings
- Python pipeline with PySceneDetect (dual implementation)
- 6 D3 visualization components (standalone, reusable)
- AI agent with SSE streaming and tool_call/tool_result events
- Existing verification/HITL workflow
- AWS S3 media storage (operational)
- Camera movement taxonomy (21 types, TS + Python)

Key gaps: No batch pipeline, no RAG, dead dependencies (bullmq/ioredis), dual package managers, zero tests, no rate limiting, tool_result payloads discarded in chat.

---

## Milestone 1: Pipeline Consolidation and Rate Limiting

**Goal:** Clean up the existing codebase to establish a stable foundation for scaling. Remove dead dependencies, consolidate package managers, add rate limiting to prevent 429 errors.

**Traces to:** P1 (training infrastructure), research finding #5 (rate limiting is most urgent gap)

**Dependencies:** None (first milestone)

**Deliverables:**
- [ ] bullmq and ioredis removed from package.json dependencies
- [ ] Worker directory migrated from npm to pnpm workspace
- [ ] Token-bucket rate limiter implemented in TS worker for Gemini calls (130 RPM Tier 1 target)
- [x] AC-23: Legacy detect-shots route absent; ingest via TS worker + `ingest-film/stream`
- [ ] TensorFlow.js/COCO-SSD evaluated and removed if not actively used (PF from codebase-snapshot)
- [ ] AWS SDK version aligned between root and worker
- [ ] MetroVision branding consistent across package.json and layout

**Acceptance Criteria:**
- `pnpm install` succeeds from root with no npm lockfiles anywhere in the tree
- No bullmq, ioredis, or Vercel Blob imports exist in the codebase
- TS worker can ingest a single film at 130 RPM without 429 errors
- `src/app/api/detect-shots/` remains absent; no redirect path needed
- Application starts and renders without TF.js bundle if removed

**Status:** [ ]

---

## Milestone 2: Batch Pipeline Infrastructure

**Goal:** Build the Python batch worker that enables bulk film ingestion at the 5,000-film scale using Gemini Batch API and Postgres SKIP LOCKED queue.

**Traces to:** P1 (training infrastructure, scale), ADR-011 (two-lane pipeline), ADR-012 (Gemini Batch API), ADR-013 (Postgres SKIP LOCKED)

**Dependencies:** Milestone 1 (clean foundation)

**Deliverables:**
- [ ] `batch_jobs` table added to Postgres schema (id, status, jsonl_path, submitted_at, completed_at, result_count, error)
- [ ] Python batch worker (`pipeline/batch_worker.py`) that polls Postgres with `SELECT ... FOR UPDATE SKIP LOCKED`
- [ ] PySceneDetect integration via Python API (AdaptiveDetector with per-film threshold parameter)
- [ ] Gemini Batch API JSONL manifest generation for bulk classification
- [ ] Batch result parsing and Postgres write-back via asyncpg
- [ ] Rate limiter for Python interactive Gemini calls (asyncio.Semaphore + token bucket)
- [ ] Taxonomy validation in Python pipeline -- assert movement_type against MOVEMENT_TYPES before DB write (PF-001)
- [ ] Prototype test: validate Gemini Batch API accepts video-via-File-API references (AC-24)

**Acceptance Criteria:**
- Batch worker can be started and processes a queued film end-to-end (detect shots, submit batch, parse results, write to DB)
- JSONL manifest conforms to Gemini Batch API spec
- Taxonomy slugs in Python match TypeScript (automated check or script)
- Batch API video support prototype either confirms viability or documents the fallback approach
- Worker handles graceful shutdown and can resume from where it left off

**Risk Areas:**
- Gemini Batch API may not support video-via-File-API in batch mode (AC-24). Fallback: async rate-limited individual calls at Tier 2 RPM.
- PySceneDetect threshold tuning needed per film (PF-009). Mitigation: expose threshold as CLI arg, default works for 80%+ of films.

**Status:** [ ]

---

## Milestone 3: Database Schema Extension and Multi-Granularity Embeddings

**Goal:** Extend the data layer to support the intelligence layer: corpus storage, scene-level and film-level embeddings, full-text search infrastructure.

**Traces to:** P3 (intelligence layer), ADR-014 (three-layer RAG)

**Dependencies:** Milestone 1 (clean foundation)

**Deliverables:**
- [ ] `corpus_chunks` table created (id, source, chunk_index, content, context_statement, embedding vector(1536), tsv tsvector)
- [ ] `scene_embeddings` table created (id, scene_id, search_text, embedding vector(768))
- [ ] `film_embeddings` table created (id, film_id, search_text, embedding vector(768))
- [ ] pgvector extension confirmed enabled before migration (AC-03)
- [ ] tsvector columns and GIN indexes for full-text search on corpus_chunks and shots
- [ ] Drizzle schema updated with new tables, migration applied
- [ ] Script to generate scene-level and film-level embeddings from existing shot data
- [ ] Neon storage utilization monitored and documented (AC-11)

**Acceptance Criteria:**
- All new tables exist in Neon with correct column types and indexes
- Scene and film embeddings can be generated for existing data
- `cosineDistance` queries work against all three embedding tables
- tsvector search returns results on corpus_chunks
- Storage utilization is under 80% of Neon tier limit

**Status:** [ ]

---

## Milestone 4: RAG Intelligence Layer

**Goal:** Build the hybrid retrieval engine and knowledge corpus ingestion pipeline so foundation models can answer cinematographic questions grounded in real data.

**Traces to:** P3 (intelligence layer), ADR-014 (three-layer RAG), research finding #3 (chunking strategy)

**Dependencies:** Milestone 3 (schema extension)

**Deliverables:**
- [ ] Knowledge corpus ingestion script: reads source documents, applies 512-token recursive splits with 10-20% overlap
- [ ] Contextual enrichment: LLM-generated context statement prepended to each chunk before embedding
- [ ] Corpus embeddings generated with text-embedding-3-large (1536 dims)
- [ ] Hybrid retrieval engine: pgvector cosine similarity + PostgreSQL tsvector/ts_rank
- [ ] Reciprocal Rank Fusion (RRF) scoring: `score = 1/(60 + rank_vector) + 1/(60 + rank_bm25)`
- [ ] Query routing: long queries -> corpus + scene-level search; short queries -> shot-level metadata + vector
- [ ] Foundation model integration (Claude or Gemini) with RAG-augmented prompts
- [ ] Multi-granularity retrieval: shot-level search with parent-child expansion to scene context

**Acceptance Criteria:**
- A natural-language query about directorial technique returns relevant corpus chunks and film data
- Hybrid search demonstrably outperforms pure vector search (manual comparison on 5+ test queries)
- Foundation model responses cite specific films, scenes, or shots from the dataset
- Query routing correctly dispatches long vs. short queries to appropriate retrieval paths
- Response latency under 5 seconds for retrieval + generation

**Status:** [ ]

---

## Milestone 5: Web Application Polish and Hero Features

**Goal:** Elevate the web application to production quality with the hero visual moment (metadata overlay on video), improved browse/search UX, and data export.

**Traces to:** P2 (visual-first UI), AC-22 (metadata overlay is hero feature), PF-011 (URL params for filter state)

**Dependencies:** Milestone 1 (clean foundation), Milestone 3 (scene/film embeddings for search)

**Deliverables:**
- [ ] Metadata overlay on video playback: movement type, direction arrows, trajectory path, shot size, speed -- synchronized to video currentTime via requestAnimationFrame (AC-22)
- [ ] Canvas + SVG layered overlay architecture per ADR-008
- [ ] requestAnimationFrame cleanup in all useEffect hooks (AC-16, PF-005)
- [ ] Browse filter state migrated from useState to URL search params (PF-011, AC-10)
- [ ] Semantic search powered by multi-granularity embeddings
- [ ] Data export: CSV, Excel, JSON for shot/scene/film data
- [ ] D3 visualizations rendered with cinematic aesthetics (not clinical)
- [ ] Reference deck creation workflow
- [ ] review-splits page moved inside (site) route group

**Acceptance Criteria:**
- Video playback shows synchronized metadata overlay that updates in real-time with camera motion annotations
- Overlay is visually striking and screen-recordable
- Filter URLs are shareable -- pasting a URL with query params restores the exact filter state
- Browser back/forward navigation preserves filter state
- All 6 D3 chart types render correctly with existing data
- CSV/Excel/JSON export produces valid files with correct data
- No memory leaks from unmounted RAF loops (verify in DevTools)

**Risk Areas:**
- Metadata overlay synchronization complexity. Mitigation: start with simple text overlay, layer on arrows/trajectories incrementally.
- D3 "cinematic" aesthetics are subjective. Mitigation: dark theme, muted colors, film-grain-inspired textures -- operator reviews.

**Status:** [ ]

---

## Milestone 6: Chat Interface with Generative UI

**Goal:** Transform the existing chat into a visual-output interface using the Generative UI pattern, mounting D3 components inline from tool-call results.

**Traces to:** P2 (visual-first UI), P3 (intelligence layer), ADR-015 (Generative UI), research finding #4

**Dependencies:** Milestone 4 (RAG intelligence layer), Milestone 5 (D3 components polished)

**Deliverables:**
- [ ] Viz tools defined: render_rhythm_stream, render_pacing_heatmap, render_director_radar, render_shotlist, render_reference_deck, render_comparison_table
- [ ] Tool-call-to-component mapping in chat client: tool_result payloads mount matching React/D3 components inline
- [ ] Complete tool result JSON received before D3 mount (AC-09)
- [ ] Text streams in parallel with component rendering
- [ ] SSE streaming with hybrid text + structured parts
- [ ] Chat queries routed through the hybrid retrieval engine (M4)
- [ ] No LLM-generated code execution (AC-08)

**Acceptance Criteria:**
- Chat query "Show me the pacing of [film]" renders an inline PacingHeatmap component, not text
- Chat query "Compare camera movements between [director A] and [director B]" renders a DirectorRadar or comparison table
- At least 4 of the 6 D3 chart types are mountable from chat tool calls
- Text and visual components render in the same message thread
- No eval/execute of LLM-generated code anywhere in the chat pipeline

**Status:** [ ]

---

## Milestone 7: API Portal

**Goal:** Ship a public REST API for programmatic access to the film dataset, enabling integrations and third-party tools.

**Traces to:** P3 (API portal), SC-06

**Dependencies:** Milestone 3 (schema extension for full search capabilities)

**Deliverables:**
- [ ] REST JSON API endpoints: /api/v1/films, /api/v1/scenes, /api/v1/shots, /api/v1/search, /api/v1/taxonomy
- [ ] API key-based authentication (simple, no OAuth -- AC-21)
- [ ] Search endpoint supports semantic query + metadata filtering
- [ ] Pagination on all list endpoints
- [ ] Rate limiting on API endpoints
- [ ] API documentation page (auto-generated or hand-written)

**Acceptance Criteria:**
- All endpoints return valid JSON with consistent response structure
- API key required for all requests; invalid key returns 401
- Search endpoint returns relevant results for both natural-language and metadata queries
- Pagination works correctly (cursor or offset-based)
- API documentation is accessible at a URL

**Status:** [ ]

---

## Milestone 8: ComfyUI Node Package

**Goal:** Build a pip-installable ComfyUI node package that queries the MetroVision API, enabling AI filmmakers to use film reference data in their node-based workflows.

**Traces to:** P3 (ComfyUI integration), ADR-016 (V1 contract), SC-12

**Dependencies:** Milestone 7 (API portal must be live)

**Deliverables:**
- [ ] Python node package at `comfyui-metrovision/`
- [ ] SceneQuery node: string inputs (film, shot type, movement filter), HTTP GET to MetroVision API, STRING + INT outputs
- [ ] IS_CHANGED returns float("NaN") for API-querying nodes (AC-12)
- [ ] NODE_CLASS_MAPPINGS registration in __init__.py
- [ ] V1 contract compliance (INPUT_TYPES, RETURN_TYPES, FUNCTION, CATEGORY)
- [ ] pip-installable package structure

**Acceptance Criteria:**
- Node appears in ComfyUI after installation
- SceneQuery node successfully queries the MetroVision API and returns results
- Node re-executes on each run (IS_CHANGED = NaN)
- Package installs cleanly via pip
- V1 contract verified against ComfyUI node requirements

**Status:** [ ]

---

## Dependency Graph

```
M1 (Pipeline Consolidation)
  |
  +---> M2 (Batch Pipeline)
  |
  +---> M3 (Schema Extension)
  |       |
  |       +---> M4 (RAG Intelligence)
  |       |       |
  |       |       +---> M6 (Chat Generative UI)
  |       |
  |       +---> M7 (API Portal)
  |               |
  |               +---> M8 (ComfyUI Nodes)
  |
  +---> M5 (Web App Polish)
            |
            +---> M6 (Chat Generative UI) [also depends on M4]
```

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gemini Batch API does not support video in batch mode (AC-24) | Medium | High | Prototype validation in M2. Fallback: async rate-limited calls at Tier 2 |
| Classification accuracy below 85% at scale | High | High | HITL review pipeline, prompt engineering iteration, few-shot examples |
| Neon free tier storage exhaustion at scale | Medium | Medium | Monitor in M3. Upgrade to paid tier before 5,000-film milestone |
| Metadata overlay performance on complex scenes | Low | Medium | Progressive enhancement: text first, then arrows, then trajectories |
| Drizzle ORM API changes break queries | Medium | Medium | Pin to ^0.45.1 (AC-14), prefer builder API over db.query |
| PySceneDetect threshold inadequate for art house cinema | Medium | Medium | Per-film threshold parameter (PF-009), operator review |

## Scope Estimates

| Milestone | Relative Size | Notes |
|-----------|--------------|-------|
| M1: Pipeline Consolidation | Small | Cleanup work, well-defined scope |
| M2: Batch Pipeline | Large | New Python worker, Gemini Batch API integration, prototype validation |
| M3: Schema Extension | Small-Medium | Schema changes + embedding generation scripts |
| M4: RAG Intelligence | Large | Corpus ingestion, hybrid retrieval, query routing, LLM integration |
| M5: Web App Polish | Large | Hero feature (overlay), UX improvements, export |
| M6: Chat Generative UI | Medium | 70% infrastructure exists, connect tool results to components |
| M7: API Portal | Medium | Standard REST API, auth, docs |
| M8: ComfyUI Nodes | Small | Single node, straightforward V1 contract |

## Pitfall Constraints (Incorporated)

The following pitfalls from pitfalls.md are baked into milestone acceptance criteria and must be respected:

- **PF-001 (Taxonomy sync):** Every taxonomy change touches both TS and Python in same commit. M2 adds validation assertion.
- **PF-002 (Pages Router patterns):** No getServerSideProps/getStaticProps anywhere. M5 reviews all pages.
- **PF-003 (pgvector extension):** M3 confirms extension before migration.
- **PF-005 (RAF cleanup):** M5 audits all requestAnimationFrame loops.
- **PF-006 (Neon connection pool):** All milestones use single db import from src/db/index.ts.
- **PF-009 (PySceneDetect threshold):** M2 exposes per-film threshold parameter.
- **PF-010 (Drizzle version):** Pin ^0.45.1 (AC-14), prefer builder API.
- **PF-011 (Filter state):** M5 migrates to URL params.
- **PF-012 (pgvector cosine syntax):** M3/M4 use cosineDistance helper or tested raw SQL.
- **PF-013 (Zero tests):** Not addressed as a dedicated milestone; smoke tests added opportunistically.
- **PF-014 (Dual package managers):** M1 resolves.
