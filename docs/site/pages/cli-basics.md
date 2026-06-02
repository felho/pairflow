---
title: CLI Basics
description: Basic Pairflow CLI workflow for bubble creation, status, attach, and approval gates.
order: 4
---

# CLI basics

The installed command is `{{CLI_BIN}}`. Pairflow is intentionally lifecycle-bound: each command is valid only in the state where that transition is allowed.

## Common operator flow

```bash
pairflow bubble create --id my-task --repo . --base main --task-file plans/tasks/my-task.md --review-artifact-type code
pairflow bubble start --id my-task
pairflow bubble status --id my-task
pairflow bubble attach --id my-task
```

Agents normally move the implementation/review loop with canonical actor emits. Human approval remains explicit.

## Useful lifecycle commands

- `pairflow bubble list` shows active bubbles.
- `pairflow bubble status --id <id>` reads lifecycle state.
- `pairflow bubble open --id <id>` opens a bubble worktree in the configured editor.
- `pairflow bubble attach --id <id>` attaches to the tmux session.
- `pairflow bubble approve --id <id>` approves a bubble at the human approval gate.
- `pairflow bubble request-rework --id <id> --message "<text>"` sends approved-gate work back for changes.

See the repository README for the complete operator runbook and recovery guidance.

## Safety model

Pairflow records protocol history and state transitions. Avoid bypassing lifecycle commands with raw git or tmux operations unless you are following a documented recovery path.
