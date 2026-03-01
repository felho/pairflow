---
description: Produce approval-ready deep review summary for a bubble and optionally execute approve or request-rework
argument-hint: --id <name> [--repo <path>] [--mode deep|standard] [--decide approve|rework|none] [--message <text>]
allowed-tools: Bash, Read, AskUserQuestion
---

# Review Bubble

## Purpose

Generate a decision-ready review package for a bubble, then optionally execute `approve` or `request-rework` in a state-safe way.

## Variables

BUBBLE_ID: extracted from `--id` argument (required)
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
MODE: extracted from `--mode`, default `deep`
DECIDE: extracted from `--decide`, default `none`
MESSAGE: extracted from `--message` (required when `DECIDE=rework`)

## Instructions

- Default to `deep` explanation unless user explicitly asks short format.
- Always inspect state before any approval/rework command.
- Include evidence summary and distinguish hard evidence from soft statements.
- For rework, message must be specific, evidence-backed, actionable, and verifiable.
- If state is not `READY_FOR_APPROVAL`, do review-only output and do not execute decision commands.

## Error Messages

- Missing bubble id: `"Usage: ReviewBubble --id <name> [--repo <path>] [--mode deep|standard] [--decide approve|rework|none] [--message <text>]"`
- Invalid mode: `"Error: mode must be deep or standard. Got: {mode}."`
- Invalid decide value: `"Error: decide must be approve, rework, or none. Got: {decide}."`
- Rework without message: `"Error: decide=rework requires --message with actionable rework instructions."`
- Decision blocked by state: `"Error: approve/request-rework allowed only in READY_FOR_APPROVAL. Current state: {state}."`

## Workflow

1. Resolve and validate inputs.
- If `BUBBLE_ID` is empty -> STOP and report: `"Usage: ReviewBubble --id <name> [--repo <path>] [--mode deep|standard] [--decide approve|rework|none] [--message <text>]"`
- If `MODE` is not `deep` or `standard` -> STOP and report: `"Error: mode must be deep or standard. Got: {mode}."`
- If `DECIDE` is not `approve`, `rework`, or `none` -> STOP and report: `"Error: decide must be approve, rework, or none. Got: {decide}."`
- If `DECIDE=rework` and `MESSAGE` is empty -> STOP and report: `"Error: decide=rework requires --message with actionable rework instructions."`
- Resolve `REPO_PATH` from argument or `git rev-parse --show-toplevel`.

2. Read current lifecycle state and inbox.
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
pairflow bubble inbox --id <BUBBLE_ID> --repo <REPO_PATH>
```

3. Gather review context from worktree.
- Read bubble worktree path/branch from status metadata.
- Collect changed files and diff summary:
  ```bash
  git -C <BUBBLE_WORKTREE> status --short
  git -C <BUBBLE_WORKTREE> diff --stat
  ```
- Collect evidence logs if present:
  - `<BUBBLE_WORKTREE>/.pairflow/evidence/lint.log`
  - `<BUBBLE_WORKTREE>/.pairflow/evidence/typecheck.log`
  - `<BUBBLE_WORKTREE>/.pairflow/evidence/test.log`
- Read transcript tail for latest reviewer findings and convergence context.

4. Build review narrative.
- If `MODE=deep`, include:
  1. Goal and scope.
  2. High-level solution.
  3. File-by-file rationale.
  4. Behavior/risk and tradeoffs.
  5. Validation and evidence quality.
  6. Residual risks/open questions.
  7. Recommendation (`approve` or `rework`) with reason.
- If `MODE=standard`, provide concise version of the same structure.

5. Optionally execute decision.
- If `DECIDE=none` -> skip commands and return recommendation only.
- If `DECIDE` is `approve` or `rework` and state is not `READY_FOR_APPROVAL` -> STOP and report: `"Error: approve/request-rework allowed only in READY_FOR_APPROVAL. Current state: {state}."`
- If `DECIDE=approve` and state is `READY_FOR_APPROVAL` -> run:
  ```bash
  pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>
  ```
- If `DECIDE=rework` and state is `READY_FOR_APPROVAL` -> run:
  ```bash
  pairflow bubble request-rework --id <BUBBLE_ID> --repo <REPO_PATH> --message "<MESSAGE>"
  ```

6. Verify post-decision state when command executed.
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
```

## Report

```
Review summary:
- Bubble: <BUBBLE_ID>
- State snapshot: <STATE_BEFORE>
- Mode: <MODE>
- Change summary: <SUMMARY>
- Validation/evidence: <HARD+SOFT SUMMARY>
- Recommendation: <APPROVE/REWORK + WHY>
- Decision executed: <none/approve/rework>
- Post-decision state: <STATE_AFTER or n/a>
```

## STOP

Do not execute approve/request-rework outside READY_FOR_APPROVAL.
