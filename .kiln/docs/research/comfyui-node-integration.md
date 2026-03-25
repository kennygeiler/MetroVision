# ComfyUI Node Integration — API Contract, Data Format, and Node Registration

## Finding

ComfyUI custom nodes are Python classes following a well-defined but evolving contract. The legacy V1 pattern (still dominant in most published nodes) requires four class-level attributes: `INPUT_TYPES` (classmethod returning a dict of required/optional inputs), `RETURN_TYPES` (tuple of type strings), `FUNCTION` (name of the execution method), and `CATEGORY` (menu placement string). Nodes are registered by populating the module-level `NODE_CLASS_MAPPINGS` dict and exported via `__init__.py`. This pattern is battle-tested but lacks typing guarantees and makes process isolation impossible.

The V3 schema (introduced in 2025, stabilized into 2026) replaces string-typed dicts with a declarative `io.Schema()` object using typed classes like `io.Image.Input()`, `io.String.Input()`, and `io.Image.Output()`. V3 also introduces pinnable API versions (`from comfy_api.v1 import ...` vs `comfy_api.latest`) so published node packs can lock to a stable surface. Critically, V3 changes the caching model: IS_CHANGED must return `float("NaN")` to force re-execution on every run (returning `True` does NOT work because `True == True`). For nodes that call external APIs, this is essential — without it, ComfyUI caches the result and never re-queries.

For querying an external dataset API (like MetroVision's scene/shot index), the practical pattern is: build a Python custom node that makes a synchronous `requests.get()` or `httpx` call inside the `FUNCTION` method, return structured data as a tuple of ComfyUI-typed values (STRING, INT, DICT via JSON serialization), and use `IS_CHANGED` returning `float("NaN")` to ensure fresh queries. The `ComfyUI-RequestNodes` package already ships GET/POST/DELETE nodes with retry support and JSON parsing, confirming this pattern is well-established. For more complex workflows, the Griptape Nodes ecosystem runs inside ComfyUI but targets LLM agent pipelines with a cleaner commercial license (Apache 2).

Krea.ai's Nodes product operates as a separate cloud-hosted canvas with a REST API and OpenAPI spec. It does not share ComfyUI's Python class model — it is a distinct product that can call external endpoints via HTTP. Higgsfield Cinema Studio does not expose a public node SDK; integration is via its generation REST API only, with no-code automation achievable through n8n-style HTTP trigger nodes.

## Recommendation

Build the MetroVision ComfyUI integration as a small Python custom node package targeting V1 compatibility (widest install base) with a V3 upgrade path. The node should expose a `SceneQuery` node with string inputs (film title, shot type filter, camera movement filter), make an HTTP GET to the MetroVision API, and return typed outputs (STRING for JSON payload, INT for result count). Use `IS_CHANGED` returning `float("NaN")` to prevent caching. For Krea.ai and Higgsfield, target their REST APIs via webhook/HTTP calls; no custom node SDK is needed.

## Key Facts

- V1 node contract: `INPUT_TYPES` classmethod, `RETURN_TYPES` tuple, `FUNCTION` string, `CATEGORY` string, registered in `NODE_CLASS_MAPPINGS` dict at module level
- V3 node contract: `io.Schema()` with typed `io.Image.Input()` / `io.String.Input()` classes; pin version with `from comfy_api.v1 import ...` for stability
- `IS_CHANGED` must return `float("NaN")` to force re-execution; returning `True` is silently ignored (True == True evaluates as no change)
- `__init__.py` must export `NODE_CLASS_MAPPINGS` and optionally `NODE_DISPLAY_NAME_MAPPINGS`
- `ComfyUI-RequestNodes` (GitHub: felixszeto/ComfyUI-RequestNodes) ships production-ready GET/POST/REST nodes with retry, headers, and JSON output — confirms the HTTP-query pattern is standard
- ComfyUI's caching API (`cls` parameter in V3) must be used for inter-run state; instance variables are unsafe because V3 targets process isolation
- Krea.ai Nodes: cloud canvas, REST API with OpenAPI spec, Python/Node.js/Go/cURL examples, webhook support (X-Webhook-URL header), 75 MB file limit — no Python class SDK
- Griptape Nodes: runs inside ComfyUI, Apache 2 license, targets LLM agents, NOT workflow-compatible with ComfyUI (different graph format)
- Higgsfield Cinema Studio: REST API only, no public node SDK, n8n integration exists but is community-maintained
- `node_id` in saved workflows is a permanent contract — changing behavior without a new ID breaks saved user workflows
- Recommended data format for MetroVision API response in ComfyUI context: JSON string output (STRING type) + result count (INT type), parsed downstream by a JSON Parse node

## Sources

- https://docs.comfy.org/development/core-concepts/custom-nodes — Official ComfyUI custom node architecture docs
- https://docs.comfy.org/custom-nodes/walkthrough — Official walkthrough covering INPUT_TYPES, RETURN_TYPES, FUNCTION, NODE_CLASS_MAPPINGS
- https://apatero.com/blog/comfyui-v3-custom-node-schema-development-2026 — V3 schema deep-dive with io.Schema, io.Image, versioned imports
- https://github.com/comfyanonymous/ComfyUI/blob/master/custom_nodes/example_node.py.example — Canonical example node in the official repo
- https://github.com/felixszeto/ComfyUI-RequestNodes — Production HTTP request nodes for ComfyUI (GET/POST/REST with retry + JSON)
- https://comfyai.run/documentation/Rest%20Api%20Node — REST Api Node documentation showing GET/POST patterns and JSON response handling
- https://docs.comfy.org/custom-nodes/backend/server_overview — IS_CHANGED, caching, side effects, and V3 process isolation guidance
- https://www.griptapenodes.com/comfyui-alternative — Griptape Nodes architecture, Apache 2 license, ComfyUI incompatibility note
- https://www.krea.ai/features/api — Krea.ai REST API with OpenAPI spec and webhook support
- https://higgsfield.ai/cinema-studio — Higgsfield Cinema Studio capability overview; no public node SDK confirmed

## Confidence

0.82 — The V1 node contract is extremely well-documented across multiple independent sources (official docs, GitHub example, community guides) and cross-checks consistently. V3 details come from fewer sources (official docs + one deep-dive blog) and the spec is still stabilizing in 2026. Krea.ai and Higgsfield API details are confirmed but shallow — no developer SDK docs were directly accessible.
