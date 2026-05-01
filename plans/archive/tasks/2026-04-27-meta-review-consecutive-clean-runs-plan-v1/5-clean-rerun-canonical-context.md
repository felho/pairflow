---
artifact_type: task
artifact_id: task_meta_review_clean_rerun_canonical_context_v1
task_family_id: clean-rerun-canonical-context
sequence_key: "5"
task_id: 5-clean-rerun-canonical-context
title: "Meta-Review Clean Rerun Canonical Execution Context"
status: approved
phase: phase5
target_files:
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyRunRouting.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyPersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts
  - tests/v11/application/metaReview/metaReviewGateEmit.test.ts
prd_ref: null
plan_ref: plans/archive/plans/2026-04-27-meta-review-consecutive-clean-runs-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 5-clean-rerun-canonical-context-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-04-27-meta-review-consecutive-clean-runs-plan-v1
---

# Task: Meta-Review Clean Rerun Canonical Execution Context

## L0 - Policy

### Goal

Harden the consecutive clean-run reroute so every additional clean meta-review attempt is started through an orchestrator-owned fresh canonical execution context, matching the normal meta-review start path that follows reviewer convergence.

This task does not require restarting the meta-reviewer pane or creating a fresh LLM chat session. "Fresh" means fresh canonical Pairflow execution authority: new `handoff_id`, new `execution_id`, incremented `attempt`, and the same kickoff/delivery/observation contract as the normal reviewer-convergence meta-review entry.

### Domain / Control Model Summary

1. Business invariant: multiple required clean meta-review runs must represent multiple distinct canonical meta-review attempts, not a continuation of a previous attempt.
2. Control model: the orchestrator/meta-review gate owns creation of each meta-review attempt authority. A meta-review result may cause the gate to request another clean rerun, but it must not make the prior attempt itself the authority for the next attempt.
3. Read-path rule: canonical attempt identity is read from `state.execution_context` and `state.meta_review.execution_context`, not from pane text, transcript prose, or reviewer memory.
4. Forbidden fallback: do not treat a second clean result as valid if it reuses the previous attempt's `handoff_id` or `execution_id`; do not infer freshness from a new transcript sequence alone; do not restart the pane as a substitute for canonical execution-context freshness.
5. Allowed resolution path: consecutive clean reruns may reuse the existing static meta-reviewer pane, but must stage a new canonical meta-review execution context and deliver a new kickoff request through the same orchestrator-owned contract used after reviewer convergence.
6. Missing-data rule: if the rerun path cannot prove fresh canonical execution context and delivery/observation parity, fail closed to the existing safe human-gate dispatch-failure route rather than counting the rerun as a clean attempt.

### Plan Linkage

1. Parent plan gap closed: fresh canonical execution context parity for consecutive clean reruns.
2. Depends on: archived Task 2 gate-routing implementation and archived Task 4 validation/docs baseline.
3. Task-list impact: retroactive Phase 5 follow-up for `meta-review-consecutive-clean-runs-plan-v1`.
4. Exit expectation: targeted tests prove fresh attempt identity and normal meta-review start parity for the clean-rerun path.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyRunRouting.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyPersistence.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`
   - `src/v11/shared/metaReview/metaReviewExecutionContext.ts`
   - `src/v11/shared/state/executionContext.ts`
2. Canonical elements:
   - `state.execution_context` is the active actor authority.
   - `meta_review.execution_context` is the meta-review projection of the active authority.
   - `handoff_id`, `execution_id`, `round`, and `attempt` together identify a canonical meta-review attempt.
3. Guard elements:
   - existing submit stale guards must continue rejecting mismatched handoff/execution identities.
   - runtime delivery observation must remain correlated to the active meta-review handoff.
4. Compat elements:
   - static meta-reviewer pane reuse remains valid.
   - requirement `1` still allows the normal single-clean human approval path.
5. Forbidden reinterpretations:
   - do not redefine fresh context as fresh LLM chat context.
   - do not treat `consecutive_clean_runs` as an attempt counter.
   - do not use `auto_rework_count` to derive clean-rerun attempts.

## L1 - Technical Contract

### Scope Reality / Shape Proof

1. Current normal path: `applyMetaReviewGateOnConvergence` stages meta-review authority, appends a kickoff envelope, resolves pane binding, notifies the meta-reviewer, persists runtime delivery observation, and returns `meta_review_running`.
2. Current clean-rerun path: current-run finalization can call rerun staging/append logic directly after a clean `approve` below the required streak.
3. Required target shape: the clean-rerun path must either reuse a factored common orchestrator-owned start helper or otherwise prove exact parity with the normal start path for:
   - state stage to `RUNNING` with `active_role=meta_reviewer`
   - fresh `state.execution_context`
   - fresh `meta_review.execution_context`
   - kickoff `TASK` envelope with the new handoff id
   - runtime delivery observation correlated to the new handoff id
4. Out of scope:
   - config parsing/default changes
   - status/list/UI projection changes
   - changing clean-run threshold semantics
   - restarting or recreating the meta-reviewer pane as a policy requirement

### Authority Boundary Map

1. Authority producer: orchestrator/meta-review gate start path.
2. Stored authority: `state.execution_context` and `state.meta_review.execution_context`.
3. In-scope consumers: clean-rerun finalization path, meta-review submit stale guard compatibility, runtime delivery observation correlation.
4. Out-of-scope consumers: UI presets, status copy, list projection, docs beyond this task and parent plan update.
5. Boundary rule: meta-review result finalization may decide that another run is required, but must delegate attempt creation to orchestrator-owned start semantics.

### Baseline Preservation

1. Must preserve:
   - clean approve below required streak reroutes to another meta-review attempt without implementer/reviewer handoff.
   - clean approve at required streak routes to human approval.
   - non-clean outcomes reset the streak.
   - auto-rework budget and clean streak stay separate.
   - static meta-reviewer pane reuse remains allowed.
2. Allowed replacement:
   - direct clean-rerun staging may be replaced with a shared meta-review start helper if that reduces divergence from the normal convergence path.
3. Forbidden regression:
   - clean rerun reuses the prior `handoff_id`.
   - clean rerun reuses the prior `execution_id`.
   - clean rerun records no delivery observation when the normal start path would record one.
   - clean rerun increments `auto_rework_count`.

### Closure-Budget Gate

1. Closure buckets touched:
   - `internal_execution_consumers`: clean-rerun meta-review authority staging and runtime delivery observation.
   - `workflow_orchestration_consumers`: current-run finalization route from clean approval below the required streak into the next meta-review attempt.
   - `fail_closed_hardening`: dispatch/staging/delivery failure must not count the rerun as a valid clean attempt.
2. Closures intentionally collapsed:
   - internal execution consumer alignment and workflow orchestration alignment are collapsed because the clean-rerun path is one bounded meta-review gate transition.
   - fail-closed hardening is collapsed because the failure route is part of the same transition and cannot be validated separately from the side-effect ordering.
3. Why the collapse is safe:
   - no config/state schema/read-model/UI contract changes are in scope.
   - no new persisted field is introduced.
   - the work preserves the existing clean-streak and auto-rework contracts while tightening only the rerun start semantics.
4. Explicitly deferred closures:
   - read-model/status/UI changes.
   - broader restart/recovery redesign.
   - introducing a new pane/session lifecycle policy.
   - new locking or serialization primitives beyond the existing gate/state/transcript mechanisms.

### Bounded-Task-Shape Gate

1. Primary shape: `consumer_family_alignment`.
2. Secondary shape: `fail_closed_hardening`.
3. Why this mix is safe:
   - both shapes are owned by the same clean-rerun route from finalized meta-review result to next meta-review attempt.
   - the implementation should reuse or factor the existing meta-review start contract instead of introducing a separate producer authority.
   - no separate read-model or activation surface is changed.
4. Coordination/concurrency classification:
   - no new lock, lease, or idempotency primitive is required-now.
   - existing state write, transcript append, and gate lock behavior must be preserved.
5. Split decision: single task remains acceptable because the task hardens an existing consumer path and does not move producer/schema/read-model contracts.

### Complexity-Risk Gate

1. `authority_risk`: `1` because the task aligns use of an existing canonical execution authority.
2. `surface_spread`: `1` because touched code is concentrated in meta-review gate start/finalization and targeted tests.
3. `identity_join_risk`: `1` because correctness depends on `handoff_id`, `execution_id`, `round`, and `attempt` staying correlated.
4. `activation_coupling`: `1` because the route is already active and this task hardens current runtime behavior.
5. `prerequisite_risk`: `1` because prior clean-runs policy/routing tasks are archived and available.
6. `acceptance_multiplicity`: `1` because acceptance is bounded to canonical context freshness, kickoff/delivery parity, and no budget/streak regression.
7. `risk_score`: `6`.
8. Split decision: single task allowed with explicit side-effect boundary and targeted parity tests.
9. Authority/source-of-truth note:
   - canonical source: staged `state.execution_context` plus `meta_review.execution_context`.
   - forbidden secondary sources: transcript sequence alone, pane text, prior result context, `consecutive_clean_runs`, and `auto_rework_count`.

### Precondition and Side-Effect Boundary

1. Preconditions before starting a clean rerun:
   - current-run finalization has classified the submitted meta-review result as threshold-clean `approve`.
   - updated streak is below `review_policy.meta_review_consecutive_clean_runs_required`.
   - current loaded state is still the active meta-review finalization state for the submitted run.
   - the prior run's `handoff_id` and `execution_id` are available for stale-guard comparison or test assertion.
2. Side effects allowed after preconditions pass:
   - persist updated `meta_review.consecutive_clean_runs`.
   - stage a fresh canonical meta-review execution context for the next attempt.
   - append a new meta-review kickoff `TASK` envelope referencing the new handoff.
   - notify/bind the static meta-reviewer pane through the same runtime delivery contract used by normal reviewer-convergence meta-review start.
   - persist runtime delivery observation correlated to the new handoff.
3. Side effects forbidden before preconditions pass:
   - do not increment clean streak.
   - do not create a new meta-review execution context.
   - do not append a rerun kickoff envelope.
   - do not count or expose the rerun as a valid clean attempt.
4. Failure behavior:
   - stage failure, kickoff append failure, pane notification failure, or runtime delivery observation failure must route through the existing safe dispatch-failure/human-gate fallback semantics.
   - a failed rerun dispatch must not preserve a positive clean streak unless the existing rollback contract explicitly proves that state is canonical and fail-closed.
   - stale or reused `handoff_id` / `execution_id` must be treated as invalid rerun authority, not as a successful rerun.
5. Ordering rule:
   - the final implementation must avoid a success result where state says `meta_review_running` for a new clean rerun but runtime delivery observation is missing when the normal meta-review start path would have persisted it.

## L2 - Verification Contract

### Required Tests

1. Add or update targeted meta-review gate tests proving a clean rerun below the required streak:
   - returns `route=meta_review_running`,
   - persists `consecutive_clean_runs=1`,
   - creates a new `handoff_id` different from the submitted run,
   - creates a new `execution_id` different from the submitted run,
   - increments `attempt`,
   - preserves the same `round`.
2. Add or update tests proving the clean-rerun kickoff envelope metadata references the new handoff id.
3. Add or update tests proving runtime delivery observation is persisted and correlated to the new handoff id for the clean-rerun path.
4. Add or update regression coverage proving the clean-rerun path does not increment `auto_rework_count`.
5. Preserve existing tests for requirement `1`, final unlock, non-clean reset, parity failure, threshold failure, and auto-rework routing.

### Validation Commands

1. Run targeted meta-review gate suites covering changed files.
2. Run `pnpm build` because `src/**` changes are expected for the implementation task.
3. Run broader lint/typecheck/test commands required by the touched implementation surface or by reviewer findings.

### Done Definition

1. Consecutive clean reruns have fresh canonical execution context parity with normal reviewer-convergence meta-review starts.
2. The implementation does not require fresh LLM chat context or pane restart.
3. Tests fail if a clean rerun reuses the previous `handoff_id` or `execution_id`.
4. Tests fail if clean rerun delivery/observation diverges from the normal meta-review start contract.
5. Parent plan remains clear that "fresh context" means fresh canonical execution context.
