---
artifact_type: task
artifact_id: task_local_plan_watch_codex_runner_v1
task_family_id: plan-watch-codex-runner
sequence_key: "5"
task_id: 5-plan-watch-codex-runner
title: "Local Plan Watch Built-In Codex Runner"
status: archived
phase: phase5-retrofit
target_files:
  - "pairflow.toml"
  - "src/config/repoConfig.ts"
  - "src/cli/commands/plan/watch.ts"
  - "src/v11/application/planWatch/agentRunnerBridge.ts"
  - "src/v11/application/planWatch/agentRunnerBridgeContract.ts"
  - "src/v11/application/planWatch/agentRunnerBridgeResult.ts"
  - "src/v11/application/planWatch/planWatchLoopExecution.ts"
  - "src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts"
  - "README.md"
  - "docs/local-plan-watch-v1-pilot.md"
  - "tests/config/repoConfig.test.ts"
  - "tests/v11/application/planWatch/agentRunnerBridge.test.ts"
  - "tests/v11/application/planWatch/planWatchLoop.test.ts"
  - "tests/cli/planWatchCommand.test.ts"
prd_ref: null
plan_ref: plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md
  - src/v11/application/planWatch/agentRunnerBridgeContract.ts
  - src/v11/application/planWatch/agentRunnerBridgeResult.ts
  - src/v11/application/planWatch/agentRunnerBridge.ts
  - src/v11/application/planWatch/planWatchLoopExecution.ts
  - docs/local-plan-watch-v1-pilot.md
owners:
  - "felho"
doc_bubble_id: 5-plan-watch-codex-runner-doc
impl_bubble_id: 5-plan-watch-codex-runner-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-01-local-plan-watch
---

# Task: Local Plan Watch Built-In Codex Runner

## L0 - Policy

### Goal

Retrofit the local `plan watch` V1 feature with a Pairflow-provided built-in Codex runner so an approval-ready linked bubble can trigger an actual `ExecutePairflowPlan` continuation without relying on repo-local scripts, placeholder commands, or per-repository runner glue.

### Domain / Control Model Summary

1. Business invariant: `plan watch` may claim automation only when Pairflow itself can invoke the installed `ExecutePairflowPlan` skill through a documented, configured, non-interactive agent backend.
2. Control model: `plan watch` owns trigger detection and dedupe; Pairflow's built-in runner owns full-access Codex subprocess invocation and result classification; `ExecutePairflowPlan` owns route selection and downstream workflow delegation.
3. Read-path rule: the runner must consume only the structured `AgentRunnerContinuationPayload` supplied by the bridge, not chat history, shell cwd guesses, or prose examples.
4. Forbidden fallback: the runner must not compute `ResolvePlanState` routes, approve/close bubbles itself, require each target repo to ship a custom script, or silently report success when Codex is unavailable or returns unparseable output.
5. Allowed resolution path: Pairflow may read repo/global config to select the Codex plan-watch runner, validate payload shape, verify the plan path, invoke Codex non-interactively with `--dangerously-bypass-approvals-and-sandbox` and an `ExecutePairflowPlan` prompt, and map the result into bridge-compatible structured JSON output.
6. Missing-data rule: missing config (`PLAN_WATCH_RUNNER_CONFIG_MISSING`), unsupported backend (`PLAN_WATCH_RUNNER_BACKEND_UNSUPPORTED`), invalid payload (`PLAN_WATCH_RUNNER_PAYLOAD_INVALID`), unsupported workflow (`PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED`), missing plan path (`PLAN_WATCH_PLAN_PATH_UNAVAILABLE`), missing repo path (`PLAN_WATCH_REPO_PATH_UNAVAILABLE`), missing Codex executable (`PLAN_WATCH_CODEX_UNAVAILABLE`), Codex non-zero exit (`AGENT_RUNNER_NON_ZERO_EXIT`), timeout (`AGENT_RUNNER_TIMEOUT`), missing structured result, or invalid runner output (`AGENT_RUNNER_OUTPUT_INVALID`) must return `status="blocked"` with an actionable `reason_code`.
7. Phase boundary:
   - contract closure: preserve existing `AgentRunnerContinuationPayload` and `StructuredAgentRunnerOutput` contracts
   - producer closure: add Pairflow CLI/runtime config and built-in Codex runner invocation
   - internal execution closure: invoke local Codex in the same trusted full-access mode Pairflow already uses for Codex agents
   - workflow/orchestration closure: remain delegated to `ExecutePairflowPlan`
   - read-model closure: update docs/pilot evidence to remove placeholder ambiguity
   - activation closure: `pairflow plan watch <plan-path>` runs through the config-provided Codex backend
   - cleanup/recovery closure: no lifecycle cleanup changes

### Plan Linkage

1. Parent plan gap closed: missing last-mile built-in runner proof for autonomous `plan watch` continuation.
2. Depends on: tasks `1-agent-runner-bridge`, `2-bubble-trigger-index`, `3-watch-loop`, and `4-pilot-docs`.
3. Unlocks / impacts successors: enables the planned end-to-end live watch pilot against a disposable approval-ready plan/bubble.
4. Task-list impact: retrofits the previously archived local plan watch plan; no existing task is replaced or superseded.
5. Inherited validation / exit expectation: prove one documented non-dry-run command path using the configured built-in Codex backend and duplicate suppression for the same trigger evidence.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/application/planWatch/agentRunnerBridgeContract.ts`
   - `src/v11/application/planWatch/agentRunnerBridgeResult.ts`
   - `src/v11/application/planWatch/agentRunnerBridge.ts`
   - `src/v11/application/planWatch/planWatchLoopExecution.ts`
   - `src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts`
   - `src/config/repoConfig.ts`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
2. Canonical elements:
   - input payload kind: `pairflow.execute_pairflow_plan.continuation`
   - workflow: `ExecutePairflowPlan`
   - runner output statuses: `settled_checkpoint`, `human_checkpoint`, `blocked`
   - required output field: non-empty `reason_code`
3. Guard elements:
   - plan-watch runner config availability
   - Codex binary availability
   - non-interactive execution mode support
   - explicit trusted-local full-access execution mode
   - payload JSON validity
   - timeout and non-zero exit classification
4. Legacy elements to migrate: the prior hook-only runner command contract belongs to the obsolete design and must not remain the primary operator contract after this task.
5. Forbidden reinterpretations:
   - do not make `plan watch` itself run `ExecutePairflowPlan` inline
   - do not treat dry-run evidence as successful automation
   - do not require target repositories to ship their own runner scripts
   - do not add a `--runner` CLI selector in this slice; backend selection comes from config

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/planWatch/agentRunnerBridgeContract.ts`
   - `src/v11/application/planWatch/agentRunnerBridge.ts`
   - `src/v11/application/planWatch/agentRunnerBridgeResult.ts`
   - `src/v11/application/planWatch/planWatchLoopExecution.ts`
   - `src/cli/commands/plan/watch.ts`
   - `src/config/repoConfig.ts`
   - `src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts`
   - `README.md`
   - `docs/local-plan-watch-v1-pilot.md`
2. Actual touched scope: config contract, built-in Codex subprocess adapter, docs, and focused tests.
3. Mutation entrypoints in scope: `plan watch` runner invocation path; no Pairflow lifecycle state mutation belongs in the runner adapter itself.
4. Hidden scope ruled out: native reimplementation of `ExecutePairflowPlan`, remote supervisor mode, UI checkpoint inboxes, and event-driven hooks.
5. Branch inventory note: config absent, backend unsupported, Codex missing, unsupported workflow, missing plan path, missing repo path, valid payload, invalid payload, malformed/partial runner output, unknown runner output fields, duplicate/multiple JSON output candidates, Codex non-zero exit, Codex timeout, structured success, structured human checkpoint, structured blocked result, duplicate watch trigger after completed run, and operator environment not trusted for full-access runner execution.
6. Why the declared task shape matches reality: the existing bridge already classifies runner process results; this task replaces placeholder command activation with a Pairflow-owned Codex backend path.

### Authority Boundary Map

1. Authority producer: `plan watch` bridge produces `AgentRunnerContinuationPayload`; Pairflow config selects the Codex backend.
2. Stored authority: watch ledger stores runner invocation/result evidence.
3. In-scope consumers: built-in Codex runner, README/operator docs, pilot evidence.
4. Explicit out-of-scope consumers: `ResolvePlanState` internals, Pairflow lifecycle mutation commands, remote-only control planes, UI status surfaces.
5. Export surfaces closed in this phase: yes, a documented config-driven built-in Codex runner and bridge-compatible JSON output.

### Baseline Preservation

1. Must-preserve behaviors:
   - dry-run still never invokes a runner
   - `stdin_json` remains the default input mode
   - invalid runner output remains `AGENT_RUNNER_OUTPUT_INVALID`
   - the old hook-only runner path is obsolete for this plan and must not remain in README/pilot docs as the supported automation path
2. Allowed resolution paths: Pairflow config selects `codex`; Pairflow invokes the installed Codex CLI non-interactively from the local control plane with `--dangerously-bypass-approvals-and-sandbox`.
3. Forbidden regression interpretations: do not require a global `pairflow-plan-runner` binary or repo-local script.
4. Replacement proof required if removed: placeholder docs must be replaced with built-in config-driven runner docs and live pilot evidence.

### Success / Completion Proof Boundary

1. Current canonical success proof source: focused tests prove bridge behavior with stubbed commands, but no built-in non-dry-run Codex runner proof exists.
2. Target canonical success proof source: a non-dry-run `pairflow plan watch <plan-path>` run that uses config-selected Codex, invokes `ExecutePairflowPlan`, and records a completed watch ledger result.
3. Current canonical completion proof source: dry-run pilot evidence and stubbed runner tests.
4. Target canonical completion proof source: live or disposable approval-ready pilot with runner invocation, structured result, and duplicate suppression evidence.
5. Reused proof contract: `StructuredAgentRunnerOutput` parsed by `agentRunnerBridgeResult.ts`.
6. Proof-parity rule: `upgrade_required`; dry-run/stub proof is insufficient for the automation claim.
7. Final truth surfaces affected: Pairflow config docs, README runner examples, pilot evidence doc, watch ledger records.
8. Mixed-truth surfaces allowed: human-readable agent transcript may be summarized, but bridge-compatible JSON output and ledger fields are the completion authority.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: activation_or_read_model.
2. Secondary shape: subprocess_adapter.
3. Preconditions that must pass before side effects: payload validates, `workflow="ExecutePairflowPlan"`, plan path exists, repo path exists, config selects `codex`, Codex executable is available, the operator environment is trusted for full-access Codex execution, and runner can emit structured JSON.
4. Side effects forbidden before preconditions pass: no Codex invocation when payload/config preconditions fail and no successful watcher completion record.
5. Invalid/precondition-failure behavior: emit `status="blocked"` with an actionable reason and non-success summary.
6. Coordination primitives in scope: existing watch ledger dedupe only; no new lock primitive.

### In Scope

1. Add Pairflow config support for plan-watch runner backend selection, with `codex` as the only supported backend in this slice.
2. Make non-dry-run `plan watch` use the configured built-in Codex runner as the primary path.
3. Invoke the local Codex CLI non-interactively with `--dangerously-bypass-approvals-and-sandbox`, an `ExecutePairflowPlan` prompt for the supplied plan path, and compact trigger context.
4. Emit or derive bridge-compatible structured JSON:
   - `status`
   - `reason_code`
   - optional `summary`
   - optional `changed_artifacts`
   - optional `route_ledger_summary`
5. Fail closed for missing/unsupported config, missing Codex CLI, invalid payload, non-zero Codex exit, timeout, and unparseable agent result.
6. Replace placeholder `pairflow-plan-runner` README/pilot wording with config-driven built-in runner usage.
7. Add focused tests for config parsing, built-in runner selection, Codex invocation classification, and output parsing.
8. Run a non-dry-run disposable watch pilot and then rerun the same trigger to prove duplicate suppression.

### Out of Scope

1. Reimplementing `ExecutePairflowPlan` route selection in TypeScript or shell.
2. Adding remote-only plan execution or a remote supervisor.
3. Adding manual nudge/continue CLI surfaces.
4. Changing watch trigger detection or linked-bubble discovery semantics.
5. Changing Pairflow lifecycle approve/commit/merge behavior.
6. Supporting a `--runner` CLI flag or non-Codex backend in this slice.
7. Designing a general custom-runner plugin interface.

### Safety Defaults

1. Default to fail-closed `blocked` output when the built-in runner cannot prove it invoked Codex and received bridge-compatible output.
2. Keep shell/process argument construction safe; do not interpolate untrusted payload into shell command strings.
3. Spawn Codex with argv arrays rather than shell evaluation.
4. Invoke Codex with `--dangerously-bypass-approvals-and-sandbox` because this is the established Pairflow-internal Codex execution mode.
5. Treat this as trusted local operator execution, not as a sandboxed security boundary.
6. Make Codex CLI prerequisites and trusted-environment assumptions explicit in docs and blocked summaries.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - plan-watch runner config contract
   - built-in Codex runner invocation contract
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
   - canonical source: bridge payload, Pairflow config, and runner structured JSON output.
   - forbidden secondary sources: prose-only agent response or operator memory.
12. Closure-budget triage:
   - closure buckets touched: config contract, activation, subprocess adapter, read-model docs, pilot proof.
   - intentionally collapsed closures: config plus Codex adapter plus docs plus proof, because the missing value is a built-in executable path.
   - explicitly deferred closures: remote supervisor, UI, nudge commands.
13. Bounded-task-shape decision:
   - primary shape: activation_or_read_model.
   - secondary shape: subprocess_adapter.
   - why this bounded mix is safe: the runner is a built-in adapter around an existing bridge contract and delegates orchestration unchanged.
14. Contract-dense decision:
   - gate triggered: `yes`
   - trigger reasons: structured input/output parsing, failure reason taxonomy, and downstream ledger interpretation.
   - canonical matrix source: L1 `Canonical Runner Contract Matrix`.
   - mirrored surfaces: L0 policy, L1 contract, L2 tests, README examples, pilot evidence.

## L1 - Change Contract

### Canonical Runner Contract Matrix

| Contract Item | Source / Owner | Required Behavior | Failure Behavior | Evidence |
|---|---|---|---|---|
| Config backend | Pairflow repo/global config | Select `codex` for plan-watch runner using a repo config field such as `[plan_watch.runner] backend = "codex"`; no CLI `--runner` selector is added. | Missing backend blocks non-dry-run watch with `status="blocked"`, `reason_code="PLAN_WATCH_RUNNER_CONFIG_MISSING"`; unsupported backend blocks with `reason_code="PLAN_WATCH_RUNNER_BACKEND_UNSUPPORTED"`. | Config tests and CLI command tests. |
| Command derivation | CLI/default dependencies | When config selects `codex`, derive the bridge runner command internally from Pairflow defaults: `command="codex"`, argv-array args for full-access non-interactive `exec`, schema/result-file options when used, and the `ExecutePairflowPlan` prompt for the payload plan path. | The existing command-presence gate may remain only as a derived bridge precondition after config resolution; it must not remain an operator-required `--runner-command` path for the documented automation flow. If command derivation fails, return `blocked` with `reason_code="PLAN_WATCH_RUNNER_CONFIG_MISSING"`. | CLI command tests and built-in runner tests. |
| Input payload | `AgentRunnerContinuationPayload` | Accept only an object with `kind="pairflow.execute_pairflow_plan.continuation"`, non-empty `invocation_id`, `plan_path`, `repo_path`, ISO `triggered_at`, and object `trigger`; unknown fields are ignored, not authority. The `workflow` field is validated by the workflow-target row below. | Malformed, partial, missing required fields, wrong `kind`, or wrong field types return `blocked` with `reason_code="PLAN_WATCH_RUNNER_PAYLOAD_INVALID"` before invoking Codex. A syntactically valid payload with unsupported `workflow` is not payload-invalid; it is classified by the workflow-target row. | Built-in runner tests. |
| Workflow target | `ExecutePairflowPlan` skill | Invoke only `ExecutePairflowPlan` for the supplied `plan_path`; workflow value is a guard, not a dynamic selector. | Any workflow other than `ExecutePairflowPlan` returns `blocked` with `reason_code="PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED"` before invoking Codex. | Built-in runner tests and pilot command. |
| Plan path | Payload + filesystem | Verify the plan exists before invoking Codex. | Missing path returns `blocked` with `reason_code="PLAN_WATCH_PLAN_PATH_UNAVAILABLE"` and does not call Codex. | Built-in runner tests. |
| Repo path | Payload + filesystem | Verify `repo_path` exists before invoking Codex and use it as the `--cd` authority. | Missing or unavailable repo path returns `blocked` with `reason_code="PLAN_WATCH_REPO_PATH_UNAVAILABLE"` and does not call Codex. | Built-in runner tests. |
| Codex executable | Pairflow runtime/defaults | Use installed Codex CLI in non-interactive full-access mode: `codex --dangerously-bypass-approvals-and-sandbox exec ...`. | Missing or spawn-failed Codex returns `blocked` with `reason_code="PLAN_WATCH_CODEX_UNAVAILABLE"` and actionable summary. | Runner tests and README. |
| Codex process outcome | Built-in runner | Preserve timeout and non-zero exit as failed runner execution, never as plan progression. | Timeout returns `blocked` with `reason_code="AGENT_RUNNER_TIMEOUT"`; non-zero exit returns `blocked` with `reason_code="AGENT_RUNNER_NON_ZERO_EXIT"` and captured stdout/stderr tail. | Runner tests. |
| Output record | `StructuredAgentRunnerOutput` + `agentRunnerBridgeResult.ts` | Parse bridge-compatible JSON with allowlisted `status`, non-empty `reason_code`, optional string `summary`, optional string-array `changed_artifacts`, and optional string `route_ledger_summary`; unknown fields are ignored. Preserve existing candidate behavior: multiple JSON candidates are allowed and the latest valid structured envelope wins. | Malformed JSON, partial records, invalid optional-field types, or no valid structured envelope return `blocked` with `reason_code="AGENT_RUNNER_OUTPUT_INVALID"`, not success. | Bridge tests, runner adapter tests, and live pilot. |
| Status mapping | Built-in runner | Preserve only `settled_checkpoint`, `human_checkpoint`, and `blocked`. | Unknown status returns `blocked` with `reason_code="AGENT_RUNNER_OUTPUT_INVALID"`. | Built-in runner tests. |
| Watch loop execution | `planWatchLoopExecution.ts` | Integrate the derived built-in runner command into the existing watch-loop execution path without changing trigger discovery, ledger ownership, or dedupe semantics. | Runner precondition failures are recorded as blocked runner outcomes through the existing watch result path; no duplicate invocation occurs for already completed trigger evidence. | Focused watch-loop and CLI tests. |
| Watch ledger | Existing watch loop | Completed runner result is recorded under the dedupe key. | Failed runner is recorded as blocked. | Non-dry-run pilot and duplicate rerun. |

### Ownership and Deferred Semantics

1. The built-in Codex runner owns process adaptation only.
2. `ExecutePairflowPlan` remains the only route/delegation authority.
3. The watch loop remains the only ledger/dedupe owner.
4. Remote-only execution remains deferred; this runner is local-control-plane only.

### Implementation Notes

1. Add a config field such as `[plan_watch.runner] backend = "codex"` or an equivalent existing config shape chosen by the implementation.
2. Do not add a CLI `--runner` selector in this slice; backend selection comes from config.
3. Replace the old hook-only runner contract in docs/tests with the config-driven built-in Codex path. If compatibility code remains temporarily, it must be clearly legacy/internal and not part of the documented V1 automation path; `--runner-command` may remain only as a legacy/internal escape hatch and must not be required for the primary non-dry-run command.
4. The runner must avoid shell interpolation of payload fields and must spawn Codex with argv arrays.
5. If Codex cannot provide structured output directly, the built-in runner must fail closed unless it can deterministically map the result into `StructuredAgentRunnerOutput`.
6. The Codex subprocess shape must be derived only from validated runner authority. In the example below, `<repo-path>` comes from validated `payload.repo_path`, the prompt's plan path comes from validated `payload.plan_path`, compact trigger context comes from validated payload fields rather than cwd guesses, chat history, or prose examples, and `<schema-file>` / `<result-file>` are Pairflow-owned runner-generated paths for the bridge output schema and captured Codex final message:

```bash
codex --dangerously-bypass-approvals-and-sandbox exec \
  --cd <repo-path> \
  --output-schema <schema-file> \
  --output-last-message <result-file> \
  '<ExecutePairflowPlan prompt>'
```

7. Documentation must name the config-driven command path, for example:

```bash
pairflow plan watch <plan-path> \
  --repo /Users/felho/dev/pairflow \
  --once
```

### Normative Adapter Requirements

1. Preserve compatibility for the existing bridge where practical, but the normal non-dry-run `plan watch` path must not require `--runner-command` or any repo-local `pairflow-plan-runner` script once config selects the built-in Codex backend.
2. Keep the built-in runner below the bridge boundary: it validates the payload, invokes Codex, and maps Codex output to `StructuredAgentRunnerOutput`; it must not inspect plan/task state to choose lifecycle actions.
3. Derive command arguments as an argv array. The prompt may include compact trigger context, but the payload JSON remains the authority for `plan_path`, `repo_path`, `workflow`, `invocation_id`, and `trigger`.

### Implementation Handoff Notes (Informative)

1. Treat this task as an implementation bubble, not another documentation bubble: source, tests, README, and pilot evidence all need to move together in the same change because the public automation claim depends on the executable path.
2. The L2 acceptance contract is the normative source for the disposable approval-ready pilot requirement; a no-trigger dry-run or a stubbed test is useful supporting evidence but cannot satisfy that completion proof.
3. The L2 acceptance contract is the normative source for blocked-result pilot recording when local Codex cannot produce a structured bridge-compatible envelope.

### Structured Contract Rules

1. Config contract:
   - required supported backend value in this slice: `codex`
   - missing backend: `PLAN_WATCH_RUNNER_CONFIG_MISSING`
   - unsupported backend: `PLAN_WATCH_RUNNER_BACKEND_UNSUPPORTED`
   - config-selected backend is the source of command derivation for the normal path
2. Payload contract:
   - required exact fields: `kind`, `workflow`, `invocation_id`, `plan_path`, `repo_path`, `triggered_at`, `trigger`
   - `kind` must equal `pairflow.execute_pairflow_plan.continuation`
   - unknown fields must be ignored and must not become routing authority
   - malformed or partial payload: `PLAN_WATCH_RUNNER_PAYLOAD_INVALID`
3. Workflow contract:
   - `workflow` must equal `ExecutePairflowPlan`
   - unsupported workflow: `PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED`
4. Plan path contract:
   - the plan path must come from validated `payload.plan_path`
   - missing or unavailable plan path: `PLAN_WATCH_PLAN_PATH_UNAVAILABLE`
   - no Codex invocation occurs when the plan path is unavailable
5. Repo path contract:
   - the repo path must come from validated `payload.repo_path`
   - missing or unavailable repo path: `PLAN_WATCH_REPO_PATH_UNAVAILABLE`
   - no Codex invocation occurs when the repo path is unavailable
6. Codex process contract:
   - Codex must be invoked with the non-interactive `exec` subcommand
   - missing or spawn-failed Codex executable: `PLAN_WATCH_CODEX_UNAVAILABLE`
   - Codex timeout: `AGENT_RUNNER_TIMEOUT`
   - Codex non-zero exit: `AGENT_RUNNER_NON_ZERO_EXIT`
   - non-zero exit output must preserve captured stdout/stderr tail in the blocked result summary or equivalent diagnostic field
   - each process failure maps to `status="blocked"` and must not claim plan progression
7. Output contract:
   - allowed statuses: `settled_checkpoint`, `human_checkpoint`, `blocked`
   - required field: non-empty `reason_code`
   - optional fields and types: `summary` string, `changed_artifacts` string array, `route_ledger_summary` string
   - unknown fields are ignored
   - multiple JSON candidates preserve current parser semantics: the latest valid structured envelope wins
   - malformed or partial output: `AGENT_RUNNER_OUTPUT_INVALID`

### Mirrored Surface Checklist

1. L0 policy runner contract.
2. L1 canonical runner contract matrix.
3. Config documentation/defaults.
4. README examples.
5. Pilot evidence document.
6. Focused runner tests.
7. Live non-dry-run pilot evidence.

## L2 - Acceptance Tests / Evidence

1. Pairflow config supports selecting `codex` as the plan-watch runner backend.
2. Non-dry-run `pairflow plan watch <plan-path>` uses the configured built-in Codex backend as the documented automation path.
3. The primary documented non-dry-run path does not require `--runner-command`; any retained `--runner-command` support is explicitly legacy/internal and not presented as the primary automation contract.
4. The built-in runner validates the bridge payload and rejects malformed payloads without invoking Codex.
5. The built-in runner constructs the Codex process with an argv array and never shell-interpolates payload fields, plan paths, trigger context, schema paths, or result paths.
6. The runner returns bridge-compatible JSON for:
   - settled checkpoint
   - human checkpoint
   - blocked
7. Missing runner config returns `status="blocked"` with `reason_code="PLAN_WATCH_RUNNER_CONFIG_MISSING"` and does not invoke Codex.
8. Unsupported runner backend returns `status="blocked"` with `reason_code="PLAN_WATCH_RUNNER_BACKEND_UNSUPPORTED"` and does not invoke Codex.
9. Missing plan path returns `status="blocked"` with `reason_code="PLAN_WATCH_PLAN_PATH_UNAVAILABLE"` and does not invoke Codex.
10. Missing repo path returns `status="blocked"` with `reason_code="PLAN_WATCH_REPO_PATH_UNAVAILABLE"` and does not invoke Codex.
11. Missing or spawn-failed Codex executable returns `status="blocked"` with `reason_code="PLAN_WATCH_CODEX_UNAVAILABLE"` and an actionable summary.
12. Malformed or partial payload returns `status="blocked"` with `reason_code="PLAN_WATCH_RUNNER_PAYLOAD_INVALID"` before side effects.
13. A syntactically valid payload with any workflow other than `ExecutePairflowPlan` returns `status="blocked"` with `reason_code="PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED"` before side effects.
14. Malformed/partial runner output, unknown status, or invalid optional field types return `status="blocked"` with `reason_code="AGENT_RUNNER_OUTPUT_INVALID"` while preserving the existing latest-valid-envelope parser behavior for duplicate/multiple JSON candidates.
15. Codex timeout returns `status="blocked"` with `reason_code="AGENT_RUNNER_TIMEOUT"` and does not claim plan progression.
16. Non-zero Codex exit returns `status="blocked"` with `reason_code="AGENT_RUNNER_NON_ZERO_EXIT"`, preserves captured stdout/stderr tail in the blocked result summary or equivalent diagnostic field, and does not claim plan progression.
17. The implementation invokes Codex with the non-interactive `exec` subcommand, `--dangerously-bypass-approvals-and-sandbox`, and documents that this is trusted local execution.
18. README no longer presents `pairflow-plan-runner` as a primary path.
19. `docs/local-plan-watch-v1-pilot.md` records a non-dry-run disposable pilot using the built-in Codex runner against an approval-ready linked bubble; a no-trigger dry-run or stubbed test is supporting evidence only and does not satisfy this acceptance item.
20. The pilot records the watch ledger key, invocation id, runner status, runner reason code, changed artifacts if any, and route ledger summary if emitted.
21. If the disposable pilot cannot obtain bridge-compatible structured output from Codex, it records the exact blocked runner status, reason code, and summary instead of claiming successful automation.
22. Rerunning the same disposable approval-ready watch trigger records or reports duplicate suppression without invoking Codex again.
23. Focused tests pass:

```bash
pnpm exec vitest run \
  tests/config/repoConfig.test.ts \
  tests/v11/application/planWatch/agentRunnerBridge.test.ts \
  tests/v11/application/planWatch/planWatchLoop.test.ts \
  tests/cli/planWatchCommand.test.ts
```

24. Runner-specific Codex adapter tests pass.
25. Because this task touches config and runtime activation behavior, run `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, the focused watch tests, `pnpm test`, and `pnpm build`. If any command is skipped, the handoff must state the exact reason and must not describe the repository as fully validated.
