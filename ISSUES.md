# Studio Universal Gateway — Issue Tracker

## Session: Jul 13, 2026 — Dashboard Polish & Bug Fixes

### Bug: Increment/Decrement stops working after switching from Fixed mode
**Status: Resolved**

- **Root cause:** `applyControlOverrides()` used `w.control` (raw, could be `undefined`) vs `canvasModeAtSet` (always `'fixed'` due to fallback). `undefined !== 'fixed'` deleted the override on every refresh cycle. Exacerbated by double `refreshData()` race inside `run()` — both `handleMessage`'s `'resynced'` handler and the explicit `await refreshData()` fired concurrently, one seeing stale data.
- **Fix applied:**
  - `raw = w.control ?? 'fixed'` — normalize raw to match `canvasModeAtSet` default
  - `canvasModes[name]` set from raw (pure canvas value) before any override is applied → `setControl` now reads `canvasModes[name]` only, not `w.control` (which could already be overridden)
  - `refreshing` guard on `refreshData()` prevents concurrent double fetch

### Bug: Override always wins over canvas — Resync doesn't restore canvas modes
**Status: Resolved**

- **Root cause:** Previous "always apply override" fix removed the comparison logic entirely. Dashboard overrides from localStorage were applied unconditionally, including stale ones from prior sessions.
- **Fix applied:**
  - Restored comparison logic: override applied only if `canvasModeAtSet === raw` (canvas hasn't changed since override was set)
  - `resync()` clears all overrides before refreshing
  - Standalone (no opener) `resync()` passes `skipDashboardControl=true` to `refreshData()` to prevent `dashboard_control` from overriding the canvas value

---

## Session: Jul 13, 2026 — Round 5 Bug Fixes

### Bug: Resync notification on every run
**Status: Resolved**

- **Root cause:** `handleMessage` in `App.vue` showed a "Re-synced" toast for every `'resynced'` message, including the automatic one during `run()`. The explicit `resync()` already had its own toast at line 209.
- **Fix applied:** Removed `showToast('Re-synced')` from `handleMessage`'s `'resynced'` case. Toast now only shows on explicit user-initiated resync.

### Bug: Outputs never appear — `studio_assets` silently crashes
**Status: Resolved**

- **Root cause:** `useWebSocket.ts` used `for (const asset of assets)` to iterate `msg.data.output.studio_assets`, but `studio_assets` is a JSON object (`{"output_0": {...}}`), not an array. `for...of` on a plain object throws `TypeError: assets is not iterable`, which was caught by the outer `try/catch` and silently swallowed. This also prevented `pendingStudioAssets` from being set, causing `flushImages()` to return early and outputs to never render.
- **Fix applied:** Changed to `for (const [name, asset] of Object.entries(assets))`, fixed widget name lookup to use `name` (object key) instead of `asset.name`, and normalized `pendingStudioAssets` to `{name, ...asset}` entries. Added `console.warn` to the catch block so future errors are visible.

### Bug: Increment/Decrement broken on second run after canvas mode change
**Status: Resolved**

- **Root cause:** `run()` called `refreshData()` with `skipDashboardControl=false` (line 166). `applyControlOverrides` then applied `dashboard_control` from a previous dashboard session, overwriting the canvas node's freshly changed mode. The canvas mode change was ignored and `resolveValue` used the stale mode.
- **Fix applied:** Changed line 166 to `refreshData(true)`. When running, the canvas node's current mode is always honored; `dashboard_control` from prior sessions does not override it.

### Bug: Slots always show "link_N" even after renaming
**Status: Resolved**

- **Root cause:** `setupNodeInstance()` unconditionally reset `slot.name` to `link_N` for ALL nodes. The Input Gateway's output slot names are NOT used in prompt serialization (connections are serialized by index), so they could safely show the user-facing name. Only Output Gateway input slots must stay as `link_N` because they become kwargs keys in `execute()`.
- **Fix applied:** `handleNameClick()` now updates `slot.name` to the trimmed name for Input Gateway output slots. Output Gateway input slots remain `link_N`.

### Bug: Text outputs not showing after Object.entries refactor
**Status: Resolved**

- **Root cause:** Two compounding bugs in `useWebSocket.ts`'s `executed` handler:
  1. `studio_assets` lives in `msg.data.ui` (from `io.NodeOutput(ui=...)`), but the code checked `msg.data.output.studio_assets`
  2. `studio_assets_list` is an **array** (gateway_nodes.py:65), not a dict. `Object.entries()` on an array yields `["0", element]` pairs — the `name` variable was the array index `"0"`, not the entry's `asset.name` property. Widget lookup by index never found a match. Image entries were saved only because `flushImages()` uses `asset.name` from the entry property (not the loop variable).
- **Fix applied:** Check both `msg.data.output` and `msg.data.ui` for `studio_assets`. Iterate with `for...of` (array-safe) using `asset.name` directly.

### Bug: Text outputs not showing after Object.entries refactor
**Status: Resolved**

- **Root cause:** Two compounding bugs in `useWebSocket.ts`'s `executed` handler:
  1. `studio_assets` lives in `msg.data.ui` (from `io.NodeOutput(ui=...)`), but the code checked `msg.data.output.studio_assets`
  2. `studio_assets_list` is an **array** (gateway_nodes.py:65), not a dict. `Object.entries()` on an array yields `["0", element]` pairs — the `name` variable was the array index `"0"`, not the entry's `asset.name` property.
- **Fix applied:** Check both `msg.data.output` and `msg.data.ui` for `studio_assets`. Iterate with `for...of` using `asset.name` directly.

### Feature: Batch count support in dashboard toolbar
**Status: Resolved**

- **Root cause:** Dashboard only queued one prompt. When a widget value controlled batch count (e.g., 2), the dashboard sent the value to the workflow but didn't queue the prompt multiple times. Standard ComfyUI frontend queues prompts N times client-side via the toolbar batch count input.
- **Fix applied:** Added `batchCount` number input to the toolbar. `run()` loops N times, freshly resolving widget values for each iteration (so randomize gets new seeds, increment chains).

### Feature: Image upload for image-type input widgets
**Status: Resolved**

- **Root cause:** Image-type widgets had no upload mechanism. `ImageViewer.vue` only displayed existing images. Input image widgets couldn't provide image data to the workflow.
- **Fix applied:** Created `ImageInput.vue` component with file picker, upload to ComfyUI's `/upload/image`, preview thumbnail, replace/remove controls. `WidgetCard.vue` selects `ImageInput` for inputs and `ImageViewer` for outputs.

### Bug: Increment/Decrement fails for large seed values (>9e15)
**Status: Resolved**

- **Root cause:** JavaScript's `Number` type (IEEE 754 double) can only represent integers exactly up to `Number.MAX_SAFE_INTEGER` (9007199494740991). Seed values like `16333966481368627000` (~1.6e19) have a ULP of 2048 — adding 1 doesn't change the representable value. `resolveValue`'s `'randomize'` case generated values in [min, max] without bounds checking, producing unreachable numbers.
- **Fix applied:** `resolveValue`'s `randomize` case now caps the range at `Number.MAX_SAFE_INTEGER` via `Math.min(max, Number.MAX_SAFE_INTEGER)`. All randomly-generated values are exactly representable, so increment/decrement from them works correctly.

---

## Session: Jul 13, 2026 — Bug Fix: Cancel button

### Bug: Cancel button throws "PromptServer has no attribute 'interrupt'"
**Status: Resolved**

- **Root cause 1:** `gateway_server.py:109` called `server.interrupt()` but `PromptServer` has no such method.
- **Wrong fix (reverted):** Changed to `execution.interrupt_processing()` — the `execution` module does not expose `interrupt_processing()`.
- **Correct fix:** Changed import from `execution` to `nodes`, call `nodes.interrupt_processing()`. This is what ComfyUI's own `POST /interrupt` endpoint uses (server.py:1148/1154).

---

## Session: Jul 13, 2026 — Feature: Asset Viewer Panel

### Feature: Output History Panel replacing PastGenerations
**Status: Resolved**

- **What:** New togglable right-side panel showing all outputs (images, text, metrics, numbers, toggles, selects, colors) from every run, segregated per run.
- **Why:** `PastGenerations.vue` only tracked image filenames. All other output types vanished after each run.
- **Changes:**
  - `App.vue` — Added `runHistory` reactive array of per-run snapshots. `onExecuted` now captures ALL assets (not just images) into `RunRecord { id, timestamp, assets[] }`. Added `showPanel` toggle ref.
  - `AssetPanel.vue` (NEW) — Overlay panel slides from right edge. Each run is collapsible with header + timestamp. Assets rendered by type: image thumbnails with lightbox, metrics as formatted JSON, color swatches, toggle badges, text/numbers inline. Clear-all button, close on backdrop click or X.
  - `Toolbar.vue` — Added grid-icon toggle button on the right side (near theme toggle). Highlighted orange when panel open.
  - `DashboardLayout.vue` — Removed `PastGenerations` import/passing (superseded).
  - `PastGenerations.vue` — DELETED.

### Bug: Asset Panel shows "∅" for text / empty image box for images
**Status: Resolved**

- **Root cause 1:** `isImage()` had a fallback `a.data.includes('.')` — any text containing a dot (URL, number like `3.14`, sentence with period) was misclassified as image, rendering an empty image box with lightbox.
- **Root cause 2:** `flushImages()` in `useWebSocket.ts` sets image data on the widget (`w.data`) but never on the asset object. `onExecuted` read `asset.data` which was still null for images resolved from pendingImages.
- **Root cause 3:** `.panel-body` had `display: flex; flex-direction: column; gap: 8px` which, combined with `flex: 1; min-height: 0`, made content stretch/resize to fit within viewport height — preventing `overflow-y: auto` from ever triggering. Scroll never appeared.
- **Fixes applied:**
  - `isImage()` now only checks `a.ui_type === 'image'` — removed the dot heuristic.
  - `onExecuted` reads data from `w?.data ?? asset.data` (widget first, asset fallback), and similarly for `subfolder`/`type`.
  - Removed `display: flex; flex-direction: column; gap: 8px` from `.panel-body` — uses block layout with `.run-card + .run-card { margin-top: 8px }` for spacing. Content now overflows naturally and scroll works.
  - `onExecuted` uses `state.promptId` as the run label instead of auto-incrementing counter.
  - Removed `max-height` hack from `.panel-body`.

### Bug: Asset Panel still not scrollable despite position:absolute fix
**Status: Resolved**

- **Root cause:** `@wheel.prevent` on the overlay blocked ALL wheel events inside the panel, preventing `.panel-body` from receiving scroll events. The nested `position: absolute` layout inside `position: fixed` also created unreliable height calculations. `overflow: hidden` on wrapping elements interfered with scroll containment.
- **Fixes applied:**
  - Removed `@wheel.prevent` entirely.
  - Overlay and panel are now sibling `position: fixed` elements (each with own `<Transition>`) — no parent/child nesting.
  - `.asset-panel` itself is the scroll container: `overflow-y: auto; overscroll-behavior: contain`.
  - Header uses `position: sticky; top: 0; z-index: 1; background: var(--surface-ground)` — stays at top while content scrolls beneath.
  - `.panel-body` is normal flow block (no `position: absolute`, no `display: flex`).
  - All `overflow: hidden` removed from panel and overlay.

### Feature: Constrain oversized asset content in Asset Panel
**Status: Resolved**

- **What:** Individual asset items that exceed viewport height now cap at `40vh` (text/metrics) or `50vh` (images) with internal scroll. Widgets that naturally fit remain unchanged.
- **Why:** A single large output (huge JSON, tall image, long text) would push the entire panel scroll, making it hard to see other runs' outputs.
- **Changes:**
  - `.asset-thumb` → added `max-height: 50vh`
  - `.asset-metrics pre` → changed `max-height: 120px` → `max-height: 40vh`
  - `.asset-value` → added `max-height: 40vh; overflow-y: auto`
