---
artifact_type: task
artifact_id: task_plan_watch_runner_idle_timeout
task_family_id: planwatch-runner-idle-timeout
sequence_key: "1"
task_id: 1-planwatch-runner-idle-timeout
title: "Plan Watch Runner Idle Timeout"
status: approved
phase: phase1
system_context_ref: plans/plan-watch-runner-idle-timeout-plan-v1.md
target_files:
  - src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts
  - src/v11/application/planWatch/internal/runner/agentRunnerBridge.ts
  - src/v11/application/planWatch/internal/runner/agentRunnerBridgeContract.ts
  - src/v11/application/planWatch/internal/runner/codexAgentRunnerBridgeResult.ts
  - src/v11/application/planWatch/internal/loop/planWatchLoopExecution.ts
  - src/v11/application/planWatch/internal/loop/planWatchRunNowExecution.ts
  - src/config/repoConfig.ts
  - src/cli/commands/plan/watch.ts
  - pairflow.toml
  - tests/v11/application/planWatch/agentRunnerBridge.test.ts
  - tests/v11/application/planWatch/planWatchLoop.test.ts
  - tests/config/repoConfig.test.ts
  - tests/cli/planWatchCommand.test.ts
prd_ref: null
plan_ref: plans/plan-watch-runner-idle-timeout-plan-v1.md
doc_bubble_id: 1-planwatch-runner-idle-timeout-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-09-plan-watch-runner-idle-timeout-plan-v1
owners:
  - "felho"
---

# Task: Plan Watch Runner Idle Timeout

## L0 - Policy

### Goal

Make `pairflow plan watch` stop killing an actively working Codex runner because
of a fixed wall-clock runner timeout. Automatic runner termination should happen
only after the runner has been idle for the configured idle window. Explicit user
interrupts, such as Ctrl-C / `SIGINT`, may continue to abort the child runner.

### Domain / Control Model Summary

1. Business invariant: if the plan-watch runner agent is producing useful
   output, `plan watch` must not automatically terminate it solely because the
   process has been alive for a fixed duration.
2. Control model: Pairflow owns automatic runner lifetime policy for
   plan-watch-managed child processes. The user owns explicit interrupts; Ctrl-C
   remains an operator abort signal and may still terminate the active child.
3. Read-path rule: runner activity is observed from the existing child process
   stdout/stderr pipes. In Codex JSON mode, stdout chunks / JSON event lines are
   sufficient evidence of runner activity.
4. Forbidden fallback: do not use Codex thread resume as the primary way to
   recover from a plan-watch timeout that should not have fired.
5. Allowed resolution path: replace the current fixed start-to-timeout timer
   with an activity-reset idle timer, and keep optional hard runtime caps out of
   the first implementation unless explicitly configured.
6. Missing-data rule: if no runner output is observed for the idle window,
   Pairflow may terminate the child and report an idle-timeout-specific reason.
7. User interrupt rule: `SIGINT` / `SIGTERM` delivered to `plan watch` remains a
   distinct abort path and must not be reclassified as idle timeout.

### Diagnosis Anchor

The motivating failure was a plan-watch Codex runner that continued producing
Codex JSON events and sub-agent activity but was later recorded in the ledger as
`AGENT_RUNNER_ABORTED`. The bubble watchdog was not the cause. The existing
runner implementation has a fixed timeout in
`src/v11/application/planWatch/internal/runner/agentRunnerBridge.ts` and
`src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts`; it does not reset the
timeout when child output arrives.

### In Scope

1. Replace fixed runner lifetime timeout behavior with an idle timeout that is
   reset by child process activity.
2. Treat both stdout and stderr activity as sufficient to reset the idle timer
   because either stream proves the child process is alive.
3. Preserve explicit stop-signal behavior: Ctrl-C / `SIGINT` and `SIGTERM`
   still produce the abort path and may kill the child runner.
4. Add a distinct timeout reason for automatic idle expiry, for example
   `AGENT_RUNNER_IDLE_TIMEOUT`.
5. Keep existing non-zero exit, output-invalid, file I/O, and explicit abort
   handling behavior.
6. Add repo config support under `[plan_watch.runner]` for
   `idle_timeout_seconds`.
7. Update CLI/help/rendered diagnostics where runner timeout terminology appears.
8. Add focused unit tests for active-output reset behavior, idle expiry, and
   explicit abort preservation.

### Out of Scope

1. Automatic `codex resume <thread_id>` handling.
2. Detaching the runner process when `plan watch` receives Ctrl-C.
3. Changing bubble watchdog timeout behavior.
4. Reinterpreting plan/task/bubble routing authority from runner artifacts.
5. Adding a global maximum wall-clock runtime cap unless the implementation can
   keep it explicitly separate from idle timeout and disabled by default.

## L1 - Change Contract

### Canonical Contract Matrix

| Contract Row | Canonical Rule | Producer / Storage | Runtime Behavior | Failure / Reason Code | Required Proof |
|---|---|---|---|---|---|
| Idle activity source | Any child stdout or stderr chunk resets the automatic runner idle timer. | `runAgentRunnerCommand(...)` owns process I/O observation. | A long-running Codex runner that keeps emitting JSON events or diagnostics is not killed by automatic timeout. | N/A while activity continues. | Unit test with repeated output before the idle deadline proves the process remains alive until it exits normally. |
| Idle expiry | If no stdout or stderr activity arrives for `idleTimeoutMs`, Pairflow terminates the child runner. | Runner invocation carries idle timeout policy. | Child receives the same graceful SIGTERM/SIGKILL fallback sequence used by current timeout handling. | `AGENT_RUNNER_IDLE_TIMEOUT`, `failureStage=timeout`. | Unit test proves idle expiry kills an otherwise hanging process and reports idle-specific reason. |
| Explicit abort | `AbortSignal` from plan-watch stop remains operator intent. | `createPlanWatchStopSignal()` and loop inputs provide the signal. | Ctrl-C / SIGTERM aborts the child immediately, regardless of recent activity. | `AGENT_RUNNER_ABORTED`, `failureStage=abort`. | Existing abort tests remain green; add regression test if needed. |
| Config | `[plan_watch.runner].idle_timeout_seconds` configures automatic idle timeout. | `src/config/repoConfig.ts` validates and exposes the value. | Plan-watch runner config maps seconds to milliseconds for runner invocation. | Invalid values fail repo config validation with path `plan_watch.runner.idle_timeout_seconds`. | Config tests cover valid positive integer, missing default, invalid type, and unsupported fields. |
| Default | Default idle timeout is 15 minutes unless repo config overrides it. | Runner defaults define the fallback. | No config change is required for existing users, and an active runner can exceed 15 total minutes as long as output keeps arriving before each idle window expires. | N/A. | Tests assert the default idle timeout maps to 15 minutes. |
| Hard cap | No automatic hard wall-clock cap is introduced in this task unless it is separately configured and separately reported. | N/A for first implementation. | Active output cannot be killed by a hidden max runtime. | N/A. | Tests assert active output resets idle timeout; no hidden wall-clock kill is exercised. |

### Ownership and Deferred Semantics

1. The runner process wrapper owns idle detection because it is the only layer
   with direct child stdout/stderr events.
2. The plan-watch loop owns operator stop signal propagation, not automatic idle
   classification.
3. Codex `thread_id` persistence is useful diagnostic evidence, but it is not
   part of this task's success path. `ExecutePairflowPlan` remains idempotent
   and can be invoked fresh from plan/task/bubble metadata.
4. Ledger resumability or automatic Codex resume is intentionally deferred.

### Target-File Reality / Scope Proof

1. `src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts` currently starts a
   single timeout timer when the process starts and kills the child when it
   expires.
2. `src/v11/application/planWatch/internal/runner/agentRunnerBridge.ts`
   currently maps process `timedOut` to `AGENT_RUNNER_TIMEOUT`.
3. `src/v11/application/planWatch/internal/runner/codexAgentRunnerBridgeResult.ts`
   has Codex JSON-mode blocked-result classification that must preserve the new
   idle reason.
4. `src/config/repoConfig.ts` currently allows only `backend` under
   `[plan_watch.runner]`; this task must widen that allowlist deliberately.
5. `src/cli/commands/plan/watch.ts` currently loads repo config and constructs
   `runnerConfig`; it owns mapping `[plan_watch.runner].idle_timeout_seconds`
   into the runner config object.
6. `planWatchLoopExecution` and `planWatchRunNowExecution` consume and forward
   `runnerConfig`; they must preserve parity for normal watch and `--run-now`
   paths without becoming the repo-config parser.

### Baseline Preservation

1. Ctrl-C / explicit stop still aborts the child runner.
2. Child non-zero exit remains `AGENT_RUNNER_NON_ZERO_EXIT`.
3. Output schema validation failures remain output failures, not timeout
   failures.
4. Codex runner artifact writing remains unchanged except that activity can
   extend the idle timer.
5. Plan-watch trigger routing and ledger dedupe behavior remain unchanged.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - runner process invocation timeout semantics
   - runner failure reason taxonomy
   - repo config schema for `[plan_watch.runner]`
3. Contract-dense decision:
   - gate triggered: yes
   - trigger reasons: timeout/failure reason behavior, config schema, and
     split ownership between process wrapper, plan-watch loop, and Codex JSON
     result interpretation
   - canonical matrix source: `Canonical Contract Matrix`
   - mirrored surfaces: L0 policy, L1 contract, L2 implementation notes, and
     tests

### Mirrored Surface Checklist

When any canonical matrix row changes, update these mirrored surfaces in the
same edit:

1. L0 `Goal`, `Domain / Control Model Summary`, `In Scope`, and `Out of Scope`
   timeout wording.
2. L1 `Ownership and Deferred Semantics`, `Baseline Preservation`, and
   `Contract Boundary / Blast Radius`.
3. L2 `Suggested Design`, especially field names and timeout classification.
4. L2 `Required Tests` and `Verification Commands`.
5. Parent plan Done Definition, Guiding Principles, Coverage Map, and
   Validation Strategy.

### Authority Boundary Map

| Boundary | In-Scope Ownership | Out-of-Scope / Preserved |
|---|---|---|
| Authority producer | `runAgentRunnerCommand(...)` observes child stdout/stderr and produces process result metadata, including idle-timeout classification. | It does not interpret plan/task/bubble route authority. |
| Shared contract | `agentRunnerBridgeContract.ts` owns the runner config, process invocation, process result, and failure reason type surfaces. | Existing non-timeout reason codes remain semantically unchanged. |
| Config authority | `repoConfig.ts` validates `[plan_watch.runner].idle_timeout_seconds`; `watch.ts` maps repo config into `runnerConfig`. | Loop/run-now paths do not parse repo config directly. |
| Internal execution consumers | `agentRunnerBridge.ts` builds invocation identity, applies default/compat timeout policy, and maps process result to runner result. | It must not treat explicit abort as idle timeout. |
| Workflow orchestration consumers | `planWatchLoopExecution` and `planWatchRunNowExecution` receive runner result and preserve blocked/settled classification. | Plan/task/bubble routing authority remains unchanged. |
| Read/diagnostic consumers | CLI rendered diagnostics and runner timeline output may surface idle timeout distinctly from explicit abort. | No new UI route or automatic resume behavior is in scope. |
| Cleanup/recovery consumers | Existing SIGTERM/SIGKILL fallback sequence is reused for idle expiry. | No detached child, resume, retry, or watchdog cleanup behavior is added. |

### Authority Fan-out Scan

1. `authority_producer`: runner process wrapper output observation and idle
   timeout result metadata.
2. `persisted_authority`: no new persisted authority. Existing runner artifacts
   remain diagnostics; repo config schema acceptance changes but does not become
   lifecycle authority.
3. `internal_execution_consumers`: runner bridge invocation/defaults and Codex
   result classification.
4. `workflow_orchestration_consumers`: normal watch loop and `--run-now` loop
   result handling.
5. `read_model_consumers`: CLI diagnostics/help and blocked-output rendering
   where timeout terminology appears.
6. `cleanup_recovery_consumers`: existing graceful kill/fallback kill path is
   reused for idle expiry.
7. Split decision: keep as one bounded task because the contract would be unsafe
   if the producer emitted idle timeout before config/defaults/classification
   and loop/CLI consumers understood it. The scope is still bounded to one
   runner lifetime policy and does not change trigger selection, ledger
   authority, bubble lifecycle, or automatic recovery.

### Closure-Budget Triage

1. Closure buckets touched:
   - `authority_producer`: process wrapper observes activity and emits idle
     timeout metadata.
   - `shared_contract`: runner config/process/result/reason type surfaces.
   - `internal_execution_consumers`: runner bridge and Codex blocked-result
     classification.
   - `workflow_orchestration_consumers`: normal watch and `--run-now` parity.
   - `read_model_consumers`: CLI/operator diagnostics where timeout is shown.
   - `persisted_authority_or_schema`: repo config schema accepts one new field.
2. Intentionally collapsed closures:
   - producer, shared contract, config mapping, and immediate consumers ship
     together to avoid mixed timeout semantics.
3. Collapse safety:
   - all changed surfaces are part of the same plan-watch runner lifetime policy;
   - no new stored lifecycle authority is introduced;
   - no new route selection, ledger dedupe, bubble state, or resume behavior is
     introduced;
   - failure taxonomy change is additive (`AGENT_RUNNER_IDLE_TIMEOUT`) while
     preserving existing abort/exit/output behavior.
4. Explicitly deferred closures:
   - hard wall-clock cap;
   - automatic Codex resume;
   - detached child handling on Ctrl-C;
   - bubble watchdog changes;
   - broader UI/read-model work beyond existing CLI diagnostics.

### Bounded-Task-Shape Classification

1. Primary shape: `contract_or_persisted_authority_foundation`, because the task
   changes runner config and result contracts.
2. Secondary shape: `consumer_family_alignment`, because the same additive
   contract must be consumed by runner bridge, Codex classification, loop/run-now,
   and CLI diagnostics in the same slice.
3. Mix safety:
   - the producer and consumers sit on one synchronous runner invocation/result
     path;
   - all consumers only need to preserve or display the additive idle-timeout
     classification;
   - no separate migration, compatibility read model, cleanup job, or state
     transition cutover is required.
4. Not in scope:
   - `coordination_concurrency_hardening`, because no new lock/lease/idempotency
     primitive is introduced;
   - `fail_closed_hardening` beyond preserving existing abort and kill fallback
     behavior.

### Complexity Risk Triage

1. `risk_score`: 6.
2. Drivers:
   - `authority_risk`: runner process wrapper becomes the activity authority.
   - `surface_spread`: process wrapper, runner contracts, bridge, Codex
     classification, repo config, loop/run-now, CLI, and tests are touched.
   - `activation_coupling`: CLI config mapping activates the behavior for real
     `pairflow plan watch` runs.
   - `acceptance_multiplicity`: proof must cover idle reset, idle expiry,
     explicit abort, config validation, and normal/run-now parity.
3. Split decision: Plan -> single Task remains acceptable because the parent
   plan explicitly owns the contract-boundary override, and the task is bounded
   to one runtime policy. Splitting producer/config/consumer work would create
   temporary mixed semantics for timeout reporting.
4. `identity_join_risk`: low. The work does not join multiple plan/task/bubble
   identities; Codex `thread_id` remains diagnostic only.
5. Authority/source-of-truth note: child stdout/stderr activity is the only
   runtime activity source for automatic idle reset.

### Precondition and Side-Effect Boundary

1. Validations before side effects:
   - repo config must reject invalid, zero, negative, non-integer, and
     non-number `plan_watch.runner.idle_timeout_seconds` before plan-watch
     runner invocation starts;
   - runner config/default resolution must produce a positive `idleTimeoutMs`
     before spawning the child process.
2. Side effects forbidden before those validations pass:
   - no child runner spawn;
   - no runner artifact writes;
   - no ledger runner record for a started invocation based on invalid timeout
     config.
3. Invalid/precondition-failure behavior:
   - path-specific repo config validation error for
     `plan_watch.runner.idle_timeout_seconds`;
   - runner bridge precondition failure if direct programmatic config supplies
     an invalid idle timeout after CLI config parsing is bypassed.
4. Coordination primitives:
   - no new lock, lease, mutex, or retry primitive is introduced;
   - existing abort signal and SIGTERM/SIGKILL fallback sequencing are preserved.

## L2 - Implementation Notes

### Suggested Design

1. Add `idleTimeoutMs` as the canonical runner idle timeout field through the
   plan-watch runner config and process invocation path. Keep `timeoutMs` only
   as a compatibility input where existing call sites or tests still require it,
   mapping it into `idleTimeoutMs` before process execution.
2. In `AgentRunnerCommandProcess`, replace `startTimeoutTimer()` with
   `resetIdleTimer()`:
   ```ts
   private resetIdleTimer(): void {
     clear existing idle timer;
     set timer to terminate child after idleTimeoutMs;
   }
   ```
3. Call `resetIdleTimer()`:
   - immediately after spawn,
   - on stdout data,
   - on stderr data.
4. Preserve `abortRunner` unchanged for explicit stop signal.
5. Add process result metadata that distinguishes idle timeout from generic
   timeout:
   ```ts
   timeoutKind: "idle"
   ```
   The bridge maps `timeoutKind: "idle"` to `AGENT_RUNNER_IDLE_TIMEOUT` and
   keeps `failureStage="timeout"`.
6. Update failure taxonomy in
   `agentRunnerBridgeContract.ts`, `agentRunnerBridge.ts`, and
   `codexAgentRunnerBridgeResult.ts`.
7. Extend repo config parsing:
   ```toml
   [plan_watch.runner]
   backend = "codex"
   idle_timeout_seconds = 900
   ```
8. Map `idle_timeout_seconds` to runner invocation timeout policy in
   `src/cli/commands/plan/watch.ts`, where repo config is loaded and
   `runnerConfig` is constructed. `planWatchLoopExecution` and
   `planWatchRunNowExecution` must pass through the resulting runner config and
   preserve normal watch / `--run-now` parity.
9. Set the default idle timeout to `15 * 60 * 1000` milliseconds.

### Required Tests

1. `tests/v11/application/planWatch/agentRunnerBridge.test.ts`
   - active stdout chunks reset idle timeout and prevent premature kill
   - stderr chunks reset idle timeout
   - idle expiry kills a hanging child and reports `AGENT_RUNNER_IDLE_TIMEOUT`
   - explicit abort still reports `AGENT_RUNNER_ABORTED` even after recent
     activity
   - Codex JSON-mode classification preserves the idle timeout reason
2. `tests/config/repoConfig.test.ts`
   - accepts positive `plan_watch.runner.idle_timeout_seconds`
   - rejects invalid, zero, negative, non-integer, or non-number values with a
     path-specific validation error
   - keeps rejecting unsupported runner fields
3. `tests/cli/planWatchCommand.test.ts`
   - command path passes configured idle timeout into runner invocation
   - omitted `idle_timeout_seconds` uses the 15 minute default
   - rendered blocked output distinguishes idle timeout from explicit abort when
     surfaced to the operator
4. `tests/v11/application/planWatch/planWatchLoop.test.ts`
   - loop/run-now wiring uses the same idle timeout policy for normal watch and
     `--run-now`

### Verification Commands

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm test -- tests/v11/application/planWatch/agentRunnerBridge.test.ts tests/v11/application/planWatch/planWatchLoop.test.ts tests/config/repoConfig.test.ts tests/cli/planWatchCommand.test.ts`
5. `pnpm test`
6. `pnpm build`

### Stop Conditions

1. Stop and refine if Codex `exec --json` stops emitting stdout while still
   visibly working in a way Pairflow cannot observe from pipes.
2. Stop and refine if implementing idle timeout requires changing Codex process
   ownership, detach behavior, or automatic resume semantics.
3. Stop and refine if config schema expansion requires a broader plan-watch
   public config design than a single idle timeout field.
4. Stop and refine if tests show output chunks can be buffered for longer than
   the intended idle timeout under normal Codex activity.

### Hardening Backlog

1. `later-hardening`: add a separately configured hard wall-clock runtime cap
   only if operators later need a total process lifetime guard. It must use a
   distinct config field and distinct result classification.
2. `later-hardening`: persist Codex `thread_id` as diagnostic context in runner
   artifacts if it helps manual resume, without making resume part of automatic
   timeout recovery.
3. `later-hardening`: add an operator-facing manual reproduction note if unit
   tests reveal that Codex stdout buffering can exceed the 15 minute idle window
   during useful work.
