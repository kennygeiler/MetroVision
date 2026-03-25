# Vision Priorities — For Downstream Planners

## Priority Ranking

### P1: Data + Training Infrastructure + Scale (Existential)

The dataset is 90-100% of the product value. Every other priority depends on this one. Without a rich, accurately classified film database, every product surface is hollow.

**What this means:**
- Training infrastructure capable of ingesting 5,000+ films
- Shot detection, cut point identification, camera movement classification at scale
- 85% accuracy baseline with HITL review for lower-confidence output
- 500 films classified before ANY product surface launches
- Pipeline automation and parallelization — this must run without constant human intervention
- PhD-researched classification techniques for accuracy at scale

**Why P1:** Scale compounds value. 500 films is useful. 5,000 is powerful. The training infrastructure is the moat. Everything else is a commodity interface on top of a unique dataset.

### P2: Visual-First User Interface (All Product Surfaces)

**What this means:**
- Web application: film → scene → shot browsing, semantic search, D3 visualizations, reference deck creation
- Chat interface: prompt-input, visual-output (not text-dominant)
- Beautiful, simple frontend that feels like a professional tool built by someone who loves cinema
- Metadata overlay on video playback as the hero visual moment
- Output formats: D3 charts, shotlists, storyboards, CSV, Excel, reference decks

**Why P2:** The UI is how users experience the dataset. A mediocre interface on a great dataset wastes the dataset's value. Visual-first output (not text) is the key differentiator.

### P3 (Tied): Intelligence Layer, Integrations, API, Chat, Model Training

**What this means:**
- RAG pipeline: film dataset + knowledge corpus (textbooks, research papers, critical analysis)
- Foundation model integration (Claude/ChatGPT) as reasoning engine
- API portal for programmatic access
- ComfyUI/node-based workflow nodes (primary integration target)
- Secondary integrations: Krea.ai, FLORA: Griptape Nodes, Higsfield AI / Cinema Studio 2.0
- MCP plugin (low priority)

**Why P3:** These amplify the dataset's value but do not create it. A great dataset with a basic API is more valuable than a sophisticated intelligence layer with a thin dataset.

## Non-Negotiables

1. **500 films classified before any product surface launches.** Hard gate. No exceptions. The dataset IS the product.
2. **85% accuracy baseline.** Classification must be trustworthy. HITL review covers the gap.
3. **Fixed camera movement taxonomy.** A dolly is always a dolly. Consistency across the entire dataset.
4. **Users are domain-knowledgeable.** No beginner hand-holding. The product assumes competence.
5. **Chat = visual output.** D3 charts, reference images, structured data. Not paragraphs of text.
6. **Zero manual coding by the operator.** Every line of code comes from AI agents.

## Quality Priorities (Where to Invest Extra Effort)

1. **Classification accuracy and HITL review pipeline** — the dataset's value is directly tied to accuracy. Bad metadata is worse than no metadata.
2. **Pipeline automation and scale** — manual steps that work for 10 films will break at 500. Automate early.
3. **D3 visualizations and visual output** — these are the product experience, not decorations. They must feel cinematic, not clinical.
4. **Web application browse/search UX** — the primary surface for the primary user (academics). Must be intuitive for domain experts.
5. **Video playback with metadata overlay** — the hero moment. Must feel precise and cinematic.

## What Can Be Deferred

- MCP plugin (API covers programmatic access)
- Secondary integrations beyond ComfyUI
- Pricing/access model decisions
- Comprehensive storyboard generation tooling
- Mobile optimization
- User accounts and authentication (for initial launch)

## Operator Preferences and Sensitivities

- **Art house cinema focus.** The seed dataset should feature iconic, visually distinctive filmmakers — Lynch, Safdie brothers, Wes Anderson, Kubrick.
- **"Not a bland dashboard."** Generic SaaS templates, academic UIs, and raw data displays are explicitly anti-goals. The interface should feel like it was built by a cinephile.
- **Process documentation matters.** The how-it-was-built story is part of the portfolio value. Document decisions and tradeoffs.
- **Pragmatic about unknowns.** The operator accepts TBD items and gives downstream agents latitude to recommend — with approval of tradeoffs.
- **Budget is flexible.** "Few hundred dollars per month" as general range. Quality over minimum cost, especially for dataset-building compute.
- **Scale ambition is real.** This is not a toy project. 5,000+ films is the target. Build infrastructure accordingly.
