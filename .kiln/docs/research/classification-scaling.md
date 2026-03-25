# Classification Scaling: Gemini 2.5 Flash at 50,000-150,000 Shots

## Finding

The current Python pipeline in `pipeline/classify.py` processes shots serially — one Gemini API call at a time, with upload, wait-for-processing, generate, delete all synchronous. The TS worker in `worker/src/ingest.ts` is more advanced: it has a `processInParallel` helper that runs classification at up to 15 concurrent workers (hardcoded as `Math.min(concurrency * 3, 15)`), using inline base64 video. Neither pipeline has any rate-limiting logic, retry backoff beyond 3 attempts, or a persistent job queue. At the 5,000+ film scale (estimated 50,000-150,000 shots), this becomes a critical bottleneck.

**Rate Limit Reality (Gemini 2.5 Flash):** Free tier: 10 RPM, 250 RPD — completely unusable at scale. Paid Tier 1 (billing enabled, no spend threshold): 150-300 RPM, 1,500 RPD, 1M TPM. Paid Tier 2 ($250 cumulative spend + 30 days): 500-1,500 RPM, 2M TPM, 10,000 RPD. At Tier 1 with 150 RPM and 1,500 RPD, processing 150,000 shots at ~1 call/shot takes approximately 100 days at the daily cap — clearly requiring either the Gemini Batch API or a multi-project strategy.

**The Batch API is the correct path for bulk ingestion at this scale.** Announced in July 2025, the Gemini Batch API accepts JSONL files up to 2GB (up to 200,000 requests per job), processes asynchronously within 24 hours, and costs 50% less than synchronous API calls. For MetroVision's use case — ingesting entire film catalogues overnight — latency is not critical. A single batch job per film (or per batch of films) eliminates the need for complex rate-limiting logic and sidesteps all RPM/RPD quotas. The Batch API has higher throughput limits than real-time, and the 50% cost reduction compounds significantly at 150,000 shots.

**For real-time/interactive classification** (single film ingestion on demand), the recommended architecture is Python asyncio with a semaphore-bounded pool. At Tier 1 (150 RPM), a semaphore of 140 concurrent requests with a token-bucket refill (2.33 tokens/sec) keeps the pipeline safely under the cap. The `processInParallel` pattern in the TS worker is architecturally correct but has two problems: no rate limiting and a hardcoded concurrency ceiling of 15 that is not tuned to actual API tier limits. For Tier 1, 15 concurrent inline calls will intermittently trigger 429s; for Tier 2, it can be raised to 80-100.

**Shot-level batching within a request** is not supported by the Gemini API — each video must be a separate request. However, the File API approach (upload once, reference by URI) is more reliable than inline base64 for clips over ~5MB. Files persist for 48 hours, enabling retry without re-upload. The TS worker uses inline base64 with `libx264 ultrafast + scale=320` re-encoding; the Python pipeline uploads the full clip. The TS worker's approach (re-encoded small clip) is better for throughput since Gemini processing time scales with file size.

## Recommendation

For bulk catalogue ingestion (the 5,000-film goal), adopt the Gemini Batch API as the primary path: build a job that collects all pending shots into a JSONL manifest, submits a batch job, polls for completion, and writes results to Postgres. For interactive single-film ingestion, keep the streaming SSE pipeline but add a token-bucket rate limiter in the Python asyncio layer capped at 130 RPM (leaving 15% headroom at Tier 1), with concurrency bounded by `asyncio.Semaphore(50)`.

## Key Facts

- Gemini 2.5 Flash Tier 1 (billing enabled, no spend requirement): 150-300 RPM, 1,500 RPD, 1M TPM
- Gemini 2.5 Flash Tier 2 ($250 cumulative spend + 30 days): 500-1,500 RPM, 2M TPM, 10,000 RPD
- Free tier: 10 RPM, 250 RPD — unusable for 50,000+ shots
- Gemini Batch API: up to 200,000 requests/job, up to 2GB JSONL input, 24h turnaround, 50% cost reduction vs real-time
- Batch API was announced July 2025; as of March 2026 it is production-available
- At Tier 1 RPD of 1,500: serial processing of 150,000 shots takes ~100 days; batch API eliminates this constraint
- File API: video files stored 48h, project storage limit 20GB; uploads are temporary
- TS worker's `processInParallel` runs up to 15 concurrent Gemini calls; Python pipeline runs 1 at a time
- PySceneDetect single-video processing is not parallelizable (GIL limitations); parallel multi-film processing must be done at the orchestration level (multiple processes/workers per film)
- Inline base64 clips (TS worker approach: 320px, ultrafast, 10fps, capped at 10s) are preferable to full-clip uploads for throughput; File API is preferable to base64 for clips > ~5MB
- asyncio.Semaphore + token bucket is the canonical pattern for rate-limited Gemini concurrency in Python

## Sources

- [Rate limits | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Batch API | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/batch-api)
- [Batch Mode in the Gemini API: Process more for less — Google Developers Blog](https://developers.googleblog.com/scale-your-ai-workloads-batch-mode-gemini-api/)
- [Gemini Parallel batch processing using asyncio semaphores — Medium](https://medium.com/@pratap-ram/gemini-parallel-batch-processing-using-asyncio-semaphores-237b79095a7f)
- [Supercharging Gemini API Calls with Concurrency and a Custom Rate Limiter — Medium](https://subhranil2605.medium.com/supercharging-gemini-api-calls-with-concurrency-and-a-custom-rate-limiter-2b021a85a3a2)
- [Gemini API Rate Limits 2026: Complete Developer Guide — LaoZhang AI](https://blog.laozhang.ai/en/posts/gemini-api-rate-limits-guide)
- [AI Batch Processing: OpenAI, Claude, and Gemini (2025) — Medium](https://adhavpavan.medium.com/ai-batch-processing-openai-claude-and-gemini-2025-94107c024a10)
- [Codebase: /Users/kennygeiler/Documents/Vibing Coding Projects 2026/SceneDeck/pipeline/classify.py]
- [Codebase: /Users/kennygeiler/Documents/Vibing Coding Projects 2026/SceneDeck/worker/src/ingest.ts]

## Confidence

0.85 — Rate limit numbers are confirmed across multiple independent sources; Batch API existence and 50% discount are confirmed by official Google Developers Blog and API docs. Primary uncertainty is whether video content can be submitted via Batch API as File API references (vs inline), which is documented for text/image but less explicitly for video; this requires a prototype test.
