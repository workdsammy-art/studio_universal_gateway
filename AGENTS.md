# Studio Gateway - Agent Instructions

ComfyUI custom node providing dynamic I/O gateway nodes for dashboard/studio integration.

## ⚠️ IMPERATIVE MAINTENANCE RULES

These are NOT optional. Every session MUST follow these rules in order:

1. **ISSUES.md**: Append every bug found AND every bug verified as fixed AFTER confirmation. Write the entry immediately upon discovery/verification.
2. **CHANGELOG.md**: Append an entry for every file change made. Update BEFORE moving to the next task.
3. **CONTRIBUTING.md**: Update AFTER every git action (commit, push, merge, branch switch).
4. **Graphify**: Run `graphify` AFTER every successful build. The knowledge graph must stay current with the codebase.
5. **AGENTS.md**: Review for staleness at session start. If architecture patterns, file structure, or gotchas have changed, update before proceeding.

Violation of any of these rules is a documentation debt. Do not defer. Do not batch. Update as you go.

## Current State

- `StudioInputGateway` / `StudioOutputGateway` are implemented (V3 schema)
- JS frontend handles dynamic slot management, canvas UI rendering
- Dashboard is a Vue 3 SPA served at `/gateway` (PrimeVue 4 + Aura theme, Tailwind CSS)
- `POST /gateway/interrupt` endpoint for execution cancellation
- `CHANGELOG.md` tracks all session history — read first when resuming
- See `CONTRIBUTING.md` for the git workflow (branches, commit, push, merge — ELI5)

## V3 Node Patterns

**Imports:**
```python
from comfy_api.latest import ComfyExtension, io, ui
```

**Base Class:** `io.ComfyNode`

**Schema:** `define_schema()` → `io.Schema`

**Registration:** `ComfyExtension.get_node_list()`

**Execute:** `@classmethod def execute(cls, ...) -> io.NodeOutput`

**Entrypoint:**
```python
class StudioGatewayExtension(ComfyExtension):
    async def get_node_list(self):
        return [StudioInputGateway, StudioOutputGateway]

async def comfy_entrypoint():
    return StudioGatewayExtension()
```

## Dynamic Slot Pattern

Zero backend-declared inputs + JS-created slots eliminates ghost connectors:

- **Backend** `inputs=[]` — no declared input slots
- **JS** creates `link_N` slots dynamically via `addInput`/`addOutput`
- **Slot name** stays as `link_N` — `setupNodeInstance()` resets them on load; canvas renders user names from `store[name_N]` in `drawSlotOptions`
- **Execution** receives all connected `link_N` values via `**kwargs`

## Architecture

### Dynamic Input Slots

- **Backend** declares `inputs=[]` (no slots). JS creates all `link_N` slots.
- **Frontend JS** wraps `onConnectionsChange` via `beforeRegisterNodeDef`. When the last `link_N` slot receives a connection, it spawns `link_{N+1}`.
- **Node creation** calls `setupNodeInstance()` — critical for loaded workflows.
- **Execution** receives connected `link_N` values via `**kwargs`.

### Connection State Tracking

Output gateway's `execute` produces a `link_states` dict — each entry is `true` only if the corresponding `link_i` has a non-null value.

### In-Canvas UI Controls

Both nodes use `onDrawForeground` (row-based options table) and `onMouseDown` (context menus/prompt for name/widget type/position). Native ComfyUI widgets are neutralized (zero-size, disabled) — they exist only as state containers.

### Pin Name Binding

`syncSlotNames` (called on every draw) ensures each `store[name_i]` exists (lazy default). Slot names stay as `link_N` — `setupNodeInstance()` resets them on load, and the canvas renders user names from `store[name_N]` in `drawSlotOptions`.

## Node Implementations

### Studio Input Gateway

```python
class StudioInputGateway(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Studio_Universal_Gateway",
            display_name="Studio Input Gateway",
            inputs=[],
            outputs=[],
            is_output_node=False,
            hidden=[io.Hidden.unique_id],
            accept_all_inputs=True,
        )

    @classmethod
    def execute(cls, **kwargs):
        return io.NodeOutput()
```

### Studio Output Gateway

```python
class StudioOutputGateway(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Studio_Output_Gateway",
            display_name="Studio Output Gateway",
            inputs=[],
            outputs=[],
            is_output_node=True,
            hidden=[io.Hidden.unique_id],
            accept_all_inputs=True,
        )

    @classmethod
    def execute(cls, **kwargs):
        studio_assets = {}
        link_states = {}
        i = 0
        while True:
            link_key = f"link_{i}"
            name_key = f"name_{i}"
            if name_key not in kwargs and link_key not in kwargs:
                break
            is_connected = link_key in kwargs and kwargs[link_key] is not None
            link_states[link_key] = is_connected
            if is_connected:
                name = kwargs.get(name_key, f"output_{i}")
                data = kwargs[link_key]
                widget_type = kwargs.get(f"widget_type_{i}", "text")
                position = kwargs.get(f"position_{i}", "middle")
                studio_assets[name] = {"data": data, "ui_type": widget_type, "position": position}
            i += 1
        return io.NodeOutput(ui={"studio_assets": studio_assets, "link_states": link_states})
```

## JS Extension Patterns

**Registration:**
```javascript
app.registerExtension({
    name: "studio_universal_gateway.gateway",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (!["Studio_Universal_Gateway", "Studio_Output_Gateway"].includes(nodeType.comfyClass)) return;
    },
    async nodeCreated(node) {
        if (!["Studio_Universal_Gateway", "Studio_Output_Gateway"].includes(node.comfyClass)) return;
        setupNodeInstance(node);
    }
});
```

**Key Rules:**
- Use `beforeRegisterNodeDef` for prototype modification (not `nodeCreated`)
- `setupNodeInstance()` must be called at end of `nodeCreated`
- `setupNodeInstance()` resets slot names to `link_N` so `graphToPrompt()` emits correct keys; never change `slot.name` from `link_N` externally

## File Structure

```
studio_universal_gateway/
├── __init__.py              # WEB_DIRECTORY, ComfyExtension, comfy_entrypoint
├── gateway_nodes.py         # Backend: StudioInputGateway, StudioOutputGateway
├── gateway_server.py        # Routes: POST/GET /gateway/data, POST /gateway/run, POST /gateway/interrupt
├── web/js/studio_gateway.js # Frontend: dynamic slots, custom UI
├── AGENTS.md                # Agent instructions (this file)
├── CHANGELOG.md             # Session history / changelog
├── CONTRIBUTING.md          # Git workflow guide
├── README.md                # Project overview
```

## Persistence Pattern

**Storage:** `node.properties.gateway` (NOT `node.widgets_values`)
- Use `getStore(node)` helper → `node.properties.gateway` (lazy init)
- LiteGraph natively serializes `node.properties` via built-in `serialize()`/`configure()`
- No custom `onSerialize` hook needed
- `widgets_values` is ComfyUI's internal widget array — V3 nodes with `inputs=[]` may reset it to `[]`, wiping stored data

## Gotchas

- Zero backend inputs + JS-driven slots = no ghost connectors
- `link_states` dict tracks per-slot connection state
- Loaded workflows require `setupNodeInstance()` call
- `WEB_DIRECTORY` must be set in `__init__.py`
- V3 `io.Schema` with `inputs=[]` is valid for JS-driven dynamic slots
- Always use `comfy_api.latest` imports (or pin to `comfy_api.v0_0_2` for published nodes)
- Store node config in `node.properties.gateway`, never in `node.widgets_values` (ComfyUI resets it)
- Server reads gateway data from `workflow.nodes[].properties.gateway`
- Never change `slot.name` from `link_N` — `graphToPrompt()` uses `input.name` as the prompt key; changing it to a user-facing name breaks key matching in `execute()`
