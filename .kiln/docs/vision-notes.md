# Vision Notes — Brainstorm Session Summary

## Session Details

- **Date:** 2026-03-24
- **Depth:** Standard (idea floor: 30, progressive flow)
- **Ideas generated:** 41
- **Techniques used:** 5 (Framing, Diverge, Reframe, Converge, Stress-test)
- **Facilitator:** da-vinci

## Themes That Emerged

1. **The dataset IS the product.** The single most important insight from this session. The operator articulated that the film database represents 90-100% of the product value. Every product surface — web app, chat, API, integrations — is just a lens on the dataset. This completely reordered priorities: training infrastructure and scale come before any user-facing surface.

2. **Three-part architecture.** The platform cleanly separates into (1) training infrastructure for ingestion and classification at scale, (2) an intelligence layer using RAG-augmented foundation models, and (3) product surfaces. Each part has distinct timelines, risks, and success criteria. This separation prevents the common trap of building UI before the data foundation is solid.

3. **Informed users, not beginners.** The operator made a decisive call: SceneDeck is for people who already know what a dolly is, what coverage means, what pacing implies. This narrows the audience but dramatically sharpens the product. No onboarding tutorials, no "what kind of movie do you want to make" wizards.

4. **Visual output, not text output.** The chat interface was reframed from "chatbot" to "prompt-input, visual-output." The operator wants D3 charts, reference images, structured shotlists, and storyboards — not paragraphs of text. This is the key differentiator from generic ChatGPT wrappers.

5. **Scale compounds value.** Unlike most products where features drive value, SceneDeck's value grows with every film classified. 500 films is useful. 5,000 films is powerful. 50,000 films would be unprecedented. The training infrastructure must be built for scale from day one.

## Key Pivots During Session

- **From portfolio piece to platform:** The original VISION.md framed SceneDeck as a 50-100 shot portfolio demo deployable in 1-2 weeks. This session reframed it as a genuine platform with 5,000+ film ambitions and a 500-film launch gate.
- **From "anyone" to "experts":** User persona shifted from broad accessibility to domain-knowledgeable users. This simplified UX decisions and raised the quality bar for output.
- **From text-first to visual-first:** Chat output reframed from conversational text to structured visual data.

## Decisions Made During Session

1. 500 films classified before any product surface launches publicly
2. 85% accuracy baseline with HITL review for lower-confidence output
3. RAG-augmented foundation models (NOT custom-trained)
4. Priority ranking: P1 data/training/scale, P2 visual-first UI, P3 intelligence + integrations
5. ComfyUI as primary integration target
6. Users must have domain knowledge — no beginner onboarding
7. Chat = prompt input, visual output (not text-dominant)
8. Knowledge corpus includes textbooks, research papers, critical analysis

## Tensions and Trade-offs

- **Scale ambition vs. solo operator:** 5,000+ films is massive for a solo developer with AI agents. The training infrastructure must be highly automated to be feasible.
- **Quality gate vs. momentum:** The 500-film minimum before launch means a long period of invisible infrastructure work before any public-facing progress. The operator accepted this trade-off because dataset quality is existential.
- **RAG vs. fine-tuning:** The operator chose RAG over custom model training. This is faster and cheaper but means the intelligence layer is bounded by corpus quality and retrieval accuracy.
- **Integration breadth vs. depth:** Four integration targets (ComfyUI, Krea.ai, FLORA, Higsfield) risk spreading effort thin. Mitigated by API-first design and ComfyUI prioritization.

## Existing Infrastructure Leveraged

The session built on significant existing work (Part 1 already built):
- Next.js 15 + React 19 + TypeScript frontend
- Drizzle ORM + Neon Postgres + pgvector database
- Dual pipeline (TS + Python) for shot detection
- Gemini 2.5 Flash classification
- S3 media storage, D3 visualizations, OpenAI embeddings
- TMDB integration, Replicate/Grounding-DINO, verification workflow

This existing infrastructure de-risks the training pipeline significantly — the question is scale, not feasibility.
