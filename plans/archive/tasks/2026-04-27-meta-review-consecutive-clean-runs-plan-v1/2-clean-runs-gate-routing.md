---
artifact_type: task
artifact_id: task_meta_review_consecutive_clean_runs_gate_routing_v1
task_family_id: clean-runs-gate-routing
sequence_key: "2"
task_id: 2-clean-runs-gate-routing
title: "Meta-Review Consecutive Clean Runs Gate Routing"
status: archived
phase: phase2
target_files:
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyRunRouting.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyPersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateShared.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateStateHelpers.test.ts
prd_ref: null
plan_ref: plans/meta-review-consecutive-clean-runs-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: clean-runs-gate-routing-doc
impl_bubble_id: 2-clean-runs-gate-routing-impl
supersedes: []
superseded_by: null
archive_group: 2026-04-27-meta-review-consecutive-clean-runs-plan-v1
---

# Task: Meta-Review Consecutive Clean Runs Gate Routing

## L0 - Policy

### Goal

Consume the Task 1 review-policy requirement and canonical streak state inside current-run meta-review finalization so threshold-clean meta-review approvals can require multiple consecutive clean runs before human approval becomes available.

This task changes workflow/orchestration behavior only. It must not change the config/state field contract introduced by Task 1, and it must not add status/read-model/UI projection behavior owned by Task 3.

### Domain / Control Model Summary

1. Business invariant: `READY_FOR_HUMAN_APPROVAL` must not be reached from meta-review approval until the configured number of consecutive threshold-clean meta-review runs has been observed.
2. Control model: `review_policy.meta_review_consecutive_clean_runs_required` is the required count; `meta_review.consecutive_clean_runs` is the persisted current streak; `review_policy.meta_review_auto_rework_min_severity` remains the threshold authority for whether findings make a run non-clean. Clean-run classification is valid only after successful run status, successful parity validation, resolved threshold authority, `approve` recommendation, and no threshold-meeting open findings.
3. Read-path rule: finalization must read the required count through `normalizeBubbleReviewPolicy` and the current streak through `normalizeMetaReviewSnapshot` / canonical state helpers.
4. Forbidden fallback: do not infer clean streak from transcript prose, recommendation text alone, previous human-gate state, runtime pane observations, UI presets, or `auto_rework_count`.
5. Allowed resolution path: a threshold-clean `approve` increments the streak; if the updated streak is below the configured requirement, finalization immediately starts another meta-review run without implementer/reviewer handoff; if the requirement is met, finalization may persist the normal human approval route.
6. Missing-data rule: unresolved threshold authority, threshold-meeting findings, `rework`, `inconclusive`, run failure, parity failure, dispatch failure, and other non-clean terminal outcomes reset the persisted streak to `0` before routing to the appropriate existing safe path. If an append/write failure forces rollback to the pre-finalization snapshot, the task must preserve the existing rollback safety behavior and must not claim a successful reset unless the zero-streak state was actually persisted.
7. Phase boundary:
   - contract closure: already completed by Task 1
   - producer closure: already completed by Task 1 for config/state shape
   - internal execution closure: this task owns meta-review finalization state mutation and rerun dispatch
   - workflow orchestration closure: this task owns clean-rerun versus human-gate unlock routing
   - read-model closure: successor Task 3
   - activation closure: none beyond normal finalization behavior
   - cleanup/recovery closure: only preserve/reset streak through current-run finalization state writes; broader recovery redesign remains out of scope

### Plan Linkage

1. Parent plan gaps closed:
   - clean approve increments the streak
   - clean approve below the required streak triggers another meta-review run
   - clean approve at the required streak unlocks human approval
   - threshold-meeting findings and non-clean terminal outcomes reset the streak
2. Depends on: archived Task 1 policy/state foundation.
3. Unlocks / impacts successors:
   - Task 3 may expose requirement/streak in status/read-model/UI surfaces after routing behavior exists.
   - Task 4 may document final semantics and close validation.
4. Task-list impact: refines `2-clean-runs-gate-routing`.
5. Exit expectation: targeted gate finalization tests plus lint/typecheck/build must prove increment, reset, rerun, and unlock behavior.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyRunRouting.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyPersistence.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateShared.ts`
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - `src/v11/shared/metaReview/metaReviewSnapshot.ts`
2. Canonical elements:
   - `meta_review_auto_rework_min_severity` decides threshold-clean versus non-clean.
   - `meta_review_consecutive_clean_runs_required` decides unlock count.
   - `meta_review.consecutive_clean_runs` persists current clean streak.
3. Guard elements:
   - parity validation and approve-threshold backstop must still prevent invalid open-findings approval from reaching human approval.
   - sticky human gate must remain a safety bypass for already-sticky human routes.
   - auto-rework budget remains separate from clean confidence streak.
4. Compat elements:
   - requirement `1` preserves current single-clean approval behavior.
   - legacy state with missing streak normalizes to `0` and must not fabricate prior clean confidence.
5. Forbidden reinterpretations:
   - do not treat `auto_rework_count` as streak state.
   - do not treat all `approve` recommendations as clean.
   - do not treat threshold-unresolved results as clean.
   - do not change reviewer blocking severity semantics.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `finalizeCurrentRunMetaReviewGate` currently branches through run-failed, parity failure, approve backstop, sticky human gate, auto-rework, and resolved human routes.
   - `persistResolvedHumanRoute` owns human-gate persistence.
   - `dispatchAutoRework` owns implementer/reviewer rework dispatch and budget increments.
   - `metaReviewGateApply*`, `metaReviewGateApplyHelpers`, and `metaReviewGateStateStaging` own the existing entry into `meta_review_running` from convergence, including active meta-review execution context, kickoff envelope append, run-failed fallback, and runtime delivery observation.
   - `transitionToGateState` clears live meta-review state when entering human approval.
2. Actual touched scope: current-run finalization plus the existing meta-review running staging/dispatch helpers needed to start a clean rerun without implementer/reviewer handoff. The actual helper owner files are `metaReviewGateStateStaging.ts` for `stageMetaReviewRunningState` and `metaReviewGateApplyHelpers.ts` / `metaReviewGateApplyRunRouting.ts` for kickoff append and run-failed fallback.
3. Mutation entrypoints in scope:
   - state writes from finalization
   - protocol envelope append for approval/rework/rerun transitions
   - meta-review runtime delivery setup if the clean-rerun path reuses an existing start/dispatch helper
   - apply-context construction or extraction only as needed to share the existing `meta_review_running` staging/kickoff/runtime-delivery behavior without duplicating a second route authority
4. Hidden scope ruled out:
   - TOML/config parsing and state schema shape were completed by Task 1
   - status/list/UI projection belongs to Task 3
   - documentation and broad validation matrix belongs to Task 4
5. Branch inventory note:
   - clean approve with requirement `1`
   - clean approve with requirement `2` and streak `0`
   - clean approve with requirement `2` and streak `1`
   - threshold-meeting findings
   - threshold-unresolved approve
   - clean-streak / auto-rework-count separation on clean rerun and auto-rework paths
   - `rework` with budget available
   - `rework` with budget exhausted
   - `inconclusive`
   - run error
   - parity failure
   - fallback append/write failure
   - clean-rerun dispatch/staging failure
   - sticky human gate
6. Why the declared task shape matches reality: the needed behavior is concentrated in meta-review gate finalization and the existing meta-review running staging path; downstream read surfaces can consume the resulting canonical state later without changing routing.

### Authority Boundary Map

1. Authority producer: Task 1 config/state normalization, threshold-authority resolution, and meta-review snapshot normalization.
2. Stored authority: bubble state `meta_review.consecutive_clean_runs`.
3. In-scope consumers: meta-review current-run finalization, immediate rerun/human-gate route persistence, and the apply/staging path reused for clean meta-review reruns.
4. Explicit out-of-scope consumers: `status`, `list`, UI presenter/actions, compact preset mapping, docs.
5. Export surfaces closed in this phase: route/result metadata only if needed to make tests and operator diagnostics unambiguous. Any additive route metadata must remain internal to meta-review gate results and must not add status/list/UI projection behavior.
6. Storage compat rule: missing streak normalizes to `0`; missing requirement normalizes to `1`.

### Baseline Preservation

1. Must-preserve behaviors:
   - threshold-meeting `rework` still routes through existing auto-rework when budget is available.
   - budget-exhausted and inconclusive outcomes still reach safe human-gate paths.
   - approve-threshold backstop still prevents open-findings approve from bypassing threshold authority.
   - sticky human-gate safety behavior remains intact.
   - parity failure remains fail-closed.
2. Allowed replacement:
   - threshold-clean `approve` may replace immediate human approval with another meta-review run until the required streak is met.
3. Forbidden regression interpretations:
   - rerun path must not involve implementer/reviewer handoff.
   - rerun path must not increment `auto_rework_count`.
   - non-clean routes must not preserve stale positive streak.
   - clean-rerun staging must not create a second, incompatible execution-context authority; it must reuse or factor the existing meta-review running context/kickoff semantics.
4. Replacement proof required if removed: any removed fallback/finalization branch must be explicitly mapped to an equivalent or stricter route in tests.

### Success / Completion Proof Boundary

1. Current success proof source: meta-review finalization route result and state write.
2. Target success proof source: same route result plus persisted `consecutive_clean_runs` value.
3. Current completion proof source: targeted finalization tests and build.
4. Target completion proof source: targeted finalization/state-helper tests covering increment/reset/rerun/unlock plus lint/typecheck/build.
5. Reused proof contract: existing meta-review gate finalization tests for threshold, parity, auto-rework, and human-gate paths.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: state snapshot and finalization route result only.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `workflow_orchestration_consumer_alignment`.
2. Secondary shape: `state_mutation_helper`.
3. Preconditions that must pass before clean-streak increment:
   - meta-review run result is `success`
   - parity validation succeeds
   - threshold authority resolves
   - recommendation is `approve`
   - no threshold-meeting findings exist relative to configured threshold
   - current state is still the expected active meta-review finalization state for the submitted run
4. Side effects forbidden before preconditions pass:
   - do not increment streak
   - do not start clean rerun
   - do not unlock human approval
5. Invalid/precondition-failure behavior: reset streak to `0` and continue through existing fail-closed or non-clean route when a safe state write can be committed. If the failure occurs while appending/persisting the fallback route and existing code rolls back to the prior snapshot, preserve that rollback behavior and verify the resulting route remains fail-closed.
6. Coordination primitives in scope: preserve existing state write/transcript append ordering and rollback behavior.

### In Scope

1. Add helper logic to classify a finalized meta-review run as threshold-clean or non-clean using existing threshold authority.
2. Increment `meta_review.consecutive_clean_runs` only for threshold-clean `approve`.
3. Reset `meta_review.consecutive_clean_runs` to `0` for threshold-meeting findings, `rework`, `inconclusive`, run error, parity failure, threshold-unresolved, dispatch failure, and auto-rework paths.
4. When updated streak is below `meta_review_consecutive_clean_runs_required`, route directly into another meta-review run.
5. When updated streak meets or exceeds the requirement, persist the existing human approval route.
6. Ensure the clean-rerun path does not increment `auto_rework_count`.
7. Add focused tests for the branch inventory above.

### Out of Scope

1. Config parser/default/schema additions.
2. Status/list/read-model/UI projection of requirement/streak.
3. Compact UI preset selector behavior.
4. Documentation beyond this task artifact.
5. Recovery redesign beyond preserving canonical streak state through finalization writes.

### Safety Defaults

1. Requirement `1` must behave like the current single-clean approval route except for explicitly persisted streak state.
2. Missing or invalid threshold authority resets streak and does not unlock approval.
3. Clean reruns must be bounded by the configured requirement and existing meta-review runtime controls.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - meta-review gate route semantics
   - canonical state mutation semantics for `meta_review.consecutive_clean_runs`
   - finalization tests that assert route/state outcomes

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. If `no`, required split: `N/A`
10. Identity/join note:
    - canonical identity path: current meta-review run result plus state snapshot streak field
    - competing identifiers: auto-rework counters and previous human-gate state are forbidden
11. Authority/source-of-truth note:
    - canonical source: threshold authority + normalized review policy + normalized meta-review snapshot
    - forbidden secondary sources: transcript prose, recommendation text alone, previous human-gate state, runtime pane text, UI preset label, and `auto_rework_count`
12. Closure-budget triage:
    - closure buckets touched: internal execution consumer, workflow orchestration consumer, state mutation
    - intentionally collapsed closures: finalization and route persistence because they are one current-run mutation path
    - explicitly deferred closures: read-model/UI/docs
13. Bounded-task-shape decision:
    - primary shape: workflow routing behavior update
    - why this bounded mix is safe: no consumer-facing projection changes are included

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Business invariant | Human approval waits for configured consecutive clean runs | gate approval route behind updated streak check | P1 | required-now |
| Control model | threshold decides clean; requirement decides unlock; streak persists progress | keep three concepts separate | P1 | required-now |
| Read path | normalized policy + normalized state | no local config/state ad hoc reads | P1 | required-now |
| Forbidden fallback | no transcript prose, recommendation-text-only, previous-human-gate-state, runtime-pane, UI-preset, or `auto_rework_count` inference | tests must cover no accidental clean route | P1 | required-now |
| Allowed resolution | clean approve below requirement reruns meta-review | add direct rerun route | P1 | required-now |
| Clean-rerun loop bound | direct clean reruns stop when updated streak reaches `meta_review_consecutive_clean_runs_required` | compare the updated streak to the normalized requirement before any rerun dispatch; never rerun after requirement is met | P1 | required-now |
| Missing data | unresolved/non-clean resets streak | write zero-streak state before safe route, except when existing rollback semantics preserve a pre-finalization snapshot after append/write failure | P1 | required-now |
| Phase boundary | routing only | no UI/status docs changes | P1 | required-now |

### 1) Required Behavior

| Scenario | Required Result | State Requirement | Priority |
| --- | --- | --- | --- |
| approve, threshold resolved clean, requirement `1` | existing human approval route | streak becomes `1` | P1 |
| approve, threshold resolved clean, requirement `2`, prior streak `0` | start another meta-review run | streak becomes `1` | P1 |
| approve, threshold resolved clean, requirement `2`, prior streak `1` | existing human approval route | streak becomes `2` | P1 |
| clean approve after updated streak reaches requirement | no further clean rerun dispatch | persist existing human approval route; rerun loop is bounded by normalized requirement | P1 |
| approve, threshold unresolved or incomplete | existing threshold-unresolved / dispatch-failed safe route | streak resets to `0` before the fallback route is persisted, unless rollback preserves pre-failure safety | P1 |
| threshold-meeting findings regardless of recommendation wording | existing non-clean route for the finalized decision | streak resets to `0`; no clean rerun or human unlock may use generic approve/rework text as clean authority | P1 |
| clean rerun or auto-rework path | existing rerun/auto-rework route for the finalized decision | clean rerun must not increment `auto_rework_count`; auto-rework must reset streak to `0` and increment only the existing auto-rework budget counter | P1 |
| rework with threshold-met findings and budget available | existing auto-rework | streak resets to `0` | P1 |
| rework with budget exhausted | existing safe human-gate route | streak resets to `0` | P1 |
| inconclusive | existing inconclusive human-gate route | streak resets to `0` | P1 |
| run error | existing run-failed human-gate route | streak resets to `0` | P1 |
| parity failure | existing dispatch-failed human-gate route | streak resets to `0` before the fallback route is persisted, unless rollback preserves pre-failure safety | P1 |
| fallback append/write failure | existing dispatch-failed rollback behavior | rollback preserves pre-failure safety and must not fabricate a zero-streak write | P1 |
| clean-rerun dispatch/staging failure | existing run-failed or dispatch-failed human-gate route | streak resets to `0` before the fallback route is persisted, unless rollback preserves pre-failure safety | P1 |
| sticky human gate | existing sticky bypass | streak must not unlock a new route | P1 |

### 2) Implementation Notes

1. Prefer small helpers for:
   - computing next clean streak
   - resetting streak
   - deciding whether clean approval should rerun or unlock
2. Reuse existing threshold authority functions:
   - `resolveMetaReviewGateThresholdAuthority`
   - `metaReviewGateThresholdIsMet`
3. Reuse existing review-policy normalization:
   - `normalizeBubbleReviewPolicy`
4. Reuse the existing `meta_review_running` route semantics for clean rerun when the required state transition, kickoff envelope, execution context, and runtime delivery observation are identical to convergence-triggered meta-review. Extract a narrower helper only if finalization cannot call the apply path without duplicating authority or changing rollback ordering; the extracted helper must live under the meta-review gate helper family and prove parity with the existing apply/staging path.
5. Keep route result semantics explicit. If a new route value is needed for clean rerun, update `MetaReviewGateRoute` and tests in the same change.
6. Preserve existing rollback behavior for append/write failures across dispatch-failed, fallback human-gate, and clean-rerun staging routes.
7. Do not duplicate meta-review execution-context construction. Reuse or extract the existing `stageMetaReviewRunningState` / kickoff-envelope path so a clean rerun has the same handoff id, execution id, active role, deadline, and runtime-delivery observation semantics as convergence-triggered meta-review.
8. If the clean-rerun path needs to preserve the incremented streak while clearing live meta-review state before staging the next run, make that state handoff explicit in a helper and cover it with tests.

### 3) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `MetaReviewGateRoute` | finalization tests, status/approval routing | preferably unchanged by reusing `meta_review_running`; additive only if required | add explicit route and tests only if existing `meta_review_running` route cannot represent rerun cleanly | Task 3 may project status copy |
| `BubbleStateSnapshot.meta_review` | state store, status, list, tests | additive already from Task 1 | mutate `consecutive_clean_runs` only | Task 3 read-model/UI |
| `review_policy` | config runtime, UI update path, SSH config projection | additive already from Task 1 | consume normalized requirement | Task 3 preset mapping |
| meta-review execution context | gate apply path, runtime delivery observation, watchdog/submission handling | unchanged or extracted helper only | reuse existing context/kickoff semantics for clean rerun | broader runtime/status projection remains Task 3 or existing watchdog behavior |

### 4) Acceptance Criteria

1. Threshold-clean approve increments persisted `consecutive_clean_runs`.
2. Clean approve below requirement starts another meta-review run directly.
3. Clean approve at requirement routes to human approval.
4. Any non-clean or unresolved finalization resets streak to `0`, with existing append/write rollback semantics preserved when a fallback route cannot be safely persisted.
5. Auto-rework count and clean streak remain separate across clean rerun, threshold-meeting auto-rework, and budget-exhausted paths.
6. Existing threshold, parity, sticky gate, and budget behavior remains covered.

## L2 - Implementation Plan

1. Add focused helper coverage around streak mutation.
2. Update `finalizeCurrentRunMetaReviewGate` to compute normalized policy once and use it for clean-run routing.
3. Reuse or factor the existing meta-review apply/staging path so clean rerun persists a fresh active meta-review execution context and runtime delivery observation consistently with convergence-triggered meta-review.
4. Add or reuse a route persistence helper for clean meta-review rerun.
5. Update state helper(s) to preserve live meta-review context correctly when rerunning and to reset/increment streak deterministically.
6. Update tests in `metaReviewGateCurrentRunFinalization.test.ts` for every Required Behavior row above: clean requirement `1`, clean requirement `2` with prior streak `0`, clean requirement `2` with prior streak `1`, bounded no-rerun-after-requirement, threshold-unresolved/incomplete approve, threshold-meeting findings independent of recommendation wording, clean-rerun versus auto-rework counter separation, rework with budget available, rework with budget exhausted, inconclusive, run error, parity failure, fallback append/write failure, clean-rerun dispatch/staging failure, and sticky human gate.
7. Update `metaReviewGateStateStaging.test.ts` and `metaReviewGateStateHelpers.test.ts` where helper ownership changes or extracted state mutation helpers need direct coverage for preserving incremented streak, resetting stale streak, and staging a fresh meta-review execution context.
8. Run:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts tests/v11/shared/metaReviewGate/metaReviewGateStateHelpers.test.ts`
   - `pnpm build`

## Review Notes

1. Check removed-behavior audit carefully: any route that previously reached human approval must either still do so when requirement is satisfied or be explicitly replaced by clean-rerun routing.
2. Verify that threshold-unresolved approve cannot increment the streak.
3. Verify that the clean-rerun route cannot consume auto-rework budget.

## Review Approval

CreatePairflowSpec `ReviewSpec` task-mode approval recorded during `ExecutePairflowPlan` orchestration:

1. Execution metadata gate passed for task identity, filename, parent plan tracker, lineage, and bubble linkage fields.
2. First review pass found a local scope/source-anchor issue: the clean-rerun path also needs the existing meta-review apply/staging route family, not only finalization/persistence.
3. The task was refined to include the apply/staging target files, source anchors, and scope wording.
4. Repeat ReviewSpec task-mode pass found no remaining findings.
5. Control model, closed-contract drift, authority fan-out, closure budget, and bounded-task-shape checks are satisfied for an implementation bubble.
6. Remaining downstream tasks remain viable as sequenced: read-model/UI after routing, docs/validation after routing plus UI/read-model.
