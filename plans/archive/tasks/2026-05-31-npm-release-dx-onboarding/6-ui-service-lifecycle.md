---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_ui_service_lifecycle_v1
task_family_id: ui-service-lifecycle
sequence_key: "6"
task_id: 6-ui-service-lifecycle
title: "Pairflow UI Service Lifecycle CLI"
status: archived
phase: phase6
target_files:
  - "src/cli/index.ts"
  - "src/cli/commands/ui/server.ts"
  - "src/v11/application/uiService/**"
  - "src/v11/infrastructure/ui/server.ts"
  - "src/v11/infrastructure/ui/uiServerAssets.ts"
  - "src/v11/infrastructure/uiService/**"
  - "src/v11/ports/uiServiceProcessStore.ts"
  - "tests/cli/uiServiceCommand.test.ts"
  - "tests/core/uiService/**"
  - "README.md"
  - "docs/site/pages/ui.md"
prd_ref: null
plan_ref: plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 6-ui-service-lifecycle-doc
impl_bubble_id: 6-ui-service-lifecycle-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: Pairflow UI Service Lifecycle CLI

## L0 - Policy

### Goal

Add supported `pairflow ui start`, `pairflow ui stop`, `pairflow ui status`,
and `pairflow ui restart` commands for running the Pairflow UI as a background
local service, while preserving the existing foreground `pairflow ui` behavior.

### Domain / Control Model Summary

1. Business invariant: operators should be able to start, inspect, stop, and
   restart the local UI without guessing which process owns a port or killing
   unrelated processes.
2. Control model: Pairflow-owned PID/state records own background service
   identity; Node process liveness owns whether the recorded process still
   exists; the existing UI server startup code owns HTTP serving and asset
   resolution.
3. Read-path rule: service commands read Pairflow-owned state first, then verify
   the recorded process identity before reporting or mutating lifecycle state.
4. Forbidden fallback: do not stop processes only because they listen on the
   requested port, do not infer service ownership from arbitrary process names,
   and do not make the background lifecycle replace foreground `pairflow ui`.
5. Allowed resolution path: stale Pairflow-owned PID/state records may be
   removed or replaced when process verification proves the recorded process is
   absent or no longer matches the stored identity.
6. Missing-data rule: if state files are missing, malformed, unwritable, or do
   not prove Pairflow ownership of a live process, commands must fail closed or
   report a clear stale/unmanaged state without destructive process actions.
7. Phase boundary: this task owns UI service lifecycle commands only. It must
   not implement skill install, release pilot publication, npm publishing, or
   document-bubble lifecycle behavior.
8. Document-refinement boundary: this document bubble may refine only task,
   plan, progress, and directly related docs artifacts. Target files, L2
   implementation sketches, acceptance checks, and reviewer code findings in
   this artifact are planning context for a later implementation bubble; they
   do not authorize product/runtime/source edits during a
   `review_artifact_type=document` pass.

### Plan Linkage

1. Parent plan gap closed: durable local UI server lifecycle management.
2. Depends on: `1-package-version`.
3. Unlocks / impacts successors: `7-release-pilot` must prove UI lifecycle
   behavior from an installed or packed package context after this task proves
   source-checkout lifecycle behavior.
4. Task-list impact: after this task is implemented and archived, the parent
   plan should advance to `7-release-pilot`.
5. Inherited validation / exit expectation: run default repo validation for CLI
   and runtime source changes plus focused UI lifecycle tests.
6. Document-refinement impact: this pass tightens the approved task contract
   for later implementation without changing product/runtime/source behavior.

### Canonical Contract Anchors

1. Existing source-of-truth anchors:
   - `src/cli/index.ts`
   - `src/cli/commands/ui/server.ts`
   - `src/v11/infrastructure/ui/server.ts`
   - `src/v11/infrastructure/ui/uiServerAssets.ts`
   - `docs/pairflow-ui-prd.md`
   - `README.md`
   - `docs/site/pages/ui.md`
2. Command surface to add or preserve:
   - `pairflow ui` foreground mode remains supported.
   - `pairflow ui start`
   - `pairflow ui stop`
   - `pairflow ui status`
   - `pairflow ui restart`
   - Existing `--port`, `--host`, `--repo`, and `--assets-dir` options remain
     supported where they are meaningful for startup.
3. Canonical ownership rule: Pairflow background service stop/restart must use
   Pairflow-owned PID/state identity, not port-only process ownership.
4. Canonical state root: use a deterministic Pairflow-owned local state
   location under the repository or established Pairflow state directory; do
   not write global state unless an existing local convention already requires
   it.
5. Canonical status output: report exactly one lifecycle status from the
   task-owned taxonomy: `running`, `stopped`, `stale`, `invalid`, or
   `unmanaged`; include URL and PID when known and safe to trust.

### Scope Reality / Shape Proof

1. Existing `pairflow ui` starts the UI server in the foreground and prints
   `Pairflow UI server listening on <url>`.
2. Existing UI server support already resolves assets from source checkout and
   package-relative candidates.
3. Existing CLI dispatch is centralized in `src/cli/index.ts`; this task should
   extend the existing `ui` command group without creating a second UI command.
4. Hidden scope ruled out: changing UI rendering, creating a daemon manager,
   changing package publish automation, or killing arbitrary processes by port.
5. Existing contributor helper scripts such as `pnpm ui:start`,
   `pnpm ui:stop`, `pnpm ui:restart`, `pnpm ui:status`, and
   `scripts/ui-server.sh` are preserved as contributor conveniences in this
   task. They are not the new canonical CLI lifecycle surface, and this task
   must not rewrite their tmux/pgrep behavior unless an existing focused test
   proves a direct regression caused by the new command parser.
6. Source/package context split: this implementation task must prove lifecycle
   behavior from the source checkout. Installed-package proof remains successor
   work in `7-release-pilot`, unless a packaging boundary change made directly
   by this task needs a local package-content inspection to avoid regressions.

### Refactor Classification

1. Classification: feature with bounded CLI/process/filesystem side effects.
2. Classification triggers: new public CLI subcommands, process lifecycle
   ownership, durable local state, and status output contracts.
3. Architecture checks: use typed application/infrastructure boundaries for
   service state, process inspection, process spawning/stopping, and output
   rendering.
4. Public helper surface action: keep helpers in the narrowest correct UI
   lifecycle scope; do not promote to shared unless another lane already
   consumes the same process/state abstraction.

### Authority Boundary Map

1. Authority producer: `pairflow ui start` creates the background process and
   writes Pairflow-owned service state.
2. Stored authority: PID/state file with enough identity data to distinguish
   Pairflow-owned UI processes from unrelated processes.
3. In-scope consumers: `ui status`, `ui stop`, `ui restart`, operator docs,
   release pilot.
4. Explicit out-of-scope consumers: skill install, bubble lifecycle, release
   automation, docs site deploy.
5. Export surfaces closed in this phase: CLI command output, PID/state file
   semantics, and process ownership behavior.

### Capability Closure

| Capability Claim | Closure Classification | Activation Trigger | Repo-Provided Parts | External Prerequisites | Success Output Contract | Failure Output Contract | Last-Mile Proof |
|---|---|---|---|---|---|---|---|
| Start UI in background | end_to_end | `pairflow ui start --port <port>` | command parser, spawn logic, state writer, URL rendering | available port and writable state dir | prints running URL, PID, and state path or JSON equivalent | non-zero with port/state/process reason and no false running claim | focused CLI test with isolated state |
| Report service status | end_to_end | `pairflow ui status` | state reader, process verifier, status renderer | readable state dir or absent state | reports running/stopped/stale/unmanaged with URL/PID when known | non-zero only for unreadable/malformed critical state when status cannot be trusted | focused stale/running status tests |
| Stop owned service | end_to_end | `pairflow ui stop` | process verifier, signal/termination flow, state cleanup | process exists and is owned by recorded state | reports stopped and clears or marks state | refuses unmanaged or mismatched process; does not kill by port alone | isolated spawned-process test |
| Restart owned service | end_to_end | `pairflow ui restart` | stop then start orchestration with verified ownership | same as stop/start | reports new PID and URL | fail-closed when old process cannot be proven owned or new start fails | focused restart test |
| Preserve foreground UI | end_to_end | `pairflow ui` without lifecycle subcommand | existing foreground server path | available port | existing URL print behavior preserved | existing startup errors preserved | regression test for foreground dispatch |

### In Scope

1. Add `ui start|stop|status|restart` command parsing and help.
2. Preserve foreground `pairflow ui` behavior and existing startup options.
3. Persist PID/state for background UI services with enough identity fields to
   verify ownership before stop/restart.
4. Detect stale PID/state records and report or clean them deterministically.
5. Print URL/status/PID/state information in text output and structured JSON if
   the existing CLI output model supports JSON for this command family.
6. Add focused tests for parsing, state handling, stale records, stop safety,
   restart behavior, and foreground compatibility.
7. Update README and UI docs to describe supported background lifecycle usage.
8. Keep source-checkout proof and installed-package proof separate: this task
   documents and tests the source-checkout lifecycle; `7-release-pilot` proves
   the same lifecycle after package installation.

### Out of Scope

1. Changing the UI app itself or its routes.
2. Killing unrelated processes by port.
3. Implementing cross-machine or remote UI lifecycle management.
4. Adding automatic browser launch unless already supported by the existing UI
   command contract.
5. Implementing release pilot proof or npm publish activation.
6. Changing Pairflow bubble lifecycle semantics.
7. Replacing or deprecating existing `pnpm ui:*` helper scripts or
   `scripts/ui-server.sh`.
8. Proving installed npm package execution of `pairflow ui start|stop|status|restart`;
   that is successor scope for `7-release-pilot`.

### Safety Defaults

1. `pairflow ui` remains foreground mode.
2. `pairflow ui start` must fail clearly if an owned service is already running,
   unless restart semantics are explicitly requested through `restart`.
3. `pairflow ui stop` must refuse to kill a process when stored identity does
   not match the live process.
4. Stale state cleanup is allowed only after process absence or identity
   mismatch is proven.
5. Status output must distinguish owned running service, stopped/absent state,
   stale state, invalid state, and unmanaged port occupancy.

## L1 - Contract

### 0a) Canonical Contract Preservation

| Surface | Preserved Contract | Required Behavior | Priority | Status |
|---|---|---|---|---|
| Foreground UI | `pairflow ui` starts foreground server and prints URL | No lifecycle subcommand means existing behavior | P1 | required-now |
| UI startup options | Existing `--host`, `--port`, `--repo`, `--assets-dir` | Startup path still accepts supported options | P1 | required-now |
| Process ownership | Pairflow-owned state owns stop/restart authority | Stop/restart verify PID identity before signal | P1 | required-now |
| Stale state | Stale PID/state is not running proof | Status reports stale; start/restart may clean deterministically | P1 | required-now |
| Port safety | Port occupancy is not ownership | Do not kill by port alone | P1 | required-now |

### 0b) Branch Inventory

| Branch | Expected Behavior | Risk If Wrong | Test / Proof |
|---|---|---|---|
| `ui` foreground | Existing server path runs | Regression in established workflow | CLI dispatch regression |
| `ui start` absent state | Starts background process and writes state | No durable owner | focused start test |
| `ui start` owned running | Refuses duplicate or reports already running | Duplicate servers | owned-running test |
| `ui start` stale state | Cleans/replaces stale state only after proof | False stale cleanup | stale-start test |
| `ui status` absent state | Reports stopped/not running | Misleading running claim | status test |
| `ui status` owned running | Reports running URL/PID | Poor operator UX | status test |
| `ui status` stale | Reports stale and identity evidence | Hidden broken state | stale test |
| `ui status` malformed state | Reports invalid with non-zero exit and no process signal | Unsafe destructive recovery | invalid-state test |
| `ui status` unmanaged port | Reports unmanaged when detectable and never claims ownership | Port-only ownership drift | unmanaged-port test |
| `ui stop` owned running | Signals owned process and clears/marks state | Orphan process | stop test |
| `ui stop` mismatched PID | Refuses to kill | Data/process loss | safety test |
| `ui restart` owned running | Stops owned process then starts new one | Duplicate/stale process | restart test |
| malformed state | Fail closed or report invalid state without destructive action | Unsafe mutation | parser test |

### 0c) Precondition And Side-Effect Boundary

| Precondition | Side Effect Allowed Only After | Failure Behavior |
|---|---|---|
| Args parse and lifecycle subcommand resolved | Any process spawn/signal/state write | Print validation error, exit non-zero |
| State path resolved under approved local state root | State write/delete | Fail before writes |
| Existing state parsed or classified stale/invalid | Start replacement or status report | Fail closed for untrusted destructive actions; malformed state is `invalid` |
| PID identity matches stored Pairflow UI process | Stop signal | Refuse stop/restart of mismatched process |
| Start process reports or can derive listening URL | Running success output | Do not claim success without PID/URL/state proof |

### 0d) Canonical Contract Matrix

| Contract Element | Classification | Owner | Required Behavior | Success / Exit Contract | Side Effects | Required Tests |
|---|---|---|---|---|---|---|
| Foreground mode | preserved canonical | existing UI CLI/server | `pairflow ui` with no lifecycle subcommand uses the existing foreground server path | success/error behavior remains the existing server command contract | no background state write | foreground dispatch regression |
| Lifecycle subcommands | canonical | CLI dispatch | accepts only `start`, `stop`, `status`, `restart`; unknown positional UI subcommands fail before server start | invalid subcommand exits non-zero | no process or state mutation | parser tests |
| `start` | canonical | UI service lifecycle app layer | absent/stopped/stale state may start a new owned background service; owned running state is not duplicated | success prints/text-JSON `status=running`, URL, PID, state path; failures exit non-zero with reason code | spawn child and write state only after preflight | start, owned-running, stale-start |
| `status` | canonical | UI service lifecycle app layer + renderer | classifies state as `running`, `stopped`, `stale`, `invalid`, or `unmanaged` | normal status exits zero except `invalid`, which exits non-zero because state cannot be trusted | no process signal; stale cleanup only when an explicit cleanup/start path owns it | running/stopped/stale/invalid/unmanaged tests |
| `stop` | canonical guarded mutation | UI service lifecycle app layer | sends a signal only to a process whose live identity matches the Pairflow state record | success reports `status=stopped`; mismatch/unmanaged/invalid exits non-zero | verified process signal plus state cleanup/marking | owned-stop and mismatched-PID tests |
| `restart` | canonical guarded mutation | UI service lifecycle app layer | performs verified stop then start; stale state may be replaced only after stale proof | success reports new `status=running`, URL, PID, state path; old-process mismatch exits non-zero | verified signal, state cleanup, child spawn, state write | restart and stale-restart tests |
| State identity | canonical | UI service lifecycle app layer | stores PID plus required identity verifier fields from the data contract; weak records cannot authorize stop/restart | weak/malformed identity classifies as `invalid` or non-destructive `stale`, never owned running | no destructive action from weak identity | state schema and safety tests |
| Process verification | guard | infrastructure process adapter | verify live process before stop/restart using required identity fields | mismatch reason exits non-zero for stop/restart and may report `stale` or `unmanaged` for status | no signal on mismatch | stop/restart safety tests |
| Stale cleanup | guard | lifecycle app layer | clean or replace only proven stale Pairflow-owned records | status may report stale without cleanup; start/restart may clean as part of replacement | state cleanup only, no process signal | stale tests |
| Port occupancy | forbidden fallback | lifecycle app layer | report `unmanaged` when a requested/status port is occupied but Pairflow ownership is not proven; never stop by port alone | status/start failure names `unmanaged_port` or equivalent reason | no process signal | unmanaged-port/status tests |
| Output status names | canonical | CLI renderer | text and JSON use the same status taxonomy and reason-code meanings | JSON success writes machine-readable object only on stdout when supported | rendering only | renderer/docs tests |

### 0d.1) Status And Reason Taxonomy

Canonical lifecycle statuses:

| Status | Meaning | Exit Behavior | Mutating Commands |
|---|---|---|---|
| `running` | State record is parseable, process is live, and required identity fields match | zero for `status`; zero for successful `start`/`restart` | `stop` and `restart` may act after identity proof |
| `stopped` | No state record exists, or a trusted state record was cleanly stopped and cleared/marked | zero for `status`; `stop` may report already stopped without signal | `start` may create a new service |
| `stale` | State record is parseable and Pairflow-owned, but the recorded process is absent or no longer the same process | zero for `status`; start/restart may replace only after stale proof | no process signal; state cleanup/replacement only |
| `invalid` | State record is missing required fields, malformed, unreadable, or internally contradictory | non-zero for commands that need trusted state, including `status` when no reliable classification can be rendered | no process signal; operator must remove or repair state explicitly unless implementation provides a scoped invalid-state cleanup flag |
| `unmanaged` | A port or live process may exist, but Pairflow state does not prove ownership | zero for informational `status` when detectable; non-zero for `start` if it blocks binding, and non-zero for `stop`/`restart` | never signal the process |

Canonical reason-code families:

1. `ui_service_already_running`
2. `ui_service_started`
3. `ui_service_stopped`
4. `ui_service_not_running`
5. `ui_service_stale_state`
6. `ui_service_invalid_state`
7. `ui_service_unmanaged_port`
8. `ui_service_identity_mismatch`
9. `ui_service_start_failed`
10. `ui_service_stop_failed`

Text output may be human-oriented, but JSON output, when supported, must include
at least `status`, `reason_code`, `pid`, `url`, `state_path`, and
`state_version` fields when those values are known.

### 0e) Data Contract

The durable state record must include at least:

```ts
type UiServiceState = {
  pid: number;
  repoPath: string;
  host: string;
  port: number;
  url: string;
  startedAt: string;
  command: string[];
  cwd: string;
  executablePath: string;
  processStartTime: string;
  identityToken: string;
  stateVersion: 1;
};
```

`cwd`, `executablePath`, `processStartTime`, and `identityToken` are required
verifier fields for stop/restart authority. If the current platform cannot
re-read one of those fields reliably, the implementation must substitute an
equally strong recorded-and-reread verifier and update this data contract in
the same task. Weak records that contain only PID/port/repo data must not
authorize `stop` or `restart`.

### 0f) Ownership And Deferred Semantics

1. This task owns local background UI lifecycle only.
2. It records and interprets Pairflow-owned service state, but it does not own
   external process managers, launch agents, or remote UI sessions.
3. It may report unmanaged port occupancy when detectable, but it must not
   interpret that as owned service authority.
4. Existing `pnpm ui:*` helper scripts remain contributor shortcuts outside the
   canonical CLI lifecycle contract for this task.
5. Release pilot owns installed-package proof that these commands work after
   package installation.

### 0g) Mirrored Surface Checklist

Keep these surfaces aligned when the lifecycle contract changes:

1. L0 command surface.
2. Canonical Contract Matrix.
3. Data Contract.
4. Branch Inventory.
5. CLI help/output tests.
6. Status And Reason Taxonomy.
7. README and docs site UI page.

### 0h) Authority Fan-out

| Role | Status | Surface | Responsibility | Guard / Evidence |
|---|---|---|---|---|
| producer | present | `pairflow ui start` | creates the background process and writes Pairflow-owned state | writes required `UiServiceState` verifier fields before claiming running |
| validator/gate | present | lifecycle application layer | classifies state as `running`, `stopped`, `stale`, `invalid`, or `unmanaged` | Status And Reason Taxonomy is the canonical gate |
| persistence/replay | present | UI service state store | stores and reloads PID, URL, repo, command, and verifier fields | weak or malformed records classify as `invalid` and cannot authorize stop/restart |
| execution | present | process infrastructure adapter | spawns, verifies, and signals the UI process | signal only after PID plus identity verifier match |
| workflow/orchestration | present | `start`, `stop`, `status`, `restart` planners | sequences state read, process verification, state write/cleanup, and output | no raw port-only kill path |
| read/presentation | present | CLI text/JSON renderer | reports status, reason code, URL, PID, state path, and state version | text and JSON mirror the same status taxonomy |
| recovery/cleanup | present | stale-state cleanup path | cleans/replaces only proven stale Pairflow-owned records | stale proof required; invalid state needs explicit repair/cleanup support if implemented |
| external/integration | present | README, docs site, release pilot | documents local usage; successor proves installed-package behavior | release pilot remains the external package proof owner |
| adjacent helper scripts | present | `pnpm ui:*` and `scripts/ui-server.sh` | contributor shortcuts preserved outside canonical CLI lifecycle | no rewrite unless focused parser regression forces minimal compatibility fix |
| remote UI management | absent | none | remote/background service management across machines | out of scope |
| daemon/process manager integration | absent | none | launchd/systemd/pm2 style supervisor | out of scope |
| unknown authority roles | absent | none | no hidden owner is expected | any new authority role requires task refinement |

### 0i) Closure Budget

| Closure Bucket | Status | Evidence / Boundary |
|---|---|---|
| CLI lifecycle subcommands | present | `start`, `stop`, `status`, `restart` are the only added subcommands |
| Foreground preservation | present | no-subcommand `pairflow ui` stays on existing foreground server path |
| State identity schema | present | Data Contract requires verifier fields beyond PID/port |
| Process verification | present | stop/restart require live identity match before signal |
| Status/output taxonomy | present | canonical statuses and reason-code families are specified |
| Stale/invalid/unmanaged handling | present | stale cleanup is bounded; invalid/unmanaged are non-destructive |
| Focused tests/docs | present | branch inventory and acceptance tests name the required proof surfaces |
| Installed-package proof | deferred | owned by `7-release-pilot`, not this implementation task |
| Remote lifecycle | absent | explicitly out of scope |
| UI rendering/routes | absent | explicitly out of scope |
| Helper-script replacement | absent | preserved unless narrow regression requires compatibility edit |
| Unknown closure | absent | no unidentified implementation closure remains |

Closure decision:

```yaml
closure_bucket_audit:
  authority_producer:
    status: present
    evidence: pairflow ui start writes the Pairflow-owned background service state.
  shared_contract:
    status: present
    evidence: Status And Reason Taxonomy plus UiServiceState schema define the shared command contract.
  internal_execution_consumers:
    status: present
    evidence: stop and restart consume the process-verification contract before signaling.
  workflow_orchestration_consumers:
    status: present
    evidence: start, stop, status, and restart planners sequence state and process checks.
  read_model_consumers:
    status: present
    evidence: text/JSON renderers and docs consume the canonical status taxonomy.
  persisted_authority_or_schema:
    status: present
    evidence: versioned UiServiceState persists PID, URL, command, repo, and verifier fields.
  cleanup_recovery_consumers:
    status: present
    evidence: stale cleanup and restart replacement consume trusted stale-state proof.
  external_integration_consumers:
    status: deferred
    evidence: installed-package proof is owned by 7-release-pilot.
split_required: false
collapsed_closures:
  - cli_lifecycle_subcommands
  - state_identity_schema
  - process_verification
  - status_output_taxonomy
deferred_closures:
  - installed_package_ui_lifecycle_proof: 7-release-pilot
absent_evidence:
  - remote_lifecycle: out_of_scope
  - ui_rendering_routes: out_of_scope
  - helper_script_replacement: preserved_out_of_scope
final_split_resolution: no_split
```

### 0j) Bounded Task Shape

```yaml
primary_task_shape: authority_producer
secondary_task_shape:
  - consumer_family_alignment
  - fail_closed_hardening
  - activation_or_read_model
decomposed_closures:
  - command_dispatch_and_parsing
  - ui_service_state_schema
  - process_spawn_verify_stop
  - status_and_reason_rendering
  - focused_tests_and_docs
adjacent_consumer_family_scan:
  package_release_pilot: deferred_to_7-release-pilot
  legacy_helper_scripts: preserved_out_of_scope
  ui_routes_and_rendering: absent_out_of_scope
  bubble_lifecycle: absent_out_of_scope
  remote_execution: absent_out_of_scope
split_decision: no_split
single_task_allowed: true
single_task_rationale: >
  Command parsing, service state identity, process verification, and output
  semantics form one safety contract. Splitting them would allow partial
  lifecycle behavior that can claim ownership without safe stop/restart proof.
split_triggers:
  - replacing scripts/ui-server.sh
  - changing UI routes/rendering
  - adding remote lifecycle support
  - introducing a general process-manager abstraction
```

### 0k) Complexity-Risk Record

```yaml
risk_score: medium
axes:
  authority_risk: medium
  surface_spread: medium
  identity_join_risk: high
  activation_coupling: medium
  prerequisite_risk: low
  acceptance_multiplicity: medium
  integration_strength: medium
  distance: local
  volatility: medium
  authority_fan_out: medium
  destructive_side_effect_risk: medium
split_decision: no_split
single_task_allowed: true
single_task_implementation_closure_proof:
  - target files are bounded to one CLI family and lifecycle-specific modules
  - process signal side effects are guarded by required identity verification
  - foreground compatibility and unmanaged-port safety have explicit tests
  - release-pilot package proof is deferred and does not block local closure
top_risks:
  - risk: pid_reuse_or_identity_mismatch
    mitigation: required verifier fields and no signal on mismatch
  - risk: foreground_ui_regression
    mitigation: no-subcommand foreground regression test
  - risk: state_taxonomy_drift
    mitigation: canonical status taxonomy mirrored in CLI/docs/tests
  - risk: helper_script_scope_creep
    mitigation: helper scripts preserved out of scope
  - risk: port_only_ownership_drift
    mitigation: unmanaged port is diagnostic only
```

### 0l) Scoped Invariant And Review Fence

```yaml
applies_to:
  - pairflow ui foreground dispatch preservation
  - pairflow ui start/stop/status/restart local lifecycle behavior
  - Pairflow-owned UI service state schema and verifier fields
  - process spawn/verify/signal adapters for the UI service only
  - text/JSON status output for the UI lifecycle commands
does_not_apply_to:
  - UI route/rendering changes
  - bubble lifecycle actions or review policy behavior
  - skill install behavior
  - release automation or npm publish activation
  - remote UI lifecycle
  - legacy pnpm ui helper replacement
proof_surface:
  - focused CLI parser/dispatch tests
  - state parser/classifier tests
  - process verification and stop/restart safety tests
  - README and docs site UI page updates
deferred_or_external_surfaces:
  - installed-package lifecycle proof: 7-release-pilot
  - GitHub/npm/public release activation: out_of_scope
reviewer_non_goals:
  - do not request UI rendering improvements
  - do not request broad process-manager abstractions
  - do not request port-only stop behavior
  - do not request helper-script rewrites without direct regression evidence
edge_family_routes:
  stale_state: lifecycle_status_stale_non_destructive
  invalid_state: lifecycle_status_invalid_fail_closed
  unmanaged_port: lifecycle_status_unmanaged_no_signal
  owned_running: lifecycle_status_running_verified_identity
```

### 0m) Mandatory Gate Output Audit

| Gate | Result | Evidence |
|---|---|---|
| Execution metadata | pass | `task_id`, filename, plan tracker, `doc_bubble_id`, and archive group are deterministic and routeable. |
| Control-model readiness | pass | State/process ownership, read path, forbidden fallback, allowed stale cleanup, and missing-data behavior are explicit. |
| Closed-contract drift | pass | Foreground `pairflow ui` and package asset ownership are preserved; new background lifecycle is additive. |
| Contract-dense task gate | pass | Canonical Contract Matrix, Status And Reason Taxonomy, Data Contract, and Mirrored Surface Checklist provide a single aligned contract set. |
| Refactoring guidance | pass | This is a bounded feature with typed application/infrastructure boundaries, not a broad architecture refactor. |
| Target-file reality | pass | Target files identify existing UI command/server anchors and new lifecycle-specific module families without broad UI infrastructure globs. |
| Capability closure | pass | Each claimed command has activation trigger, repo-provided parts, output contract, failure contract, and focused proof. |
| Authority fan-out | pass | Producer, validator/gate, persistence/replay, execution, orchestration, read/presentation, recovery/cleanup, external/integration, adjacent helper, absent remote/daemon roles are inventoried with present/absent status. |
| Closure budget | pass | Present, absent, and deferred buckets are explicit; `split_required=false` and `final_split_resolution=no_split`. |
| Bounded task shape | pass | Primary/secondary shapes, decomposed closures, adjacent consumer-family scan, split decision, and split triggers are materialized. |
| Scoped invariant/review fence | pass | Applies-to, does-not-apply-to, proof surfaces, deferred/external surfaces, reviewer non-goals, and edge-family routes are explicit. |
| Complexity-risk | pass | Risk score, axis values, split decision, single-task allowance, and implementation-closure proof are recorded. |
| Remaining-task viability | pass | Parent plan can advance to `7-release-pilot` after this task archives; installed-package proof is explicitly deferred there. |
| Final split/no-split | no split | One cohesive lifecycle contract must land atomically; explicit split triggers are fenced above. |

## L2 - Implementation Sketch

### Suggested Architecture

1. Keep CLI parsing in the existing `ui` command group.
2. Add an application layer for lifecycle decisions:
   - parse options into a typed command object
   - resolve service state path
   - classify current state using the canonical status taxonomy
   - plan start/stop/restart side effects
3. Add infrastructure adapters for:
   - reading/writing/removing service state
   - spawning the background server process
   - verifying and stopping a process
4. Reuse the existing UI server startup implementation for the child process
   rather than duplicating HTTP server logic.
5. Keep output rendering deterministic and tested.

### Acceptance Tests

1. `pairflow ui` without subcommand still dispatches to foreground server help or
   startup behavior as currently expected.
2. `pairflow ui start --port <free-port>` writes state and reports URL/PID.
3. `pairflow ui status` reports the owned running service from state.
4. `pairflow ui stop` stops only the verified owned process and clears or marks
   state.
5. Stale PID state is reported as stale and can be replaced by `start`.
6. Mismatched PID identity is not stopped by `stop` or `restart`.
7. `restart` performs verified stop then start and reports the new PID/URL.
8. Invalid subcommands and malformed state produce clear non-zero failures.
9. Unmanaged port occupancy is reported without claiming ownership and without
   sending a process signal.
10. README and docs site UI page show foreground and background lifecycle usage.

### Validation Commands

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. Focused CLI/UI lifecycle tests.
5. `pnpm test`
6. `pnpm build`

### Handoff Notes

1. Do not use port-only kill as a shortcut for stop/restart.
2. Preserve the existing foreground command path.
3. If process identity cannot be verified strongly enough to avoid PID reuse
   risk, fail closed and document the stale/unmanaged state instead of sending
   a signal.
4. Keep the state schema small and versioned so release pilot can inspect it
   deterministically.
