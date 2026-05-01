---
artifact_type: task
artifact_id: task_local_plan_watch_watch_loop_v1
task_family_id: watch-loop
sequence_key: "3"
task_id: 3-watch-loop
title: "Local Plan Watch Loop"
status: approved
phase: phase3
target_files:
  - "src/v11/application/planWatch/planWatchLoop.ts"
  - "src/v11/application/planWatch/planWatchLoopContract.ts"
  - "src/v11/application/planWatch/planWatchLedger.ts"
  - "src/v11/application/planWatch/planWatchLedgerContract.ts"
  - "src/v11/defaults/planWatch/planWatchLoopDefaults.ts"
  - "src/cli/commands/plan/watch.ts"
  - "src/cli/index.ts"
  - "src/index.ts"
  - "tests/v11/application/planWatch/planWatchLoop.test.ts"
  - "tests/cli/planWatchCommand.test.ts"
prd_ref: null
plan_ref: plans/local-plan-watch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 3-watch-loop-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-01-local-plan-watch
---

# Task: Local Plan Watch Loop

## L0 - Policy

### Goal

Add a local foreground `plan watch` polling command that periodically resolves linked-bubble trigger evidence, persists dedupe/runner-result ledger entries, and invokes the configured local `ExecutePairflowPlan` runner when a linked bubble reaches the approval-ready gate.

### Domain / Control Model Summary

1. Business invariant: plan progression may be automated only from trustworthy local-control-plane evidence and must preserve Pairflow lifecycle authority, `ExecutePairflowPlan` routing authority, and human approval boundaries.
2. Control model: `linkedBubbleTriggerIndex` owns trigger evidence discovery, the watch loop owns polling/dedupe/runner invocation, the agent-runner bridge owns local agent process execution, and `ExecutePairflowPlan` owns route selection and downstream delegation.
3. Read-path rule: the watch loop may read the watched plan, tracker-linked task files through `resolveLinkedBubbleTriggerIndex`, exact linked-bubble status through an injected status port, and its own ledger file; it must not inspect chat history, bubble transcripts, or route internals to decide the next action.
4. Forbidden fallback: do not compute `ResolvePlanState` routes, infer bubble ids from filenames or bubble lists, treat stale/unavailable remote status as approval-ready, or downgrade automation into notification-only success outside dry-run/checkpoint/blocker behavior.
5. Allowed resolution path: exact trigger candidate identity may be mapped to a runner trigger context and ledger key using plan path, task id/path, bubble id/role, observed state, observed timestamp/status ref, and invocation id.
6. Missing-data rule: missing plan/task/status/ledger/runner configuration produces structured diagnostics or blocked runner results; it must not fabricate a trigger, repeatedly invoke the same trigger, or mark the watch iteration successful.
7. Phase boundary:
   - contract closure: owns watch-loop input/result/ledger contract now.
   - producer closure: consumes existing trigger-index evidence, does not replace it.
   - internal execution closure: owns foreground polling loop, interval handling, dedupe, and runner invocation.
   - workflow/orchestration closure: successor-owned by `ExecutePairflowPlan`; this task only launches it.
   - read-model closure: owns minimal CLI output and ledger read/write for the local process only.
   - activation closure: owns `plan watch` CLI registration and options.
   - cleanup/recovery closure: owns duplicate-action suppression and failed-run ledger recording; broader recovery/inbox UI remains successor/deferred.

### Plan Linkage

1. Parent plan gap closed: missing local trigger process and duplicate-invocation guard.
2. Depends on: `1-agent-runner-bridge` and `2-bubble-trigger-index`.
3. Unlocks / impacts successors: `4-pilot-docs` consumes command behavior, ledger evidence, and local-control-plane boundary.
4. Task-list impact: refines planned task `3-watch-loop`; no task is replaced or obsoleted.
5. Inherited validation / exit expectation: contributes to Done Definition 3, 4, 5, 6, and Validation Strategy 3, 4, 5, 6, and 7 from the parent plan; Validation Strategy 7 is pinned by L2 remote-boundary coverage for local-control-plane routed status only.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/UsePairflow/SKILL.md`
   - `plans/local-plan-watch-plan-v1.md`
   - `src/v11/application/planWatch/agentRunnerBridgeContract.ts`
   - `src/v11/application/planWatch/linkedBubbleTriggerIndexContract.ts`
   - `docs/remote-bubble-execution.md`
2. Canonical elements: `ExecutePairflowPlan` remains the only route authority; `READY_FOR_HUMAN_APPROVAL` and legacy `READY_FOR_APPROVAL` are trigger evidence only; local control plane is required in V1.
3. Guard elements: watch ledger dedupe keys, runner invocation ids, status freshness, runner result status, and dry-run mode.
4. Compat-only elements: human-readable CLI output and optional ledger summaries; these must not become route or lifecycle authority.
5. Forbidden reinterpretations: the watcher must not approve, close, start, merge, or rework bubbles; it must not emit route classes as its own decision; it must not treat a printed handoff as successful automation unless dry-run/checkpoint/blocker applies.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `agentRunnerBridge.ts`, `agentRunnerBridgeContract.ts`, `linkedBubbleTriggerIndex.ts`, `linkedBubbleTriggerIndexContract.ts`, `linkedBubbleTriggerIndexDefaults.ts`, `src/cli/index.ts`, `src/index.ts`, and existing planWatch tests.
2. Actual touched scope: activation/read-model plus coordination/dedupe and internal execution.
3. Mutation entrypoints in scope: local watch ledger writes only; no plan/task metadata mutation, no Pairflow lifecycle mutation, no bubble state writes.
4. Hidden scope ruled out: no full route resolver, no remote-only supervisor, no initial-run automation, no manual nudge command, no UI checkpoint inbox, no lifecycle command adapter beyond exact-id status lookup.
5. Branch inventory note: no trigger, trigger already seen, new trigger, stale status, status diagnostic, ledger unreadable, ledger write failure, runner config missing, runner blocked, runner human checkpoint, runner settled checkpoint, dry-run, interval default, configured interval, single-iteration test mode, shutdown/abort.
6. Why the declared task shape matches reality: the predecessor tasks already provide trigger evidence and runner execution; this slice wires them into a bounded foreground loop with persisted dedupe and no workflow authority expansion.
7. Candidate processing rule: each iteration must evaluate trigger-index output in tracker order and launch at most one non-duplicate candidate. A `maxTriggersPerIteration` option is out of scope for this task and must not be added silently.
8. Dedupe record lifecycle: a non-dry-run invocation must create or atomically reserve an attempt record with `recordState="reserved"` before launching the runner, then complete the same record with runner outcome and `recordState="completed"`; if the attempt cannot be reserved safely, the runner must not start.

### Authority Boundary Map

1. Authority producer: linked-bubble trigger index and agent-runner bridge produce canonical input/result surfaces before this task.
2. Stored authority: watch ledger entries under the local repo `.pairflow` runtime area record trigger evidence, invocation id, result status, and timestamps for duplicate suppression.
3. In-scope consumers: `plan watch` CLI and unit/integration tests for loop behavior.
4. Explicit out-of-scope consumers: `ExecutePairflowPlan` route selection, `UsePairflow` lifecycle mutation, UI surfaces, remote-only supervisors, and plan/task archive aftermath.
5. Export surfaces closed in this phase: yes, exported application API and CLI command surface for local watch execution.

### Baseline Preservation

1. Must-preserve behaviors: existing runner bridge result taxonomy, existing linked-bubble trigger evidence shape, existing bubble lifecycle state ownership, and current CLI command behavior outside the new `plan watch` command.
2. Allowed resolution paths: exact candidate-to-ledger key mapping and exact candidate-to-runner trigger context mapping.
3. Forbidden regression interpretations: do not tighten away legacy `READY_FOR_APPROVAL` trigger compatibility; do not turn trigger diagnostics into runner invocations; do not treat duplicate suppression as route approval.
4. Replacement proof required if removed: any removed branch from predecessor trigger/runner contracts needs equivalent tests and explicit task authorization.

### Success / Completion Proof Boundary

1. Current canonical success proof source: no watch loop exists.
2. Target canonical success proof source: a watch iteration result that records scanned trigger evidence, dedupe decision, runner invocation/result, and next wait/checkpoint/blocker status.
3. Current canonical completion proof source: N/A.
4. Target canonical completion proof source: persisted ledger entry for each attempted trigger and deterministic loop exit behavior in test/single-iteration mode.
5. Reused proof contract: `AgentRunnerBridgeResult.status` (`settled_checkpoint|human_checkpoint|blocked`) and `LinkedBubbleTriggerCandidate`.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: watch loop result fields, watch ledger records, and CLI output.
8. Mixed-truth surfaces allowed: CLI text may summarize runner results, but ledger/result typed fields remain authoritative for tests and dedupe.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_or_read_model`.
2. Secondary shape: `coordination_concurrency_hardening`, limited to persisted duplicate-action suppression.
3. Preconditions that must pass before side effects: plan path configured, runner command config available unless dry-run, trigger candidate current and approval-ready, candidate not already completed/attempted under same evidence key.
4. Side effects forbidden before preconditions pass: runner invocation and new ledger attempt writes for invalid/stale/missing trigger evidence; dry-run records are allowed only after a valid candidate and dedupe key are proven.
5. Invalid/precondition-failure behavior: diagnostics/blocker result with no runner invocation; ledger write failures block invocation when dedupe safety cannot be guaranteed.
6. Coordination primitives in scope: persisted dedupe keys keyed by plan path, task id/path, bubble id/role, observed state, and status evidence; no cross-process lock beyond atomic/serialized file write unless implementation proves it is needed.
7. Dry-run parity rule: dry-run may write an observation record for operator feedback, but a dry-run record must not suppress a later non-dry-run invocation for the same trigger evidence.

### In Scope

1. Define typed watch loop input, configuration, dependencies, iteration result, and ledger record contracts.
2. Implement a foreground polling loop with default interval of 60 seconds and configurable interval for tests/CLI.
3. Support a bounded single-iteration or max-iterations mode for deterministic tests.
4. Use `resolveLinkedBubbleTriggerIndex` for trigger discovery and do not duplicate its metadata parsing logic.
5. Map approval-ready trigger candidates into `AgentRunnerBridgeTriggerContext` without adding route classes.
6. Persist a local watch ledger to suppress duplicate runner invocations for the same trigger evidence.
7. Record runner invocation id, result status/reason, timestamps, changed artifacts/route ledger summary when present, and blocker/checkpoint outcomes.
8. Add CLI `plan watch <plan-path>` with `--repo`, `--interval-seconds`, `--once`, `--dry-run`, and runner command/config options aligned with existing CLI style.
9. Add tests for dedupe, interval, dry-run, runner invocation, human checkpoint/blocker handling, stale/unavailable remote status, multiple candidate single-launch behavior, and no route-decision output.

### Out of Scope

1. Native reimplementation of `ExecutePairflowPlan` routing.
2. Plan/task metadata mutation or archive aftermath.
3. Starting, approving, closing, committing, merging, deleting, or troubleshooting bubbles.
4. Remote-only control-plane or remote-only bubble creation/start.
5. UI checkpoint inbox, daemon/service mode, event-driven hooks, manual nudge/continue command, and initial-run automation before a linked bubble exists.
6. Configurable multi-trigger batching such as `maxTriggersPerIteration`; this task is single-launch-per-iteration only.
7. Automatic expiry, cancellation, or recovery mutation for reserved ledger records; interrupted reservations are surfaced as blocked for explicit operator recovery in a successor flow.

### Safety Defaults

1. Default interval is 60 seconds.
2. Default mode invokes the runner for new approval-ready trigger evidence; dry-run is explicit.
3. Duplicate evidence is skipped, not re-run.
4. Missing/stale status, missing runner config, and unsafe ledger persistence fail closed.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: internal TypeScript application API/result shape, CLI command/options, and local runtime ledger schema.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `11`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
   - canonical identity path: plan path -> trigger index candidate -> ledger evidence key -> runner invocation id/result.
   - competing identifiers or fallback identities: bubble list order, filename guesses, chat history, transcript prose, route class names, and stale remote clone state are forbidden.
11. Authority/source-of-truth note:
   - canonical source: linked trigger index for candidates, agent runner bridge for runner outcomes, watch ledger for dedupe.
   - forbidden secondary sources: operator memory, CLI text summaries, task prose, and raw bubble transcripts.
12. Closure-budget triage:
   - closure buckets touched: activation/read_model, coordination, internal_execution_consumers.
   - intentionally collapsed closures: polling, dedupe, and runner invocation are collapsed because the watch loop is the only local consumer of both predecessor contracts.
   - explicitly deferred closures: UI, event hooks, remote-only supervisor, manual nudge, and pilot docs.
13. Bounded-task-shape decision:
   - primary shape: activation_or_read_model.
   - secondary shape: coordination_concurrency_hardening.
   - why this bounded mix is safe: dedupe is inseparable from safe autonomous runner invocation and does not mutate lifecycle or route authority.
14. Contract-dense decision:
   - gate triggered: yes
   - trigger reasons: API/result shape, status taxonomy consumption, structured ledger payload, fallback/precedence, split ownership, downstream consumers, mirrored surfaces.
   - canonical matrix source: L1 `Canonical Contract Matrix`.
   - mirrored surfaces: L0 policy, L1 contract, fallback table, ledger schema, CLI contract, and tests.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Watch automation must preserve review gates and route authority. | Invoke `ExecutePairflowPlan`; do not inline lifecycle or route decisions. | P1 | required-now |
| Control model | Trigger index finds candidates, watch loop dedupes/invokes, runner bridge executes, `ExecutePairflowPlan` routes. | Keep dependency flow explicit and one-way. | P1 | required-now |
| Read-path rule | Read plan/task/status only through trigger-index dependency and ledger through watch-loop dependency. | Do not parse Pairflow transcripts or scan arbitrary bubbles. | P1 | required-now |
| Forbidden fallback | No route guessing, stale status promotion, notification-only success, or bubble id inference. | Diagnostics/blockers must stop invocation. | P1 | required-now |
| Allowed resolution path | Exact candidate evidence may derive ledger key and runner trigger context. | Use stable typed fields, not prose. | P1 | required-now |
| Missing-data rule | Missing config/status/ledger safety produces blocked or diagnostic result. | No runner invocation when dedupe cannot be trusted. | P1 | required-now |
| Phase boundary | Own local polling/dedupe/runner activation; successors own pilot docs/UI/event hooks. | Keep scope bounded to CLI/application API/tests. | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `ExecutePairflowPlan` route authority | skill route contract | Watcher launches, never routes. | preserve | P1 | required-now |
| `READY_FOR_HUMAN_APPROVAL` | UsePairflow + trigger index | Trigger evidence only. | preserve | P1 | required-now |
| Legacy `READY_FOR_APPROVAL` | trigger index | Compat trigger input. | preserve | P2 | required-now |
| `AgentRunnerBridgeResult.status` | runner bridge contract | Runner outcome taxonomy. | preserve as watch result input | P1 | required-now |
| Local control plane | remote bubble docs | V1 requires local control plane. | preserve | P1 | required-now |

### 0b) Canonical Contract Matrix

| Contract Surface | Owner | Required Fields / Values | Unknown or Missing Handling | This Task Owns | This Task Must Not Own |
|---|---|---|---|---|---|
| Watch input | watch loop | `repoPath`, `planPath`, `intervalMs`, `runnerConfig`, optional `once/maxIterations/dryRun/now`; no `maxTriggersPerIteration` in this task | invalid interval/config blocks before loop side effects | validation and typed API | route selection |
| Trigger candidate | trigger index | plan/task/bubble identity, role, observed state, optional timestamp/ref/metadata | diagnostics/no candidate means no runner | consume and map | metadata parsing semantics |
| Dedupe key | watch loop | repo-normalized plan path, task id/path, bubble id/role, observed state, and `statusRef` when present otherwise `observedAt` when present otherwise literal `no-status-ref` | if required identity fields cannot be built, block invocation | key derivation and persistence | lifecycle approval |
| Ledger record | watch loop | key, invocation id, trigger evidence, `mode`, `recordState`, `attemptedAt`, optional `completedAt`, `runnerStatus`, `runnerReasonCode`, changed artifacts, route ledger summary | unreadable/write failure blocks safe automation | local runtime record | global audit/telemetry |
| Runner trigger | watch loop -> runner bridge | `source="plan_watch"`, `reason="linked_bubble_approval_ready"`, `observedAt`, refs, metadata from candidate | missing runner config blocks unless dry-run | mapping only | runner result interpretation beyond bridge status |
| CLI result | CLI command | scan/invocation/checkpoint/blocker summary | text is secondary to typed result | render local output | route or lifecycle authority |

### 0c) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `AgentRunnerBridgeInput` | runner bridge tests, future watcher | additive-compatible | consume without modifying | N/A |
| `LinkedBubbleTriggerIndexResult` | trigger-index tests, future watcher | additive-compatible | consume without modifying | N/A |
| watch ledger schema | none yet | additive | introduce local schema and tests | UI/pilot docs later |
| CLI `plan watch` | none yet | additive | register command and help | docs in task 4 |

### 0d) Fallback / Failure Contract

| Case | Expected Result | Runner Invoked? | Ledger Written? | Priority |
|---|---|---|---|---|
| no candidates | idle iteration | no | no new attempt record | P1 |
| duplicate evidence | skipped duplicate | no | no new record; existing completed run record remains authoritative | P1 |
| stale/unavailable status | diagnostic iteration | no | no attempt record | P1 |
| ledger unreadable | blocked result with `blockedReasonKind="ledger_unreadable"` | no | no new record | P1 |
| ledger write unsafe | blocked result with `blockedReasonKind="ledger_write_failed"` | no | no partial successful record | P1 |
| dry-run new candidate | dry-run trigger report | no | dry-run record allowed | P2 |
| dry-run after completed run record | `status="duplicate_skipped"` report; dry-run must not create a second observation that obscures completed run authority | no | no new record | P2 |
| runner blocked | blocked result | yes | yes, with reason | P1 |
| runner human checkpoint | human checkpoint result | yes | yes | P1 |
| runner settled checkpoint | settled checkpoint result | yes | yes | P1 |
| multiple new candidates | first eligible candidate in tracker order is invoked; remaining candidates are reported as deferred | at most one by default | one attempt record for invoked candidate only | P1 |
| interrupted after reservation before completion | later iterations return blocked with `blockedReasonKind="interrupted_attempt_exists"`, not duplicate success or fresh invocation | no repeat without explicit recovery | existing incomplete record preserved | P1 |
| unknown ledger schema version | blocked result with `blockedReasonKind="ledger_schema_unsupported"` and a diagnostic naming the unsupported version | no | no new attempt record | P1 |

### 0e) CLI Contract

| Option / Argument | Rule | Priority |
|---|---|---|
| `plan watch <plan-path>` | required plan path; resolves repo from `--repo` or cwd | P1 |
| `--interval-seconds <n>` | default 60; positive finite integer/number only | P1 |
| `--once` | run one iteration and exit for tests/operators | P1 |
| `--dry-run` | discover and ledger/report without invoking runner | P2 |
| `--runner-command <cmd>` or existing repo config equivalent | supplies `AgentRunnerCommandConfig.command`; missing value blocks non-dry-run with `AGENT_RUNNER_CONFIG_MISSING` | P1 |
| `--runner-arg <arg>` or equivalent delimiter-safe args source | repeatable runner argument support when existing CLI style allows it | P2 |
| `--runner-input-mode stdin_json|arg_json` | maps to `AgentRunnerCommandConfig.inputMode`; default is `stdin_json` | P2 |
| dry-run runner config | `--dry-run` must not require runner command/config | P1 |
| output | summarize idle/triggered/checkpoint/blocked without pretending route ownership | P1 |

### 0f) Mirrored Surface Checklist

When the canonical matrix changes, update these surfaces in the same task revision:

1. L0 Domain / Control Model Summary.
2. L0 Precondition and Side-Effect Boundary.
3. L1 Canonical Contract Preservation.
4. L1 Canonical Contract Matrix.
5. L1 Shared Contract Compatibility.
6. L1 Fallback / Failure Contract.
7. L1 CLI Contract.
8. L1 Watch Loop Result Contract.
9. L1 Ledger Schema Contract.
10. L1 Runner Trigger Mapping.
11. L1 CLI Runner Option Contract.
12. L2 Acceptance Tests.
13. Any exported TypeScript contract names added under `planWatch`.

### 0g) Watch Loop Result Contract

| Result Field / Value | Rule | Priority |
|---|---|---|
| `status="idle"` | no approval-ready candidate was available; may include diagnostics from trigger index | P1 |
| `status="duplicate_skipped"` | candidate evidence matched an existing completed non-dry-run ledger record | P1 |
| `status="dry_run"` | valid new candidate was found and reported without runner invocation | P2 |
| `status="runner_settled_checkpoint"` | runner returned `settled_checkpoint`; loop exits in `--once` mode and otherwise may continue after the configured interval | P1 |
| `status="runner_human_checkpoint"` | runner returned `human_checkpoint`; foreground loop stops and reports the checkpoint unless a future explicit option changes this | P1 |
| `status="blocked"` | precondition, ledger safety, runner config, runner output, or runner execution failed closed; must include `blockedReasonKind` | P1 |
| `blockedReasonKind` | one of `precondition_failed`, `ledger_unreadable`, `ledger_write_failed`, `ledger_schema_unsupported`, `runner_config_missing`, `runner_blocked_outcome`, `runner_execution_failed`, `runner_output_invalid`, or `interrupted_attempt_exists` | P1 |
| `diagnostics` | carries trigger-index diagnostics and watch-loop diagnostics, but never route classes or lifecycle decisions | P1 |
| `selectedCandidate` | present only when a candidate drove duplicate, dry-run, or runner behavior | P1 |
| `deferredCandidateCount` | counts additional approval-ready candidates not launched in this iteration | P2 |
| `onceExit` | `--once` exits after exactly one iteration for every status, including runner checkpoint and blocked statuses | P1 |
| checkpoint continuation | without `--once`, `runner_human_checkpoint` stops the foreground loop, while `runner_settled_checkpoint` may continue polling after the configured interval | P1 |

### 0h) Ledger Schema Contract

The ledger may be stored as JSON or JSONL, but the typed record must preserve this minimum shape:

| Field | Rule | Priority |
|---|---|---|
| `schemaVersion` | fixed initial value `1`; missing, nonnumeric, or unsupported future versions must fail closed as `status="blocked"` with `blockedReasonKind="ledger_schema_unsupported"` and no runner invocation | P1 |
| `key` | deterministic dedupe key from L1 `Dedupe key`; at most one non-dry-run `mode="run"` record may exist per key, and in-iteration retry/finalization paths must update that reserved record rather than creating a second run record | P1 |
| `mode` | `run` or `dry_run`; only `run` records suppress later non-dry-run invocations | P1 |
| `recordState` | `reserved`, `completed`, or `dry_run_observed`; `reserved` means an invocation was safely claimed but no runner result exists yet, and it suppresses automatic duplicate launches until explicit recovery changes the record | P1 |
| `invocationId` | stable id generated before runner launch; dry-run may use a dry-run-prefixed id | P1 |
| `triggerEvidence` | exact candidate identity fields and optional status metadata/status ref | P1 |
| `attemptedAt` / `completedAt` | ISO timestamps; `completedAt` is optional until runner result is known | P1 |
| `runnerStatus` / `runnerReasonCode` | mirror `AgentRunnerBridgeResult` when `recordState="completed"`; absent while `recordState="reserved"` or `recordState="dry_run_observed"` | P1 |
| `changedArtifacts` / `routeLedgerSummary` | persisted when present in runner result; informational only | P2 |

Legal `mode` and `recordState` combinations:

| `mode` | `recordState` | Meaning | Runner fields |
|---|---|---|---|
| `run` | `reserved` | non-dry-run invocation claimed before process launch or completion | `runnerStatus` and `runnerReasonCode` absent |
| `run` | `completed` | non-dry-run invocation has a parsed `AgentRunnerBridgeResult` | `runnerStatus` and `runnerReasonCode` required |
| `dry_run` | `dry_run_observed` | valid dry-run observation for operator feedback | `runnerStatus` and `runnerReasonCode` absent |

All other combinations are invalid and must fail closed as `blockedReasonKind="ledger_schema_unsupported"` when read. This task does not mutate `reserved` records into cancel/expire/recover states; a reserved record remains automation-blocking until an explicit recovery workflow edits or removes it outside this watch loop.

Default file persistence must reserve and complete records with same-directory temporary file write plus atomic rename, or an equivalent injected ledger port with the same crash-safety contract. A failed reserve write blocks runner launch; a failed completion write returns `status="blocked"` with `blockedReasonKind="ledger_write_failed"` and preserves the runner outcome in the in-memory iteration result when available, but does not claim ledger completion.

### 0i) Runner Trigger Mapping

Map a selected `LinkedBubbleTriggerCandidate` into `AgentRunnerBridgeInput` as follows:

1. `planPath` and `repoPath` come from watch input after normal path resolution.
2. `invocationId` is generated by the watch loop before ledger reservation and must match the ledger record.
3. `trigger.source` is exactly `plan_watch`.
4. `trigger.reason` is exactly `linked_bubble_approval_ready`.
5. `trigger.observedAt` is candidate `observedAt` when present, otherwise the watch-loop clock time for the iteration.
   The watch-loop clock fallback is for runner payload context only; it must not be used in the dedupe key, which falls back from missing `statusRef` and missing candidate `observedAt` to literal `no-status-ref`.
6. `trigger.refs` includes `statusRef` when present and may include a structured task-path ref; it must not include chat/transcript refs.
7. `trigger.metadata` includes task id/path, bubble id/role, observed state, dedupe key, and candidate `statusMetadata` when present.
8. `trigger.metadata` must not include `route_class`, lifecycle mutation intent, approval decision, or inferred successor route.

### 0j) CLI Runner Option Contract

The CLI must expose runner configuration without hardcoding a specific agent binary:

1. Provide a runner command option such as `--runner-command <cmd>` or consume an existing repo config key if one is already established during implementation.
2. Provide repeatable or delimiter-safe runner args support, for example `--runner-arg <arg>` repeated, if the existing CLI option style supports it.
3. Provide `--runner-input-mode stdin_json|arg_json` only if needed to reach `AgentRunnerCommandConfig.inputMode`; default remains `stdin_json`.
4. Missing runner command blocks non-dry-run execution with `AGENT_RUNNER_CONFIG_MISSING` and `blockedReasonKind="runner_config_missing"`; it does not degrade to notification-only success.
5. Dry-run must not require runner command configuration.

## L2 - Acceptance Tests

| ID | Scenario | Expected Proof | Priority |
|---|---|---|---|
| T1 | no linked approval-ready candidates | one iteration returns `status="idle"`, no runner call, no `selectedCandidate` | P1 |
| T2 | new approval-ready candidate | runner bridge called once with `plan_watch` trigger context and a `recordState="completed"` run ledger record | P1 |
| T3 | same trigger evidence repeated | second iteration returns `status="duplicate_skipped"`, includes `selectedCandidate`, skips runner due ledger dedupe, and writes no new ledger record | P1 |
| T4 | runner returns `settled_checkpoint` | ledger records invocation/result and CLI reports settled checkpoint | P1 |
| T5 | runner returns `human_checkpoint` | ledger records result and loop stops/reports checkpoint according to config | P1 |
| T6 | runner returns `blocked` | ledger records blocker and loop reports `status="blocked"` with `blockedReasonKind="runner_blocked_outcome"` | P1 |
| T7 | stale/unavailable status diagnostic | no runner invocation and no successful attempt record | P1 |
| T8 | ledger write failure before invocation | no runner invocation; blocked result has `blockedReasonKind="ledger_write_failed"` and explains dedupe safety | P1 |
| T9 | interval handling | default is 60 seconds; configured short interval is honored in test dependency clock/sleeper | P1 |
| T10 | dry-run | candidate is reported without runner invocation, does not require runner command config, and records `recordState="dry_run_observed"` when ledgering dry-run observations | P2 |
| T11 | CLI parsing | `plan watch` accepts required options and rejects invalid intervals/config; missing non-dry-run runner command returns `AGENT_RUNNER_CONFIG_MISSING` and `blockedReasonKind="runner_config_missing"` through the blocked result; omitted `--runner-input-mode` defaults to `stdin_json` | P1 |
| T12 | route-authority guard | watch result/ledger does not introduce `route_class` or lifecycle mutation fields as decisions | P1 |
| T13 | multiple candidates | only the first eligible candidate in tracker order is invoked by default and `deferredCandidateCount` reports remaining candidates | P1 |
| T14 | dry-run does not consume real run | a dry-run record for a candidate does not suppress a later non-dry-run invocation for the same evidence, and the ledger contains both `mode="dry_run"` and `mode="run"` records for that key | P1 |
| T15 | incomplete reservation | an existing `recordState="reserved"` non-dry-run attempt prevents an automatic duplicate runner launch and reports `status="blocked"` with `blockedReasonKind="interrupted_attempt_exists"` | P1 |
| T16 | runner trigger mapping | runner input contains `source=plan_watch`, `reason=linked_bubble_approval_ready`, exact candidate identity metadata, candidate/clock `observedAt` fallback coverage, allowed refs only, no chat/transcript refs, and no route/lifecycle decision fields | P1 |
| T17 | unsupported ledger schema version | unknown or missing ledger `schemaVersion` returns `status="blocked"` with `blockedReasonKind="ledger_schema_unsupported"` and does not invoke the runner | P1 |
| T18 | dedupe key timestamp fallback | when `statusRef` and candidate `observedAt` are absent, repeated iterations use the same literal `no-status-ref` dedupe key even though runner `trigger.observedAt` uses the iteration clock | P1 |
| T19 | ledger timestamp shape | reserved/completed records use ISO `attemptedAt`/`completedAt`, and `completedAt` is absent while `recordState="reserved"` | P1 |
| T20 | ledger unreadable | unreadable/corrupt ledger returns `status="blocked"` with `blockedReasonKind="ledger_unreadable"` and does not invoke the runner | P1 |
| T21 | runner failure discriminators | spawn/timeout/non-zero process failures map to `runner_execution_failed`, invalid structured output maps to `runner_output_invalid`, and neither path creates route/lifecycle decisions | P1 |
| T22 | precondition discriminator | invalid plan path or missing required watch input returns `blockedReasonKind="precondition_failed"` before ledger reserve or runner invocation, with no `selectedCandidate` when no valid candidate drove the failure | P1 |
| T23 | legal ledger state matrix | tests accept only the three legal `mode`/`recordState` combinations and reject all other combinations with `ledger_schema_unsupported` | P1 |
| T24 | dry-run after completed run | a completed run record causes later dry-run for the same evidence to report `status="duplicate_skipped"` without creating a new dry-run record | P2 |
| T25 | dedupe key observedAt middle case | when `statusRef` is absent and candidate `observedAt` is present, repeated iterations use that candidate timestamp in the dedupe key and do not fall through to `no-status-ref` | P1 |
| T26 | once and checkpoint exit semantics | `--once` exits after one iteration for idle, duplicate, dry-run, settled checkpoint, human checkpoint, and blocked statuses; without `--once`, human checkpoint stops and settled checkpoint may continue polling | P1 |
| T27 | remote-boundary guard | mocked remote-routed status may produce trigger evidence only through the local status port; watcher must not create/start remote-only bubbles or read raw remote clone state | P1 |
| T28 | ledger atomicity | failed reserve write prevents runner invocation; failed completion write reports `blockedReasonKind="ledger_write_failed"` without claiming a completed ledger record | P1 |
| T29 | run-record cardinality | repeated/in-iteration retry paths never create more than one `mode="run"` record for the same key; finalization updates the reserved record in place | P1 |
| T30 | invocation id stability | the reserved and completed views of the same run ledger record keep the same `invocationId`, and runner input `invocationId` matches that ledger record | P1 |
| T31 | selectedCandidate absence | idle, ledger unreadable/schema-unsupported before candidate selection, and precondition failures without a valid candidate omit `selectedCandidate` | P1 |

## Implementation Notes

1. Prefer a small application API first, then a thin CLI adapter.
2. Use injected ports for sleep/time, ledger read/write, trigger index, and runner invocation so tests do not require real timers or agents.
3. Store ledger under `.pairflow/runtime/plan-watch/` unless existing runtime conventions point to a narrower local path during implementation.
4. If atomic ledger writes require a helper, keep it local to the plan-watch defaults/shared runtime area and test corrupt/missing file behavior.
5. The implementation may add adjacent helper files when they reduce complexity, but must keep exports explicit in `src/index.ts`.
