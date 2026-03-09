---
description: Close an already-reviewed bubble using pairflow lifecycle commands
argument-hint: [--id <name>] [--repo <path>] [--push] [--delete-remote]
allowed-tools: Bash, Read, AskUserQuestion
---

# Close Bubble

## Purpose

Finalize a bubble after review using pairflow state-transition commands in strict order: approve -> commit -> merge. Skip steps that are already complete. For implementation bubbles, also perform post-merge doc/progress checks and archive the source task file.

## Variables

BUBBLE_ID: extracted from `--id` argument, or inferred from context/candidates
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
PUSH: `true` if `--push` flag is present, default `false`
DELETE_REMOTE: `true` if `--delete-remote` flag is present, default `false`
REVIEW_ARTIFACT_TYPE: read from bubble metadata (`document` or `code`) before merge
TASK_SOURCE_PATH: absolute task source file path extracted from bubble artifact metadata before merge

## Instructions

- Always use `pairflow bubble` lifecycle commands for state changes.
- Never use raw `git merge`, `tmux kill-session`, `git worktree remove`, or `git branch -d` directly in this workflow.
- Always check status before deciding the next step.
- State progression reference:
  `CREATED -> PREPARING_WORKSPACE -> RUNNING -> WAITING_HUMAN -> META_REVIEW_RUNNING -> READY_FOR_HUMAN_APPROVAL (legacy: READY_FOR_APPROVAL) -> APPROVED_FOR_COMMIT -> COMMITTED -> DONE`
- Closure applies only when the bubble is at least `READY_FOR_HUMAN_APPROVAL` (legacy compatible: `READY_FOR_APPROVAL`).
- If merge conflict appears during merge, STOP immediately and report.
- Do not pass `--push` / `--delete-remote` unless explicitly requested.
- Raw `git commit` is allowed only for post-merge follow-up changes on `main` (README/docs/progress/task archive), not for lifecycle state transitions.

## Workflow

### 1. Resolve repo + bubble id

- Resolve REPO_PATH from `--repo` or `git rev-parse --show-toplevel`.
- If BUBBLE_ID is provided, use it.
- If BUBBLE_ID is not provided, detect in this order:
  1. Conversation context candidate.
  2. `pairflow bubble list --repo <REPO_PATH>` and filter states in:
     - `READY_FOR_HUMAN_APPROVAL`
     - `READY_FOR_APPROVAL` (legacy compatibility)
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
- If state is `META_REVIEW_RUNNING`, STOP and route to `InterveneBubble` (wait for autonomous gate completion or intervene safely).

### 3. Capture close context before merge

- Before merge, capture `REVIEW_ARTIFACT_TYPE` from:
  - `<REPO_PATH>/.pairflow/bubbles/<BUBBLE_ID>/bubble.toml` (`review_artifact_type`)
- If `REVIEW_ARTIFACT_TYPE` is `code`, try to capture `TASK_SOURCE_PATH` from:
  - `<REPO_PATH>/.pairflow/bubbles/<BUBBLE_ID>/artifacts/task.md`
  - Expected first-line format: `Source: file (<ABSOLUTE_PATH>)`
- If task source cannot be parsed, continue close flow but report warning and skip automatic task archive.

### 4. Sequential close with skip-if-already-done

#### A) Approve step

- If state is `READY_FOR_HUMAN_APPROVAL` (or legacy `READY_FOR_APPROVAL`):
  1. Read cached autonomous recommendation:
     ```bash
     pairflow bubble meta-review status --id <BUBBLE_ID> --repo <REPO_PATH> --verbose
     ```
  2. If recommendation is `approve` (or missing), run:
     ```bash
     pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>
     ```
  3. If recommendation is `rework` or `inconclusive`, run override approve:
     ```bash
     pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH> --override-non-approve --override-reason "<concise human justification>"
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

### 5. Post-merge verification

- Verify bubble no longer appears as active in list.
- Verify repository is clean and no leftover merge/rebase/cherry-pick state exists.

### 6. Implementation follow-up (only for `REVIEW_ARTIFACT_TYPE=code`)

Apply only if merge succeeded.

1. Check whether operator-facing docs must change:
   - `README.md`: update when CLI behavior, flags, UX flow, or user-visible runtime behavior changed.
   - `docs/` content: update when workflow/policy/spec behavior changed beyond README-level notes.
   - Progress tracker: if repository has a relevant tracker (for example under `docs/` or `progress/`), update implementation status/evidence pointers.
2. Apply required updates immediately on `main`.
3. Archive the source task file (mirror layout) if `TASK_SOURCE_PATH` is known:
   - Source root must be: `<REPO_PATH>/plans/tasks/`
   - Relative task path: `<REL_PATH> = TASK_SOURCE_PATH minus <REPO_PATH>/plans/tasks/`
   - Archive destination: `<REPO_PATH>/plans/archive/tasks/<REL_PATH>`
   - Keep directory structure mirrored (root task stays at archive root; nested task keeps nested folder path).
   - Use `git mv` (create archive parent directories first if needed).
   - If destination already exists, STOP and ask user (no overwrite).
4. If follow-up edits or archive move were made, commit them on `main` with a clear message describing docs/progress/archive completion.

### 7. Special cases

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
- Implementation follow-up: <n/a (document bubble) / completed / skipped with reason>
- Task archive: <n/a / moved to plans/archive/tasks/... / skipped with reason>
- Follow-up commit on main: <yes / no>
- Final state: <STATE>
- Notes: <warnings or none>
```

## STOP

Do not run raw git/tmux cleanup commands for lifecycle transitions from this workflow.
