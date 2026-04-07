# MetroVision / SceneDeck — audiovisual ingest pipeline whitepaper

**Document type:** Technical proof point — fidelity, I/O, and limits of the automated pipeline.  
**Product stance:** Shot-level metadata for **learning, exploration, and appreciation**; automatic “scenes” in the database are **not** claimed to match screenplay or director-intent scene structure. User-defined groupings (future / product-specific) represent the learner’s own units.  
**Companion:** [ingest-accuracy-hitl-strategy.md](./ingest-accuracy-hitl-strategy.md) — strategy, honest constraints, development roadmap.

**Version:** 1.0  
**Date:** 2026-04-07  
**Repository:** MetroVision (SceneDeck) monorepo

---

## 1. Executive summary

This system ingests a feature-length video and produces **one database row per detected shot** with:

- Timecodes, clip/thumbnail pointers (S3-backed URLs via app gateway where applicable),
- **Composition taxonomy** (framing, depth, blocking, lighting, shot size, angles, duration category, etc.),
- **Open-text semantics** (description, mood, subjects, scene-oriented *hints* from the model such as `scene_title`),
- Optional **text embedding** for search/RAG (768-d pgvector),
- Optional downstream **object tracks** (separate detection path).

The **primary analytic and export grain is the shot**. Automatic grouping into `scenes` rows exists for navigation and legacy schema shape; it is derived from model output and **must not** be read as authoritative film structure without explicit human or user-authored grouping.

---

## 2. System architecture (where code runs)

| Layer | Role | Key tech |
|-------|------|----------|
| **Next.js app** | UI, `POST /api/ingest-film`, `POST /api/ingest-film/stream`, export, verify, RAG | Node.js 15+ App Router, Drizzle, Neon serverless Postgres |
| **TS worker** | Long-running ingest with SSE (optional remote) | Express, shared `src/lib/ingest-pipeline.ts` |
| **Python pipeline** | Batch shot detect + classify + DB writes | PySceneDetect, Gemini, FFmpeg |
| **Storage** | Media objects | AWS S3 (pre-signed / app-proxied access patterns per deployment) |
| **Database** | Relational + vector | PostgreSQL (Neon), `pgvector` on `shot_embeddings` |

**Constraint:** Vercel serverless must not host heavy FFmpeg fan-out; ingest is designed for **worker**, **local dev**, or **batch** environments for full films.

---

## 3. Pipeline stages (ordered)

### Stage 0 — Inputs

| Input | Description | Required |
|-------|-------------|----------|
| Video file or URL | Local path (dev/worker) or resolved URL | Yes |
| Film metadata | Title, director, year | Yes (ingest API) |
| `detector` | `content` \| `adaptive` (default: adaptive in app paths) | Optional |
| `concurrency` | Parallelism for extract/classify/embed | Optional |
| Secrets | `GOOGLE_API_KEY`, S3 credentials, DB URL, OpenAI (embeddings) as configured | Yes for full pipeline |

**Outputs of ingest (logical):** `film` row, `scenes` rows (auto-generated convenience), many `shots` rows with `shot_metadata`, `shot_semantic`, optional `shot_embeddings`.

---

### Stage 1 — Shot boundary detection

**Implementation (Node / worker):** `detectShots()` in `src/lib/ingest-pipeline.ts`

- Invokes **PySceneDetect CLI** (`scenedetect`):
  - **Adaptive (default):** `detect-adaptive -t 3.0` (no fixed global downscale flag in CLI).
  - **Content:** `detect-content -t 27.0` with `-d 4` downscale on input.
- Parses CSV `list-scenes` output into `[{ start, end, index }, ...]` in seconds.
- **Fallback:** If no CSV data, **single segment** spanning **full duration** from `ffprobe` (avoids empty ingest).

**Implementation (Python batch):** `pipeline/shot_detect.py`

- Aligns **family** with Node: **AdaptiveDetector** `adaptive_threshold=3.0` (default env `METROVISION_SHOT_DETECTOR=adaptive`) or **ContentDetector** `threshold=27.0` with `SceneManager.downscale=4`, `auto_downscale=False`.
- **Fallback:** If no detected scenes, one segment for full duration.

**Fidelity notes:**

- Boundaries are **algorithmic**, not human editorial. Missed/extra cuts directly affect clip boundaries fed to the VLM.
- Genre, era, compression, and camera motion affect both detectors; no universal calibration.

---

### Stage 2 — Clip & thumbnail extraction

**Implementation:** `extractLocally` / `extractAndUpload` in `src/lib/ingest-pipeline.ts`

- **Clip:** `ffmpeg` stream copy from `start` to `end` (Node paths).
- **Thumbnail:** Single frame at temporal midpoint, **scaled to 320px** width (even height), JPEG.
- Keys constructed via `buildS3Key` / upload via app’s S3 helpers.

**Downstream classification clip (Gemini):** Separate short transcode for VLM: **max 10s**, **320px**, **libx264** `crf=32`, **12 fps**, **no audio** (`-an`).

**Fidelity notes:**

- Classification sees **at most 10 seconds** of a longer shot — very long takes are **partially observed** by the model.
- Heavy compression is intentional for API latency and payload size; detail loss affects fine judgments.

---

### Stage 3 — Multimodal classification (composition + semantics)

**Implementation:** `classifyShot` → Google **Generative Language API**, model id **`gemini-2.5-flash`** (as coded in `ingest-pipeline.ts`), **JSON response** schema enforced via prompt + `responseMimeType: application/json`, `temperature: 0.1`.

**Rate limiting:** Shared token bucket `acquireToken()` in `src/lib/rate-limiter.ts` (and mirrored usage in worker).

**Prompt (summary):** Asks for composition analysis tied to film title, director, year, optional cast list, and shot timecode range. Enumerates **allowed enum values** per taxonomy field (must stay aligned with `src/lib/taxonomy.ts` / `pipeline/taxonomy.py`).

**Outputs (JSON → `ClassifiedShot`):**

- **Taxonomy slugs:** `framing`, `depth`, `blocking`, `symmetry`, `dominant_lines`, `lighting_*`, `color_temperature`, `shot_size`, `angle_*`, `duration_cat`
- **Arrays:** `foreground_elements`, `background_elements`, `subjects`
- **Text:** `description`, `mood`, `lighting`
- **Scene hints (not screenplay truth):** `scene_title`, `scene_description`, `location`, `interior_exterior`, `time_of_day`

**Failure path:** Catches errors → `fallbackClassification()` (neutral defaults, `scene_title: "Unclassified"`) — **shots still written**; provenance should reflect fallback (see §7 roadmap).

**Fidelity notes:**

- VLM output is **not calibrated probability**; numeric `confidence` in DB may be partial depending on path (Python batch may set; TS path behavior should be documented per release).
- Temperature 0.1 reduces variance but does not eliminate it across API versions or prompt changes.

---

### Stage 4 — Automatic “scene” grouping (database convenience)

**Implementation:** `planContiguousScenesByNormalizedTitle()` in `src/lib/scene-grouping.ts`, used in ingest routes and worker.

- Walks shots **in timeline order**.
- Merges **adjacent** shots whose **normalized** `scene_title` keys match (Unicode NFKC, lowercased, punctuation stripped for comparison).
- **Non-adjacent** repetition of the same label → **new** `scenes` row (avoids merging distant locations with the same rough name).

**User-defined scenes:** Not part of this automatic pipeline; product roadmap may add **collections/decks** of shot IDs (see strategy doc).

**Fidelity notes:**

- Labels like `scene_title` are **free-text-ish** constrained only by prompt; grouping quality follows model consistency, not narrative ground truth.

---

### Stage 5 — Persist media + database writes

**Typical order (streaming ingest):**

1. Upsert **`films`** (+ TMDB enrichment when configured).
2. Insert **`scenes`** from Stage 4.
3. Upload clips/thumbs to **S3**, then insert **`shots`** with `sceneId` FK, `videoUrl` / `thumbnailUrl` (often app-relative S3 proxy paths).
4. Insert **`shot_metadata`** (`classification_source: "gemini"` in TS paths), **`shot_semantic`**.
5. **Embeddings:** `generateTextEmbedding` (OpenAI path used by app) on concatenated text (film, director, framing, description, mood, etc.) → **`shot_embeddings`** if successful.

**Schema reference:** `src/db/schema.ts` — tables `films`, `scenes`, `shots`, `shot_metadata`, `shot_semantic`, `shot_embeddings`, `verifications`, `shot_objects`, etc.

---

### Stage 6 — Human-in-the-loop (post-ingest, optional)

**Verification API:** `POST /api/verifications` — field ratings 0–5, optional **corrections** merged into `shot_metadata` / `shot_semantic` when low-rated fields exist; otherwise `reviewStatus` may be set to `human_verified`.

**Batch review:** `POST /api/batch/review` — approve or correct at scale.

**Purpose for learning product:** Optional deepening (e.g. verify favorite shots); **not** required for exploratory browse if copy and export disclaimers are clear.

---

## 4. Export surface (shot-first)

**Endpoint:** `GET /api/export` — `format=json|csv`, filters optional (`filmTitle`, `director`, `framing`, `shotSize`).

**Grain:** Export is built from **shots** (`getShotsForExport` in `src/db/queries.ts`); each row represents **one shot** with embedded film + metadata fields per implementation.

**Recommended export manifest (roadmap):** Ship alongside export: `pipeline_version`, `taxonomy_hash`, `gemini_model`, `detector_mode`, `generated_at`.

---

## 5. Taxonomy and synchronization

- **TypeScript:** `src/lib/taxonomy.ts`
- **Python:** `pipeline/taxonomy.py`
- **Check:** `pnpm check:taxonomy` (CI on change)

Slugs in exports and UI **must** match these enums; LLM prompts **must** be updated when taxonomy changes.

---

## 6. Fidelity summary (what to trust for what use)

| Claim | Safe for learning / exploration | Requires caution |
|-------|----------------------------------|------------------|
| Shot timecodes match automatic detector | Useful for navigation; not editor-approved cut list | Hard cuts vs dissolves; detector errors |
| Taxonomy slugs (framing, size, etc.) | Good for **patterns** and discussion | Per-shot mistakes; long-shot partial clip |
| `description`, `mood`, `subjects` | Excellent prompts for thinking | Factual claims about plot |
| Automatic `scenes` | Handy grouping only | Screenplay or “real” scene structure |
| Search / RAG over embeddings | Discovery | Stale if metadata corrected without re-embedding |

---

## 7. Known gaps vs. this document (honest backlog)

Items that improve **proof** but are not yet universally implemented in code:

1. **Explicit pipeline version / model id** stamped on every film or batch ingest row.
2. **Export manifest** file alongside CSV/JSON.
3. **Distinguishing fallback classification** in all paths (`classification_source` or flag).
4. **User-authored shot collections** in DB + export columns.
5. **Optional second-pass model** (e.g. Pro) only on flagged shots.

As these ship, bump **whitepaper version** and changelog at document footer.

---

## 8. References

- PySceneDetect: [https://www.scenedetect.com/docs/](https://www.scenedetect.com/docs/)
- Gemini API: [https://ai.google.dev/](https://ai.google.dev/)
- TransNet V2 (possible future ensemble): [arXiv:2008.04838](https://arxiv.org/abs/2008.04838)
- Internal: `AGENTS.md`, `.kiln/docs/architecture.md`, `.kiln/docs/arch-constraints.md`

---

*Whitepaper 1.0 — 2026-04-07. Maintainers: update when `ingest-pipeline.ts` model id, detector defaults, or export contract change materially.*
