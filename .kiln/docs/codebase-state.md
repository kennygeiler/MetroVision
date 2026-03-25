<!-- status: complete -->
# Codebase State

## TL;DR
Current milestone: M1 (Foundation Repair). 0/11 deliverables complete. Key files: src/db/schema.ts, package.json, worker/src/ingest.ts.
Last change: MetroVision rebrand + S3 pipeline + D3 visualizations + AI agent + batch processing routes added.

## Milestone: M1 — Foundation Repair
Status: not started

### Deliverables
- [ ] bullmq and ioredis removed from package.json — currently in package.json (bullmq ^5.71.0, ioredis ^5.10.1)
- [ ] Vercel Blob references removed — @vercel/blob ^2.3.1 still in package.json; src/app/api/blob/[...path]/route.ts and pipeline/upload_blob.py exist
- [ ] Worker directory migrated from npm to pnpm workspace — worker/ has its own package.json with npm lockfile; pnpm-workspace.yaml exists at root but worker not yet integrated
- [ ] AWS SDK version aligned between root and worker — root: ^3.1015.0, worker: ^3.700.0
- [ ] TensorFlow.js/COCO-SSD evaluated and removed if not actively used — @tensorflow/tfjs ^4.22.0 and @tensorflow-models/coco-ssd ^2.2.3 in root package.json; used by src/components/video/realtime-object-overlay.tsx and src/hooks/use-realtime-detection.ts
- [ ] Token-bucket rate limiter in TS worker for Gemini calls — not implemented
- [ ] Asyncio rate limiter in Python pipeline — not implemented
- [ ] detect-shots API route consolidated — src/app/api/detect-shots/route.ts still exists (shells to Python)
- [ ] review-splits page moved inside (site) route group — src/app/review-splits/page.tsx exists outside (site) group
- [ ] Package name updated from "scenedeck" to "metrovision" — package.json still says "scenedeck", worker says "scenedeck-worker"
- [ ] Taxonomy slug assertion in Python pipeline — not implemented in pipeline/

### Notes
- DB schema has 8 tables: films, scenes, shots, shotMetadata, shotSemantic, verifications, shotEmbeddings, shotObjects, pipelineJobs
- Architecture doc mentions 5 tables (films, scenes, shots, shot_embeddings, verifications) but schema has evolved to 9 tables
- drizzle-orm pinned at ^0.45.1 (arch-constraints say ~0.38.x — version drift)
- src/lib/queue.ts and src/lib/queue-workers.ts exist (may contain BullMQ usage)
- Batch API routes exist: src/app/api/batch/{source,submit,status,review}/route.ts

## Milestone: M2 — Batch Pipeline Infrastructure
Status: not started

### Deliverables
- [ ] batch_jobs table in Postgres — pipelineJobs table exists but is not the batch_jobs spec from master plan
- [ ] Gemini Batch API prototype (AC-24 gate)
- [ ] Python batch worker with SKIP LOCKED
- [ ] Multi-process orchestration at film level
- [ ] Graceful shutdown and resume
- [ ] Job submission endpoint
- [ ] Admin panel for batch jobs — src/app/(site)/admin/page.tsx exists (partial)
- [ ] Two-lane architecture documented (AC-20)

## Milestone: M3 — Dataset Scale to 500 Films
Status: not started

### Deliverables
- [ ] 500+ films sourced and queued
- [ ] Batch worker run against 500-film queue
- [ ] HITL review pipeline hardened
- [ ] 85% classification accuracy achieved
- [ ] Embeddings for all classified shots

## Milestone: M4 — Web Application and Hero Features
Status: not started (some UI already exists from prior work)

### Deliverables
- [ ] Film browse landing page — src/app/(site)/browse/page.tsx exists (partial, uses mock data)
- [ ] Film detail page — src/app/(site)/film/[id]/page.tsx exists (partial)
- [ ] Scene detail page — not yet
- [ ] Shot detail page — src/app/(site)/shot/[id]/page.tsx exists (partial)
- [ ] Metadata overlay hero feature — src/components/video/metadata-overlay.tsx exists (SVG-based, partial)
- [ ] Semantic search — src/app/api/search/route.ts exists (partial)
- [ ] URL param filter state — not verified
- [ ] Data export — src/app/(site)/export/page.tsx and src/components/export/ exist (partial)
- [ ] Reference deck creation
- [ ] D3 visualizations — 6 components exist: rhythm-stream, hierarchy-sunburst, pacing-heatmap, chord-diagram, composition-scatter, director-radar

## Milestone: M5 — RAG Intelligence Layer
Status: not started

## Milestone: M6 — Chat Interface with Generative UI
Status: not started (partial infrastructure exists)

### Notes
- AI agent exists: src/app/(site)/agent/page.tsx, src/components/agent/chat-interface.tsx, src/app/api/agent/chat/route.ts
- Agent system prompt and tools: src/lib/agent-system-prompt.ts, src/lib/agent-tools.ts

## Milestone: M7 — API Portal and ComfyUI Integration
Status: not started

## Module Inventory

### Next.js App (src/)
- **Pages**: layout.tsx, page.tsx (home), browse/, film/[id]/, shot/[id]/, verify/, verify/[shotId]/, export/, visualize/, agent/, ingest/, admin/, review-splits/ (outside route group)
- **API Routes**: detect-shots, detect-split, detect-objects, export, search, shots, verifications, process-scene, group-scenes, s3, blob/[...path], upload-video, ingest-film, ingest-film/stream, agent/chat, upload-to-s3, batch/{source,submit,status,review}
- **Components**: video/ (shot-player, metadata-overlay, object-overlay, realtime-object-overlay), shots/ (shot-card, shot-browser, detect-objects-button), films/ (film-card, film-header, film-coverage-stats, film-timeline, scene-card, film-browser), visualize/ (6 D3 charts + viz-dashboard), agent/ (chat-interface, message-cards), export/ (export-button, export-panel), verify/ (verification-panel, verification-history), review/ (review-splits-workspace), layout/ (site-shell, site-header), home/ (home-hero), ingest/ (pipeline-viz), ui/ (button, loading-skeleton)
- **Lib**: taxonomy.ts, types.ts, utils.ts, shot-display.ts, tmdb.ts, s3.ts, export.ts, archive-org.ts, object-detection.ts, timeline-colors.ts, verification.ts, validation-rules.ts, ingest-pipeline.ts, agent-system-prompt.ts, agent-tools.ts, queue.ts, queue-workers.ts, mock/shots.ts
- **DB**: schema.ts (9 tables), index.ts, queries.ts, embeddings.ts, generate-embeddings.ts, seed.ts, load-env.ts

### TS Ingest Worker (worker/)
- server.ts (Express), ingest.ts (pipeline logic), s3.ts, db.ts, schema.ts
- Has own package.json with npm (not pnpm workspace)

### Python Pipeline (pipeline/)
- main.py, classify.py, config.py, detect_region.py, extract_clips.py, shot_detect.py, taxonomy.py, upload_blob.py, validate_gemini.py, write_db.py, requirements.txt

### Config
- drizzle.config.ts, next.config.ts, eslint.config.mjs, postcss.config.mjs, pnpm-workspace.yaml, components.json
