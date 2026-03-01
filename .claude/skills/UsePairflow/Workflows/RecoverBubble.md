---
description: Recover and finalize valuable code from a CANCELLED bubble when normal pairflow finalize path is blocked
argument-hint: --id <name> [--repo <path>] [--merge-target <branch>]
allowed-tools: Bash, Read, AskUserQuestion
---

# Recover Cancelled Bubble

## Purpose

Recover valuable code from a `CANCELLED` bubble via explicit git flow when normal pairflow approval/commit/merge lifecycle can no longer proceed.

## Variables

BUBBLE_ID: extracted from `--id` argument (required)
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
MERGE_TARGET: extracted from `--merge-target`, default `main`

## Instructions

- Use this workflow only when bubble state is `CANCELLED`.
- Commit only scoped files; never include unrelated changes.
- Prefer evidence-producing validation commands before commit (`pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check`).
- Use `git merge --ff-only` by default; do not auto-switch to non-ff merge.
- Do not run destructive history rewrites.

## Error Messages

- Missing bubble id: `"Usage: RecoverBubble --id <name> [--repo <path>] [--merge-target <branch>]"`
- Bubble not cancelled: `"Error: RecoverBubble requires CANCELLED state. Current state: {state}."`
- Bubble worktree missing: `"Error: Bubble worktree not found for {id}; recovery cannot continue."`
- No recoverable changes: `"Error: No working-tree changes found in bubble worktree."`
- FF merge failed: `"Error: ff-only merge failed for bubble/{id} -> {target}. Choose merge strategy explicitly."`

## Workflow

1. Resolve inputs and target branch.
- If `BUBBLE_ID` is empty -> STOP and report: `"Usage: RecoverBubble --id <name> [--repo <path>] [--merge-target <branch>]"`
- Resolve `REPO_PATH` from argument or `git rev-parse --show-toplevel`.
- Set `MERGE_TARGET` to provided value or `main`.

2. Validate state and locate worktree.
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
```
- If state is not `CANCELLED` -> STOP and report: `"Error: RecoverBubble requires CANCELLED state. Current state: {state}."`
- Resolve bubble worktree path from status json/runtime metadata.
- If worktree path is missing or not found -> STOP and report: `"Error: Bubble worktree not found for {id}; recovery cannot continue."`

3. Validate recoverable changes and run checks.
```bash
git -C <BUBBLE_WORKTREE> status --short
pnpm -C <BUBBLE_WORKTREE> lint
pnpm -C <BUBBLE_WORKTREE> typecheck
pnpm -C <BUBBLE_WORKTREE> test
```
- If no changed files are present -> STOP and report: `"Error: No working-tree changes found in bubble worktree."`
- If any validation command fails and it is not explicitly accepted as pre-existing baseline noise -> STOP and report failing command + reason.
- If any check is intentionally skipped, include explicit reason in report.

4. Commit scoped changes on bubble branch.
```bash
git -C <BUBBLE_WORKTREE> add <scoped files>
git -C <BUBBLE_WORKTREE> commit -m "<recovery commit message>"
```
- Verify staged set is in-scope before commit.

5. Merge into target branch from base repo.
```bash
git -C <REPO_PATH> checkout <MERGE_TARGET>
git -C <REPO_PATH> merge --ff-only bubble/<BUBBLE_ID>
```
- If ff-only merge fails -> STOP and report: `"Error: ff-only merge failed for bubble/{id} -> {target}. Choose merge strategy explicitly."`

6. Clean up bubble artifacts.
```bash
pairflow bubble delete --id <BUBBLE_ID> --repo <REPO_PATH> --force
```

7. Verify end state.
```bash
git -C <REPO_PATH> status --short
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
```
- Confirm target branch clean and bubble removed/cancelled cleanup completed.

## Report

```
Recovery summary:
- Bubble: <BUBBLE_ID>
- Recovery reason: <WHY>
- Validation: <PASS/FAIL/SKIPPED + notes>
- Recovery commit: <HASH>
- Merge: bubble/<BUBBLE_ID> -> <MERGE_TARGET> (<RESULT>)
- Cleanup: <RESULT>
- Residual risks: <none or details>
```

## STOP

Do not use rebase/reset/cherry-pick/rewrite history in this workflow.
