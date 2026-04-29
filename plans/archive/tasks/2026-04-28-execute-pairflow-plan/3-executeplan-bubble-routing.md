---
artifact_type: task
artifact_id: task_execute_pairflow_plan_bubble_routing_v1
title: "ExecutePairflowPlan Bubble Routing"
task_family_id: executeplan-bubble-routing
sequence_key: "3"
task_id: 3-executeplan-bubble-routing
status: archived
phase: phase3
target_files:
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md
prd_ref: null
plan_ref: plans/archive/plans/2026-04-28-execute-pairflow-plan-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
doc_bubble_id: executeplan-bubble-routing-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-04-28-execute-pairflow-plan
archive_path: plans/archive/tasks/2026-04-28-execute-pairflow-plan/3-executeplan-bubble-routing.md
owners:
  - "felho"
---

# Task: ExecutePairflowPlan Bubble Routing

## Current Codebase Check (2026-04-28)

1. The repo-local `ExecutePairflowPlan` skill source now exists under `.claude/skills/ExecutePairflowPlan/`.
2. The merged Task 1 metadata baseline is already encoded in:
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/FixPlanMetadata.md`
3. The merged Task 2 orchestrator-shell baseline is already encoded in:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
4. No repo-local bubble-routing workflow files exist yet for document or implementation bubbles.
5. The next missing slice is bubble-side lifecycle interpretation and delegation through `UsePairflow`, not additional metadata expansion.
6. New metadata ideas may exist in parallel discussion, but they are not yet required to start or finish this task unless a concrete blocker proves otherwise against the current merged baseline.

## L0 - Policy

### Goal

Implement the first repo-local bubble-routing layer for `ExecutePairflowPlan` by adding workflow contracts that:

1. read task bubble linkage plus Pairflow lifecycle truth,
2. delegate create/review/close/troubleshoot work through `UsePairflow`,
3. map raw bubble-side outcomes into the normalized route classes already defined by Task 2,
4. stop at the correct settled checkpoint or human checkpoint,
5. and emit normalized replanning only when the bubble-side route contract proves it.

This task must close the bubble-routing gap without reopening the merged metadata baseline, without absorbing plan/task follow-through logic, and without pulling progress/archive aftermath into the same slice.

### Primary Deliverable Shape

1. Produce repo-local bubble-routing workflow source under `.claude/skills/ExecutePairflowPlan/Workflows/`:
   - `HandleDocumentBubble.md`
   - `HandleImplementationBubble.md`
2. Update `SKILL.md` only as needed so the top-level routing inventory and orchestration notes point to the new repo-local bubble-routing surfaces rather than implying that the top-level skill delegates directly from every route straight into raw `UsePairflow` commands.
3. Update `ResolvePlanState.md` only where needed to keep exact contract parity with the bubble-routing outputs already promised by Task 2:
   - normalized review routes,
   - normalized close routes,
   - normalized replanning signal,
   - troubleshooting / fail-closed boundaries.
4. Bubble-routing workflows must own:
   - reading persisted bubble linkage,
   - reading Pairflow lifecycle truth,
   - deciding whether to create, review, close, troubleshoot, or normalize replanning,
   - and returning a normalized output that Task 4 can consume later.
5. Bubble-routing workflows must not own:
   - new metadata contract design,
   - plan/task review loops,
   - supersede/archive execution,
   - progress/archive aftermath,
   - or remote execution support.

### Domain / Control Model Summary

1. Business invariant: the orchestrator must reduce operator-held bubble state without weakening Pairflow lifecycle discipline or human approval gates.
2. Control model: `ExecutePairflowPlan` remains the orchestrator only; this task adds repo-local bubble-routing workflows that delegate lifecycle actions through `UsePairflow`, not a second lifecycle system.
3. Read-path rule:
   - task metadata provides bubble linkage only,
   - Pairflow provides lifecycle truth,
   - `ResolvePlanState` continues to own the normalized route taxonomy,
   - and bubble-routing workflows translate raw bubble-side truth into that existing taxonomy.
4. Forbidden fallback:
   - do not infer bubble truth from task metadata alone,
   - do not let the top-level orchestrator classify raw Pairflow states directly,
   - do not turn operator intuition into a hidden route source when Pairflow state and task linkage can answer the question,
   - and do not treat new metadata experiments as an implicit prerequisite for this task.
5. Allowed resolution path:
   - use the merged Task 1 / Task 2 contract as the active baseline,
   - use `UsePairflow` workflows as the lifecycle execution surface,
   - and emit normalized replanning only after the bubble-routing layer has already concluded that continuing the current bubble path is no longer the correct route.
6. Missing-data rule:
   - if task metadata lacks trustworthy bubble linkage, fail closed to the already-defined orchestration checkpoint path rather than inventing a bubble identity,
   - if Pairflow lifecycle truth cannot be read cleanly, route to troubleshooting only when the situation is explicitly a runtime/lifecycle issue; otherwise fail closed.
7. Phase boundary:
   - contract closure: merged Task 1 / Task 2 baseline, preserved here
   - workflow orchestration closure: owned here for bubble-side route handling only
   - bubble-detail interpretation closure: owned here
   - plan/task follow-through closure: successor Task 4
   - cleanup/recovery aftermath closure: successor Task 5

### Plan Linkage

1. Parent plan gap closed: missing bubble lifecycle delegation, exit classification, and settled-checkpoint stop behavior.
2. Depends on:
   - `plans/archive/tasks/2026-04-28-execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `plans/archive/tasks/2026-04-28-execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
3. Unlocks / impacts successors:
   - `plans/archive/tasks/2026-04-28-execute-pairflow-plan/4-executeplan-plan-and-task-routing.md`
   - `plans/archive/tasks/2026-04-28-execute-pairflow-plan/5-executeplan-progress-archive-and-pilot.md`
4. Task-list impact: adds the executable Task 3 artifact promised by the plan and closes the bubble-side ownership gap that Task 4 must not reopen.
5. Inherited validation / exit expectation: this task must prove that raw bubble lifecycle interpretation now has a single owner and that the plan/task layer can later consume only normalized outputs rather than raw Pairflow state.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/archive/plans/2026-04-28-execute-pairflow-plan-plan-v1.md`
   - `plans/archive/tasks/2026-04-28-execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `plans/archive/tasks/2026-04-28-execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/UsePairflow/SKILL.md`
2. Canonical elements:
   - orchestrator-only control model
   - plan sequencing authority
   - task detailed execution authority
   - Pairflow bubble lifecycle authority
   - normalized route taxonomy owned by `ResolvePlanState`
   - local-only V1 scope
3. Guard elements:
   - settled-checkpoint vs human-checkpoint separation
   - normalized review vs close vs replanning route boundaries
   - fresh-context downstream execution expectation
4. Compat-only elements:
   - existing concrete bubble ids persisted as task linkage values
   - lifecycle troubleshooting route when Pairflow truth is unavailable but the runtime problem is explicit
5. Forbidden reinterpretations:
   - do not redesign the Task 1 metadata contract here
   - do not move normalized replanning consumption into bubble routing if it belongs to Task 4
   - do not let the top-level skill directly own raw Pairflow-state mapping after this task
   - do not let newer metadata discussion become a hidden dependency without a demonstrated blocker

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `plans/archive/plans/2026-04-28-execute-pairflow-plan-plan-v1.md`
   - `plans/archive/tasks/2026-04-28-execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `plans/archive/tasks/2026-04-28-execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/UsePairflow/SKILL.md`
2. Actual touched scope: `workflow_orchestration_consumers`
3. Mutation entrypoints in scope: repo-local skill markdown workflows only; no product/runtime code and no global installed skill copies.
4. Hidden scope ruled out:
   - no new metadata reference contract,
   - no plan/task workflow body implementation,
   - no archive/supersede execution,
   - no remote executor support,
   - no pilot/reporting work.
5. Branch inventory note:
   - approved task with no document bubble linkage
   - linked document bubble that needs review
   - linked document bubble that is approved and ready to close
   - linked implementation bubble that needs review
   - linked implementation bubble that is approved and ready to close
   - explicit runtime/lifecycle troubleshooting
   - bubble-origin normalized replanning back to the plan/task layer
   - fail-closed checkpoint when raw bubble truth cannot be normalized safely
6. Why the declared task shape matches reality: the touched scope is the bubble-side orchestration consumer family that sits between the Task 2 route taxonomy and `UsePairflow`. It does not reopen the metadata producer contract and does not own downstream archive or plan/task follow-through behavior.

### Authority Boundary Map

1. Authority producer:
   - Task 1 remains the metadata authority producer
   - Task 2 remains the normalized route-taxonomy producer
2. Stored authority:
   - task files store bubble linkage only
   - Pairflow stores lifecycle truth
3. In-scope consumers:
   - repo-local bubble-routing workflows
   - normalized route emission back into the orchestrator flow
   - settled-checkpoint and human-checkpoint routing for bubble work
4. Explicit out-of-scope consumers:
   - plan/task artifact mutation workflows
   - progress/archive completion consumers
   - remote execution consumers
   - new metadata producer work
5. Export surfaces closed in this phase:
   - repo-local document-bubble routing contract
   - repo-local implementation-bubble routing contract
   - explicit boundary between raw Pairflow detail and normalized replanning output

### Baseline Preservation

1. Must-preserve behaviors:
   - `ExecutePairflowPlan` remains the orchestrator only
   - `UsePairflow` remains the lifecycle execution surface
   - task metadata stores linkage, not lifecycle authority
   - `ResolvePlanState` remains the owner of the normalized top-level route taxonomy
   - V1 remains local-only
2. Allowed resolution paths:
   - use current merged Task 1 / Task 2 contracts as-is
   - delegate bubble create/review/close/troubleshoot through `UsePairflow`
   - return normalized replanning only when bubble-side routing has already concluded that continuation should hand back upward
3. Forbidden regression interpretations:
   - do not add new required metadata fields just to simplify bubble routing
   - do not consume raw Pairflow detail from the plan/task layer after this task
   - do not collapse document and implementation bubble semantics into one vague generic route if their ownership or continuation behavior differs
4. Replacement proof required if removed: any future replacement of this task must preserve the single-owner rule for raw bubble lifecycle interpretation and must still protect the plan/task layer from needing to reason about raw Pairflow state.

### Success / Completion Proof Boundary

1. This task does not prove archive or plan/task follow-through completion.
2. It proves that bubble-oriented create/review/close/troubleshoot/replan decisions have an explicit repo-local owner and an explicit handoff contract back to the top-level orchestrator flow.

### Precondition and Side-Effect Boundary

1. The merged Task 1 / Task 2 baseline is sufficient precondition for this task.
2. This task must not introduce new metadata prerequisites unless an implementation blocker is demonstrated against that baseline.
3. Bubble-routing workflows may decide which `UsePairflow` surface to invoke, but they must not silently execute plan/task supersede/archive behavior.

### In Scope

1. Create `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`.
2. Create `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`.
3. Update `SKILL.md` so the bubble-routing ownership and repo-local workflow surfaces are explicit.
4. Update `ResolvePlanState.md` only where exact route-input / route-output parity needs tightening for bubble-routing integration.
5. Define how raw Pairflow truth becomes:
   - create bubble delegation,
   - review delegation,
   - close delegation,
   - troubleshooting delegation,
   - or normalized replanning output.
6. Define settled-checkpoint stop behavior after create and human-checkpoint stop behavior at review.
7. Define fail-closed handling when bubble linkage or Pairflow truth is insufficient for safe normalization.

### Out of Scope

1. Adding new plan/task metadata fields or broadening the metadata contract.
2. Implementing plan/task follow-through after normalized replanning.
3. Implementing supersede/archive/update aftermath behavior.
4. Implementing remote execution support.
5. Editing global `~/.claude/skills` or `~/.codex/skills` copies.
6. Designing automatic non-convergence detection beyond the already-approved operator-hint and bubble-side normalization boundaries.

### Safety Defaults

1. If a linked bubble exists but raw Pairflow detail cannot be safely normalized, fail closed or route to explicit troubleshooting; do not guess.
2. If bubble routing needs additional metadata beyond the merged Task 1 baseline, stop and prove the blocker rather than silently extending the contract.
3. If document-bubble completion is required before implementation-bubble creation, that proof must come from the bubble-routing / normalized route contract, not from bubble absence or prose interpretation.
4. The plan/task layer must not consume raw Pairflow lifecycle detail directly after this task lands.

Document-completion proof rule:

1. The minimum trustworthy `DOC_BUBBLE_COMPLETION_PROOF` shape for this task is a normalized `document_bubble_close` result with:
   - `route_class=document_bubble_close`
   - `target_workflow_surface=CloseDocumentBubble`
   - `approval_gate_state=already_satisfied`
   - `reason_code=DOC_BUBBLE_CLOSE_REQUIRED`
2. A successor-owned persisted equivalent may stand in for that same proof later, but this task must not require a new metadata field just to define the seam.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Impacted contracts:
   - repo-local `ExecutePairflowPlan` bubble-routing workflow contract
   - the handoff boundary between raw Pairflow truth and Task 2 normalized routes
   - successor Task 4's normalized replanning input assumptions

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
10. Identity/join note:
   - canonical bubble identity still comes from Task 1 linkage fields (`doc_bubble_id`, `impl_bubble_id`) plus the existing deterministic task-id model
   - competing identities such as operator-memory-only bubble lookup or raw filename inference remain forbidden
11. Authority/source-of-truth note:
   - canonical routing inputs come from task linkage, Pairflow lifecycle truth, and the Task 2 normalized taxonomy
   - forbidden secondary sources are chat history, heuristic bubble-state guesses, and speculative new metadata prerequisites
   - this task aligns an already-closed contract and does not activate a separate runtime/read-model surface in the same slice
12. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: document-bubble routing and implementation-bubble routing, because both are repo-local bubble-side workflow-orchestration consumers of the same already-closed taxonomy
   - explicitly deferred closures: `authority_producer`, `internal_execution_consumers`, `read_model_consumers`, `persisted_authority_or_schema`, `cleanup_recovery_consumers`, plan/task follow-through, archive aftermath
13. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`
   - secondary shape: `N/A`
   - why this bounded mix is safe: the task aligns one consumer family to an already-closed metadata and route contract without introducing new producer authority, runtime persistence, or cleanup/rollout closure

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Bubble work must stop at the right human/settled boundary without pushing hidden lifecycle state back into the operator's head. | Bubble-routing workflows must be explicit about when they continue, stop, or hand normalized replanning upward. | P1 | required-now |
| Control model | `ExecutePairflowPlan` orchestrates; `UsePairflow` executes lifecycle actions; Pairflow remains lifecycle authority. | Repo-local bubble-routing must delegate, not replace, `UsePairflow`. | P1 | required-now |
| Read-path rule | Task metadata provides linkage; Pairflow provides lifecycle truth; `ResolvePlanState` provides the top-level route taxonomy. | Bubble-routing workflows must read all three without inventing a fourth truth surface. | P1 | required-now |
| Forbidden fallback | No raw-state interpretation in the plan/task layer and no hidden dependence on new metadata work. | Task must prove the current merged baseline is enough unless a blocker is shown. | P1 | required-now |
| Allowed resolution path | Bubble-side normalization may emit review/close/replan/troubleshoot outputs that Task 4 later consumes. | The task may normalize bubble exits, but may not consume the replanning follow-through itself. | P1 | required-now |
| Missing-data rule | Missing or ambiguous bubble linkage/lifecycle truth fails closed or routes to troubleshooting. | No silent bubble-id invention or heuristic lifecycle guesswork. | P1 | required-now |
| Phase boundary | This task closes bubble-detail interpretation only. | Do not absorb Task 4 or Task 5 responsibilities. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Orchestrator-only model | `plans/archive/plans/2026-04-28-execute-pairflow-plan-plan-v1.md`, Task 2 | The top-level skill routes work; downstream workflows execute specialized behavior. | preserve | P1 | required-now |
| Metadata authority split | Task 1 metadata foundation | Task metadata stores linkage only; Pairflow stores lifecycle truth. | preserve | P1 | required-now |
| Normalized route taxonomy ownership | Task 2 `ResolvePlanState.md` | Bubble routing feeds the taxonomy; it does not replace it. | preserve | P1 | required-now |
| No new metadata prerequisite | current user instruction + current merged baseline | New metadata work is deferred unless a blocker is proven. | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Use the plan, draft, Task 1, Task 2, and existing skill sources as anchors. | Do not assume hidden bubble-routing behavior already exists. | P1 | required-now |
| Actual touched scope | Bubble-routing workflow contracts only. | Successor tasks must still implement plan/task follow-through and aftermath. | P1 | required-now |
| Mutation entrypoints in scope | Repo-local markdown workflow files only. | No runtime/product code changes belong here. | P1 | required-now |
| Hidden scope ruled out | No metadata expansion, no archive logic, no remote policy. | If the draft starts to require them, the task is too broad. | P1 | required-now |
| Branch inventory note | Cover create/review/close/troubleshoot/replan/fail-closed branches explicitly. | The workflow contracts and examples must name them, not imply them. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Close the missing bubble lifecycle delegation and raw-state normalization gap. | The task must produce concrete bubble-routing workflow files and handoff rules. | P1 | required-now |
| Depends on | Tasks 1 and 2 are the active closed baseline. | Do not restate or widen them unless a blocker proves it is required. | P1 | required-now |
| Unlocks / impacts successors | Task 4 depends on normalized bubble outputs rather than raw Pairflow truth. | Keep replanning output shape and ownership explicit. | P1 | required-now |
| Inherited validation / exit expectation | Bubble-side ownership must become auditable before plan/task follow-through lands. | Human-checkpoint vs settled-checkpoint behavior must stay explicit. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md` | document bubble routing workflow | `task linkage + Pairflow truth + operator hint -> normalized document-bubble routing result` | new file | Owns document bubble create/review/close/troubleshoot/replan routing through `UsePairflow`. | P1 | required-now | parent plan Task 3 purpose |
| CS2 | `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md` | implementation bubble routing workflow | `task linkage + Pairflow truth + operator hint -> normalized implementation-bubble routing result` | new file | Owns implementation bubble create/review/close/troubleshoot/replan routing through `UsePairflow`. | P1 | required-now | parent plan Task 3 purpose |
| CS3 | `.claude/skills/ExecutePairflowPlan/SKILL.md` | top-level workflow inventory | `N/A -> markdown skill artifact` | existing file | Makes repo-local bubble-routing ownership explicit while preserving route-surface names. | P1 | required-now | Task 2 successor boundary |
| CS4 | `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md` | normalized route contract | `bubble-routing output -> top-level next route decision` | existing file | Keeps exact parity between bubble-routing outputs and top-level route selection assumptions. | P1 | required-now | Task 2 successor boundary |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble-routing workflow inventory | missing | explicit repo-local workflow contracts | document bubble routing, implementation bubble routing, `UsePairflow` delegation boundaries | examples | additive | P1 | required-now |
| Bubble-side normalized route emission | only Task 2 acceptance contract exists | exact bubble-routing output contract aligned to `ResolvePlanState` | `route_class`, `target_workflow_surface`, `reason_code`, `source_owner=bubble_routing_layer`, `scope`, `source_scope`, `approval_gate_state` | `delegated_use_pairflow_surface`, diagnostics notes, local lifecycle observation notes | additive | P1 | required-now |
| Bubble-side non-normalized boundary reporting | implicit | explicit structured local boundary report for active-hold and fail-closed stops | `boundary_status`, `continuation_mode`, `source_owner=bubble_routing_layer`, `scope`, `boundary_reason`, `handoff_boundary_note` | optional `escalation_reason_code` for top-level human-checkpoint handoff | additive | P1 | required-now |
| Bubble-side delegated action result | implicit in draft/task prose | explicit workflow-local result contract | delegated `UsePairflow` surface, stop/continue boundary, handoff note explaining whether the next owner is human approval, `ResolvePlanState`, or bubble troubleshooting | evidence refs | additive | P1 | required-now |
| Bubble routing inputs | implicit in plan/draft prose | explicit workflow contract | task linkage, Pairflow lifecycle truth, optional operator hint, top-level route context, repo path | reviewer notes | additive | P1 | required-now |
| No-new-metadata baseline | user instruction, not yet written | explicit task guard | merged Task 1 / Task 2 baseline is sufficient unless blocker proven | blocker proof note | additive | P1 | required-now |

Normalized bubble-output parity rule:

1. The bubble-routing workflows must emit a normalized bubble output shape that `ResolvePlanState` can consume without reinterpretation.
2. Exact minimum fields are inherited from Task 2:
   - `route_class`
   - `target_workflow_surface`
   - `reason_code`
   - `source_owner`
   - `scope`
   - `source_scope`
   - `approval_gate_state`
3. Required value rules:
   - `source_owner` must be `bubble_routing_layer`
   - `scope` must be `document`, `implementation`, or `replanning`
   - `source_scope` must be `not_applicable` for review/close routes
   - `source_scope` must preserve `document_bubble` or `implementation_bubble` for bubble-origin replanning
   - `approval_gate_state` must be `review_required` for review routes
   - `approval_gate_state` must be `already_satisfied` for close routes
   - `approval_gate_state` must be `not_applicable` for normalized replanning and troubleshooting handoff
   - `delegated_use_pairflow_surface` must be `ReviewBubble`, `CloseBubble`, or `none` for normalized outputs in this task slice
4. No second intermediate bubble-output shape may be introduced in implementation. Task 4 must consume the same normalized output contract that Task 2 already expects.
5. Bubble-create and bubble-troubleshooting execution boundaries may use the same field family for local reporting, but `ResolvePlanState` must consume only normalized continuation or replanning outputs and must not reopen raw Pairflow interpretation.

Structured local-boundary reporting rule:

1. Active-bubble hold and fail-closed branches must still emit a structured local boundary report even when they do not emit a normalized continuation route back into `ResolvePlanState`.
2. That boundary report must not be treated as a second normalized route taxonomy for Task 4 consumption.
3. `continuation_mode` in handler-local reports must mirror the stable policy already owned by `ResolvePlanState`; the handlers report the value, but do not redefine the policy.
4. Create/start and troubleshooting execution results are handler-local action results, not `NORMALIZED_BUBBLE_ROUTE` payloads for `ResolvePlanState`.
5. `ResolvePlanState` may ignore handler-local extra fields such as delegated `UsePairflow` surface names or boundary-only fields when a normalized continuation route is otherwise valid.
6. Handler-local boundary reports should prefer `boundary_reason` over route-taxonomy `reason_code`; use `escalation_reason_code` only when a human-checkpoint stop needs to hand an already-anchored reason back upward.
7. Bubble-origin normalized replanning in this Task 3 slice must flow through `NORMALIZED_BUBBLE_ROUTE`; `NORMALIZED_REPLANNING_SIGNAL` is reserved for task-origin replanning until a successor layer explicitly lifts bubble-origin replanning into that separate slot.
8. Handler sections may emit one primary action/route result and, when stopping without a normalized continuation route, an additional local boundary report in the same documented branch.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo-local skill docs | create/update files under `.claude/skills/ExecutePairflowPlan/**` | editing global installed skill copies | repo-local source-of-truth only | P1 | required-now |
| Bubble-routing contract | define create/review/close/troubleshoot/replan routing and handoff boundaries | implementing plan/task follow-through or archive behavior | keep ownership explicit | P1 | required-now |
| Metadata baseline | consume merged Task 1 / Task 2 contracts | broadening metadata contract without blocker proof | no hidden prerequisite drift | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| bubble linkage missing where a linked continuation is required | task metadata | result | fail closed to checkpoint | `BUBBLE_ROUTE_NORMALIZATION_REQUIRED` or `NO_TRUSTWORTHY_ROUTE`, depending on whether a linked bubble exists but lacks safe normalization | warn | P1 | required-now |
| Pairflow lifecycle truth unavailable and the runtime issue is explicit | Pairflow status | result | route to `TroubleshootBubble` | `PAIRFLOW_STATUS_UNAVAILABLE` | warn | P1 | required-now |
| explicit operator troubleshooting request | operator hint | result | route to `TroubleshootBubble` | `OPERATOR_TROUBLESHOOT_HINT` | info | P1 | required-now |
| Pairflow lifecycle truth unavailable but the situation is not clearly a runtime issue | Pairflow status | result | fail closed checkpoint | `NO_TRUSTWORTHY_ROUTE` | warn | P1 | required-now |
| bubble-side route should hand back to plan/task | normalized bubble interpretation | result | emit normalized replanning only | `BUBBLE_NORMALIZED_REPLAN_REQUIRED` | info | P1 | required-now |
| additional metadata seems desirable but no blocker is proven | parallel metadata discussion | result | continue on merged baseline; do not expand contract | `N/A` | info | P1 | required-now |

Reason-code anchor rule:

1. Task 3 must consume the Task 2 reason-code surface as a closed contract.
2. The bubble-routing layer may emit only the already-anchored bubble-side / checkpoint / troubleshooting codes unless a higher-level plan refinement explicitly authorizes a new code:
   - `DOC_BUBBLE_CREATE_REQUIRED`
   - `DOC_BUBBLE_REVIEW_REQUIRED`
   - `DOC_BUBBLE_CLOSE_REQUIRED`
   - `IMPL_BUBBLE_CREATE_REQUIRED`
   - `IMPL_BUBBLE_REVIEW_REQUIRED`
   - `IMPL_BUBBLE_CLOSE_REQUIRED`
   - `BUBBLE_NORMALIZED_REPLAN_REQUIRED`
   - `BUBBLE_ROUTE_NORMALIZATION_REQUIRED`
   - `PAIRFLOW_STATUS_UNAVAILABLE`
   - `OPERATOR_TROUBLESHOOT_HINT`
   - `NO_TRUSTWORTHY_ROUTE`
3. This task must not introduce a second placeholder reason-code family for the same decisions.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | merged Task 1 metadata contract and Task 2 route taxonomy | P1 | required-now |
| must-use | `UsePairflow` skill contracts as lifecycle execution surfaces | P1 | required-now |
| must-not-use | raw Pairflow-state reasoning in the plan/task follow-through layer | P1 | required-now |
| must-not-use | new metadata prerequisite work unless blocker proven | P1 | required-now |
| must-not-use | direct edits in global installed skill directories | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | approved task with no document bubble | task is approved and `doc_bubble_id=null` | document bubble workflow evaluates state | it delegates create/start through `UsePairflow` and stops at a settled checkpoint | P1 | required-now | plan Task 3 scope |
| T2 | document bubble reaches review gate | task has linked doc bubble and Pairflow truth says review gate | document bubble workflow evaluates state | it routes to deep review through `UsePairflow ReviewBubble`, emits `route_class=document_bubble_review`, `target_workflow_surface=ReviewDocumentBubble`, `reason_code=DOC_BUBBLE_REVIEW_REQUIRED`, `source_owner=bubble_routing_layer`, `scope=document`, `source_scope=not_applicable`, `approval_gate_state=review_required`, and stops at human checkpoint | P1 | required-now | Task 2 normalized review route |
| T3 | document bubble is approved and close-ready | task has linked doc bubble and normalized close-ready truth | document bubble workflow evaluates state | it delegates close through `UsePairflow CloseBubble` and emits `route_class=document_bubble_close`, `target_workflow_surface=CloseDocumentBubble`, `reason_code=DOC_BUBBLE_CLOSE_REQUIRED`, `source_owner=bubble_routing_layer`, `scope=document`, `source_scope=not_applicable`, `approval_gate_state=already_satisfied` | P1 | required-now | Task 2 normalized close route |
| T4 | document bubble needs replanning | bubble-side review/runtime outcome proves continuation should route upward | document bubble workflow evaluates state | it emits `route_class=normalized_replanning`, `target_workflow_surface=HandleNormalizedReplan`, `reason_code=BUBBLE_NORMALIZED_REPLAN_REQUIRED`, `source_owner=bubble_routing_layer`, `scope=replanning`, `source_scope=document_bubble`, `approval_gate_state=not_applicable`, and preserves normalized replanning rather than returning raw bubble detail | P1 | required-now | plan normalized replan ownership |
| T5 | approved task with completed document phase and no impl bubble | document completion proof exists and `impl_bubble_id=null` | implementation workflow evaluates state | it delegates implementation bubble creation through `UsePairflow` | P1 | required-now | phase 3 purpose |
| T6 | implementation bubble reaches review gate | task has linked impl bubble and Pairflow truth says review gate | implementation workflow evaluates state | it routes to deep review, emits `route_class=implementation_bubble_review`, `target_workflow_surface=ReviewImplementationBubble`, `reason_code=IMPL_BUBBLE_REVIEW_REQUIRED`, `source_owner=bubble_routing_layer`, `scope=implementation`, `source_scope=not_applicable`, `approval_gate_state=review_required`, and stops at human checkpoint | P1 | required-now | Task 2 normalized review route |
| T7 | implementation bubble is approved and close-ready | task has linked impl bubble and normalized close-ready truth | implementation workflow evaluates state | it delegates close through `UsePairflow CloseBubble` and emits `route_class=implementation_bubble_close`, `target_workflow_surface=CloseImplementationBubble`, `reason_code=IMPL_BUBBLE_CLOSE_REQUIRED`, `source_owner=bubble_routing_layer`, `scope=implementation`, `source_scope=not_applicable`, `approval_gate_state=already_satisfied` | P1 | required-now | Task 2 normalized close route |
| T8 | explicit runtime issue | operator hint says the bubble is stuck or lifecycle truth cannot be read cleanly as a runtime issue | bubble workflow evaluates state | it routes to troubleshooting with exact code `OPERATOR_TROUBLESHOOT_HINT` or `PAIRFLOW_STATUS_UNAVAILABLE`, not generic replanning | P1 | required-now | plan troubleshooting branch |
| T9 | ambiguous bubble state | raw Pairflow detail exists but cannot be normalized safely | bubble workflow evaluates state | it fails closed with exact checkpoint code `BUBBLE_ROUTE_NORMALIZATION_REQUIRED` or the final fallback `NO_TRUSTWORTHY_ROUTE`, rather than guessing or minting a parallel code family | P1 | required-now | fail-closed rule |
| T10 | new metadata idea appears but is not a blocker | current merged baseline still supports the route contract | task is reviewed | the task remains implementable without adding metadata prerequisites | P1 | required-now | user instruction |

## Acceptance Criteria

1. AC1: Repo-local bubble-routing workflow files exist for document and implementation bubbles.
2. AC2: The task keeps `ExecutePairflowPlan` orchestrator-only and `UsePairflow` lifecycle-owned.
3. AC3: Raw Pairflow lifecycle interpretation has an explicit repo-local owner after this task.
4. AC4: Bubble-side outcomes are mapped into the Task 2 normalized route taxonomy without making the plan/task layer reason about raw Pairflow detail.
5. AC5: Settled-checkpoint vs human-checkpoint behavior remains explicit for create vs review routes.
6. AC6: Normalized replanning remains a bubble-originated output that Task 4 consumes later; Task 3 does not absorb plan/task follow-through.
7. AC7: The task does not require new metadata contract work beyond the merged Task 1 baseline unless a concrete blocker is demonstrated.
8. AC8: The task does not absorb archive/progress aftermath or remote execution support.
9. AC9: The bubble-routing workflow contracts are explicit enough that Task 4 can consume normalized outputs without reopening bubble-detail ownership.
10. AC10: The top-level skill and `ResolvePlanState` remain aligned with the new bubble-routing workflow surfaces and outputs.

## L2 - Implementation Notes (Optional)

1. Keep the new bubble-routing workflow files narrow and route-oriented; detailed lifecycle mechanics should stay in `UsePairflow`.
2. Prefer preserving Task 2 route-surface names and handoff semantics rather than inventing a second taxonomy.
3. If one workflow needs to mention the other bubble type, do so only for handoff/precondition context, not to collapse their ownership into one generic state machine.
4. If a true blocker against the current metadata baseline is discovered, record it as a blocker and route back to plan/task refinement rather than silently broadening this task.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | compact bubble-routing fixture matrix | L2 | P2 | later-hardening | future drift risk across create/review/close/replan branches | add examples or fixtures once executable skill bodies exist |
| H2 | stronger operator-hint examples for troubleshooting vs replanning | L2 | P2 | later-hardening | ambiguity risk in runtime-loss cases | add after initial bubble-routing workflows land |
| H3 | machine-readable normalized bubble-output examples | L2 | P2 | later-hardening | successor Task 4 may need stricter parity checks | add once implementation-oriented workflow bodies exist |

## Review Control

1. Review this task as a bubble-routing ownership slice, not as an implementation of all downstream plan/task behavior.
2. Reject refinements that reopen the metadata contract without a demonstrated blocker.
3. Reject refinements that let Task 4 or Task 5 responsibilities leak into this task.
4. Preserve the Task 2 normalized route taxonomy unless a higher-level plan refinement explicitly authorizes a change.

## Assumptions

1. Tasks 1 and 2 are merged and form the active baseline for this task.
2. The next missing trustworthy slice is bubble routing, not metadata expansion.
3. `UsePairflow` remains the correct lifecycle execution surface for local V1.
4. New metadata work currently under discussion is not yet required for this task unless a concrete blocker is found during implementation.
