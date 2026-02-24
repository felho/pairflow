# Pairflow Web UI PRD (V1, implementation-aligned)

**Date:** 2026-02-24  
**Author:** felho  
**Status:** Draft

## Problem

Operating multiple Pairflow bubbles currently requires frequent terminal switching and repetitive CLI checks (`bubble list`, `status`, `inbox`, `approve`, `commit`, `merge`). As bubble count grows, operators lose context, react slower to blockers, and occasionally miss post-approval cleanup steps.

## Product Goal

Provide a local web UI that improves operator awareness and action speed while preserving the current CLI/core engine as source of truth.

Priority order:
1. Correctness and state integrity.
2. Lower operator coordination mistakes.
3. Speed improvements only when (1) and (2) stay intact.

## V1 Scope

### In scope

1. `pairflow ui` command to run a localhost UI server (foreground).
2. Bubble canvas with draggable cards and local position persistence.
3. Multi-repo monitoring using explicit repo inputs (no hidden orchestration logic).
4. Compact + expanded bubble views.
5. Timeline and inbox visibility derived from `transcript.ndjson` + `inbox.ndjson`.
6. Action buttons that call existing core behavior:
   - `start`
   - `approve`
   - `request-rework` (message required)
   - `reply` (message required)
   - `resume` (default reply)
   - `commit` (`--auto` path by default)
   - `merge` (optional `push` / `delete-remote`)
   - `open`
   - `stop`
7. Real-time updates via SSE with polling fallback.

### Out of scope

1. New orchestration/state machine logic in UI.
2. Browser-native chat between agents.
3. In-browser git diff viewer.
4. Auth/multi-user access (localhost single operator only).
5. Mobile-focused UI.
6. Global auto-discovery config such as `~/.pairflow/config.toml` in V1.
7. Cross-platform automated "attach pane in external terminal" launcher in V1.
8. Bubble creation from UI (`bubble create`) in V1.

## Current Core Constraints (must be reflected in UI)

1. Bubble states are fixed:
   - `CREATED`, `PREPARING_WORKSPACE`, `RUNNING`, `WAITING_HUMAN`, `READY_FOR_APPROVAL`, `APPROVED_FOR_COMMIT`, `COMMITTED`, `DONE`, `FAILED`, `CANCELLED`.
2. Action preconditions are strict:
   - `start`: `CREATED` (fresh start) or resumable runtime states when recovering runtime.
   - `approve` / `request-rework`: only in `READY_FOR_APPROVAL`.
   - `reply` / `resume`: only in `WAITING_HUMAN`.
   - `commit`: only in `APPROVED_FOR_COMMIT`.
   - `merge`: only in `DONE`.
   - `stop`: any non-final state.
3. `request-rework` requires message text.
4. `reply` requires message text.
5. `commit` transitions through `COMMITTED` to `DONE`; `COMMITTED` is usually short-lived.
6. `merge` already performs cleanup (tmux/session/worktree/branch). There is no separate `cleanup` command.
7. Attach means attaching to the whole tmux session (`tmux attach -t pf-<id>`), not individual panes. There is no per-pane attach CLI command.
8. Canonical truth remains file-backed (`state.json`, `transcript.ndjson`, `inbox.ndjson`, runtime session registry).
9. Transcript reader tolerates partial trailing NDJSON line; UI must not hard-fail on this.
10. `open` means invoking the same behavior as `pairflow bubble open` (`open_command` + `{{worktree_path}}` interpolation); UI should surface command errors directly.

## Retained implementation decisions

These decisions were previously captured and remain relevant for V1 implementation planning:

1. Frontend stack: React + Tailwind + shadcn/ui.
2. Bundling strategy: pre-built frontend assets served by the Pairflow UI server.
3. Project structure: separate `ui/` frontend package and server/API code in the main CLI repo.
4. Position persistence: client-side localStorage.
5. Real-time schema: single multiplexed SSE stream (`/api/events`) with `bubbleId` and `repoPath` in each event.

## UX Design

### Layout

1. Header:
   - global state counts
   - repo filter pills
   - reconnect indicator (SSE/polling status)
2. Canvas:
   - draggable compact cards
   - optional repo cluster labels
3. Expanded card:
   - timeline
   - pending inbox item highlights
   - state-gated actions

### Visual mapping

| State | LED | Border | Animation | Primary operator expectation |
|---|---|---|---|---|
| CREATED | Gray-blue | Default | None | Ready to start |
| PREPARING_WORKSPACE | Cyan | Default | Subtle pulse | Bootstrapping |
| RUNNING | Blue | Default | Agent activity dot | Agent currently active |
| WAITING_HUMAN | Amber | Amber glow | Attention pulse | Human response needed |
| READY_FOR_APPROVAL | Green | Green glow | Stable | Human decision needed |
| APPROVED_FOR_COMMIT | Green | Default | None | Commit now |
| COMMITTED | Teal | Default | Brief pulse | Transitioning to DONE |
| DONE | Gray | Default | Faded | Ready for merge or historical |
| FAILED | Red | Red glow | None | Needs manual intervention |
| CANCELLED | Slate | Dashed | None | Intentionally stopped |

### Action availability matrix

| State | Actions enabled |
|---|---|
| CREATED | Start, Stop |
| PREPARING_WORKSPACE | Stop |
| RUNNING | Open, Stop |
| WAITING_HUMAN | Reply, Resume, Open, Stop |
| READY_FOR_APPROVAL | Approve, Request Rework, Open, Stop |
| APPROVED_FOR_COMMIT | Commit, Open, Stop |
| COMMITTED | Open, Stop |
| DONE | Merge, Open |
| FAILED | Open |
| CANCELLED | Open |

Notes:
1. `Request Rework` and `Reply` open a required message modal.
2. Merge panel text must explicitly say: "Merge includes runtime/worktree cleanup."
3. Attach in V1 is a single button that copies `tmux attach -t pf-<bubble-id>` to the clipboard. The operator pastes it into any terminal. Direct terminal launch is deferred.

## API/Backend Contract (thin layer over existing core)

`pairflow ui` server must call shared core modules directly (not shelling CLI text).

### Repo scope

1. `pairflow ui --repo <path> [--repo <path> ...]`
2. If no `--repo`, default to git top-level from current cwd.

### Read endpoints

1. `GET /api/repos`
2. `GET /api/bubbles?repo=<path>`
   - backed by `listBubbles`
3. `GET /api/bubbles/:id?repo=<path>`
   - backed by `getBubbleStatus` + `getBubbleInbox`
4. `GET /api/bubbles/:id/timeline?repo=<path>`
   - backed by transcript read + presenter mapping

### Action endpoints

1. `POST /api/bubbles/:id/start`
2. `POST /api/bubbles/:id/approve`
3. `POST /api/bubbles/:id/request-rework` with `{ "message": "..." }`
4. `POST /api/bubbles/:id/reply` with `{ "message": "..." }`
5. `POST /api/bubbles/:id/resume`
6. `POST /api/bubbles/:id/commit` with `{ "auto": true, "message?": "...", "refs?": [] }`
7. `POST /api/bubbles/:id/merge` with `{ "push": false, "deleteRemote": false }`
8. `POST /api/bubbles/:id/open`
9. `POST /api/bubbles/:id/stop`

Error handling:
1. Invalid state transition/action precondition -> `409`.
2. Validation error (missing required message, bad body) -> `400`.
3. Missing bubble/repo -> `404`.
4. Unexpected runtime failure -> `500`.

## Real-time model

1. SSE stream: `GET /api/events`
2. Server emits repo+bubble scoped events on state/inbox/transcript/session changes.
3. Client reconnects with backoff.
4. Poll fallback every 2-5 seconds when SSE is disconnected.

## Edge cases to explicitly handle

1. Bubble deleted or moved between polls.
2. Runtime session stale vs state (`bubble reconcile` exists; UI should surface stale badge).
3. `merge` failing due to dirty repo, missing branch, or merge conflict.
4. `open` failing when worktree no longer exists after merge cleanup.
5. Transcript parse tolerance for partial trailing line.
6. Concurrent actions from terminal and UI (show fresh state after `409` and prompt retry).
7. Watchdog escalations (`RUNNING -> WAITING_HUMAN`) happening while UI is open.

## Mockup requirements check

The HTML mockup is directionally good, but V1 fidelity requires:
1. Include all lifecycle states in visual examples (not only running/waiting/approval/done).
2. Replace "Cleanup" as standalone step with "Merge (includes cleanup)".
3. Mark message-required actions (`request-rework`, `reply`) explicitly.
4. Attach button copies full tmux command (`tmux attach -t pf-<id>`) to clipboard.

## Success criteria

1. Operator sees all active bubbles for selected repos in one browser tab.
2. Operator can clear `WAITING_HUMAN` / `READY_FOR_APPROVAL` blockers without terminal context switching.
3. End-to-end action latency from seeing blocker to sending action is under 10 seconds for typical flows.
4. UI and CLI remain behaviorally equivalent because both delegate to shared core logic.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| UI diverges from CLI behavior | Medium | High | Use shared core modules for all actions; no duplicated orchestration |
| File watcher event storms | Medium | Medium | Debounce/coalesce + periodic poll safety net |
| Multi-repo scaling with many bubbles | Medium | Medium | Incremental loading and per-repo filtering |
| Attach UX inconsistency across OS terminals | High | Low | V1 copy-command pattern; terminal launcher deferred |
| User confusion around commit/merge flow | Medium | Medium | State-gated buttons + explicit "merge includes cleanup" messaging |

## Open questions (small, implementation-level)

1. Default `pairflow ui` port.
2. Whether repo scope should persist between launches (optional local UI preference file).
3. Whether browser notifications are needed in addition to existing optional sound notifications.
