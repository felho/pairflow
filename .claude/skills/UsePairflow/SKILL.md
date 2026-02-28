---
name: UsePairflow
description: Manage pairflow bubble lifecycle and evidence-bootstrap planning. USE WHEN create bubble OR start bubble OR bubble cleanup OR bubble done OR approve and merge OR full cleanup OR bootstrap evidence.
---

# UsePairflow

Manages the pairflow bubble lifecycle — from creation through approval to cleanup.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreateBubble** | "create bubble", "start bubble", "kick off bubble" | `Workflows/CreateBubble.md` |
| **CleanBubble** | "bubble done", "bubble cleanup", "full cleanup", "approve and merge" | `Workflows/CleanBubble.md` |
| **BootstrapEvidence** | "bootstrap evidence", "evidence plan", "how to generate evidence logs", "trusted test evidence" | `Workflows/BootstrapEvidence.md` |

## Context

- **Repo path:** Auto-detected from cwd or specified with `--repo`
- **Worktree pattern:** `<repo-parent>/.pairflow-worktrees/<repo-name>/<bubble-id>/`
- **tmux session naming:** `pf-<bubble-id>`

## Examples

**Example 1: Create bubble from a task file (auto-ID)**
```
User: "create a bubble for the ui-phase1-server task"
→ Invokes CreateBubble workflow
→ Finds plans/tasks/ui-phase1-server.md
→ Auto-generates bubble ID: ui-phase1-server
→ Checks for collision, creates bubble, outputs start command
```

**Example 2: Create bubble with explicit ID**
```
User: "create a bubble --id my-custom-name --task-file plans/tasks/resume.md"
→ Uses "my-custom-name" as bubble ID instead of auto-generating
```

**Example 3: Full cleanup after bubble completes**
```
User: "the bubble review-ui-prd is done, full cleanup"
→ Invokes CleanBubble workflow
→ pairflow bubble approve → pairflow bubble commit --auto → pairflow bubble merge
→ CLI handles all state transitions and cleanup (tmux, worktree, branch)
```

**Example 4: Approve and merge**
```
User: "approve and merge the sync-prd-mockup bubble"
→ Invokes CleanBubble workflow
→ Same flow — uses pairflow CLI commands (never raw git/tmux)
```

**Example 5: Bootstrap evidence for a project**
```
User: "bootstrap evidence for this repo"
→ Invokes BootstrapEvidence workflow
→ Inspects project validation commands and handoff pattern
→ Returns a short implementation plan for trusted evidence logs + --ref usage
```
