# Memo: ReviewSpec Lane Fan-out Cost / Value

Status: draft memo, not a Pairflow task spec.
Created: 2026-06-01

## Purpose

Capture the open question around whether the improved ReviewSpec process is
worth its review cost, especially when multi-lane review creates many subagent
passes across multiple refinement rounds.

This memo is intentionally parked for later. It should be revisited after a few
more tasks have gone through the improved review flow, so the decision is based
on observed behavior rather than one dense commit-policy case.

## Context

The immediate trigger was the commit-policy planning/review sequence.

Relevant sessions / threads:

- `019e81e1-3ffd-7671-8cea-5de3de1937b4`
  - Earlier test of the improved ReviewSpec gates against
    `plans/tasks/2-commit-policy.md`.
  - Result: better discovery and auditability, but the first version still
    allowed a broad task through a safe-collapse narrative.
- `019e8253-070a-7d90-a0de-5f9626d835fa`
  - Re-test after tightening autonomous split behavior.
  - Result: the original broad `2-commit-policy` task was rejected as too wide,
    the plan was split, and only `2a-commit-policy` was materialized and
    reviewed to approval.
- Current follow-up discussion after reviewing `019e8253`.
  - Question: the process used roughly four review lanes across several
    refinement rounds. Earlier single-thread reviews sometimes also needed
    three rounds, so we need to understand whether the extra review fan-out is
    producing enough value for the cost.

Related bubbles:

- `2a-commit-policy-doc`
  - Document-refinement bubble merged to `main` at `1a1664a`.
- `2a-commit-policy-impl`
  - Implementation bubble started after the doc bubble.
  - This memo is not part of that bubble's implementation scope.

## Working Assessment

The improved process clearly added value for the broad initial task:

- It forced the split decision that previous gate usage failed to enforce.
- It made the decision auditable through lane results and the top-level Gate
  Coverage Matrix.
- It kept `2a-commit-policy` scoped as an authority/guidance foundation instead
  of letting local enforcement, Pairflow lifecycle alignment, release
  automation, and compatibility concerns collapse into one implementation task.

The value is less obvious for every subsequent refinement round:

- Once the original wide task had been split, later findings were mostly about
  contract precision inside `2a`.
- Many of those findings were real and useful, but running all lanes again after
  every small edit may be more review than an average task needs.
- The process currently behaves closer to "full scan every time" than "review
  only the lanes invalidated by the latest diff".

## Cost / Value Question

The key question is not whether multi-lane review is useful. It is when the
extra review cost is justified.

The likely high-value cases are:

- first review of broad or high-risk tasks,
- task split / no-split decisions,
- authority, shared-contract, read-model, or multi-consumer tasks,
- tasks created after a runaway or non-converging bubble incident,
- approval of dense foundation tasks whose wording will be inherited by
  successor tasks.

The likely low-value or overengineered cases are:

- low-risk local implementation tasks,
- mechanical cleanup,
- refinement rounds where only one lane's findings were edited,
- re-running all lanes when prior passing lanes were not touched by the diff.

## Proposed Direction

Introduce review budgeting rather than more gates.

Draft policy idea:

1. Use full lane fan-out for the first review when the task is high-risk, split
   sensitive, authority-related, shared-contract-related, or recovering from a
   convergence incident.
2. After a refinement round, re-run only the lanes whose previous findings were
   edited or whose covered surfaces changed in the diff.
3. Always keep a top-level reconciliation step before approval:
   - update the Gate Coverage Matrix,
   - verify that previously passing lanes are still valid or explicitly
     unaffected,
   - reconcile split/no-split consistency.
4. Use single-thread ReviewSpec for low-risk local tasks unless a concrete gate
   trigger escalates the review.
5. Record why a review used `full_lane_review`, `targeted_lane_review`, or
   `single_thread_review`.

## Possible Future Rule Shape

Review mode selection:

```text
full_lane_review:
  - risk_score >= 7
  - split_required or split/no-split decision is central
  - authority/shared-contract/read-model/multi-consumer scope
  - prior bubble convergence incident for this scope

targeted_lane_review:
  - refinement after a prior lane review
  - only changed or previously failing lanes rerun
  - top-level reviewer still reconciles gate coverage before approval

single_thread_review:
  - low-risk local or mechanical task
  - no authority producer
  - no shared contract
  - no multi-consumer fan-out
```

## Evidence To Collect Later

When revisiting this memo, compare at least a few tasks using the improved flow:

- How many review/refine rounds were needed?
- How many subagent lane runs were used?
- Which findings were blocking and materially changed the task?
- Which findings were style, duplication, or low-value precision?
- Did full lane fan-out prevent an oversized implementation bubble?
- Did targeted or single-thread review miss anything important?
- Did review mode selection itself become hard to apply?

## Open Decision

Do not change the skill again based on this memo alone.

Revisit after more observed ReviewSpec runs and decide whether to add a
review-budgeting rule to `CreatePairflowSpec`, probably inside the ReviewSpec
workflow rather than as another mandatory gate.
