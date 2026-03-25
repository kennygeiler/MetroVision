# VISION

## 1. Problem Statement

There is no centralized, searchable database of film scenes tagged with structured camera motion metadata at scale. Existing tools like ShotDeck analyze cinema through still frames, missing the essence of filmmaking — how the camera moves. Film researchers lack quantifiable data to analyze directorial style and coverage patterns across filmographies. AI filmmakers cannot accurately describe camera movements to generation tools (Runway, Kling, Gemini) and have no structured reference library to draw from.

SceneDeck is a three-part platform: (1) a training infrastructure that ingests thousands of films and classifies shots with camera movement metadata at scale, (2) an intelligence layer that augments foundation models with deep cinematographic knowledge via RAG, and (3) product surfaces that serve academics, AI filmmakers, and integrations.

**Who:** Film researchers and academics who need scientific-scale analysis of directorial technique. AI filmmakers who need camera motion references for pre-production (shotlists, storyboards) and post-production (comparative analysis, coverage gaps). Informed users with domain knowledge — they ask specific, directorial questions.

**Why now:** AI video generation tools have matured to the point where camera motion is a controllable parameter, but users have no structured reference library. Computer vision models capable of extracting camera motion from video now exist. The infrastructure to build this at scale didn't exist two years ago. The dataset compounds in value — every film classified makes the next query more powerful.

## 2. Target Users

**Primary User: Film Researchers and Academics**
- Job-to-be-done: Analyze directorial style, coverage patterns, and edit rhythms using quantifiable camera metadata at scientific scale
- Want to compare directors (e.g., "How does Wes Anderson use pans for pacing"), deconstruct iconic scenes shot-by-shot, and study coverage patterns across filmographies
- Browse film → scene → shot hierarchy. Create reference decks. Data visualizations + text output
- Need data export (API, CSV, JSON, Excel) to take metadata into their own tools
- Use case: Film school professor breaking down the Bullitt car chase — showing coverage patterns, shot type frequency, edit rhythm as a time series
- SceneDeck replaces weeks of manual frame-by-frame analysis with instant, searchable, structured data across thousands of films

**Secondary User: AI Filmmakers (Pre-Production)**
- Job-to-be-done: Create shotlists and storyboards by referencing or adapting real cinema from the database
- "Create a shotlist like the car chase from Bullitt" — generate structured output that plugs directly into production tools
- Integration targets: ComfyUI, Krea.ai, FLORA: Griptape Nodes, Higsfield AI / Cinema Studio 2.0
- Workflow integration matters — SceneDeck as a node in ComfyUI or accessible via API/MCP within their existing creative pipeline

**Secondary User: AI Filmmakers (Post-Production)**
- Job-to-be-done: Comparative analysis of created films against the database
- "How similar is this to David Lynch pacing?" — coverage/gap analysis on shotlists, suggest missing shots
- Analyze their own work through the lens of cinematic history

**User Profile:**
- Informed users with domain knowledge — they ask specific, directorial questions
- NOT for beginners who say "help me make a thriller"
- They know what a dolly is, what coverage means, what pacing implies

**Contribution model:** Any user can contribute — verifying AI accuracy, submitting scenes for analysis. This is not a separate user type but a natural extension of use, similar to donating to open source.

## 3. Goals

1. Build a training infrastructure capable of ingesting 5,000+ films, detecting cut points, and tagging shots with structured camera movement metadata (pacing, coverage, cinematographer perspective)
2. Achieve 85% classification accuracy baseline with HITL (human-in-the-loop) review for lower-confidence output — PhD-researched techniques for fast, accurate classification at scale
3. Classify a minimum of 500 films before any product surface launches publicly — the dataset is 90-100% of the product value
4. Build an intelligence layer using augmented foundation models (Claude/ChatGPT) with RAG from the film dataset + knowledge corpus (textbooks, articles, research papers, critical analysis on cinematography)
5. Ship a web application (primary surface for academics) with beautiful, simple frontend — film → scene → shot browsing, search, data visualizations, reference deck creation
6. Ship a chat interface (prompt-input, visual-output) with data visualization and structured output capabilities
7. Ship an API portal for programmatic access to the dataset
8. Build ComfyUI/node-based workflow nodes for integration into AI filmmaking pipelines
9. Deliver rich output formats: D3 data visualizations, shotlists, storyboards, CSV, Excel, reference decks, rich text
10. Implement a fixed, hardcoded camera movement taxonomy that produces consistent classification across all shots
11. Build the entire project exclusively through AI-assisted development — prompting, work relays, and human oversight tasks only
12. Document the planning, decision-making, and execution process as a demonstration of director-level PM using agentic AI workflows

## 4. Constraints

**Technical:**
- Entire project must be buildable through prompting AI coding agents (Claude, Cursor) — zero manual coding by the operator
- Camera motion analysis requires cloud-hosted GPU service (Replicate, Modal, RunPod, or equivalent)
- Classification accuracy must reach 85% baseline before public launch
- 500+ films must be classified before any product surface goes live
- Shot length should be as long as the analysis engine can handle accurately — accuracy is the constraint, not length or cost
- Intelligence layer is RAG-augmented foundation models, NOT custom-trained models

**Data Quality Gates:**
- No public product surface until dataset quality thresholds are met
- HITL review pipeline for lower-confidence classifications
- Dataset quality compounds — every film classified makes the platform more valuable

**Time:**
- Training infrastructure and classification pipeline are the long pole — prioritize accordingly
- Frontend experience is the priority for product surfaces if time runs short

**Budget:**
- Willing to invest what it takes for quality — few hundred dollars per month as general range, not a hard cap
- Scale compute costs are acceptable given dataset is 90-100% of product value

**Team:**
- Solo developer (operator) with AI agent assistance
- No design team — UI must be achievable through AI-generated code with operator direction

**Content:**
- Educational project — licensing is not a primary concern
- Knowledge corpus includes textbooks, articles, research papers, critical analysis on cinematography

## 5. Non-Goals

1. Custom model training — the intelligence layer uses RAG-augmented foundation models, not fine-tuned or custom-trained models. Rationale: RAG with a rich knowledge corpus achieves the needed depth without the cost and complexity of training.
2. Beginner-friendly onboarding — users are expected to have domain knowledge. No "help me make a thriller" hand-holding. Rationale: the product is more powerful when it assumes competence.
3. AI video generation — SceneDeck is a reference, analysis, and planning tool, not a generation tool. Rationale: generation tools already exist; the gap is structured reference data.
4. Launching product surfaces before 500 films are classified — no early access, no beta with thin data. Rationale: the dataset IS the product; a thin dataset undermines every surface.
5. Manual coding by the operator — if it cannot be built by prompting AI agents, it is out of scope. Rationale: the build process is part of the portfolio demonstration.
6. MCP plugin as a launch priority — low priority, for AI agent tools to query dataset. Rationale: useful but not critical path; API covers programmatic access.

## 6. Tech Stack

**Existing Infrastructure (Part 1 — already built):**
- Next.js 15 + React 19 + TypeScript (frontend + API)
- Drizzle ORM + Neon Postgres + pgvector (database + vector search)
- Dual pipeline: TypeScript + Python for shot detection
- Gemini 2.5 Flash for classification
- AWS S3 for media storage
- D3 data visualizations (6 chart types already implemented)
- OpenAI embeddings for semantic search
- Replicate / Grounding-DINO for object detection
- TMDB integration for film metadata
- Existing verification/HITL workflow

**Intelligence Layer (to build):**
- RAG pipeline over film dataset + knowledge corpus
- Foundation model integration (Claude and/or ChatGPT) as the reasoning engine
- Knowledge corpus: textbooks, articles, research papers, critical analysis on cinematography
- pgvector for embedding storage and retrieval

**Product Surfaces (to build):**
- Web application: primary surface, academic-focused, beautiful and simple
- Chat interface: prompt-input, visual-output (ChatGPT-like with data/visual edge)
- API portal: programmatic access
- ComfyUI / node-based workflow nodes (agnostic but especially good for node tools)
- MCP plugin (low priority)

**Integration Targets:**
- ComfyUI
- Krea.ai
- FLORA: Griptape Nodes
- Higsfield AI / Cinema Studio 2.0

## 7. Success Criteria

- SC-01: Training infrastructure can ingest and classify films at scale — target 5,000+ films capacity
- SC-02: 500+ films classified with structured camera movement metadata before any product surface launches
- SC-03: 85% classification accuracy baseline with HITL review pipeline for lower-confidence output
- SC-04: Web application with film → scene → shot browsing, semantic search, and data visualizations deployed at a live URL
- SC-05: Chat interface accepts prompt input and returns visual/data output (not just text)
- SC-06: API portal functional for programmatic dataset access
- SC-07: Intelligence layer returns informed, contextual responses augmented by film dataset + knowledge corpus via RAG
- SC-08: Data export works in multiple formats: D3 visualizations, CSV, Excel, shotlists, storyboards, reference decks
- SC-09: Human QA / HITL verification system functional for reviewing lower-confidence classifications
- SC-10: Fixed camera movement taxonomy produces consistent classification — a dolly is always a dolly
- SC-11: Zero lines of code written manually by the operator
- SC-12: At least one ComfyUI/node integration demonstrated

## 8. Risks & Unknowns

- R-01: Classification accuracy at scale (HIGH likelihood / HIGH impact) — 85% baseline is ambitious across 5,000+ films with diverse cinematographic styles. Mitigated by HITL review pipeline for lower-confidence output, PhD-researched classification techniques, and iterative accuracy improvement as dataset grows.
- R-02: Dataset scale timeline (HIGH / HIGH) — 500 films minimum before launch is a significant data collection and processing effort. Mitigated by investing in pipeline automation and parallelization early.
- R-03: Knowledge corpus quality for RAG (MEDIUM / HIGH) — the intelligence layer is only as good as its knowledge corpus. Mitigated by curating high-quality sources: textbooks, peer-reviewed research, established critical analysis.
- R-04: Integration complexity with external tools (MEDIUM / MEDIUM) — ComfyUI, Krea.ai, FLORA, Higsfield each have different integration patterns. Mitigated by API-first design and prioritizing ComfyUI (most established node ecosystem).
- R-05: Vibe coding hits a wall on ML infrastructure (MEDIUM / HIGH) — complex pipeline work may exceed what AI agents can reliably produce. Mitigated by managed services and existing dual-pipeline architecture.
- R-06: Chat interface differentiation (LOW / MEDIUM) — risk of feeling like "just another ChatGPT wrapper." Mitigated by visual-first output (D3 charts, reference images, structured data) rather than text-dominant responses.

## 9. Open Questions

**OQ-1**: How do we scale classification from current capacity to 5,000+ films? What parallelization, batching, and pipeline optimizations are needed? | Priority: high | Timing: before-build | Context: The training infrastructure is the foundation — everything else depends on dataset scale.

**OQ-2**: What is the optimal knowledge corpus for the RAG layer? Which textbooks, research papers, and critical analysis sources provide the deepest cinematographic knowledge? | Priority: high | Timing: before-build | Context: The intelligence layer's value is directly tied to corpus quality. Poor sources mean shallow responses.

**OQ-3**: What is the right chunking and embedding strategy for film metadata + knowledge corpus in RAG? | Priority: high | Timing: before-build | Context: Film data is hierarchical (film → scene → shot) and the knowledge corpus is long-form text — standard RAG chunking may not work well.

**OQ-4**: How should the chat interface handle visual output? What rendering pipeline turns RAG results into D3 visualizations, reference decks, and structured shotlists in real-time? | Priority: high | Timing: during-build | Context: Chat = prompt input, visual output. This is the differentiator from generic chatbots.

**OQ-5**: What is the integration API contract for ComfyUI nodes? What data formats and interaction patterns does the ComfyUI ecosystem expect? | Priority: medium | Timing: during-build | Context: ComfyUI is the primary integration target. Getting the node interface right determines adoption.

**OQ-6**: How do we measure and improve classification accuracy over time? What feedback loops exist between HITL review and model improvement? | Priority: medium | Timing: during-build | Context: 85% is the baseline, not the ceiling. The system should get smarter as more films are reviewed.

**OQ-7**: What is the right pricing/access model if this moves beyond educational use? | Priority: low | Timing: post-launch | Context: The dataset has significant commercial value. Access model decisions affect community contribution dynamics.

**OQ-8**: How should the storyboard output format work for AI filmmaker workflows? | Priority: medium | Timing: during-build | Context: Storyboards are a key output format but the structure needs to map to what AI generation tools actually consume.

## 10. Key Decisions

- KD-01: Three-part platform architecture — training infrastructure, intelligence layer, product surfaces. Each part has distinct priorities and timelines.
- KD-02: Dataset is 90-100% of product value — all prioritization flows from this. Training infrastructure and scale come first.
- KD-03: 500 films minimum before any product surface launches. No early access with thin data.
- KD-04: RAG-augmented foundation models, NOT custom-trained. Claude/ChatGPT + knowledge corpus + film dataset.
- KD-05: Users are domain-knowledgeable. Product assumes competence — no beginner hand-holding.
- KD-06: Fixed hardcoded camera movement taxonomy. A dolly is always a dolly.
- KD-07: 85% accuracy baseline with HITL review for lower-confidence output.
- KD-08: Chat = prompt input, visual output. Not text-dominant — D3, reference images, structured data.
- KD-09: Web app is primary surface for academics. Chat is secondary. API enables integrations.
- KD-10: ComfyUI is the primary integration target. Krea.ai, FLORA, Higsfield are secondary.
- KD-11: Shot is the atomic unit. Film → scene → shot hierarchy.
- KD-12: Entire project built through AI agent prompting only — zero manual coding.
- KD-13: Frontend quality over pipeline completeness if time runs short.

## 11. Elicitation Log

**Session type:** Standard depth (idea floor: 30, progressive flow)
**Ideas generated:** 41 (floor exceeded)
**Techniques used:** 5 (Framing, Diverge, Reframe, Converge, Stress-test)

**Key outputs by technique:**
- **Framing:** Established the three-part platform architecture. Separated training infrastructure from intelligence layer from product surfaces. Identified that the dataset IS the product (90-100% of value).
- **Diverge:** Explored use cases across academic research, AI filmmaking pre-production, AI filmmaking post-production. Generated integration targets (ComfyUI, Krea.ai, FLORA, Higsfield). Explored output formats (D3, shotlists, storyboards, CSV, Excel, reference decks).
- **Reframe:** Shifted from "portfolio demo" to "platform with real product ambitions." Reframed user persona from "anyone interested in film" to "informed users with domain knowledge." Reframed chat from "text chatbot" to "prompt-input, visual-output."
- **Converge:** Priority ranking crystallized — P1: data + training + scale, P2: visual-first UI, P3: intelligence layer + integrations. 500-film minimum before launch. 85% accuracy baseline.
- **Stress-test:** Tested "what if accuracy plateaus below 85%" — HITL review pipeline. Tested "what if dataset is too thin at launch" — hard gate, no launch until 500 films. Tested "what if chat feels like a wrapper" — visual-first output differentiation.

## 12. Visual Direction (Light)

**Mood:** Technical precision meets cinematic elegance. Dense with information but organized with clarity. The interface should feel like a professional tool built by someone who loves cinema.

**Visual references:** Object detection annotation UIs (elevated), ShotDeck, CamCloneMaster, Spotify (for browse/hierarchy UX)

**Hero visual moment:** Metadata overlay on video playback — camera motion data rendered on top of the moving image. This is the single most memorable visual element.

**Output aesthetics:** D3 visualizations should feel cinematic, not clinical. Charts are part of the product experience, not afterthoughts.

**Anti-goals:** Not a bland dashboard. Not a generic SaaS template. Not academic or raw. Not a ChatGPT clone with a film skin.
