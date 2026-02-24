---
description: Full post-approval cleanup for a completed pairflow bubble
argument-hint: [--id <name>] [--repo <path>]
allowed-tools: Bash, Read, AskUserQuestion
---

# Clean Bubble

Full post-approval cleanup: approve → commit → kill tmux → merge → remove worktree → delete branch.

## Variables

BUBBLE_ID: extracted from `--id` argument, or from conversation context, or auto-detected (see step 1)
REPO_PATH: extracted from `--repo` argument, or git top-level from cwd
WORKTREE_BASE: parent directory of REPO_PATH + `/.pairflow-worktrees/` + repo directory name
WORKTREE_PATH: WORKTREE_BASE + `/` + BUBBLE_ID
TMUX_SESSION: `pf-` + BUBBLE_ID
BUBBLE_BRANCH: `bubble/` + BUBBLE_ID

## Instructions

- Always check bubble status before taking any action.
- State progression: CREATED → PREPARING_WORKSPACE → RUNNING → WAITING_HUMAN → READY_FOR_APPROVAL → APPROVED_FOR_COMMIT → COMMITTED → DONE
- Cleanup requires the bubble to have reached **at least** READY_FOR_APPROVAL. Earlier states (RUNNING, WAITING_HUMAN, etc.) mean the bubble is still active.
- If state is already past READY_FOR_APPROVAL (APPROVED_FOR_COMMIT or COMMITTED), skip the approve step.
- Handle "no changes to commit" gracefully — the agents may have already committed.
- If merge conflicts occur, STOP immediately and report to the user.
- Do NOT push to remote unless the user explicitly asks.
- Use `--no-ff` for merges to preserve bubble history in git log.
- Commit messages must include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`.

## Workflow

### 1. Resolve Bubble ID

- If BUBBLE_ID was provided via `--id` → use it.
- If BUBBLE_ID was NOT provided → try to infer from context:
  1. **Conversation context**: if a bubble was recently discussed or created in this session, use that ID.
  2. **Auto-detect**: run `pairflow bubble list --repo <REPO_PATH>` and check for bubbles in READY_FOR_APPROVAL or APPROVED_FOR_COMMIT state. If exactly one → use it. If multiple → list them and ask the user which one to clean up.
  3. If no candidates found → STOP and report: `"No bubble ID provided and none could be auto-detected. Specify with --id <name>."`

### 2. Check Status

Run `pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH>` and `pairflow bubble inbox --id <BUBBLE_ID> --repo <REPO_PATH>`.

- If state is RUNNING or WAITING_HUMAN → STOP and report: `"Bubble is still active (state: <state>). Cannot clean up yet."`
- If state is DONE → STOP and report: `"Bubble is already DONE. Nothing to clean up."`
- If state is FAILED or CANCELLED → ask user if they want to clean up anyway (worktree + branch only, no merge).

### 3. Approve

- If state is READY_FOR_APPROVAL → run `pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>`.
- If state is already APPROVED_FOR_COMMIT or COMMITTED → skip this step.

### 4. Commit Worktree Changes

Check for uncommitted changes in the worktree:

```bash
cd <WORKTREE_PATH> && git status
```

- If there are untracked or modified files (excluding `.pairflow/` artifacts) → `git add` + `git commit` with descriptive message.
- If working tree is clean → skip, report "no uncommitted changes".

### 5. Kill tmux Session

```bash
tmux kill-session -t <TMUX_SESSION> 2>/dev/null
```

### 6. Merge to Main

From the main repo working directory (not the worktree):

```bash
git merge <BUBBLE_BRANCH> --no-ff -m "<merge message>"
```

- If untracked files block the merge (files exist in both main and bubble) → remove the main copy first, then merge.
- If merge conflicts occur → STOP and report: `"Merge conflict detected. Please resolve manually."`

### 7. Remove Worktree and Branch

```bash
git worktree remove <WORKTREE_PATH>
git branch -d <BUBBLE_BRANCH>
```

## Report

```
Bubble <BUBBLE_ID> cleanup complete:

- Approved: <yes / skipped (already approved)>
- Committed: <hash + message / no uncommitted changes>
- tmux: killed <TMUX_SESSION>
- Merged: <BUBBLE_BRANCH> → main (<merge hash>)
- Cleaned: worktree removed, branch deleted
```

## STOP

Do NOT push to remote. Do NOT start any new bubbles. Do NOT proceed beyond reporting.
