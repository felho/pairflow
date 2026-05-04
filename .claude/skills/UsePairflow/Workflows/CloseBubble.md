---
description: Close an already-reviewed bubble using pairflow lifecycle commands
argument-hint: [--id <name>] [--repo <path>] [--push] [--delete-remote]
allowed-tools: Bash, Read, AskUserQuestion
---

# Close Bubble

## Purpose

Finalize a bubble after review using pairflow state-transition commands in strict order: approve -> commit -> merge -> delete finalized bubble artifacts. Skip steps that are already complete. For implementation bubbles, also perform post-merge doc/progress checks and archive the source task file.

## Variables

BUBBLE_ID: extracted from `--id` argument, or inferred from context/candidates
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
PUSH: `true` if `--push` flag is present, default `false`
DELETE_REMOTE: `true` if `--delete-remote` flag is present, default `false`
REVIEW_ARTIFACT_TYPE: read from bubble metadata (`document` or `code`) before merge
TASK_SOURCE_PATH: absolute task source file path extracted from bubble artifact metadata before merge
BASE_BRANCH: base branch read from bubble metadata before merge when available

## Instructions

- Always use `pairflow bubble` lifecycle commands for normal lifecycle state changes.
- Never use raw `git merge`, `tmux kill-session`, `git worktree remove`, or `git branch -d` directly in this workflow, except for the bounded merge-conflict recovery path below, where a raw `git merge <BASE_BRANCH>` may be run only inside the bubble worktree/branch to incorporate the latest base branch before retrying the Pairflow lifecycle merge.
- Always check status before deciding the next step.
- There is no public `pairflow bubble meta-review ...` operator namespace; use `bubble status` / `bubble restart` for inspection and remediation.
- For started remote bubbles, close lifecycle commands stay on the retained laptop-side routed model. Run `approve` / `commit` / `merge` / `delete` from the local repo; do not SSH into the remote clone and run those manually there.
- State progression reference:
  `CREATED -> PREPARING_WORKSPACE -> RUNNING -> WAITING_HUMAN -> META_REVIEW_RUNNING -> READY_FOR_HUMAN_APPROVAL (legacy: READY_FOR_APPROVAL) -> APPROVED_FOR_COMMIT -> COMMITTED -> DONE`
- Closure applies only when the bubble is at least `READY_FOR_HUMAN_APPROVAL` (legacy compatible: `READY_FOR_APPROVAL`).
- If merge conflict appears during merge, enter the bounded merge-conflict recovery path below. Report `blocked` only when the confidence gates fail or recovery validation fails.
- Do not pass `--push` / `--delete-remote` unless explicitly requested.
- Raw `git commit` is allowed only for:
  1. merge-conflict recovery commits on the bubble branch inside the bubble worktree after the confidence gates pass
  2. post-merge follow-up changes on `main` (README/docs/progress/task archive)
  It is not allowed for normal lifecycle approve/commit/merge state transitions.
- After successful merge, delete the finalized local bubble artifact with `pairflow bubble delete --force` unless a concrete safety blocker requires retaining it. A retained DONE/merged bubble is not a normal settled close result; report the explicit retained-bubble reason and stop or checkpoint according to the caller contract.

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
- If state is `META_REVIEW_RUNNING`, STOP and route to `TroubleshootBubble` first (`bubble status --json` + `bubble restart` when routing/runtime is stuck), then return to close flow after gate resolution.

### 3. Capture close context before merge

- Before merge, capture `REVIEW_ARTIFACT_TYPE` from:
  - `<REPO_PATH>/.pairflow/bubbles/<BUBBLE_ID>/bubble.toml` (`review_artifact_type`)
- Also capture `BASE_BRANCH` from the same `bubble.toml` when available.
- If `REVIEW_ARTIFACT_TYPE` is `code`, try to capture `TASK_SOURCE_PATH` from:
  - `<REPO_PATH>/.pairflow/bubbles/<BUBBLE_ID>/artifacts/task.md`
  - Expected first-line format: `Source: file (<ABSOLUTE_PATH>)`
- If task source cannot be parsed, continue close flow but report warning and skip automatic task archive.

### 4. Sequential close with skip-if-already-done

#### A) Approve step

- If state is `READY_FOR_HUMAN_APPROVAL` (or legacy `READY_FOR_APPROVAL`):
  1. Attempt clean approve:
     ```bash
     pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>
     ```
     Remote bubble note: still run this from the laptop/local repo so Pairflow can route it over SSH using the retained local pointer state.
  2. If clean approve succeeds, continue.
  3. If approve fails with `APPROVAL_OVERRIDE_REQUIRED` or `APPROVAL_PARITY_OVERRIDE_REQUIRED`, rerun only when the human close decision is explicit and you can state a concise justification:
     ```bash
     pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH> --override-non-approve --override-reason "<concise human justification>"
     ```
  4. If override would be required but no explicit human justification is available, STOP and ask the user before continuing.
- Else if state is already `APPROVED_FOR_COMMIT`, `COMMITTED`, or `DONE`, skip approve.

#### B) Commit step

- Re-read status.
- If state is `APPROVED_FOR_COMMIT`:
  ```bash
  pairflow bubble commit --id <BUBBLE_ID> --repo <REPO_PATH> --stage-all
  ```
  Remote bubble note: still run this from the laptop/local repo; do not commit lifecycle state by manually invoking Pairflow inside the remote clone.
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
  - Remote bubble note: this routed merge still runs from the laptop/local repo, imports the started-remote handoff, completes the durable merge in that local repo, then performs remote cleanup. Do not describe it as remote merge/push plus later local checkout sync.
- If merge returns conflict/error indicating manual conflict resolution is required, run section `4D. Merge-conflict recovery` before deciding whether the close is blocked.

#### D) Merge-conflict recovery

Run this section only after `pairflow bubble merge` reports a merge conflict or
manual-resolution requirement.

Purpose:

1. diagnose the conflict without guessing
2. resolve it automatically only when the resolution is mechanically confident
3. retry the Pairflow lifecycle merge after the bubble branch has been safely
   brought up to date with `BASE_BRANCH`
4. stop with a precise blocker when confidence or validation is insufficient

Immediate diagnostics:

1. Verify the main checkout is not left in a partial merge/rebase/cherry-pick state:
   ```bash
   git -C <REPO_PATH> status
   git -C <REPO_PATH> ls-files -u
   ```
2. Read the conflict shape without mutating `main`:
   ```bash
   MERGE_BASE=$(git -C <REPO_PATH> merge-base <BASE_BRANCH> bubble/<BUBBLE_ID>)
   git -C <REPO_PATH> merge-tree "$MERGE_BASE" <BASE_BRANCH> bubble/<BUBBLE_ID>
   git -C <REPO_PATH> diff --name-status "$MERGE_BASE"..<BASE_BRANCH>
   git -C <REPO_PATH> diff --name-status <BASE_BRANCH>..bubble/<BUBBLE_ID>
   git -C <REPO_PATH> log --oneline --left-right --cherry-pick <BASE_BRANCH>...bubble/<BUBBLE_ID>
   ```
3. Inspect only the conflicting files and their relevant local context.

Confidence gates for automatic recovery:

All gates must pass before editing or committing any recovery resolution.

1. Conflict source is explicit and bounded to files already touched by the
   bubble, base-branch aftermath files, or deterministic task/progress/archive
   metadata.
2. The intended resolution preserves both base-branch work and bubble work, or
   drops one side only when the dropped side is demonstrably obsolete generated
   or moved metadata.
3. No product, protocol, UX, persistence, or task-scope decision is needed.
4. No deletion/rename conflict is resolved by guessing ownership. Rename/delete
   conflicts are automatic only when one side is a canonical archive/move and
   the destination can be proven from task or plan metadata.
5. No unrelated active bubble or uncommitted main change touches the same files.
6. The required validation for the touched area can be run after recovery.
7. Recovery does not require rebase, history rewrite, force push, manual branch
   deletion, or lifecycle mutation outside Pairflow.

If any gate fails, STOP and report:

```text
Merge conflict recovery blocked:
- Failed gate: <gate>
- Conflicting files: <files>
- Why automatic resolution is unsafe: <reason>
- Main checkout state: <clean|partial-merge|partial-rebase|other>
```

Recovery execution when all gates pass:

1. Work in the bubble worktree from `PAIRFLOW_STATUS.worktreePath`, not on
   `main`.
2. Verify the bubble worktree is on `bubble/<BUBBLE_ID>` and clean before
   starting recovery:
   ```bash
   git -C <WORKTREE_PATH> status --short --branch
   ```
3. Merge the current base branch into the bubble branch:
   ```bash
   git -C <WORKTREE_PATH> merge <BASE_BRANCH>
   ```
   If this enters conflicts, resolve only the files that passed the confidence
   gates. Do not continue if new conflicts appear outside the diagnosed set.
4. Stage only recovery files and verify the staged file list:
   ```bash
   git -C <WORKTREE_PATH> diff --name-only --cached
   ```
5. Commit the recovery merge/resolution on the bubble branch:
   ```bash
   git -C <WORKTREE_PATH> commit -m "Resolve <BUBBLE_ID> merge conflict with <BASE_BRANCH>"
   ```
6. Run validation proportional to the recovered files:
   - docs/progress/task-only recovery: run the narrowest relevant doc/status
     checks and `git status`
   - source/runtime/UI recovery: run the bubble's required validation commands
     when available (`typecheck`, `lint`, `fitness`, and relevant tests), then
     any narrower tests needed for the conflict area
7. If validation fails, STOP and report the failing command and failure summary.
8. Re-run:
   ```bash
   pairflow bubble merge --id <BUBBLE_ID> --repo <REPO_PATH>
   ```

Recovery result reporting:

1. If retry merge succeeds, report `merge_conflict_recovered` and continue to
   post-merge cleanup.
2. If retry merge reports another conflict in the same files without new facts,
   STOP and report `blocked_merge_conflict_unresolved`.
3. If retry merge reports a new conflict surface, repeat diagnostics once only
   when the new conflict is clearly caused by the recovery merge; otherwise STOP.

### 5. Post-merge cleanup and verification

- If merge succeeded, run:
  ```bash
  pairflow bubble delete --id <BUBBLE_ID> --repo <REPO_PATH> --force
  ```
- If delete reports that the bubble no longer exists because merge already cleaned it up, treat that as `cleanup=already_absent` and continue.
- If delete fails for any other reason, STOP and report the retained-bubble reason. Do not report a fully settled close unless the caller explicitly accepts the retained bubble.
- Verify bubble no longer appears in `pairflow bubble list --repo <REPO_PATH>`.
- Verify repository is clean and no leftover merge/rebase/cherry-pick state exists.

### 6. Implementation follow-up (only for `REVIEW_ARTIFACT_TYPE=code`)

Apply only if merge succeeded.

1. Check whether operator-facing docs must change:
   - `README.md`: update when CLI behavior, flags, UX flow, or user-visible runtime behavior changed.
   - `docs/` content: update when workflow/policy/spec behavior changed beyond README-level notes.
   - Progress tracker: if repository has a relevant tracker (for example under `docs/` or `progress/`), update implementation status/evidence pointers.
2. If other clones/checkouts also need the merged base branch after a remote bubble merge, sync those explicitly:
   - use a project-safe fast-forward update flow (for example `git pull --ff-only origin <BASE_BRANCH>`) for those other checkouts.
   - Do not assume the current local checkout needs this after started-remote merge; it is already the durable merge target on the retained routed path.
3. Apply required updates immediately on `main`.
4. Archive the source task file (mirror layout) if `TASK_SOURCE_PATH` is known:
   - Source root must be: `<REPO_PATH>/plans/tasks/`
   - Relative task path: `<REL_PATH> = TASK_SOURCE_PATH minus <REPO_PATH>/plans/tasks/`
   - Archive destination: `<REPO_PATH>/plans/archive/tasks/<REL_PATH>`
   - Keep directory structure mirrored (root task stays at archive root; nested task keeps nested folder path).
   - Use `git mv` (create archive parent directories first if needed).
   - If destination already exists, STOP and ask user (no overwrite).
5. If follow-up edits or archive move were made, commit them on `main` with a clear message describing docs/progress/archive completion.

### 7. Special cases

- If bubble is already merged but still present as `DONE`, perform the same post-merge cleanup:
  ```bash
  pairflow bubble delete --id <BUBBLE_ID> --repo <REPO_PATH> --force
  ```
- If bubble is already merged/cleaned and no artifact remains, report `cleanup=already_absent`.
- If state is `CANCELLED` and the user wants to salvage code, route to `RecoverBubble` instead.

## Report

```
Bubble <BUBBLE_ID> close summary:

- Initial state: <STATE>
- Approved: <yes / skipped (state was <STATE>)>
- Committed: <yes (--stage-all) / skipped (state was <STATE>)>
- Merged: <yes / yes after merge_conflict_recovered / no>
- Merge target: bubble/<BUBBLE_ID> -> <base-branch or n/a>
- Cleanup: <deleted finalized bubble / already absent / retained with reason / skipped because merge did not complete>
- Implementation follow-up: <n/a (document bubble) / completed / skipped with reason>
- Task archive: <n/a / moved to plans/archive/tasks/... / skipped with reason>
- Follow-up commit on main: <yes / no>
- Final state: <STATE>
- Notes: <warnings, recovery evidence, or none>
```

## STOP

Do not run raw git/tmux cleanup commands for lifecycle transitions from this workflow.
