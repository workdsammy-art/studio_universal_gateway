# Contributing — Git Workflow

Git is like **Save Points in a video game**. Branches are like **separate save files** for experimenting.

## Branches

| Branch | What it is | Contents | Rule |
|--------|-----------|----------|------|
| `main`  | Published version users install via ComfyUI Manager | Runtime files only (no dev docs, no source) | **NEVER** commit here directly. Strip dev files after merge. |
| `dev`   | Your workshop — try things, break things, fix things | Full workspace including dev tools, docs, source | Make ALL general changes here |
| `standalone-cli` | Headless API Gateway / CLI integration | Same as `dev` (full workspace) | Work on CLI, API, headless features here — forked from `dev` |

### Files on `main` (runtime only)

```
.gitignore
README.md
VERSION
__init__.py
gateway_nodes.py
gateway_server.py
web/js/studio_gateway.js
dashboard/dist/              # built SPA output
dashboard/.gitignore
requirements.txt
```

### Files on `dev` only (NOT on main)

```
AGENTS.md                    # AI assistant instructions
CHANGELOG.md                 # Session history
CONTRIBUTING.md              # This file — git workflow guide
ISSUES.md                    # Bug tracker
SUGGESTIONS.md               # Phased roadmap
dashboard/src/               # Vue source (maps to dist/)
dashboard/index.html         # SPA entry source
dashboard/package.json       # Build dependency
dashboard/package-lock.json  # Build dependency
dashboard/vite.config.ts     # Build tool
dashboard/tsconfig*.json     # TypeScript config
```

## One-Time Setup: Create the `dev` Branch

```bash
git checkout -b dev        # create dev branch (copies everything from main)
git push -u origin dev     # upload dev to GitHub so it exists there too
git checkout main          # switch back to main
```

Run this **once** when you start. After that, `dev` exists forever.

## Daily Workflow

### 1. Switch to dev (always start here)

```bash
git checkout dev
```

### 2. Make changes and save them

```bash
git add .                     # stage all changed files
git commit -m "what I did"    # create a save point with a description
git push                      # upload save point to GitHub (dev branch only)
```

### 3. When dev is ready → merge to main

```bash
git checkout main                # switch to main
git merge dev                    # pull all dev changes into main
git rm -r --cached AGENTS.md CHANGELOG.md CONTRIBUTING.md ISSUES.md SUGGESTIONS.md dashboard/src/ dashboard/index.html dashboard/package.json dashboard/package-lock.json dashboard/vite.config.ts dashboard/tsconfig.json dashboard/tsconfig.app.json dashboard/tsconfig.node.json
git commit -m "chore: strip dev files for release"
git tag vX.Y.Z
git push && git push --tags
```

### 4. Back to work

```bash
git checkout dev              # switch back to dev for next changes
```

## Common Commands Cheat Sheet

| Command | What it does |
|---------|-------------|
| `git checkout <branch>` | Switch between branches |
| `git checkout -b <name>` | Create a NEW branch (one-time) |
| `git add .` | Stage all changes for commit |
| `git commit -m "msg"` | Save point with a description |
| `git push` | Upload to GitHub |
| `git merge <branch>` | Copy changes from one branch into current |
| `git status` | See what files changed |

## Releasing a Version

Version is `vMAJOR.MINOR.PATCH` (semver). Source of truth is the `VERSION` file at repo root.

**Every merge to `main` must be tagged.** No exceptions.

### Release Steps

```bash
# 1. Update VERSION file (edit manually)
echo "0.2.0" > VERSION

# 2. Update dashboard/package.json to match
#    (edit the "version" field)

# 3. Commit the version bump on dev
git add VERSION dashboard/package.json
git commit -m "v0.2.0"
git push

# 4. Merge to main (with dev-file strip)
git checkout main
git merge dev
git rm -r --cached AGENTS.md CHANGELOG.md CONTRIBUTING.md ISSUES.md SUGGESTIONS.md dashboard/src/ dashboard/index.html dashboard/package.json dashboard/package-lock.json dashboard/vite.config.ts dashboard/tsconfig.json dashboard/tsconfig.app.json dashboard/tsconfig.node.json
git commit -m "chore: strip dev files for v0.2.0"

# 5. Tag and push
git tag v0.2.0
git push && git push --tags

# 6. Back to dev
git checkout dev
```

### Version Bump Rules

| Change | Bump |
|--------|------|
| Bug fixes, minor tweaks | PATCH (0.1.0 → 0.1.1) |
| New features, backward-compatible | MINOR (0.1.0 → 0.2.0) |
| Breaking API/workflow changes | MAJOR (0.1.0 → 1.0.0) |

## Golden Rule

**Never commit directly to `main`.** Always work on `dev`, then merge. After merging, always strip dev-only files before committing.

---

## Session Log

| Date | Action | Details |
|------|--------|---------|
| 2026-07-13 | `git commit` on `dev` | `8f7a596` — Session freeze: output history panel, widget height caps, lightbox zoom, native download |
| 2026-07-13 | `git merge` dev -> main | 8f7a596 fast-forward merged to main, pushed |
| 2026-07-13 | `graphify update` | 375 nodes, 468 edges, 27 communities - rebuilt
| 2026-07-13 | `git commit` on `dev` | v0.1.0 — UI polish pass + versioning infrastructure |
| 2026-07-13 | `git merge` dev -> main | v0.1.0 released |
| 2026-07-13 | `git tag` | v0.1.0 tagged and pushed |
| 2026-07-13 | `git rm` on `main` | Stripped dev-only files: AGENTS.md, CHANGELOG.md, CONTRIBUTING.md, ISSUES.md, dashboard/src/, build config |
