# RAG Chunking and Embedding Strategy for Hierarchical Film Metadata

## Finding

MetroVision's hierarchical data model (film > scene > shot) maps naturally onto a **parent-child chunking** strategy. The current implementation embeds a single flat `searchText` string per shot — concatenating film title, director, movement type, direction, speed, shot size, description, and mood — into a `vector(768)` column via `text-embedding-3-small`. This is a solid baseline, but it leaves significant retrieval quality on the table for two reasons: (1) there is no scene-level or film-level embedding that captures broader narrative context, and (2) the knowledge corpus (textbooks, research papers on cinematography) needs its own embedding strategy separate from shot embeddings.

For the long-form cinematography corpus, a **recursive character-split at 512 tokens with 10-20% overlap (roughly 51-102 token overlap)** is the safest, best-benchmarked approach. A February 2026 benchmark across 50 academic papers placed recursive 512-token splitting first at 69% accuracy, while semantic chunking — despite its intuitive appeal — only achieved 54% accuracy. The reason: semantic chunking produces very short fragments averaging 43 tokens that lose surrounding context. For cinematography textbooks and papers with dense technical terminology, 512-token fixed chunks reliably preserve sentence- and paragraph-level ideas together. Each corpus chunk should also be enriched with **Anthropic-style Contextual Retrieval**: before embedding, prepend a short LLM-generated context statement that situates the chunk within its source document (e.g., "This passage is from Chapter 4 of 'Grammar of the Film Language' discussing Dutch angle psychology"). Anthropic's published results show this reduces failed retrievals by 49% and, combined with reranking, by 67%.

For shot/scene/film structured metadata, the recommendation is **multi-granularity embeddings with parent-document retrieval**: maintain the existing shot-level `shot_embeddings` table for fine-grained retrieval, add a `scene_embeddings` table (scene title + description + aggregated shot summary), and optionally a `film_embeddings` table (overview + genre + director notes). During retrieval, search at the shot level for specific shot queries ("extreme close-up of eye before murder"), then expand upward to the parent scene context to provide richer LLM grounding. For broad directorial technique queries, search at the scene or film level first. Hierarchical chunking on structured documents shows +20-35% relevance gains over flat chunking in published benchmarks.

## Recommendation

Implement a three-layer retrieval architecture: (1) shot-level vector search using the existing `shot_embeddings` table with enriched `searchText` that includes scene context, (2) a new `corpus_chunks` table for cinematography knowledge at 512-token fixed splits with contextual enrichment, and (3) hybrid search via PostgreSQL `tsvector` BM25 + pgvector cosine similarity fused with Reciprocal Rank Fusion (RRF). Upgrade the embedding model from `text-embedding-3-small` to `voyage-3` or `text-embedding-3-large` for the knowledge corpus where retrieval quality matters most, while keeping `text-embedding-3-small` for high-volume shot embeddings where cost-efficiency is more important.

## Key Facts

- **Current state**: `shot_embeddings` table with `vector(768)`, `text-embedding-3-small` at 768 dims, flat concatenated `searchText` per shot. No corpus embeddings, no hybrid search.
- **Benchmark winner**: Recursive 512-token splitting at 69% accuracy vs. semantic chunking at 54% (Firecrawl/Vectara 2026 study across 50 academic papers).
- **Contextual Retrieval gain**: Anthropic reports 49% reduction in failed retrievals from prepending chunk context; 67% when combined with reranking.
- **Parent-child hierarchy gain**: +20-35% relevance on structured documents (technical docs 88%, scientific papers 82%) vs. flat chunking.
- **Hybrid search gain**: Pure vector search ~62% precision; adding BM25 full-text + RRF fusion raises it to ~84% precision (DEV Community production RAG benchmark).
- **Embedding model comparison**: `voyage-3-large` outperforms `text-embedding-3-large` by average 9.74% and `text-embedding-3-small` by a wider margin across 8 specialized domains in MTEB 2025. `voyage-3` (smaller) still outperforms `text-embedding-3-large` by 5.60%.
- **Token dimension note**: `text-embedding-3-small` at 768 dims (reduced from 1536) trades ~3% quality for 2x storage efficiency — acceptable for shot-level embeddings; corpus chunks benefit from the full 1536 dims or a better model.
- **Neon constraint**: Free tier at 0.5GB; 768-dim vector occupies 3KB per shot, so ~166K shots fit in 0.5GB for embeddings alone — sufficient for the seed corpus but worth monitoring.
- **BM25 in Postgres**: Available via `pg_bm25` (ParadeDB) or `pg_textsearch` extensions; PostgreSQL native `tsvector`/`ts_rank` is weaker but zero-dependency.
- **RRF formula**: `score = 1/(k + rank_vector) + 1/(k + rank_bm25)` where k=60 is standard; fetch 20 candidates from each source before fusion.
- **Two audience query patterns differ**: Academic researchers issue long natural-language technique queries ("how does Kubrick use one-point perspective for psychological pressure") — benefits most from corpus hybrid search + scene-level embeddings. AI filmmakers issue short specific queries ("dolly-in ECU knife hand") — benefits most from shot-level metadata filtering + vector similarity.

## Sources

- [Best Chunking Strategies for RAG in 2025 - Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)
- [Chunking Strategies for AI and RAG Applications - DataCamp](https://www.datacamp.com/blog/chunking-strategies)
- [Hierarchical Chunking: Preserving Document Structure - Ailog RAG](https://app.ailog.fr/en/blog/guides/hierarchical-chunking)
- [Parent-Child Chunking in LangChain for Advanced RAG - Medium](https://medium.com/@seahorse.technologies.sl/parent-child-chunking-in-langchain-for-advanced-rag-e7c37171995a)
- [Contextual Retrieval - Anthropic](https://www.anthropic.com/news/contextual-retrieval)
- [Hybrid Search in PostgreSQL: The Missing Manual - ParadeDB](https://www.paradedb.com/blog/hybrid-search-in-postgresql-the-missing-manual)
- [Building Hybrid Search for RAG: Combining pgvector and Full-Text Search with RRF - DEV Community](https://dev.to/lpossamai/building-hybrid-search-for-rag-combining-pgvector-and-full-text-search-with-reciprocal-rank-fusion-6nk)
- [Voyage-3-large benchmark results - Voyage AI Blog](https://blog.voyageai.com/2025/01/07/voyage-3-large/)
- [Optimizing RAG Indexing Strategy: Multi-Vector Indexing and Parent Document Retrieval - DEV Community](https://dev.to/jamesli/optimizing-rag-indexing-strategy-multi-vector-indexing-and-parent-document-retrieval-49hf)
- [RAG Chunking Strategies: The 2026 Benchmark Guide - Premai](https://blog.premai.io/rag-chunking-strategies-the-2026-benchmark-guide/)
- [Codebase: /Users/kennygeiler/Documents/Vibing Coding Projects 2026/SceneDeck/src/db/schema.ts]
- [Codebase: /Users/kennygeiler/Documents/Vibing Coding Projects 2026/SceneDeck/src/db/embeddings.ts]

## Confidence

0.82 — Multiple independent benchmarks (Firecrawl/Vectara, Premai, ParadeDB, Anthropic) converge on the same core recommendations: 512-token recursive splits beat semantic chunking, hybrid BM25+vector beats pure vector, contextual enrichment significantly reduces failures. The film/cinematography domain is structurally analogous to technical documentation and academic papers, where these strategies have been validated. Minor uncertainty remains around the optimal chunk size for dense cinematography prose (400-600 token range needs empirical tuning on the actual corpus) and whether `voyage-3` justifies its cost premium vs. `text-embedding-3-large` for this specific domain.
