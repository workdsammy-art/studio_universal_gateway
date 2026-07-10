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
└── SESSION_LOG.md                (NEW)
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
└── SESSION_LOG.md                  (UPDATED)
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
└── SESSION_LOG.md                  (UPDATED)
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
└── SESSION_LOG.md                   (UPDATED)
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
└── SESSION_LOG.md                   (UPDATED)
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
└── SESSION_LOG.md                   (UPDATED)
```
