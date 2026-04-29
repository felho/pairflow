---
artifact_type: task
artifact_id: task_execute_pairflow_plan_progress_archive_and_pilot_v1
title: "ExecutePairflowPlan Progress, Archive, and Pilot"
task_family_id: executeplan-progress-archive-and-pilot
sequence_key: "5"
task_id: 5-executeplan-progress-archive-and-pilot
status: done
phase: phase4
target_files:
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md
  - .claude/skills/ExecutePairflowPlan/Workflows/UpdateProgress.md
prd_ref: null
plan_ref: plans/execute-pairflow-plan-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
doc_bubble_id: executeplan-task5-docs
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-04-29-execute-pairflow-plan
owners:
  - "felho"
---

# Task: ExecutePairflowPlan Progress, Archive, and Pilot

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
5. The merged Task 4 normalized-replanning follow-through baseline is already encoded in:
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleNormalizedReplan.md`
6. `SKILL.md` and `ResolvePlanState.md` still leave normal post-implementation progress/archive aftermath as successor-owned; no repo-local `UpdateProgress.md` workflow source exists yet.
7. `UsePairflow` `CloseBubble` already owns the implementation-bubble lifecycle close path and generic post-merge follow-up hooks, but `ExecutePairflowPlan` still lacks a repo-local contract for plan-progress reconciliation, canonical archive aftermath, and local pilot proof after a successful implementation close.
8. New metadata ideas may exist in parallel discussion, but the merged Task 1 / Task 2 / Task 3 / Task 4 baseline is sufficient for this task unless a concrete blocker is proven.

## L0 - Policy

### Goal

Implement the first repo-local normal-completion aftermath layer for `ExecutePairflowPlan` by adding a workflow contract that:

1. consumes an already-closed implementation bubble outcome after the separate review/approval/merge path has already succeeded,
2. reconciles plan progress and task terminal state on the existing Task 1 metadata baseline,
3. enforces canonical archive aftermath for completed tasks without inventing new metadata,
4. determines whether execution should stop at `PlanComplete` or continue into a fresh `ResolvePlanState` pass,
5. and defines the first lightweight local pilot validation path for trustworthy V1 execution.

This task must close the post-implementation aftermath gap without reopening raw bubble lifecycle interpretation, normalized replanning ownership, or newer metadata expansion work.

### Primary Deliverable Shape

1. Produce repo-local progress/aftermath backing workflow source under `.claude/skills/ExecutePairflowPlan/Workflows/`:
   - `UpdateProgress.md`
2. Update `SKILL.md` only as needed so the top-level ownership notes and backing-workflow inventory make the Task 5 aftermath owner explicit without reopening the normalized route taxonomy or adding a new stable route surface.
3. Update `ResolvePlanState.md` only where exact `implementation_bubble_close` handoff wording or plan-complete parity needs tightening so the top-level auto-continue loop clearly hands successful close results into the repo-local aftermath owner.
4. `UpdateProgress.md` must own:
   - consuming the aftermath boundary after a successful implementation-bubble close,
   - reconciling plan tracker summary and task-local terminal state using the existing authority split,
   - reconciling archive aftermath against the canonical Task 1 `archive_group` + `task_id` rule,
   - deciding whether the next owner is fresh `ResolvePlanState`, `PlanComplete`, or `HumanCheckpoint`,
   - and defining the local pilot evidence/reporting contract for a trustworthy first V1 run.
5. `UpdateProgress.md` must not own:
   - raw Pairflow lifecycle interpretation,
   - pre-aftermath supersede/archive handling for identity-changing replanning,
   - new metadata field design,
   - remote execution support,
   - a second top-level route taxonomy outside Task 2,
   - or a new `target_workflow_surface` returned by `ResolvePlanState`.

### Domain / Control Model Summary

1. Business invariant: after implementation merge, the executor must leave plan/task/archive truth in a consistent, low-drift state without weakening the existing human approval or bubble lifecycle contracts.
2. Control model: `ExecutePairflowPlan` remains the orchestrator; `UsePairflow` still owns implementation-bubble close; Task 1 remains the metadata and archive authority baseline; Task 5 owns only the normal completion aftermath that follows a successful close.
3. Read-path rule:
   - plan metadata remains canonical for sequencing, tracker summary, `active_task_id`, and `archive_group`,
   - task metadata remains canonical for task-local terminal status and persisted archive fields when present,
   - Pairflow remains the lifecycle authority for the bubble close itself,
   - and this task must consume only the already-settled close boundary rather than re-reading raw bubble state.
4. Forbidden fallback:
   - do not treat "implementation merged" as enough to update sequencing without reconciling artifacts,
   - do not widen metadata just because archive aftermath feels awkward,
   - do not use operator memory or generic file placement as competing archive authority when Task 1 already defines canonical archive shape,
   - and do not reopen Task 4 pre-aftermath supersession logic during normal completion.
5. Allowed resolution path:
   - after a successful implementation close, the workflow may reconcile stale summary fields to the authoritative task/plan baseline,
   - it may accept already-canonical archive placement or reconcile deterministic archive aftermath onto the canonical Task 1 path,
   - it may then rerun `ResolvePlanState` from fresh artifacts when more work remains,
   - and it may stop at `PlanComplete` only when refreshed authoritative state proves the plan is terminal.
6. Missing-data rule:
   - if terminal task identity, archive mapping, or plan terminality cannot be derived deterministically from the merged baseline, fail closed instead of guessing,
   - if a post-close disagreement crosses the approved authority split, stop at a human checkpoint rather than silently choosing a side,
   - and if newer metadata still seems desirable but the current baseline is sufficient, continue on the current baseline rather than making it a hidden prerequisite.
7. Phase boundary:
   - metadata producer closure: preserved from Task 1
   - top-level route-taxonomy closure: preserved from Task 2
   - raw bubble-detail interpretation closure: preserved from Task 3
   - pre-aftermath normalized replanning and supersession closure: preserved from Task 4
   - normal completion aftermath, progress reporting, and pilot proof: owned here

### Plan Linkage

1. Parent plan gap closed: missing progress reporting, normal post-implementation archive/update aftermath, and local pilot trust proof.
2. Depends on:
   - `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
   - `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md`
   - `plans/tasks/execute-pairflow-plan/4-executeplan-plan-and-task-routing.md`
3. Unlocks / impacts successors:
   - `N/A` for the current V1 plan; this is the final planned execution slice
4. Task-list impact: adds the executable Task 5 artifact promised by the plan and closes the remaining aftermath seam that currently sits after implementation merge.
5. Inherited validation / exit expectation: this task must prove that normal completion aftermath can be handled on the already-merged metadata baseline and that local V1 pilot trust can be discussed without adding a second metadata project.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/execute-pairflow-plan-plan-v1.md`
   - `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
   - `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md`
   - `plans/tasks/execute-pairflow-plan/4-executeplan-plan-and-task-routing.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `/Users/felho/.claude/skills/UsePairflow/Workflows/CloseBubble.md`
2. Canonical elements:
   - plan tracker is a high-level summary, not duplicate task-local execution truth
   - task-local status remains detailed execution authority
   - `archive_group` plus `task_id` determines canonical archive path
   - `PlanComplete` remains the only plan-terminal stop surface
   - Task 4 already owns pre-aftermath supersede/archive handoff for identity-changing replanning
3. Guard elements:
   - settled implementation close already happened before Task 5 starts
   - archive aftermath must stay on the current metadata baseline
   - local-only pilot proof remains sufficient for V1
4. Compat-only elements:
   - generic `CloseBubble` follow-up may already touch progress/docs/archive in a project-local way
   - persisted archive fields may already be derivable from `archive_group` + `task_id`
5. Forbidden reinterpretations:
   - do not move raw implementation-bubble lifecycle truth into this task
   - do not let Task 5 redefine Task 4 supersession ownership
   - do not let a generic mirrored archive path become a reason to redesign the Task 1 archive contract
   - do not let newer metadata discussion become a hidden dependency without a demonstrated blocker

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `plans/execute-pairflow-plan-plan-v1.md`
   - `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md`
   - `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
   - `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md`
   - `plans/tasks/execute-pairflow-plan/4-executeplan-plan-and-task-routing.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleNormalizedReplan.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `/Users/felho/.claude/skills/UsePairflow/Workflows/CloseBubble.md`
2. Actual touched scope: `workflow_orchestration_consumers`, with tightly-adjacent `cleanup_recovery_consumers` for normal archive aftermath.
3. Mutation entrypoints in scope: repo-local skill markdown workflows only; no product/runtime code and no global skill-source edits.
4. Hidden scope ruled out:
   - no new metadata reference contract,
   - no raw bubble-routing workflow changes,
   - no pre-aftermath supersession logic,
   - no remote executor support,
   - no new standalone reporting system.
5. Branch inventory note:
   - implementation close succeeds and more plan work remains
   - implementation close succeeds and the plan becomes terminal
   - archive aftermath is already canonical
   - archive aftermath needs deterministic reconciliation onto the canonical Task 1 path
   - plan tracker summary is stale but reconcilable
   - plan/task/archive state is not trustworthy enough and must stop at a checkpoint
6. Pilot-proof boundary note: lightweight pilot proof is workflow-local acceptance evidence for the aftermath contract, not a separate `read_model_consumers` closure, reporting subsystem, or stable route surface.
7. Why the declared task shape matches reality: the touched scope starts only after successful implementation close and stays inside the same aftermath boundary where progress reconciliation, canonical archive aftermath, and fail-closed continuation decisions consume the same refreshed authoritative artifacts. It does not reopen metadata production or bubble routing.

### Authority Boundary Map

1. Authority producer:
   - Task 1 remains the metadata, lineage, and archive-rule producer
   - Task 2 remains the top-level normalized route-taxonomy producer
   - Task 3 remains the raw bubble-detail to normalized-route producer
   - Task 4 remains the normalized replanning and pre-aftermath supersession producer
   - `UsePairflow` `CloseBubble` remains the implementation-bubble lifecycle close producer
2. Stored authority:
   - plan files store sequencing, tracker summary, `active_task_id`, and canonical `archive_group`
   - task files store task-local terminal state, lineage, bubble linkage refs, and optional persisted archive fields
   - Pairflow remains implementation-bubble lifecycle authority, but this task must not re-read it directly
3. In-scope consumers:
   - repo-local normal-completion aftermath workflow
   - top-level orchestration reroute after a successful implementation close
   - workflow-local pilot evidence notes used only to prove the aftermath contract
4. Explicit out-of-scope consumers:
   - raw bubble-routing workflows
   - metadata producer changes
   - remote execution consumers
   - new UI/API/read-model systems
5. Export surfaces closed in this phase:
   - repo-local `UpdateProgress` aftermath contract
   - explicit handoff boundary between implementation close and fresh `ResolvePlanState` / `PlanComplete`
   - explicit workflow-local pilot proof boundary for V1 trust-building

### Baseline Preservation

1. Must-preserve behaviors:
   - `ExecutePairflowPlan` remains the orchestrator only
   - `UsePairflow` remains the bubble close/lifecycle owner
   - Task 1 remains the archive/lineage authority baseline
   - Task 4 remains the sole owner of pre-aftermath supersession for identity-changing replanning
   - V1 remains local-only
2. Allowed resolution paths:
   - consume the merged Task 1 / Task 2 / Task 3 / Task 4 contract as-is
   - consume the settled implementation-close boundary without reopening raw bubble state
   - reconcile progress/archive aftermath using existing `archive_group` / `task_id` / status fields
   - continue mechanically into a fresh `ResolvePlanState` pass when more work remains
   - stop mechanically at `PlanComplete` when refreshed authoritative state proves the plan is terminal
3. Forbidden regression interpretations:
   - do not make Task 5 consume raw Pairflow detail
   - do not widen metadata just to smooth over aftermath behavior
   - do not collapse local pilot proof into remote execution scope
   - do not treat a generic archive side effect as stronger authority than the canonical Task 1 archive rule
4. Replacement proof required if removed: any future replacement of this task must preserve deterministic progress reconciliation, canonical archive aftermath, and the distinction between normal completion aftermath and Task 4 pre-aftermath supersession behavior.

### Success / Completion Proof Boundary

1. This task does not redesign metadata, bubble lifecycle routing, or normalized replanning behavior.
2. It proves that normal post-implementation aftermath has a single repo-local owner and that a local pilot can be discussed on the existing baseline without hidden metadata prerequisites.

### Precondition and Side-Effect Boundary

1. The merged Task 1 / Task 2 / Task 3 / Task 4 baseline is sufficient precondition for this task.
2. This task must not introduce new metadata prerequisites unless an implementation blocker is demonstrated against that baseline.
3. This task may tighten progress/archive aftermath rules only by consuming the existing metadata contract and the settled implementation-close boundary, not by redefining either.
4. This task may define workflow-local pilot evidence expectations, but it must not silently execute remote or infrastructure-expansion behavior and it must not create a separate reporting surface.

### In Scope

1. Create `.claude/skills/ExecutePairflowPlan/Workflows/UpdateProgress.md`.
2. Update `SKILL.md` so Task 5 aftermath ownership is explicit.
3. Update `ResolvePlanState.md` only where exact implementation-close handoff wording or plan-complete parity needs tightening for the new repo-local aftermath workflow.
4. Define how plan progress and task terminal state are reconciled after successful implementation close without reopening raw bubble-detail ownership.
5. Define deterministic archive aftermath using Task 1's existing `archive_group`, `archive_path`, and `task_id` rules.
6. Define when the next owner is `ResolvePlanState`, `PlanComplete`, or `HumanCheckpoint`.
7. Define the lightweight workflow-local pilot evidence contract for the first trustworthy V1 run without creating a separate reporting surface.

### Out of Scope

1. Adding new plan/task metadata fields or broadening the metadata contract.
2. Reinterpreting raw Pairflow lifecycle detail.
3. Reopening pre-aftermath supersede/archive/recreate behavior from Task 4.
4. Implementing remote execution support.
5. Editing global `~/.claude/skills` or `~/.codex/skills` copies.
6. Building a new standalone reporting or telemetry system for pilot evidence.
7. Introducing a new stable `target_workflow_surface` for post-close aftermath.

### Safety Defaults

1. If implementation close succeeded and more open work remains, reconcile artifacts first and then rerun `ResolvePlanState` from fresh authoritative plan/task state.
2. If plan terminality, task terminal status, or archive mapping is not deterministic under the merged baseline, fail closed instead of inventing metadata or route shortcuts.
3. If a generic close-flow side effect places the task somewhere that conflicts with the canonical Task 1 archive rule, prefer deterministic reconciliation to the canonical rule or stop for a checkpoint; do not redesign the archive contract here.
4. If local pilot evidence is still lightweight, keep it lightweight and local inside the same aftermath workflow; do not widen Task 5 into remote, infrastructure, or standalone reporting work just to make the evidence look richer.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Impacted contracts:
   - repo-local `ExecutePairflowPlan` normal-completion aftermath workflow contract
   - the handoff boundary between successful `CloseImplementationBubble` return and repo-local `UpdateProgress` follow-through
   - workflow-local pilot evidence expectations for V1

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `0`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
10. Identity/join note:
   - canonical terminal task identity still comes from Task 1 `task_id`
   - the critical join here is whether post-close plan/task/archive state still points at the same canonical task and archive target
11. Authority/source-of-truth note:
   - canonical source: refreshed plan/task metadata plus the settled implementation-close boundary
   - forbidden secondary sources: operator memory, raw bubble-state impressions, metadata-expansion wishlists
12. Closure-budget triage:
   - closure buckets touched: `workflow_orchestration_consumers`, `cleanup_recovery_consumers`
   - intentionally collapsed closures: normal progress reconciliation + canonical archive aftermath + fail-closed continuation checks, because they all start from the same post-close authoritative refresh and stay inside one aftermath decision boundary
   - explicitly deferred closures: `authority_producer`, `persisted_authority_or_schema`, raw bubble routing, remote execution, new reporting infrastructure, separate read-model/reporting surfaces
13. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`
   - secondary shape: `fail_closed_hardening`
   - why this bounded mix is safe: the same aftermath boundary closes the orchestrator-side reconciliation and the fail-closed continuation checks without changing canonical producers, introducing coordination primitives, or creating a separate reporting/read-model closure.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Normal completion aftermath must leave plan/task/archive truth consistent enough that the next orchestration decision is trustworthy. | `UpdateProgress` must reconcile aftermath explicitly instead of assuming the close step already settled every artifact. | P1 | required-now |
| Control model | `ExecutePairflowPlan` orchestrates, `UsePairflow` closes bubbles, Task 1 defines archive truth, Task 4 owns pre-aftermath supersession. | Task 5 must consume those boundaries rather than replacing them. | P1 | required-now |
| Read-path rule | Use refreshed plan/task metadata plus the settled implementation-close boundary only. | No raw bubble lifecycle reads or metadata-expansion fallback are allowed here. | P1 | required-now |
| Forbidden fallback | No operator-memory sequencing, no generic "merged means done" shortcut, no archive-contract widening. | Progress and archive aftermath must be explicit and deterministic. | P1 | required-now |
| Allowed resolution path | Reconcile summary/task/archive state, then rerun `ResolvePlanState` or stop at `PlanComplete`. | The workflow must encode the continuation boundary explicitly. | P1 | required-now |
| Missing-data rule | If plan/task/archive aftermath cannot be derived deterministically, fail closed. | Human checkpoint is preferred over hidden aftermath heuristics. | P1 | required-now |
| Phase boundary | This task closes only normal completion aftermath and local pilot proof. | Do not absorb metadata work, raw bubble routing, or Task 4 supersession logic. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Task 1 archive rule | `references/Plan-Task-Metadata-Contract.md` | Canonical archive path remains `plans/archive/tasks/<archive_group>/<task_id>.md`. | preserve | P1 | required-now |
| Task 2 route taxonomy | `Workflows/ResolvePlanState.md` | `PlanComplete` remains the only plan-terminal stop surface. | preserve | P1 | required-now |
| Task 4 ownership boundary | `Workflows/HandleNormalizedReplan.md` | Pre-aftermath supersede/archive stays upstream and separate from normal completion aftermath. | preserve | P1 | required-now |
| Generic close-flow boundary | `UsePairflow` `CloseBubble` | Bubble close remains a separate settled boundary that Task 5 consumes after the fact. | preserve | P1 | required-now |
| No-new-metadata baseline | user instruction + merged Tasks 1-4 | New metadata work is deferred unless blocker proven. | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Use the plan, draft, Tasks 1-4, current skill sources, and `UsePairflow` close contract as anchors. | Do not assume a hidden repo-local aftermath owner already exists. | P1 | required-now |
| Actual touched scope | Normal post-implementation aftermath plus local pilot proof only. | Successor work must not be created by re-opening metadata or bubble routing here. | P1 | required-now |
| Mutation entrypoints in scope | Repo-local markdown workflow files only. | No product/runtime code changes belong here. | P1 | required-now |
| Hidden scope ruled out | No metadata expansion, no raw bubble routing, no remote policy, no standalone telemetry system. | If the draft starts requiring them, the task is too broad. | P1 | required-now |
| Branch inventory note | Cover non-final completion, final completion, canonical archive, archive reconciliation, and fail-closed aftermath. | The workflow contract and examples must name them, not imply them. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Close the remaining normal aftermath and pilot-proof gap. | The task must produce a concrete repo-local workflow owner. | P1 | required-now |
| Depends on | Tasks 1-4 are the active closed baseline. | Do not restate or widen them unless a blocker proves it is required. | P1 | required-now |
| Unlocks / impacts successors | This is the final planned V1 slice. | Keep the aftermath boundary explicit so later optional work does not reopen it casually. | P1 | required-now |
| Task-list impact | Adds the promised Task 5 artifact only. | No new parallel metadata task is created here. | P1 | required-now |
| Inherited validation / exit expectation | Aftermath must stay on normalized settled boundaries, not raw lifecycle reads. | Reject any refinement that re-opens raw bubble detail or hidden metadata dependence. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `.claude/skills/ExecutePairflowPlan/Workflows/UpdateProgress.md` | normal completion aftermath backing workflow | `successful CloseImplementationBubble return + refreshed plan/task metadata -> aftermath result` | new file | Owns post-implementation progress reconciliation, archive aftermath, fail-closed continuation decisions, and workflow-local pilot proof notes. | P1 | required-now | parent plan Task 5 purpose |
| CS2 | `.claude/skills/ExecutePairflowPlan/SKILL.md` | top-level ownership and backing-workflow notes | `N/A -> markdown skill artifact` | existing file | Makes Task 5 aftermath ownership explicit and records that `UpdateProgress` is a repo-local backing workflow, not a new stable route surface. | P1 | required-now | Task 2 / Task 4 successor boundary |
| CS3 | `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md` | implementation-close handoff note parity | `implementation_bubble_close route -> successful close returns to top-level auto-continue loop` | existing file | Keeps exact parity between the existing close route and the post-close handoff into repo-local `UpdateProgress` follow-through. | P1 | required-now | Task 2 successor boundary |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Settled implementation-close handoff | route output exists and close/merge remains `CloseImplementationBubble`-owned, but the successor aftermath owner is still prose-only | exact post-close handoff from successful `CloseImplementationBubble` return into repo-local `UpdateProgress` follow-through | `route_class=implementation_bubble_close`, `target_workflow_surface=CloseImplementationBubble`, `continuation_mode=auto_continue`, `route_scope=implementation_bubble`, `approval_gate_state=already_satisfied`, `reason_code`, `handoff_boundary_note`, successful close return proof | diagnostics notes | additive | P1 | required-now |
| Refreshed aftermath authority set | current plan/draft prose only | exact authoritative inputs for Task 5 | refreshed `PLAN_METADATA`, refreshed `TASK_METADATA`, canonical `archive_group`, canonical `task_id`, settled close boundary proof | pilot notes | additive | P1 | required-now |
| Aftermath result contract | implicit in draft prose | explicit workflow-local aftermath output | `aftermath_action`, `next_owner`, `continuation_mode`, `plan_status_after`, `active_task_id_after`, `task_terminal_status`, `archive_resolution`, `handoff_boundary_note` | workflow-local pilot evidence notes | additive | P1 | required-now |
| No-new-metadata baseline | user instruction, not yet written for Task 5 | explicit task guard | merged Task 1 / Task 2 / Task 3 / Task 4 baseline is sufficient unless blocker proven | blocker proof note | additive | P1 | required-now |

Aftermath reconciliation rule:

1. `UpdateProgress` must consume the settled implementation-close boundary after a successful `CloseImplementationBubble` return without inventing a new close route family or a new stable route surface.
2. It must treat refreshed plan/task metadata as the authoritative aftermath inputs, not stale pre-close assumptions.
3. It must reconcile plan summary and task terminal detail under the existing authority split:
   - plan stays authoritative for sequencing, `active_task_id`, and terminal plan status
   - task stays authoritative for task-local terminal status and persisted archive fields when present
4. It must not mark a task `superseded` during normal completion aftermath; that ownership remains with Task 4.

Archive aftermath rule:

1. Canonical archive target remains `plans/archive/tasks/<archive_group>/<task_id>.md`.
2. If the task is already at the canonical target, the workflow may accept it as settled.
3. If a generic close-flow side effect left the task at a non-canonical but deterministic location, the workflow may reconcile it to the canonical target without new metadata.
4. If canonical archive reconciliation is not deterministic under the existing baseline, fail closed instead of widening the archive contract.

Post-aftermath reroute rule:

1. After any deterministic aftermath update, rerun `ResolvePlanState` from fresh authoritative artifacts unless the refreshed plan/task state already proves `PlanComplete`.
2. Do not chain the next plan/task step from stale pre-close assumptions inside this workflow.
3. `PlanComplete` may be emitted only when refreshed authoritative state proves the terminal boundary.

Pilot evidence rule:

1. Local pilot proof must stay lightweight and local in V1.
2. The workflow may define evidence notes, summary pointers, or explicit checks inside `UpdateProgress`, but it must not require remote execution, a new reporting subsystem, or a separate progress read-model surface.
3. Missing richer evidence is not by itself a reason to reopen metadata scope.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo-local skill docs | create/update files under `.claude/skills/ExecutePairflowPlan/**` | editing global installed skill copies | repo-local source-of-truth only | P1 | required-now |
| Normal completion aftermath | define plan/task/archive reconciliation and continuation boundaries | implementing raw bubble routing or pre-aftermath supersession | keep ownership explicit | P1 | required-now |
| Archive aftermath | consume existing Task 1 archive contract for completed tasks | broadening archive metadata or replacing canonical archive shape | canonical path remains Task 1-owned | P1 | required-now |
| Pilot validation | define lightweight workflow-local proof expectations | remote support, new telemetry infrastructure, or a standalone progress surface | V1 remains local-only and aftermath-scoped | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| refreshed aftermath state is absent, partial, or inconsistent | settled implementation close + plan/task metadata | result | fail closed to human checkpoint | `NO_TRUSTWORTHY_ROUTE` or existing conflict code | warn | P1 | required-now |
| plan/task disagreement crosses the approved authority split | refreshed plan metadata + refreshed task metadata | result | fail closed | `CROSS_AUTHORITY_METADATA_CONFLICT` | warn | P1 | required-now |
| archive mapping cannot be derived deterministically | Task 1 metadata contract | result | stop for checkpoint / refinement | `NON_DETERMINISTIC_TASK_IDENTITY` | error | P1 | required-now |
| plan claims terminal completion but refreshed tracker/task state is not terminal | refreshed authoritative artifacts | result | reroute away from `PlanComplete` and fail closed if needed | `PLAN_COMPLETE_STATE_STALE` | error | P1 | required-now |
| newer metadata seems helpful but no blocker is proven | parallel metadata discussion | result | continue on merged baseline; do not expand contract | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | merged Task 1 metadata, lineage, and archive contract | P1 | required-now |
| must-use | merged Task 2 normalized route taxonomy and `PlanComplete` boundary | P1 | required-now |
| must-use | merged Task 4 pre-aftermath ownership boundary | P1 | required-now |
| must-use | `UsePairflow` close-bubble contract as the settled implementation-close boundary | P1 | required-now |
| must-not-use | raw Pairflow-state reasoning in the aftermath layer | P1 | required-now |
| must-not-use | new metadata prerequisite work unless blocker proven | P1 | required-now |
| must-not-use | direct edits in global installed skill directories | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | implementation close succeeds and more work remains | current task finished, refreshed plan still has non-terminal remaining tasks | `UpdateProgress` evaluates aftermath | it reconciles plan/task/archive state, keeps plan non-terminal, and reruns `ResolvePlanState` from fresh artifacts | P1 | required-now | draft closeout flow |
| T2 | implementation close succeeds and the plan becomes terminal | current task finished and refreshed tracker/task state is fully terminal | `UpdateProgress` evaluates aftermath | it reconciles plan/task/archive state and stops at `PlanComplete` without inventing another route family | P1 | required-now | Task 2 plan-complete rule |
| T3 | archive aftermath is already canonical | completed task already sits at `plans/archive/tasks/<archive_group>/<task_id>.md` | aftermath is evaluated | it accepts the canonical placement without metadata changes | P1 | required-now | Task 1 archive contract |
| T4 | generic close-flow archive placement is non-canonical but deterministic | completed task can still be mapped from existing `archive_group` + `task_id` | aftermath is evaluated | it reconciles the archive aftermath to the canonical Task 1 path without adding metadata | P1 | required-now | Task 1 archive contract + close-flow boundary |
| T5 | plan tracker summary is stale but task-local completion is trustworthy | refreshed task artifact says terminal, plan summary lags | aftermath is evaluated | it reconciles the summary under the approved authority split instead of treating the lag as a new metadata blocker | P1 | required-now | Task 1 precedence rule |
| T6 | `PlanComplete` would be stale | plan claims done but refreshed tracker/task state is non-terminal | aftermath is evaluated | it must not emit `PlanComplete`; it fails closed or reroutes safely | P1 | required-now | Task 2 fail-closed rule |
| T7 | new metadata idea appears but is not a blocker | current merged baseline still supports normal aftermath and pilot proof | task is reviewed | the task remains implementable without adding metadata prerequisites | P1 | required-now | user instruction |
| T8 | local pilot proof remains lightweight | local-only V1 path is sufficient but no richer telemetry exists | pilot boundary is defined inside `UpdateProgress` | the task records lightweight workflow-local proof expectations without widening into remote, infrastructure, or standalone reporting work | P1 | required-now | local-only V1 boundary |

## Acceptance Criteria

1. AC1: A repo-local `UpdateProgress.md` workflow exists and explicitly owns normal post-implementation progress/archive aftermath.
2. AC2: Task 5 consumes only a settled implementation-close boundary plus refreshed authoritative artifacts; it does not reinterpret raw Pairflow lifecycle detail.
3. AC3: The task keeps `ExecutePairflowPlan` orchestrator-only, `UsePairflow` bubble-close-owned, and Task 4 pre-aftermath supersession-owned.
4. AC4: The task explicitly defines canonical archive aftermath on the existing Task 1 `archive_group` + `task_id` baseline without requiring new metadata fields.
5. AC5: The task explicitly defines when execution reruns `ResolvePlanState` and when it can stop at `PlanComplete`.
6. AC6: The task does not absorb remote execution support or a new reporting subsystem.
7. AC7: The top-level skill and `ResolvePlanState` remain aligned with the new repo-local aftermath owner, and `UpdateProgress` is explicit as a backing workflow rather than a new stable route surface.
8. AC8: The task makes the local pilot proof boundary explicit enough for a first trustworthy V1 run.
9. AC9: New metadata ideas remain optional and non-blocking for this task unless a concrete blocker is proven.

## L2 - Implementation Notes (Optional)

1. Keep `UpdateProgress.md` aftermath-oriented; detailed artifact-writing prompts should stay with `CreatePairflowSpec`, and bubble close mechanics should stay with `UsePairflow`.
2. Prefer explicit canonical archive reconciliation over vague "whatever CloseBubble already did" reasoning when the existing Task 1 contract is more precise.
3. If a true blocker against the current metadata baseline is discovered, record it as a blocker and route back to plan/task refinement rather than silently broadening Task 5.
4. Keep local pilot proof lightweight and auditable inside the aftermath workflow; do not turn it into remote-support or standalone reporting design by accident.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | worked examples for canonical-vs-non-canonical archive aftermath | L2 | P2 | later-hardening | drift risk between generic close flow and Task 1 archive rule | add machine-readable examples once workflow body lands |
| H2 | stronger examples for plan-complete vs rerun-aftermath boundaries | L2 | P2 | later-hardening | stale-terminal risk after successful close | add after Task 5 workflow body lands |
| H3 | lightweight pilot evidence template examples | L2 | P2 | later-hardening | local trust-building may drift into ad hoc notes | add once first pilot path is implemented |

## Review Control

1. Review this task as a normal completion aftermath slice, not as a redesign of the metadata or bubble-routing contracts.
2. Reject refinements that reopen raw Pairflow interpretation or let Task 5 redefine Task 4 supersession ownership.
3. Reject refinements that make new metadata work an implicit prerequisite without a demonstrated blocker.
4. Reject refinements that widen local pilot proof into remote execution, infrastructure expansion, or a separate reporting/read-model surface.

## Assumptions

1. Tasks 1, 2, 3, and 4 are merged and form the active baseline for this task.
2. The next missing trustworthy slice is normal completion aftermath and local pilot proof, not metadata expansion or raw bubble routing.
3. `UsePairflow` remains the correct settled-boundary owner for implementation bubble close in local V1.
4. New metadata work currently under discussion is not yet required for this task unless a concrete blocker is found during implementation.
