# Studio Universal Gateway — Feature Suggestions

Phased implementation roadmap from lowest impact to highest impact.

---

## Phase 1: Workflow Directory & Server-Side Parser

**Impact:** Low — self-contained backend change, no UI changes.

**What:**
- `workflows/` directory on disk (auto-created if missing)
- Server-side Python parser that reads a standard ComfyUI workflow JSON file, locates `StudioInputGateway` / `StudioOutputGateway` nodes, and extracts their `properties.gateway` config
- `active.json` symlink or config pointer — gateway server loads on startup

**Why:**
- Foundation for all later phases. The server currently has zero awareness of what workflow is active until the browser canvas tells it via `POST /gateway/data`. With disk-based workflows, the server can operate independently.

**Technical approach:**
```python
# gateway_server.py (new function)
def parse_workflow_json(path: str) -> dict:
    with open(path) as f:
        wf = json.load(f)
    inputs = {}
    outputs = {}
    for node in wf.get("nodes", []):
        props = node.get("properties", {}).get("gateway", {})
        if node["type"] == "Studio_Universal_Gateway":
            inputs = props
        elif node["type"] == "Studio_Output_Gateway":
            outputs = props
    return {"inputs": inputs, "outputs": outputs}
```

**Files:**
- `gateway_server.py` — add `parse_workflow_json()`, auto-load on startup
- `workflows/` directory (new, gitignored except `.gitkeep`)

---

## Phase 2: Workflow Hub UI

**Impact:** Low-Medium — dashboard component additions, new API endpoints.

**What:**
- New "Workflows" section in the dashboard sidebar/tab
- **List:** All `.json` files in `workflows/` shown as cards with filename + node summary
- **Upload:** Drag-and-drop (or file picker) upload a workflow JSON to `workflows/`
- **Activate:** Click to set a workflow as active — server immediately parses it and populates gateway state
- **Active indicator:** Currently active workflow highlighted

**Why:**
- Users can switch between workflows without touching the ComfyUI canvas
- Enables saving/shareable workflow configs

**Technical approach:**
- `GET /gateway/api/v1/workflows` — list available workflows
- `POST /gateway/api/v1/workflows/activate` — set active workflow (write `active.json` pointer)
- `POST /gateway/api/v1/workflows/upload` — multipart file upload
- Dashboard gets a new `WorkflowHub.vue` component

**Files:**
- `gateway_server.py` — 3 new API endpoints
- `dashboard/src/components/WorkflowHub.vue` (new)
- `dashboard/src/App.vue` — wire in hub tab/panel
- `workflows/` — `.gitkeep`, populated by upload

---

## Phase 3: Multi-Output Type Support

**Impact:** Medium — sends proper media types for audio/video/text alongside images.

**What:**
- `POST /gateway/api/v1/run` returns typed outputs: `image/*`, `audio/*`, `video/*`, `text/plain`, `application/json`, etc.
- Server-side output resolver reads ComfyUI's output directory and determines MIME type per asset
- Dashboard can render audio players, video players, text blocks accordingly

**Why:**
- ComfyUI can produce audio (via AudioSaveNode), video (via VideoCombine), text, JSON, and more. The gateway must handle all of them, not just images.

**Technical approach:**
- Replace hardcoded `image/*` in output processing with `mimetypes.guess_type()` based on file extension
- Asset metadata includes `mime_type` field
- New dashboard renderers: `<AudioPlayer>`, `<VideoPlayer>`, `<TextViewer>`

**Files:**
- `gateway_server.py` — MIME type resolution in output handling
- `dashboard/src/components/widgets/AudioPlayer.vue` (new)
- `dashboard/src/components/widgets/VideoPlayer.vue` (new)
- `dashboard/src/components/widgets/TextViewer.vue` (new)
- `dashboard/src/components/AssetPanel.vue` — wire in new renderers

---

## Phase 4: Synchronous Blocking API

**Impact:** Medium — new endpoint, execution waiter, timeout handling.

**What:**
- `POST /gateway/api/v1/run` — accepts `{values: {...}}`, queues prompt, **blocks** until execution completes (or times out), returns results inline
- No WebSocket, no polling, no callback URL needed
- Supports all output types from Phase 3

**Why:**
- Enables true headless use: `curl -X POST http://localhost:8188/gateway/api/v1/run -d '{"values": {"prompt": "cat"}}'` returns the generated image/audio/video directly
- Essential for `comfy-cli` integration, CI/CD pipelines, and programmatic access

**Technical approach:**
```python
@routes.post("/gateway/api/v1/run")
async def post_run_sync(request):
    body = await request.json()
    prompt_id = queue_prompt(body["values"])
    # Wait for completion via asyncio.Event or polling queue status
    result = await wait_for_execution(prompt_id, timeout=300)
    return web.json_response(result)
```
- `wait_for_execution()` subscribes to the server's execution events (`PromptServer.instance.send_json`) and resolves when the specific `prompt_id` is done
- Timeout returns a 202 with `prompt_id` (client can poll separately)

**Files:**
- `gateway_server.py` — new async `post_run_sync` endpoint, `wait_for_execution()` helper
- Schema / response format documented for API consumers

---

## Phase 5: Live OpenAPI Schema & Swagger UI

**Impact:** Medium-High — schema generation, new docs page.

**What:**
- `GET /gateway/api/v1/schema` — returns an OpenAPI 3.0 JSON schema dynamically generated from the active workflow's Input/Output Gateway node config
- Each input variable becomes an API parameter with type, min, max, default
- Each output asset becomes a response property with type, MIME hint
- `GET /gateway/docs` — renders Swagger UI page at `/gateway/docs`
- Schema updates instantly when a new workflow is activated

**Why:**
- Auto-documentation makes the API discoverable without reading source
- Any HTTP client (Postman, curl, programmatic) can introspect the API
- Critical for third-party integration and `comfy-cli`

**Technical approach:**
- Build OpenAPI spec dict from parsed gateway config:
  - `name_0` = parameter name
  - `widget_type_0` = maps to OpenAPI type (string, number, boolean)
  - `min_0` / `max_0` / `step_0` = schema constraints
  - Output names = response schema properties
- Swagger UI as static HTML inlined or served from `/gateway/docs`

**Files:**
- `gateway_server.py` — `GET /gateway/api/v1/schema` endpoint, `generate_openapi_spec()` function
- `gateway_server.py` — `GET /gateway/docs` endpoint (static Swagger UI HTML)
- `GatewayStore` — schema cache cleared on workflow change

---

## Phase 6: Headless Mode (Canvas Bypass)

**Impact:** High — architectural shift from canvas-dependent to fully self-sufficient.

**What:**
- Gateway server completely self-sufficient — no `POST /gateway/data` required
- On startup, if an active workflow is set, the server parses it and populates `DATA` entirely from disk
- Dashboard can be opened directly at `/gateway` without ever visiting the ComfyUI canvas
- `comfy-cli` integration: `comfy-cli run --workflow workflows/text_to_image.json --values '{"prompt": "cat"}'`

**Why:**
- Removes the final dependency on the ComfyUI browser canvas
- Enables server-side-only deployments (Docker, RunPod, headless cloud instances)
- The "Gateway" button in the ComfyUI menu becomes optional — everything works without it

**Technical approach:**
- New `--headless` or `--gateway-workflow` CLI flag (or env var)
- If set, server skips waiting for canvas sync and uses disk-based workflow
- Dual-mode `DATA` population: canvas-sync path (existing) vs disk-read path (new)
- `POST /gateway/data` still works for canvas mode — no breaking changes

**Files:**
- `gateway_server.py` — `load_active_workflow()` runs at module init if active workflow is configured
- `__init__.py` — optional CLI args passed through from ComfyUI
- `dashboard/src/composables/useWebSocket.ts` — handle case with no canvas opener

---

## Phase 7: Advanced Features (Future)

**Impact:** Highest — multi-component, multi-workflow, external integrations.

### 7.1 Multi-Workflow Orchestration
- Run multiple workflows in sequence or parallel from a single API call
- Pass outputs from one workflow as inputs to another

### 7.2 Async API (Webhook Callbacks)
- Non-blocking `POST /gateway/api/v1/run/async` — queues prompt, returns `prompt_id` immediately
- Server calls a webhook URL with results when execution completes
- Enables serverless/event-driven pipelines

### 7.3 Presets & Templates
- Named preset configs that override specific input values
- Template workflows with parameterized slots

### 7.4 Auth & API Keys
- Optional API key authentication for gateway endpoints
- Rate limiting, per-key usage tracking

### 7.5 Client App Builder
- Drag-and-drop layout editor for building custom client UIs
- Brand theming, published app URLs
- Embeddable `<iframe>` widgets

---

## Summary

| Phase | Feature | Impact | Dependencies |
|-------|---------|--------|-------------|
| 1 | Workflow Directory & Parser | Low | — |
| 2 | Workflow Hub UI | Low-Med | Phase 1 |
| 3 | Multi-Output Type Support | Medium | — |
| 4 | Synchronous Blocking API | Medium | Phase 1, 3 |
| 5 | Live OpenAPI Schema + Swagger | Med-High | Phase 1, 4 |
| 6 | Headless Mode | High | Phase 1, 2, 4 |
| 7 | Advanced Features | Highest | Phases 1-6 |
