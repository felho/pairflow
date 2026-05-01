---
artifact_type: task
artifact_id: task_local_plan_watch_bubble_trigger_index_v1
task_family_id: bubble-trigger-index
sequence_key: "2"
task_id: 2-bubble-trigger-index
title: "Plan-Linked Bubble Trigger Index"
status: approved
phase: phase2
target_files:
  - "src/v11/application/planWatch/linkedBubbleTriggerIndex.ts"
  - "src/v11/application/planWatch/linkedBubbleTriggerIndexContract.ts"
  - "src/v11/defaults/planWatch/linkedBubbleTriggerIndexDefaults.ts"
  - "tests/v11/application/planWatch/linkedBubbleTriggerIndex.test.ts"
  - "src/index.ts"
prd_ref: null
plan_ref: plans/local-plan-watch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-01-local-plan-watch
---

# Task: Plan-Linked Bubble Trigger Index

## L0 - Policy

### Goal

Add the application-layer read path that discovers bubbles linked to a watched plan from plan/task metadata, reads their Pairflow status through an injected status port, and emits approval-ready trigger evidence for later watcher use without resolving the plan's next workflow route.

### Domain / Control Model Summary

1. Business invariant: the watcher may trigger continuation only from trustworthy linked-bubble evidence; it must not compute or approximate `ExecutePairflowPlan` routes.
2. Control model: plan metadata owns task sequencing and tracker paths, task metadata owns `doc_bubble_id` / `impl_bubble_id` linkage, Pairflow status owns bubble lifecycle state, and this task owns only the trigger-index projection over those sources.
3. Read-path rule: implementation may read the watched plan frontmatter, task frontmatter for tracker-linked task paths, and Pairflow status for persisted linked bubble ids through an explicit dependency port.
4. Forbidden fallback: do not infer bubble ids from filenames, chat history, operator memory, raw remote clone state, bubble list order, or task prose; do not emit route classes such as `CreateTask`, `CloseImplementationBubble`, or `HandleNormalizedReplan`.
5. Allowed resolution path: deterministic same-authority lookup is allowed from plan tracker `task_path` to task frontmatter linkage, and from persisted linkage to Pairflow status for that exact bubble id.
6. Missing-data rule: missing, unreadable, malformed, or contradictory metadata must produce a fail-closed diagnostic/no-trigger result for that source; missing Pairflow status must not be treated as approval-ready.
7. Phase boundary:
   - contract closure: owned here for linked-bubble trigger evidence types and status classification.
   - producer closure: owned here for producing trigger candidates from plan/task/status inputs.
   - internal execution closure: owned here only for read-path orchestration and status-port calls.
   - workflow/orchestration closure: successor; `ExecutePairflowPlan` remains the route authority.
   - read-model closure: successor watch loop consumes this projection and persists dedupe.
   - activation closure: successor `plan watch` command.
   - cleanup/recovery closure: successor; no ledger cleanup or lifecycle mutation here.

### Plan Linkage

1. Parent plan gap closed: missing trustworthy trigger source for automatic continuation after a linked bubble reaches the human approval gate.
2. Depends on: `1-agent-runner-bridge`.
3. Unlocks / impacts successors: `3-watch-loop` consumes trigger evidence and dedupe keys; `4-pilot-docs` documents the observed local-control-plane boundary.
4. Task-list impact: refines planned task `2-bubble-trigger-index`; no task is replaced or obsoleted.
5. Inherited validation / exit expectation: contributes to Done Definition 2 and Validation Strategy 2, 6, and 7 from the parent plan.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`
   - `.claude/skills/UsePairflow/SKILL.md`
   - `plans/local-plan-watch-plan-v1.md`
   - `docs/remote-bubble-execution.md`
2. Canonical elements: `Plan = sequencing authority`, `Task = detailed local execution authority`, `Pairflow = bubble lifecycle authority`, `READY_FOR_HUMAN_APPROVAL` is the canonical trigger state with `READY_FOR_APPROVAL` as legacy-compatible input only.
3. Guard elements: plan/task parse diagnostics, missing task paths, missing linkage, status-port errors, stale/unavailable remote status, and unsupported lifecycle states.
4. Compat-only elements: legacy `READY_FOR_APPROVAL` and optional human-readable status summaries; neither becomes a new route authority.
5. Forbidden reinterpretations: trigger evidence must not become route selection, bubble approval, close readiness, task implementability, or watcher dedupe persistence.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `src/v11/application/planWatch/agentRunnerBridge.ts`, `src/v11/application/planWatch/agentRunnerBridgeContract.ts`, `src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts`, `tests/v11/application/planWatch/agentRunnerBridge.test.ts`, and `src/index.ts`.
2. Actual touched scope: producer/read-model foundation for trigger evidence.
3. Mutation entrypoints in scope: N/A; this task must not mutate plan/task files, Pairflow lifecycle state, watch ledgers, or runner results.
4. Hidden scope ruled out: no `plan watch` CLI, no persisted dedupe ledger, no runner invocation, no lifecycle approve/rework/close, no full `ResolvePlanState` clone.
5. Branch inventory note: no task paths, missing task file, malformed plan frontmatter, malformed task frontmatter, no linked bubbles, local approval-ready bubble, legacy approval-ready bubble, non-approval lifecycle state, status read failure, remote unavailable/stale status.
6. Why the declared task shape matches reality: the first planWatch slice already exposes runner invocation; this slice produces the bounded trigger input that the later watcher can consume without widening workflow authority.

### Authority Boundary Map

1. Authority producer: plan/task frontmatter and Pairflow status already produce the canonical inputs; this task produces derived trigger evidence only.
2. Stored authority: none introduced here; trigger evidence is returned to callers and may be persisted only by successor watcher ledger work.
3. In-scope consumers: unit tests and later plan-watch application code as a typed consumer.
4. Explicit out-of-scope consumers: CLI `plan watch`, UI, persisted watch ledger, `ExecutePairflowPlan` route selection, `UsePairflow` lifecycle mutation, and archive/progress aftermath.
5. Export surfaces closed in this phase: yes, typed application exports for resolving linked-bubble trigger evidence.

### Baseline Preservation

1. Must-preserve behaviors: existing runner bridge exports and behavior remain unchanged; existing bubble status/list behavior remains the Pairflow lifecycle authority.
2. Allowed resolution paths: deterministic tracker path read and exact linked-bubble status lookup only.
3. Forbidden regression interpretations: do not weaken runner bridge blocker semantics, do not route existing bubble commands through the trigger index, and do not let a status read failure become a successful trigger.
4. Replacement proof required if removed: N/A; this is additive.

### Success / Completion Proof Boundary

1. Current canonical success proof source: N/A; no trigger index exists.
2. Target canonical success proof source: a typed trigger-index result that lists linked bubbles, approval-ready trigger candidates, and fail-closed diagnostics by source.
3. Current canonical completion proof source: N/A.
4. Target canonical completion proof source: successful metadata reads plus status-port settlement for every discovered linked bubble, with diagnostics for skipped sources.
5. Reused proof contract: Pairflow status state taxonomy from existing bubble status behavior.
6. Proof-parity rule: narrowed_here_with_proof.
7. Final truth surfaces affected: returned trigger evidence/result types only.
8. Mixed-truth surfaces allowed: compat-only legacy approval state label and diagnostics; route truth remains external.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: contract_or_persisted_authority_foundation.
2. Secondary shape (if any): activation_or_read_model, limited to an in-memory read projection with no persistence.
3. Preconditions that must pass before side effects: N/A; no side effects are allowed.
4. Side effects forbidden before preconditions pass: child process spawn, lifecycle commands, file writes, watch ledger writes, runner invocation.
5. Invalid/precondition-failure behavior: zero side effects with structured diagnostics and no approval-ready trigger.
6. Coordination primitives in scope: N/A; dedupe/idempotency is successor watcher work.

### In Scope

1. Define typed plan-linked bubble trigger index input, result, trigger candidate, source diagnostic, and status-port contracts.
2. Parse the watched plan frontmatter enough to read `task_tracker` rows and canonical task paths without treating plan prose as authority.
3. Parse task frontmatter enough to read `task_id`, `doc_bubble_id`, and `impl_bubble_id` for tracker-linked task files.
4. Read Pairflow status only for exact persisted linked bubble ids through an injected dependency port.
5. Emit trigger candidates only when the linked bubble status is `READY_FOR_HUMAN_APPROVAL` or legacy `READY_FOR_APPROVAL`.
6. Include trigger evidence fields suitable for successor dedupe: plan path, task id, task path, bubble id, bubble role (`document|implementation`), observed state, observed timestamp when available, and status evidence/ref metadata when available.
7. Add focused unit tests for linked discovery, no-linked-bubble, malformed/missing metadata, local approval-ready state, legacy state, non-trigger states, status read failure, and remote unavailable/stale status.

### Out of Scope

1. Adding `plan watch` CLI or polling loop.
2. Persisting watcher dedupe/action ledgers.
3. Invoking `ExecutePairflowPlan` or the agent runner bridge.
4. Computing full route decisions or normalized bubble routes.
5. Starting, approving, closing, committing, merging, deleting, or troubleshooting bubbles.
6. Remote-only control-plane behavior or remote-only bubble creation/start.

### Safety Defaults

1. Fail closed to diagnostics and no trigger when metadata or status authority is unavailable.
2. Treat `READY_FOR_HUMAN_APPROVAL` and legacy `READY_FOR_APPROVAL` as trigger evidence only, not approval or close authorization.
3. Prefer explicit typed status fields over ad hoc stdout/string parsing; if a status adapter shells out, parsing belongs behind the dependency port.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: internal TypeScript application API/result shape and status-port contract for plan-watch trigger discovery.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `9`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
   - canonical identity path: plan `task_tracker.task_path` -> task `task_id` -> task `doc_bubble_id` / `impl_bubble_id` -> Pairflow status for that exact id.
   - competing identifiers or fallback identities: task filename guesses, bubble list order, branch names, chat history, and raw remote clone paths are forbidden.
11. Authority/source-of-truth note:
   - canonical source: plan/task frontmatter for linkage and Pairflow status for lifecycle state.
   - forbidden secondary sources: task prose, stale logs, operator memory, derived route names, and route-ledger summaries.
12. Closure-budget triage:
   - closure buckets touched: shared_contract, authority_projection, read_model_foundation.
   - intentionally collapsed closures: contract and projection are collapsed because the projection is the only producer of this typed evidence.
   - explicitly deferred closures: runner invocation, dedupe persistence, CLI activation, UI/read-model display, cleanup/recovery.
13. Bounded-task-shape decision:
   - primary shape: contract_or_persisted_authority_foundation.
   - secondary shape: activation_or_read_model.
   - why this bounded mix is safe: the implementation is read-only and returns typed evidence; all mutation and autonomous execution remain in successors.
14. Contract-dense decision:
   - gate triggered: yes
   - trigger reasons: API/result shape, status taxonomy, structured payload, fallback/precedence, split ownership, downstream consumers, mirrored surfaces.
   - canonical matrix source: L1 `Canonical Contract Matrix`.
   - mirrored surfaces: L0 goal/scope, L1 domain contract, shared contract compatibility, fallback table, and test matrix.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Trigger discovery may help automation only when it preserves existing workflow authority. | Code must emit trigger evidence, not route decisions or lifecycle actions. | P1 | required-now |
| Control model | Plan/task metadata own linkage; Pairflow status owns lifecycle state. | The index must join these authorities without promoting one into the other's role. | P1 | required-now |
| Read-path rule | Read plan tracker, task frontmatter linkage, and exact linked-bubble status. | Do not scan arbitrary bubbles or infer ids from names. | P1 | required-now |
| Forbidden fallback | No prose, chat history, branch names, bubble list order, or stale remote clone state. | Missing/malformed data becomes diagnostic/no-trigger. | P1 | required-now |
| Allowed resolution path | Deterministic same-authority tracker-to-task-to-linkage lookup is allowed. | Use explicit paths and persisted ids only. | P1 | required-now |
| Missing-data rule | Missing metadata/status fails closed per source. | Result must preserve diagnostics without fabricating trigger candidates. | P1 | required-now |
| Phase boundary | This task owns read-only trigger projection; successors own dedupe, runner execution, and CLI activation. | No persistence, no polling loop, no runner call. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Plan/task authority split | `Plan-Task-Metadata-Contract.md` | Plan sequences, task stores linkage, Pairflow stores lifecycle. | preserve | P1 | required-now |
| `READY_FOR_HUMAN_APPROVAL` | `UsePairflow/SKILL.md` | Human-gate state that may trigger continuation review/close handling later. | preserve as trigger-only evidence | P1 | required-now |
| Legacy `READY_FOR_APPROVAL` | `UsePairflow/SKILL.md` | Compatibility alias for approval-ready state. | accept as compat input, normalize as trigger evidence | P2 | required-now |
| `ExecutePairflowPlan` route authority | `ExecutePairflowPlan/SKILL.md` | Route selection and route ledger remain outside CLI/watch code. | preserve | P1 | required-now |
| Local control-plane boundary | `docs/remote-bubble-execution.md` | Remote bubbles are observed/routed through local control plane in V1. | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Existing `planWatch` modules are application-layer typed APIs exported from `src/index.ts`. | Add sibling typed module and tests; do not fold into CLI yet. | P2 | required-now |
| Actual touched scope | Read-only projection plus contract types. | No mutation dependencies should appear in the module contract. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | Tests should assert no runner/lifecycle dependency is required for trigger discovery. | P1 | required-now |
| Hidden scope ruled out | Watch loop, dedupe ledger, runner invocation, and lifecycle routing are successor scopes. | Reject implementation that persists actions or calls runner bridge. | P1 | required-now |
| Branch inventory note | Linked, unlinked, malformed, approval-ready, legacy-ready, non-ready, unavailable. | Tests must cover every branch family. | P1 | required-now |
| Shape proof | This is the producer consumed by the later watcher loop. | Keep API sufficient for successor dedupe but not responsible for dedupe. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Missing trustworthy trigger source for approval-ready linked bubbles. | Return exact linked-bubble trigger evidence. | P1 | required-now |
| Depends on | `1-agent-runner-bridge`. | Use runner trigger context compatibility but do not invoke it. | P1 | required-now |
| Unlocks / impacts successors | `3-watch-loop`, `4-pilot-docs`. | Provide dedupe-ready evidence fields and diagnostics. | P1 | required-now |
| Task-list impact | Refines `2-bubble-trigger-index`. | Keep task identity/path aligned with parent plan. | P1 | required-now |
| Inherited validation / exit expectation | Validation Strategy 2, 6, 7. | Unit tests must prove no full route decisions are emitted. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `LinkedBubbleTriggerIndexInput` | none yet | additive | define repo/plan path and dependency input | watcher CLI in task 3 |
| `LinkedBubbleTriggerIndexResult` | none yet | additive | define candidates, linked bubbles, diagnostics | watcher ledger/dedupe in task 3 |
| status port | none yet | additive | define exact bubble-id status lookup contract | default shell adapter or CLI adapter alignment in task 3 if needed |
| runner trigger metadata | agent runner bridge | additive-compatible | shape evidence so successor can map it into `AgentRunnerBridgeTriggerContext` | runner invocation in task 3 |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Agent runner bridge | preserve | Existing `agentRunnerBridge.test.ts` remains passing. | P1 | required-now |
| Bubble status lifecycle authority | preserve | Trigger index consumes injected status result only. | P1 | required-now |
| ExecutePairflowPlan route ownership | preserve | No route class output fields in trigger result. | P1 | required-now |
| Remote local-control-plane boundary | preserve | Remote unavailable/stale status is diagnostic/no-trigger. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| linked bubble identity | N/A | task frontmatter `doc_bubble_id` / `impl_bubble_id` reached from plan tracker | canonical | no | P1 | required-now |
| trigger state | N/A | Pairflow status `state` from exact linked bubble id | canonical | legacy state compat only | P1 | required-now |
| diagnostics | N/A | parser/status-port failure facts | guard | yes, diagnostic only | P1 | required-now |
| dedupe key inputs | N/A | returned trigger evidence fields | compat for successor | yes, not persisted here | P2 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|
| missing plan path | reading plan metadata | status calls and any mutation | diagnostic/no-trigger | P1 | required-now |
| malformed plan metadata | task path reads | status calls and any mutation | diagnostic/no-trigger | P1 | required-now |
| missing task path/file | status calls for that task | lifecycle mutation | source diagnostic/no-trigger | P1 | required-now |
| missing bubble linkage | status calls for absent id | synthetic bubble id creation | skip with no trigger or informational diagnostic | P1 | required-now |
| status read failure | trigger classification | runner invocation | diagnostic/no-trigger for that bubble | P1 | required-now |

### 0h) Canonical Contract Matrix

| Row | Contract Surface | Required Behavior | Owner Now | Successor-Owned / Forbidden Behavior | Required Tests |
|---|---|---|---|---|---|
| CM1 | plan metadata read | Read tracker task paths and ids from frontmatter only. | this task | plan route resolution forbidden | malformed/missing plan tests |
| CM2 | task metadata read | Read `task_id`, `doc_bubble_id`, `impl_bubble_id` from frontmatter only. | this task | document completion inference forbidden | linked/unlinked task tests |
| CM3 | status port | Query exact linked bubble id and return lifecycle state plus optional evidence metadata. | this task defines port | lifecycle mutation forbidden | status failure and non-ready tests |
| CM4 | trigger candidate | Emit only for `READY_FOR_HUMAN_APPROVAL` or legacy `READY_FOR_APPROVAL`. | this task | approve/close/rework decisions forbidden | approval-ready and legacy tests |
| CM5 | diagnostics | Preserve source-specific fail-closed reasons. | this task | retry/dedupe persistence deferred | malformed/status unavailable tests |
| CM6 | successor handoff | Include enough fields for watcher dedupe and runner trigger context. | this task | ledger write and runner call deferred | result shape tests |

## L2 - Implementation Notes

### Expected Public Types

1. `LinkedBubbleTriggerIndexInput`
2. `LinkedBubbleTriggerIndexResult`
3. `LinkedBubbleTriggerCandidate`
4. `LinkedBubbleTriggerDiagnostic`
5. `LinkedBubbleStatusPort`
6. `LinkedBubbleStatusSnapshot`

### Expected Functions

1. `resolveLinkedBubbleTriggerIndex(input, dependencies)`
2. `isApprovalReadyBubbleState(state)`
3. Optional small parser helpers kept private unless tests justify export.

### Result Shape Requirements

1. `result.candidates` contains only approval-ready linked bubbles.
2. `result.linkedBubbles` may include non-ready linked bubbles for successor observability.
3. `result.diagnostics` records fail-closed misses without making the entire plan unreadable unless the plan itself cannot be parsed.
4. No field may be named `route_class`, `target_workflow_surface`, `approval_gate_state`, or `continuation_mode`; those belong to `ExecutePairflowPlan`.

### Validation Matrix

1. Plan with one task linked to a document bubble at `READY_FOR_HUMAN_APPROVAL` emits one document candidate.
2. Plan with one task linked to an implementation bubble at `READY_FOR_APPROVAL` emits one implementation candidate and marks the state as legacy-compatible.
3. Plan with linked bubble in `RUNNING`, `WAITING_HUMAN`, `META_REVIEW_RUNNING`, `APPROVED_FOR_COMMIT`, or `DONE` emits no candidate.
4. Plan with no task paths or no bubble ids emits no candidate and no synthetic ids.
5. Missing or malformed plan frontmatter emits a plan diagnostic and no status calls.
6. Missing task file emits a task diagnostic and continues with other tracker rows when possible.
7. Malformed task frontmatter emits a task diagnostic and no status calls for that task.
8. Status-port failure emits a bubble diagnostic and no candidate for that bubble.
9. Remote unavailable/stale status from the port emits a diagnostic/no-trigger unless the status port supplies a current authoritative approval-ready state.
10. Result type/export test proves the module is available through `src/index.ts` without changing existing runner exports.

### Review Checklist

1. The implementation is read-only.
2. The implementation does not import or call the runner bridge.
3. The implementation does not import or call lifecycle mutation commands.
4. The implementation does not emit route-surface names.
5. The tests cover malformed metadata and status failure branches.

### Mirrored Surface Checklist

When any row in L1 `Canonical Contract Matrix` changes, update these surfaces in the same task refinement:

1. L0 `Domain / Control Model Summary`.
2. L0 `In Scope` / `Out of Scope`.
3. L0 `Safety Defaults`.
4. L1 `Domain / Control Contract`.
5. L1 `Shared Contract Compatibility`.
6. L1 `Precondition and Side-Effect Boundary`.
7. L2 `Result Shape Requirements`.
8. L2 `Validation Matrix`.
