---
description: Produce approval-ready deep review summary for a bubble and optionally execute approve or request-rework
argument-hint: --id <name> [--repo <path>] [--mode deep|standard] [--decide approve|rework|none] [--message <text>]
allowed-tools: Bash, Read, AskUserQuestion
---

# Review Bubble

## Purpose

Generate a decision-ready review package for a bubble, then optionally execute `approve` or `request-rework` in a state-safe way.

## Mental Model (Critical)

- `Bubble` source: findings from bubble loop context (reviewer/implementer transcript and related artifacts).
- `MetaReview` source: findings from meta-reviewer layer.
- `ReviewBubble` always uses the surviving direct review path from bubble worktree/task/transcript context.
- Existing meta-reviewer artifacts can still be cited as `[MetaReview]`, but there is no source-mode selector.

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
- In both `deep` and `standard` modes, explain findings in business-technical language by default:
  - State clearly whether the issue is a blocker now, an advisory hardening item, or a future-maintenance concern.
  - For each non-trivial finding, explain both:
    - the technical meaning ("what the code is doing / where the edge is"), and
    - the practical meaning ("why the user, operator, or future delivery should care").
  - Prefer plain impact language such as "does not break current behavior", "raises future maintenance cost", "can mislead diagnostics", "weakens contract clarity", or "can cause downstream misuse later".
  - Do not assume the reader wants raw code-review shorthand; convert terse reviewer language into understandable decision language.
- In the findings section, label every item by origin:
  - `[Bubble]` when the issue comes from bubble transcript/tool output (for example reviewer findings).
  - `[MetaReview]` when the issue comes from meta-reviewer output already present in bubble context.
- Never present unlabeled findings in review output.
- Mandatory regression-vs-tightening audit:
  - identify any removed branch, fallback, finalize path, canonicalization step, or recovery path in the diff,
  - state whether that removal is explicitly authorized by the task/spec,
  - if the task/spec is silent, treat the removal as a regression candidate rather than assuming it is a legitimate tightening,
  - when a reviewer rationale says "heuristic fallback" or "tighten resolver", verify whether the removed code was actually a deterministic same-authority resolution path.
- If the task/spec includes baseline-preservation language, the review must check conformance against it explicitly.
- If the task/spec does not include enough baseline-preservation language to judge a removed behavior safely, call that out as a spec-quality gap instead of silently approving the code change.
- For rework, message must be specific, evidence-backed, actionable, and verifiable.
- Review path contract:
  - run the review directly from task/worktree/transcript context,
  - do not expose or suggest any removed source-selection flag,
  - do not use `pairflow bubble meta-review *` as an operator source-selection path.
- If state is not `READY_FOR_HUMAN_APPROVAL` and not legacy `READY_FOR_APPROVAL`, do review-only output and do not execute decision commands.
- Decision separation: `DECIDE` controls only lifecycle action (`approve|rework|none`); content gathering stays on the direct review path.
- In this review workflow, **do not** run `pairflow bubble open` automatically.
- `pairflow bubble open` launches an editor session (for example Cursor), so use it only when the user explicitly requests it.
- For worktree access, use the `worktreePath` field from `pairflow bubble status --json`, and operate directly on that path with `git -C` and file read commands.

## Error Messages

- Missing bubble id: `"Usage: ReviewBubble --id <name> [--repo <path>] [--mode deep|standard] [--decide approve|rework|none] [--message <text>]"`
- Invalid mode: `"Error: mode must be deep or standard. Got: {mode}."`
- Invalid decide value: `"Error: decide must be approve, rework, or none. Got: {decide}."`
- Rework without message: `"Error: decide=rework requires --message with actionable rework instructions."`
- Decision blocked by state: `"Error: approve/request-rework allowed only in READY_FOR_HUMAN_APPROVAL (legacy READY_FOR_APPROVAL). Current state: {state}."`

## Workflow

1. Resolve and validate inputs.
- If `BUBBLE_ID` is empty -> STOP and report: `"Usage: ReviewBubble --id <name> [--repo <path>] [--mode deep|standard] [--decide approve|rework|none] [--message <text>]"`
- If `MODE` is not `deep` or `standard` -> STOP and report: `"Error: mode must be deep or standard. Got: {mode}."`
- If `DECIDE` is not `approve`, `rework`, or `none` -> STOP and report: `"Error: decide must be approve, rework, or none. Got: {decide}."`
- If `DECIDE=rework` and `MESSAGE` is empty -> STOP and report: `"Error: decide=rework requires --message with actionable rework instructions."`
- Resolve `REPO_PATH` from argument or `git rev-parse --show-toplevel`.

2. Resolve review context.
- Read lifecycle state and inbox first:
```bash
pairflow bubble status --id <BUBBLE_ID> --repo <REPO_PATH> --json
pairflow bubble inbox --id <BUBBLE_ID> --repo <REPO_PATH>
```
- Resolve worktree/task/transcript context directly from the bubble status response and repo artifacts.
- Do not call `pairflow bubble meta-review run/status/last-report/recover` as part of this workflow.

3. Gather review context from worktree.
- Resolve bubble worktree/task context without launching editor (`bubble open` is forbidden by default).
- Perform the review directly from worktree/task context.
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
- Build a short candidate finding list from bubble transcript-origin items (`[Bubble]`) plus any meta-reviewer-origin items already present in transcript/artifacts (`[MetaReview]`) so final reporting can clearly separate sources.
- Explicitly compare:
  - task/spec allowed resolution paths,
  - current main-branch or baseline behavior when relevant,
  - removed or tightened paths in the bubble diff.
- If a bubble removes a current behavior that existed on `main`, classify it as one of:
  - explicitly authorized replacement,
  - ambiguous removal needing clarification,
  - unauthorized removal regression candidate.

4. Build review narrative.
- If `MODE=deep`, include:
  1. Goal and scope.
  2. High-level solution.
  3. File-by-file rationale.
  4. Findings (explicitly labeled `[Bubble]` or `[MetaReview]`), with technical meaning + business-technical meaning for each material item.
  5. Removed-behavior audit:
     - what existing behavior was removed or tightened,
     - whether the task/spec explicitly authorized that,
     - whether the replacement path is proven equivalent.
  6. Plain-language decision readout:
     - what is actually wrong,
     - what is only technical debt,
     - why the recommendation is still `approve` or `rework`.
  7. Behavior/risk and tradeoffs.
  8. Validation and evidence quality.
  9. Residual risks/open questions.
  10. Recommendation (`approve` or `rework`) with reason.
- If `MODE=standard`, provide concise version of the same structure.
  - Still include a short plain-language explanation for findings and recommendation; brevity is allowed, but reviewer shorthand alone is not.

5. Optionally execute decision.
- If `DECIDE=none` -> skip commands and return recommendation only.
- If `DECIDE` is `approve` or `rework` and state is neither `READY_FOR_HUMAN_APPROVAL` nor legacy `READY_FOR_APPROVAL` -> STOP and report: `"Error: approve/request-rework allowed only in READY_FOR_HUMAN_APPROVAL (legacy READY_FOR_APPROVAL). Current state: {state}."`
- If `DECIDE=approve` and state is approval-ready:
  - First attempt clean approve:
    ```bash
    pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH>
    ```
    Remote bubble note: this remains a laptop-side routed command by default; do not SSH into the remote clone and run approve there manually.
  - If approve fails with `APPROVAL_OVERRIDE_REQUIRED` or `APPROVAL_PARITY_OVERRIDE_REQUIRED`, rerun only when the human decision is still approve and you can provide a concise explicit justification:
    ```bash
    pairflow bubble approve --id <BUBBLE_ID> --repo <REPO_PATH> --override-non-approve --override-reason "<concise human justification>"
    ```
- If `DECIDE=rework` and state is approval-ready -> run:
  ```bash
  pairflow bubble request-rework --id <BUBBLE_ID> --repo <REPO_PATH> --message "<MESSAGE>"
  ```
  Remote bubble note: default to the same laptop-side routed path. Only use remote-clone local parity for `request-rework` when Pairflow can already prove the verified remote clone workspace context and that exception is intentionally being used.

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
- Findings (labeled): <[Bubble]/[MetaReview] list>
- Validation/evidence: <HARD+SOFT SUMMARY>
- Recommendation: <APPROVE/REWORK + WHY>
- Decision executed: <none/approve/rework>
- Post-decision state: <STATE_AFTER or n/a>
```

Recommended deep-review finding format:

```text
- [MetaReview][P2] <short finding title>
  Technical meaning: <what the code/path/contract issue actually is>
  Practical meaning: <why it matters in business-technical language>
  Decision weight: <blocker now | advisory only | future hardening>
```

Recommended unauthorized-removal finding format:

```text
- [MetaReview][P1] Unauthorized removal regression candidate: <short title>
  Removed behavior: <what existing path/branch/fallback/finalize behavior disappeared>
  Spec status: <explicitly authorized | ambiguous | not authorized>
  Technical meaning: <why the removed path was materially different from a forbidden heuristic>
  Practical meaning: <what can now break in runtime/business flow>
  Decision weight: blocker now
```

Recommended recommendation format:

```text
Recommendation:
- approve|rework
- Why this is not blocking now: <plain-language rationale>
- What should be cleaned up later: <plain-language debt summary>
```

Finding label example:
- `[Bubble][P2] reviewer transcript reports duplicate guard check in close flow`
- `[MetaReview][P2] meta-review report flags missing verification reference in approval note`

## Invocation Examples

```bash
# Direct review path
ReviewBubble --id <id> --mode deep --decide none
```

## STOP

Do not execute approve/request-rework outside READY_FOR_HUMAN_APPROVAL (legacy READY_FOR_APPROVAL).
