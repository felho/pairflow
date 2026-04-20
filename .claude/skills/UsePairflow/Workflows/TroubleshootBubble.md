---
description: Diagnose and resolve common Pairflow workflow issues quickly
argument-hint: --id <name> [--repo <path>] [--task <text>] [--task-file <path>]
allowed-tools: Bash, Read, AskUserQuestion
---

# Troubleshoot Bubble

## Purpose

Rapidly diagnose pairflow state/command mismatches and apply a safe next step with verification.

## Variables

BUBBLE_ID: extracted from `--id` argument (required)
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
TASK_TEXT: extracted from `--task` argument (optional; for ideation kickoff)
TASK_FILE: extracted from `--task-file` argument (optional; for ideation kickoff)

## Instructions

- Always capture baseline status/inbox before proposing a fix.
- Match command to state; do not guess lifecycle actions.
- Prefer absolute repo path when lookup ambiguity appears.
- Re-verify after each fix attempt.
- If diagnosis is inconclusive, stop with a concrete escalation path.
- For remote started-pointer runtime loss, stay fail-closed: do not imply that `bubble start` or `bubble restart` is already the supported recovery contract on top of preserved remote state.

## Error Messages

- Missing bubble id: `"Usage: TroubleshootBubble --id <name> [--repo <path>] [--task <text>] [--task-file <path>]"`
- Bubble not found: `"Error: Bubble {id} was not found in repository {repo}."`
- Missing task input for ideation kickoff: `"Error: ideation bubble in RUNNING round 0 requires --task <text> or --task-file <path> for bubble kickoff."`
- No clear diagnosis: `"Error: No matching troubleshooting pattern found. Capture diagnostics and escalate."`

## Workflow

1. Resolve inputs.
- If `BUBBLE_ID` is empty -> STOP and report: `"Usage: TroubleshootBubble --id <name> [--repo <path>] [--task <text>] [--task-file <path>]"`
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
  - `RUNNING`:
    - If ideation markers indicate pending kickoff (`round=0` and `bubble.toml` has `[ideation] task_pending=true`):
      - If neither `TASK_TEXT` nor `TASK_FILE` is provided -> STOP and report: `"Error: ideation bubble in RUNNING round 0 requires --task <text> or --task-file <path> for bubble kickoff."`
      - Else run `pairflow bubble kickoff --id <BUBBLE_ID> --repo <REPO_PATH> --task "<TASK_TEXT>"` or `pairflow bubble kickoff --id <BUBBLE_ID> --repo <REPO_PATH> --task-file <TASK_FILE>`.
    - Otherwise continue normal loop (`pass` / `converged`) instead of approval commands.
  - `META_REVIEW_RUNNING` -> inspect the canonical status snapshot; if routing appears stuck or runtime is unhealthy, run `pairflow bubble restart --id <BUBBLE_ID> --repo <REPO_PATH>` and re-check state.
  - `READY_FOR_HUMAN_APPROVAL` (legacy `READY_FOR_APPROVAL`) -> `approve` or `request-rework`.
    - If approve fails with `APPROVAL_OVERRIDE_REQUIRED` or `APPROVAL_PARITY_OVERRIDE_REQUIRED`, rerun only with explicit human justification via `bubble approve --override-non-approve --override-reason "<reason>"`.
- If command output contains `IDEATION_PASS_BLOCKED` or `IDEATION_CONVERGED_BLOCKED`, treat it as pending kickoff and apply the same `bubble kickoff` path.
- If watchdog timeout led to `WAITING_HUMAN` -> send precise `bubble reply`, then re-check.
- If runtime appears unhealthy (agent pane unresponsive, stale tmux/session ownership, token/login refresh required) -> run `pairflow bubble restart --id <BUBBLE_ID> --repo <REPO_PATH>`, then re-check status/inbox.
- Remote exception:
  - If status JSON shows a started remote bubble with runtime unavailable/missing (for example `remoteExecution.pointerKind="started"` and remote runtime availability/reason indicates missing/unavailable), STOP in fail-closed mode.
  - Report that persisted remote state may still exist, but this phase does not treat `bubble start` or `bubble restart` as the generic supported recovery path on top of that started pointer.
  - Use `pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json` or `pairflow bubble list --repo <REPO_PATH> --refresh` to confirm the remote diagnosis before escalating.
- If `bubble start` reported success but state remains `CREATED` -> wait briefly and poll status again from repo root cwd.
- If repo lookup confusion exists -> retry with explicit absolute `--repo` and verify `repoPath`/`worktreePath` in status json.
- If restart/recheck shows the bubble is no longer in `META_REVIEW_RUNNING`, treat the earlier diagnosis as stale, refresh status/inbox, then continue with state-correct routing.
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
