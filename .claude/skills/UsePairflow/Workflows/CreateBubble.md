---
description: Create a pairflow bubble and output start command
argument-hint: [--id <name>] [--task-file <path>] [--task <text>] [--repo <path>] [--base <branch>] [--print]
allowed-tools: Bash, Read, Glob, AskUserQuestion
---

# Create Bubble

Creates a pairflow bubble and outputs the start command for the user to run.

## Variables

BUBBLE_ID: extracted from `--id` argument (optional — auto-generated if not provided)
TASK_FILE: extracted from `--task-file` argument (absolute path)
TASK_TEXT: extracted from `--task` argument (inline text)
REPO_PATH: extracted from `--repo` argument, or git top-level from cwd
BASE_BRANCH: extracted from `--base` argument, default `main`
PRINT_ONLY: `true` if `--print` flag is present, default `false`

## Instructions

- Either TASK_FILE or TASK_TEXT must be provided. If neither, search `plans/tasks/` for a matching file and suggest it.
- If TASK_FILE is a relative path, resolve it against the current working directory.
- Always use absolute paths in all commands.
- By default, **run the create command** automatically and **print the start command** for the user.
- If PRINT_ONLY is `true`, print both commands without running either.

## Workflow

### 1. Resolve Inputs

- Resolve REPO_PATH: run `git rev-parse --show-toplevel` if not provided.

### 2. Resolve Task Source

- If TASK_FILE provided → verify it exists, resolve to absolute path.
- If TASK_TEXT provided → use as inline task.
- If neither provided → search `plans/tasks/` for files and ask the user which to use.

### 3. Generate Bubble ID

- If BUBBLE_ID was provided via `--id` → use it as-is, skip to collision check.
- If BUBBLE_ID was NOT provided → derive it from the task source:
  - **From TASK_FILE**: take the filename without extension, convert to kebab-case. Example: `ui-phase1-server.md` → `ui-phase1-server`
  - **From TASK_TEXT**: take the first 3-4 meaningful words, convert to kebab-case, max 30 characters. Strip filler words (the, a, an, for, to, and, of). Example: `"Implement the resume context feature"` → `impl-resume-context`

### 4. Check for Collision

- Run `pairflow bubble list --repo <REPO_PATH>` and check if any existing bubble ID matches BUBBLE_ID.
- If collision found → append `-2` to the ID. Check again. If still collides, try `-3`, etc.
- Report the final BUBBLE_ID to the user before proceeding.

### 5. Create Bubble

- If PRINT_ONLY is `true` → skip to step 6.
- Run the create command:

```bash
pairflow bubble create --id <BUBBLE_ID> --repo <REPO_PATH> --base <BASE_BRANCH> --task-file <TASK_FILE>
```

Or with inline task:

```bash
pairflow bubble create --id <BUBBLE_ID> --repo <REPO_PATH> --base <BASE_BRANCH> --task "<TASK_TEXT>"
```

- If the command fails → STOP and report the error.

### 6. Output Start Command

Print the start command for the user to copy and run:

```
pairflow bubble start --id <BUBBLE_ID> --repo <REPO_PATH> --attach
```

If PRINT_ONLY is `true`, also print the create command from step 5.

## Report

**Default mode (create executed):**
```
Bubble <BUBBLE_ID> created.

Start:
pairflow bubble start --id <BUBBLE_ID> --repo <REPO_PATH> --attach
```

**Print-only mode (task file):**
```
Commands ready:

1. Create:
pairflow bubble create --id <BUBBLE_ID> --repo <REPO_PATH> --base <BASE_BRANCH> --task-file <TASK_FILE>

2. Start:
pairflow bubble start --id <BUBBLE_ID> --repo <REPO_PATH> --attach
```

**Print-only mode (inline task):**
```
Commands ready:

1. Create:
pairflow bubble create --id <BUBBLE_ID> --repo <REPO_PATH> --base <BASE_BRANCH> --task "<TASK_TEXT>"

2. Start:
pairflow bubble start --id <BUBBLE_ID> --repo <REPO_PATH> --attach
```

## STOP

Do NOT run the start command. Do NOT proceed beyond the report.
