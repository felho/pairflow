---
description: Propose a practical plan to bootstrap trusted test/typecheck evidence in the current project
argument-hint: [--repo <path>] [--depth quick|full]
allowed-tools: Bash, Read, Glob, AskUserQuestion
---

# Bootstrap Evidence

Creates an implementation-ready plan for adding trusted validation evidence to a project, so Pairflow reviewer loops can safely skip unnecessary re-runs when evidence is strong.

## Variables

REPO_PATH: extracted from `--repo` argument, or git top-level from cwd
DEPTH: extracted from `--depth`, default `quick`

## Instructions

- This workflow is planning-first. Do not implement changes unless the user explicitly asks.
- Focus on minimum viable improvements that fit the project's current tooling.
- Prefer reusing existing project commands (`lint`, `typecheck`, `test`, `check`) over adding Pairflow-specific custom commands.
- Include explicit guidance for how implementer handoff should attach evidence via `--ref`.

## Workflow

### 1. Discover Current Validation Surface

1. Resolve REPO_PATH (`git rev-parse --show-toplevel` if needed).
2. Inspect available project validation commands:
   - `package.json` scripts
   - `Makefile` targets
   - CI helper scripts (`scripts/`, `tools/`, `.github/workflows/`)
3. Identify which commands are currently used as quality gates (lint/typecheck/test).

### 2. Evaluate Evidence Readiness

For each required command, check whether current behavior already provides:

1. A stable log file location (inside repo/worktree scope).
2. Command provenance (which command was run).
3. Explicit result markers (exit code, pass/fail marker).
4. Easy attachment path for handoff refs (`pairflow pass --ref <log>`).

Classify each command as:
- `ready`
- `partially-ready`
- `missing`

### 3. Propose Minimal Upgrade Path

Produce 2-3 concrete options, ordered by effort:

1. **Low effort**: wrap existing scripts to write evidence logs (tee + explicit exit markers).
2. **Medium effort**: add helper wrapper script + standardized log envelope fields.
3. **Optional hardening**: lightweight rotation/cleanup policy and consistency checks.

For each option include:

1. Expected file paths.
2. Required script/prompt/doc updates.
3. Tradeoff (speed, reliability, maintenance overhead).

### 4. Output a Project-Specific First Iteration Plan

Return:

1. A short "why this matters for Pairflow loop speed/quality" context.
2. A step-by-step first iteration (max 7 steps).
3. A sample implementer handoff command with refs, for example:

```bash
pairflow pass --summary "Validation complete: lint/typecheck/test" \
  --ref .pairflow/evidence/lint.log \
  --ref .pairflow/evidence/typecheck.log \
  --ref .pairflow/evidence/test.log
```

4. A validation checklist (how to confirm evidence is trusted and usable).

### 5. Optional Follow-up

If the user asks for implementation next:

1. Recommend creating a dedicated task file first.
2. Then continue with CreateBubble workflow for execution.

## Reference

Use `references/evidence-example-pairflow.md` as a minimal pattern reference when proposing structure.

