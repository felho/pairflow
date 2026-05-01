---
artifact_type: task
artifact_id: task_local_plan_watch_agent_runner_bridge_v1
task_family_id: agent-runner-bridge
sequence_key: "1"
task_id: 1-agent-runner-bridge
title: "Local Agent Runner Bridge"
status: archived
phase: phase1
target_files:
  - "src/v11/application/planWatch/agentRunnerBridge.ts"
  - "src/v11/application/planWatch/agentRunnerBridgeContract.ts"
  - "src/v11/application/planWatch/agentRunnerBridgeResult.ts"
  - "src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts"
  - "tests/v11/application/planWatch/agentRunnerBridge.test.ts"
prd_ref: null
plan_ref: plans/local-plan-watch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 1-agent-runner-bridge-doc
impl_bubble_id: 1-agent-runner-bridge-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-01-local-plan-watch
---

# Task: Local Agent Runner Bridge

## L0 - Policy

### Goal

Add the local application-layer bridge that can invoke a configured local agent workflow for `ExecutePairflowPlan` with a compact plan-continuation input packet, then capture and classify the settled runner result for later watcher use.

### Domain / Control Model Summary

1. Business invariant: plan continuation may be automated only by launching the existing `ExecutePairflowPlan` workflow; the bridge must not compute plan routes or inline downstream workflow behavior.
2. Control model: the runner bridge owns process invocation, compact input construction, invocation identity, timeout/cancellation handling, and result capture; `ExecutePairflowPlan` remains the orchestration authority.
3. Read-path rule: the bridge may read its explicit input values, local runner configuration, the target plan path, and the child process result stream it launched.
4. Forbidden fallback: do not derive the next action from chat history, filename order, watcher guesses, bubble raw lifecycle state, stale logs, or operator memory.
5. Allowed resolution path: deterministic same-run classification of the child process outcome into runner result statuses is allowed; route selection remains inside the invoked `ExecutePairflowPlan` continuation.
6. Missing-data rule: missing runner command, missing plan path, malformed runner output, timeout, spawn failure, or non-zero exit must return a blocker result with an explicit reason code and no success classification.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here
   - internal execution closure: owned here
   - workflow/orchestration closure: successor / invoked `ExecutePairflowPlan`
   - read-model closure: successor
   - activation closure: successor
   - cleanup/recovery closure: successor

### Plan Linkage

1. Parent plan gap closed: missing executable bridge between trigger detection and the existing orchestration skill.
2. Depends on: N/A.
3. Unlocks / impacts successors: `2-bubble-trigger-index`, `3-watch-loop`, and `4-pilot-docs` may consume the runner contract but must not reinterpret its output as route authority.
4. Task-list impact: refines planned task `1-agent-runner-bridge`; no task is replaced or obsoleted.
5. Inherited validation / exit expectation: contributes to Done Definition 1 and Validation Strategy 1 from the parent plan.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `plans/local-plan-watch-plan-v1.md`
   - `docs/remote-bubble-execution.md`
2. Canonical elements: `ExecutePairflowPlan` owns route selection/delegation; `Plan = sequencing authority`; `Task = detailed local execution authority`; `Pairflow = bubble lifecycle authority`; runner result status is invocation outcome, not route truth.
3. Guard elements: runner command availability, plan-path existence, timeout, exit code, and output schema checks.
4. Compat-only elements: optional human-readable stdout/stderr snippets and raw child output retained for diagnostics.
5. Forbidden reinterpretations: no CLI-side `ResolvePlanState` clone, no watcher trigger semantics, no bubble lifecycle classification, no dry-run notification treated as successful automation.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `src/cli/index.ts`, `src/cli/commands/bubble/watchdog.ts`, `src/v11/application/status/statusCliCommand.ts`, `src/v11/infrastructure/executor/validation/passValidationCommandRunner.ts`, and existing CLI tests under `tests/cli`.
2. Actual touched scope: authority producer plus shared contract foundation for later watcher consumers.
3. Mutation entrypoints in scope: no repo or Pairflow lifecycle mutation entrypoint; spawning a configured local child process and writing/returning runner result data is in scope.
4. Hidden scope ruled out: this task does not add `plan watch`, linked-bubble discovery, dedupe ledger persistence, bubble status polling, or lifecycle mutation commands.
5. Branch inventory note: fresh invocation, configured runner missing, invalid plan path, spawn failure, timeout, non-zero exit, malformed/unknown output, settled checkpoint output, human checkpoint output, and blocker output.
6. Why the declared task shape matches reality: the bounded code path produces a runner contract consumed by later phases and does not activate watching or bubble routing.

### Authority Boundary Map

1. Authority producer: this task produces the local runner invocation/result contract.
2. Stored authority: no persistent watch ledger is introduced in this task; result objects may be returned to callers and optionally logged only as diagnostics.
3. In-scope consumers: direct application tests and later plan-watch application code as a typed consumer.
4. Explicit out-of-scope consumers: CLI `plan watch`, UI, linked-bubble trigger index, Pairflow lifecycle handlers, and archive/progress aftermath.
5. Export surfaces closed in this phase: yes, typed application exports for invoking and classifying the local agent runner.

### Baseline Preservation

1. Must-preserve behaviors: existing bubble, agent, repo, metrics, UI, status, and watchdog commands must remain unchanged.
2. Allowed resolution paths: existing command parsing and child-process helpers may be reused when the behavior remains equivalent.
3. Forbidden regression interpretations: do not route existing `agent emit/pass/ask-human/converged` through the new runner bridge.
4. Replacement proof required if removed: N/A; this is additive.

### Success / Completion Proof Boundary

1. Current canonical success proof source: N/A; no runner bridge exists.
2. Target canonical success proof source: a returned `AgentRunnerBridgeResult` with `status=settled_checkpoint|human_checkpoint|blocked`, an invocation id, timestamps, command metadata, and captured output summary.
3. Current canonical completion proof source: N/A.
4. Target canonical completion proof source: child process close/timeout/spawn failure plus schema/result classification.
5. Reused proof contract: N/A.
6. Proof-parity rule: no_reuse.
7. Final truth surfaces affected: new runner result contract only.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: contract_or_persisted_authority_foundation.
2. Secondary shape (if any): authority_producer, because the same bounded module produces the invocation result contract it defines.
3. Preconditions that must pass before side effects: runner command configured, plan path supplied, and invocation input valid.
4. Side effects forbidden before preconditions pass: child process spawn and any diagnostic write.
5. Invalid/precondition-failure behavior: zero child-process side effects and a structured blocker/error result.
6. Coordination primitives in scope: per-invocation timeout/cancellation only; no dedupe lock or watcher ledger.

### In Scope

1. Define a typed compact continuation input for invoking `ExecutePairflowPlan` with the watched plan path and caller-supplied trigger context fields; this bridge must not discover triggers or inspect bubble lifecycle state itself.
2. Define a local agent-runner command contract that supports a configured executable/args/env/cwd and deterministic input delivery.
3. Implement process invocation with stdout/stderr capture, timeout handling, cancellation cleanup, and spawn/non-zero-exit classification.
4. Classify settled runner outcomes into `settled_checkpoint`, `human_checkpoint`, or `blocked` from an explicit structured output envelope.
5. Return enough invocation metadata for later dedupe/audit consumers: invocation id, started/completed timestamps, command identity, exit code or failure stage, and reason code.
6. Add focused unit tests for compact input construction, successful settled result capture, human checkpoint capture, blocker capture, spawn failure, non-zero exit, timeout, malformed output, and missing config.

### Out of Scope

1. Adding the `plan watch` CLI command or polling loop.
2. Discovering linked bubbles or reading Pairflow bubble lifecycle state.
3. Persisting the watcher dedupe ledger.
4. Starting, approving, closing, committing, or merging bubbles.
5. Reimplementing `ResolvePlanState`, `CreatePairflowSpec`, or `UsePairflow` behavior in TypeScript.
6. Remote-only runner or remote-only control-plane execution.

### Safety Defaults

1. Fail closed to a blocker result when runner execution is unavailable, ambiguous, timed out, non-zero, or returns malformed structured output.
2. Never treat plain textual handoff output as successful automation unless the structured result explicitly says `human_checkpoint` or `blocked`.
3. Preserve raw output only for diagnostics; structured output is the only classification authority.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: internal TypeScript application API/result shape and local process-runner configuration contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `8`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
   - canonical identity path: invocation id generated by the bridge plus explicit `plan_path` in the compact input.
   - competing identifiers or fallback identities: bubble id, task filename, chat history, and watcher trigger labels are forbidden as runner identity substitutes.
11. Authority/source-of-truth note:
   - canonical source: structured runner output from the launched process plus process settlement facts.
   - forbidden secondary sources: unstructured stdout prose, stale logs, and inferred route names.
12. Closure-budget triage:
   - closure buckets touched: authority_producer, shared_contract, internal_execution_consumers.
   - intentionally collapsed closures: contract and producer are collapsed because the bridge cannot be useful without emitting the typed result it defines.
   - explicitly deferred closures: workflow orchestration consumers, read-model consumers, persisted watch ledger, cleanup/recovery, CLI activation.
13. Bounded-task-shape decision:
   - primary shape: contract_or_persisted_authority_foundation.
   - secondary shape: authority_producer.
   - why this bounded mix is safe: the same module owns invocation and result production, while watcher activation and lifecycle consumers are deferred.
14. Contract-dense decision:
   - gate triggered: yes
   - trigger reasons: API/result shape, status taxonomy, structured payload, fallback/precedence, split ownership, downstream consumers, mirrored surfaces.
   - canonical matrix source: L1 `Canonical Contract Matrix`.
   - mirrored surfaces: L0 goal/scope, L1 domain contract, data/interface contract, error/fallback contract, and test matrix.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | The bridge launches `ExecutePairflowPlan`; it does not decide routes. | TypeScript code must not emit route classes such as `CreateTask` or `CloseImplementationBubble` as its own decision. | P1 | required-now |
| Control model | Child process settlement plus structured output classify runner outcome. | Result classification must be centralized behind a typed parser/allowlist. | P1 | required-now |
| Read-path rule | Read only explicit input/config, target plan path existence, and child process output. | No Pairflow bubble status or task tracker interpretation in this task. | P1 | required-now |
| Forbidden fallback | No chat history, filename ordering, raw lifecycle state, stale logs, or operator memory. | Missing or malformed structured output becomes blocker, not inferred success. | P1 | required-now |
| Allowed resolution path | Process outcome classification may be deterministic; orchestration route selection stays in the invoked skill. | The result contract may carry child output but not route authority. | P1 | required-now |
| Missing-data rule | Missing config/path/output returns blocker. | Tests must cover every missing-data blocker branch. | P1 | required-now |
| Phase boundary | Contract and producer now; watcher, trigger index, dedupe, and lifecycle routing later. | Public exports must not contain watch-loop or bubble-discovery behavior. | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `ExecutePairflowPlan` route authority | `.claude/skills/ExecutePairflowPlan/SKILL.md` | Workflow route/delegation is owned by the skill, not CLI watcher code. | preserve | P1 | required-now |
| Plan/task authority split | `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md` | Plan metadata sequences; task metadata owns task-local status; Pairflow owns bubble lifecycle. | preserve | P1 | required-now |
| No full route resolver in watcher | `plans/local-plan-watch-plan-v1.md` | Watcher/runner surfaces must not reimplement `ResolvePlanState`. | preserve | P1 | required-now |
| Local control-plane boundary | `docs/remote-bubble-execution.md` | Remote bubbles may be observed/routed only through local control-plane behavior in V1. | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Existing CLI/application modules separate parse/render/run layers and unit-test command contracts. | New code should follow application/defaults/test patterns, not fold into `src/cli/index.ts` yet. | P2 | required-now |
| Actual touched scope | Additive application-layer contract plus process invocation. | No mutation of bubble lifecycle or plan metadata in implementation code. | P1 | required-now |
| Mutation entrypoints in scope | Child process spawn only. | Validate before spawn; timeout/cancel child on deadline. | P1 | required-now |
| Hidden scope ruled out | Watch-loop, trigger index, dedupe, and lifecycle handling are successor tasks. | Reject implementation that adds `plan watch` or bubble status reads here. | P1 | required-now |
| Branch inventory note | success, human checkpoint, blocked, spawn error, timeout, non-zero, malformed output, missing config. | Tests must cover each branch. | P1 | required-now |
| Shape proof | This task creates the runner producer needed before trigger/watch consumers can exist. | Parent task order remains valid. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Missing executable bridge to existing orchestration. | Provide `runExecutePairflowPlanContinuation` or equivalent application API. | P1 | required-now |
| Depends on | N/A | No predecessor assumptions. | P1 | required-now |
| Unlocks / impacts successors | `2-bubble-trigger-index`, `3-watch-loop`, `4-pilot-docs`. | Later tasks may consume result/status fields but must not widen them silently. | P1 | required-now |
| Task-list impact | Refines existing planned task only. | Keep task id and plan tracker unchanged except status/path updates. | P1 | required-now |
| Inherited validation / exit expectation | Unit-test runner invocation and result capture. | Required tests must use stubbed commands/process ports where possible. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `AgentRunnerBridgeInput` | none yet | additive | define typed input with explicit trigger context and plan path | watcher consumer alignment in task 3 |
| `AgentRunnerBridgeResult` | none yet | additive | define status/reason/output envelope | trigger index/watch ledger consumption later |
| runner command config | none yet | additive | define required command/args/env/cwd/timeout behavior | operator-facing config docs later |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Existing `pairflow agent` commands | preserve | CLI tests remain passing; no new routing through bridge. | P1 | required-now |
| Existing bubble status/list/watchdog commands | preserve | No imports from planWatch bridge into these surfaces. | P1 | required-now |
| Existing remote status cache semantics | preserve | Bridge does not read remote cache. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| runner result `status` | N/A | structured runner output plus process settlement | canonical | no | P1 | required-now |
| process `exitCode` / failure stage | N/A | child process event/error/timeout | guard | no | P1 | required-now |
| raw stdout/stderr | N/A | captured child streams | compat | yes, diagnostic only | P2 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|
| missing runner command | config has executable command | child spawn | return/throw structured blocker before spawn | P1 | required-now |
| missing plan path | plan path exists or explicit dependency says how to check | child spawn | blocker with `PLAN_PATH_UNAVAILABLE` or equivalent | P1 | required-now |
| timeout | deadline configured and enforced | orphan child process | terminate child and return blocker with timeout reason | P1 | required-now |
| malformed output | output parser validates allowed envelope | success classification | blocker with malformed-output reason | P1 | required-now |

### 0h) Canonical Contract Matrix

| Row | Contract Surface | Required Behavior | Owner Now | Successor-Owned / Forbidden Behavior | Required Tests |
|---|---|---|---|---|---|
| CM1 | compact continuation input | Contains plan path, invocation id, trigger source fields supplied by caller, and no route decision. | this task | watcher chooses trigger evidence later; route selection forbidden here | input construction test |
| CM2 | runner command config | Missing executable/config fails before spawn. | this task | global config UI/docs deferred | missing config test |
| CM3 | process invocation | Spawn configured local command with deterministic cwd/env/stdin or args payload. | this task | remote-only control plane forbidden | successful spawn test |
| CM4 | structured output parser | Accept only allowlisted statuses/reason fields and reject malformed/unknown payloads. | this task | unstructured prose success forbidden | malformed output test |
| CM5 | status taxonomy | `settled_checkpoint`, `human_checkpoint`, `blocked` are runner outcomes, not route classes. | this task | watcher dedupe and lifecycle decisions deferred | all status tests |
| CM6 | failure classification | spawn, timeout, non-zero, missing output, malformed output become blocker results/reason codes. | this task | silent downgrade to handoff text forbidden | failure branch tests |
| CM7 | diagnostic capture | stdout/stderr summaries may be retained but cannot classify success. | this task | persistent watch ledger deferred | raw output diagnostic test |

### 1) Call-Site Matrix

| Surface | Entry / File | Change | Priority | Timing |
|---|---|---|---|---|
| application runner API | `src/v11/application/planWatch/agentRunnerBridge.ts` | Add main invocation API. | P1 | required-now |
| typed contract | `src/v11/application/planWatch/agentRunnerBridgeContract.ts` | Define input/config/dependency/result types. | P1 | required-now |
| result parser | `src/v11/application/planWatch/agentRunnerBridgeResult.ts` | Parse and classify structured runner output. | P1 | required-now |
| defaults | `src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts` | Provide default process-spawn adapter. | P1 | required-now |
| tests | `tests/v11/application/planWatch/agentRunnerBridge.test.ts` | Cover contract and failure branches. | P1 | required-now |

### 2) Data and Interface Contract

| Interface / Data | Required Fields | Optional Fields | Behavior | Priority |
|---|---|---|---|---|
| `AgentRunnerBridgeInput` | `planPath`, `repoPath`, `invocationId`, `trigger` | `now`, `timeoutMs` | Builds compact continuation payload for `ExecutePairflowPlan`. | P1 |
| `AgentRunnerCommandConfig` | `command` | `args`, `cwd`, `env`, `timeoutMs`, `inputMode` | Missing `command` is invalid; args/env are additive. | P1 |
| `AgentRunnerBridgeResult` | `status`, `invocationId`, `startedAt`, `completedAt`, `reasonCode` | `exitCode`, `stdout`, `stderr`, `runnerSummary` | Status is allowlisted and must not be inferred from prose. | P1 |
| structured runner output | `status`, `reason_code` | `summary`, `changed_artifacts`, `route_ledger_summary` | Unknown status or malformed JSON is blocker. | P1 |

### 3) Side Effects Contract

| Side Effect | Allowed When | Forbidden When | Notes |
|---|---|---|---|
| spawn child process | input/config/path preconditions pass | preconditions fail | Use injectable dependency for tests. |
| write stdin / pass payload | child process accepted input | input mode unsupported | Payload must be deterministic and compact. |
| terminate child | timeout/cancellation | N/A | Avoid leaving a running local agent process after timeout. |
| persist watch ledger | never in this task | always | Deferred to `3-watch-loop`. |

### 4) Error and Fallback Contract

| Case | Result / Error | Reason Code | Priority | Test |
|---|---|---|---|---|
| missing runner command | blocker | `AGENT_RUNNER_CONFIG_MISSING` | P1 | required |
| plan path unavailable | blocker | `PLAN_PATH_UNAVAILABLE` | P1 | required |
| spawn error | blocker | `AGENT_RUNNER_SPAWN_FAILED` | P1 | required |
| timeout | blocker | `AGENT_RUNNER_TIMEOUT` | P1 | required |
| non-zero exit | blocker | `AGENT_RUNNER_NON_ZERO_EXIT` | P1 | required |
| malformed output | blocker | `AGENT_RUNNER_OUTPUT_INVALID` | P1 | required |
| explicit human checkpoint | human checkpoint | runner-provided reason | P1 | required |
| explicit settled checkpoint | settled checkpoint | runner-provided reason | P1 | required |

### 5) Dependency Constraints

| Dependency | Constraint | Failure Behavior | Priority |
|---|---|---|---|
| Node child process adapter | injectable port around `spawn` or equivalent | blocker on spawn/settle failure | P1 |
| filesystem plan-path check | injectable `stat`/existence port | blocker before spawn | P1 |
| clock/id generation | injectable for deterministic tests | no wall-clock-only assertions | P2 |
| runner executable | local command only | missing config blocker | P1 |

### 6) Test Matrix

| ID | Scenario | Expected Result | Priority | Timing |
|---|---|---|---|---|
| T1 | compact continuation payload contains plan path and no route class | payload accepted | P1 | required-now |
| T2 | runner returns structured `settled_checkpoint` | bridge result is `settled_checkpoint` | P1 | required-now |
| T3 | runner returns structured `human_checkpoint` | bridge result is `human_checkpoint` | P1 | required-now |
| T4 | runner returns structured `blocked` | bridge result is `blocked` | P1 | required-now |
| T5 | missing command config | blocker before spawn | P1 | required-now |
| T6 | missing plan path | blocker before spawn | P1 | required-now |
| T7 | spawn error | blocker with spawn reason | P1 | required-now |
| T8 | timeout | child terminated and blocker returned | P1 | required-now |
| T9 | non-zero exit | blocker, stdout prose ignored as success | P1 | required-now |
| T10 | malformed or unknown structured output | blocker with output-invalid reason | P1 | required-now |

## L2 - Implementation Notes

1. Prefer a small application module with dependency injection over adding a CLI command in this task.
2. Keep structured runner output newline-delimited or last-line JSON if that is the least invasive local runner contract; document the exact parser behavior in code/tests.
3. Later watcher tasks can wrap this module with persistence and polling, but should not modify the status taxonomy without updating this task contract or the parent plan.

## Assumptions

1. A local agent command can be configured by later implementation or local config without requiring a remote supervisor.
2. The first implementation can use test doubles for the child-process port rather than launching a real Codex/Claude process in unit tests.

## Open Questions

1. The exact operator-facing config key for the local agent command is deferred to implementation if an existing config surface is found; if no suitable config exists, add the narrowest local config type needed for this bridge.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Persist full runner transcripts for audit | watcher/ledger | P2 | later-hardening | parent plan dedupe/audit goals | Add with watch ledger in task 3 if needed. |
| HB2 | Add remote runner adapter | runtime | P3 | later-hardening | deferred remote-control-plane boundary | Keep out of V1 local bridge. |

## Finalization Summary

1. `contract_boundary_override`: `yes`, because this task introduces internal runner/result contracts consumed by later phases.
2. `complexity_risk`: `8`; single task allowed because activation, watch-loop, trigger index, and persistence are explicitly deferred.
3. `contract_dense`: `yes`; the canonical matrix is L1 section `0h` and controls the mirrored scope, error, interface, and test sections.
4. Inferred: target application module names, result taxonomy, and failure reason code names from the parent plan and existing repo structure.
5. Asked: no blocker questions; available plan/control context was sufficient.
6. Later-hardening remains limited to audit persistence and remote-runner support.

## Review Approval Provenance

1. Approved by delegated `ReviewSpec` task-mode pass during `ExecutePairflowPlan` execution.
2. Review decision: `approve_task`.
3. Evidence summary: execution metadata is deterministic, parent plan linkage matches `plans/local-plan-watch-plan-v1.md`, target scope is bounded to the local runner bridge contract/producer slice, and successor-owned trigger/watch/lifecycle behavior remains out of scope.
