# Changelog

> This file was renamed from `SESSION_LOG.md`. All references below are updated to `CHANGELOG.md`.

---

# Session Log — 2026-07-09

## What was built

### Design System Integration
- **`style.css`** — Full dark/light theme system using PrimeVue Aura CSS variable overrides
  - Dark mode colors from `DESIGN_dark_mode.md` (background `#131313`, cards `#0E0E0E`, text `#FFFFFC`)
  - Light mode colors from `DESIGN_light_mode.md` (background `#fcf9f8`, cards `#f0eded`, text `#1c1b1b`)
  - Primary `#FF3F00` for both modes
  - System fonts: `ui-sans-serif` + `ui-monospace` (no downloads)
  - Custom classes: `.widget-card`, `.mono-input`, `.progress-glow`
  - Custom scrollbar styling per theme
- **`index.html`** — `<html class="dark">` default
- **`assets/logo.svg`** — Portal icon in `#FF3F00` (from Stitch)
- **`assets/empty-state.svg`** — No-workflow illustration (from Stitch)

### PrimeVue Integration
- **`main.ts`** — Added `ToastService` for notifications
- **All components** now use PrimeVue components (`Button`, `Card`, `Slider`, `InputSwitch`, `InputText`, `ProgressBar`, `Dialog`, `Toast`)
- PrimeVue Aura theme preserved — only color tokens overridden (no shape/radius/spacing changes)

### Toolbar Redesign
- **`Toolbar.vue`** — Dark bar, inline SVG logo, RUN (primary orange), progress bar with glow, RE-SYNC (outlined), version badge, dark/light toggle
- **No "Back to ComfyUI"** — removed entirely

### Layout
- **`DashboardLayout.vue`** — Three-column layout: left 20%, center flex-1, right 20%
- **`ColumnPanel.vue`** — Section headers with "INPUTS"/"OUTPUTS" labels and widget counts

### Widget Components
- **`WidgetCard.vue`** — Uses `<Card>`, label = variable name (mono, uppercase, `--p-text-secondary-color`)
- **`SliderInput.vue`** — Uses `<Slider>` with value label
- **`ToggleInput.vue`** — Uses `<InputSwitch>` with ON/OFF (orange when on)
- **`ColorInput.vue`** — Native input, themed
- **`TextDisplay.vue`** — Uses `<InputText>` with `.mono-input`
- **`MetricsCard.vue`** — Styled JSON `<pre>` block
- **`ImageViewer.vue`** — Hover overlay with zoom/download buttons

### Sync & Notifications
- **Auto re-sync**: BroadcastChannel `workflow-saved` → `resync()` (no manual click)
- **Toast notification**: "Re-synced — Workflow data refreshed" on every successful resync (bottom-right, 2s)
- **`SyncBanner.vue`** — Dark-themed `"Workflow updated. [Re-Sync]"` banner

### Past Generations
- **`PastGenerations.vue`** (new) — 2-column thumbnail grid, Dedicated right-column section
- Tracks only outputs from this gateway session (not external runs)
- Images captured from WebSocket `executed` events via `onExecuted` callback
- Click thumbnail → `<Dialog>` modal lightbox with full-size image
- "Clear history" button (trash icon)

### Unconnected Slot Filtering
- **`web/js/studio_gateway.js:collectWidgets`** — Now skips slots where `active_i === false`
- Only connected slots appear in the dashboard regardless of index position

## Files Changed
```
studio_universal_gateway/
├── assets/
│   ├── logo.svg                  (NEW)
│   └── empty-state.svg           (NEW)
├── dashboard/
│   ├── src/
│   │   ├── main.ts               (MODIFIED: added ToastService)
│   │   ├── style.css             (REWRITTEN: dark/light theme)
│   │   ├── App.vue               (REWRITTEN: auto-resync, past generations, dark toggle, toast, empty state)
│   │   ├── components/
│   │   │   ├── Toolbar.vue       (REWRITTEN: no Back to ComfyUI, logo, RUN, RE-SYNC, dark toggle; REMOVED: Studio Gateway title)
│   │   │   ├── DashboardLayout.vue (REWRITTEN: 20/60/20 columns, PastGenerations; MODIFIED: columns hidden when empty, no placeholders)
│   │   │   ├── ColumnPanel.vue   (REWRITTEN: section headers; MODIFIED: 4px-base gaps)
│   │   │   ├── WidgetCard.vue    (REWRITTEN: Card component, variable-name label; MODIFIED: 12px card padding, pt override)
│   │   │   ├── SyncBanner.vue    (REWRITTEN: dark theme)
│   │   │   ├── PastGenerations.vue (NEW: grid + lightbox)
│   │   │   └── widgets/
│   │   │       ├── SliderInput.vue  (REWRITTEN: PrimeVue Slider; MODIFIED: 8px gaps)
│   │   │       ├── ToggleInput.vue  (REWRITTEN: PrimeVue InputSwitch; MODIFIED: 8px gaps)
│   │   │       ├── TextDisplay.vue  (REWRITTEN: PrimeVue InputText)
│   │   │       ├── ColorInput.vue   (REWRITTEN: themed; MODIFIED: 8px gaps)
│   │   │       ├── MetricsCard.vue  (REWRITTEN: Card + styled pre; MODIFIED: 12px padding, pt override)
│   │   │       └── ImageViewer.vue  (REWRITTEN: hover overlay; MODIFIED: 12px padding, pt override)
│   │   └── composables/
│   │       └── useWebSocket.ts   (MODIFIED: onExecuted callback)
│   ├── index.html                (MODIFIED: class="dark")
│   └── dist/*                    (BUILT)
├── web/js/
│   └── studio_gateway.js         (MODIFIED: active_i filter in collectWidgets, defaultName helper for input_0/output_0)
└── CHANGELOG.md                (NEW)
```

---

# Session Log — 2026-07-09 (Session 2)

## Changes

### Widget Theme Colors (Dark/Light mode fix)
- **`dashboard/src/main.ts`** — Fixed inverted dark-mode surface palette:
  - `surface.0` now `#FFFFFC` (lightest — text color in dark mode)
  - `surface.900` now `#0E0E0E` (darkest — card background in dark mode)
  - Previously was reversed, making card backgrounds white in both modes
  - All intermediate values (50–950) corrected to proper gradient
- **Root cause**: Aura preset references `{surface.900}` for dark mode `content.background` (card color). Old values had `surface.900 = #FFFFFC` (white), so cards were white in dark mode. Fixed by swapping the entire dark palette orientation.

### Toolbar Execution Bar
- **`dashboard/src/components/Toolbar.vue`** — Redesigned execution bar:
  - Removed icon from Run button (text-only "Queue Prompt", centered)
  - Added **Cancel** button (shown during execution, calls interrupt)
  - Replaced hacked Button-as-progress with PrimeVue `<ProgressBar>` component (160px, h-2)
  - Status shows "Ready" instead of lowercase "idle"
  - Imported `ProgressBar` from `primevue/progressbar`
- **`dashboard/src/App.vue`** — Added `cancel()` function (fetches `POST /gateway/interrupt`), wired `@cancel` event on Toolbar
- **`gateway_server.py`** — Added `POST /gateway/interrupt` endpoint (line 106) wrapping `PromptServer.instance.interrupt()`

### Node Persistence Fix (data loss on server reboot)
- **`web/js/studio_gateway.js`** — Migrated storage from `node.widgets_values` → `node.properties.gateway`:
  - Added `getStore(node)` helper returning `node.properties.gateway` (lazy init)
  - Replaced all 20+ `node.widgets_values` references with `getStore(node)`
  - Removed `onSerialize` hook entirely (LiteGraph natively persists `node.properties`)
  - Simplified `onConfigure` to only sync `active_i` flags
- **`gateway_server.py:43`** — Updated `POST /gateway/run` to read from `node.get("properties", {}).get("gateway", {})` instead of `node.get("widgets_values", {})`
- **Root cause**: `widgets_values` is ComfyUI's internal widget-value array. For V3 nodes with `inputs=[]`, ComfyUI may reset it to `[]` during initialization, wiping all stored gateway data. `node.properties` is auto-serialized by LiteGraph and not touched by V3 node management.

### Cleanup
- Removed `plan_nodes.md` and `app_plan.md` (outdated planning docs)

## Files Changed
```
studio_universal_gateway/
├── gateway_server.py               (MODIFIED: POST /gateway/interrupt + read from properties.gateway)
├── dashboard/src/
│   ├── main.ts                     (MODIFIED: fixed dark surface palette orientation)
│   ├── App.vue                     (MODIFIED: added cancel() + @cancel event)
│   └── components/Toolbar.vue      (REWRITTEN: Queue Prompt text-only, Cancel button, ProgressBar, Ready status)
├── web/js/
│   └── studio_gateway.js           (REWRITTEN: getStore helper, properties.gateway for persistence, removed onSerialize)
├── plan_nodes.md                   (DELETED)
├── app_plan.md                     (DELETED)
└── CHANGELOG.md                  (UPDATED)
```

---

# Session Log — 2026-07-10

## Changes

### Dependency Strip (PrimeVue/Tailwind → zero-dep native Vue)
- Removed all PrimeVue, PrimeIcons, Tailwind CSS dependencies from `package.json` / `vite.config.ts`
- Rewrote every component with native `<input>`, `<textarea>`, `<div>`, `<button>`, inline SVGs
- **`style.css`** — ~300 lines of custom CSS (buttons, cards, inputs, range toggle, progress bar, toast, dialog, layout, scrollbar). Same `#FF3F00` accent, same dark/light CSS variables, same card/mono aesthetic.
- **`main.ts`** — Simplified to `createApp(App).mount('#app')`
- **`vite.config.ts`** — Removed Tailwind plugin
- **Toolbar** — native button bar with inline SVG logo
- **SliderInput** — native `<input type="range">` with `accent-color: #FF3F00`, reads `widget.min`/`max`/`step`
- **ToggleInput** — native `<input type="checkbox">` styled as pill
- **TextDisplay** — native `<input>`/`<textarea>` via `.input` CSS class
- **Toggle/RemoveInput/ToggleInput** — PrimeVue `InputSwitch` replaced with checkbox toggle
- **PastGenerations** — native `<img>` + inline SVG icons for zoom/download
- **Build output**: 6 KB CSS + 87 KB JS (32 KB gzipped), 123ms build time

### Phase 4 — Auto-Detect Widget Type from Connected Node
- **`studio_gateway.js`** — Added `detectDownstreamSpec(node, outputIndex)`:
  - Reads connected node's input spec from `api.getNodeDefs()` (ComfyUI's `/object_info` cache)
  - Extracts `type` (INT/FLOAT/BOOLEAN/STRING/COMBO/COLOR), `min`, `max`, `step`, `control_after_generate`
  - `specTypeToUI()` maps types to widget: INT/FLOAT → slider (if bounded narrow) / number; BOOLEAN → toggle; STRING → text; COLOR → color
  - `ensureSlotDetected()` called from `onConnectionsChange` on new connection
  - `detectExistingConnections()` called from `onConfigure` for loaded workflows
  - Detected type stored in `properties.gateway.detected_type_N`; only overrides widget_type if still "text"
  - Shows subtle indicator in `drawSlotOptions` when detected type differs from manual override

### Phase 5 — control_after_generate Support
- **`App.vue`** — Added `resolveValue(w, current)`:
  - `randomize`: uniform step-aligned random in `[min, max]`
  - `increment`: `prev + step`, wraps to `min` at `max`
  - `decrement`: `prev - step`, wraps to `max` at `min`
  - `fixed`: passthrough
  - `lastSubmitted` ref tracks last run values for increment/decrement
  - `run()` applies `resolveValue()` to each widget before sending
  - `initValues()` sets random initial value for randomize-mode widgets
- **`WidgetCard.vue`** — Control badge (↻/↑/↓) in accent-color chip next to label title

### Gateway Server
- **`gateway_server.py:77`** — Changed `startswith` chain to `startswith(("name_", "widget_type_", "position_", "min_", "max_", "step_", "control_"))` for output enrichment

## Files Changed
```
studio_universal_gateway/
├── gateway_server.py               (MODIFIED: enriched field list)
├── dashboard/
│   ├── package.json                (REWRITTEN: vue only, vite+plugin)
│   ├── vite.config.ts              (MODIFIED: removed Tailwind plugin)
│   ├── src/
│   │   ├── main.ts                 (SIMPLIFIED: createApp + mount only)
│   │   ├── style.css               (REWRITTEN: ~300 lines custom CSS)
│   │   ├── App.vue                 (MODIFIED: resolveValue, lastSubmitted, control-aware initValues)
│   │   ├── components/
│   │   │   ├── Toolbar.vue         (REWRITTEN: native buttons, inline SVG logo)
│   │   │   ├── DashboardLayout.vue (REWRITTEN: native layout)
│   │   │   ├── ColumnPanel.vue     (REWRITTEN: native cards)
│   │   │   ├── WidgetCard.vue      (MODIFIED: control badge)
│   │   │   ├── SyncBanner.vue      (REWRITTEN: native)
│   │   │   ├── PastGenerations.vue (REWRITTEN: native grid + lightbox)
│   │   │   └── widgets/
│   │   │       ├── SliderInput.vue  (REWRITTEN: native range input)
│   │   │       ├── ToggleInput.vue  (REWRITTEN: native checkbox toggle)
│   │   │       ├── ColorInput.vue   (REWRITTEN: native)
│   │   │       ├── TextDisplay.vue  (REWRITTEN: native input/textarea via .input class)
│   │   │       ├── MetricsCard.vue  (REWRITTEN: native)
│   │   │       └── ImageViewer.vue  (REWRITTEN: native + inline SVG icons)
│   │   └── composables/
│   │       └── useWebSocket.ts     (UNCHANGED)
│   ├── index.html                  (UNCHANGED)
│   └── dist/*                      (BUILT: 6KB + 87KB)
├── web/js/
│   └── studio_gateway.js           (MODIFIED: auto-detect downstream spec, control_after_generate metadata)
└── CHANGELOG.md                  (UPDATED)
```

---

# Session Log - 2026-07-10 (Session 2)

## Changes

### Fixes Applied
- studio_gateway.js: import path fix, slot deferred init, number split, re-detect, catches
- gateway_nodes.py: image normalization
- App.vue: step=0 guard, NaN fix, catch blocks
- ImageViewer.vue: subfolder+type in URLs
- PastGenerations.vue: lightbox subfolder
- TextDisplay.vue: type=number for number(int)/number(float)

### Still Broken (delegated to HY3)
- Slot shift on reload - deferred init fix unresolved
- Widget options not persisting on recreate
- number(int)/number(float) not in context menu (Comfy.ContextMenuFilter)

## Files Changed
See HY3_TODO.md and diff for full details.

---

# Session Log - 2026-07-10 (Session 4)

## Outputs Never Appearing — Root Cause Fix (Revised)

**Symptom**: Output widgets show "waiting for data..." after successful execution.
Console log: `studio_assets found: []` — empty array from Output Gateway's `executed` message.
Debug log: `link_0 in kwargs=False` — no `link_N` keys in kwargs at all.

**Root Cause (confirmed via debug logging)**:
`syncSlotNames()` was overwriting `slot.name` from `"link_0"` to `"Output Image"` (the user-facing name) on every draw. LiteGraph serializes `node.inputs[i].name` into the workflow JSON. When the workflow is loaded from JSON, the slot names are already `"Output Image"`, `"LLM Prompt"` at deserialization time. `graphToPrompt()` uses `input.name` as the prompt key → produces `inputs["Output Image"]` instead of `inputs["link_0"]`. The `execute()` loop in `gateway_nodes.py` searches for `link_0` → never finds it → empty `studio_assets`.

**Fix** (JS): `setupNodeInstance` now explicitly resets all slot names to `link_N`:
```javascript
for (let i = 0; i < allSlots.length; i++) {
    allSlots[i].name = "link_" + i;
}
```
This runs on every `nodeCreated`, fixing both fresh nodes (names already correct — no-op) and loaded workflows (serialized wrong names — overwritten). `syncSlotNames` no longer touches `slot.name` — the canvas UI renders names from `store[name_N]` via `drawSlotOptions`/`onDrawForeground`.

**Safety net** (Python): `gateway_nodes.py` now unwraps `(None,)` tuples (from `get_input_data` cache misses) to `None` before the isinstance chain.

**Other fixes from this session**:
- Execution bar stuck at 100%: `useWebSocket.ts` — added `msg.data?.node === null || msg.data?.node === undefined` check.
- Tensor serialization crash: `gateway_nodes.py` — non-serializable data sets `data: None` instead of crashing.
- Image matching deferred: `useWebSocket.ts` — collects `pendingImages` from ALL nodes' `executed` messages, defers matching to `executing(null)` completion via `flushImages()`.
- Control modes scoped per widget type: `studio_gateway.js` — replaced `CONTROL_MODES` constant with `getControlModes(widgetType)`.
- Auto-detected defaults stored/sent: `studio_gateway.js` — stores `default_{index}`; `App.vue initValues()` uses `w.default` first.
- Values sync on run: `App.vue run()` — `values[w.name] = v` after each resolve.

## Files Changed
```
studio_universal_gateway/
├── gateway_nodes.py                 (MODIFIED: (None,) tuple unwrap)
├── web/js/studio_gateway.js         (MODIFIED: slot.name reset in setupNodeInstance; syncSlotNames no-op)
├── dashboard/src/
│   ├── App.vue                      (MODIFIED: initValues default-first, values[w.name]=v sync)
│   └── composables/useWebSocket.ts  (MODIFIED: executing null check, deferred image matching)
└── CHANGELOG.md                   (UPDATED)
```

---

# Session Log - 2026-07-10 (Session 3)

## HY3_TODO Implementation

Implemented the concrete fixes from `HY3_TODO.md`. Most items were already resolved in
prior sessions; the remaining ones were completed and verified (`dashboard npm run build`
and Python `py_compile` both pass).

### Changes
- **`web/js/studio_gateway.js`**
  - COMBO dropdown support (P2): `WIDGET_TYPES` gains `"select"`; `detectDownstreamSpec`
    returns `options` for COMBO; `specTypeToUI` maps COMBO → `"select"`;
    `ensureSlotDetected` stores/clears `options_i`; `collectWidgets` includes `options`.
- **`gateway_server.py:77`** — Enriched output-injection prefix list now includes `"options_"`.
- **`dashboard/src/components/widgets/SelectInput.vue`** (NEW) — `<select>` dropdown bound to
  model value; read-only display for output nodes.
- **`dashboard/src/components/WidgetCard.vue`** — `compMap` maps `"select"` → `SelectInput`.
- **`dashboard/src/App.vue`** — `initValues` defaults `select` widgets to first option.
- **`dashboard/src/composables/useWebSocket.ts`** (P3) — `clientId` now persisted in
  `localStorage` and reused across reconnects (previously regenerated each reconnect, so
  queued prompts lost their `executed` events and the dashboard hung on "running").
- **`gateway_nodes.py`** (P2 optional) — `StudioInputGateway.execute` logs a one-time warning
  when run directly (e.g. Queue Prompt) instead of from the dashboard.

### Already fixed in prior code (verified, no change)
- P0 #1: `number(int)`/`number(float)` in context menu (`WIDGET_TYPES` already has them; the
  `Comfy.ContextMenuFilter` only activates on `className === 'dark'`, our menu sets none).
- P0 #2: slot shift on reload (`_gatewayInit` flag + `slots.length === 0` guard prevents a
  prepended empty slot).
- P0 #3: widget reset on recreate (store lives in `node.properties.gateway`, fresh per node).
- P1: step=0 (`(w.step ?? 1) || 1`), NaN slider init (`lo`/`hi` guards), ImageViewer subfolder,
  detect/re-detect on reconnect.
- P2: TextDisplay `.startsWith('number')`, P3 catch blocks / `.catch()`.

### Root-cause note (important)
The `number(int)`/`number(float)` options only became visible **after removing a backup copy
of the node from the `custom_nodes` folder**. A duplicate/backup `studio_universal_gateway`
directory was being loaded by ComfyUI, shadowing the real node (whichever copy ComfyUI
enumerated first won). With the backup present, the old JS (without `number(int)`/
`number(float)` in `WIDGET_TYPES`) was served to the browser. Removing the backup let the
updated node load, and the numbers appeared. **Lesson: keep only one copy of a custom node in
`custom_nodes`; backup copies must live outside that directory.**

## Files Changed
```
studio_universal_gateway/
├── gateway_nodes.py                 (MODIFIED: one-time dashboard-usage warning)
├── gateway_server.py                (MODIFIED: options_ injection prefix)
├── dashboard/src/
│   ├── App.vue                      (MODIFIED: select default in initValues)
│   ├── components/
│   │   ├── WidgetCard.vue           (MODIFIED: select -> SelectInput)
│   │   └── widgets/
│   │       └── SelectInput.vue      (NEW)
│   └── composables/useWebSocket.ts  (MODIFIED: persist clientId across reconnect)
├── web/js/
│   └── studio_gateway.js            (MODIFIED: COMBO -> select, options storage/collect)
├── HY3_TODO.md                      (UPDATED: status notes)
└── CHANGELOG.md                   (UPDATED)
```


---
# Session Log - 2026-07-10 (Session 5)

## Changes

### Increment/Decrement Bug Fix

**Root cause**: `App.vue` `run()` sends a `{type: 'resync'}` message to the canvas opener
before `refreshData()`. The canvas responds by calling `POST /gateway/data` with its own
state - including `control: 'fixed'` - which overwrote the PATCH'd `control: 'increment'`
in the server DATA dict. By the time `resolveValue()` ran, `w.control` was back to `'fixed'`,
so the value passed through unchanged.

**Fix** - Two-part split so the canvas POST can't clobber the dashboard mode:
1. **`gateway_server.py:123`** - `PATCH /gateway/settings` now writes to
   `w["dashboard_control"]` instead of `w["control"]`. The canvas writes `control`; the
   dashboard writes `dashboard_control`. They coexist in the DATA dict.
2. **`App.vue:116-133`** - `applyControlOverrides()` applies `w.dashboard_control` as the
   effective mode when no localStorage A+ override exists (or after an override is dropped
   by canvas-change detection).

Now `raw = w.control` is always the pure canvas mode, so the A+ comparison
(`canvasModeAtSet === raw`) is correct again. The resync POST no longer erases the
dashboard mode.

### Cleanup
- `HY3_TODO.md` deleted - all its items are resolved in prior sessions or this one.

## Files Changed
```
studio_universal_gateway/
├── gateway_server.py                 (MODIFIED: PATCH writes dashboard_control)
├── dashboard/src/
│   └── App.vue                      (MODIFIED: applyControlOverrides dashboard_control fallback)
├── HY3_TODO.md                      (DELETED)
└── CHANGELOG.md                   (UPDATED)
```

---

# Session Log - 2026-07-13 (Round 5)

## Changes

### Bug Fix: Resync notification on every run
- **`dashboard/src/App.vue:273`** — Removed `showToast('Re-synced')` from `handleMessage`'s `'resynced'` case. The explicit `resync()` function already shows its own toast; the auto-resync during `run()` was causing a redundant notification.

### Bug Fix: Outputs never appear — studio_assets iteration crash
- **`dashboard/src/composables/useWebSocket.ts:100-113`** — `studio_assets` is a JSON object, not an array. `for...of` on an object throws silently (caught by line 22-25). Changed to `Object.entries()` with proper key-based widget lookup. Added `console.warn` to the catch block.
- Also fixed `flushImages()` data flow: `pendingStudioAssets` now receives `{name, ...asset}` entries.

### Bug Fix: Increment/Decrement not honoring canvas mode changes
- **`dashboard/src/App.vue:166`** — `run()` called `refreshData()` with `skipDashboardControl=false`, causing `dashboard_control` from prior dashboard sessions to override the canvas node's freshly changed control mode. Changed to `refreshData(true)` so the canvas mode is always honored on run.

### Bug Fix: Randomize generates seeds above MAX_SAFE_INTEGER, breaking increment
- **`dashboard/src/App.vue:72-77`** — `resolveValue`'s `randomize` case now caps the range at `Number.MAX_SAFE_INTEGER`. JavaScript's Number can't exactly represent integers above ~9e15; at 1.6e19 the ULP is 2048, so adding 1 doesn't change the value. Capping ensures all generated values are exactly representable and increment/decrement works correctly.

### Bug Fix: Text outputs not showing (studio_assets is array in msg.data.ui)
- **`dashboard/src/composables/useWebSocket.ts:100-115`** — Two bugs: `studio_assets` is an **array** (not dict) and lives in `msg.data.ui` (from `io.NodeOutput(ui=...)`). Fixed: check both `msg.data.output` and `msg.data.ui`; iterate with `for...of` using `asset.name` directly instead of `Object.entries` index.

### Feature: Input Gateway output slots show user-facing name
- **`web/js/studio_gateway.js:303-307`** — `handleNameClick` now updates `slot.name` to the trimmed name for Input Gateway output ports. Output slot names are not used in prompt serialization (connections are serialized by index), so it's safe. Output Gateway input slots remain `link_N` because they become kwargs keys.

### Feature: Image upload for image-type input widgets
- **`dashboard/src/components/widgets/ImageInput.vue`** (NEW) — File picker, uploads to `/upload/image`, preview thumbnail, replace/remove controls.
- **`dashboard/src/components/WidgetCard.vue`** — Routes `image` type to `ImageInput` for inputs and `ImageViewer` for outputs.

### Documentation Maintenance
- **`AGENTS.md`** — Added imperative maintenance rules section (Issues/Changelog/Contributing/Graphify/Agents update requirements)
- **`ISSUES.md`** — Appended 6 bug/feature entries
- **`CHANGELOG.md`** — This entry

## Files Changed
```
studio_universal_gateway/
├── web/js/
│   └── studio_gateway.js             (MODIFIED: slot.name update for Input Gateway)
├── dashboard/src/
│   ├── App.vue                      (MODIFIED: MAX_SAFE_INTEGER cap in randomize)
│   ├── components/WidgetCard.vue    (MODIFIED: image -> ImageInput/ImageViewer split)
│   ├── components/widgets/ImageInput.vue (NEW)
│   └── composables/useWebSocket.ts  (MODIFIED: Object.entries for studio_assets, catch warn)
├── AGENTS.md                         (MODIFIED: imperative maintenance rules)
├── ISSUES.md                         (MODIFIED: 6 bug/feature entries)
└── CHANGELOG.md                      (UPDATED)
```

---

# Session Log — 2026-07-13 (Round 6)

## Changes

### Bug Fix: Cancel button throws "PromptServer has no attribute 'interrupt'" (revised)
- **`gateway_server.py:6`** — Changed `import execution` to `import nodes`. The `execution` module does not expose `interrupt_processing()`.
- **`gateway_server.py:108`** — Changed `execution.interrupt_processing()` to `nodes.interrupt_processing()`. This matches ComfyUI's own `POST /interrupt` endpoint (`nodes.interrupt_processing()` at server.py:1148/1154).

## Files Changed
```
studio_universal_gateway/
├── gateway_server.py                 (MODIFIED: import nodes, call nodes.interrupt_processing())
├── ISSUES.md                         (MODIFIED: bug entry revised)
└── CHANGELOG.md                      (UPDATED)
```

---

# Session Log — 2026-07-13 (Round 7)

## Changes

### Feature: Output History Panel (replaces PastGenerations)

- **`App.vue`** — Added `runHistory` reactive array of per-run snapshots (`RunRecord`). `onExecuted` now captures ALL asset types (not just images) into a record with `{ name, data, ui_type, subfolder, type }` per asset. Added `showPanel` toggle ref and `clearHistory()` to clear all history.
- **`AssetPanel.vue`** (NEW) — Overlay panel that slides in/out from the right edge. Shows runs with collapsible headers, timestamps, and per-type asset rendering: image thumbnails with lightbox, metrics as formatted `<pre>`, color swatches, toggle true/false badges, text/numbers inline. Close on backdrop click or X button. Clear-all button.
- **`Toolbar.vue`** — Added `showPanel` prop and `togglePanel` emit. Grid-icon toggle button on the right toolbar area. Highlighted orange (`btn-active` style) when panel is open.
- **`DashboardLayout.vue`** — Removed `PastGenerations` import and passing (deprecated).
- **`PastGenerations.vue`** — DELETED (superseded by AssetPanel).

### Bug Fix: Asset Panel outputs not displaying
- **`AssetPanel.vue:29`** — Removed the overly broad `isImage()` fallback `a.data.includes('.')` that misclassified text with dots as images.
- **`App.vue:254`** — `onExecuted` now reads data from `w?.data ?? asset.data` (widget first). `flushImages()` sets data on the widget but not the asset, so `asset.data` was null for images filled from pendingImages.
- **`AssetPanel.vue`** — Removed `display: flex; flex-direction: column; gap: 8px` from `.panel-body`. The flex layout made content stretch to fit the viewport, preventing scroll. Replaced with block layout + `.run-card + .run-card { margin-top: 8px }`. Removed `max-height` hack.
- **`App.vue`** — Removed `nextRunId` counter. `runHistory` now uses `state.promptId` as the run label (prompt UUID from `execution_start` message).

### Bug Fix: Asset Panel scroll still broken (sticky header approach)
- **`AssetPanel.vue`** — Complete rewrite of layout:
  - Removed `@wheel.prevent` from overlay (was blocking child scroll events).
  - Overlay and panel are now sibling `position: fixed` elements (separate `<Transition>` wrappers) — no parent/child nesting.
  - `.asset-panel` is now the scroll container: `overflow-y: auto; overscroll-behavior: contain`.
  - `.panel-header` uses `position: sticky; top: 0; z-index: 1; background: var(--surface-ground)`.
  - `.panel-body` is normal flow block (no `position: absolute`, no `display: flex`, no scroll properties).
  - All `overflow: hidden` removed from panel and overlay.

### Feature: Cap oversized output content in Asset Panel
- **`AssetPanel.vue`** — Added viewport-relative max-height limits to prevent single outputs from dominating the panel:
  - `.asset-thumb`: `max-height: 50vh` (images)
  - `.asset-metrics pre`: `max-height: 40vh` (JSON, was hardcoded 120px)
  - `.asset-value`: `max-height: 40vh; overflow-y: auto` (text/numbers, was unconstrained)

## Files Changed
```
studio_universal_gateway/
├── dashboard/src/
│   ├── App.vue                      (MODIFIED: onExecuted uses promptId, removed nextRunId)
│   └── components/
│       └── AssetPanel.vue           (REWRITTEN: sticky header, panel is scroll container, sibling overlay)
├── ISSUES.md                        (MODIFIED: bug entry)
└── CHANGELOG.md                     (UPDATED)
```

---

# Session Log — 2026-07-13 (Round 8)

## Changes

### Feature: Lightbox zoom in main-column ImageViewer (instead of new tab)
- **`dashboard/src/components/widgets/ImageViewer.vue`** — Replaced `window.open(imgUrl, '_blank')` with `lightboxSrc` ref + in-page dialog overlay (fullscreen dark backdrop, click-to-dismiss, `@click.stop` on image). Matches AssetPanel lightbox UX. Added `<style scoped>` block with `.dialog-overlay` CSS.

### Feature: Cap widget output heights in main columns
- **`ImageViewer.vue`** — Image `<img>` now capped at `max-height: min(1024px, 80vh)` with `width: auto; height: auto` to preserve aspect ratio.
- **`MetricsCard.vue`** — `<pre>` now capped at `max-height: 40vh; overflow-y: auto` (was unbounded).
- **`TextDisplay.vue`** — Output text capped at `max-height: 30vh` (up from hardcoded `12rem`).

## Files Changed
```
dashboard/src/components/widgets/
├── ImageViewer.vue               (MODIFIED: lightbox overlay, max-height cap)
├── MetricsCard.vue               (MODIFIED: max-height 40vh)
└── TextDisplay.vue               (MODIFIED: max-height 12rem→30vh)
CHANGELOG.md                      (UPDATED)
```

---

# Session Log — 2026-07-13 (Round 9)

## Changes

### Fix: Image center alignment + native download in ImageViewer
- **`ImageViewer.vue`** — `<img>` now has `margin: 0 auto` for horizontal centering. `downloadImage()` replaced `window.open(url, '_blank')` with `<a>`-trick for native file download (no new tab).

### Feature: AssetPanel image hover overlay (zoom + download) + lightbox download
- **`AssetPanel.vue`** — Added `downloadAsset()` helper (works for both `AssetRecord` and lightbox objects). Image thumbnails now have a hover overlay with zoom + download buttons (matching ImageViewer style). Lightbox dialog wraps image in a relative container with a download button in the bottom-right corner.

## Files Changed
```
dashboard/src/components/
├── AssetPanel.vue               (MODIFIED: downloadAsset fn, hover overlay, lightbox download button)
└── widgets/
    └── ImageViewer.vue           (MODIFIED: margin:0 auto, native download)
CHANGELOG.md                      (UPDATED)
```

## 2026-07-13 — UI Polish Pass

### Changes

**Ponytail audit fixes:**
- `style.css`: deleted unused `.progress-glow` class & duplicate `@media (prefers-reduced-motion: reduce)` block (-6 lines)
- `public/icons.svg`: deleted unused SVG sprite
- `AssetPanel.vue`: inlined 4 single-use boolean helpers (`isImage`, `isMetrics`, `isColor`, `isToggle`) — removed 4 function declarations
- `WidgetCard.vue`: removed redundant `widget.control = mode` assignment (setControl already does it)
- `Toolbar.vue` `.batch-count`: replaced fallback CSS vars with project design tokens
- `ImageInput.vue` `.upload-btn`: replaced `--border-color, #555` fallback with `--input-border`

**CSS refinements:**
- Success color `#00FF66` → `#22C55E` across both themes (less harsh in dark & light)

**Toolbar restructure (grid layout):**
- Converted to CSS grid `1fr auto 1fr` for proper left/center/right alignment
- Progress bar + cancel + status now centered in the navbar always
- Progress bar always visible (idle at 0%)
- Version badge removed from toolbar (moved to footer)
- Standardized all toolbar elements to 28px height
- Batch counter: added `-` / `+` buttons, min=1, spinners hidden via CSS

**Idle timer:**
- After "Completed", auto-switches to "Idle" after 2 seconds
- Implemented via local `watch` on `state.status` with `setTimeout` cleanup on unmount

**Footer bar:**
- New thin footer (28px, top border) at bottom of page
- Centered `v0.1.0` version text

**Accessibility:**
- Added `aria-label` to all icon-only buttons (theme toggle, panel toggle, clear/close history, zoom/download overlays)
- Fixed nested `<label>` in ToggleInput.vue (inner `<label class="toggle">` → `<span class="toggle">`)

**Visual refinements:**
- "waiting for data...": removed stacked `opacity: 0.4` (kept italic + --text-secondary)
- Empty state "Connect Input/Output Gateway...": removed `opacity: 0.6`
- Toast container: moved from bottom-right to bottom-left (avoids AssetPanel overlap), bumped to 52px from bottom (above footer)
- AssetPanel empty state: added "no image" cross icon SVG above "No runs yet"

**Animations & responsive:**
- Widget cards: subtle fade-in + translateY animation on mount (respects `prefers-reduced-motion`)
- DashboardLayout: reduced padding at 900-1200px viewport width

### Files modified
```
dashboard/src/style.css                       (MODIFIED: deleted dead CSS, success color, toast position)
dashboard/src/App.vue                         (MODIFIED: added footer)
dashboard/src/components/Toolbar.vue          (REWRITTEN: flex + absolute center layout, batch +/- buttons, idle timer, a11y, standardized heights, wider progress bar)
dashboard/src/composables/useGatewayStore.ts   (MODIFIED: reset progress on non-running status)
dashboard/src/components/WidgetCard.vue        (MODIFIED: double set fix, card animation)
dashboard/src/components/AssetPanel.vue        (MODIFIED: inlined booleans, empty state icon, a11y)
dashboard/src/components/DashboardLayout.vue  (MODIFIED: responsive padding)
dashboard/src/components/widgets/ToggleInput.vue (MODIFIED: nested label fix)
dashboard/src/components/widgets/ImageViewer.vue (MODIFIED: a11y)
dashboard/src/components/widgets/ImageInput.vue   (MODIFIED: CSS tokens, a11y)
dashboard/public/icons.svg                    (DELETED)
```

## 2026-07-13 — Versioning Infrastructure (v0.1.0)

### Changes

- Created `VERSION` file at repo root as single source of truth (`0.1.0`)
- Wired `VERSION` into dashboard build via Vite `define` (`__APP_VERSION__` global constant)
- App.vue footer now renders `v{{ __APP_VERSION__ }}` dynamically instead of hardcoded text
- `AGENTS.md`: added Versioning section, fixed stale PrimeVue/Tailwind ref, added VERSION to file tree
- `CONTRIBUTING.md`: added "Releasing a Version" section with full git tag workflow + semver bump rules

### Files modified/created
```
VERSION                                   (CREATED)
dashboard/vite.config.ts                  (MODIFIED: read VERSION into define)
dashboard/src/App.vue                     (MODIFIED: dynamic version in footer)
AGENTS.md                                 (MODIFIED: versioning section, file tree)
CONTRIBUTING.md                           (MODIFIED: release workflow)
```

### Fixes applied during testing
- `VERSION`: changed to structured metadata format (semver first line, `---` separator, date + description)
- `vite.config.ts`: only reads first line of VERSION file (not whole metadata block)
- `useWebSocket.ts`: removed `updateProgress(1, 1)` call on `executing(null)` — was overwriting progress to 100% after `setStatus('completed')` already nulled it. Root cause: progress bar stuck at 100% on idle with batch count > 1.
- `main` branch cleaned: removed AGENTS.md, CHANGELOG.md, CONTRIBUTING.md, ISSUES.md, dashboard/src/, build config files — only runtime files remain on main.
- `CONTRIBUTING.md` updated with merge + cleanup workflow for future releases.
- `requirements.txt` created (zero external deps — ComfyUI provides everything).
```
