---
artifact_type: task
artifact_id: task_local_plan_watch_local_runner_wrapper_v1
task_family_id: local-runner-wrapper
sequence_key: "5"
task_id: 5-local-runner-wrapper
title: "Local Plan Watch Runner Wrapper"
status: draft
phase: phase5-retrofit
target_files:
  - "scripts/pairflow-plan-runner.sh"
  - "scripts/pairflow-plan-runner.mjs"
  - "README.md"
  - "docs/local-plan-watch-v1-pilot.md"
  - "tests/v11/application/planWatch/agentRunnerBridge.test.ts"
  - "tests/cli/planWatchCommand.test.ts"
prd_ref: null
plan_ref: plans/local-plan-watch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/local-plan-watch-plan-v1.md
  - src/v11/application/planWatch/agentRunnerBridgeContract.ts
  - src/v11/application/planWatch/agentRunnerBridgeResult.ts
  - src/v11/application/planWatch/agentRunnerBridge.ts
  - docs/local-plan-watch-v1-pilot.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-01-local-plan-watch
---

# Task: Local Plan Watch Runner Wrapper

## L0 - Policy

### Goal

Retrofit the local `plan watch` V1 feature with a concrete repo-local runner command so an approval-ready linked bubble can trigger an actual `ExecutePairflowPlan` continuation without relying on an undocumented placeholder such as `pairflow-plan-runner`.

### Domain / Control Model Summary

1. Business invariant: `plan watch` may claim automation only when the runner command it invokes is concrete, documented, executable, and proven against a non-dry-run trigger.
2. Control model: `plan watch` owns trigger detection, dedupe, and process invocation; the repo-local runner owns adapter behavior between the watch payload and a local agent workflow invocation; `ExecutePairflowPlan` owns route selection and downstream workflow delegation.
3. Read-path rule: the runner must consume only the structured `AgentRunnerContinuationPayload` supplied by the bridge, not chat history, shell cwd guesses, or prose examples.
4. Forbidden fallback: the runner must not compute `ResolvePlanState` routes, approve/close bubbles itself, or silently report success when the local agent command is missing, interactive-only, or returns unparseable output.
5. Allowed resolution path: the runner may validate payload shape, resolve the repo-local plan path, invoke a configured local agent command for `ExecutePairflowPlan`, and map the agent outcome into the bridge-compatible structured JSON output.
6. Missing-data rule: missing runner prerequisite, missing plan path, invalid payload, agent non-zero exit, timeout, or missing structured result must return `status="blocked"` with an actionable `reason_code`.
7. Phase boundary:
   - contract closure: preserve existing `AgentRunnerContinuationPayload` and `StructuredAgentRunnerOutput` contracts
   - producer closure: add a repo-local executable adapter script
   - internal execution closure: invoke local agent workflow only through explicit command/config
   - workflow/orchestration closure: remain delegated to `ExecutePairflowPlan`
   - read-model closure: update docs/pilot evidence to remove placeholder ambiguity
   - activation closure: provide one command that operators can actually run
   - cleanup/recovery closure: no lifecycle cleanup changes

### Plan Linkage

1. Parent plan gap closed: missing last-mile executable proof for autonomous `plan watch` continuation.
2. Depends on: tasks `1-agent-runner-bridge`, `2-bubble-trigger-index`, `3-watch-loop`, and `4-pilot-docs`.
3. Unlocks / impacts successors: enables the planned end-to-end live watch pilot against a disposable approval-ready plan/bubble.
4. Task-list impact: retrofits the previously archived local plan watch plan; no existing task is replaced or superseded.
5. Inherited validation / exit expectation: prove one documented non-dry-run command path and duplicate suppression for the same trigger evidence.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/application/planWatch/agentRunnerBridgeContract.ts`
   - `src/v11/application/planWatch/agentRunnerBridgeResult.ts`
   - `src/v11/application/planWatch/agentRunnerBridge.ts`
   - `src/v11/application/planWatch/planWatchLoopExecution.ts`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
2. Canonical elements:
   - input payload kind: `pairflow.execute_pairflow_plan.continuation`
   - workflow: `ExecutePairflowPlan`
   - runner output statuses: `settled_checkpoint`, `human_checkpoint`, `blocked`
   - required output field: non-empty `reason_code`
3. Guard elements:
   - local agent binary/config availability
   - non-interactive execution mode support
   - payload JSON validity
   - timeout and non-zero exit classification
4. Compat-only elements: existing `--runner-command`, `--runner-arg`, and `--runner-input-mode` remain supported; the new runner is the repo-provided default path, not the only possible external runner.
5. Forbidden reinterpretations:
   - do not make `plan watch` itself run `ExecutePairflowPlan` inline
   - do not treat dry-run evidence as successful automation
   - do not make a placeholder executable name count as implementation

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/planWatch/agentRunnerBridgeContract.ts`
   - `src/v11/application/planWatch/agentRunnerBridge.ts`
   - `src/v11/application/planWatch/agentRunnerBridgeResult.ts`
   - `src/cli/commands/plan/watch.ts`
   - `README.md`
   - `docs/local-plan-watch-v1-pilot.md`
2. Actual touched scope: activation adapter plus docs and focused tests.
3. Mutation entrypoints in scope: a local script that launches a subprocess; no Pairflow lifecycle state mutation belongs in the script itself.
4. Hidden scope ruled out: native reimplementation of `ExecutePairflowPlan`, remote supervisor mode, UI checkpoint inboxes, and event-driven hooks.
5. Branch inventory note: valid payload, invalid payload, missing local agent command, agent non-zero exit, agent timeout, structured success, structured human checkpoint, structured blocked result, duplicate watch trigger after completed run.
6. Why the declared task shape matches reality: the existing bridge already supports arbitrary runner commands; this task closes the activation gap by shipping and proving one concrete runner.

### Authority Boundary Map

1. Authority producer: `plan watch` bridge produces `AgentRunnerContinuationPayload`.
2. Stored authority: watch ledger stores runner invocation/result evidence.
3. In-scope consumers: repo-local runner script, README/operator docs, pilot evidence.
4. Explicit out-of-scope consumers: `ResolvePlanState` internals, Pairflow lifecycle mutation commands, remote-only control planes, UI status surfaces.
5. Export surfaces closed in this phase: yes, a documented executable runner command and bridge-compatible JSON output.

### Baseline Preservation

1. Must-preserve behaviors:
   - existing external `--runner-command` users still work
   - `stdin_json` remains the default input mode
   - invalid runner output remains `AGENT_RUNNER_OUTPUT_INVALID`
   - dry-run still never invokes a runner
2. Allowed resolution paths: the repo-local runner may delegate to a locally configured agent executable through environment variables or documented defaults.
3. Forbidden regression interpretations: do not require a global `pairflow-plan-runner` binary that the repo does not ship.
4. Replacement proof required if removed: placeholder docs must be replaced with a real command and live pilot evidence.

### Success / Completion Proof Boundary

1. Current canonical success proof source: focused tests prove bridge behavior with stubbed commands, but no repo-local non-dry-run runner proof exists.
2. Target canonical success proof source: a non-dry-run `pairflow plan watch ... --runner-command <repo-local-runner>` run that invokes the runner and records a completed watch ledger result.
3. Current canonical completion proof source: dry-run pilot evidence and stubbed runner tests.
4. Target canonical completion proof source: live or disposable approval-ready pilot with runner invocation, structured result, and duplicate suppression evidence.
5. Reused proof contract: `StructuredAgentRunnerOutput` parsed by `agentRunnerBridgeResult.ts`.
6. Proof-parity rule: `upgrade_required`; dry-run/stub proof is insufficient for the automation claim.
7. Final truth surfaces affected: README runner examples, pilot evidence doc, watch ledger records.
8. Mixed-truth surfaces allowed: human-readable agent transcript may be summarized, but bridge-compatible JSON output and ledger fields are the completion authority.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: activation_or_read_model.
2. Secondary shape: subprocess_adapter.
3. Preconditions that must pass before side effects: payload validates, plan path exists, local agent command is configured/available, and runner can emit structured JSON.
4. Side effects forbidden before preconditions pass: no lifecycle mutation by the runner script and no successful watcher completion record.
5. Invalid/precondition-failure behavior: emit `status="blocked"` with an actionable reason and non-success summary.
6. Coordination primitives in scope: existing watch ledger dedupe only; no new lock primitive.

### In Scope

1. Add a repo-local executable runner command/script, preferably under `scripts/`.
2. Define its input contract for `stdin_json` and, if chosen, optional `arg_json`.
3. Invoke the local agent workflow for `ExecutePairflowPlan` using an explicit documented command/configuration.
4. Emit bridge-compatible structured JSON:
   - `status`
   - `reason_code`
   - optional `summary`
   - optional `changed_artifacts`
   - optional `route_ledger_summary`
5. Fail closed for missing local agent command, invalid payload, non-zero agent exit, timeout, and unparseable agent result.
6. Replace placeholder `pairflow-plan-runner` README/pilot wording with the repo-local command.
7. Add focused tests for script behavior or the wrapper contract.
8. Run a non-dry-run disposable watch pilot and then rerun the same watch trigger to prove duplicate suppression.

### Out of Scope

1. Reimplementing `ExecutePairflowPlan` route selection in TypeScript or shell.
2. Adding remote-only plan execution or a remote supervisor.
3. Adding manual nudge/continue CLI surfaces.
4. Changing watch trigger detection or linked-bubble discovery semantics.
5. Changing Pairflow lifecycle approve/commit/merge behavior.

### Safety Defaults

1. Default to fail-closed `blocked` output when the runner cannot prove it invoked the local agent workflow.
2. Keep shell quoting safe; payload handling must not eval JSON or interpolate untrusted payload into shell commands.
3. Prefer a Node wrapper for JSON parsing and shell-safe process execution; a shell shim may call the Node wrapper.
4. Make external agent prerequisites explicit in docs and output.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - runner executable contract
   - bridge structured output contract
   - operator activation command contract
   - pilot evidence contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `2`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `9`
8. `single-task allowed`: `yes`
9. If `no`, required split: `N/A`.
10. Identity/join note:
   - canonical identity path: watch payload `invocation_id` + `plan_path` + ledger key.
   - competing identifiers or fallback identities: shell cwd, chat transcript, and placeholder command names are forbidden.
11. Authority/source-of-truth note:
   - canonical source: bridge payload plus runner structured JSON output.
   - forbidden secondary sources: prose-only agent response or operator memory.
12. Closure-budget triage:
   - closure buckets touched: activation, subprocess adapter, read-model docs, pilot proof.
   - intentionally collapsed closures: script plus docs plus proof, because the missing value is a concrete executable path.
   - explicitly deferred closures: remote supervisor, UI, nudge commands.
13. Bounded-task-shape decision:
   - primary shape: activation_or_read_model.
   - secondary shape: subprocess_adapter.
   - why this bounded mix is safe: the runner is an adapter around an existing bridge contract and delegates orchestration unchanged.
14. Contract-dense decision:
   - gate triggered: `yes`
   - trigger reasons: structured input/output parsing, failure reason taxonomy, and downstream ledger interpretation.
   - canonical matrix source: L1 `Canonical Runner Contract Matrix`.
   - mirrored surfaces: L0 policy, L1 contract, L2 tests, README examples, pilot evidence.

## L1 - Change Contract

### Canonical Runner Contract Matrix

| Contract Item | Source / Owner | Required Behavior | Failure Behavior | Evidence |
|---|---|---|---|---|
| Input payload | `AgentRunnerContinuationPayload` | Accept JSON with `kind`, `workflow`, `invocation_id`, `plan_path`, `repo_path`, `triggered_at`, and `trigger`. | Invalid/missing fields return `blocked` with runner-specific reason. | Wrapper tests. |
| Workflow target | `ExecutePairflowPlan` skill | Invoke only `ExecutePairflowPlan` for the supplied `plan_path`. | Any other workflow value blocks. | Wrapper tests and pilot command. |
| Plan path | Payload + filesystem | Verify the plan exists before invoking agent. | Missing path blocks; do not call agent. | Wrapper tests. |
| Local agent command | Operator/repo config | Use documented local command/config to run a non-interactive agent invocation. | Missing command blocks with actionable summary. | Wrapper tests and README. |
| Output record | `StructuredAgentRunnerOutput` | Emit parseable JSON with `status` and `reason_code`; optional summary/artifacts/ledger. | Unparseable agent result maps to `blocked`, not success. | Bridge tests and live pilot. |
| Status mapping | Runner wrapper | Preserve `settled_checkpoint`, `human_checkpoint`, and `blocked`. | Unknown status blocks. | Wrapper tests. |
| Watch ledger | Existing watch loop | Completed runner result is recorded under the dedupe key. | Failed runner is recorded as blocked. | Non-dry-run pilot and duplicate rerun. |

### Ownership and Deferred Semantics

1. The runner script owns process adaptation only.
2. `ExecutePairflowPlan` remains the only route/delegation authority.
3. The watch loop remains the only ledger/dedupe owner.
4. Remote-only execution remains deferred; this runner is local-control-plane only.

### Implementation Notes

1. Prefer `scripts/pairflow-plan-runner.mjs` for JSON parsing and process control.
2. If a shell entrypoint is needed, `scripts/pairflow-plan-runner.sh` should be a thin executable shim.
3. The runner should avoid shell interpolation of payload fields.
4. If the local agent CLI cannot provide structured output directly, the wrapper must fail closed unless it can deterministically map the result into `StructuredAgentRunnerOutput`.
5. Documentation must name the actual command path, for example:

```bash
pairflow plan watch <plan-path> \
  --repo /Users/felho/dev/pairflow \
  --once \
  --runner-command ./scripts/pairflow-plan-runner.sh
```

### Mirrored Surface Checklist

1. L0 policy runner contract.
2. L1 canonical runner contract matrix.
3. README examples.
4. Pilot evidence document.
5. Focused runner tests.
6. Live non-dry-run pilot evidence.

## L2 - Acceptance Tests / Evidence

1. A repo-local executable runner exists and is referenced by docs with an exact command.
2. The runner accepts the bridge `stdin_json` payload and rejects malformed payloads without invoking the agent.
3. The runner returns bridge-compatible JSON for:
   - settled checkpoint
   - human checkpoint
   - blocked
4. Missing local agent command/config returns `status="blocked"` with an actionable reason code and summary.
5. Non-zero agent exit returns `status="blocked"` and does not claim plan progression.
6. README no longer presents `pairflow-plan-runner` as if it were a real shipped command unless that exact command is shipped.
7. `docs/local-plan-watch-v1-pilot.md` records a non-dry-run disposable pilot using the repo-local runner.
8. The pilot records the watch ledger key, invocation id, runner status, runner reason code, changed artifacts if any, and route ledger summary if emitted.
9. Rerunning the same watch trigger records or reports duplicate suppression without invoking the runner again.
10. Focused tests pass:

```bash
pnpm exec vitest run \
  tests/v11/application/planWatch/agentRunnerBridge.test.ts \
  tests/cli/planWatchCommand.test.ts
```

11. Runner-specific tests or script smoke tests pass.
12. Because this task touches scripts/runtime activation behavior, run `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, the focused watch tests, and `pnpm build`. Run `pnpm test` only if implementation changes affect shared runtime behavior beyond the runner adapter or if reviewer evidence requires it.
