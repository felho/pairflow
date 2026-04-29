---
name: ExecutePairflowPlan
description: Orchestrate approved Pairflow plans through the next correct local workflow route, including post-close aftermath handoff, until a settled checkpoint or real blocker is reached. USE WHEN execute a plan, continue plan-driven task progression, or determine the next delegated plan/task/bubble workflow.
---

# ExecutePairflowPlan

Execute a Pairflow plan as a state-aware orchestrator over existing specialized workflows.

Canonical metadata authority for the inputs named below lives in:

1. `references/Plan-Task-Metadata-Contract.md`

## Artifact Responsibilities

This skill owns only the top-level orchestration contract:

1. determine the next correct workflow route from plan metadata, task metadata, persisted bubble linkage, and normalized bubble-routing outputs
2. delegate the selected work to the correct specialized workflow surface
3. continue automatically only when the route contract allows it
4. stop cleanly at a settled checkpoint, real human checkpoint, or real blocker

This skill does not own:

1. plan/task workflow body text that belongs to `CreatePairflowSpec`
2. bubble lifecycle workflow body text that belongs to `UsePairflow`
3. raw bubble-detail interpretation or lifecycle-to-route classification
4. task supersede/archive execution
5. direct progress/archive aftermath execution details, which are delegated to repo-local `Workflows/UpdateProgress.md`
6. remote execution support in V1

## Workflow Routing

`ExecutePairflowPlan` keeps the route-surface inventory stable, while some repo-local workflows exist only as backing handlers behind those route surfaces.

| Route Surface Returned By `ResolvePlanState` | Role in This Skill | Owner / Backing Workflow |
|---|---|---|
| `FixPlanMetadata` | bootstrap or repair missing plan metadata before normal execution | repo-local `Workflows/FixPlanMetadata.md` |
| `ResolvePlanState` | assess current state and choose the next normalized route | repo-local `Workflows/ResolvePlanState.md` |
| `ReviewPlan` | review or refine plan-level readiness before task progression | `CreatePairflowSpec` `ReviewSpec` in `plan-mode` |
| `CreateTask` | create the next executable task from the plan | `CreatePairflowSpec` `CreateTask` |
| `ReviewTask` | review/refine the active task before bubble work | `CreatePairflowSpec` `ReviewSpec` in `task-mode` |
| `CreateDocumentBubble` | stable route surface for document-bubble create/start | `HandleDocumentBubble` -> `UsePairflow` `CreateBubble` |
| `ReviewDocumentBubble` | stable route surface for document-bubble deep review at the approval gate | `HandleDocumentBubble` -> `UsePairflow` `ReviewBubble` |
| `CloseDocumentBubble` | stable route surface for document-bubble approve/merge/cleanup after approval is already satisfied | `HandleDocumentBubble` -> `UsePairflow` `CloseBubble` |
| `CreateImplementationBubble` | stable route surface for implementation-bubble create/start | `HandleImplementationBubble` -> `UsePairflow` `CreateBubble` |
| `ReviewImplementationBubble` | stable route surface for implementation-bubble deep review at the approval gate | `HandleImplementationBubble` -> `UsePairflow` `ReviewBubble` |
| `CloseImplementationBubble` | stable route surface for implementation-bubble approve/merge/cleanup after approval is already satisfied | `HandleImplementationBubble` -> `UsePairflow` `CloseBubble` |
| `HandleNormalizedReplan` | consume a normalized replanning signal without reclassifying raw bubble detail | repo-local `Workflows/HandleNormalizedReplan.md` |
| `TroubleshootBubble` | stable route surface for explicit bubble-runtime or lifecycle troubleshooting | active bubble handler -> `UsePairflow` troubleshooting surface |
| `HumanCheckpoint` | stop for ambiguity, contract refinement, or real operator judgment | explicit stop boundary, not an auto-run workflow |
| `PlanComplete` | stop after the plan reaches a complete settled boundary | explicit stop boundary, not a downstream workflow |

| Repo-local Backing Workflow | Role in This Skill | Returned As `target_workflow_surface`? |
|---|---|---|
| `HandleDocumentBubble` | repo-local owner for document-bubble lifecycle interpretation, `UsePairflow` delegation, and normalized bubble outputs | no; it backs document-bubble route surfaces |
| `HandleImplementationBubble` | repo-local owner for implementation-bubble lifecycle interpretation, `UsePairflow` delegation, and normalized bubble outputs | no; it backs implementation-bubble route surfaces |
| `UpdateProgress` | repo-local owner for normal post-implementation progress reconciliation, canonical archive aftermath, and local pilot proof after successful `CloseImplementationBubble` return | no; it is entered only after the existing close route returns settled success |

Route-surface rule:

1. the names above are stable routing labels and workflow targets only
2. they do not authorize this top-level skill to inline downstream workflow bodies
3. successor tasks may implement their internals, but they must not silently rename or reinterpret the route surfaces
4. `HandleDocumentBubble` and `HandleImplementationBubble` are backing workflows, not `target_workflow_surface` values returned by `ResolvePlanState`
5. raw Pairflow lifecycle truth is never classified directly by this top-level skill; repo-local bubble handlers own that read-path and then delegate into `UsePairflow`
6. naming convention is deliberate:
   - `target_workflow_surface` names stay in PascalCase
   - `route_class` values returned by `ResolvePlanState` stay in snake_case
   - example: `route_class=troubleshoot_bubble` targets `TroubleshootBubble`

## Orchestrator Execution Style

### 1. Resolve before acting

Before every meaningful action:

1. read sequencing truth from plan metadata
2. read detailed local execution truth from task metadata
3. use persisted bubble linkage only to identify which repo-local bubble handler owns the next bubble-side read/decision
4. consume only normalized bubble outputs at the top level; raw Pairflow lifecycle truth is read inside `HandleDocumentBubble` or `HandleImplementationBubble`, not here
5. apply deterministic precedence only inside the declared metadata authority split
6. route to `FixPlanMetadata` or `HumanCheckpoint` instead of guessing when the contract does not close the ambiguity

### 2. Drive until a real boundary

Default mode is `drive-until-blocked`.

One invocation should continue through obvious next steps until it reaches one of these boundaries:

1. a plan-settled boundary such as `PlanComplete`
2. a settled bubble boundary such as "bubble started" or "bubble handed to approval review"
3. `HumanCheckpoint`
4. a real blocker that requires explicit troubleshooting

Loop-bound rule:

1. `auto_continue` is allowed only while each delegated step returns materially new authoritative state for the next routing decision
2. if the same normalized route would repeat without a trustworthy state advance, the orchestrator must fail closed to a checkpoint or troubleshooting path instead of spinning

### 2a. Terminal vs settled completion

`ExecutePairflowPlan` distinguishes task-local terminal state from plan-level settled completion.

Definitions:

1. `done` means task execution is complete, but archive aftermath may still be pending.
2. `archived` means task execution is complete and the task artifact has moved to its canonical archive path.
3. `superseded` means executable identity was replaced; it is terminal for execution, but its archive/lineage aftermath must still be settled before plan completion.
4. `PlanComplete` is a settled plan boundary, not merely a task-execution boundary.
5. A completed plan is settled only after both its task artifacts and the plan artifact itself are at their canonical archive paths.

Plan-completion rule:

1. a normal completed task must be `archived` before `PlanComplete`
2. a task left as `done` at a live task path is not settled enough for `PlanComplete`
3. the plan artifact must be archived to `plans/archive/plans/<created_on>-<live-plan-filename-stem>.md` before `PlanComplete`
4. the date used for task archive groups and archived plan filenames is the plan creation date, not the archive execution date
5. an existing `archive_group` date prefix may verify a known `created_on`, but it must not be used as the source for a missing `created_on`
6. when `created_on` is missing, derive it from explicit creation metadata or unambiguous committed first-added history before any archive move; if the only candidate is today's date, the archive execution date, body prose, or `archive_group`, fail closed
7. if archive settlement is deterministic, the next owner is the normal aftermath path, not direct completion
8. if archive settlement is not deterministic, stop at `HumanCheckpoint` with an explicit archive blocker
9. the only acceptable reason to report `done` after completion is as fail-closed evidence that task work finished but archive settlement did not

### 3. Fresh-context downstream execution

Downstream specialized workflows should run in fresh context by default.

Reasons:

1. orchestration state should not overload plan/task/bubble review contexts
2. repeated review/refinement loops should stay as unbiased as practical
3. `ExecutePairflowPlan` should remain a router, not an all-in-one execution transcript

Practical rule:

1. keep only orchestration state in the top-level context
2. pass the minimum correct artifact context to the delegated workflow
3. prefer a fresh sub-agent execution whenever feasible

### 4. Continuation-mode policy

Continuation-mode classification is intentional across the full V1 route taxonomy:

1. `auto_continue`: `metadata_bootstrap`, `plan_review`, `task_create`, `task_review`, `document_bubble_close` only with `approval_gate_state=already_satisfied`, `implementation_bubble_close` only with `approval_gate_state=already_satisfied`, `normalized_replanning`
2. `stop_at_settled_checkpoint`: `document_bubble_create`, `implementation_bubble_create`, `plan_complete`
3. `stop_at_human_checkpoint`: `document_bubble_review`, `implementation_bubble_review`, `troubleshoot_bubble`, `human_checkpoint`

Policy notes:

1. `ReviewPlan` and `ReviewTask` remain `auto_continue` routes because their outputs can often be consumed mechanically inside the same artifact-refinement loop without crossing a human approval gate
2. `CreateTask` remains `auto_continue` because task creation extends the same plan/task artifact loop and usually leaves the orchestrator with enough trusted local state to continue directly into task review
3. `CreateDocumentBubble` and `CreateImplementationBubble` stop at a settled checkpoint because bubble creation hands control into the Pairflow lifecycle layer, where later review/close routing depends on successor-owned normalized bubble outputs rather than immediate top-level continuation
4. `ReviewDocumentBubble` and `ReviewImplementationBubble` stop at a human checkpoint because they sit on the explicit bubble approval/rework gate that the current quality model keeps human-controlled
5. `document_bubble_close` and `implementation_bubble_close` may auto-continue only when `ResolvePlanState` returns them with `approval_gate_state=already_satisfied`; the top-level skill must never infer approval from raw Pairflow state
6. after successful `implementation_bubble_close`, the next same-run owner is repo-local `UpdateProgress`; only the refreshed aftermath result may then rerun `ResolvePlanState`, stop at `PlanComplete`, or fail closed to `HumanCheckpoint`
7. `normalized_replanning` remains `auto_continue` because it hands control to repo-local `HandleNormalizedReplan` follow-through while preserving the normalized source scope rather than dropping back to heuristic routing

See `Workflows/ResolvePlanState.md` for the canonical per-route output fields, including `route_scope`, `source_scope`, `approval_gate_state`, and the full `Auto-Continue vs Checkpoint Rules`.

### 5. Fail closed across authority boundaries

Allowed same-authority resolution:

1. plan sequencing fields remain plan authority
2. task-local status remains task authority
3. bubble lifecycle remains Pairflow authority, but raw lifecycle interpretation is consumed only inside the repo-local bubble handlers

Fail-closed cases:

1. missing required plan metadata
2. cross-authority disagreement with no declared precedence rule
3. blocked-state semantics that would widen the approved V1 contract
4. raw bubble detail that has not yet been normalized into a route class
5. route ownership ambiguity between this shell and successor tasks

## V1 Routing Boundaries

This skill preserves the following V1 boundaries:

1. local-only execution scope
2. incremental next-task creation rather than generating the full task tree upfront
3. mandatory plan/task review gates before execution
4. separate document-refinement and implementation bubbles
5. normalized replanning as an explicit route surface, not a generic failure bucket

Out-of-scope route ownership remains explicit:

1. Task 3 owns raw bubble lifecycle interpretation inside `HandleDocumentBubble` and `HandleImplementationBubble`, then maps it into the normalized route taxonomy
2. Task 4 ownership is encoded in repo-local `HandleNormalizedReplan`, which owns plan/task follow-through after review loops or normalized replanning signals
3. Task 5 ownership is encoded in repo-local `UpdateProgress`, which owns normal progress reconciliation, canonical archive aftermath, and local pilot evidence after successful implementation close
