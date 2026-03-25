# Codebase Snapshot

Captured: 2026-03-24 | Source: mnemosyne scout reports (maiev, curie, medivh)

## Stack
- **Framework**: Next.js 15, React 19
- **Language**: TypeScript
- **ORM**: Drizzle ORM + Neon (PostgreSQL with pgvector)
- **Queue**: BullMQ declared as dependency but DB-backed pipeline queue used in practice
- **AI/ML**: TensorFlow.js (client-side COCO-SSD), OpenAI (embeddings), Gemini 2.5 Flash (classification + agent), Replicate/Grounding-DINO
- **Viz**: D3 (6 chart types)
- **UI**: shadcn/ui
- **Storage**: AWS S3
- **Package Manager**: pnpm (root), npm (worker)

## Module Boundaries (10)
1. Data layer (Drizzle/Neon) — 8 tables including pgvector
2. TypeScript ingest pipeline
3. Python ingest pipeline (dual implementation with TS)
4. BullMQ worker (Dockerfile: Node 20 + ffmpeg + Python scenedetect)
5. AI agent (OpenAI + Gemini)
6. Client-side TF.js detection
7. Taxonomy/display system
8. D3 visualizations (6 chart types)
9. Verification workflow
10. Export

## API Surface
- 20+ API routes: shots, verifications, media proxies, video upload, film ingestion, batch pipeline, AI agent
- 8 external integrations: AWS S3, OpenAI, Gemini, Replicate/Grounding-DINO, TMDB, Archive.org, Vercel Blob, TF.js/COCO-SSD
- SSE for ingest progress + agent chat
- No global state management — all local React state

## File Count
~392 files

## Known Issues
- MetroVision rebrand in progress (layout.tsx says MetroVision, package.json says scenedeck)
- review-splits page outside (site) route group
- Not a true monorepo despite pnpm-workspace.yaml
- Dual pipeline implementations (TS + Python) — unclear which is canonical
- Zero tests, no CI/CD, no test runner configured
- Dual package managers (pnpm root / npm worker)
- TF.js as runtime dep may cause bundle bloat
- AWS SDK version skew between root and worker
- shadcn in dependencies not devDependencies
- DB-backed queue used despite BullMQ/Redis deps being declared
