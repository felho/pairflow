---
name: ExecutePairflowPlan
description: Orchestrate approved Pairflow plans through the next correct local workflow route until a settled checkpoint or real blocker is reached. USE WHEN execute a plan, continue plan-driven task progression, or determine the next delegated plan/task/bubble workflow.
---

# ExecutePairflowPlan

Execute a Pairflow plan as a state-aware orchestrator over existing specialized workflows.

Canonical metadata authority for the inputs named below lives in:

1. `references/Plan-Task-Metadata-Contract.md`

## Artifact Responsibilities

This skill owns only the top-level orchestration contract:

1. determine the next correct workflow route from plan metadata, task metadata, persisted bubble linkage, and Pairflow lifecycle authority
2. delegate the selected work to the correct specialized workflow surface
3. continue automatically only when the route contract allows it
4. stop cleanly at a settled checkpoint, real human checkpoint, or real blocker

This skill does not own:

1. plan/task workflow body text that belongs to `CreatePairflowSpec`
2. bubble lifecycle workflow body text that belongs to `UsePairflow`
3. raw bubble-detail interpretation or lifecycle-to-route classification
4. task supersede/archive execution
5. progress/archive aftermath behavior
6. remote execution support in V1

## Workflow Routing

`ExecutePairflowPlan` keeps the route surface inventory stable, but many surfaces are delegated rather than implemented locally.

| Workflow Surface | Role in This Skill | Owner / Backing Workflow |
|---|---|---|
| `FixPlanMetadata` | bootstrap or repair missing plan metadata before normal execution | repo-local `Workflows/FixPlanMetadata.md` |
| `ResolvePlanState` | assess current state and choose the next normalized route | repo-local `Workflows/ResolvePlanState.md` |
| `ReviewPlan` | review or refine plan-level readiness before task progression | `CreatePairflowSpec` `ReviewSpec` in `plan-mode` |
| `CreateTask` | create the next executable task from the plan | `CreatePairflowSpec` `CreateTask` |
| `ReviewTask` | review/refine the active task before bubble work | `CreatePairflowSpec` `ReviewSpec` in `task-mode` |
| `CreateDocumentBubble` | start the document-refinement bubble for the active task | `UsePairflow` `CreateBubble` |
| `ReviewDocumentBubble` | run deep review at the document-bubble approval gate | `UsePairflow` `ReviewBubble` |
| `CloseDocumentBubble` | approve/merge/clean the document-refinement bubble | `UsePairflow` `CloseBubble` |
| `CreateImplementationBubble` | start the implementation bubble for the active task | `UsePairflow` `CreateBubble` |
| `ReviewImplementationBubble` | run deep review at the implementation approval gate | `UsePairflow` `ReviewBubble` |
| `CloseImplementationBubble` | approve/merge/clean the implementation bubble | `UsePairflow` `CloseBubble` |
| `HandleNormalizedReplan` | consume a normalized replanning signal without reclassifying raw bubble detail | repo-local successor `ExecutePairflowPlan` follow-through workflow surface (Task 4, not yet implemented) |
| `TroubleshootBubble` | handle explicit bubble-runtime or lifecycle troubleshooting requests | `UsePairflow` troubleshooting surface; concrete workflow naming remains successor-owned |
| `HumanCheckpoint` | stop for ambiguity, contract refinement, or real operator judgment | explicit stop boundary, not an auto-run workflow |
| `PlanComplete` | stop after the plan reaches a complete terminal boundary | explicit stop boundary, not a downstream workflow |

Route-surface rule:

1. the names above are stable routing labels and workflow targets only
2. they do not authorize this top-level skill to inline downstream workflow bodies
3. successor tasks may implement their internals, but they must not silently rename or reinterpret the route surfaces
4. naming convention is deliberate:
   - `target_workflow_surface` names stay in PascalCase
   - `route_class` values returned by `ResolvePlanState` stay in snake_case
   - example: `route_class=troubleshoot_bubble` targets `TroubleshootBubble`

## Orchestrator Execution Style

### 1. Resolve before acting

Before every meaningful action:

1. read sequencing truth from plan metadata
2. read detailed local execution truth from task metadata
3. read bubble lifecycle truth from Pairflow, using persisted bubble linkage only to identify the relevant bubble
4. apply deterministic precedence only inside the declared metadata authority split
5. route to `FixPlanMetadata` or `HumanCheckpoint` instead of guessing when the contract does not close the ambiguity

### 2. Drive until a real boundary

Default mode is `drive-until-blocked`.

One invocation should continue through obvious next steps until it reaches one of these boundaries:

1. a plan-terminal boundary such as `PlanComplete`
2. a settled bubble boundary such as "bubble started" or "bubble handed to approval review"
3. `HumanCheckpoint`
4. a real blocker that requires explicit troubleshooting

Loop-bound rule:

1. `auto_continue` is allowed only while each delegated step returns materially new authoritative state for the next routing decision
2. if the same normalized route would repeat without a trustworthy state advance, the orchestrator must fail closed to a checkpoint or troubleshooting path instead of spinning

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

Continuation-mode classification is intentional across the full V1 route inventory:

1. `auto_continue`: `FixPlanMetadata`, `ReviewPlan`, `CreateTask`, `ReviewTask`, `CloseDocumentBubble` only with `approval_gate_state=already_satisfied`, `CloseImplementationBubble` only with `approval_gate_state=already_satisfied`, `HandleNormalizedReplan`
2. `stop_at_settled_checkpoint`: `CreateDocumentBubble`, `CreateImplementationBubble`, `PlanComplete`
3. `stop_at_human_checkpoint`: `ReviewDocumentBubble`, `ReviewImplementationBubble`, `TroubleshootBubble`, `HumanCheckpoint`

Policy notes:

1. `ReviewPlan` and `ReviewTask` remain `auto_continue` routes because their outputs can often be consumed mechanically inside the same artifact-refinement loop without crossing a human approval gate
2. `CreateTask` remains `auto_continue` because task creation extends the same plan/task artifact loop and usually leaves the orchestrator with enough trusted local state to continue directly into task review
3. `CreateDocumentBubble` and `CreateImplementationBubble` stop at a settled checkpoint because bubble creation hands control into the Pairflow lifecycle layer, where later review/close routing depends on successor-owned normalized bubble outputs rather than immediate top-level continuation
4. `ReviewDocumentBubble` and `ReviewImplementationBubble` stop at a human checkpoint because they sit on the explicit bubble approval/rework gate that the current quality model keeps human-controlled
5. `CloseDocumentBubble` and `CloseImplementationBubble` may auto-continue only when `ResolvePlanState` returns them with `approval_gate_state=already_satisfied`; the top-level skill must never infer approval from raw Pairflow state
6. `HandleNormalizedReplan` remains `auto_continue` because it hands control to successor-owned plan/task follow-through while preserving the normalized source scope rather than dropping back to heuristic routing

See `Workflows/ResolvePlanState.md` for the canonical per-route output fields, including `route_scope`, `source_scope`, `approval_gate_state`, and the full `Auto-Continue vs Checkpoint Rules`.

### 5. Fail closed across authority boundaries

Allowed same-authority resolution:

1. plan sequencing fields remain plan authority
2. task-local status remains task authority
3. bubble lifecycle remains Pairflow authority

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

1. Task 3 owns raw bubble lifecycle interpretation and maps it into the normalized route taxonomy
2. Task 4 owns plan/task follow-through after review loops or normalized replanning signals
3. Task 5 owns progress reporting, archive aftermath, and local pilot hardening
