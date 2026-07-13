# Studio Universal Gateway

ComfyUI custom node providing dynamic I/O gateway nodes for dashboard/studio integration.

- **Studio Input Gateway** (`Studio_Universal_Gateway`) — defines input variables for a studio dashboard
- **Studio Output Gateway** (`Studio_Output_Gateway`) — collects outputs from connected nodes
- **Vue 3 Dashboard** served at `/gateway` — full input/output UI

## Project Structure

```
studio_universal_gateway/
├── __init__.py              # ComfyUI entry point
├── gateway_nodes.py         # Backend node definitions
├── gateway_server.py        # HTTP routes (data, run, interrupt, settings)
├── web/js/studio_gateway.js # LiteGraph JS extension (dynamic slots, canvas UI)
├── dashboard/               # Vue 3 SPA (PrimeVue + Tailwind)
├── AGENTS.md                # AI agent instructions
├── CHANGELOG.md             # Session history
├── CONTRIBUTING.md          # Git workflow guide
```

## Development

See `CONTRIBUTING.md` for the git workflow (branches, commit, push, merge).
