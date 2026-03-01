---
description: Handle stuck or active bubbles safely using state-aware intervention
argument-hint: --id <name> [--repo <path>] [--message <text>]
allowed-tools: Bash, Read, AskUserQuestion
---

# Active Bubble Intervention

## Purpose

Handle an active or stuck bubble without breaking lifecycle rules, and apply the correct command for the current state.

## Variables

BUBBLE_ID: extracted from `--id` argument (required)
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
MESSAGE: extracted from `--message` argument (optional)

## Instructions

- Always read `status --json` and `inbox` before any action.
- Never run `request-rework` outside `READY_FOR_APPROVAL`.
- Never run `approve` while bubble is `RUNNING` or `WAITING_HUMAN`.
- Prefer explicit, targeted human messages; avoid vague replies.
- Re-check state after every state-changing command.

## Error Messages

- Missing bubble id: `"Usage: InterveneBubble --id <name> [--repo <path>] [--message <text>]"`
- Missing message for waiting-human reply: `"Error: WAITING_HUMAN requires --message <text> for bubble reply."`
- Missing message for rework request: `"Error: request-rework in READY_FOR_APPROVAL requires --message with actionable rework instructions."`
- Rework not allowed in state: `"Error: request-rework is allowed only in READY_FOR_APPROVAL. Current state: {state}."`
- Unsupported state for intervention: `"Error: Intervention workflow does not handle state: {state}."`

## Workflow

1. Resolve inputs.
- If `BUBBLE_ID` is empty -> STOP and report: `"Usage: InterveneBubble --id <name> [--repo <path>] [--message <text>]"`
- Resolve `REPO_PATH` from argument or `git rev-parse --show-toplevel`.

2. Read current state and inbox.
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
pairflow bubble inbox --id <BUBBLE_ID> --repo <REPO_PATH>
```

3. Apply state-specific intervention.
- If state is `RUNNING` -> do not approve/rework; report next actor should continue loop (`pass` / `converged`) and stop intervention.
- If state is `WAITING_HUMAN` and `MESSAGE` is empty -> STOP and report: `"Error: WAITING_HUMAN requires --message <text> for bubble reply."`
- If state is `WAITING_HUMAN` and `MESSAGE` is present -> run:
  ```bash
  pairflow bubble reply --id <BUBBLE_ID> --repo <REPO_PATH> --message "<MESSAGE>"
  ```
- If state is `READY_FOR_APPROVAL` and user intent is explicit approve -> run:
  ```bash
  pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>
  ```
- If state is `READY_FOR_APPROVAL` and user intent is explicit rework with message -> run:
  ```bash
  pairflow bubble request-rework --id <BUBBLE_ID> --repo <REPO_PATH> --message "<MESSAGE>"
  ```
- If state is `READY_FOR_APPROVAL` and rework requested without message -> STOP and report: `"Error: request-rework in READY_FOR_APPROVAL requires --message with actionable rework instructions."`
- If state is not one of (`RUNNING`, `WAITING_HUMAN`, `READY_FOR_APPROVAL`) -> STOP and report: `"Error: Intervention workflow does not handle state: {state}."`

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
