---
artifact_type: task
artifact_id: task_execute_pairflow_plan_plan_and_task_routing_v1
title: "ExecutePairflowPlan Plan and Task Routing"
task_family_id: executeplan-plan-and-task-routing
sequence_key: "4"
task_id: 4-executeplan-plan-and-task-routing
status: done
phase: phase4
target_files:
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleNormalizedReplan.md
prd_ref: null
plan_ref: plans/execute-pairflow-plan-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
doc_bubble_id: executeplan-plan-task-routing-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-04-29-execute-pairflow-plan
owners:
  - "felho"
---

# Task: ExecutePairflowPlan Plan and Task Routing

## Current Codebase Check (2026-04-28)

1. The repo-local `ExecutePairflowPlan` skill source now exists under `.claude/skills/ExecutePairflowPlan/`.
2. The merged Task 1 metadata and archive/lineage baseline is already encoded in:
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/FixPlanMetadata.md`
3. The merged Task 2 orchestrator-shell baseline is already encoded in:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
4. The merged Task 3 bubble-routing baseline is already encoded in:
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`
5. `HandleNormalizedReplan` now exists as a repo-local workflow source under `.claude/skills/ExecutePairflowPlan/Workflows/HandleNormalizedReplan.md` and owns normalized-replanning follow-through.
6. The remaining downstream slice after this task is normal progress/archive aftermath and pilot hardening, not raw bubble-detail interpretation and not additional metadata expansion.
7. New metadata ideas may exist in parallel discussion, but they remain optional and non-blocking for this Task 4 contract unless a concrete blocker is proven against the merged baseline.

## L0 - Policy

### Goal

Implement the first repo-local plan/task follow-through layer for `ExecutePairflowPlan` by adding a workflow contract that:

1. consumes already-normalized replanning signals from task review or bubble routing,
2. delegates plan review, task creation, and task review through `CreatePairflowSpec`,
3. owns the review-triggered supersede/archive/recreate handoff when executable task identity changes,
4. preserves the Task 1 lineage/archive contract without broadening it,
5. and keeps the gradual-consistency refinement loop moving until a real human checkpoint or settled boundary is reached.

This task must close the plan/task follow-through gap without reopening the merged metadata baseline, without reinterpreting raw bubble lifecycle detail, and without pulling normal post-implementation progress/archive aftermath into the same slice.

### Primary Deliverable Shape

1. Produce repo-local normalized-replan follow-through workflow source under `.claude/skills/ExecutePairflowPlan/Workflows/`:
   - `HandleNormalizedReplan.md`
2. Update `SKILL.md` only as needed so the top-level inventory and execution-style notes point to the new repo-local successor workflow rather than leaving `HandleNormalizedReplan` as an unowned placeholder.
3. Update `ResolvePlanState.md` only where exact route-input / route-output parity needs tightening for Task 4 consumption of `normalized_replanning`.
4. `HandleNormalizedReplan.md` must own:
   - consuming `route_class=normalized_replanning`,
   - preserving `source_scope=task|document_bubble|implementation_bubble`,
   - deciding whether the next delegated artifact workflow is `ReviewPlan`, `CreateTask`, `ReviewTask`, or `HumanCheckpoint`,
   - deciding when executable identity changed enough to require `superseded` lineage handling,
   - and defining the pre-aftermath archive handoff for superseded tasks by using the existing Task 1 metadata contract.
5. `HandleNormalizedReplan.md` must not own:
   - raw Pairflow lifecycle interpretation,
   - new plan/task metadata field design,
   - normal post-implementation completion/archive aftermath,
   - remote execution support,
   - or a second independent route taxonomy outside Task 2.

### Domain / Control Model Summary

1. Business invariant: route-back and normalized replanning must behave like controlled gradual-consistency follow-through, not like generic failure, while still keeping task identity, lineage, and archive routing deterministic.
2. Control model: `ExecutePairflowPlan` remains the orchestrator; `HandleNormalizedReplan` becomes the repo-local owner of normalized replanning follow-through; `CreatePairflowSpec` remains the artifact authoring/review surface; Task 1 remains the metadata and archive/lineage authority baseline.
3. Read-path rule:
   - plan metadata remains the sequencing authority,
   - task metadata remains the detailed local execution and lineage authority,
   - `ResolvePlanState` and Task 3 provide the already-normalized replanning signal,
   - and this task must not read raw Pairflow lifecycle truth directly.
4. Forbidden fallback:
   - do not treat normalized replanning as generic failure by default,
   - do not re-open raw bubble-state reasoning in the plan/task layer,
   - do not silently broaden the metadata contract because a refinement loop feels awkward,
   - do not preserve the old task as "split part 1" by default when executable identity has clearly changed,
   - and do not route by operator memory when the normalized signal plus Task 1 metadata already determines the next action.
5. Allowed resolution path:
   - task-review route-back may auto-continue into plan review or task reshaping when the correction is mechanical,
   - bubble-origin normalized replanning may re-enter the same follow-through workflow without any raw bubble inspection,
   - executable identity change may mark the current task `superseded`, create replacement task artifacts, and prepare archive handoff using the already-closed Task 1 contract,
   - and only real product/architecture uncertainty should force a human checkpoint.
6. Missing-data rule:
   - if normalized replanning input is absent, partial, or inconsistent, fail closed instead of guessing,
   - if task identity, lineage, or archive mapping cannot be derived deterministically from the merged baseline, stop and prove the blocker,
   - and if new metadata seems desirable but the current baseline is still sufficient, continue on the merged baseline rather than inventing a hidden prerequisite.
7. Phase boundary:
   - metadata producer closure: preserved from Task 1
   - top-level route-taxonomy closure: preserved from Task 2
   - raw bubble-detail interpretation closure: preserved from Task 3
   - normalized replanning follow-through closure: owned here
   - normal progress/archive aftermath closure: successor Task 5

### Plan Linkage

1. Parent plan gap closed: missing plan/task follow-through, normalized replanning consumption, and pre-aftermath supersede/archive handoff.
2. Depends on:
   - `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
   - `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md`
3. Unlocks / impacts successors:
   - `plans/tasks/execute-pairflow-plan/5-executeplan-progress-archive-and-pilot.md`
4. Task-list impact: adds the executable Task 4 artifact promised by the plan and closes the follow-through seam that Task 5 must consume rather than reopen.
5. Inherited validation / exit expectation: this task must prove that normalized replanning can be consumed without raw bubble detail and that review-triggered supersession/archive handoff stays deterministic under the already-merged metadata baseline.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/execute-pairflow-plan-plan-v1.md`
   - `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
   - `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/CreatePairflowSpec/SKILL.md`
2. Canonical elements:
   - orchestrator-only control model
   - Task 1 metadata, lineage, and archive baseline
   - Task 2 normalized route taxonomy
   - Task 3 normalized bubble-output contract
   - local-only V1 scope
3. Guard elements:
   - gradual-consistency route-back handling
   - `superseded` only when executable identity changes
   - pre-aftermath supersede/archive handoff vs normal completion aftermath separation
   - normalized source-scope preservation
4. Compat-only elements:
   - persisted legacy bubble ids already stored as linkage refs
   - persisted archive fields that can already be derived from `archive_group` + `task_id`
5. Forbidden reinterpretations:
   - do not redesign Task 1 metadata or archive fields here
   - do not move raw bubble-detail interpretation into this task
   - do not let Task 4 redefine Task 2 route classes or Task 3 normalized output semantics
   - do not let newer metadata discussion become a hidden dependency without a demonstrated blocker

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `plans/execute-pairflow-plan-plan-v1.md`
   - `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
   - `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/CreatePairflowSpec/SKILL.md`
2. Actual touched scope: `workflow_orchestration_consumers`, with tightly-adjacent `cleanup_recovery_consumers` only for pre-aftermath supersede/archive handoff.
3. Mutation entrypoints in scope: repo-local skill markdown workflows only; no product/runtime code and no global installed skill copies.
4. Hidden scope ruled out:
   - no new metadata reference contract,
   - no raw bubble-routing workflow changes,
   - no normal post-implementation progress/archive aftermath,
   - no remote executor support,
   - no pilot/reporting work.
5. Branch inventory note:
   - task review routes back to plan for mechanical plan correction
   - task review reveals task reshaping but executable identity stays the same
   - task review reveals task reshaping and executable identity changes
   - bubble-origin normalized replanning from document bubble
   - bubble-origin normalized replanning from implementation bubble
   - deterministic archive handoff for superseded task
   - human-checkpoint stop for non-deterministic identity/lineage/archive mapping
6. Why the declared task shape matches reality: the touched scope is the plan/task consumer family that sits after Task 2 route selection and Task 3 normalized bubble output. The only adjacent cleanup slice retained here is the narrow supersede/archive handoff that shares the same executable-identity decision boundary. Normal completion aftermath and reporting remain separate in Task 5.

### Authority Boundary Map

1. Authority producer:
   - Task 1 remains the metadata, lineage, and archive-rule producer
   - Task 2 remains the normalized route-taxonomy producer
   - Task 3 remains the normalized bubble-output producer for bubble-origin replanning
2. Stored authority:
   - plan files store sequencing and canonical `archive_group`
   - task files store task-local status, lineage, and optional archive path
   - Pairflow remains bubble lifecycle authority, but this task must not read it directly
3. In-scope consumers:
   - repo-local normalized-replan follow-through workflow
   - top-level orchestration auto-continue loop after `ReviewPlan`, `CreateTask`, and `ReviewTask`
   - supersede/archive handoff for pre-aftermath executable-identity change
4. Explicit out-of-scope consumers:
   - raw bubble-routing workflows
   - normal completion/archive aftermath consumers
   - remote execution consumers
   - new metadata producer work
5. Export surfaces closed in this phase:
   - repo-local `HandleNormalizedReplan` contract
   - explicit boundary between normalized replanning input and plan/task follow-through
   - explicit handoff boundary between pre-aftermath supersede/archive routing and Task 5 normal aftermath

### Baseline Preservation

1. Must-preserve behaviors:
   - `ExecutePairflowPlan` remains the orchestrator only
   - `CreatePairflowSpec` remains the plan/task authoring and review surface
   - Task 1 remains the archive/lineage authority baseline
   - Task 3 remains the sole owner of raw bubble-detail interpretation
   - V1 remains local-only
2. Allowed resolution paths:
   - consume the merged Task 1 / Task 2 / Task 3 contract as-is
   - use normalized replanning as the only bubble-origin input to this layer
   - continue mechanically through plan review / task creation / task review when the next correction is clear
   - mark the current task `superseded` only when executable identity changes and a replacement task is the correct next artifact
3. Forbidden regression interpretations:
   - do not make Task 4 consume raw Pairflow detail
   - do not widen the metadata contract just to simplify lineage or archive moves
   - do not collapse pre-bubble supersede/archive handoff into Task 5 normal completion aftermath
   - do not treat route-back-to-plan or normalized replanning as generic fatal failure
4. Replacement proof required if removed: any future replacement of this task must preserve normalized-replanning-only follow-through, deterministic lineage/archive handling, and the separation between pre-aftermath supersede routing and normal completion aftermath.

### Success / Completion Proof Boundary

1. This task does not prove final progress reporting or normal post-implementation archive/update completion.
2. It proves that plan/task follow-through after task review or normalized replanning has a single repo-local owner and that executable-identity change can be handled deterministically without raw bubble-state reasoning.

### Precondition and Side-Effect Boundary

1. The merged Task 1 / Task 2 / Task 3 baseline is sufficient precondition for this task.
2. This task must not introduce new metadata prerequisites unless an implementation blocker is demonstrated against that baseline.
3. This task may update lineage/archive handoff rules only by consuming the existing metadata contract, not by redefining it.
4. This task may delegate to `CreatePairflowSpec`, but it must not silently execute normal bubble lifecycle handling or post-implementation aftermath behavior.

### In Scope

1. Create `.claude/skills/ExecutePairflowPlan/Workflows/HandleNormalizedReplan.md`.
2. Update `SKILL.md` so Task 4 ownership of normalized replanning follow-through is explicit.
3. Update `ResolvePlanState.md` only where exact `normalized_replanning` handoff wording or input parity needs tightening for the new repo-local workflow.
4. Define how task-origin and bubble-origin normalized replanning are consumed without reopening raw bubble-detail ownership.
5. Define when the next delegated artifact workflow is `ReviewPlan`, `CreateTask`, `ReviewTask`, or `HumanCheckpoint`.
6. Define the executable-identity-change rule that triggers supersede/archive handoff.
7. Define deterministic lineage/archive handoff using Task 1's existing `supersedes`, `superseded_by`, `archive_group`, and `archive_path` rules.

### Out of Scope

1. Adding new plan/task metadata fields or broadening the metadata contract.
2. Reinterpreting raw Pairflow lifecycle detail.
3. Implementing normal post-implementation archive/progress aftermath behavior.
4. Implementing remote execution support.
5. Editing global `~/.claude/skills` or `~/.codex/skills` copies.
6. Designing automatic non-convergence detection beyond the already-approved normalized replanning and operator-hint boundaries.

### Safety Defaults

1. If normalized replanning says the current executable identity is wrong, prefer plan correction plus replacement task creation over mutating the old task into "split part 1" by default.
2. If task identity, lineage, or archive mapping is not deterministic under the merged baseline, fail closed instead of inventing metadata.
3. If a normalized replanning signal came from bubble routing, consume it as normalized input only after the bubble-side carrier rule is satisfied (`NORMALIZED_BUBBLE_ROUTE`, not a duplicated `NORMALIZED_REPLANNING_SIGNAL`); do not re-open bubble lifecycle inspection.
4. If new metadata seems helpful but is not a blocker, proceed on the merged baseline and record the metadata idea as deferred rather than silently depending on it.

Supersede/archive handoff rule:

1. A task becomes `superseded` only when executable identity changes under the already-merged Task 1 lineage rules.
2. Repeated refinement or review feedback alone must not mark a task `superseded` if the task keeps the same canonical executable identity.
3. When a replacement task is created, the handoff must use the existing Task 1 fields:
   - replacement task records `supersedes=[<old_task_id>]`
   - original task records `superseded_by=<new_task_id>`
   - archive handoff uses canonical `archive_group` plus `task_id`, with optional persisted `archive_path` only when it equals the canonical derived path
4. This task may prepare or execute the superseded-task archive handoff for pre-aftermath replanning loops, but it must not absorb the normal completion-after-success archive path owned by Task 5.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Impacted contracts:
   - repo-local `ExecutePairflowPlan` normalized-replan follow-through workflow contract
   - the handoff boundary between Task 2/Task 3 normalized replanning and `CreatePairflowSpec` artifact loops
   - the handoff boundary between superseded-task archive routing and Task 5 normal aftermath

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `8`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
10. Identity/join note:
   - canonical task identity still comes from Task 1 (`task_family_id`, `sequence_key`, `task_id`)
   - the critical join in this slice is whether replanning changes executable identity enough to require supersession
   - competing identity sources such as prose-only task labels, operator memory, or bubble runtime impressions remain forbidden
11. Authority/source-of-truth note:
   - canonical follow-through inputs come from plan metadata, task metadata, and normalized replanning signals already produced by Task 2/Task 3
   - forbidden secondary sources are raw bubble-state guesses, speculative metadata fields, and archive-path invention
   - this task aligns the plan/task follow-through consumer family plus its directly-adjacent pre-aftermath supersede/archive handoff, but does not activate read-model or reporting fallout
12. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `workflow_orchestration_consumers`, `cleanup_recovery_consumers`
   - intentionally collapsed closures: normalized-replanning follow-through and pre-aftermath supersede/archive handoff, because both close on the same executable-identity decision boundary
   - explicitly deferred closures: `authority_producer`, `internal_execution_consumers`, `read_model_consumers`, `persisted_authority_or_schema`, normal progress/archive aftermath
13. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`
   - secondary shape: `fail_closed_hardening`
   - why this bounded mix is safe: the same plan/task follow-through path decides whether replanning is mechanical or identity-changing, and the adjacent archive handoff is inseparable from that identity decision but still distinct from Task 5's normal completion aftermath

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Replanning should continue the refinement loop without losing deterministic task identity and archive routing. | `HandleNormalizedReplan` must treat route-back as controlled follow-through, not as generic failure. | P1 | required-now |
| Control model | `ExecutePairflowPlan` orchestrates, `CreatePairflowSpec` authors/reviews artifacts, Task 1 defines lineage/archive rules. | Task 4 must delegate artifact work and consume metadata rules rather than replacing them. | P1 | required-now |
| Read-path rule | Only plan metadata, task metadata, and normalized replanning signals are trusted inputs here. | No raw Pairflow lifecycle reads or bubble-state reinterpretation are allowed. | P1 | required-now |
| Forbidden fallback | No hidden metadata expansion, no operator-memory routing, and no default preservation of invalid old task identity. | Identity-change and archive decisions must be explicit. | P1 | required-now |
| Allowed resolution path | Mechanical plan/task correction may auto-continue; real product or architecture uncertainty must stop at a human checkpoint. | The workflow must encode the continuation boundary explicitly. | P1 | required-now |
| Missing-data rule | If identity, lineage, or normalized input is non-deterministic, fail closed. | Human checkpoint is preferred over heuristic recovery. | P1 | required-now |
| Phase boundary | This task closes follow-through only. | Do not absorb raw bubble routing or Task 5 aftermath responsibilities. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Metadata / archive baseline | Task 1 metadata foundation | Existing lineage and archive fields are sufficient unless a blocker is proven. | preserve | P1 | required-now |
| Normalized route taxonomy ownership | Task 2 `ResolvePlanState.md` | `normalized_replanning` stays a top-level route class and surface, not a generic error bucket. | preserve | P1 | required-now |
| Bubble-origin normalized output contract | Task 3 bubble-routing artifact | Bubble-origin replanning arrives already normalized with preserved `source_scope`. | preserve | P1 | required-now |
| No new metadata prerequisite | current user instruction + current merged baseline | New metadata work is deferred unless blocker proven. | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Use the plan, draft, Tasks 1-3, and current skill sources as anchors. | Do not assume hidden follow-through behavior already exists. | P1 | required-now |
| Actual touched scope | Normalized-replan follow-through plus pre-aftermath supersede/archive handoff only. | Successor Task 5 must still implement normal completion aftermath. | P1 | required-now |
| Mutation entrypoints in scope | Repo-local markdown workflow files only. | No product/runtime code changes belong here. | P1 | required-now |
| Hidden scope ruled out | No metadata expansion, no raw bubble routing, no reporting/pilot, no remote policy. | If the task starts requiring them, it is too broad. | P1 | required-now |
| Branch inventory note | Cover mechanical route-back, identity-preserving refinement, identity-changing replacement, bubble-origin replanning, and deterministic archive handoff. | The workflow contract and examples must name them, not imply them. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Close missing normalized replanning consumption and plan/task follow-through ownership. | The task must produce a concrete repo-local successor workflow. | P1 | required-now |
| Depends on | Tasks 1-3 are the active closed baseline. | Do not restate or widen them unless a blocker proves it is required. | P1 | required-now |
| Unlocks / impacts successors | Task 5 depends on Task 4 closing pre-aftermath replanning and supersession ownership. | Keep archive-handoff vs normal-aftermath ownership explicit. | P1 | required-now |
| Inherited validation / exit expectation | Follow-through must remain normalized-input-only. | Reject any refinement that re-opens raw bubble detail or hidden metadata dependence. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `.claude/skills/ExecutePairflowPlan/Workflows/HandleNormalizedReplan.md` | normalized replanning follow-through workflow | `resolved normalized_replanning handoff + upstream normalized carrier provenance + plan/task metadata -> delegated plan/task follow-through result` | new file | Owns plan/task follow-through after route-back or bubble-origin normalized replanning. | P1 | required-now | parent plan Task 4 purpose |
| CS2 | `.claude/skills/ExecutePairflowPlan/SKILL.md` | top-level workflow inventory and execution notes | `N/A -> markdown skill artifact` | existing file | Makes Task 4 ownership of `HandleNormalizedReplan` explicit while preserving stable route-surface names. | P1 | required-now | Task 2 / Task 3 successor boundary |
| CS3 | `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md` | normalized replanning handoff contract | `normalized replanning route -> repo-local successor follow-through workflow` | existing file | Keeps exact parity between the existing `normalized_replanning` route and the new repo-local follow-through owner. | P1 | required-now | Task 2 successor boundary |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Upstream normalized replanning carrier | route class exists, but successor workflow owner is still placeholder | exact upstream normalized input contract consumed by Task 4 | `route_class=normalized_replanning`, `target_workflow_surface=HandleNormalizedReplan`, `reason_code`, `source_owner`, `source_scope`, `approval_gate_state=not_applicable` | diagnostics notes | additive | P1 | required-now |
| Resolved normalized replanning handoff | route output exists in Task 2, but Task 4 successor wording is still placeholder-level | exact `ResolvePlanState` route-output handoff into Task 4 | `route_class=normalized_replanning`, `target_workflow_surface=HandleNormalizedReplan`, `continuation_mode=auto_continue`, `route_scope`, `source_scope`, `approval_gate_state=not_applicable`, `reason_code`, `handoff_boundary_note` | diagnostics notes | additive | P1 | required-now |
| Follow-through delegated action result | implicit in plan/draft prose | explicit workflow-local delegated result contract | delegated `CreatePairflowSpec` surface, `continuation_mode`, `source_owner=plan_task_followthrough_layer`, `source_scope`, `followthrough_action`, `handoff_boundary_note` | lineage/archive notes | additive | P1 | required-now |
| Supersede/archive handoff | baseline metadata exists but Task 4 ownership is not written | explicit identity-change and archive-handoff contract | `supersedes`, `superseded_by`, canonical `archive_group`, canonical derived `archive_path` when persisted | `closed_at` | preserve-and-consume | P1 | required-now |
| No-new-metadata baseline | user instruction, not yet written for Task 4 | explicit task guard | merged Task 1 / Task 2 / Task 3 baseline is sufficient unless blocker proven | blocker proof note | additive | P1 | required-now |
| Post-delegation reroute | implicit in orchestrator commentary | explicit reroute-after-delegation rule | rerun `ResolvePlanState` from fresh authoritative plan/task artifacts after delegated follow-through returns | diagnostics notes | additive | P1 | required-now |

Normalized-replanning parity rule:

1. `HandleNormalizedReplan` must consume the exact normalized replanning semantics already promised by Task 2 and Task 3 without inventing a second replanning signal family.
2. Two related but different contracts must stay explicit:
   - the upstream normalized replanning carrier contract that reaches `ResolvePlanState`
   - the resolved `normalized_replanning` route-output handoff that `ResolvePlanState` emits toward `HandleNormalizedReplan`
3. Required minimum upstream carrier fields are:
   - `route_class`
   - `target_workflow_surface`
   - `reason_code`
   - `source_owner`
   - `source_scope`
   - `approval_gate_state`
4. Required minimum resolved route-output handoff fields are:
   - `route_class`
   - `target_workflow_surface`
   - `continuation_mode`
   - `route_scope`
   - `source_scope`
   - `approval_gate_state`
   - `reason_code`
   - `handoff_boundary_note`
5. Required value rules:
   - `route_class` must be `normalized_replanning`
   - `target_workflow_surface` must be `HandleNormalizedReplan`
   - `approval_gate_state` must remain `not_applicable`
   - task-origin replanning may arrive through `NORMALIZED_REPLANNING_SIGNAL` only when `source_owner=task_routing_layer`, `route_scope=task`, and `source_scope=task`
   - bubble-origin replanning must continue to arrive through `NORMALIZED_BUBBLE_ROUTE` with `source_owner=bubble_routing_layer`, `route_scope=document_bubble|implementation_bubble`, and `source_scope=document_bubble|implementation_bubble`; this task must not duplicate that carrier into a second signal family
   - bubble-origin replanning must never be reclassified from raw Pairflow state here
   - `handoff_boundary_note` is required on the resolved route-output handoff from `ResolvePlanState`, not on the minimum upstream carrier contract itself
6. No second intermediate replanning route contract may be introduced. Task 5 must consume Task 4 aftermath ownership through explicit handoff notes or archive/lineage state, not through a parallel replanning taxonomy.

Post-delegation reroute rule:

1. `HandleNormalizedReplan` must not chain the next route from stale local assumptions after `ReviewPlan`, `CreateTask`, or `ReviewTask` returns.
2. After any delegated `auto_continue` result, the orchestrator must reread authoritative plan/task state and rerun `ResolvePlanState`.
3. This keeps top-level route ownership centralized in Task 2 while still letting Task 4 own the follow-through decision boundary.

Executable-identity decision rule:

1. Identity-preserving refinement keeps the current `task_id` and must not mark the task `superseded`.
2. Identity-changing replanning must:
   - route through plan correction and/or replacement task creation,
   - mark the replaced task `superseded`,
   - link replacement lineage through `supersedes` / `superseded_by`,
   - and use canonical Task 1 archive rules for any pre-aftermath archive handoff.
3. Repeated review count, generic unease, or "large task" language alone is not enough to force supersession unless executable identity truly changes.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo-local skill docs | create/update files under `.claude/skills/ExecutePairflowPlan/**` | editing global installed skill copies | repo-local source-of-truth only | P1 | required-now |
| Plan/task follow-through | define delegated `CreatePairflowSpec` routing and continuation boundaries | implementing raw bubble routing or final pilot/reporting behavior | keep ownership explicit | P1 | required-now |
| Lineage/archive handoff | consume existing Task 1 lineage/archive contract for superseded tasks | broadening archive metadata or normal completion aftermath | pre-aftermath only in this slice | P1 | required-now |
| Metadata baseline | consume merged Task 1 / Task 2 / Task 3 contracts | broadening metadata contract without blocker proof | no hidden prerequisite drift | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| normalized replanning input is absent, partial, or inconsistent | Task 2 / Task 3 normalized signal | result | fail closed to human checkpoint | `NO_TRUSTWORTHY_ROUTE` | warn | P1 | required-now |
| task identity, lineage, or archive mapping cannot be derived deterministically | Task 1 metadata contract | result | stop for human checkpoint / refinement | `NON_DETERMINISTIC_TASK_IDENTITY` | error | P1 | required-now |
| plan/task disagreement crosses the already-approved authority split | plan metadata + task metadata | result | fail closed | `CROSS_AUTHORITY_METADATA_CONFLICT` | warn | P1 | required-now |
| planned replacement task lacks explicit canonical `task_id` | plan metadata | result | stop for refinement | `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED` | error | P1 | required-now |
| route-back is mechanical and plan correction is the next owner | normalized replanning input | result | delegate `ReviewPlan` and continue | `TASK_REVIEW_ROUTE_BACK_TO_PLAN` or `BUBBLE_NORMALIZED_REPLAN_REQUIRED` | info | P1 | required-now |
| additional metadata seems desirable but no blocker is proven | parallel metadata discussion | result | continue on merged baseline; do not expand contract | `N/A` | info | P1 | required-now |

Reason-code anchor rule:

1. Task 4 must consume the Task 1 / Task 2 / Task 3 reason-code surface as a closed contract.
2. This slice may use only already-anchored routing / checkpoint / replanning reason codes unless a higher-level plan refinement explicitly authorizes a new code:
   - `TASK_REVIEW_ROUTE_BACK_TO_PLAN`
   - `BUBBLE_NORMALIZED_REPLAN_REQUIRED`
   - `AUTHORITY_PRECEDENCE_APPLIED`
   - `CROSS_AUTHORITY_METADATA_CONFLICT`
   - `NON_DETERMINISTIC_TASK_IDENTITY`
   - `PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED`
   - `NO_TRUSTWORTHY_ROUTE`
   - `BLOCKED_STATE_REQUIRES_CONTRACT_REFINEMENT`
3. This task must not invent a parallel archive-handoff or supersession reason-code family for the same decisions.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | merged Task 1 metadata, lineage, and archive contract | P1 | required-now |
| must-use | merged Task 2 normalized route taxonomy | P1 | required-now |
| must-use | merged Task 3 normalized bubble-output contract | P1 | required-now |
| must-use | `CreatePairflowSpec` skill contracts as artifact execution surfaces | P1 | required-now |
| must-not-use | raw Pairflow-state reasoning in the plan/task follow-through layer | P1 | required-now |
| must-not-use | new metadata prerequisite work unless blocker proven | P1 | required-now |
| must-not-use | direct edits in global installed skill directories | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | task review routes back to plan for mechanical correction | active task review yields normalized replanning with `source_scope=task` and no identity change yet | `HandleNormalizedReplan` evaluates state | it delegates plan correction through `CreatePairflowSpec ReviewSpec` in `plan-mode` and auto-continues rather than treating the outcome as failure | P1 | required-now | gradual consistency model |
| T2 | current task needs refinement but keeps the same executable identity | normalized replanning indicates the task can be corrected in place | follow-through workflow evaluates state | it keeps the same `task_id`, does not mark the task `superseded`, and routes through task review/create surfaces only as needed | P1 | required-now | Task 1 lineage rule |
| T3 | task review reveals executable identity change | normalized replanning proves the current task should be replaced | follow-through workflow evaluates state | it routes through plan correction and replacement task creation, links `supersedes` / `superseded_by`, and prepares or executes superseded-task archive handoff under the canonical archive group | P1 | required-now | draft route-back preference |
| T4 | bubble-origin document replanning | Task 3 emitted normalized replanning with `source_scope=document_bubble` | follow-through workflow evaluates state | it consumes the normalized signal without raw bubble inspection and re-enters the plan/task correction loop | P1 | required-now | Task 3 normalized output boundary |
| T5 | bubble-origin implementation replanning | Task 3 emitted normalized replanning with `source_scope=implementation_bubble` | follow-through workflow evaluates state | it consumes the normalized signal without raw bubble inspection and re-enters the plan/task correction loop | P1 | required-now | Task 3 normalized output boundary |
| T6 | deterministic archive mapping for superseded task | current task is being replaced and plan has canonical `archive_group` | archive handoff is evaluated | canonical archive target is derived as `plans/archive/tasks/<archive_group>/<task_id>.md` without inventing new metadata | P1 | required-now | Task 1 archive contract |
| T7 | non-deterministic identity or lineage | replacement task identity or archive mapping cannot be derived safely | follow-through workflow evaluates state | it fails closed with the existing identity/conflict codes instead of guessing | P1 | required-now | Task 1 fail-closed rule |
| T8 | new metadata idea appears but is not a blocker | current merged baseline still supports follow-through and lineage rules | task is reviewed | the task remains implementable without adding metadata prerequisites | P1 | required-now | user instruction |

## Acceptance Criteria

1. AC1: A repo-local `HandleNormalizedReplan.md` workflow exists and explicitly owns normalized replanning follow-through.
2. AC2: Task 4 consumes only normalized replanning inputs from Task 2 / Task 3 and does not reinterpret raw Pairflow lifecycle detail.
3. AC3: The task keeps `ExecutePairflowPlan` orchestrator-only and `CreatePairflowSpec` artifact-owned.
4. AC4: The task explicitly distinguishes identity-preserving refinement from identity-changing supersession.
5. AC5: Review-triggered supersede/archive handoff uses the existing Task 1 lineage/archive contract and does not require new metadata fields unless a blocker is proven.
6. AC6: Bubble-origin replanning from Task 3 can re-enter the plan/task follow-through loop without reopening bubble-detail ownership.
7. AC7: The task does not absorb normal post-implementation progress/archive aftermath or remote execution support.
8. AC8: The top-level skill and `ResolvePlanState` remain aligned with the new repo-local follow-through workflow surface.
9. AC9: After delegated Task 4 follow-through returns, the orchestrator reruns `ResolvePlanState` from fresh authoritative artifacts instead of continuing from stale local assumptions.

## L2 - Implementation Notes (Optional)

1. Keep `HandleNormalizedReplan.md` route-oriented and follow-through-oriented; detailed artifact-writing prompts should stay with `CreatePairflowSpec`.
2. Prefer explicit "replacement task" semantics over trying to salvage the old task as a default split sibling when executable identity clearly changed.
3. If a true blocker against the current metadata baseline is discovered, record it as a blocker and route back to plan/task refinement rather than silently broadening this task.
4. If Task 5 later needs stronger aftermath proof, let it consume Task 4's lineage/archive handoff contract rather than forcing Task 4 to own reporting or pilot logic now.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | worked examples for identity-preserving vs identity-changing route-back | L2 | P2 | later-hardening | future drift risk in supersession decisions | add machine-readable examples once workflow bodies exist |
| H2 | stronger examples for bubble-origin replanning follow-through | L2 | P2 | later-hardening | source-scope drift risk across document vs implementation bubble exits | add after Task 4 workflow body lands |
| H3 | archive-handoff fixture examples for superseded tasks | L2 | P2 | later-hardening | successor Task 5 may want tighter aftermath assertions | add once pre-aftermath handoff is implemented |

## Review Control

1. Review this task as a normalized-replanning follow-through slice, not as a redesign of the metadata or bubble-routing contracts.
2. Reject refinements that reopen raw Pairflow interpretation or let Task 4 redefine Task 3 bubble ownership.
3. Reject refinements that make new metadata work an implicit prerequisite without a demonstrated blocker.
4. Reject refinements that let Task 5 normal aftermath or pilot/reporting work leak into this task.

## Assumptions

1. Tasks 1, 2, and 3 are merged and form the active baseline for this task.
2. The next missing trustworthy slice is normalized replanning follow-through, not metadata expansion or raw bubble routing.
3. `CreatePairflowSpec` remains the correct artifact execution surface for local V1 plan/task loops.
4. New metadata work currently under discussion is not yet required for this task unless a concrete blocker is found during implementation.
