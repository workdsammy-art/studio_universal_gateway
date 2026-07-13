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
