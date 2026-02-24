# Pairflow Web UI — One-Pager PRD

**Date:** 2026-02-24
**Author:** felho
**Status:** Draft

## Problem

Operating pairflow bubbles today requires switching between terminal windows, running CLI commands manually for status checks, approvals, and post-approval cleanup (commit, merge, worktree removal). When running multiple bubbles across multiple repos, the operator loses track of which bubbles need attention, wastes time on repetitive CLI sequences, and risks forgetting cleanup steps. The mental overhead grows linearly with concurrent bubble count.

## Solution Overview

A freeform canvas web UI served by `pairflow ui` on localhost. Bubbles are draggable visual objects on a dark canvas — the operator can spatially organize them (e.g., grouping related bubbles by repo or task). Each bubble shows its state at a glance in compact form and expands in-place to reveal the full transcript timeline and action buttons. The server watches `.pairflow/` directories for state changes and pushes updates via SSE. All actions (approve, attach, commit/merge/cleanup) wrap existing CLI commands — no new orchestration logic needed.

## Key Decisions

- **Freeform canvas, not list/detail** — bubbles are freely positionable on a 2D canvas. The operator drags them to create spatial groupings (by repo, by task, by priority). This matches the mental model of "bubbles floating in space" and scales visually to 5-7 concurrent bubbles on screen.
- **In-place expand, no page navigation** — clicking a compact bubble expands it on the canvas to show timeline + actions. No separate detail screen or page transition. Multiple bubbles can be expanded simultaneously.
- **Web UI, not desktop app** — an Electron-based desktop app was considered but dropped. The local web server already has full filesystem and process access (can open terminals, launch editors, watch files), so a desktop shell adds packaging/distribution complexity without functional benefit. The browser is just a thin view layer.
- **`pairflow ui` CLI command** — starts the HTTP server, opens the browser. No separate install or build step.
- **SSE for real-time updates** — simpler than WebSocket, sufficient for one-directional server-to-client state push. The client uses REST for actions.
- **Multi-repo support** — repos are tracked in a config file (`~/.pairflow/config.toml`). `pairflow bubble create` auto-registers the repo if not already listed. The UI can display and remove repos later.
- **Frontend: React + Tailwind + shadcn/ui** — React has the best AI code generation support (critical since the UI will be largely AI-built), Tailwind + shadcn/ui provide fast, polished components.
- **Pre-built frontend assets** — the frontend is compiled at package build time and bundled as static files. The server serves them directly — no runtime build step, instant startup.
- **Progressive post-approval flow** — three action buttons (Commit → Merge → Cleanup) that can be used individually for control, or the last button in the chain performs all preceding steps automatically (e.g., pressing Cleanup does commit + merge + cleanup in one shot).
- **tmux attach for human interaction** — instead of building a chat UI, the "Answer Question" and "Attach" buttons open a terminal window attached to the relevant tmux session pane. This reuses existing infrastructure.
- **Foreground server (V1)** — `pairflow ui` runs in the terminal foreground. Daemon mode deferred to later if needed.
- **Dark sci-fi aesthetic** — inspired by the Burst dashboard design system: dark backgrounds (#0a0a0a), glowing LED state indicators, server-rack style borders, subtle animations. Fits the "mission control" feel.

## Scope

### In Scope (V1)

- `pairflow ui` command: starts server, opens browser
- Freeform canvas with draggable bubble positioning
- Bubble position persistence (positions saved between sessions)
- Multi-repo bubble discovery and monitoring
- Compact bubble view: state LED, bubble ID, repo, round, one-line summary
- Expanded bubble view (in-place): transcript timeline, inbox items, contextual actions
- Action buttons: Approve, Request Rework, Commit, Merge, Cleanup
- Attach button: opens terminal attached to tmux session (implementer or reviewer pane)
- Open in Editor button: opens Cursor/VS Code at worktree path
- Real-time state updates via SSE file watching
- Browser notifications for human-blocking events
- Header bar: aggregated stats, repo filter pills

### Out of Scope

- In-browser chat with agents — tmux attach is sufficient for V1
- Bubble creation from UI — CLI or Claude Code is the creation interface
- Diff viewer in browser — Open in Editor covers this need
- Authentication/multi-user — localhost only, single operator
- Mobile/responsive design — desktop browser only
- Canvas zoom/pan — fixed viewport is sufficient for 5-7 bubbles

## UI Design

### Visual Language

Dark canvas with floating bubble cards. Inspired by the Burst dashboard design system:
- Background: `#0a0a0a` with subtle gradient
- Bubble cards: `#1a1a1a` → `#0f0f0f` gradient, `1px solid #333` border, `border-radius: 20px`
- LED state indicators: glowing colored dots with `box-shadow`
- Typography: system-ui, monospace for metadata
- Animations: attention pulse on WAITING bubbles, LED breathing, agent activity dots

### State → Visual Mapping

| State | LED Color | Border | Animation |
|-------|-----------|--------|-----------|
| RUNNING | Blue | Default (#333) | Agent dot pulsing |
| WAITING_HUMAN | Amber | Amber glow | Attention pulse on whole bubble |
| READY_FOR_APPROVAL | Green | Green glow | None (stable, inviting action) |
| APPROVED_FOR_COMMIT | Green | Default | None |
| DONE | Gray | Default | Faded opacity (0.4) |
| FAILED | Red | Red glow | None |

### Compact Bubble (default)

Small card (~260x120px) showing essential info at a glance:

```
┌─────────────────────────────────────────┐
│ ● fix-auth-token            ● APPROVAL  │
│                                         │
│ Reviewer found no issues.               │
│                                         │
│ bob  R4                                 │
└─────────────────────────────────────────┘
```

- Bubble ID + state badge with LED in the header
- One-line summary from latest transcript entry
- Repo name + round badge in footer
- Active agent indicator (pulsing dot + name) when RUNNING

### Expanded Bubble (on click)

Bubble grows in-place (~500x520px) to reveal timeline and actions:

```
┌──────────────────────────────────────────────────────────┐
│ fix-auth-token  bob · main · R4   ● READY FOR APPROVAL ×│
│                                                          │
│ [Approve] [Rework] [Attach impl↗] [Attach rev↗] [Open↗]│
│                                                          │
│ R1 ▶ codex (impl)                              14:01    │
│   Implemented token refresh. Tests pass.                 │
│                                                          │
│ R1 ◆ claude (rev)                               14:04   │
│   Race condition. Missing retry.          P1  P2        │
│                                                          │
│ R2 ▶ codex (impl)                              14:08    │
│   Fixed race with mutex. Added retry.                    │
│                                                          │
│ R2 ◆ claude (rev)                               14:11   │
│   Backoff max configurable.               P2            │
│                                                          │
│ R3 ▶ codex (impl)                              14:14    │
│   Made backoff configurable via env var.                 │
│                                                          │
│ R3 ◆ claude (rev)                    ✓ clean    14:17   │
│ R4 ◆ codex (rev — alternated)        ✓ clean    14:20   │
│                                                          │
│ ⬡ CONVERGENCE                                   14:20   │
│   Two clean passes with reviewer alternation.            │
│                                                          │
│ ┌ APPROVAL PACKAGE ─────────────────────────────────┐   │
│ │ Changed: src/auth/refresh.ts, refresh.test.ts     │   │
│ │ Commit: "Add token refresh with mutex and retry"  │   │
│ └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- Timeline entries parsed from transcript.ndjson
- ▶ = implementer pass, ◆ = reviewer pass
- Findings highlighted with severity badges (P1 red, P2 amber)
- Scrollable timeline for long conversations
- Close button (×) collapses back to compact

### Expanded Bubble — WAITING_HUMAN

Pending question shown as highlighted card above the timeline:

```
┌──────────────────────────────────────────────────────────┐
│ impl-resume-context  pairflow · R2      ● WAITING HUMAN ×│
│                                                          │
│ ┌ ❓ QUESTION FROM CODEX · 14:22 ──────────────────┐   │
│ │ How should fallback summary handle corrupt NDJSON  │   │
│ │ lines? (a) skip, (b) partial, (c) fail with error │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ [Answer in Terminal↗]  [Attach impl↗]  [Open in Cursor↗]│
│                                                          │
│ R1 ▶ codex  Added resumeSummary.ts ...          14:15   │
│ R1 ◆ claude  No fallback for corrupt lines  P1  14:19   │
│ R2 ❓ codex  Blocked — waiting for human        14:22   │
└──────────────────────────────────────────────────────────┘
```

### Expanded Bubble — Post-Approval

After approval, shows progressive action buttons:

```
┌──────────────────────────────────────────────────────────┐
│ fix-auth-token  bob · R4          ● APPROVED FOR COMMIT ×│
│                                                          │
│ Step 1        Step 2        Step 3                       │
│ [Commit]  →  [Merge]   →  [Cleanup]                     │
│                                                          │
│        [ 🚀 Commit + Merge + Cleanup ]                   │
│                                                          │
│ ✅ Committed: a3f8b2c "Add token refresh..."             │
│ ✅ Merged: bubble/fix-auth-token → main                  │
│ ⏳ Cleaning up worktree...                               │
└──────────────────────────────────────────────────────────┘
```

### Canvas Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⬡ Pairflow           ● 3 running  ● 1 waiting  ● 1 ready    [repos] [+] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│         bob                              pairflow                           │
│                                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌────────────────┐                    │
│   │●fix-auth    │  │●update-api  │  │●impl-resume    │                    │
│   │ APPROVAL    │  │ RUNNING     │  │ WAITING ~~~    │                    │
│   │ R4          │  │ R3 claude   │  │ R2 codex       │                    │
│   └─────────────┘  └─────────────┘  └────────────────┘                    │
│                                                                             │
│   ┌─────────────┐                                                          │
│   │●add-search  │         ┌─────────────┐                                  │
│   │ RUNNING     │         │ fix-login   │                                  │
│   │ R1 codex    │         │ DONE (faded)│                                  │
│   └─────────────┘         └─────────────┘                                  │
│                                                                             │
│         finder                                                              │
│                                                                             │
│   ┌──────────────┐                                                         │
│   │●refactor-db  │                                                         │
│   │ RUNNING      │                                                         │
│   │ R2 codex     │                                                         │
│   └──────────────┘                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Canvas behaviors:**
- Bubbles are freely draggable — positions persist between sessions
- Subtle repo group labels (faded text) appear near bubble clusters as visual anchors
- New bubbles auto-place in an open area near other bubbles from the same repo
- DONE bubbles fade to low opacity but remain on canvas until dismissed
- Attention-needing bubbles have animated border glow to draw the eye

### Interactive HTML mockup

A working prototype with drag-and-drop, expand/collapse, and animations is available at:
`docs/mockups/pairflow-ui-mockup.html`

## Success Criteria

- Operator can monitor all active bubbles across repos from one browser tab
- Spatial organization of bubbles provides intuitive visual overview of workload
- Time from "bubble needs attention" to "operator takes action" drops to under 10 seconds (vs current: switch terminal, run status, run inbox, run approve — ~30-60s)
- Post-approval cleanup (commit + merge + worktree removal) is one click
- Zero new orchestration logic — UI is purely a view + action layer over existing CLI/core

## Key Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| File watcher performance with many bubbles/repos | Low | Med | Debounce, watch only active bubble directories |
| Terminal launch differs across OS/terminal apps | Med | Med | Configurable terminal command, sensible macOS default |
| SSE connection drops on long idle | Low | Low | Auto-reconnect with exponential backoff |
| React + build tooling adds project complexity | Med | Med | Use Vite for minimal config; shadcn/ui reduces custom component work |
| Bubble position auto-placement (avoiding overlaps) | Med | Low | Simple grid-snap algorithm, manual drag overrides |

## Resolved Questions

- **Frontend framework:** React + Tailwind + shadcn/ui — best AI code generation support, familiar ecosystem.
- **Repo registry:** Config file (`~/.pairflow/config.toml`) with auto-registration on `bubble create`.
- **Server mode:** Foreground in V1. Daemon mode deferred.
- **Bundling:** Pre-built assets in npm package — industry standard, instant startup.
- **UI paradigm:** Freeform canvas with draggable bubbles — not a traditional list/detail layout.
- **Visual design:** Dark sci-fi aesthetic (dark backgrounds, glowing LED indicators, server-rack borders, subtle animations).
- **Frontend project structure:** Separate `ui/` directory at repo root with its own Vite config and package.json. CLI build copies `ui/dist/` into the server's static assets path. Clean separation between Node.js CLI (esbuild) and React frontend (Vite) toolchains.
- **SSE schema:** Single multiplexed stream (`/api/events`). Each event includes `bubbleId` and `repoPath`. Client-side filtering by repo. Simpler than per-bubble streams, sufficient for the expected 5-10 concurrent bubbles.
- **Position persistence:** Browser localStorage. Bubble positions are transient — no need for server-side persistence. Simple, no extra files.
- **Auto-placement:** New bubbles auto-place near other bubbles from the same repo, with overlap avoidance. Operator can drag to reposition afterward.

## Open Questions

None — all questions resolved.

## References

- [Pairflow Initial Design](pairflow-initial-design.md) — Phase 3 spec
- [Interactive HTML Mockup](mockups/pairflow-ui-mockup.html) — working prototype with drag-and-drop
