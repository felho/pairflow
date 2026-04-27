---
artifact_type: task
artifact_id: task_execute_pairflow_plan_metadata_foundation_v1
title: "ExecutePairflowPlan Metadata Foundation"
status: draft
phase: phase1
target_files:
  - .claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md
  - .claude/skills/ExecutePairflowPlan/Workflows/FixPlanMetadata.md
prd_ref: null
plan_ref: plans/execute-pairflow-plan-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: ExecutePairflowPlan Metadata Foundation

## Current Codebase Check (2026-04-28)

1. Repo-local `ExecutePairflowPlan` skill source does not exist yet under `.claude/skills/ExecutePairflowPlan/`.
2. The current repo-local skill sources are limited to `.claude/skills/CreatePairflowSpec/**` and `.claude/skills/UsePairflow/**`.
3. The approved parent plan already fixes the authority split and the minimum metadata direction, but that contract is not yet encoded into repo-local skill files.

## L0 - Policy

### Goal

Define the first executable metadata foundation for `ExecutePairflowPlan` by writing the minimum plan/task metadata contract and the legacy-plan bootstrap workflow that repairs missing plan metadata before normal orchestration begins.

This task must close the metadata gap without pulling in the top-level orchestrator skeleton, next-workflow routing, or bubble lifecycle routing details that belong to successor tasks.

### Primary Deliverable Shape

1. Produce exactly two repo-local markdown artifacts under `.claude/skills/ExecutePairflowPlan/**`:
   - `references/Plan-Task-Metadata-Contract.md`
   - `Workflows/FixPlanMetadata.md`
2. `Plan-Task-Metadata-Contract.md` must own field definitions, status-domain rules, identity derivation, archive/lineage rules, disagreement handling, and the representation default for routing-relevant metadata.
3. `FixPlanMetadata.md` must own only the bootstrap/repair entry conditions, the minimum repaired output shape, and the fail-closed exit when repair cannot produce trustworthy plan metadata.
4. This task is done when a future implementer can determine:
   - whether a plan is execution-ready vs bootstrap-required,
   - how `task_id` / filename / bubble IDs are derived,
   - and when disagreement is auto-resolved vs routed to a human checkpoint,
   without inventing extra orchestrator or bubble-routing behavior.

### Domain / Control Model Summary

1. Business invariant: the executor must reduce operator-held orchestration state without weakening review gates, human checkpoints, or Pairflow lifecycle contracts.
2. Control model: the plan is canonical for sequencing and next-task selection; the task is canonical for detailed local execution state; Pairflow is canonical for bubble lifecycle state when a bubble exists.
3. Read-path rule: `ExecutePairflowPlan` may read sequencing from plan metadata, detailed execution state from task metadata, and bubble lifecycle from Pairflow status. The metadata foundation created here must make those read paths explicit.
4. Forbidden fallback: do not reconstruct sequencing or task identity primarily from chat history, filename heuristics, or implicit operator memory when metadata can be repaired first.
5. Allowed resolution path: deterministic same-authority resolution is allowed only within the already-approved authority split. Missing or incomplete legacy plan metadata may be bootstrapped mechanically before normal execution starts.
6. Missing-data rule: if required plan metadata is missing, the executor must route through `FixPlanMetadata` first. If plan/task disagreement crosses authority boundaries and no declared precedence rule resolves it safely, the system must fail closed to a human checkpoint.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here for metadata/reference artifacts only
   - internal execution closure: successor
   - workflow/orchestration closure: owned here only for the metadata bootstrap workflow contract
   - read-model closure: successor
   - activation closure: successor
   - cleanup/recovery closure: successor except archive metadata shape and lineage rules

### Plan Linkage

1. Parent plan gap closed: missing minimum metadata contract for plans/tasks, disagreement handling, archive linkage, and repair/bootstrap flow.
2. Depends on: `N/A`
3. Unlocks / impacts successors:
   - `plans/tasks/execute-pairflow-plan/2-executeplan-orchestrator-skeleton.md`
   - `plans/tasks/execute-pairflow-plan/3-executeplan-bubble-routing.md`
   - `plans/tasks/execute-pairflow-plan/4-executeplan-plan-and-task-routing.md`
4. Task-list impact: refines `plans/tasks/execute-pairflow-plan/1-executeplan-metadata-foundation.md` only.
5. Inherited validation / exit expectation: this task must prove that the metadata contract is explicit enough for trustworthy state resolution and that legacy plan entry can be repaired before the normal executor path runs.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/execute-pairflow-plan-plan-v1.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/CreatePairflowSpec/SKILL.md`
   - `.claude/skills/UsePairflow/SKILL.md`
2. Canonical elements:
   - plan sequencing authority
   - task detailed execution authority
   - Pairflow bubble lifecycle authority
   - local-only V1 scope
   - `task_family_id` + `sequence_key` -> canonical `task_id`
3. Guard elements:
   - task tracker high-level status in the plan
   - archive linkage metadata
   - task-to-bubble reference fields
4. Compat-only elements:
   - legacy plans missing required metadata
   - mechanically repaired plan metadata created only to reach the minimum trustworthy shape
5. Forbidden reinterpretations:
   - do not promote task-local state to sequencing authority
   - do not mirror Pairflow lifecycle state into plan/task metadata as a competing source of truth
   - do not treat `not_created` as a task-local state

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `plans/execute-pairflow-plan-plan-v1.md`
   - `docs/execute-pairflow-plan-draft.md`
   - `.claude/skills/CreatePairflowSpec/SKILL.md`
   - `.claude/skills/CreatePairflowSpec/Workflows/CreateTask.md`
   - `.claude/skills/UsePairflow/SKILL.md`
   - `.claude/skills/INSTALL.md`
2. Actual touched scope: `contract_or_persisted_authority_foundation`
3. Mutation entrypoints in scope: `N/A` for product/runtime code; the only produced artifacts are repo-local skill markdown files under `.claude/skills/ExecutePairflowPlan/**`.
4. Hidden scope ruled out: this task does not own top-level `ExecutePairflowPlan` routing, bubble lifecycle routing, implementation of task review loops, remote support, or global skill install changes.
5. Branch inventory note:
   - legacy plan missing metadata vs compliant plan
   - disagreement resolvable inside authority split vs disagreement requiring fail-closed checkpoint
   - task lineage normal vs superseded/archive lineage
6. Why the declared task shape matches reality: the touched scope is a new metadata/reference foundation plus one bootstrap workflow contract. It does not yet implement orchestrator routing or bubble lifecycle behavior, so it remains a bounded foundation slice.

### Authority Boundary Map

1. Authority producer: this task authors the metadata contract and bootstrap workflow that future `ExecutePairflowPlan` logic must follow.
2. Stored authority: plan files and task files remain the stored artifact authorities; this task only defines the required metadata shape and repair rules for them.
3. In-scope consumers:
   - top-level state resolution
   - next-task selection prerequisites
   - task lineage and archive routing
   - metadata bootstrap for legacy plans
4. Explicit out-of-scope consumers:
   - raw bubble lifecycle routing
   - deep review invocation mechanics
   - implementation bubble execution
   - remote execution policy
   - global installer sync behavior
5. Export surfaces closed in this phase: no; this task closes the metadata foundation contract, not the full executable skill surface.

### Baseline Preservation

1. Must-preserve behaviors:
   - plan remains sequencing authority
   - task remains detailed execution authority
   - Pairflow remains bubble lifecycle authority
   - V1 remains local-only
2. Allowed resolution paths:
   - metadata bootstrap for legacy plans before normal execution
   - deterministic same-authority disagreement resolution when explicitly covered by the contract
3. Forbidden regression interpretations:
   - do not "tighten" the contract into raw filename or chat-history routing
   - do not reinterpret route-back or supersession lineage as bubble lifecycle authority
4. Replacement proof required if removed: any future replacement of this metadata contract must prove equivalent or stricter authority preservation for sequencing, task identity, lineage, and fail-closed behavior.

### Success / Completion Proof Boundary

N/A. This task does not change product/runtime completion semantics; it defines metadata and bootstrap contracts for future orchestration work.

### Precondition and Side-Effect Boundary

N/A. This task does not modify an existing runtime mutation flow or introduce coordination primitives.

### In Scope

1. Create the repo-local metadata contract reference for `ExecutePairflowPlan`.
2. Define the minimum trustworthy plan metadata set and minimal plan task-tracker shape.
3. Define the minimum trustworthy task metadata set, including lineage and bubble reference fields.
4. Define canonical task identity rules: `task_family_id`, `sequence_key`, `task_id`, filename rule, and bubble ID derivation contract.
5. Define archive-group and archive-path rules for completed and superseded tasks.
6. Define the precedence and fail-closed rule for plan/task metadata disagreement.
7. Define `FixPlanMetadata` as the legacy-plan bootstrap workflow contract.

### Out of Scope

1. The top-level `ExecutePairflowPlan` `SKILL.md` skeleton.
2. `ResolvePlanState` routing semantics beyond the metadata contract it depends on.
3. Bubble create/review/close orchestration.
4. Task review loops and normalized replanning consumption.
5. Remote execution support.
6. Global `~/.claude/skills` or `~/.codex/skills` sync/install changes.

### Safety Defaults

1. Missing plan metadata must route to repair first, not to heuristic execution.
2. Bubble lifecycle state must remain external authority and must not be duplicated as competing manual metadata.
3. If `task_id`, archive path, or lineage cannot be derived deterministically, the task must require refinement instead of inventing fallback naming.
4. Metadata disagreement that crosses authority boundaries must stop at a human checkpoint.
5. Metadata used by machine routing or identity resolution must be defined as frontmatter keys in the contract; body prose may explain those keys but must not replace them as routing truth.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Impacted contracts:
   - repo-local skill metadata contract for `ExecutePairflowPlan`
   - plan/task artifact metadata shape used by successor tasks

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `0`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
10. Identity/join note:
   - canonical identity path: `task_family_id` + `sequence_key` deterministically define `task_id`
   - competing identifiers or fallback identities: filename-only or operator-memory-only task identity is forbidden
11. Authority/source-of-truth note:
   - canonical source: parent plan authority split plus the metadata contract written in this task
   - forbidden secondary sources: chat history, ad hoc filename heuristics, mirrored bubble state
12. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `workflow_orchestration_consumers`, `cleanup_recovery_consumers`
   - intentionally collapsed closures: metadata contract + metadata bootstrap workflow, because both are documentation-level closure for the same orchestration foundation
   - explicitly deferred closures: `internal_execution_consumers`, `read_model_consumers`, runtime bubble routing, activation
13. Bounded-task-shape decision:
   - primary shape: `contract_or_persisted_authority_foundation`
   - secondary shape: `N/A`
   - why this bounded mix is safe: the task stays in repo-local skill contract files and does not activate runtime behavior or downstream consumer alignment

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | The executor must externalize orchestration state without weakening review, approval, or Pairflow lifecycle discipline. | The task must produce metadata rules that make future state resolution trustworthy but do not bypass existing gates. | P1 | required-now |
| Control model | Plan = sequencing authority, task = detailed execution authority, Pairflow = bubble lifecycle authority. | The metadata contract must encode this split explicitly and must not create competing truth surfaces. | P1 | required-now |
| Read-path rule | Sequencing reads from plan metadata, task-local execution reads from task metadata, bubble lifecycle reads from Pairflow. | The contract must name the minimum fields each read path depends on. | P1 | required-now |
| Forbidden fallback | No chat-history, filename-only, or operator-memory fallback when metadata can be repaired or is expected to exist. | `FixPlanMetadata` must be the first path for missing legacy plan metadata; undocumented fallback heuristics are forbidden. | P1 | required-now |
| Allowed resolution path | Deterministic same-authority resolution is allowed only inside the declared authority split; legacy plan bootstrap is allowed before normal execution. | The contract must distinguish safe precedence rules from fail-closed disagreement cases. | P1 | required-now |
| Missing-data rule | Missing required plan metadata routes to `FixPlanMetadata`; unresolved cross-authority disagreement routes to human checkpoint. | The workflow contract must encode both bootstrap and fail-closed exits. | P1 | required-now |
| Phase boundary | This task closes metadata contract and bootstrap workflow only; all normal executor routing and bubble orchestration remain for successors. | File scope and acceptance criteria must stay narrow and not absorb Task 2/3/4 behavior. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Plan sequencing authority | `plans/execute-pairflow-plan-plan-v1.md` | The plan decides next task and sequencing. | preserve | P1 | required-now |
| Task detailed execution authority | `plans/execute-pairflow-plan-plan-v1.md` | The task owns detailed execution state and lineage fields. | preserve | P1 | required-now |
| Pairflow bubble authority | `plans/execute-pairflow-plan-plan-v1.md`, `.claude/skills/UsePairflow/SKILL.md` | Bubble lifecycle state is external authority, not duplicated metadata truth. | preserve | P1 | required-now |
| `task_id` derivation model | `docs/execute-pairflow-plan-draft.md` | `task_id` is the executable canonical ID derived from family + sequence. | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Use the parent plan, draft, and repo-local skill source files as the only current anchors because `ExecutePairflowPlan` source does not yet exist. | The task may create new skill files, but must not assume hidden existing behavior under `.claude/skills/ExecutePairflowPlan/**`. | P1 | required-now |
| Actual touched scope | The task is a metadata foundation slice, not an executor-routing slice. | Successor tasks must still define orchestrator skeleton and routing behavior. | P1 | required-now |
| Mutation entrypoints in scope | New markdown skill files only. | No product/runtime code changes belong here. | P1 | required-now |
| Hidden scope ruled out | Bubble lifecycle routing, review loop execution, installer sync, and remote policy are out of scope. | If the draft tries to absorb those, the task is too broad. | P1 | required-now |
| Branch inventory note | Cover legacy-missing, contract-compliant, safe-precedence, and fail-closed disagreement branches. | The metadata contract and bootstrap workflow examples must reflect all four branches. | P1 | required-now |
| Shape proof | The same contract foundation closes task identity, lineage, archive metadata, and bootstrap preconditions. | One bounded foundation task is safe before later routing tasks build on it. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Close the minimum metadata contract and legacy bootstrap gap. | The task must produce concrete field-level contract, not only prose. | P1 | required-now |
| Depends on | `N/A` | This is the first implementation task in the plan. | P1 | required-now |
| Unlocks / impacts successors | Task 2, Task 3, and Task 4 depend on this metadata contract remaining stable. | Later task drafts must inherit field names and authority rules without redefining them. | P1 | required-now |
| Task-list impact | Refines this Task 1 artifact only. | No other open task is replaced or obsoleted. | P1 | required-now |
| Inherited validation / exit expectation | Future state resolution must be able to identify bootstrap-required vs execution-ready artifacts. | This task must supply explicit examples or decision rules for that distinction. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Plan/task metadata shape for `ExecutePairflowPlan` | Future Task 2/3/4/5 and human operator review flow | additive | define the canonical metadata contract and bootstrap path | downstream task drafts must preserve names and ownership |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Human-held sequencing state for legacy plans without metadata | replace | the new bootstrap workflow must show how a legacy plan becomes execution-ready without heuristic hidden state | P1 | required-now |
| Existing authority split from the approved plan | preserve | field-level contract must not blur sequencing/task/bubble authority boundaries | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| Metadata readiness for execution | ad hoc human judgment | explicit minimum plan/task metadata contract + `FixPlanMetadata` workflow | canonical | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| legacy plan missing metadata | any normal execution routing | starting next-task/bubble orchestration before bootstrap | route to `FixPlanMetadata` first | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md` | metadata contract reference | `N/A -> markdown contract artifact` | new file | Define minimum plan metadata, task metadata, identity, lineage, archive, and disagreement rules. | P1 | required-now | parent plan Task 1 purpose |
| CS2 | `.claude/skills/ExecutePairflowPlan/Workflows/FixPlanMetadata.md` | bootstrap workflow | `legacy plan path/context -> repaired minimum metadata or fail-closed checkpoint` | new file | Define the mechanical bootstrap/repair flow for missing legacy plan metadata before normal execution begins. | P1 | required-now | parent plan Done Definition + Missing-data rule |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Plan metadata minimum | not encoded in repo-local skill files | explicit contract in new reference doc | `plan_id`, `plan_status`, `task_order`, `task_tracker`, `active_task_id`, `archive_group` as routing-relevant frontmatter keys | `last_completed_task_id`, `notes` | additive | P1 | required-now |
| Plan task-tracker entry | currently implicit in design docs only | explicit tracker row contract | `task_id`, `task_path|null`, high-level `status` limited to `not_created|draft|under_review|approved|in_progress|done|superseded|archived` | `notes` | additive | P1 | required-now |
| Task metadata minimum | not encoded in repo-local skill files | explicit contract in new reference doc | `artifact_id`, `task_family_id`, `sequence_key`, `task_id`, task-local `status`, `plan_ref`, `doc_bubble_id|null`, `impl_bubble_id|null`, `supersedes`, `superseded_by` | `archive_group`, `archive_path` | additive | P1 | required-now |
| Task status domain | currently implicit and partially conflated with plan tracker state | explicit task-local status rule | task-level `status` must exclude `not_created` and must not mirror Pairflow lifecycle states | short examples | additive | P1 | required-now |
| Task identity derivation | discussed in draft only | explicit derivation rule | `task_family_id`, `sequence_key`, canonical `task_id=<sequence_key>-<task_family_id>`, filename `<task_id>.md` | short examples | additive | P1 | required-now |
| Bubble ID derivation | implicit future behavior | explicit derived contract | `<task_id>-doc`, `<task_id>-impl` | persisted concrete IDs after creation | additive | P1 | required-now |
| Archive contract | discussed in draft only | explicit path contract | `archive_group`, `task_id`, date-prefixed plan slug | `archive_path` | additive | P1 | required-now |
| Metadata disagreement handling | currently only in plan prose | explicit precedence + fail-closed rule | authority split, deterministic precedence, human-checkpoint cases | worked examples | additive | P1 | required-now |
| Representation default | frontmatter-vs-body placement is still open in the draft | explicit frontmatter-first routing contract | all plan/task fields used for machine routing, identity, or archive mapping | explanatory body examples/snippets | additive | P1 | required-now |
| Explicitly deferred plan hint fields | draft mentions possible hint/note fields | minimum trustworthy V1 contract stays narrow | `N/A` | `next_action_hint`, `execution_notes`, or equivalent hints may be documented only as non-authoritative future extensions | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo-local skill docs | create new files under `.claude/skills/ExecutePairflowPlan/**` | editing global `~/.claude/skills` or `~/.codex/skills` copies directly | repo-local source-of-truth only | P1 | required-now |
| Metadata contract authoring | add explicit field-level rules and examples | vague prose that leaves authority precedence implicit | successor tasks depend on exact names and meanings | P1 | required-now |
| Bootstrap workflow | define repair/bootstrap steps and fail-closed exits | implementing full normal execution routing in this workflow | keep workflow narrow to metadata readiness | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| plan metadata missing but mechanically reconstructable from artifact context | parent plan file | fallback | run `FixPlanMetadata` and emit repaired minimum metadata | PLAN_METADATA_BOOTSTRAP_REQUIRED | info | P1 | required-now |
| plan/task disagreement inside declared authority split | plan/task metadata | result | follow the declared authoritative side and document the precedence rule | AUTHORITY_PRECEDENCE_APPLIED | warn | P1 | required-now |
| plan/task disagreement crossing authority boundaries with no safe precedence rule | plan/task metadata | result | stop at human checkpoint | CROSS_AUTHORITY_METADATA_CONFLICT | warn | P1 | required-now |
| `task_id` or archive mapping cannot be derived deterministically | task metadata contract | throw | require task refinement instead of inventing fallback identity | NON_DETERMINISTIC_TASK_IDENTITY | error | P1 | required-now |
| dependency failure | missing repo-local context file | result | stop and report missing source anchor explicitly | CONTEXT_SOURCE_MISSING | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | approved parent plan `plans/execute-pairflow-plan-plan-v1.md` | P1 | required-now |
| must-use | repo-local draft `docs/execute-pairflow-plan-draft.md` for metadata examples and archive decisions | P1 | required-now |
| must-use | repo-local skill source-of-truth policy from `AGENTS.md` and `.claude/skills/INSTALL.md` | P1 | required-now |
| must-not-use | direct edits in `~/.claude/skills` or `~/.codex/skills` | P1 | required-now |
| must-not-use | bubble lifecycle state mirrored as competing manual metadata authority | P1 | required-now |
| must-not-use | implicit sequencing derived from filenames or chat transcript when metadata is missing | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | compliant plan already has minimum metadata | approved plan with required plan fields | executor reads metadata contract | contract marks plan execution-ready without bootstrap | P1 | required-now | parent plan minimum metadata set |
| T2 | legacy plan missing required metadata | plan artifact missing one or more required fields | `FixPlanMetadata` runs | workflow defines how minimum metadata is added before normal execution | P1 | required-now | draft bootstrap decision |
| T3 | resolvable plan/task disagreement | plan says next task X, task-local detailed state differs only in local execution detail | disagreement rule is applied | authoritative side is selected deterministically without human checkpoint | P1 | required-now | approved authority split |
| T4 | cross-authority disagreement | plan sequencing points to X but task metadata implies a different sequencing truth | disagreement rule is applied | workflow fails closed to human checkpoint | P1 | required-now | missing-data rule |
| T5 | task identity derivation | `task_family_id` and `sequence_key` are present | task metadata contract is evaluated | canonical `task_id`, filename, and derived bubble IDs are unambiguous | P1 | required-now | draft task identity model |
| T6 | archive lineage for superseded task | task is superseded before completion | archive contract is evaluated | original task stays `superseded` and archives under plan-grouped date-prefixed path | P1 | required-now | approved archive decision |
| T7 | routing metadata representation | required routing fields exist in frontmatter and explanatory prose also exists in body | the contract is applied | frontmatter remains canonical and body prose is treated as explanatory only | P1 | required-now | draft frontmatter open question |
| T8 | task bubble linkage without lifecycle mirroring | task metadata contains bubble IDs and Pairflow remains the lifecycle source | the contract is evaluated | bubble IDs are treated as linkage only and no competing lifecycle status field is required in plan/task metadata | P1 | required-now | approved authority split |
| T9 | minimal V1 plan stays narrow | a plan lacks `next_action_hint` and `execution_notes` but has all required minimum metadata | execution-readiness is evaluated | the plan is still considered compliant and no bootstrap is required solely for missing hint fields | P1 | required-now | draft candidate field list |

## Acceptance Criteria

1. AC1: A repo-local reference file explicitly defines the minimum trustworthy plan metadata set and plan task-tracker shape.
2. AC2: The same contract explicitly defines the minimum trustworthy task metadata set, including lineage fields, nullable bubble reference fields, and a task-local status domain that does not reuse `not_created` or Pairflow lifecycle states.
3. AC3: The contract explicitly defines canonical task identity, filename, and bubble-ID derivation rules.
4. AC4: The contract explicitly defines archive grouping and archive path rules for both completed and superseded tasks.
5. AC5: The contract explicitly defines when plan/task disagreement is resolved deterministically and when it fails closed to a human checkpoint.
6. AC6: A repo-local `FixPlanMetadata` workflow file defines the bootstrap trigger, the repaired minimum output shape, and the fail-closed exit when trustworthy metadata still cannot be reconstructed.
7. AC7: The contract explicitly states that routing-relevant metadata is frontmatter-level truth and that body prose cannot substitute for missing required keys.
8. AC8: The minimum trustworthy V1 contract stays narrow and does not require non-authoritative hint fields such as `next_action_hint` or `execution_notes`.
9. AC9: The task does not absorb top-level orchestrator skeleton or bubble-routing behavior that belongs to successor tasks.

## L2 - Implementation Notes (Optional)

1. Keep the metadata reference file compact and example-driven so Task 2 can depend on it without restating the same rules.
2. Prefer one canonical metadata reference doc plus one bootstrap workflow file over many micro-reference files in the first pass.
3. If examples are added, include at least one compliant plan snippet and one legacy-bootstrap snippet.
4. If examples are added, include one example showing task bubble linkage fields without any mirrored lifecycle status fields.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | metadata lint/examples for future task drafts | L2 | P2 | later-hardening | likely future drift risk | add a compact validation checklist or examples once Task 2 exists |
| H2 | archive-path example set | L2 | P2 | later-hardening | archive contract may be reused by later tasks | add superseded vs completed examples if task reviewers need them |
| H3 | installer registration for new skill | L2 | P2 | later-hardening | `.claude/skills/INSTALL.md` currently supports only two skills | leave installer update to the task that creates the executable skill skeleton |

## Review Control

1. Review this task as a bounded foundation slice, not as the place where the whole executor behavior is finalized.
2. Reject refinements that reintroduce bubble lifecycle truth, remote policy, or top-level routing behavior into this task.
3. Preserve the current field names and authority split unless a higher-level plan refinement explicitly authorizes a change.

## Assumptions

1. The approved plan is the canonical upstream artifact for this task.
2. The first implementation pass should create repo-local `ExecutePairflowPlan` source files rather than editing global installed skill copies.
3. Successor tasks will consume this metadata contract rather than redefining it locally.
