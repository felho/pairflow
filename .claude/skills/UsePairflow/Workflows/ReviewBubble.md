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
- In the findings section, label every item by origin:
  - `[Bubble]` when the issue comes from bubble transcript/tool output.
  - `[Sajat]`/`[Saját]` when it is an independent Codex finding from direct audit.
- Never present unlabeled findings in review output.
- For rework, message must be specific, evidence-backed, actionable, and verifiable.
- If state is not `READY_FOR_APPROVAL`, do review-only output and do not execute decision commands.
- Review flowban **ne** futtasd automatikusan a `pairflow bubble open` parancsot.
- A `pairflow bubble open` editor launchot indit (pl. Cursor), ezert csak akkor hasznald, ha a user ezt explicit keri.
- Worktree elereshez a `pairflow bubble status --json` `worktreePath` mezot hasznald, es ezen a path-on dolgozz kozvetlen `git -C`/file read parancsokkal.

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
- Read bubble worktree path/branch from status metadata (without `bubble open`).
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
- Build a short candidate finding list from transcript-origin items (`[Bubble]`) before independent code audit (`[Sajat]`/`[Saját]`) so final reporting can clearly separate sources.

4. Build review narrative.
- If `MODE=deep`, include:
  1. Goal and scope.
  2. High-level solution.
  3. File-by-file rationale.
  4. Findings (explicitly labeled `[Bubble]` or `[Sajat]`/`[Saját]`).
  5. Behavior/risk and tradeoffs.
  6. Validation and evidence quality.
  7. Residual risks/open questions.
  8. Recommendation (`approve` or `rework`) with reason.
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
- Findings (labeled): <[Bubble]/[Sajat] list>
- Validation/evidence: <HARD+SOFT SUMMARY>
- Recommendation: <APPROVE/REWORK + WHY>
- Decision executed: <none/approve/rework>
- Post-decision state: <STATE_AFTER or n/a>
```

Finding label example:
- `[Bubble][P2] reviewer transcript reports duplicate guard check in close flow`
- `[Saját][P2] independent code audit found missing state gate in review command path`

## STOP

Do not execute approve/request-rework outside READY_FOR_APPROVAL.
