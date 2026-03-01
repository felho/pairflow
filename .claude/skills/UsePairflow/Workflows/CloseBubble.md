---
description: Close an already-reviewed bubble using pairflow lifecycle commands
argument-hint: [--id <name>] [--repo <path>] [--push] [--delete-remote]
allowed-tools: Bash, Read, AskUserQuestion
---

# Close Bubble

## Purpose

Finalize a bubble after review using pairflow state-transition commands in strict order: approve -> commit -> merge. Skip steps that are already complete.

## Variables

BUBBLE_ID: extracted from `--id` argument, or inferred from context/candidates
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
PUSH: `true` if `--push` flag is present, default `false`
DELETE_REMOTE: `true` if `--delete-remote` flag is present, default `false`

## Instructions

- Always use `pairflow bubble` lifecycle commands for state changes.
- Never use raw `git commit`, `git merge`, `tmux kill-session`, `git worktree remove`, or `git branch -d` directly in this workflow.
- Always check status before deciding the next step.
- State progression reference:
  `CREATED -> PREPARING_WORKSPACE -> RUNNING -> WAITING_HUMAN -> READY_FOR_APPROVAL -> APPROVED_FOR_COMMIT -> COMMITTED -> DONE`
- Closure applies only when the bubble is at least `READY_FOR_APPROVAL`.
- If merge conflict appears during merge, STOP immediately and report.
- Do not pass `--push` / `--delete-remote` unless explicitly requested.

## Workflow

### 1. Resolve repo + bubble id

- Resolve REPO_PATH from `--repo` or `git rev-parse --show-toplevel`.
- If BUBBLE_ID is provided, use it.
- If BUBBLE_ID is not provided, detect in this order:
  1. Conversation context candidate.
  2. `pairflow bubble list --repo <REPO_PATH>` and filter states in:
     - `READY_FOR_APPROVAL`
     - `APPROVED_FOR_COMMIT`
     - `COMMITTED`
     - `DONE`
  3. If exactly one candidate remains, use it.
  4. If multiple candidates remain, ask the user.
  5. If none remain, STOP and report: `No bubble ID provided and none could be auto-detected. Specify --id <name>.`

### 2. Read current state

Run:
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
```

- If state is `RUNNING` or `WAITING_HUMAN`, STOP and route to `InterveneBubble`.

### 3. Sequential close with skip-if-already-done

#### A) Approve step

- If state is `READY_FOR_APPROVAL`:
  ```bash
  pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>
  ```
- Else if state is already `APPROVED_FOR_COMMIT`, `COMMITTED`, or `DONE`, skip approve.

#### B) Commit step

- Re-read status.
- If state is `APPROVED_FOR_COMMIT`:
  ```bash
  pairflow bubble commit --id <BUBBLE_ID> --repo <REPO_PATH> --auto
  ```
- Else if state is already `COMMITTED` or `DONE`, skip commit.

#### C) Merge step

- Re-read status.
- If state is `DONE`:
  - Base command:
    ```bash
    pairflow bubble merge --id <BUBBLE_ID> --repo <REPO_PATH>
    ```
  - Add `--push` only if PUSH is true.
  - Add `--delete-remote` only if DELETE_REMOTE is true.
- If merge returns conflict/error indicating manual conflict resolution is required, STOP and report exact error.

### 4. Post-merge verification

- Verify bubble no longer appears as active in list.
- Verify repository is clean and no leftover merge/rebase/cherry-pick state exists.

### 5. Special cases

- If bubble is already merged/cleaned but forced cleanup is explicitly requested:
  ```bash
  pairflow bubble delete --id <BUBBLE_ID> --repo <REPO_PATH> --force
  ```
- If state is `CANCELLED` and the user wants to salvage code, route to `RecoverBubble` instead.

## Report

```
Bubble <BUBBLE_ID> close summary:

- Initial state: <STATE>
- Approved: <yes / skipped (state was <STATE>)>
- Committed: <yes (--auto) / skipped (state was <STATE>)>
- Merged: <yes / no>
- Merge target: bubble/<BUBBLE_ID> -> <base-branch or n/a>
- Cleanup: <performed / skipped>
- Final state: <STATE>
- Notes: <warnings or none>
```

## STOP

Do not run raw git/tmux cleanup commands from this workflow.
