# Repo Registry — One-Pager PRD

**Date:** 2026-02-25
**Author:** felho
**Status:** Draft

## Problem

Pairflow's UI server requires explicit `--repo` flags at startup to know which repositories to monitor. When a user creates a bubble in a new repo (e.g., `pairflow bubble create --repo ~/dev/atv`), that repo doesn't appear in the UI — the user has to restart the UI server with the new repo added manually. This breaks the "set it and forget it" experience and makes multi-repo workflows painful.

## Solution Overview

Introduce a **global repo registry** (`~/.pairflow/repos.json`) that persistently tracks all repositories where pairflow has been used. The `bubble create` command auto-registers new repos into this registry. The UI server reads from the registry by default (no `--repo` flags needed), and watches the registry file for changes so new repos appear automatically without server restart.

## Key Decisions

- **File-based registry at `~/.pairflow/repos.json`** — simple, no daemon needed, consistent with pairflow's filesystem-first approach
- **Auto-registration on `bubble create` and `bubble start`** — both are natural entry points where a repo becomes "pairflow-enabled"
- **UI server watches registry file** — enables hot-reload of new repos without restart
- **`--repo` flags filter the registry** — when provided, only show repos matching the flags (subset of registry). When absent, show all registered repos. Flags never bypass the registry; they narrow it.
- **Registry stores repo paths + metadata** — not just paths; include `addedAt` timestamp and optional label for future UI grouping
- **EventsBroker supports dynamic repo addition** — new `addRepo()`/`removeRepo()` methods to hot-add repos without restarting the broker

## Scope

### In Scope (V1)

- `~/.pairflow/repos.json` file format and read/write utilities
- Auto-registration in `bubble create` and `bubble start` (add repo if not present)
- `pairflow repo list` command to show registered repos
- `pairflow repo add <path>` / `pairflow repo remove <path>` manual management
- UI server reads registry as default repo source (when no `--repo` flags given)
- UI server watches `repos.json` for changes and hot-reloads repo list
- EventsBroker `addRepo()` / `removeRepo()` methods for dynamic repo management (add watchers, start scanning, emit events — all without restart)
- Stale repo detection: repos whose paths no longer exist are flagged (not auto-removed)

### Out of Scope

- Repo grouping or labeling in UI — future enhancement
- Auto-discovery by scanning filesystem for `.pairflow` directories — too expensive, not needed
- Remote repo support — local-only for now
- Migration tooling for existing setups — manual `pairflow repo add` is sufficient

## Success Criteria

- Creating a bubble in a new repo auto-registers it and the bubble appears in the running UI within 5 seconds
- Starting `pairflow ui` with no flags monitors all registered repos
- `pairflow repo list` shows all known repos with their status (exists / missing)

## Key Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Registry file corruption (concurrent writes from multiple bubble creates) | Low | Med | Use file locking (same pattern as transcript append) |
| Stale repos accumulate over time | Med | Low | `repo list` shows missing repos; `repo remove` for cleanup |
| UI server needs restart-free hot-reload of EventsBroker repos | Med | Med | Watch `repos.json` + add dynamic repo addition to EventsBroker |

## Hot-Reload Flow

When the UI server is already running and `bubble create` targets a new repo:

1. `bubble create --repo ~/dev/atv` → auto-registers `atv` in `~/.pairflow/repos.json` (file-locked write)
2. UI server's `fs.watch` on `repos.json` detects the change
3. UI server diffs current repo set vs updated registry → discovers `atv` is new
4. Calls `EventsBroker.addRepo("~/dev/atv")` which:
   - Runs initial `scanRepo()` for the new repo
   - Sets up `fs.watch` on `.pairflow/`, `.pairflow/bubbles/`, and per-bubble files
   - Emits `bubble.updated` events for any existing bubbles
5. Frontend receives events via SSE → new bubbles appear in the UI

The reverse flow (repo removed from registry) calls `EventsBroker.removeRepo()` which tears down watchers and emits `bubble.removed` for all bubbles in that repo.

## Open Questions

- Should the UI server periodically validate that registered repos still exist, or only flag them on startup?

## References

- Current UI server repo scope: `src/core/ui/repoScope.ts`
- EventsBroker (needs dynamic repo support): `src/core/ui/events.ts`
- Bubble create entry point: `src/core/bubble/createBubble.ts`
