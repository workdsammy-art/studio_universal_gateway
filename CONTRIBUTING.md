# Contributing — Git Workflow

Git is like **Save Points in a video game**. Branches are like **separate save files** for experimenting.

## Branches: `main` vs `dev`

| Branch | What it is | Rule |
|--------|-----------|------|
| `main`  | The published, working version that everyone uses | **NEVER** commit here directly |
| `dev`   | Your workshop — try things, break things, fix things | Make ALL changes here |

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
git checkout main             # switch to main
git merge dev                 # pull all dev changes into main
git push                      # upload updated main to GitHub
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

## Golden Rule

**Never commit directly to `main`.** Always work on `dev`, then merge.
