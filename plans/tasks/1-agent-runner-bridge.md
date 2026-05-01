---
artifact_type: task
artifact_id: task_local_plan_watch_agent_runner_bridge_v1
task_family_id: agent-runner-bridge
sequence_key: "1"
task_id: 1-agent-runner-bridge
title: "Local Agent Runner Bridge"
status: approved
phase: phase1
target_files:
  - "src/v11/application/plan/agentRunnerBridge.ts"
  - "src/v11/application/plan/agentRunnerBridgeTypes.ts"
  - "src/v11/application/plan/agentRunnerBridgeDefaults.ts"
  - "src/index.ts"
  - "tests/plan/agentRunnerBridge.test.ts"
prd_ref: null
plan_ref: plans/local-plan-watch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 1-agent-runner-bridge-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-01-local-plan-watch
---

# Task: Local Agent Runner Bridge

## L0 - Policy

### Goal

Add a local application-layer bridge that can invoke an `ExecutePairflowPlan` continuation through a configured local agent command, pass a compact plan-continuation input packet, and return a structured runner result that later watcher code can persist and dedupe.

### Domain / Control Model Summary

1. Business invariant: the watcher may automate plan continuation only by launching the existing `ExecutePairflowPlan` orchestration surface, not by replacing its route selection or downstream delegation rules.
2. Control model: `ExecutePairflowPlan` owns orchestration decisions; this bridge owns only local process invocation, input packet construction, timeout/error classification, and captured result metadata.
3. Read-path rule: the bridge may read the plan path supplied by its caller, the repository root, and explicit runner configuration. It must not inspect linked bubble lifecycle state or compute next routes.
4. Forbidden fallback: do not derive next action from chat history, filename order, raw bubble status, or a hard-coded task route inside this bridge.
5. Allowed resolution path: deterministic path normalization and explicit command configuration resolution are allowed before invocation.
6. Missing-data rule: missing plan file, missing repo root, or missing runner command returns a fail-closed blocker result; it does not print a manual handoff as successful automation.
7. Phase boundary:
   - contract closure: owned here for bridge input/output types.
   - producer closure: owned here for local runner invocation and result capture.
   - internal execution closure: owned here for process spawn, timeout, exit-code, stdout, and stderr handling.
   - workflow/orchestration closure: successor; the bridge launches `ExecutePairflowPlan` but does not decide its route.
   - read-model closure: successor watcher task owns persisted trigger/runner ledger read models.
   - activation closure: successor watcher task owns long-running polling activation.
   - cleanup/recovery closure: successor pilot/docs task owns operational hardening beyond local process failure classification.

### Plan Linkage

1. Parent plan gap closed: missing executable bridge between trigger detection and the existing orchestration skill.
2. Depends on: N/A.
3. Unlocks / impacts successors: `2-bubble-trigger-index` can assume a callable continuation runner exists; `3-watch-loop` can invoke the bridge and persist its result.
4. Task-list impact: refines planned task `1-agent-runner-bridge`; no replacement or obsolescence.
5. Inherited validation / exit expectation: unit coverage for input packet construction, invocation id recording, settled checkpoint detection, blocker detection, and result capture.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `plans/local-plan-watch-plan-v1.md`
2. Canonical elements: `ExecutePairflowPlan`, route ledger ownership, plan metadata authority, task metadata authority, Pairflow lifecycle authority.
3. Guard elements: runner command configuration, invocation id, timeout, exit code, captured stdout/stderr, and structured result classification.
4. Compat-only elements: human-readable runner output is diagnostic only unless the configured runner returns a documented structured result envelope.
5. Forbidden reinterpretations: this task must not move `ResolvePlanState` route selection into CLI/application code, must not classify raw bubble lifecycle states, and must not treat textual handoff output as successful automation.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `src/index.ts`, `src/cli/index.ts`, existing `src/v11/application/**` command modules, and `package.json` scripts were inspected to confirm the current code has bubble/agent commands but no plan continuation bridge.
2. Actual touched scope: authority producer plus local execution contract foundation.
3. Mutation entrypoints in scope: no repository artifact mutation beyond optional evidence/log metadata returned to caller; process spawning is the only side effect.
4. Hidden scope ruled out: no plan watcher loop, bubble trigger index, bubble status interpretation, or Pairflow lifecycle mutation is in scope.
5. Branch inventory note: configured vs missing runner, valid vs missing plan path, zero vs non-zero exit, timeout, structured vs unstructured runner output.
6. Why the declared task shape matches reality: the task produces a bounded bridge API that later tasks consume; it does not activate polling or route execution itself.

### Authority Boundary Map

1. Authority producer: this task produces the bridge result envelope only.
2. Stored authority: no persistent store is introduced here; successor watcher ledger stores trigger/result records.
3. In-scope consumers: application-level tests and later watcher code.
4. Explicit out-of-scope consumers: CLI `plan watch`, linked-bubble trigger index, UI, remote-only supervisor, and bubble lifecycle handlers.
5. Export surfaces closed in this phase: yes, an application API exported from `src/index.ts` for invoking a continuation runner.

### Baseline Preservation

1. Must-preserve behaviors: existing `pairflow bubble *`, `pairflow agent emit`, and `ExecutePairflowPlan` skill routing remain authoritative and unchanged.
2. Allowed resolution paths: explicit runner config resolution and deterministic absolute path normalization.
3. Forbidden regression interpretations: do not make the bridge a hidden one-shot `plan continue` command or a route resolver.
4. Replacement proof required if removed: N/A.

### Success / Completion Proof Boundary

1. Current canonical success proof source: N/A; there is no existing bridge.
2. Target canonical success proof source: a structured bridge result with invocation id, started/completed timestamps, exit status, classification, stdout/stderr excerpts or structured payload reference, and runner command metadata.
3. Current canonical completion proof source: N/A.
4. Target canonical completion proof source: the child process exits or times out and the bridge returns a terminal result classification.
5. Reused proof contract: no_reuse.
6. Proof-parity rule: no_reuse.
7. Final truth surfaces affected: exported bridge result type only.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: authority_producer.
2. Secondary shape: contract_or_persisted_authority_foundation, limited to the bridge input/output type contract.
3. Preconditions that must pass before side effects: plan path exists, repo root resolves, and runner command configuration is present.
4. Side effects forbidden before preconditions pass: spawning the runner process.
5. Invalid/precondition-failure behavior: zero side effects and a blocker result.
6. Coordination primitives in scope: N/A.

### In Scope

1. Add typed bridge input/output contracts for plan continuation invocation.
2. Build the compact continuation input packet with repo path, plan path, trigger reason, optional trigger evidence id, and invocation id.
3. Invoke a configured local command through an injectable process runner.
4. Capture stdout/stderr, exit code, timeout, and result classification.
5. Export the bridge API for later watcher use.
6. Add focused tests for success, blocker, missing config, missing plan, non-zero exit, timeout, and compact input construction.

### Out of Scope

1. Implementing `plan watch`.
2. Linked-bubble discovery or approval-ready trigger detection.
3. Persisted watcher ledger or dedupe state.
4. Bubble lifecycle actions, route resolution, or raw Pairflow status interpretation.
5. Remote-only plan execution or remote-only bubble creation/start.
6. A manual one-shot `plan continue` CLI command.

### Safety Defaults

1. Fail closed with a structured blocker result when runner configuration or required inputs are missing.
2. Treat unstructured runner output as diagnostic text, not as route authority.
3. Do not report notification-only handoff text as successful automation.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: new internal TypeScript API/result contract exported for successor watcher tasks; no DB/API/event/auth/config contract is changed.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
    - canonical identity path: explicit plan path plus generated invocation id.
    - competing identifiers or fallback identities: bubble id, task id, chat session, or filename order must not replace plan path plus invocation id.
11. Authority/source-of-truth note:
    - canonical source: bridge result envelope for invocation outcome only; `ExecutePairflowPlan` remains source for orchestration result.
    - forbidden secondary sources: raw stdout prose as route truth, raw bubble state, chat history.
12. Closure-budget triage:
    - closure buckets touched: shared bridge contract, local execution producer, successor watcher consumer contract.
    - intentionally collapsed closures: type contract plus local runner producer, because both are the same bounded API.
    - explicitly deferred closures: trigger index, watcher ledger, polling activation, pilot docs.
13. Bounded-task-shape decision:
    - primary shape: authority_producer.
    - secondary shape: contract_or_persisted_authority_foundation.
    - why this bounded mix is safe: the bridge cannot mutate plan/bubble state directly and has a narrow process-runner boundary.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | continuation automation must go through `ExecutePairflowPlan` | bridge builds a runner input for the skill instead of computing routes | P1 | required-now |
| Control model | bridge controls local invocation only | no route taxonomy or bubble lifecycle interpretation in bridge code | P1 | required-now |
| Read-path rule | read explicit plan path, repo root, and runner config | no broad repo scan to infer next task or bubble state | P1 | required-now |
| Forbidden fallback | no chat history, filename order, raw bubble state, or stdout route parsing | classify only invocation outcome, not plan route | P1 | required-now |
| Allowed resolution path | absolute path normalization and explicit command config resolution | deterministic preflight before spawn | P1 | required-now |
| Missing-data rule | return blocker result and do not spawn | missing config/path never becomes notification-only success | P1 | required-now |
| Phase boundary | bridge only; trigger, ledger, polling, and lifecycle remain successors | keep task 1 small enough for direct tests | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `ExecutePairflowPlan` route authority | `.claude/skills/ExecutePairflowPlan/SKILL.md` | orchestration decisions remain in the skill | preserve | P1 | required-now |
| plan metadata authority | `Plan-Task-Metadata-Contract.md` | plan artifact owns sequencing | preserve | P1 | required-now |
| Pairflow lifecycle authority | `ResolvePlanState.md` and `HandleDocumentBubble.md` | raw bubble states are not bridge inputs for route selection | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | `src/index.ts`, `src/cli/index.ts`, application command modules | current repo has no plan bridge; new application module is narrowest scope | P1 | required-now |
| Actual touched scope | local execution producer and result contract | no polling or bubble read model work | P1 | required-now |
| Mutation entrypoints in scope | child process spawn only | no filesystem mutation except test fixtures/log capture abstractions | P1 | required-now |
| Hidden scope ruled out | watcher, trigger index, lifecycle mutation are excluded | successor tasks own those closures | P1 | required-now |
| Branch inventory note | missing config/path, success, non-zero exit, timeout | tests must cover all branches | P1 | required-now |
| Shape proof | bridge result API is consumed later by watcher | implementation can be unit-tested without live Pairflow bubbles | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | executable bridge to existing orchestration | add callable API, not watcher | P1 | required-now |
| Depends on | N/A | can implement first | P1 | required-now |
| Unlocks / impacts successors | tasks 2 and 3 | trigger index can stay read-only; watcher can call bridge | P1 | required-now |
| Task-list impact | refines `1-agent-runner-bridge` | update parent tracker only | P1 | required-now |
| Inherited validation / exit expectation | focused bridge tests | prove invocation/result behavior | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| exported `PlanContinuationRunner` API | none yet | additive | add new typed API | watcher consumption in task 3 |
| bridge result classification | none yet | additive | define `settled_checkpoint`, `human_checkpoint`, `blocked`, `failed` classifications | persisted ledger in task 3 |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `ExecutePairflowPlan` route delegation | preserve | bridge input names the skill and plan, not routes | P1 | required-now |
| existing bubble/agent commands | preserve | no CLI command behavior changes | P1 | required-now |
| manual handoff as success | forbid | tests cover unstructured output/non-zero exit classification | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| bridge invocation result | N/A | process exit/timeout plus parsed structured result when present | canonical | no | P1 | required-now |
| stdout/stderr excerpts | N/A | child process streams | compat | no | P2 | required-now |
| invocation id | N/A | generated or caller-supplied id | guard | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| missing runner command | config presence | child process spawn | blocker result, zero spawn | P1 | required-now |
| missing plan path | filesystem existence | child process spawn | blocker result, zero spawn | P1 | required-now |
| timeout | configured timeout duration | N/A after spawn | terminate child and return blocked/failed timeout result | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/plan/agentRunnerBridge.ts` | `runPlanContinuation` | `PlanContinuationRunnerInput -> Promise<PlanContinuationRunnerResult>` | new module | validates inputs, builds packet, invokes runner, classifies result | P1 | required-now | unit tests |
| CS2 | `src/v11/application/plan/agentRunnerBridgeDefaults.ts` | `createDefaultPlanContinuationRunner` | `PlanContinuationRunnerConfig -> PlanContinuationRunner` | new module | wires default process runner without watcher logic | P1 | required-now | unit tests with injected runner |
| CS3 | `src/index.ts` | export bridge API | TypeScript named exports | export section | successor tasks can import bridge | P1 | required-now | typecheck |
| CS4 | `tests/plan/agentRunnerBridge.test.ts` | Vitest suite | N/A | new test file | covers branch matrix | P1 | required-now | `pnpm exec vitest run tests/plan/agentRunnerBridge.test.ts` |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `PlanContinuationRunnerInput` | N/A | typed input | `repoPath`, `planPath`, `triggerKind` | `triggerEvidenceId`, `invocationId`, `now`, `timeoutMs` | additive | P1 | required-now |
| `PlanContinuationRunnerConfig` | N/A | typed config | `command`, `args` or command template, `skillName` | `env`, `cwd`, `timeoutMs`, `stdoutLimit`, `stderrLimit` | additive | P1 | required-now |
| `PlanContinuationRunnerResult` | N/A | typed output | `invocationId`, `status`, `startedAt`, `completedAt`, `command`, `planPath`, `repoPath` | `exitCode`, `signal`, `stdout`, `stderr`, `structuredResult`, `reasonCode` | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Process | spawn configured local runner command after preconditions | spawning when required inputs are missing | runner injectable for tests | P1 | required-now |
| Filesystem | read/validate plan file path | write watcher ledger or mutate plan/task/bubble artifacts | successor tasks persist result state | P1 | required-now |
| Network | N/A | direct remote supervisor calls | local command may do its own work after launch, but bridge does not add network behavior | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| missing runner command | config | result | no spawn | `PLAN_RUNNER_CONFIG_MISSING` | warn | P1 | required-now |
| missing plan path | filesystem | result | no spawn | `PLAN_RUNNER_PLAN_MISSING` | warn | P1 | required-now |
| non-zero exit | child process | result | capture exit metadata | `PLAN_RUNNER_EXIT_NONZERO` | warn | P1 | required-now |
| timeout | child process | result | terminate child and classify timeout | `PLAN_RUNNER_TIMEOUT` | warn | P1 | required-now |
| unparseable structured output | child stdout | result | preserve stdout as diagnostic; status falls back to exit classification | `PLAN_RUNNER_OUTPUT_UNSTRUCTURED` | info | P2 | required-now |

### 5) Dependency Constraints

1. Use Node standard process APIs or an injectable runner abstraction already consistent with local code style.
2. Do not add a new package dependency for process execution.
3. Keep the bridge under `src/v11/application/plan/**`; do not promote to shared unless a later multi-lane consumer proves it.
4. Do not introduce config-file schema changes in this task unless the bridge can remain usable through explicit in-memory config from the watcher.

### 6) Test Matrix

| ID | Scenario | Required Assertion | Priority | Timing |
|---|---|---|---|---|
| T1 | valid input and successful structured runner output | result includes invocation id, compact packet, `settled_checkpoint` or configured structured status | P1 | required-now |
| T2 | missing runner config | no spawn; blocker result with `PLAN_RUNNER_CONFIG_MISSING` | P1 | required-now |
| T3 | missing plan path | no spawn; blocker result with `PLAN_RUNNER_PLAN_MISSING` | P1 | required-now |
| T4 | non-zero runner exit | failed result captures exit code and stderr excerpt | P1 | required-now |
| T5 | timeout | timeout result and termination path are exercised with fake runner | P1 | required-now |
| T6 | unstructured success output | result does not invent route truth from prose | P1 | required-now |
| T7 | compact input packet | packet includes repo path, plan path, trigger kind/evidence, skill name, and invocation id only | P1 | required-now |

## L2 - Implementation Notes

1. Prefer a pure packet builder plus a thin runner wrapper so tests can assert the packet without spawning a real agent.
2. Treat future watcher persistence as a caller responsibility; the bridge result should be serializable but not written here.
3. A later task may add `plan watch` CLI wiring that resolves runner config from repo defaults, but this task should not expose a manual one-shot command.

## Assumptions

1. The local watcher can supply runner configuration explicitly in a later task without this task adding repository config schema.
2. The first bridge result taxonomy can be additive and narrow; future watcher code may persist a subset.

## Open Questions

1. None blocking for this bounded bridge slice.

## Hardening Backlog

1. Later-hardening: support a documented structured JSON result envelope from multiple local agent providers once the first watcher integration proves the minimum bridge contract.
