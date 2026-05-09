---
artifact_type: task
artifact_id: task_meta_review_gate_current_run_finalization_pipeline_v1
title: "Meta-Review Gate Current-Run Finalization Pipeline"
status: archived
phase: phase1
target_files:
  - src/v11/application/metaReviewGate/metaReviewGateCurrentRunApi.ts
  - src/v11/application/metaReviewGate/internal/metaReviewGateCurrentRun*.ts
  - src/v11/application/metaReviewGate/internal/metaReviewGateAutoRework*.ts
  - src/v11/application/metaReviewGate/internal/metaReviewGateHumanGate*.ts
  - src/v11/application/metaReviewGate/internal/metaReviewGateFindingsValidation*.ts
  - src/v11/application/metaReviewGate/metaReviewGateThresholdAuthorityApi.ts
  - src/v11/application/metaReviewGate/metaReviewGateFindingsParityApi.ts
  - src/v11/application/metaReviewGate/metaReviewGateFindingsParityHelpers.ts
  - src/v11/application/metaReviewGate/metaReviewGateFindingsMetadata.ts
  - src/v11/domain/metaReviewGate/**
  - tests/v11/application/metaReviewGate/internal/currentRun/**
  - tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/architecture/v11-placement-and-extraction-governance.md
normative_refs:
  - docs/architecture/v11-architecture-overview.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/architecture/v11-internal-module-boundaries.md
  - docs/actor-runtime-interface/execution-authority-contract-note-v1.md
  - plans/archive/tasks/refactoring/meta-review-submit-command-local-pipeline.md
owners:
  - "felho"
---

# Task: Meta-Review Gate Current-Run Finalization Pipeline

## Document Refinement Outcome (2026-05-09)

This artifact is implementation-ready for a future code-scoped Pairflow bubble. The current document-refinement pass did not authorize or perform product/runtime/source edits; all `target_files`, L2 implementation notes, acceptance criteria, and scans below describe the future implementation scope only.

If this task is executed under `review_artifact_type=document`, the allowed output is limited to refining this task/spec/progress/docs context. Any finding that requires source, test, UI, contract, or runtime config edits must route back to a code-scoped implementation bubble instead of being applied in a document bubble.

## Current Codebase Check (2026-05-09)

1. `src/v11/application/metaReviewGate/metaReviewGateCurrentRunApi.ts` currently owns the visible finalization order for a completed meta-review run:
   - normalize meta-review snapshot,
   - route error results to human gate,
   - resolve current-run findings parity,
   - resolve approve threshold authority/backstop,
   - honor sticky human gate,
   - dispatch autonomous rework,
   - route clean approve runs through clean-rerun or human approval,
   - persist fallback human routes.
2. The current implementation is functionally meaningful, but `finalizeCurrentRunMetaReviewGate(...)` still exposes the route decision tree as caller-level orchestration instead of hiding it behind one deeper command-local module.
3. Current route-specific collaborators are spread across:
   - `internal/metaReviewGateCurrentRunParity.ts`
   - `internal/metaReviewGateCurrentRunThresholdPolicies.ts`
   - `internal/metaReviewGateCurrentRunApproveRouting.ts`
   - `internal/metaReviewGateCurrentRunCleanRerun.ts`
   - `internal/metaReviewGateCurrentRunRoutePersistence.ts`
   - `internal/metaReviewGateAutoRework*.ts`
   - `internal/metaReviewGateHumanGate*.ts`
4. The architecture docs already identify `meta-review gate` as a real module identity with high volatility and multiple consumers. This task should deepen the application-local current-run finalization module, not move orchestration into `shared`.
5. No blocking open product question is currently known. The implementation should preserve existing route semantics and produce a clean final module shape, not a transitional wrapper over the old current-run helper layout.

## L0 - Policy

### Goal

Deepen the current-run meta-review gate finalization path by introducing a command-local finalization pipeline that hides the production routing order behind one small interface.

The business question this task should make explicit is:

> Given a completed meta-review run and the current bubble authority, what is the single accepted route outcome, and how is it persisted?

Callers should not manually orchestrate findings parity, approve threshold authority, sticky human gate behavior, clean-run reruns, autonomous rework, approve validation, rollback-aware human route persistence, and fallback route persistence as separate workflow calls.

### Context

`meta-review gate` decides whether a bubble returns to implementation, runs another meta-review pass, or asks for human approval. The current code already contains the right policy pieces, but the Module depth is still limited: correctness depends on maintaining route ordering across many small files.

This is the same architectural pattern as the completed `meta-review submit` deepening task: keep command-local orchestration under `application/metaReviewGate`, preserve shared/domain contracts, and make the runtime-facing Interface smaller than the Implementation.

### Chosen Architecture Direction

1. Create or reorganize a command-local current-run finalization module under `src/v11/application/metaReviewGate/internal/currentRun/**`.
2. Keep the production route orchestration in `application/metaReviewGate`.
3. Keep pure route policy in `domain/metaReviewGate/**` only when it is deterministic and dependency-free.
4. Keep shared contracts in `shared/metaReviewGate/**` only when they are genuinely multi-lane result/input vocabulary.
5. Preserve existing `MetaReviewGateResult` route taxonomy and public input/output contracts.
6. Do not introduce a new public route preview, dry-run, or diagnostics API in this task.
7. Execute this task only in a code-scoped implementation bubble or equivalent direct implementation mode. A document-scoped bubble may refine this artifact but must not apply the code/test changes described here.

### In Scope

1. Introduce one narrow command-local finalization pipeline function named `runCurrentRunMetaReviewGateFinalization(...)`.
2. Make `finalizeCurrentRunMetaReviewGate(...)` delegate to that pipeline and stop reconstructing the route decision tree itself.
3. Preserve current route outcomes:
   - `human_gate_run_failed`
   - `human_gate_dispatch_failed`
   - `human_gate_sticky_bypass`
   - `human_gate_threshold_not_met`
   - `human_gate_threshold_unresolved`
   - `human_gate_approve`
   - `human_gate_budget_exhausted`
   - `human_gate_inconclusive`
   - `auto_rework`
   - `meta_review_running`
4. Preserve current ordering:
   - error result before parity,
   - parity before threshold policy,
   - approve open-findings threshold backstop before approve/human routing,
   - sticky human gate before autonomous rework and normal approve routing,
   - autonomous rework only when recommendation is `rework` and budget is available,
   - approve validation before final human approval route,
   - fallback human route on dispatch or validation failure.
5. Keep state writes and transcript appends behind narrowed current-run route effect modules that preserve rollback behavior.
6. Move the current-run route decision helpers into the new `internal/currentRun/**` module or delete/replace them. Do not leave old `internal/metaReviewGateCurrentRun*.ts` helper files as compatibility wrappers or transitional public surface.
7. Move tests toward the new finalization pipeline Interface while retaining focused lower-level tests only where they protect independent domain/shared policy.
8. Add final evidence scans proving `metaReviewGateCurrentRunApi.ts` no longer owns the full route decision tree and the old current-run helper layout has been removed.

### Out of Scope

1. Changing the meta-review result payload contract.
2. Changing route names or `MetaReviewGateResult` shape.
3. Changing execution-authority semantics.
4. Changing the autonomous rework budget policy.
5. Changing approve threshold policy meaning.
6. Changing sticky human gate behavior.
7. Moving current-run orchestration into `shared/metaReviewGate`.
8. Adding a public dry-run, preview, UI, or diagnostics surface.
9. Broad cleanup of unrelated `metaReviewGate` apply/start/pane-binding modules.
10. Implementing any source/test/runtime changes while this artifact is being handled as `review_artifact_type=document`.

### Control Model

1. `business_invariant`: a completed meta-review run must produce exactly one route outcome based on canonical current bubble state, current meta-review snapshot authority, findings parity, threshold policy, and configured review policy.
2. `control_model`: route selection is controlled by the current bubble state plus the accepted `MetaReviewResult`; persisted route state and protocol envelopes are effects of that selected route, not independent sources of truth.
3. `read_path_rule`: findings parity and threshold authority may read only the run result, canonical report JSON, bubble artifacts directory, and same-bubble findings artifacts through existing read ports.
4. `forbidden_fallback`: do not infer approval safety from missing artifacts, stale reviewer output, UI state, transcript prose, or human-readable summaries when structured parity/threshold authority is required.
5. `allowed_resolution_path`: deterministic same-authority resolution is allowed through the existing parity metadata and threshold authority helpers when they read from the same bubble artifacts and current run result.
6. `missing_data_rule`: missing or unresolved required parity/threshold data must fail closed to the existing fallback human route behavior; it must not silently approve or auto-rework unless the current policy already permits that route.
7. `phase_boundary`: this task owns internal execution and workflow orchestration closure for current-run finalization. It does not own new payload production, UI consumption, or external activation.

### Closed-Contract Drift Check

1. `source_anchors`:
   - `src/v11/application/metaReviewGate/metaReviewGateCurrentRunApi.ts`
   - `src/v11/application/metaReviewGate/internal/metaReviewGateCurrentRun*.ts`
   - `src/v11/application/metaReviewGate/internal/metaReviewGateAutoRework*.ts`
   - `src/v11/application/metaReviewGate/internal/metaReviewGateHumanGate*.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateResultContract.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateRouteContract.ts`
   - `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`
2. `canonical_elements`:
   - active `meta_review.execution_context`,
   - current loaded bubble state and fingerprint,
   - accepted `MetaReviewResult`,
   - findings parity metadata,
   - threshold authority result when required,
   - `MetaReviewGateResult.route`.
3. `guard_elements`:
   - expected state checks,
   - rollback state and expected fingerprint on append failure,
   - auto-rework count/limit,
   - consecutive clean-run requirement,
   - approve validation command result.
4. `compat_elements`: none intentionally promoted by this task.
5. `closed_terms`: `human_gate`, `auto_rework`, `meta_review_running`, `sticky_human_gate`, `thresholdAuthority`, `parityMetadata`, `execution_context`.
6. `forbidden_reinterpretations`:
   - do not downgrade `execution_context` authority to optional advisory state,
   - do not treat missing threshold/parity data as approval,
   - do not make transcript append success the primary route decision authority,
   - do not change route names or route meaning.
7. `drift_status`: intended `clarified_without_semantic_change`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Rationale: this is an internal application orchestration refactor. Public CLI/API inputs, protocol payloads, route names, and result shapes must remain unchanged.
3. If implementation discovers that changing `MetaReviewGateResult`, route names, protocol envelope payloads, or execution-authority semantics is necessary, stop and route back to task refinement or a Plan -> Task chain.
4. If a document-scoped review discovers source-code changes are required, that is not a blocker on this artifact's implementability; it is a routing decision to run the implementation under code scope.

## L1 - Change Contract

### 1) Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/metaReviewGate/metaReviewGateCurrentRunApi.ts` | `finalizeCurrentRunMetaReviewGate` | Delegate to one command-local finalization pipeline and avoid manual route sequencing | P1 | required-now | T1,T2,T9,AC1 |
| CS2 | `src/v11/application/metaReviewGate/internal/currentRun/**` | new pipeline | Own production route order from run result through persisted `MetaReviewGateResult` | P1 | required-now | T1-T8 |
| CS3 | `src/v11/application/metaReviewGate/internal/metaReviewGateCurrentRunParity.ts` | current parity resolution | Move into `internal/currentRun/**` or replace with an equivalent private pipeline step; the old file must not remain | P1 | required-now | T2,T3,T9 |
| CS4 | `src/v11/application/metaReviewGate/internal/metaReviewGateCurrentRunThresholdPolicies.ts` | threshold backstop/clean approval | Move into `internal/currentRun/**` or replace with an equivalent private pipeline step; preserve threshold authority semantics | P1 | required-now | T4,T5,T9 |
| CS5 | `src/v11/application/metaReviewGate/internal/metaReviewGateCurrentRunApproveRouting.ts` | approve clean-rerun/validation route | Move into `internal/currentRun/**` or replace with an equivalent private approve-route step; preserve clean-run and approve-validation behavior | P1 | required-now | T5,T6,T9 |
| CS6 | `src/v11/application/metaReviewGate/internal/metaReviewGateCurrentRunCleanRerun.ts` | clean rerun route | Move into `internal/currentRun/**` or replace with an equivalent private route step; preserve `meta_review_running` behavior | P1 | required-now | T5,T9 |
| CS7 | `src/v11/application/metaReviewGate/internal/metaReviewGateCurrentRunRoutePersistence.ts` | current-run human route persistence adapter | Move into `internal/currentRun/**` or replace with an equivalent private route effect step; preserve rollback-aware state/transcript behavior | P1 | required-now | T8,T9 |
| CS8 | `src/v11/application/metaReviewGate/internal/metaReviewGateAutoRework*.ts` | autonomous rework dispatch | Keep as a route effect module only if it is not current-run-specific; otherwise move its current-run-specific contract/effect pieces under `internal/currentRun/**` | P1 | required-now | T7,T9 |
| CS9 | `src/v11/application/metaReviewGate/internal/metaReviewGateHumanGate*.ts` | human route persistence | Keep as lower-level human-gate persistence only if it remains route-neutral; current-run adapter logic belongs under `internal/currentRun/**` | P1 | required-now | T8,T9 |
| CS10 | `tests/v11/application/metaReviewGate/internal/currentRun/**` | orchestration-level current-run finalization tests | Move route-order and branch coverage to application-local tests for the new pipeline Interface. Route-neutral persistence/policy tests may remain under `tests/v11/shared/metaReviewGate/**` only when they do not imply shared ownership of the pipeline. | P1 | required-now | T1-T9 |

### 2) Canonical Contract Matrix

| Condition | Required Owner | Required Route/Effect | Forbidden Behavior | Required Evidence |
|---|---|---|---|---|
| `runResult.status === "error"` | current-run pipeline | persist `human_gate_run_failed` without parity/threshold lookup | trying to parse failed run as positive route evidence | T1 |
| parity validation fails | current-run pipeline via parity step | persist `human_gate_dispatch_failed` with parity metadata when available | routing approve/rework from unverified positive claim | T2,T3 |
| approve claims open findings | threshold policy step behind pipeline | require threshold authority/backstop before approve route | treating open-findings approve as clean approval without authority | T4 |
| threshold required but unresolved/not met | threshold policy + human route persistence | fail closed to existing threshold human route/fallback behavior | silent approval or auto-rework from missing threshold data | T4,T5 |
| sticky human gate set | current-run pipeline | run approve validation only for approve; otherwise preserve human route through sticky bypass | bypassing sticky human gate for normal auto-rework path | T6 |
| recommendation `rework` and budget available | auto-rework route step | dispatch auto-rework; fallback to human route on missing message or append failure | dispatching without non-empty target message | T7 |
| recommendation `rework` and budget exhausted | current-run pipeline + human route policy | persist `human_gate_budget_exhausted` with existing sticky human-gate semantics | inventing a `human_gate_rework` route or dispatching auto-rework after budget exhaustion | T7,T10 |
| recommendation `inconclusive` | current-run pipeline + human route policy | persist `human_gate_inconclusive` through the existing human route resolver | treating inconclusive as approve, rework, or threshold fallback | T10 |
| recommendation `approve` and clean-run count below required | approve route step | route clean rerun as `meta_review_running` | asking human approval before required clean-run count | T5 |
| recommendation `approve` and clean-run requirement met | approve route step | run approve validation before human approval route | final approval without approve validation | T6 |
| human route persistence append fails after state write | human route persistence step | preserve existing rollback attempt and error semantics | leaving successful-looking state without canonical failure | T8 |

### 3) Interface and Data Contract

#### External Interface

The runtime-facing current-run finalization Interface should return `MetaReviewGateResult` and should not return a bag of intermediate parity, threshold, route, persistence, and rollback fields for the caller to interpret.

Required entry signature:

```ts
runCurrentRunMetaReviewGateFinalization(
  input: FinalizeCurrentRunMetaReviewGateInput
): Promise<MetaReviewGateResult>
```

#### Internal Implementation Sub-Contracts

Inside the pipeline, internal state may be structured as named sub-contracts:

1. `runAuthority`
   - resolved bubble,
   - loaded state and fingerprint,
   - normalized meta-review snapshot,
   - current run result.
2. `routeEvidence`
   - parity result,
   - threshold authority/backstop result,
   - review policy clean-run requirement,
   - approve validation evidence.
3. `routeDecision`
   - selected route,
   - target state,
   - fallback reason when applicable,
   - sticky/consecutive clean-run fields.
4. `routeEffects`
   - state persistence,
   - transcript/inbox append,
   - rollback behavior on append failure,
   - autonomous rework dispatch.

`finalizeCurrentRunMetaReviewGate(...)` must not receive these structures and then manually decide which effect to execute. They exist to keep the pipeline Implementation explicit without leaking route-order knowledge outside the Module.

### 4) Side Effects Contract

| Area | Allowed | Forbidden | Priority |
|---|---|---|---|
| route preparation | read current state, run result, artifacts, review policy, parity metadata, threshold authority | state writes, transcript appends | P1 |
| route decision | select one route from canonical current-run evidence | route from prose summary, UI state, stale artifact, or missing positive evidence | P1 |
| route persistence | write state through existing state port and append protocol envelope through existing transcript port | direct infrastructure imports or ad hoc persistence outside ports | P1 |
| rollback | preserve existing rollback attempt on append failure after state write | swallowing append failure or reporting success after partial transition | P1 |
| caller | call the finalization pipeline | manually sequence parity, threshold, sticky, auto-rework, approve validation, and persistence | P1 |

### 5) Error and Fallback Contract

| Trigger | Behavior | Required Error/Route Semantics | Priority |
|---|---|---|---|
| invalid or missing active execution context needed by route effects | fail closed with existing `MetaReviewGateError` semantics | preserve current reason-code class | P1 |
| state write conflict | throw/preserve `META_REVIEW_GATE_STATE_CONFLICT` behavior | no blind retry or silent route success | P1 |
| parity failure | human fallback route | preserve parity metadata when available | P1 |
| threshold unresolved/not met | threshold fallback/human route | preserve existing backstop reason codes | P1 |
| auto-rework missing target message | human fallback route | preserve `META_REVIEW_GATE_REWORK_DISPATCH_FAILED` semantics | P1 |
| append failure after state transition | rollback attempt then error | preserve rollback reason metadata | P1 |

### 6) Dependency Constraints

| Type | Items | Priority |
|---|---|---|
| must-use | `src/v11/application/metaReviewGate/internal/currentRun/**` as command-local owner of current-run finalization orchestration | P1 |
| must-use | existing state/transcript/artifact read ports from `FinalizeCurrentRunMetaReviewGateInput` | P1 |
| must-use | existing domain policy helpers for pure threshold, human route, and findings policy | P1 |
| must-not-use | new direct infrastructure imports from finalization internals | P1 |
| must-not-use | moving current-run route orchestration into `shared/metaReviewGate` | P1 |
| must-not-use | retaining `src/v11/application/metaReviewGate/internal/metaReviewGateCurrentRun*.ts` as compatibility wrappers, transitional shims, or pass-through modules | P1 |
| must-not-use | public preview/dry-run route API | P2 |
| must-not-use | route/result taxonomy changes without task refinement | P1 |

### 7) Test Matrix

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|---|
| T1 | failed run result | `runResult.status=error` | finalization pipeline runs | persists `human_gate_run_failed` and does not require positive parity | P1 |
| T2 | parity failure | positive run result with mismatched/missing findings evidence | pipeline runs | persists `human_gate_dispatch_failed` with fail-closed reason | P1 |
| T3 | parity success | positive run result with matching structured findings evidence | pipeline runs | downstream routing receives parity-resolved run result and metadata | P1 |
| T4 | approve with open findings threshold unresolved | approve report claims open findings, threshold authority missing/unresolved | pipeline runs | blocks approve and persists existing threshold fallback route/reason | P1 |
| T5 | approve clean rerun required | approve is clean but clean-run count is below configured requirement | pipeline runs | routes `meta_review_running` for another clean run | P1 |
| T6 | approve validation failure | clean-run requirement met, approve validation fails | pipeline runs | dispatches auto-rework when command failure and budget allow; otherwise human fallback with validation reason | P1 |
| T7 | autonomous rework dispatch | recommendation `rework`, budget available, target message present | pipeline runs | route is `auto_rework`; missing message falls back to human route | P1 |
| T8 | human route append rollback | state write succeeds but human gate append fails | pipeline runs | rollback behavior and error metadata match existing semantics | P1 |
| T9 | caller knowledge reduction | implementation complete | import/call-site scans run | `metaReviewGateCurrentRunApi.ts` delegates narrowly and no longer owns full route decision tree | P1 |
| T10 | human-gate route taxonomy preservation | budget-exhausted rework and inconclusive recommendations | pipeline runs | routes remain `human_gate_budget_exhausted` and `human_gate_inconclusive`; no `human_gate_rework` route is introduced | P1 |

### 8) Mirrored Surface Checklist

The route taxonomy and `MetaReviewGateResult` meaning are mirrored in multiple sections. The Canonical Contract Matrix is the source of truth; these surfaces must stay aligned with it:

1. L0 In Scope route outcome list.
2. L0 Control Model, especially missing-data and forbidden-fallback rules.
3. L1 Call-Site Matrix for current-run pipeline ownership and test placement.
4. L1 Canonical Contract Matrix.
5. L1 Interface and Data Contract external return shape.
6. L1 Side Effects Contract.
7. L1 Error and Fallback Contract.
8. L1 Test Matrix.
9. Acceptance Criteria AC3-AC5 and AC7-AC11.
10. Suggested final-state scans.

### 9) Authority Fan-out Scan

| Bucket | Current Owner / Consumer | In Scope? | Notes |
|---|---|---|---|
| `authority_producer` | meta-review submit path produces the accepted `MetaReviewResult` and active meta-review execution authority | no | This task consumes accepted run authority; it does not change submit authority production. |
| `persisted_authority` | bubble state snapshot and protocol transcript/inbox artifacts | yes | Current-run finalization writes route state and appends route envelopes through existing ports. |
| `internal_execution_consumers` | current-run finalization, auto-rework dispatch, clean-rerun kickoff, approve validation | yes | This is the primary consumer family being deepened. |
| `workflow_orchestration_consumers` | `finalizeCurrentRunMetaReviewGate(...)` and meta-review gate routing callers | yes | Caller-visible route ordering must collapse behind `runCurrentRunMetaReviewGateFinalization(...)`. |
| `read_model_consumers` | status/list/UI projections that observe route state and envelopes | no | Must remain behavior-compatible; no read-model contract change is authorized. |
| `cleanup_recovery_consumers` | rollback after append failure and existing recovery diagnostics | yes | Existing rollback/fail-closed behavior must be preserved, not redesigned. |

### 10) Closure-Budget Gate

| Closure Bucket | In Scope? | Handling |
|---|---|---|
| `authority_producer` | no | Existing submit/meta-review result authority is preserved. |
| `shared_contract` | no | `MetaReviewGateResult` and route taxonomy are preserved; no public contract change. |
| `internal_execution_consumers` | yes | Current-run finalization orchestration is the bounded refactor target. |
| `workflow_orchestration_consumers` | yes | `finalizeCurrentRunMetaReviewGate(...)` becomes a narrow delegating entrypoint. |
| `read_model_consumers` | no | Compatibility is verified only through route taxonomy/result preservation. |
| `persisted_authority_or_schema` | yes | Existing state/transcript writes remain in scope, but schema/shape is unchanged. |
| `cleanup_recovery_consumers` | yes | Rollback/fail-closed behavior is preserved in the same bounded route-effect path. |

Split decision: single task remains acceptable because this is a behavior-preserving internal refactor of one existing mutable workflow path. It collapses adjacent internal execution, workflow orchestration, persistence, and rollback closures already owned by the same current-run route path, without changing shared contract, read model, or authority production.

### 11) Bounded-Task Shape

1. `primary_shape`: `consumer_family_alignment`
2. `secondary_shape`: `fail_closed_hardening`
3. The mix is safe because the same current-run finalization path owns route selection, route persistence, and rollback-on-append-failure behavior today. The task preserves failure semantics while moving caller-visible ordering behind a deeper Module.
4. `coordination_concurrency_hardening`: not in scope. No new locks, leases, mutexes, idempotency rules, or serialization rules are authorized.
5. `activation_or_read_model`: not in scope. No CLI/UI/API/read-model activation behavior changes are authorized.

### 12) Complexity-Risk Triage

| Axis | Score | Rationale |
|---|---:|---|
| `authority_risk` | 1 | Consumes existing run/state authority but does not create a new authority. |
| `surface_spread` | 2 | Touches application orchestration, route-effect helpers, and route tests. |
| `identity_join_risk` | 1 | Same-bubble artifact parity and run-result identity must remain aligned. |
| `activation_coupling` | 0 | No new activation path. |
| `prerequisite_risk` | 0 | Existing code and tests are present. |
| `acceptance_multiplicity` | 1 | Multiple route branches must be preserved. |

`risk_score`: 5  
Split decision: keep as one task because the scope is a cleanup/refactor of one existing workflow family and explicitly forbids shared contract/read-model/activation changes. If implementation discovers route taxonomy, result shape, or execution-authority changes are required, stop and route back to task refinement or a Plan -> Task chain.

### 13) Baseline Preservation

1. `must_preserve_behaviors`:
   - current `MetaReviewGateResult` route taxonomy,
   - error-result human fallback,
   - parity fail-closed behavior,
   - approve open-findings threshold backstop,
   - sticky human gate behavior,
   - auto-rework budget/message behavior,
   - clean-rerun behavior,
   - approve validation behavior,
   - rollback-on-append-failure behavior.
2. `allowed_resolution_paths`:
   - existing same-bubble artifact parity reads,
   - existing threshold authority resolution,
   - existing human route resolver,
   - existing rollback helper.
3. `forbidden_regression_interpretations`:
   - introducing `human_gate_rework`,
   - treating missing parity/threshold data as approve,
   - treating transcript append success as route decision authority,
   - moving orchestration to `shared/metaReviewGate`,
   - retaining old current-run helper files as pass-through wrappers.
4. `replacement_proof_required_if_removed`: any removed current-run helper must be replaced by equivalent behavior under `internal/currentRun/**`, proven by route branch tests and final-state scans.

### 14) Precondition and Side-Effect Boundary

1. Route preparation and route decision preconditions must complete before route state writes or transcript appends.
2. Invalid or missing required parity/threshold evidence must not produce approval or auto-rework side effects outside existing fallback behavior.
3. State writes must continue to use expected state/fingerprint checks.
4. Transcript append failure after state write must continue to trigger the existing rollback attempt and error semantics.
5. No new side effect may occur before the route decision has been selected from canonical current-run evidence.

### 15) Execution-Mode Guard

1. `document_scope_behavior`: refine task/spec/progress/docs artifacts only; do not edit implementation files, tests, UI components, contracts, dependency files, build artifacts, or runtime config.
2. `code_scope_behavior`: implement the refactor described by L0-L2, then run the implementation validation suite in AC12.
3. `route_back_trigger`: if the only way to satisfy reviewer feedback in document scope is to change source or tests, emit a blocker or replan request and preserve this task as the implementation handoff.
4. `primary_artifact_rule`: this file remains the primary artifact for document refinements; do not replace it with a separate prose handoff unless a future task explicitly names a new target path.

## Acceptance Criteria

1. AC1: `finalizeCurrentRunMetaReviewGate` delegates to `runCurrentRunMetaReviewGateFinalization(...)`.
2. AC2: The route decision order is owned by `application/metaReviewGate/internal/currentRun/**`.
3. AC3: Route names, `MetaReviewGateResult` shape, public CLI/API behavior, and protocol payload meaning are unchanged.
4. AC4: Findings parity, threshold authority/backstop, sticky human gate, auto-rework, clean-rerun, approve validation, and human-route persistence semantics are preserved.
5. AC5: Missing required parity or threshold data continues to fail closed through existing fallback route behavior.
6. AC6: No new public dry-run, preview, UI, diagnostics, or shared orchestration surface is introduced.
7. AC7: Tests cover the finalization pipeline through its application-local Interface for the route branches in the test matrix.
8. AC8: Existing focused persistence/policy tests remain only where they protect independent route-neutral behavior; orchestration-order tests move to the pipeline or public finalization entry.
9. AC9: Final evidence includes scans showing that `metaReviewGateCurrentRunApi.ts` no longer imports/calls a broad spread of parity, threshold, sticky, auto-rework, approve routing, and route persistence helpers to reconstruct finalization order.
10. AC10: No `src/v11/application/metaReviewGate/internal/metaReviewGateCurrentRun*.ts` files remain after the refactor. Current-run-specific behavior must live under `src/v11/application/metaReviewGate/internal/currentRun/**`.
11. AC11: Any retained `metaReviewGateAutoRework*` or `metaReviewGateHumanGate*` module must be route-neutral. If it still knows current-run finalization context or route ordering, it must move under `internal/currentRun/**`.
12. AC12: For the code-scoped implementation close, `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, relevant meta-review gate tests, broader affected tests, `pnpm test`, and `pnpm build` pass or are reported with exact failures. A document-scoped refinement pass may intentionally skip these runtime/build checks when it made no source/test/runtime changes, but its PASS summary must say so and must not attach fabricated evidence.
13. AC13: The implementation preserves the canonical route list from `metaReviewGateRoutes`; no `human_gate_rework` route is introduced.

Suggested final-state scans:

```bash
rg 'resolveCurrentRunParity|resolveApproveThresholdBackstop|resolveThresholdCleanApproval|maybeRunStickyApproveValidation|routeApproveMetaReviewResult|dispatchAutoRework|persist(DispatchFailed|Resolved|RunFailed)HumanRoute' src/v11/application/metaReviewGate/metaReviewGateCurrentRunApi.ts -n
find src/v11/application/metaReviewGate/internal -maxdepth 1 -name 'metaReviewGateCurrentRun*.ts' -print
find src/v11/application/metaReviewGate/internal/currentRun -maxdepth 2 -type f | sort
rg 'shared/metaReviewGate/internal|application/metaReviewGate/internal/.*/internal' src tests -n
rg 'MetaReviewGateResult|human_gate_|auto_rework|meta_review_running' src/v11/application/metaReviewGate src/v11/shared/metaReviewGate tests/v11/application/metaReviewGate tests/v11/shared/metaReviewGate -n
```

Expected result: the first scan should be empty or contain only comments explaining delegation evidence; the old top-level `metaReviewGateCurrentRun*.ts` helper scan should be empty; `internal/currentRun/**` should contain the current-run finalization pipeline and current-run-specific route steps; no forbidden internal deep import should appear; route taxonomy references should remain compatible with existing tests.

## L2 - Implementation Notes

1. Prefer a small function module rather than a class or service object.
2. The required Interface name is `runCurrentRunMetaReviewGateFinalization`.
3. Keep route policy and route effects distinct inside the Implementation, but do not expose that distinction to `metaReviewGateCurrentRunApi.ts`.
4. Do not retain the old top-level `metaReviewGateCurrentRun*.ts` helper files as pass-throughs. Git history and tests are the migration safety net; the final tree should be clean.
5. Move current-run-specific files to the narrowest command-local directory and avoid promoting anything to `shared` without multi-lane justification.
6. Do not weaken rollback semantics to simplify the pipeline.
7. Do not merge threshold backstop and clean-approval threshold behavior into one vague helper unless the resulting Interface preserves both route-specific reason semantics.
8. If implementation discovers that `MetaReviewGateResult` needs a new route/status to model the current behavior cleanly, stop and refine this task; do not add route taxonomy in the same refactor under this task-only artifact.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | broader `metaReviewGate` public/internal surface cleanup | L2 | P2 | later-hardening | architecture docs identify `meta-review gate` as a module identity | After current-run finalization is deepened, review the remaining apply/start/pane-binding files for public/private boundary cleanup. |
| H2 | route taxonomy contract tests | L2 | P2 | later-hardening | route taxonomy is mirrored across domain/application/tests | Add a focused contract test if existing route-result coverage does not already lock every `metaReviewGateRoutes` member. |
| H3 | diagnostics taxonomy cleanup | L2 | P3 | later-hardening | fallback reasons are preserved but remain spread across route effects | Consider a later route diagnostics normalization task only if implementation shows duplicated reason-string construction remains painful. |

## Open Questions

No blocking open questions are known at draft time.

Non-blocking implementation choices:

1. Whether `metaReviewGateAutoRework*` has route-neutral pieces worth retaining outside `internal/currentRun/**`.
2. Whether `metaReviewGateHumanGate*` has route-neutral persistence pieces worth retaining outside `internal/currentRun/**`.

These choices do not require product clarification as long as current-run-specific behavior is not left behind as a transitional helper surface.

## Review Control

1. Review must check placement first: current-run finalization orchestration belongs in `application/metaReviewGate`, not `shared/metaReviewGate`.
2. Review must reject implementations that only move files but leave `finalizeCurrentRunMetaReviewGate` reconstructing the route order.
3. Review must compare route semantics against current tests and source anchors before approving.
4. Review must treat route taxonomy changes as out of scope.
5. Review must verify caller knowledge reduction with scans, not only by reading the new directory layout.
6. Review of a document-scoped pass must check only artifact readiness and scope consistency. It must not demand implementation evidence from a pass that was explicitly forbidden from changing code.

## Assumptions

1. Current meta-review gate route behavior is correct and should be preserved.
2. The immediate architecture goal is depth and locality, not new product behavior.
3. The previous `meta-review submit` deepening task is a useful pattern but not a requirement to duplicate file layout exactly.
4. A standalone task file is sufficient because this is a bounded internal refactor without public contract-boundary override.
