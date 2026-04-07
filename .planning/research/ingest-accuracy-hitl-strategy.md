# Ingest accuracy, multimodal analysis, and HITL — research strategy

**Purpose:** Capture an accuracy-first plan for compositional metadata (shot boundaries → per-shot taxonomy → scene grouping → embeddings), plus **honest constraints** and **realistic outcomes** for MetroVision / SceneDeck. The product serves **multiple stances** (see below); this doc still applies wherever shot fidelity and provenance matter.

**Audience:** Contributors, future planners, educators, and anyone publishing or exporting data derived from the pipeline.

**Companion:** [Pipeline fidelity whitepaper](./pipeline-whitepaper.md) — steps, I/O, tech stack, and declared limits (proof-point document).

**Related code:** `src/lib/ingest-pipeline.ts`, `src/lib/scene-grouping.ts`, `src/app/api/ingest-film/**`, `src/app/api/verifications/**`, `pipeline/shot_detect.py`, `pipeline/classify.py`.

---

## 0. Product stance: learning, appreciation, and user-defined “scenes”

**Primary document outcome (2026 product direction):** MetroVision is not only a “paper-grade” research tool. It is a **learning and exploration** surface for students and film fans: **shot-level** compositional metadata, browse/visualize/export, and **insights** about a filmmaker or favorite film.

**Narrative scenes are not a pipeline truth claim:**

- Automatic `scenes` rows (derived from Gemini `scene_title` groupings) are **convenience clusters**, not screenplay-faithful scene boundaries.
- **User-defined groupings** (e.g. decks, study sets—product-dependent) represent *their* “scene” or sequence for essays, discussion, or comparison. The **canonical analytic grain remains the shot**.

**What this changes strategically:**

| Area | Paper-grade emphasis | Learning / appreciation emphasis |
|------|----------------------|--------------------------------|
| Auto `scenes` | High — must approximate narrative | Low — optional UX; do not over-claim |
| Shot boundaries | Maximally correct | Still important — bad splits confuse every label |
| Per-shot taxonomy + export | Audited, cited | Primary value; export **shots** by default |
| HITL | Mandatory tiers for publication | Optional “deep dive” — verify favorite shots or assignments |
| Marketing | Ground truth cautions | Honest “AI-assisted” + timecode-backed shots |

**Honest outcome:** A **shot-first atlas** with transparent pipeline docs ([whitepaper](./pipeline-whitepaper.md)); learners combine shots into meaningful groups **themselves**, without implying those groups match the film’s official scene structure.

---

## 1. Development steps — upgrade pipeline for this stance

Ordered for dependency and impact. Use as a backlog skeleton (not all phases mandatory for MVP).

### Phase A — Truth in labeling & exports

1. **Documentation & UI copy:** Surface in-app and in export headers that **scenes** = auto-derived convenience unless marked user-authored; emphasize **shot** as export grain (`/api/export` is already shot-centric).
2. **Pipeline provenance (schema + ingest):** Add optional fields or sidecar metadata: `detector_mode`, `gemini_model`, `pipeline_version`, `ingested_at` (film- or shot-level). Required for the whitepaper to stay honest as models change.
3. **Export manifest:** JSON/CSV preamble or companion file listing pipeline version, detector, model id, taxonomy version hash (from `pnpm check:taxonomy` source files).

### Phase B — Shot quality without paper overhead

4. **Split review integration:** Make split-adjustment flows easy for **power learners** and operators (existing `review-splits` path); optional re-classify after split merge/split.
5. **Triage flags on ingest:** Unify `review_status` / `needs_review` from Python and TS paths; surface “may need split check” for very long segments.
6. **Optional lighter model path:** Configurable Gemini model name via env for cost/latency on bulk vs “check this shot” deep pass.

### Phase C — User-authored groupings (product)

7. **Persistent user collections:** Schema + API for named lists of `shot_id` (decks / study sets). Auth story: session-only vs accounts (see `PROJECT.md` constraints).
8. **Export includes user groups:** When exporting, optional columns: `user_scene_id`, `user_scene_label` for selected groupings only.

### Phase D — Stronger automation (still shot-centric)

9. **Detector ensemble:** TransNet V2 + PySceneDetect + NMS + provenance per cut (from §2.1).
10. **Embeddings:** Optional image embedding per thumbnail for “similar shots” in visualize; keep separate from taxonomy truth.
11. **Dual-model adjudication:** Only on flagged shots — reduces wrong slugs without doubling cost everywhere.

### Phase E — Evaluation (if you ship curated teaching sets)

12. **Small gold set** (few films) with boundary/slot agreement metrics — optional if positioning stays “exploratory learning,” more important if partnering with institutions.

---

## 2. Strategic plan (stored)

### 2.1 Shot boundaries (weakness 1)

**Goal:** Maximize **recall** on cuts for research corpora; accept extra candidates over missed cuts. Trim with human split review.

| Layer | Tool / approach | Role |
|--------|-----------------|------|
| Baseline | PySceneDetect **content** (`-t 27`, `-d 4`) | Fast, CPU, crisp cuts |
| Baseline | PySceneDetect **adaptive** (`-t`; default in app) | Motion-heavy footage |
| Fade / dissolve adjunct | PySceneDetect **ThresholdDetector** (second pass) | Luminance ramps |
| Learned detector | [TransNet V2](https://arxiv.org/abs/2008.04838) ([implementation](https://github.com/soCzech/TransNetV2)) | Strong benchmark tradition; GPU |
| Policy | **Ensemble** + **temporal NMS** (merge duplicates within ~0.2–0.5 s) | Combine classical + learned |
| Provenance | Store cut `source` (e.g. `transnet`, `content`, `adaptive`, `human`) | Auditable exports |

**Note:** There is no universally adopted “TransNet V3” lineage in the same sense; roadmap should assume **TransNet V2 + classical + HITL** unless training a custom detector.

### 2.2 Compositional analysis (weakness 2)

**Goal:** Rich structured fields with **taxonomy enforcement**; reduce single-model variance.

- **Bulk tier:** Gemini 2.5 Flash–class (or equivalent) for throughput.
- **Adjudication tier:** Gemini 2.5 Pro (or best available reasoning multimodal) **only** on flagged shots (invalid JSON, low confidence, cross-model disagreement).
- **Second opinion (optional open weights):** e.g. Qwen2.5-VL class on disputes for auditability and debiasing vendor lock-in.
- **Specialist heads (later):** Embeddings (CLIP / SigLIP / video encoders) + shallow classifiers **trained on verified labels** for stable slug mapping—not a replacement for semantics, a complement for repeatability.

### 2.3 Narrative “scenes” (weakness 3)

**Goal:** Stop treating `scene_title` strings as screenplay truth. Current app behavior: **contiguous** shots + **normalized** title key (see `src/lib/scene-grouping.ts`).

**Future fusion (research track):**

- Visual change on keyframe embeddings (location continuity).
- Optional **audio:** speaker diarization (e.g. pyannote), silence statistics.
- Optional **text:** ASR alignment for dialogue boundaries (legal/licensing considerations for redistribution).

Multimodal scene segmentation remains an active research area; expect **integration cost** and **evaluation overhead**, not a drop-in API.

### 2.4 Reliability and confidence (weakness 4–5)

**Goal:** Automatic **triage** into HITL, not fake precision.

- Strict schema + taxonomy validation; retry on failure.
- **Self- consistency** (two samples) on **flagged** shots only when budget allows.
- **Cross-model disagreement** → `needs_review`.
- Align **Python** `review_status` / confidence thresholds with **TypeScript** ingest where applicable.

### 2.5 Embeddings and search (weakness 6)

**Goal:** Do not conflate “search vector” with “ground truth metadata.”

- Separate channels: **export columns** vs **searchText** / embedding for RAG.
- Optional parallel **image embedding** on thumbnails for visual similarity browse.

### 2.6 HITL operating model

**Existing capabilities:** Per-shot verification with field ratings and corrections (`src/app/api/verifications`), batch review, `reviewStatus` on metadata.

**Policy (recommended for research-grade exports):**

- Define **publishable** criteria (e.g. minimum fraction `human_verified` / `human_corrected` on required fields).
- **Active learning:** prioritize `needs_review`, long segments, boundary-adjacent shots, model disagreement.
- **External tooling (optional):** [Label Studio](https://labelstud.io) video timeline workflows for bulk import/export; measure **inter-annotator agreement** on a fixed evaluation set.

### 2.7 Phased roadmap (publication / research-tier)

| Phase | Focus |
|-------|--------|
| **0** | Policy: explicit “research export” gates tied to HITL state |
| **1** | TransNet + threshold pass + ensemble + provenance |
| **2** | Confidence, triage, dual-model adjudication on flagged shots only |
| **3** | Multimodal scene boundary fusion (visual ± audio ± transcript) |
| **4** | Specialist models trained on verified data; optional open-vocab detection for entities |

*For learning-first product priorities, prefer **§ Development steps** (Phases A–E) above; keep this table for institutions that still want publication-tier paths.*

---

## 3. Honest constraints (deeper)

### 3.1 Epistemic: you almost never have “ground truth”

- **Shot boundaries:** Even human editors disagree on whether a whip-pan is one shot or two; dissolves are gradual. “Correct” is **operationalized** (guidelines + adjudication), not absolute.
- **Composition labels:** Taxonomy slugs are **useful abstractions**, not physics. Different cinematographers and scholars use overlapping vocabulary; the model inherits that ambiguity.
- **Scenes:** Screenplay scenes, editing “sequences,” and **location-based** groupings are different ontologies. Mixing them without declaring definitions yields uninterpretable aggregates.

**Implication:** The honest product promise is **transparent, revisable labels with provenance**, not “the true shot size of frame 42,183.”

### 3.2 Technical ceilings

- **PySceneDetect** is fast and explainable but **not** SOTA on all transition types; adaptive vs content is a trade-off, not a solution.
- **TransNet V2** improves many benchmarks but still **errors** on hard transitions, compression artifacts, and domain shift (old film, animation, handheld).
- **VLMs** (Gemini, etc.) excel at **open-ended** description and reasonable **coarse** structure; they are **not** calibrated classifiers for your full taxonomy unless you build evaluation and calibration on top.
- **Long films:** Context limits and cost force **chunking** (per-shot clips, keyframes). Global narrative reasoning is **partial** unless you invest in hierarchy (shot → scene → act) with explicit stitching.

### 3.3 Operational and economic

- **Accuracy-first** implies **selective** use of heavy models: adjudicate **flags**, not every clip.
- **Rate limits** and **quota** are part of system architecture (already a project theme). Burst parallelism helps throughput, not correctness.
- **GPU** for TransNet (or similar) is a **real ops** choice: regions, drivers, batch queues, cold start.

### 3.4 Legal, ethical, access

- **Video sources:** Ingest may be research-use or licensed; redistribution of **clips**, **thumbnails**, and **transcripts** may have **different** rights than “metadata about a film.”
- **Subtitles / ASR:** Powerful for scene structure; legally sensitive for **re-sharing** derived datasets.
- **Bias:** Genre, era, skin tone, lighting, and language **shift** model behavior; a “universal” compositional model does not exist without **stratified evaluation**.

### 3.5 Evaluation is a project in itself

- Without **held-out human labels** and **clear metrics** (boundary F1, slot accuracy, calibration), improvements are **faith-based**.
- Academic SOTA papers may use datasets and metrics **not** aligned with your taxonomy—transfer claims require **your** benchmark.

---

## 4. Realistic outcomes for this project

### 4.1 What MetroVision / SceneDeck can credibly be

**A shot-first learning and exploration platform** (and, when needed, a **research aid**) that:

1. **Ingests** films with **documented** pipeline steps and **provenance** (detector, model, date) — see [whitepaper](./pipeline-whitepaper.md).
2. **Surfaces** compositional and semantic metadata in a **fixed taxonomy** for browse, visualize, **shot-level** export, and agent-assisted Q&A.
3. **Routes** uncertainty to **human verification** where policy requires it; optional for informal learning use.
4. **Improves over time** through **better detectors**, **adjudication**, and **specialist models** trained on **your** verified subset.

### 4.2 What it should not claim without evidence

- “**Cinematographic ground truth**” for every shot in every film.
- **Narrative scene structure** equivalent to screenplay breakdown without multimodal fusion and human audit.
- **Completeness** of subtle categories (e.g. compound movement, implicit blocking) without task-specific labeling.

### 4.3 Tiered product truth (recommended framing)

| Tier | Meaning | Suitable for |
|------|--------|--------------|
| **Exploratory** | Automated ingest, minimal review | Ideation, pilot viz, internal play |
| **Curated** | HITL on sampled or full film per policy | Conference talks, internal reports |
| **Publication-grade** | Written criteria + evaluated subsample + versioned pipeline | Papers, public datasets, citations |

Exports should carry **tier** and **pipeline version** where possible.

### 4.4 Realistic 6–12 month trajectory

**Achievable:**

- Stable **ensemble shot detection** with provenance and **split-review** workflow for gold films.
- **Systematic triage** (`needs_review`) aligned across TS and Python paths.
- **Dual-model adjudication** on a fraction of shots with measurable disagreement stats.
- A **small verified evaluation set** (e.g. 3–5 films, power-tested labels) to **track** boundary and slot accuracy.

**Challenging (possible but not automatic):**

- Reliable **scene** boundaries without audio/transcript or heavy VLM segmentation research.
- **Specialist heads** that beat a strong VLM **on your taxonomy** without thousands of verified labels.

**Unrealistic without major research investment:**

- One-click, fully automatic **publication-grade** metadata for arbitrary canon **with zero** human review.
- Universal **SOTA** across all genres, eras, and video quality without domain adaptation.

### 4.5 Definition of success (pragmatic)

**Success** is not “100% correct models.” Success is:

- **Measured** error on a defined benchmark subset,
- **Monotonic improvement** across pipeline versions,
- **Clear communication** to users about tier and limits,
- **Exports** that do not overstate certainty.

**Failure mode to avoid:** Marketing or exporting **unreviewed** model output as scholarly fact—undermines trust and reproducibility.

---

## 5. References (non-exhaustive)

- TransNet V2: [arXiv:2008.04838](https://arxiv.org/abs/2008.04838)
- PySceneDetect: [scenedetect.com](https://www.scenedetect.com/docs/)
- Video scene parsing survey landscape: e.g. [arXiv:2506.13552](https://arxiv.org/html/2506.13552v1) (broad survey context; validate claims against your task)
- Long-video understanding discussion: e.g. LVBench [arXiv:2406.08035](https://arxiv.org/html/2406.08035v3) (illustrates human vs model gaps)

---

*Document version: 1.1 — 2026-04-07 (learning product stance + dev steps)*

*See also: [pipeline-whitepaper.md](./pipeline-whitepaper.md)*
