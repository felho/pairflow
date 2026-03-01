---
name: UsePairflow
description: Manage pairflow bubble lifecycle with strict state-aware routing and optional evidence bootstrap planning. USE WHEN create/start bubble OR intervene/troubleshoot active bubbles OR review for approval OR close/approve/rework/commit/merge OR cleanup/recovery OR bootstrap evidence.
---

# UsePairflow

State-aware Pairflow orchestration skill.

This skill exists to avoid lifecycle mistakes (wrong command in wrong state, lost worktree changes, stuck watchdog loops, accidental rebase/merge chaos).

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreateBubble** | "create bubble", "start bubble", "kick off bubble" | `Workflows/CreateBubble.md` |
| **InterveneBubble** | "bubble stuck", "watchdog", "waiting human", "continue loop", "pass to implementer/reviewer" | `Workflows/InterveneBubble.md` |
| **TroubleshootBubble** | "pairflow issue", "something is odd", "status mismatch", "why command failed" | `Workflows/TroubleshootBubble.md` |
| **ReviewBubble** | "explain bubble changes", "detailed review", "approval review", "deep mode" | `Workflows/ReviewBubble.md` |
| **CloseBubble** | "close bubble", "bubble done", "approve and merge", "finalize bubble", "clean bubble" | `Workflows/CloseBubble.md` |
| **RecoverBubble** | "cancelled bubble but keep changes", "recover worktree", "commit cancelled bubble" | `Workflows/RecoverBubble.md` |
| **BootstrapEvidence** | "bootstrap evidence", "evidence plan", "trusted test evidence", "how to generate evidence logs" | `Workflows/BootstrapEvidence.md` |

## Core Principles

1. Always run `pairflow bubble status --id <id> --json` before any state-changing command.
2. Use the command that matches current state. Never guess.
3. Prefer Pairflow lifecycle commands over raw git/tmux when state progression is normal.
4. If bubble has valuable unmerged work but lifecycle state blocks normal flow (for example `CANCELLED`), switch to explicit recovery workflow.
5. Treat workflow boundaries as strict contracts: do only what the selected workflow is for.

## Workflow Scope Contract

- `CreateBubble` is **lifecycle-only**:
  - Allowed: pre-flight checks, `pairflow bubble create`, `pairflow bubble start`, `pairflow bubble status`.
  - Not allowed: reading/implementing/reviewing the feature/task content after bubble start.
- If the user asks only to start/create a bubble, stop immediately after reporting the started state.
- Any task execution inside the bubble must be a separate, explicit follow-up request.

## State-to-Action Map

- `CREATED` -> `pairflow bubble start`
- `RUNNING` -> no approve/rework yet; use normal loop commands (`pass`, `converged`) in agent panes
- `WAITING_HUMAN` -> use `pairflow bubble reply` (NOT `bubble request-rework`)
- `READY_FOR_APPROVAL` -> choose `pairflow bubble approve` OR `pairflow bubble request-rework`
- `APPROVED_FOR_COMMIT` -> `pairflow bubble commit --auto`
- `DONE` -> `pairflow bubble merge`
- `CANCELLED` with needed changes -> recovery workflow (manual git path from bubble worktree)

## Practical Guardrails

- Pre-flight before starting a bubble:
  - Start from clean `main` worktree.
  - Ensure no ongoing merge/rebase/cherry-pick.
  - If task file exists on `main`, commit it before bubble start.
- After `bubble start`, status may be briefly stale. Poll status once more before deciding it failed.
- If `--repo` lookup behaves unexpectedly, retry from repo root cwd and verify with `status --json`.
- Never start a second bubble for the same change while the first bubble still has unmerged code, unless intentionally abandoning and archiving that work.

## Examples

**Example 1: Watchdog timeout in WAITING_HUMAN**

```
User: "bubble stuck, timeout happened"
-> status shows WAITING_HUMAN
-> use `pairflow bubble reply --id <id> --message "..."`
```

**Example 2: Human wants rework but bubble is not in approval state**

```
If state is WAITING_HUMAN or RUNNING:
- do not use `bubble request-rework`
- route through `bubble reply` or continue normal reviewer->implementer pass flow
```

**Example 3: Deep approval review requested**

```
Use ReviewBubble (deep mode default)
-> file-by-file changes
-> validation evidence summary
-> explicit approve/rework recommendation
```

**Example 4: Cancelled bubble but work is valuable**

```
Use RecoverBubble workflow:
- commit on bubble branch from bubble worktree
- merge to main manually
- delete bubble artifacts
```

**Example 5: Bootstrap evidence planning**

```
Use BootstrapEvidence workflow:
- inspect project validation surface
- propose minimal evidence-generation plan
- provide handoff --ref pattern
```
