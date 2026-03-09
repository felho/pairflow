---
description: Produce approval-ready deep review summary for a bubble and optionally execute approve or request-rework
argument-hint: --id <name> [--repo <path>] [--mode deep|standard] [--meta-review-source fresh|cached] [--decide approve|rework|none] [--message <text>]
allowed-tools: Bash, Read, AskUserQuestion
---

# Review Bubble

## Purpose

Generate a decision-ready review package for a bubble, then optionally execute `approve` or `request-rework` in a state-safe way.

## Mental Model (Critical)

- `Bubble` source: findings from bubble loop context (reviewer/implementer transcript and related artifacts).
- `MetaReview` source: findings from meta-reviewer layer.
- `ReviewBubble` has exactly two source modes:
  - `fresh`: run independent Codex meta-review now.
  - `cached`: load latest Pairflow meta-review snapshot; do not run new review.

### Mode Matrix

| `META_REVIEW_SOURCE` | Runs new review now | Uses `pairflow bubble meta-review *` | Primary source |
|---|---|---|---|
| `fresh` (default) | yes | no | independent Codex meta-review output |
| `cached` | no | yes (`status`, `last-report`) | latest Pairflow meta-review snapshot |

## Variables

BUBBLE_ID: extracted from `--id` argument (required)
REPO_PATH: extracted from `--repo`, or `git rev-parse --show-toplevel`
MODE: extracted from `--mode`, default `deep`
META_REVIEW_SOURCE: extracted from `--meta-review-source`, default `fresh`
DECIDE: extracted from `--decide`, default `none`
MESSAGE: extracted from `--message` (required when `DECIDE=rework`)

## Instructions

- Default to `deep` explanation unless user explicitly asks short format.
- Always inspect state before any approval/rework command.
- Include evidence summary and distinguish hard evidence from soft statements.
- In the findings section, label every item by origin:
  - `[Bubble]` when the issue comes from bubble transcript/tool output (for example reviewer findings).
  - `[MetaReview]` when the issue comes from meta-reviewer output (cached snapshot or fresh run report).
- Never present unlabeled findings in review output.
- For rework, message must be specific, evidence-backed, actionable, and verifiable.
- Meta-review source contract:
  - `META_REVIEW_SOURCE=fresh` (default): run independent Codex meta-review directly from task/worktree context. Do not call Pairflow meta-review commands in this path.
  - `META_REVIEW_SOURCE=cached`: do not run a new review; read latest Pairflow snapshot only (`meta-review status` + `meta-review last-report`).
- Hard rule: `fresh` mode must never call `pairflow bubble meta-review *`; `cached` mode must never trigger a new review run.
- If state is not `READY_FOR_HUMAN_APPROVAL` and not legacy `READY_FOR_APPROVAL`, do review-only output and do not execute decision commands.
- Decision separation: source mode (`fresh|cached`) controls where review content comes from; `DECIDE` controls only lifecycle action (`approve|rework|none`).
- In this review workflow, **do not** run `pairflow bubble open` automatically.
- `pairflow bubble open` launches an editor session (for example Cursor), so use it only when the user explicitly requests it.
- For worktree access, use the `worktreePath` field from `pairflow bubble status --json`, and operate directly on that path with `git -C` and file read commands.

## Error Messages

- Missing bubble id: `"Usage: ReviewBubble --id <name> [--repo <path>] [--mode deep|standard] [--meta-review-source fresh|cached] [--decide approve|rework|none] [--message <text>]"`
- Invalid mode: `"Error: mode must be deep or standard. Got: {mode}."`
- Invalid meta-review source: `"Error: meta-review-source must be fresh or cached. Got: {metaReviewSource}."`
- Invalid decide value: `"Error: decide must be approve, rework, or none. Got: {decide}."`
- Rework without message: `"Error: decide=rework requires --message with actionable rework instructions."`
- Decision blocked by state: `"Error: approve/request-rework allowed only in READY_FOR_HUMAN_APPROVAL (legacy READY_FOR_APPROVAL). Current state: {state}."`

## Workflow

1. Resolve and validate inputs.
- If `BUBBLE_ID` is empty -> STOP and report: `"Usage: ReviewBubble --id <name> [--repo <path>] [--mode deep|standard] [--meta-review-source fresh|cached] [--decide approve|rework|none] [--message <text>]"`
- If `MODE` is not `deep` or `standard` -> STOP and report: `"Error: mode must be deep or standard. Got: {mode}."`
- If `META_REVIEW_SOURCE` is not `fresh` or `cached` -> STOP and report: `"Error: meta-review-source must be fresh or cached. Got: {metaReviewSource}."`
- If `DECIDE` is not `approve`, `rework`, or `none` -> STOP and report: `"Error: decide must be approve, rework, or none. Got: {decide}."`
- If `DECIDE=rework` and `MESSAGE` is empty -> STOP and report: `"Error: decide=rework requires --message with actionable rework instructions."`
- Resolve `REPO_PATH` from argument or `git rev-parse --show-toplevel`.

2. Resolve review source path.
- If `META_REVIEW_SOURCE=cached`, read lifecycle state/inbox and cached meta-review artifacts:
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
pairflow bubble inbox --id <BUBBLE_ID> --repo <REPO_PATH>
pairflow bubble meta-review status --id <BUBBLE_ID> --repo <REPO_PATH> --verbose
pairflow bubble meta-review last-report --id <BUBBLE_ID> --repo <REPO_PATH> --verbose
```
- If `META_REVIEW_SOURCE=fresh`, do not call `pairflow bubble meta-review run/status/last-report`; proceed with direct Codex review from worktree/task context.

3. Gather review context from worktree.
- Resolve bubble worktree/task context without launching editor (`bubble open` is forbidden by default).
- In `fresh` mode, resolve worktree/task context directly and perform independent review.
- In `cached` mode, summarize the loaded Pairflow meta-review snapshot first, then enrich with bubble transcript context if needed.
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
- Build a short candidate finding list from bubble transcript-origin items (`[Bubble]`) plus meta-reviewer-origin items (`[MetaReview]`) so final reporting can clearly separate sources.

4. Build review narrative.
- If `MODE=deep`, include:
  1. Goal and scope.
  2. High-level solution.
  3. File-by-file rationale.
  4. Findings (explicitly labeled `[Bubble]` or `[MetaReview]`).
  5. Behavior/risk and tradeoffs.
  6. Validation and evidence quality.
  7. Residual risks/open questions.
  8. Recommendation (`approve` or `rework`) with reason.
- If `MODE=standard`, provide concise version of the same structure.

5. Optionally execute decision.
- If `DECIDE=none` -> skip commands and return recommendation only.
- If `DECIDE` is `approve` or `rework` and state is neither `READY_FOR_HUMAN_APPROVAL` nor legacy `READY_FOR_APPROVAL` -> STOP and report: `"Error: approve/request-rework allowed only in READY_FOR_HUMAN_APPROVAL (legacy READY_FOR_APPROVAL). Current state: {state}."`
- If `DECIDE=approve` and state is approval-ready:
  - If latest autonomous recommendation is `approve` (or missing), run:
    ```bash
    pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>
    ```
  - If latest autonomous recommendation is `rework` or `inconclusive`, run override approve:
    ```bash
    pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH> --override-non-approve --override-reason "<concise human justification>"
    ```
- If `DECIDE=rework` and state is approval-ready -> run:
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
- Meta-review source: <cached|fresh>
- Change summary: <SUMMARY>
- Findings (labeled): <[Bubble]/[MetaReview] list>
- Validation/evidence: <HARD+SOFT SUMMARY>
- Recommendation: <APPROVE/REWORK + WHY>
- Decision executed: <none/approve/rework>
- Post-decision state: <STATE_AFTER or n/a>
```

Finding label example:
- `[Bubble][P2] reviewer transcript reports duplicate guard check in close flow`
- `[MetaReview][P2] meta-review report flags missing verification reference in approval note`

## Invocation Examples

```bash
# Fresh (default): independent Codex meta-review
ReviewBubble --id <id> --meta-review-source fresh --mode deep --decide none

# Cached: read Pairflow meta-review snapshot only
ReviewBubble --id <id> --meta-review-source cached --mode deep --decide none
```

## STOP

Do not execute approve/request-rework outside READY_FOR_HUMAN_APPROVAL (legacy READY_FOR_APPROVAL).
