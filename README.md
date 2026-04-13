# MetroVision

**A shot-level composition archive for cinematography research and tooling** — structured framing, depth, blocking, and related fields; human verification; exports you can cite; and optional **pgvector** search. **MetroVision** is the product name; **SceneDeck** is a common repo / codename.

[![CI](https://github.com/kennygeiler/MetroVision/actions/workflows/ci.yml/badge.svg)](https://github.com/kennygeiler/MetroVision/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-1d9bf0)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![pnpm](https://img.shields.io/badge/pnpm-workspace-f69220?logo=pnpm&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-Postgres-00e699)

**[AGENTS.md](AGENTS.md)** &nbsp;·&nbsp; **[Quick Start](#quick-start)** &nbsp;·&nbsp; **[Production ingest](docs/production-ingest.md)** &nbsp;·&nbsp; **[CI workflow](https://github.com/kennygeiler/MetroVision/actions/workflows/ci.yml)**

---

## What is MetroVision?

**MetroVision** is a full-stack system for **ingesting films**, **detecting shot boundaries**, **classifying composition** with a shared taxonomy (TS + Python), and **serving** browse, shot detail, visualization, export, and optional RAG. Heavy work runs on a **TypeScript worker** (Express + SSE) or the **Python pipeline** — not on short-lived serverless alone.

**If you can describe a shot, you can store it, verify it, and search it** — with provenance from model confidence through human verification.

### At a glance

| | |
| --- | --- |
| **Browse & search** | Filter by composition taxonomy and text; **semantic search** when `shot_embeddings` exists, else **ILIKE** (watch logs for `[searchShots]`). |
| **Shot & film detail** | Clip playback, **SVG overlay**, confidence, review status, verification history. |
| **Visualize** | D3 dashboards; landing demo links **composition scatter** (`/visualize#composition-scatter`). |
| **Export** | JSON / CSV plus on-page **citation / methodology** copy. |
| **Boundary tuning** | Gold cuts, presets, worker detect, eval runs, optional LLM insights — see `/tuning` and `eval/gold/README.md`. |
| **Quality gates** | CI: lint, taxonomy parity, schema drift, Vitest, eval smoke, production build, worker build smoke. |

> **Search tip:** run `pnpm db:embeddings` after ingest so pgvector-backed similarity is available.

---

## Installation

From the repository root (installs the app **and** the `worker` workspace package):

```bash
pnpm install
```

**Python pipeline** (separate venv):

```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## Quick Start

### Web application

```bash
cp .env.example .env.local
pnpm db:push          # Neon schema (requires DATABASE_URL)
pnpm db:seed          # optional dev seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### TypeScript ingest worker

Long-running ingest and SSE are intended for the worker, not Vercel timeouts alone:

```bash
cd worker && pnpm dev
```

Point the app at the worker with **`NEXT_PUBLIC_WORKER_URL`** (and server-side **`INGEST_WORKER_URL`** where applicable). See **[docs/production-ingest.md](docs/production-ingest.md)** for Railway / Docker / monorepo layout.

### Boundary eval (CLI parity)

```bash
pnpm eval:pipeline -- ...
pnpm detect:export-cuts -- ...
pnpm eval:export-film -- <filmId>
```

Details: **`AGENTS.md`**, **`eval/gold/README.md`**.

---

## How it works

1. **Source** — Video in **S3** (presigned URLs); metadata from **TMDB** when configured.
2. **Boundaries** — **PySceneDetect** / ensemble options (TS + Python parity via env and presets); optional **human gold** and **boundary presets** in Postgres.
3. **Classification** — **Gemini** (rate-limited) writes **`shot_metadata`** / **`shot_semantic`** under a shared taxonomy (**`src/lib/taxonomy.ts`** ↔ **`pipeline/taxonomy.py`**).
4. **Serve** — **Next.js 15 App Router** UI + API routes; optional **worker** for interactive ingest; **Python** for batch scale.
5. **Trust** — **Verifications**, exports with citation text, and checks like **`pnpm check:taxonomy`** / **`pnpm check:schema-drift`** to keep lanes aligned.

---

## Repository layout

| Path | Role |
| --- | --- |
| [`src/`](src/) | Next.js app: UI, API routes, shared lib, Drizzle schema entrypoints used by the app. |
| [`worker/`](worker/) | Express worker: SSE ingest, boundary detect; imports shared TS under `src/lib` / `src/db`. |
| [`pipeline/`](pipeline/) | Python CLI: PySceneDetect, Gemini, S3, DB writes. |
| [`eval/`](eval/) | Gold templates, fixtures, run notes — boundary quality workflows. |
| [`scripts/`](scripts/) | Tooling: taxonomy/schema checks, eval CLIs, migrations helpers. |
| [`docs/`](docs/) | Operational guides (e.g. production ingest). |
| [`AGENTS.md`](AGENTS.md) | Commands, constraints, and file map for contributors and automation. |

**Structural note (GEPA-inspired):** clear package boundaries, **explicit payloads** between Next / worker / pipeline, and **eval + docs** as first-class tree content — adapted for film ingest rather than prompt optimization. Mixed **TypeScript** (product + worker) and **Python** (batch media) share one **Postgres** contract.

---

## Architecture (high level)

```
                                    ┌─────────────────────────────────────┐
                                    │           Operators / Users           │
                                    └───────────────────┬─────────────────┘
                                                        │
                        ┌───────────────────────────────┼───────────────────────────────┐
                        │                               │                               │
                        v                               v                               v
              ┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
              │  Next.js 15 App │             │  TS Worker      │             │  Python         │
              │  (Vercel / Node)│             │  (Express SSE)  │             │  pipeline/      │
              │  App Router, UI │             │  Ingest, detect │             │  Batch ingest   │
              │  API routes, RAG│             │  Gemini, S3, DB │             │  PySceneDetect  │
              └────────┬────────┘             └────────┬────────┘             └────────┬────────┘
                       │                               │                               │
                       └───────────────┬───────────────┴───────────────────────────────┘
                                       v
                             ┌──────────────────┐
                             │   AWS S3         │
                             └────────┬─────────┘
                                       │
                       ┌───────────────┴───────────────┐
                       v                               v
             ┌─────────────────────┐       ┌─────────────────────┐
             │  Neon + Drizzle     │       │  Gemini, OpenAI,    │
             │  pgvector, shots    │       │  TMDB, Replicate    │
             └─────────────────────┘       └─────────────────────┘
```

**Two ingest lanes:** interactive (browser → Next or worker, SSE) vs batch (`pipeline/`).

---

## Stack & integrations

- **[Next.js](https://nextjs.org/)** — App Router, server components by default; client components for interactivity.
- **[Drizzle ORM](https://orm.drizzle.team/)** + **[Neon](https://neon.tech/)** — Postgres + pgvector.
- **[Tailwind CSS](https://tailwindcss.com/)** + **[shadcn/ui](https://ui.shadcn.com/)** — UI.
- **[AWS S3](https://aws.amazon.com/s3/)** — Media via presigned URLs.
- **[Gemini](https://ai.google.dev/)** / **[OpenAI](https://openai.com/)** — Classification and embeddings (as configured).
- **[PySceneDetect](https://www.scenedetect.com/)** — Shot boundaries in Python (and TS parity paths).
- **[D3](https://d3js.org/)** — Visualize dashboards.

---

## Environment variables

Use **`.env.local`** for the Next app and pipeline env for Python:

```bash
DATABASE_URL=                # Neon PostgreSQL
GOOGLE_API_KEY=              # Gemini
OPENAI_API_KEY=              # Embeddings / chat
TMDB_API_KEY=                # Film metadata
AWS_ACCESS_KEY_ID=           # S3
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=
NEXT_PUBLIC_WORKER_URL=      # Browser → worker origin (optional)
SCENEDETECT_PATH=            # Pipeline: scenedetect binary
```

Production hardening and optional secrets: **`AGENTS.md`** (e.g. `METROVISION_LLM_GATE_SECRET`, worker ingest secret).

---

## Quality gates

| Check | Command / location |
| --- | --- |
| Lint | `pnpm lint` |
| Taxonomy parity (TS ↔ Python) | `pnpm check:taxonomy` |
| Ingest schema drift | `pnpm check:schema-drift` |
| Tests | `pnpm test` |
| Production Next build | `pnpm test:build` (needs real `DATABASE_URL` for prerender) |
| Worker types | `pnpm check:worker` |
| Worker bundle smoke | `pnpm test:worker:build` |

CI runs **`.github/workflows/ci.yml`** on pushes and PRs to `main` / `master`.

---

## Screenshot & demo

`[Screenshot placeholder: landing / browse / shot overlay]`

**Live demo (placeholder):** `https://scenedeck-demo.vercel.app`

---

## User flows

### Researcher or curator

1. **Browse** → composition filters.  
2. **Shot** → overlay + provenance.  
3. **Visualize** → e.g. composition scatter.  
4. **Export** → data + citation blurb.

### Operator

1. Configure Neon, S3, keys, TMDB.  
2. Run **worker** for long ingest; use **Ingest** UI against worker URL.  
3. `pnpm db:embeddings` for semantic search.  
4. **Verify** / batch verify for quality.  
5. `pnpm check:schema-drift`, `pnpm check:taxonomy`, `pnpm test`.

### Integrator (API)

Use v1 routes with **`Authorization: Bearer <key>`**; see **`AGENTS.md`** for the API surface.

---

## Boundary tuning flow (operator)

Human verified cuts → **`/tuning/prep`** → worker **`POST /api/boundary-detect`** → **`POST /api/boundary-eval-runs`** → optional insights → publish preset → ingest with **`boundaryCutPresetId`**. CLI: **`pnpm eval:pipeline`**, **`pnpm detect:export-cuts`**, **`pnpm eval:export-film`**. Schema: **`pnpm db:push`** (incl. community preset columns, e.g. `drizzle/0010_boundary_presets_community.sql`).

---

## Notes

- AI-assisted development; designed as a **portfolio-grade** archive surface, not generic CRUD.  
- **`process-scene`** on Vercel is intentionally limited — use the **worker** or **pipeline** for film-scale jobs.
