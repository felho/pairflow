---
description: Create and start a pairflow bubble safely from clean base state
argument-hint: [--id <name>] [--task-file <path>] [--task <text>] [--repo <path>] [--base <branch>] [--print]
allowed-tools: Bash, Read, Glob, AskUserQuestion
---

# Create Bubble

## Purpose

Create a new bubble from task file or inline task with explicit pre-flight checks, deterministic ID generation, and collision-safe creation/start behavior.

## Variables

BUBBLE_ID: extracted from `--id` argument (optional)
TASK_FILE: extracted from `--task-file` argument (optional)
TASK_TEXT: extracted from `--task` argument (optional)
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
BASE_BRANCH: extracted from `--base`, default `main`
PRINT_ONLY: `true` if `--print` flag is present, default `false`

## Instructions

- Always use absolute paths in generated commands.
- Exactly one task source is expected (`TASK_FILE` or `TASK_TEXT`).
- Intent guardrail (critical):
  - If user intent is **plan/doc review or update** (e.g. "review this plan", "validate and update plan", "align task file"), default to inline `TASK_TEXT` that explicitly states:
    - docs-only scope
    - allowed paths (`@progress/*`, optional `@docs/*`)
    - forbidden scope (no product code implementation)
  - In this case, do **not** pass raw `--task-file` content as the only task definition.
  - Include the referenced plan path inside `TASK_TEXT` as input material.
- If intent is ambiguous between implementation vs plan/doc review, STOP and ask one explicit clarification question before create/start.
- If both are missing, search `plans/tasks/` and ask the user which task file to use.
- Default behavior: execute `create` and `start`.
- Print-only behavior (`--print`): print commands but run nothing.
- Pre-flight before create/start:
  - Base repo worktree must be clean (`git status --short` empty).
  - No active merge/rebase/cherry-pick state.
  - If task file is inside repo and is intended input, it MUST already be committed on base branch before bubble start.
  - This is a hard gate. If not committed, STOP and do not create/start.
  - Offer explicit decision checkpoint:
    - A) commit task file first (recommended), then continue
    - B) explicitly switch to inline `--task` snapshot (only if user approves this downgrade)
- If pre-flight fails: STOP and report exact blocker.
- Guardrail: this workflow must not execute task work (no implementation/review/testing/file edits related to task content).
- Post-start default mode is `bubble_autonomous` unless user explicitly requests `manual_assist`.

## Workflow

### 1. Resolve repo path

- Resolve REPO_PATH from `--repo` or `git rev-parse --show-toplevel`.
- Convert REPO_PATH to absolute path.

### 2. Resolve task source

- If TASK_FILE is provided:
  - Resolve to absolute path.
  - Verify file exists.
  - If intent is plan/doc review/update, transform to inline `TASK_TEXT` with explicit docs-only constraints and use that for bubble create.
- If TASK_TEXT is provided:
  - Use inline text.
- If neither TASK_FILE nor TASK_TEXT is provided:
  - Search `plans/tasks/` for candidate task files.
  - If candidates exist, ask the user to choose one.
  - If no candidates, STOP and report that task input is missing.
- If both TASK_FILE and TASK_TEXT are provided, STOP and ask for exactly one source.

### 3. Generate bubble id

- If `--id` is provided, use it as-is.
- Else derive deterministic kebab-case id from task source:
  - From TASK_FILE: filename without extension.
  - From TASK_TEXT: first 3-4 meaningful words, remove filler words (`the`, `a`, `an`, `for`, `to`, `and`, `of`), max 30 chars.
  - Example: `ui-phase1-server.md` -> `ui-phase1-server`
  - Example: `Implement the resume context feature` -> `impl-resume-context`

### 4. Check id collision

- Run:
  ```bash
  pairflow bubble list --repo <REPO_PATH>
  ```
- If collision found, append suffix: `-2`, `-3`, ... until free.

### 5. Pre-flight checks

- Verify clean worktree:
  ```bash
  git -C <REPO_PATH> status --short
  ```
  Must be empty.
- Verify no active merge/rebase/cherry-pick in REPO_PATH.
- If `TASK_FILE` is provided and resolves inside `<REPO_PATH>`:
  - Verify it is tracked:
    ```bash
    git -C <REPO_PATH> ls-files --error-unmatch <TASK_FILE_REL_TO_REPO>
    ```
  - Verify no unstaged/staged diff vs `HEAD`:
    ```bash
    git -C <REPO_PATH> diff --quiet HEAD -- <TASK_FILE_REL_TO_REPO>
    git -C <REPO_PATH> diff --cached --quiet -- <TASK_FILE_REL_TO_REPO>
    ```
  - If any check fails: STOP with blocker + decision checkpoint (A commit first / B explicit inline snapshot fallback).
- Capture and report the verified base commit SHA:
  ```bash
  git -C <REPO_PATH> rev-parse HEAD
  ```

### 6. Build commands

Task file create:

```bash
pairflow bubble create --id <BUBBLE_ID> --repo <REPO_PATH> --base <BASE_BRANCH> --task-file <TASK_FILE>
```

Inline task create:

```bash
pairflow bubble create --id <BUBBLE_ID> --repo <REPO_PATH> --base <BASE_BRANCH> --task "<TASK_TEXT>"
```

Start:

```bash
pairflow bubble start --id <BUBBLE_ID> --repo <REPO_PATH> --attach
```

### 7. Execute or print

- If PRINT_ONLY is `true`:
  - Print create + start commands.
  - Do not run commands.
- Else:
  - Run `pairflow bubble create ...`
  - Then run `pairflow bubble start ...`
  - If `start` fails with repo-lookup mismatch, retry from repo root cwd and recheck status json.
  - Never auto-downgrade from `--task-file` to inline `--task` unless user explicitly approves.

### 8. Verify state after start

Run:

```bash
pairflow bubble status --id <BUBBLE_ID> --json
```

- If state is still `CREATED` immediately after start, wait briefly and poll once more.

### 9. Hard stop after lifecycle actions

- After reporting create/start/status result, STOP.
- Do not run any non-pairflow commands except the pre-flight checks in this workflow.
- If user intent was start/create only, this stop is mandatory even if task context is already available.
- Do not begin direct implementation from this workflow, even in the bubble worktree.

## Report

Default mode (create/start executed):

```
Bubble <BUBBLE_ID> created and started.

Start session:
pairflow bubble start --id <BUBBLE_ID> --repo <REPO_PATH> --attach

Task source: <inline|task-file>
Verified base HEAD: <COMMIT_SHA>
Current state: <STATE>
Active agent: <AGENT or none>

Stopped after bubble start (no task execution in CreateBubble workflow).
```

Print-only mode (task file):

```
Commands ready:

1. Create:
pairflow bubble create --id <BUBBLE_ID> --repo <REPO_PATH> --base <BASE_BRANCH> --task-file <TASK_FILE>

2. Start:
pairflow bubble start --id <BUBBLE_ID> --repo <REPO_PATH> --attach
```

Print-only mode (inline task):

```
Commands ready:

1. Create:
pairflow bubble create --id <BUBBLE_ID> --repo <REPO_PATH> --base <BASE_BRANCH> --task "<TASK_TEXT>"

2. Start:
pairflow bubble start --id <BUBBLE_ID> --repo <REPO_PATH> --attach
```

## STOP

Do not run cleanup/finalization commands from this workflow.
Do not start implementing/reviewing the bubble task from this workflow.
