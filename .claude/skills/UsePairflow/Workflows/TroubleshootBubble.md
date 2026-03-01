---
description: Diagnose and resolve common Pairflow workflow issues quickly
argument-hint: --id <name> [--repo <path>]
allowed-tools: Bash, Read, AskUserQuestion
---

# Troubleshoot Bubble

## Purpose

Rapidly diagnose pairflow state/command mismatches and apply a safe next step with verification.

## Variables

BUBBLE_ID: extracted from `--id` argument (required)
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`

## Instructions

- Always capture baseline status/inbox before proposing a fix.
- Match command to state; do not guess lifecycle actions.
- Prefer absolute repo path when lookup ambiguity appears.
- Re-verify after each fix attempt.
- If diagnosis is inconclusive, stop with a concrete escalation path.

## Error Messages

- Missing bubble id: `"Usage: TroubleshootBubble --id <name> [--repo <path>]"`
- Bubble not found: `"Error: Bubble {id} was not found in repository {repo}."`
- No clear diagnosis: `"Error: No matching troubleshooting pattern found. Capture diagnostics and escalate."`

## Workflow

1. Resolve inputs.
- If `BUBBLE_ID` is empty -> STOP and report: `"Usage: TroubleshootBubble --id <name> [--repo <path>]"`
- Resolve `REPO_PATH` from argument or `git rev-parse --show-toplevel`.

2. Capture baseline diagnostics.
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
pairflow bubble inbox --id <BUBBLE_ID> --repo <REPO_PATH>
```
- If `status` reports bubble not found -> STOP and report: `"Error: Bubble {id} was not found in repository {repo}."`
- Optionally capture transcript tail:
  ```bash
  tail -n 30 <REPO_PATH>/.pairflow/bubbles/<BUBBLE_ID>/transcript.ndjson
  ```

3. Classify issue and apply state-safe fix.
- If command failed due to wrong state -> map fix by state:
  - `WAITING_HUMAN` -> `pairflow bubble reply --id <BUBBLE_ID> --repo <REPO_PATH> --message "<next instruction>"`
  - `RUNNING` -> continue normal loop (`pass` / `converged`) instead of approval commands.
  - `READY_FOR_APPROVAL` -> `approve` or `request-rework`.
- If watchdog timeout led to `WAITING_HUMAN` -> send precise `bubble reply`, then re-check.
- If `bubble start` reported success but state remains `CREATED` -> wait briefly and poll status again from repo root cwd.
- If repo lookup confusion exists -> retry with explicit absolute `--repo` and verify `repoPath`/`worktreePath` in status json.
- If state is `CANCELLED` but code is needed -> route to `RecoverBubble`.

4. Verify resolution.
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
pairflow bubble inbox --id <BUBBLE_ID> --repo <REPO_PATH>
```
- If state/action still mismatched after one retry -> STOP and report: `"Error: No matching troubleshooting pattern found. Capture diagnostics and escalate."`

## Report

```
Troubleshoot summary:
- Bubble: <BUBBLE_ID>
- Symptom: <SYMPTOM>
- Root-cause category: <CATEGORY>
- Commands executed: <COMMANDS>
- Current state: <STATE>
- Recommended next action: <NEXT_STEP>
```

## STOP

Do not run destructive git history commands during troubleshooting.
