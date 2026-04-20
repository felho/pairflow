---
description: Handle stuck or active bubbles safely using state-aware intervention
argument-hint: --id <name> [--repo <path>] [--message <text>] [--task <text>] [--task-file <path>]
allowed-tools: Bash, Read, AskUserQuestion
---

# Active Bubble Intervention

## Purpose

Handle an active or stuck bubble without breaking lifecycle rules, and apply the correct command for the current state.

## Variables

BUBBLE_ID: extracted from `--id` argument (required)
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
MESSAGE: extracted from `--message` argument (optional)
TASK_TEXT: extracted from `--task` argument (optional; only for ideation kickoff)
TASK_FILE: extracted from `--task-file` argument (optional; only for ideation kickoff)

## Instructions

- Always read `status --json` and `inbox` before any action.
- Never run `request-rework` outside `READY_FOR_HUMAN_APPROVAL` (legacy `READY_FOR_APPROVAL`).
- Never run `approve` while bubble is `RUNNING` or `WAITING_HUMAN`.
- Prefer explicit, targeted human messages; avoid vague replies.
- Re-check state after every state-changing command.
- For runtime/process restart intent (token budget/login refresh, pane appears stuck), use `pairflow bubble restart` instead of manual tmux commands.
- Remote exception: for started remote bubbles that already report runtime loss, do not assume `bubble restart` or `bubble start` is the supported recovery path on top of preserved remote state in this phase.
- Default mode is `bubble_autonomous`: do not perform direct implementation edits from this workflow.
- Switch to `manual_assist` only on explicit user request; never switch silently.

## Error Messages

- Missing bubble id: `"Usage: InterveneBubble --id <name> [--repo <path>] [--message <text>] [--task <text>] [--task-file <path>]"`
- Missing message for waiting-human reply: `"Error: WAITING_HUMAN requires --message <text> for bubble reply."`
- Missing message for rework request: `"Error: request-rework in READY_FOR_HUMAN_APPROVAL (legacy READY_FOR_APPROVAL) requires --message with actionable rework instructions."`
- Missing task input for ideation kickoff: `"Error: ideation bubble in RUNNING round 0 requires --task <text> or --task-file <path> for bubble kickoff."`
- Rework not allowed in state: `"Error: request-rework is allowed only in READY_FOR_HUMAN_APPROVAL (legacy READY_FOR_APPROVAL). Current state: {state}."`
- Unsupported state for intervention: `"Error: Intervention workflow does not handle state: {state}."`

## Workflow

1. Resolve inputs.
- If `BUBBLE_ID` is empty -> STOP and report: `"Usage: InterveneBubble --id <name> [--repo <path>] [--message <text>] [--task <text>] [--task-file <path>]"`
- Resolve `REPO_PATH` from argument or `git rev-parse --show-toplevel`.

2. Read current state and inbox.
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
pairflow bubble inbox --id <BUBBLE_ID> --repo <REPO_PATH>
```
- If state is `RUNNING`, check whether this is an ideation-pending bubble (`round=0` + `ideation.task_pending=true`) from:
```bash
cat <REPO_PATH>/.pairflow/bubbles/<BUBBLE_ID>/bubble.toml
```

3. Apply state-specific intervention.
- If intent is explicit runtime restart for a non-final active bubble (for example token/login refresh, stalled agent process) -> run:
  ```bash
  pairflow bubble restart --id <BUBBLE_ID> --repo <REPO_PATH>
  ```
  Then continue with step 5 verification.
- Before using the generic restart path, check for the remote fail-closed exception in the status JSON:
  - if the bubble is remote and already shows started-pointer runtime loss/unavailable remote runtime, STOP and route to `TroubleshootBubble` instead of running `restart`
- If state is `RUNNING` and ideation is pending (`round=0` + `ideation.task_pending=true`):
  - If neither `TASK_TEXT` nor `TASK_FILE` is provided -> STOP and report: `"Error: ideation bubble in RUNNING round 0 requires --task <text> or --task-file <path> for bubble kickoff."`
  - If both are provided -> STOP and report that kickoff accepts exactly one task input.
  - Else run:
    ```bash
    pairflow bubble kickoff --id <BUBBLE_ID> --repo <REPO_PATH> --task "<TASK_TEXT>"
    # or:
    pairflow bubble kickoff --id <BUBBLE_ID> --repo <REPO_PATH> --task-file <TASK_FILE>
    ```
- If state is `RUNNING` (non-ideation pending) -> do not approve/rework and do not perform direct implementation edits; report next actor should continue loop (`pass` / `converged`) and stop intervention.
- If state is `WAITING_HUMAN` and `MESSAGE` is empty -> STOP and report: `"Error: WAITING_HUMAN requires --message <text> for bubble reply."`
- If state is `WAITING_HUMAN` and `MESSAGE` is present -> run:
  ```bash
  pairflow bubble reply --id <BUBBLE_ID> --repo <REPO_PATH> --message "<MESSAGE>"
  ```
- If state is `META_REVIEW_RUNNING` -> route to `TroubleshootBubble` and prefer canonical inspection/restart (`pairflow bubble status --json`, `pairflow bubble restart`) when routing/runtime is stuck.
- If state is `READY_FOR_HUMAN_APPROVAL` (or legacy `READY_FOR_APPROVAL`) and user intent is explicit approve -> run:
  - First attempt clean approve:
    ```bash
    pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>
    ```
  - If approve fails with `APPROVAL_OVERRIDE_REQUIRED` or `APPROVAL_PARITY_OVERRIDE_REQUIRED` and the operator still intends to approve, rerun with explicit human justification:
    ```bash
    pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH> --override-non-approve --override-reason "<concise human justification>"
    ```
- If state is `READY_FOR_HUMAN_APPROVAL` (or legacy `READY_FOR_APPROVAL`) and user intent is explicit rework with message -> run:
  ```bash
  pairflow bubble request-rework --id <BUBBLE_ID> --repo <REPO_PATH> --message "<MESSAGE>"
  ```
- If state is `READY_FOR_HUMAN_APPROVAL` (or legacy `READY_FOR_APPROVAL`) and rework requested without message -> STOP and report: `"Error: request-rework in READY_FOR_HUMAN_APPROVAL (legacy READY_FOR_APPROVAL) requires --message with actionable rework instructions."`
- If state is not one of (`RUNNING`, `WAITING_HUMAN`, `READY_FOR_HUMAN_APPROVAL`, `READY_FOR_APPROVAL`) -> STOP and report: `"Error: Intervention workflow does not handle state: {state}."`

4. Handle watchdog-driven human questions.
- If inbox indicates watchdog timeout / `HUMAN_QUESTION` and state is `WAITING_HUMAN` -> ensure a concise `reply` is sent, then continue.

5. Verify resulting state.
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
pairflow bubble inbox --id <BUBBLE_ID> --repo <REPO_PATH>
```
- If state did not change as expected after command -> STOP and report command output + current state.

## Report

```
Intervention summary:
- Bubble: <BUBBLE_ID>
- Previous state: <STATE_BEFORE>
- Command executed: <COMMAND or none>
- Current state: <STATE_AFTER>
- Next expected actor/action: <NEXT_STEP>
- Notes: <warnings or none>
```
