---
name: ExecutePairflowPlan
description: Orchestrate approved Pairflow plans through the next correct local workflow route, including post-close aftermath handoff, until a settled checkpoint or real blocker is reached. USE WHEN execute a plan, continue plan-driven task progression, or determine the next delegated plan/task/bubble workflow.
---

# ExecutePairflowPlan

Execute a Pairflow plan as a state-aware orchestrator over existing specialized workflows.

Canonical metadata authority for the inputs named below lives in:

1. `references/Plan-Task-Metadata-Contract.md`

Mandatory delegation and mutation gates live in:

1. `references/Delegation-Gates.md`

Read `references/Delegation-Gates.md` before the first route-caused mutation in
each invocation.

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

### Optional Pre-Kickoff Admin Route Contract

`ExecutePairflowPlan` owns route selection for any future workflow that uses an
ideation-created bubble as a bounded pre-kickoff admin container. This is a
route contract only; existing document and implementation bubble routes remain
valid until a successor task explicitly adopts the pattern for one route at a
time.

Baseline dependency:

1. `UsePairflow` remains the owner of the existing `create --ideation`,
   start/round-0 hold, `ideation.task_pending=true`, and kickoff primitives.
2. This skill may rely on those primitives, but it must not redefine ideation,
   rename mode flags, or move lifecycle ownership into `ExecutePairflowPlan`.
3. The optional route sequence is:
   `create --ideation -> start/round-0 hold -> bounded admin in bubble worktree -> commit -> publish to main -> verify -> kickoff`.

Admin scope:

1. allowed admin edits are bounded to plan/task/progress metadata and directly
   related docs or admin notes needed for the selected route
2. product/source implementation, runtime behavior changes, new Pairflow
   commands, and `UsePairflow` edits are forbidden during pre-kickoff admin
3. every successor task that adopts or extends this route must leave the skill
   operational after it lands; it must not make current routes depend on
   unimplemented future workflows

Publish proof:

1. future integrated routes must prove the bounded admin commit was published
   to `main` and then re-read refreshed metadata before kickoff
2. an unmerged bubble-worktree commit, transcript prose, operator memory, or
   stale pre-publish metadata is never proof that lifecycle-relevant admin state
   reached `main`
3. if proof of admin scope, commit identity, publish result, or refreshed
   postcondition is absent or ambiguous, the workflow must stop before kickoff
4. failed admin publish, partial publish, or unknown publish state must not be
   converted into kickoff by fallback reasoning

## Delegation Enforcement Contract

`ExecutePairflowPlan` is an orchestrator, not a substitute implementation of the
workflow surfaces it routes to.

Hard rules:

1. every route whose `target_workflow_surface` is owned by another workflow must be executed as a distinct delegated workflow step before the orchestrator may advance
2. reading a downstream workflow file and applying its rules locally does not count as executing that workflow
3. the orchestrator must not approve, refine, create, close, or troubleshoot artifacts by approximating the downstream workflow in its own context
4. each delegated workflow step must return a concrete result that can be recorded in the route ledger before `ResolvePlanState` is run again
5. if a delegated workflow cannot be executed in the required surface, stop at `HumanCheckpoint` or a real blocker instead of silently downgrading to inline reasoning
6. before any route-caused mutation or lifecycle command, apply `references/Delegation-Gates.md`

Mandatory route-to-delegation mapping:

| Route Surface | Required Delegated Execution | Minimum Result Needed Before Continuing |
|---|---|---|
| `FixPlanMetadata` | repo-local `Workflows/FixPlanMetadata.md` | repaired metadata or fail-closed checkpoint |
| `ReviewPlan` | `CreatePairflowSpec` `ReviewSpec` in `plan-mode` | `approve_plan`, `refine_plan`, `split_plan`, or `block_not_ready`; if `refine_plan` changes the plan, rerun `ReviewSpec` in fresh `plan-mode` context before any downstream route may advance |
| `CreateTask` | `CreatePairflowSpec` `CreateTask` | created/refined task path plus task metadata status |
| `ReviewTask` | `CreatePairflowSpec` `ReviewSpec` in `task-mode` | `approve_task`, `refine_task`, `route_back_to_plan`, or `block_not_ready`; if `refine_task` changes the task, rerun `ReviewSpec` in fresh `task-mode` context before any downstream route may advance |
| `CreateDocumentBubble` | repo-local `HandleDocumentBubble` delegating to `UsePairflow` `CreateBubble` | created/started document bubble id, persisted `doc_bubble_id` linkage, and boundary status |
| `ReviewDocumentBubble` | repo-local `HandleDocumentBubble` delegating to `UsePairflow` `ReviewBubble` | review result and human approval/rework checkpoint; skipped when the handler emits a close route from trusted multi-clean-meta-review auto-approval proof |
| `CloseDocumentBubble` | repo-local `HandleDocumentBubble` delegating to `UsePairflow` `CloseBubble` | close/merge result, including `merge_conflict_recovered` when CloseBubble safely resolved and retried a bounded merge conflict; bubble artifact deletion or explicit retained-bubble reason; and refreshed task status evidence proving `status=implementable` |
| `CreateImplementationBubble` | repo-local `HandleImplementationBubble` delegating to `UsePairflow` `CreateBubble` | created/started implementation bubble id, persisted `impl_bubble_id` linkage, `status=in_progress`, and boundary status |
| `ReviewImplementationBubble` | repo-local `HandleImplementationBubble` delegating to `UsePairflow` `ReviewBubble` | review result and human approval/rework checkpoint; skipped when the handler emits a close route from trusted multi-clean-meta-review auto-approval proof |
| `CloseImplementationBubble` | repo-local `HandleImplementationBubble` delegating to `UsePairflow` `CloseBubble` | close/merge result, including `merge_conflict_recovered` when CloseBubble safely resolved and retried a bounded merge conflict; plus bubble artifact deletion or explicit retained-bubble reason before `UpdateProgress` aftermath |
| `HandleNormalizedReplan` | repo-local `Workflows/HandleNormalizedReplan.md` | normalized replanning follow-through result |
| `TroubleshootBubble` | active bubble handler delegating to `UsePairflow` troubleshooting surface | troubleshooting result and explicit stop boundary |

Plan/task review gates:

1. `plan_review` is not satisfied by the orchestrator reading the plan and deciding it looks ready
2. `task_review` is not satisfied by the orchestrator creating a task with `status=approved`
3. `CreateTask` output may leave a task in `draft`, `under_review`, or another workflow-defined state; any transition to bubble-ready status must come from the delegated task review result or an explicitly delegated task-creation contract that says the task is already approved
4. no bubble route may be executed unless every upstream plan/task route in the current execution chain has a route-ledger entry with a delegated result
5. if a delegated `ReviewSpec` returns `refine_plan` or `refine_task` and the artifact is modified, the same review mode must be delegated again from a fresh context using the refreshed artifact before the route can be considered approved
6. a refinement loop is settled only by `approve_plan`, `approve_task`, `split_plan`, `route_back_to_plan`, `block_not_ready`, or a real blocker; the orchestrator must not treat its own post-edit inspection as a replacement for the repeated `ReviewSpec` result
7. for `ReviewPlan` and `ReviewTask`, sub-agent delegation is mandatory whenever the runtime supports it; if unavailable, the substitute must be an explicitly separate compact workflow step, not blended local reasoning
8. `status=approved` may be written or committed only after the route ledger contains `ReviewSpec task-mode decision=approve_task` for the latest task artifact

Fresh-context requirement:

1. downstream specialized workflows must run in fresh context whenever feasible
2. if the execution environment cannot spawn a fresh context, the orchestrator must still create a distinct workflow step with a compact input packet and a compact returned result
3. the returned result, not the orchestrator's private reasoning, is the authority for the next routing decision
4. every repeated `ReviewSpec` pass after a refinement must use a fresh context whenever feasible; if a fresh sub-agent is unavailable, create a distinct compact workflow step that rereads the refreshed artifact and returns a new explicit ReviewSpec decision

### Route Ledger

Maintain a route ledger during every invocation.

Before delegating a route, append:

```yaml
route_step: <number>
resolved_route:
  route_class: <route_class>
  target_workflow_surface: <target_workflow_surface>
  continuation_mode: <continuation_mode>
  reason_code: <reason_code>
delegation:
  required_workflow: <workflow name>
  input_artifacts:
    - <path or id>
  delegated_execution_method: <subagent|separate_local_step|not_applicable>
  delegated_result: null
mutation_allowed: false
```

After the delegated workflow returns, update the same entry:

```yaml
delegation_result:
  status: <completed|checkpoint|blocked>
  decision: <workflow-specific decision>
  changed_artifacts:
    - <path or id>
  evidence_summary: <short factual summary>
next_resolution_allowed: <true|false>
mutation_allowed: <true|false>
```

Ledger rules:

1. a route with `continuation_mode=auto_continue` may continue only when `next_resolution_allowed=true`
2. if the same route repeats with no material new state recorded in the ledger, stop at `HumanCheckpoint` or troubleshooting
3. final reports must include the route ledger summary when any route was delegated
4. if a bubble lifecycle action is attempted without ledger proof of prior plan/task review gates, treat that as a workflow violation and stop
5. for `ReviewPlan` and `ReviewTask`, `next_resolution_allowed=true` after `refine_plan` or `refine_task` only authorizes rerunning the same ReviewSpec route from refreshed artifacts; it does not authorize task creation, bubble creation, or lifecycle actions
6. after a repeated ReviewSpec pass returns `approve_plan` or `approve_task`, the ledger entry must mention the latest reviewed artifact version or commit/evidence summary so downstream routing is tied to the approved content, not an older pre-refinement version
7. route-caused plan/task/progress metadata edits may not be committed while `mutation_allowed=false`
8. before committing route-caused metadata changes, cite the delegated workflow decision that authorized each staged mutation; if no decision exists, unstage or stop at `HumanCheckpoint`

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
2. a settled bubble boundary such as "bubble started with task linkage persisted" or "bubble handed to approval review"
3. `HumanCheckpoint`
4. a real blocker that requires explicit troubleshooting

Loop-bound rule:

1. `auto_continue` is allowed only while each delegated step returns materially new authoritative state for the next routing decision
2. if the same normalized route would repeat without a trustworthy state advance, the orchestrator must fail closed to a checkpoint or troubleshooting path instead of spinning
3. `drive-until-blocked` applies only after every upstream delegated gate in the current route chain has a concrete route-ledger result; delegated gates outrank continuation momentum

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

Downstream specialized workflows must run in fresh context whenever feasible.

Reasons:

1. orchestration state should not overload plan/task/bubble review contexts
2. repeated review/refinement loops should stay as unbiased as practical
3. `ExecutePairflowPlan` should remain a router, not an all-in-one execution transcript

Practical rule:

1. keep only orchestration state in the top-level context
2. pass the minimum correct artifact context to the delegated workflow
3. use a fresh sub-agent execution whenever the runtime supports it and the user has authorized delegated/sub-agent workflow execution
4. when fresh sub-agent execution is unavailable or not authorized, create a distinct local workflow step with a compact input packet and a compact returned result instead of blending the downstream workflow into orchestration reasoning
5. do not advance from `ReviewPlan`, `CreateTask`, `ReviewTask`, bubble handler, or aftermath routes without a route-ledger result from that distinct workflow step

### 4. Continuation-mode policy

Continuation-mode classification is intentional across the full V1 route taxonomy:

1. `auto_continue`: `metadata_bootstrap`, `plan_review`, `task_create`, `task_review`, `document_bubble_close` only with `approval_gate_state=already_satisfied`, `implementation_bubble_close` only with `approval_gate_state=already_satisfied`, `normalized_replanning`
2. `stop_at_settled_checkpoint`: `document_bubble_create`, `implementation_bubble_create`, `plan_complete`
3. `stop_at_human_checkpoint`: `document_bubble_review`, `implementation_bubble_review`, `troubleshoot_bubble`, `human_checkpoint`

Policy notes:

1. `ReviewPlan` and `ReviewTask` remain `auto_continue` routes because their outputs can often be consumed mechanically inside the same artifact-refinement loop without crossing a human approval gate
2. `CreateTask` remains `auto_continue` because task creation extends the same plan/task artifact loop and usually leaves the orchestrator with enough trusted local state to continue directly into task review
3. `CreateDocumentBubble` and `CreateImplementationBubble` stop at a settled checkpoint because bubble creation hands control into the Pairflow lifecycle layer after required task-metadata linkage/status postconditions are persisted; later review/close routing depends on successor-owned normalized bubble outputs rather than immediate top-level continuation
4. `ReviewDocumentBubble` and `ReviewImplementationBubble` stop at a human checkpoint when the bubble handler emits a review route; however, if the handler proves the bubble reached `READY_FOR_HUMAN_APPROVAL` with `reviewPolicy.meta_review_consecutive_clean_runs_required > 1` and `metaReview.consecutiveCleanRuns` meeting that threshold, it should emit the corresponding close route instead of a review route
5. `document_bubble_close` and `implementation_bubble_close` may auto-continue only when `ResolvePlanState` returns them with `approval_gate_state=already_satisfied`; the top-level skill must never infer approval from raw Pairflow state, but it may consume a bubble handler's normalized auto-approval proof as part of the close route
6. a close route is not settled merely because merge succeeded; the delegated close result must also prove bubble artifact deletion/cleanup or provide an explicit retained-bubble reason that is safe to carry forward
7. after successful `implementation_bubble_close`, the next same-run owner is repo-local `UpdateProgress`; only the refreshed aftermath result may then rerun `ResolvePlanState`, stop at `PlanComplete`, or fail closed to `HumanCheckpoint`
8. `normalized_replanning` remains `auto_continue` because it hands control to repo-local `HandleNormalizedReplan` follow-through while preserving the normalized source scope rather than dropping back to heuristic routing

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
