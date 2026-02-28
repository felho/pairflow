---
description: Propose a practical plan to bootstrap trusted test/typecheck evidence in the current project
argument-hint: [<repo-path>] [quick|full]
allowed-tools: Bash, Read, Glob, AskUserQuestion
---

# Bootstrap Evidence

## Purpose

Creates an implementation-ready plan for adding trusted validation evidence to a project, so Pairflow reviewer loops can safely skip unnecessary re-runs when evidence is strong.

## Variables

REPO_PATH: $1 or git top-level from cwd if not provided
DEPTH: $2 or "quick" if not provided

## Instructions

- This workflow is planning-first. Do not implement changes unless the user explicitly asks.
- Focus on minimum viable improvements that fit the project's current tooling.
- Prefer reusing existing project commands (`lint`, `typecheck`, `test`, `check`) over adding Pairflow-specific custom commands.
- Include explicit guidance for how implementer handoff should attach evidence via `--ref`.
- If DEPTH is `quick`, inspect only `package.json` scripts and top-level config. If `full`, also scan CI workflows, Makefile targets, and helper scripts.

## Relevant Files

- `references/evidence-example-pairflow.md` — Minimal evidence pattern reference for proposing structure

## Workflow

### 1. Validate Input

- If REPO_PATH cannot be resolved (e.g., `git rev-parse --show-toplevel` fails) → STOP with "Error: not inside a git repository at {REPO_PATH}"

### 2. Discover Current Validation Surface

1. Resolve REPO_PATH (`git rev-parse --show-toplevel` if needed).
2. Inspect available project validation commands:
   - `package.json` scripts
   - `Makefile` targets (if DEPTH is `full`)
   - CI helper scripts (`scripts/`, `tools/`, `.github/workflows/`) (if DEPTH is `full`)
3. Identify which commands are currently used as quality gates (lint/typecheck/test).

### 3. Evaluate Evidence Readiness

For each required command, check whether current behavior already provides:

1. A stable log file location (inside repo/worktree scope).
2. Command provenance (which command was run).
3. Explicit result markers (exit code, pass/fail marker).
4. Easy attachment path for handoff refs (`pairflow pass --ref <log>`).

Classify each command as:
- `ready`
- `partially-ready`
- `missing`

### 4. Propose Minimal Upgrade Path

Produce 2-3 concrete options, ordered by effort:

1. **Low effort**: wrap existing scripts to write evidence logs (tee + explicit exit markers).
2. **Medium effort**: add helper wrapper script + standardized log envelope fields.
3. **Optional hardening**: lightweight rotation/cleanup policy and consistency checks.

For each option include:

1. Expected file paths.
2. Required script/prompt/doc updates.
3. Tradeoff (speed, reliability, maintenance overhead).

### 5. Generate Report

Compile findings into the Report format below.

### 6. Optional Follow-up

- If user requests implementation → recommend creating a dedicated task file first, then continue with CreateBubble workflow for execution.

## Report

After completing the analysis, present:

1. **Why this matters** — short context on Pairflow loop speed/quality impact.
2. **First iteration plan** — step-by-step (max 7 steps).
3. **Sample handoff command** with refs:

```bash
pairflow pass --summary "Validation complete: lint/typecheck/test" \
  --ref .pairflow/evidence/lint.log \
  --ref .pairflow/evidence/typecheck.log \
  --ref .pairflow/evidence/test.log
```

4. **Validation checklist** — how to confirm evidence is trusted and usable.
