---
artifact_type: task
artifact_id: task_execute_pairflow_plan_orchestrator_skeleton_v1
title: "ExecutePairflowPlan Orchestrator Skeleton"
status: draft
phase: phase2
target_files:
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md
prd_ref: null
plan_ref: plans/execute-pairflow-plan-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: ExecutePairflowPlan Orchestrator Skeleton

## Current Codebase Check (2026-04-28)

1. The repo-local `ExecutePairflowPlan` directory now exists under `.claude/skills/ExecutePairflowPlan/`.
2. The metadata foundation is already encoded in:
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/FixPlanMetadata.md`
3. No top-level `.claude/skills/ExecutePairflowPlan/SKILL.md` exists yet.
4. No `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md` exists yet.
5. The workflow inventory and normalized route taxonomy still live only in the plan and draft documents, not in repo-local skill source.

## L0 - Policy

### Goal

Create the first executable orchestrator shell for `ExecutePairflowPlan` by adding:

1. the repo-local top-level `SKILL.md` contract,
2. the workflow inventory for V1,
3. and the `ResolvePlanState` workflow contract that decides the next workflow route from plan/task metadata plus Pairflow linkage state.

This task must close the orchestrator-shell gap without absorbing downstream plan/task workflow implementation, bubble-detail classification, or progress/archive aftermath behavior that belong to successor tasks.

### Primary Deliverable Shape

1. Produce exactly two repo-local markdown artifacts under `.claude/skills/ExecutePairflowPlan/**`:
   - `SKILL.md`
   - `Workflows/ResolvePlanState.md`
2. `SKILL.md` must own the lean top-level orchestration contract:
   - purpose,
   - artifact responsibilities,
   - workflow routing inventory,
   - orchestrator execution style,
   - and the rule that downstream specialized workflows run in fresh context rather than being inlined.
3. `ResolvePlanState.md` must own only:
   - state assessment inputs,
   - normalized route taxonomy,
   - next-workflow selection rules,
   - auto-continue vs human-checkpoint rules,
   - and fail-closed exits for unresolved ambiguity.
4. This task is done when a future implementer can determine:
   - which top-level workflow route should run next,
   - which routes can continue automatically,
   - which routes must stop at a human checkpoint,
   - and which route classes are intentionally deferred to successor tasks,
   without inventing hidden routing behavior in the main skill body.

### Domain / Control Model Summary

1. Business invariant: the orchestrator must reduce operator-held coordination state without weakening review gates, human checkpoints, or Pairflow lifecycle discipline.
2. Control model: `ExecutePairflowPlan` is the orchestrator layer only; it does not replace `CreatePairflowSpec` or `UsePairflow`.
3. Read-path rule: `ResolvePlanState` reads sequencing from plan metadata, detailed execution state from task metadata, and bubble lifecycle truth from Pairflow status or persisted bubble linkage fields rather than mirrored manual lifecycle state.
4. Forbidden fallback: do not infer the next workflow route from chat history, filename order, or ad hoc operator memory when the plan/task metadata contract and Pairflow state can answer the question.
5. Allowed resolution path: deterministic same-authority resolution is allowed only inside the approved metadata foundation contract; all unresolved cross-authority disagreement must route to a human checkpoint.
6. Missing-data rule: if required plan metadata is missing or non-trustworthy, the orchestrator must route through `FixPlanMetadata` before normal state resolution.
7. Phase boundary:
   - contract closure: owned here for top-level orchestrator contract and route taxonomy
   - workflow orchestration closure: owned here for state assessment and next-route selection only
   - downstream plan/task workflow execution closure: successor
   - bubble-detail classification closure: successor
   - progress/archive aftermath closure: successor

### Plan Linkage

1. Parent plan gap closed: missing top-level orchestrator skill shell, workflow inventory, and explicit `ResolvePlanState` route taxonomy.
2. Depends on:
   - `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md`
3. Unlocks / impacts successors:
   - `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md`
   - `plans/tasks/execute-pairflow-plan/4-executeplan-plan-and-task-routing.md`
   - `plans/tasks/execute-pairflow-plan/5-executeplan-progress-archive-and-pilot.md`
4. Task-list impact: adds the executable Task 2 artifact promised by the plan and establishes the route taxonomy that Tasks 3 and 4 must consume rather than redefine.
5. Inherited validation / exit expectation: this task must prove that route ownership is explicit enough that later tasks can implement workflow delegation without reopening the top-level orchestration model.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/execute-pairflow-plan-plan-v1.md`
   - `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/FixPlanMetadata.md`
   - `.claude/skills/CreatePairflowSpec/SKILL.md`
   - `.claude/skills/UsePairflow/SKILL.md`
2. Canonical elements:
   - orchestrator-only control model
   - plan sequencing authority
   - task detailed execution authority
   - Pairflow bubble lifecycle authority
   - local-only V1 scope
   - `ResolvePlanState` owns normalized route taxonomy and next-workflow decision
3. Guard elements:
   - workflow inventory naming
   - auto-continue vs human-checkpoint route classes
   - fresh-context downstream execution rule
4. Compat-only elements:
   - legacy plans that still require `FixPlanMetadata`
   - plans/tasks that may still surface blocked-state needs only as fail-closed refinement checkpoints
5. Forbidden reinterpretations:
   - do not let the top-level skill absorb downstream workflow bodies
   - do not let `ResolvePlanState` classify raw bubble lifecycle detail that Task 3 is meant to normalize
   - do not let the route taxonomy silently redefine task/bubble ownership boundaries fixed by the plan

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `plans/execute-pairflow-plan-plan-v1.md`
   - `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/FixPlanMetadata.md`
   - `.claude/skills/CreatePairflowSpec/SKILL.md`
   - `.claude/skills/UsePairflow/SKILL.md`
2. Actual touched scope: `consumer_family_alignment`
3. Mutation entrypoints in scope: none in product/runtime code; the produced artifacts are repo-local orchestrator skill markdown files only.
4. Hidden scope ruled out:
   - no implementation of downstream `CreatePairflowSpec` workflows,
   - no implementation of downstream `UsePairflow` workflows,
   - no raw bubble-state interpretation,
   - no progress/archive aftermath behavior,
   - no remote execution support.
5. Branch inventory note:
   - metadata bootstrap required vs normal resolution
   - plan review required vs task create required
   - task review required vs bubble workflow required
   - normalized replanning signal vs human checkpoint
   - plan complete vs continue
6. Why the declared task shape matches reality: the touched scope is the top-level orchestration consumer family and its route taxonomy. It does not write canonical runtime authority, classify raw bubble exits, or own downstream workflow bodies, so it remains a bounded orchestration-shell slice.

### Authority Boundary Map

1. Authority producer: Task 1 already defined the metadata authority contract; this task consumes that contract and does not redefine it.
2. Stored authority: plan files, task files, and Pairflow bubble state remain the stored authorities read by `ResolvePlanState`.
3. In-scope consumers:
   - top-level workflow routing
   - next-workflow selection
   - auto-continue vs human-checkpoint decision
   - normalized route taxonomy used by downstream tasks
4. Explicit out-of-scope consumers:
   - raw bubble lifecycle routing
   - plan/task content mutation workflows
   - progress/archive completion consumers
   - remote execution policy
5. Export surfaces closed in this phase:
   - top-level skill contract
   - workflow inventory
   - normalized route taxonomy
   - `ResolvePlanState` decision contract

### Baseline Preservation

1. Must-preserve behaviors:
   - `ExecutePairflowPlan` remains the orchestrator only
   - downstream plan/task artifact work routes through `CreatePairflowSpec`
   - downstream bubble lifecycle work routes through `UsePairflow`
   - fresh-context downstream execution remains the default
   - V1 remains local-only
2. Allowed resolution paths:
   - `FixPlanMetadata` first when metadata is missing
   - deterministic same-authority resolution when already authorized by the metadata foundation
   - normalized replanning route handoff for successor tasks to consume later
3. Forbidden regression interpretations:
   - do not inline downstream workflows into the top-level skill
   - do not let `ResolvePlanState` own bubble-detail interpretation
   - do not blur human checkpoint routes into silent auto-continue behavior
4. Replacement proof required if removed: any later replacement of this skeleton must preserve explicit route ownership, route taxonomy stability, and the orchestrator-only control model.

### Success / Completion Proof Boundary

1. This task does not prove end-to-end runtime execution.
2. It proves that the top-level orchestrator shell and normalized route taxonomy are explicit enough for later implementation tasks to execute without reopening control-model ownership.

### Precondition and Side-Effect Boundary

1. `ResolvePlanState` must validate metadata readiness before routing into normal execution paths.
2. This task must not introduce direct artifact edits, bubble lifecycle mutations, or orchestration aftermath side effects as part of route selection itself.

### In Scope

1. Create `.claude/skills/ExecutePairflowPlan/SKILL.md`.
2. Create `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`.
3. Define the V1 workflow inventory and top-level routing map.
4. Define the normalized route taxonomy used by the orchestrator.
5. Define which route classes continue automatically vs stop at a human checkpoint.
6. Define how metadata bootstrap, task-review routing, bubble workflow routing, normalized replanning, and plan completion are represented at the top level.
7. Preserve the rule that downstream specialized workflows run in fresh context rather than being inlined.

### Out of Scope

1. Implementing downstream plan-review, task-create, or task-review workflow bodies.
2. Implementing raw bubble lifecycle interpretation or bubble outcome mapping.
3. Implementing progress/archive/update aftermath behavior.
4. Implementing remote execution support.
5. Editing global `~/.claude/skills` or `~/.codex/skills` copies.

### Safety Defaults

1. Missing required plan metadata must route to `FixPlanMetadata`, not heuristic routing.
2. Cross-authority disagreement must route to a human checkpoint, not silent orchestration glue.
3. If bubble state is ambiguous or a blocked-state contract refinement is required, route to a human checkpoint or successor-owned troubleshooting path instead of inventing a local route.
4. The top-level skill must stay lean; long operational instructions belong in dedicated workflow files.
5. `ResolvePlanState` may decide which workflow should run next, but must not silently perform downstream workflow responsibilities itself.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Impacted contracts:
   - repo-local `ExecutePairflowPlan` top-level skill contract
   - normalized route taxonomy consumed by successor tasks
   - route ownership boundary between Task 2, Task 3, and Task 4

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
10. Identity/join note:
   - the route taxonomy depends on canonical `task_id`, active task identity, and persisted bubble linkage fields already defined by Task 1
   - the task must consume those identifiers without redefining them
11. Authority/source-of-truth note:
   - canonical routing inputs come from plan metadata, task metadata, and Pairflow lifecycle state
   - forbidden secondary sources are chat history, filename-order inference, or hidden operator memory
12. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: top-level skill shell + `ResolvePlanState`, because both belong to the same orchestration consumer family and define one bounded route contract
   - explicitly deferred closures: `internal_execution_consumers`, `read_model_consumers`, `cleanup_recovery_consumers`, raw bubble routing, downstream workflow bodies
13. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`
   - secondary shape: `N/A`
   - why this bounded mix is safe: the task aligns the orchestration consumer family to the already-closed metadata foundation without activating downstream behavior or reopening shared runtime authority.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | The orchestrator must reduce operator coordination burden without weakening review gates or lifecycle discipline. | The skeleton must make next-step decisions explicit without becoming the downstream workflow body. | P1 | required-now |
| Control model | `ExecutePairflowPlan` is the orchestrator only. | `SKILL.md` must describe orchestration, not inline downstream execution instructions. | P1 | required-now |
| Read-path rule | Plan metadata decides sequencing, task metadata decides detailed state, Pairflow decides bubble lifecycle truth. | `ResolvePlanState` must read those sources explicitly and must not invent a fourth truth surface. | P1 | required-now |
| Forbidden fallback | No chat-history, filename-order, or operator-memory routing when canonical metadata exists or can be repaired first. | `ResolvePlanState` must route to `FixPlanMetadata` or fail closed instead of improvising. | P1 | required-now |
| Allowed resolution path | Deterministic same-authority resolution is allowed only inside the closed metadata contract. | `ResolvePlanState` may use the Task 1 metadata rules but must not broaden them. | P1 | required-now |
| Missing-data rule | Missing required plan metadata routes to `FixPlanMetadata`. | `ResolvePlanState` must encode that route as the first routing branch. | P1 | required-now |
| Phase boundary | This task closes orchestrator shell and route taxonomy only. | Do not absorb bubble-detail mapping, plan/task workflow bodies, or progress/archive aftermath into this task. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Orchestrator-only model | `plans/execute-pairflow-plan-plan-v1.md`, `docs/execute-pairflow-plan-draft.md` | The top-level skill decides what happens next, but delegates execution details. | preserve | P1 | required-now |
| Metadata authority split | `1-executeplan-metadata-foundation.md`, `Plan-Task-Metadata-Contract.md` | Routing inputs must respect plan/task/Pairflow authority boundaries. | preserve | P1 | required-now |
| Fresh-context downstream execution | `docs/execute-pairflow-plan-draft.md`, `CreatePairflowSpec` and `UsePairflow` skills | Specialized workflows should usually run in fresh context. | preserve | P1 | required-now |
| `ResolvePlanState` ownership | `plans/execute-pairflow-plan-plan-v1.md` | The normalized route taxonomy and next-workflow decision belong here. | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Use the plan, draft, Task 1 artifact, metadata contract, and existing skill sources as the only current anchors. | Do not assume hidden top-level skill behavior already exists under `.claude/skills/ExecutePairflowPlan/`. | P1 | required-now |
| Actual touched scope | The task is a routing-shell slice, not a downstream workflow implementation slice. | Successor tasks must still implement bubble routing and plan/task follow-through. | P1 | required-now |
| Mutation entrypoints in scope | New markdown skill files only. | No product/runtime code changes belong here. | P1 | required-now |
| Hidden scope ruled out | Bubble-detail classification, downstream workflow bodies, progress/archive behavior, and remote policy are out of scope. | If the draft starts embedding those, the task is too broad. | P1 | required-now |
| Branch inventory note | Cover metadata bootstrap, plan review, task create/review, bubble workflow routes, normalized replanning, human checkpoint, and plan completion. | The route taxonomy and examples must cover each branch explicitly. | P1 | required-now |
| Shape proof | One bounded orchestration-shell task is safe because it only defines the top-level route contract that successors consume. | Keep route ownership explicit to avoid overlap with Tasks 3 and 4. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Close the missing top-level skill shell and route taxonomy gap. | The task must produce concrete workflow names, route classes, and next-workflow rules. | P1 | required-now |
| Depends on | Task 1 metadata foundation is now closed. | Route logic must consume Task 1's contract rather than redefining it. | P1 | required-now |
| Unlocks / impacts successors | Tasks 3 and 4 rely on this route taxonomy staying stable. | Later tasks must consume the normalized route classes, not invent their own. | P1 | required-now |
| Task-list impact | Adds the executable Task 2 artifact promised by the plan. | No other open task is replaced or obsoleted. | P1 | required-now |
| Inherited validation / exit expectation | The orchestrator shell must make route ownership auditable before downstream workflow implementations begin. | The task must make human-checkpoint vs auto-continue behavior explicit. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `.claude/skills/ExecutePairflowPlan/SKILL.md` | top-level skill contract | `N/A -> markdown skill artifact` | new file | Defines top-level purpose, workflow routing inventory, execution principles, and orchestration boundaries. | P1 | required-now | parent plan Task 2 purpose |
| CS2 | `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md` | state resolution workflow | `plan + task + Pairflow linkage state -> normalized route decision` | new file | Defines route taxonomy, next-workflow decision rules, and fail-closed checkpoints. | P1 | required-now | parent plan Task 2 purpose |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Top-level skill shell | missing | explicit repo-local skill contract | purpose, workflow inventory, execution style, orchestration-only boundary | short examples | additive | P1 | required-now |
| Workflow inventory | currently only in draft/plan prose | explicit inventory in `SKILL.md` | `FixPlanMetadata`, `ResolvePlanState`, plan/task delegation routes, document/implementation bubble routes, progress route, troubleshoot route | naming notes | additive | P1 | required-now |
| Normalized route taxonomy | implicit in plan/draft | explicit route list in `ResolvePlanState.md` | route id, target workflow, auto-continue vs checkpoint behavior, trigger summary | examples | additive | P1 | required-now |
| State resolution inputs | implicit in prose | explicit workflow contract | plan metadata, task metadata, persisted bubble linkage, Pairflow lifecycle state, optional operator hint | diagnostics notes | additive | P1 | required-now |
| Checkpoint contract | currently only described narratively | explicit checkpoint rule | ambiguous disagreement, missing metadata, blocked-state refinement need, unresolved workflow ownership | examples | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo-local skill docs | create new files under `.claude/skills/ExecutePairflowPlan/**` | editing global installed skill copies | repo-local source-of-truth only | P1 | required-now |
| Top-level route contract | define route taxonomy and workflow inventory | implementing downstream workflow bodies | keep shell lean | P1 | required-now |
| ResolvePlanState | define state-assessment and route-selection rules | performing bubble/task/plan mutations inside the workflow | selection only | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| required plan metadata missing | plan artifact | fallback | route to `FixPlanMetadata` | PLAN_METADATA_BOOTSTRAP_REQUIRED | info | P1 | required-now |
| plan/task disagreement inside closed authority split | plan/task metadata | result | select the authoritative side and continue with the correct route | AUTHORITY_PRECEDENCE_APPLIED | warn | P1 | required-now |
| cross-authority disagreement with no safe precedence | plan/task metadata | result | stop at human checkpoint | CROSS_AUTHORITY_METADATA_CONFLICT | warn | P1 | required-now |
| planned-but-not-created task lacks explicit canonical `task_id` | plan metadata | result | fail closed checkpoint | PLAN_TASK_ID_REQUIRED_FOR_NOT_CREATED | error | P1 | required-now |
| blocked-state semantics needed outside approved V1 domains | legacy or active artifacts | result | fail closed checkpoint for contract refinement | BLOCKED_STATE_REQUIRES_CONTRACT_REFINEMENT | warn | P1 | required-now |
| route ownership is ambiguous between top-level shell and successor tasks | route taxonomy | throw | refine the task/plan instead of silently broadening scope | ROUTE_OWNERSHIP_AMBIGUOUS | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Task 1 metadata contract and `FixPlanMetadata` workflow | P1 | required-now |
| must-use | `CreatePairflowSpec` and `UsePairflow` skill contracts as downstream delegation surfaces | P1 | required-now |
| must-not-use | hidden operator memory or filename-only routing | P1 | required-now |
| must-not-use | raw bubble-detail classification in this task | P1 | required-now |
| must-not-use | direct edits in global installed skill directories | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | missing plan metadata | required plan fields are absent | `ResolvePlanState` evaluates entry state | the next route is `FixPlanMetadata` before normal execution | P1 | required-now | Task 1 metadata foundation |
| T2 | plan not ready for task creation | plan requires plan-level review or correction | `ResolvePlanState` evaluates plan/task state | the route taxonomy returns the plan-review path rather than task creation | P1 | required-now | plan + draft routing notes |
| T3 | no current task exists | plan is ready and the next task has not been created | `ResolvePlanState` evaluates state | the route taxonomy returns task-create | P1 | required-now | draft create-task branch |
| T4 | current task exists but is not task-approved | task artifact exists and is not ready for bubble work | `ResolvePlanState` evaluates state | the route taxonomy returns task-review | P1 | required-now | draft task-review branch |
| T5 | approved task with no document bubble | task is ready and no doc bubble linkage exists | `ResolvePlanState` evaluates state | the route taxonomy returns document-bubble-create | P1 | required-now | plan Task 2 scope |
| T6 | normalized bubble route requires review/close | bubble layer later supplies a normalized route class from Task 3 | `ResolvePlanState` consumes the normalized route | the route taxonomy preserves the correct bubble review/close target without reclassifying raw detail | P1 | required-now | downstream ownership boundary |
| T7 | route-back-to-plan style normalized replanning | task or bubble layer yields a normalized plan-refinement signal | `ResolvePlanState` consumes the normalized route | it selects plan-level follow-through without treating it as generic failure | P1 | required-now | gradual consistency model |
| T8 | blocked-state refinement need appears | artifacts require blocked-state semantics beyond approved V1 domains | `ResolvePlanState` evaluates state | it fails closed to a human checkpoint rather than widening the contract | P1 | required-now | Task 1 blocked-state rule |
| T9 | plan is complete | all tasks are terminal and no open work remains | `ResolvePlanState` evaluates state | the route taxonomy returns plan-complete / stop boundary | P1 | required-now | parent plan done path |
| T10 | operator hint or lifecycle problem | explicit hint says the bubble is stuck or too broad | `ResolvePlanState` evaluates state | the route taxonomy returns the troubleshooting / human-checkpoint path instead of blind continuation | P1 | required-now | draft operator-hint branch |

## Acceptance Criteria

1. AC1: A repo-local `ExecutePairflowPlan` `SKILL.md` exists and keeps the top-level skill lean, orchestration-only, and explicit about downstream delegation.
2. AC2: A repo-local `ResolvePlanState.md` exists and explicitly defines the normalized route taxonomy and next-workflow decision rules.
3. AC3: The route taxonomy explicitly distinguishes auto-continue routes from human-checkpoint routes.
4. AC4: The workflow contract explicitly routes missing metadata through `FixPlanMetadata` before normal execution.
5. AC5: The task preserves the Task 1 authority split and does not reinterpret plan/task/Pairflow ownership.
6. AC6: The task explicitly keeps raw bubble-detail classification out of scope and reserves that for successor tasks.
7. AC7: The task explicitly preserves fresh-context downstream workflow execution as the default orchestrator behavior.
8. AC8: The task does not absorb downstream workflow bodies, progress/archive aftermath behavior, or remote execution support.
9. AC9: The normalized route taxonomy is explicit enough that Tasks 3 and 4 can consume it without redefining route ownership.

## L2 - Implementation Notes (Optional)

1. Keep `SKILL.md` short and routing-oriented; detailed operational procedures belong in dedicated workflow files.
2. Prefer route ids that map cleanly to later downstream workflow names, but keep the taxonomy stable enough that Tasks 3 and 4 can inherit it.
3. Include at least one worked example that shows `ResolvePlanState` choosing `FixPlanMetadata`, one that chooses task creation/review, and one that chooses a bubble-oriented route.
4. If examples mention blocked-state needs, they should route to fail-closed refinement rather than normalize blocked status into the current V1 domains.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | compact route-decision fixture set | L2 | P2 | later-hardening | route taxonomy could drift as Tasks 3 and 4 land | add examples or fixtures once the executable skill body exists |
| H2 | operator hint model examples | L2 | P2 | later-hardening | troubleshoot route may need concrete examples | add once the bubble troubleshooting path is implemented |
| H3 | route-output shape validation | L2 | P2 | later-hardening | future executable implementation may need a machine-readable route shape | add after the skill body exists |

## Review Control

1. Review this task as an orchestration-shell slice, not as an implementation of all downstream behavior.
2. Reject refinements that inline raw bubble-detail classification or downstream workflow bodies into this task.
3. Preserve the Task 1 authority split and the plan's ownership boundaries unless a higher-level plan refinement explicitly authorizes a change.

## Assumptions

1. Task 1 is merged and can be treated as the current closed metadata baseline.
2. The first orchestrator shell should be documentation-level skill source before any executable runtime implementation is attempted.
3. Successor tasks will consume the normalized route taxonomy defined here rather than redefining it locally.
