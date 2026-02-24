---
description: Full post-approval cleanup for a completed pairflow bubble
argument-hint: [--id <name>] [--repo <path>] [--push] [--delete-remote]
allowed-tools: Bash, Read, AskUserQuestion
---

# Clean Bubble

Full post-approval cleanup using pairflow CLI commands: approve → commit → merge (includes tmux kill + worktree + branch cleanup).

## Variables

BUBBLE_ID: extracted from `--id` argument, or from conversation context, or auto-detected (see step 1)
REPO_PATH: extracted from `--repo` argument, or git top-level from cwd
PUSH: `true` if `--push` flag is present (passed to merge), default `false`
DELETE_REMOTE: `true` if `--delete-remote` flag is present (passed to merge), default `false`

## Instructions

- **Always use `pairflow bubble` CLI commands** for state-changing operations (approve, commit, merge). Never use raw `git commit`, `git merge`, `tmux kill-session`, `git worktree remove`, or `git branch -d` directly — the CLI commands handle state transitions and all associated cleanup.
- Always check bubble status before taking any action.
- State progression: CREATED → PREPARING_WORKSPACE → RUNNING → WAITING_HUMAN → READY_FOR_APPROVAL → APPROVED_FOR_COMMIT → COMMITTED → DONE
- Cleanup requires the bubble to have reached **at least** READY_FOR_APPROVAL. Earlier states (RUNNING, WAITING_HUMAN, etc.) mean the bubble is still active.
- If state is already past a step, skip it (e.g., if COMMITTED, skip approve and commit).
- If merge conflicts occur, STOP immediately and report to the user.
- Do NOT pass `--push` to merge unless the user explicitly asks.

## Workflow

### 1. Resolve Bubble ID

- If BUBBLE_ID was provided via `--id` → use it.
- If BUBBLE_ID was NOT provided → try to infer from context:
  1. **Conversation context**: if a bubble was recently discussed or created in this session, use that ID.
  2. **Auto-detect**: run `pairflow bubble list --repo <REPO_PATH>` and check for bubbles in READY_FOR_APPROVAL, APPROVED_FOR_COMMIT, COMMITTED, or DONE state. If exactly one → use it. If multiple → list them and ask the user which one to clean up.
  3. If no candidates found → STOP and report: `"No bubble ID provided and none could be auto-detected. Specify with --id <name>."`

### 2. Check Status

Run `pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH>`.

- If state is RUNNING or WAITING_HUMAN → STOP and report: `"Bubble is still active (state: <state>). Cannot clean up yet."`
- If state is FAILED or CANCELLED → ask user if they want to force-clean (only merge can handle this if DONE; otherwise manual cleanup is needed).

### 3. Approve

- If state is READY_FOR_APPROVAL → run:
  ```bash
  pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>
  ```
- If state is already APPROVED_FOR_COMMIT, COMMITTED, or DONE → skip this step.

### 4. Commit

- If state is APPROVED_FOR_COMMIT (or just became APPROVED_FOR_COMMIT after step 3) → run:
  ```bash
  pairflow bubble commit --id <BUBBLE_ID> --repo <REPO_PATH> --auto
  ```
  The `--auto` flag stages all worktree changes and auto-generates the done-package if missing.
  This transitions: APPROVED_FOR_COMMIT → COMMITTED → DONE.
- If state is already COMMITTED or DONE → skip this step.

### 5. Merge

- If state is DONE (or just became DONE after step 4) → run:
  ```bash
  pairflow bubble merge --id <BUBBLE_ID> --repo <REPO_PATH>
  ```
  Add `--push` if PUSH is true, `--delete-remote` if DELETE_REMOTE is true.

  The merge command handles **all cleanup automatically**:
  - Merges bubble branch into base branch (--no-ff)
  - Kills tmux session (`pf-<BUBBLE_ID>`)
  - Removes runtime session
  - Removes worktree
  - Deletes local bubble branch

- If merge conflicts occur → STOP and report: `"Merge conflict detected. Please resolve manually."`

## Report

```
Bubble <BUBBLE_ID> cleanup complete:

- Approved: <yes / skipped (state was <state>)>
- Committed: <yes (--auto) / skipped (state was <state>)>
- Merged: bubble/<BUBBLE_ID> → <base-branch>
- Cleanup: tmux killed, worktree removed, branch deleted
```

## STOP

Do NOT push to remote unless `--push` was specified. Do NOT start any new bubbles. Do NOT proceed beyond reporting.
