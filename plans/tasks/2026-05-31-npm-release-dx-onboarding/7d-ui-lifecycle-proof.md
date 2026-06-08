---
artifact_type: task
artifact_id: task_npm_release_dx_onboarding_ui_lifecycle_proof_v1
task_family_id: ui-lifecycle-proof
sequence_key: "7d"
task_id: 7d-ui-lifecycle-proof
title: "UI Lifecycle Proof"
status: completed
phase: phase7
target_files:
  - "plans/tasks/2026-05-31-npm-release-dx-onboarding/7d-ui-lifecycle-proof.md"
  - "plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md"
prd_ref: null
plan_ref: plans/2026-05-31-npm-release-dx-onboarding-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-31-npm-release-dx-onboarding
---

# Task: UI Lifecycle Proof

## L0 - Policy

### Goal

Prove that `pairflow ui start|status|restart|stop` works from both the built
source-checkout CLI and a packed/isolated installed `@pairflow/cli` package
layout, using Pairflow-owned PID/state files, packaged UI assets, JSON status
contracts, and bounded cleanup without mutating the operator's real Pairflow UI
service state.

### Domain / Control Model Summary

1. Business invariant: UI lifecycle readiness must be proven through the same
   durable process/state ownership model operators use, not by foreground-only
   startup or source-checkout assumptions.
2. Control model: `pairflow ui start` owns background process creation and
   writes `.pairflow/runtime/ui-service.json` under the selected repo path;
   `status`, `restart`, and `stop` consume that state and verify process
   identity before reporting or signaling; packaged UI asset resolution owns
   whether an installed package can serve the UI without source checkout assets.
3. Read-path rule: proof must inspect JSON lifecycle outputs, state paths, PIDs,
   URLs, process transitions, and asset-root behavior from isolated temp repo
   roots. Installed-package proof must run the command from the isolated npm
   prefix binary, not from repo-local `dist`.
4. Forbidden fallback: do not treat `pnpm ui:*` helper scripts, foreground
   `pairflow ui`, port-open checks alone, repo-local `ui/dist` from an installed
   package run, or a source-checkout command as installed-package lifecycle
   proof. Do not stop or restart services whose Pairflow-owned state was not
   created by this proof.
5. Allowed resolution path: a local tarball produced by `npm pack` and installed
   into a temporary npm prefix may stand in for public npm registry
   distribution before `7f-registry-install-smoke`. Deterministic same-authority
   cleanup is allowed for state/processes created inside this proof run.
6. Missing-data rule: if the source or installed lifecycle command cannot
   start, report running status, restart, stop, prove packaged asset use, or
   clean up its temp state/process, record the task as blocked and route to a
   follow-up implementation task. Do not repair runtime/source defects inside
   this proof task.
7. Phase boundary: this task owns UI lifecycle proof only. It must not edit
   CLI/runtime/UI source, package metadata, docs, workflows, GitHub/npm
   settings, or real operator service state.

### Plan Linkage

1. Parent plan gap closed: missing installed-package UI lifecycle proof.
2. Depends on: `6-ui-service-lifecycle` and `7a-package-release-proof`.
3. Unlocks / impacts successors:
   - `7e-release-go-no-go` consumes UI lifecycle readiness and any blocker
     status.
   - `7f-registry-install-smoke` remains separate and must not be implied by
     local tarball install proof.
4. Task-list impact: after this task is proven and archived, the parent plan
   can proceed to final release GO/NO-GO aggregation.
5. Exit expectation: record exact commands, tool versions, build/pack identity,
   source-checkout lifecycle JSON, installed-package lifecycle JSON, state
   paths, URLs, PIDs, packaged asset boundary proof, cleanup status, and
   successor handoff notes in this task or the parent plan.

### Canonical Contract Anchors

1. UI CLI/runtime surfaces:
   - `src/cli/commands/ui/server.ts`
   - `src/v11/application/uiService/uiServiceLifecycle.ts`
   - `src/v11/application/uiService/uiServiceLifecycleTypes.ts`
   - `src/v11/application/uiService/uiServiceLifecycleCommand.ts`
   - `src/v11/infrastructure/uiService/nodeUiServiceProcessStore.ts`
   - `src/v11/ports/uiServiceProcessStore.ts`
2. UI serving and asset surfaces:
   - `src/v11/infrastructure/ui/server.ts`
   - `src/v11/infrastructure/ui/uiServerAssets.ts`
   - `ui/dist/**`
   - `package.json` `files`
3. Existing proof/source surfaces:
   - `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/6-ui-service-lifecycle.md`
   - `plans/archive/tasks/2026-05-31-npm-release-dx-onboarding/7a-package-release-proof.md`
4. Successor proof surfaces:
   - `7e-release-go-no-go` release readiness evidence
   - `7f-registry-install-smoke` public registry install smoke

### Scope Reality / Shape Proof

1. Prior tasks already implemented `pairflow ui start|status|restart|stop`,
   PID/state ownership, stale/unmanaged status taxonomy, JSON lifecycle output,
   foreground UI compatibility, and package UI asset inclusion.
2. `7a-package-release-proof` proved the package contains `ui/dist/**`, but it
   did not run the installed package UI lifecycle.
3. This task converts those source/package claims into lifecycle execution
   evidence from source-checkout build output and packed/installed package
   layout.
4. This task is proof-only. It may inspect package/runtime/source anchors and
   isolated temp outputs, but it may edit only task/plan evidence surfaces.
5. If proof discovers a source/runtime/package/UI asset defect, stop and route
   to a follow-up implementation task before `7e` consumes UI readiness.

### Refactor Classification

1. Classification: release proof / operational validation.
2. Classification triggers: no planned architecture refactor and no
   implementation source edits in this task.
3. Architecture checks: N/A for the proof-only task.
4. Public helper surface action: no helper API surface is expected or allowed.

### Complexity Risk and Split Decision

1. `risk_score`: 5 after proof-only narrowing.
2. Axis scores:
   - `authority_risk`: 0. The task does not change UI lifecycle or package
     authority; it verifies existing authorities.
   - `surface_spread`: 1. The proof reads package, UI CLI output, state files,
     process IDs, HTTP status, and temp filesystem surfaces, but editable
     surfaces are limited to task/plan evidence.
   - `identity_join_risk`: 1. The installed command must spawn and later stop a
     process whose state identity belongs to the isolated proof repo.
   - `activation_coupling`: 1. Background processes and ports are activated,
     but only in temporary proof roots with deterministic cleanup.
   - `prerequisite_risk`: 1. Local port availability and process permissions may
     fail and must be recorded without mutating real service state.
   - `acceptance_multiplicity`: 1. The task proves source lifecycle,
     installed-package lifecycle, packaged asset use, and cleanup as one UI
     lifecycle readiness proof.
3. `split_decision`: `single_task_allowed: yes` because every closure is
   proof-only and source/runtime fixes are forbidden.
4. `split_required_if`: any package/runtime/source defect, UI source change,
   workflow update, public registry publish proof, or real operator service
   mutation is required.

### Authority Fan-out Scan

| Bucket | Status | Boundary | Evidence |
|---|---|---|---|
| producer | present | read-only | Built source CLI and installed package produce lifecycle command behavior; this task does not edit them. |
| validator/gate | present | read-only | JSON output parsing, HTTP probes, state file checks, and cleanup checks validate readiness. |
| persistence/replay | present | evidence-only | Evidence block stores commands, paths, outputs, PIDs, URLs, and cleanup status. |
| execution consumers | present | current-task proof | `pairflow ui start|status|restart|stop` is executed in source and installed contexts. |
| workflow/orchestration | absent | N/A | No GitHub workflow or Pairflow bubble lifecycle command is executed. |
| read/presentation | present | evidence-only | Task/plan evidence presents readiness and blockers for `7e`. |
| recovery/cleanup | present | bounded | Temp UI service processes, state files, temp prefix, temp repo roots, and npm cache cleanup are required. |
| external/integration | present | deferred | Public npm registry install is deferred to `7f`; this task uses a local tarball stand-in. |

### Closure-Budget Gate

| Closure Bucket | Status | Boundary | Evidence / Decision |
|---|---|---|---|
| authority_producer | absent | N/A | No UI lifecycle, package, runtime, or docs authority is changed. |
| shared_contract | present | current-task evidence contract | Lifecycle JSON fields and cleanup status are current-task proof contracts. |
| internal_execution_consumers | present | current-task proof | Source and installed `pairflow ui` lifecycle commands are executed. |
| workflow_orchestration_consumers | absent | N/A | No workflow activation or publish guard state changes. |
| read_model_consumers | present | evidence-only | `7e` consumes recorded UI lifecycle readiness evidence. |
| persisted_authority_or_schema | absent | N/A | No production runtime schema or source authority changes. Temp `.pairflow/runtime/ui-service.json` is proof-local only. |
| cleanup_recovery_consumers | present | bounded | Temporary UI service processes and state roots are cleaned up or recorded with retained reason. |

1. `split_required`: no after proof-only narrowing.
2. Intentionally collapsed closures: source lifecycle proof, installed-package
   lifecycle proof, packaged asset proof, state/process identity proof, and
   cleanup proof are collapsed because they all validate the same UI lifecycle
   capability for `7e`.
3. Explicitly deferred closures: runtime/source fixes, docs/source updates, real
   long-lived UI service management, real npm publish, and public registry
   install smoke.
4. Unknown buckets: none. Any newly discovered repo-owned mutation need
   converts this task to blocked and requires a follow-up task.

### Bounded-Task-Shape Gate

1. Primary shape: `activation_or_read_model`, limited to UI lifecycle evidence
   production.
2. Secondary shape: none. UI lifecycle, package, and asset authorities are
   inspected, not changed.
3. Decomposed closures:
   - local build/pack setup,
   - source-checkout lifecycle proof,
   - packed/installed lifecycle proof,
   - packaged UI asset proof,
   - state/PID/URL JSON proof,
   - stop/restart cleanup proof,
   - successor handoff evidence.
4. Adjacent call-site / consumer-family scan result:
   - package metadata and bin entry consumers: consumed through installed
     package command execution; no source mutation owned here.
   - UI asset consumers: current task proves installed package can serve
     packaged `ui/dist`; no UI rendering changes are owned.
   - skill install consumer: already proven by `7c`; not reopened here.
   - docs consumer: already proven by `7b`; this task must not claim public
     Pages readiness.
   - release-pilot decision consumer: known and deferred to
     `7e-release-go-no-go`; current task only records evidence.
   - public npm registry consumer: known and deferred to
     `7f-registry-install-smoke`.
5. Adjacent scan unknowns: none for this proof-only scope.
6. Shape mix safety: all closures are validation/evidence production, share
   temporary UI lifecycle contexts, and do not mutate source contracts.
7. Split trigger: any repo-owned source/runtime/package fix, public registry
   activation, or real operator UI service mutation.

### Capability Closure

| Capability Claim | Closure Classification | Activation Trigger | Entrypoint | Configuration Owner | Operator/User Path | Repo-Provided Parts | External Prerequisites | Success Output Contract | Failure Output Contract | Last-Mile Proof |
|---|---|---|---|---|---|---|---|---|---|---|
| Run source-checkout UI lifecycle | end_to_end | invoke built source CLI against temp repo root | `node dist/cli/index.js ui start|status|restart|stop` | source build output and temp repo state | isolated source lifecycle proof commands | CLI lifecycle implementation, UI server, source `ui/dist` assets | local available port and process permissions | JSON/text outputs show `running`, restart new PID or refreshed running state, and `stopped`; state path under temp repo | non-zero command failure, unmanaged/stale/invalid unexpected status, or cleanup failure | saved command output and state/process audit |
| Run installed-package UI lifecycle | end_to_end | invoke isolated installed `pairflow ui start|status|restart|stop` | `$prefix/node_modules/.bin/pairflow` | package-local CLI/runtime and temp repo state | isolated installed lifecycle proof commands | package bin, lifecycle runtime, packaged `ui/dist` assets | local temp prefix, available port, process permissions | JSON/text outputs show lifecycle success and state path under temp repo | non-zero command failure, missing packaged assets, unmanaged/stale/invalid unexpected status, or cleanup failure | installed command transcript and state/process audit |
| Serve packaged UI assets | end_to_end | HTTP probe after installed-package `ui start` | started packaged UI server | package asset resolver | local HTTP GET to started URL | package-local `ui/dist/index.html` and assets | local loopback access | HTTP status 200 for `/` and generated UI content served from package | non-200 response or asset resolution error | HTTP probe and command output |
| Preserve Pairflow-owned process safety | end_to_end | inspect JSON state path and stop behavior | lifecycle JSON/state file | temp repo `.pairflow/runtime/ui-service.json` | start/status/restart/stop in temp repo | state writer, process verifier, stop logic | local process signal permission | stop clears temp state and no proof process remains | orphan process or state retained without reason | cleanup audit |

### In Scope

1. Run preflight repository cleanliness and tool-version checks.
2. Build the current source checkout and pack a fresh tarball.
3. Run source-checkout lifecycle commands from built `dist/cli/index.js` against
   a temporary repo root and explicit source `ui/dist` assets.
4. Install the tarball into an isolated npm prefix with isolated `HOME` and npm
   cache.
5. Run installed-package lifecycle commands from the isolated `pairflow` binary
   against a separate temporary repo root without `--assets-dir`, so packaged
   UI asset resolution is exercised.
6. Parse and audit JSON outputs for `status`, `reasonCode`, `pid`, `url`,
   `statePath`, and `exitCode` where emitted.
7. Probe the started source and installed UI URLs over loopback.
8. Verify state paths are under temp repo roots and cleanup removes or stops
   proof-created services.
9. Record blocker/follow-up requirements when lifecycle proof fails. Do not fix
   those defects in this task.

### Out of Scope

1. Editing CLI/runtime/UI source files, package metadata, docs, or workflows.
2. Running or mutating the operator's real long-lived UI service state.
3. Treating foreground `pairflow ui` or pnpm helper scripts as background
   lifecycle proof.
4. Killing or probing unrelated processes except for detecting proof port
   availability.
5. Opening npm publish guards or publishing to npm.
6. Proving public registry install; owned by `7f-registry-install-smoke`.
7. Reopening skill install proof; owned by completed `7c`.
8. Using source-checkout command execution as installed-package proof.

### Safety Defaults

1. Use temporary repo roots, temporary prefix, temporary `HOME`, and temporary
   npm cache for all lifecycle/install commands.
2. Use dynamically selected loopback ports and record them.
3. Prefer JSON lifecycle output for machine-auditable proof.
4. Always run `stop` cleanup for any service that reaches `running`; if cleanup
   fails, record the PID/state path and stop before advancing.
5. If a command reports `unmanaged`, `stale`, or `invalid` unexpectedly, stop
   and record the finding rather than trying port-only cleanup.
6. Keep publish guards and external GitHub/npm settings untouched.

## L1 - Contract

### 0a) Canonical Contract Preservation

| Surface | Preserved Contract | Required Behavior | Priority | Status |
|---|---|---|---|---|
| Foreground UI | `pairflow ui` remains the foreground path | This task does not use foreground success as lifecycle proof | P1 | required-now |
| Lifecycle subcommands | `start`, `status`, `restart`, `stop` | Source and installed package proof must exercise all four | P1 | required-now |
| Status taxonomy | `running|stopped|stale|invalid|unmanaged` | Expected happy path is `running` then `stopped`; other statuses are blockers unless intentionally tested | P1 | required-now |
| Reason codes | lifecycle reason codes are machine-readable | Evidence records `reasonCode` for each command | P1 | required-now |
| State path | state is under temp repo `.pairflow/runtime/ui-service.json` | Proof must not write real repo service state | P1 | required-now |
| Packaged assets | installed package serves package-local `ui/dist` | Installed lifecycle proof must not pass `--assets-dir` to repo-local assets | P1 | required-now |
| Public registry proof | Deferred | Local tarball install must not be described as public npm readiness | P1 | required-now |

### 0b) Branch Inventory

| Branch | Expected Behavior | Risk If Wrong | Test / Proof |
|---|---|---|---|
| Source start | JSON reports `running` and `ui_service_started` | source lifecycle broken | source start JSON audit |
| Source status | JSON reports `running` for same temp state | state read broken | source status JSON audit |
| Source restart | JSON reports `running`; PID/state remains owned | restart broken or duplicate process | source restart JSON and PID audit |
| Source stop | JSON reports `stopped`; state cleared | orphan process/state | source stop and state cleanup audit |
| Installed start | JSON reports `running` and `ui_service_started` | package lifecycle broken | installed start JSON audit |
| Installed HTTP probe | `/` returns HTTP 200 | packaged UI assets missing | installed URL probe |
| Installed status | JSON reports `running` | package state read broken | installed status JSON audit |
| Installed restart | JSON reports `running`; PID/state remains owned | package restart broken | installed restart JSON and PID audit |
| Installed stop | JSON reports `stopped`; state cleared | orphan package process/state | installed stop and state cleanup audit |
| Unexpected unmanaged/stale/invalid | Stop proof and record blocker | false readiness claim | evidence note and follow-up routing |
| Cleanup | temp proof roots removed after services stop | process/state leaks | cleanup command/result |

### 0c) Evidence Contract

| Field | Required Value / Shape |
|---|---|
| `git_status_before` | `empty` before proof commands |
| `tool_versions` | Node, pnpm, npm, and package name/version |
| `build_and_pack` | source build and tarball pack result |
| `isolated_paths` | temp root, source repo root, installed repo root, prefix, HOME, npm cache |
| `ports` | source and installed loopback ports |
| `source_lifecycle` | start/status/restart/stop JSON summaries and HTTP probe |
| `installed_lifecycle` | start/status/restart/stop JSON summaries and HTTP probe |
| `state_path_boundaries` | every state path under expected temp repo root |
| `packaged_asset_boundary` | installed run starts without repo-local `--assets-dir`; HTTP probe succeeds |
| `cleanup_status` | services stopped; temp proof root removed or retained with reason |
| `decision` | `ui_lifecycle_proof_passed` or `ui_lifecycle_proof_blocked` |

### 0d) ReviewSpec Gate Coverage

| Gate | Required Review Question |
|---|---|
| Metadata | Does frontmatter match `7d-ui-lifecycle-proof`, parent tracker, task order, archive group, and `draft`/review status? |
| Scope | Is the task proof-only, with edits limited to task/plan evidence and no runtime/source/docs/workflow mutation? |
| Contract | Are lifecycle JSON, state path, process cleanup, port selection, source versus installed execution, and packaged asset contracts concrete and auditable? |
| Capability | Does the task avoid claiming public npm registry install, publish readiness, docs readiness, skill proof, or real operator service management? |
| Split policy | Is the task safe as one proof-only slice, and does it route any source/runtime/package fix to a follow-up task? |

## L2 - Execution Plan

### Operator Proof Checklist

1. Confirm clean checkout:
   ```bash
   git status --short
   ```
2. Record tool/package versions:
   ```bash
   node --version
   pnpm --version
   npm --version
   node -p "require('./package.json').name + ' ' + require('./package.json').version"
   ```
3. Run build, pack, source lifecycle proof, installed lifecycle proof, and
   cleanup in one fail-safe shell block:
   ```bash
   set -euo pipefail

   pnpm build

   tmp_root="$(mktemp -d)"
   source_repo="$tmp_root/source-repo"
   installed_repo="$tmp_root/installed-repo"
   prefix="$tmp_root/prefix"
   isolated_home="$tmp_root/home"
   isolated_npm_cache="$tmp_root/npm-cache"
   repo_root="$PWD"
   source_cli="$PWD/dist/cli/index.js"

   mkdir -p "$source_repo" "$installed_repo" "$prefix" "$isolated_home" "$isolated_npm_cache"

   cleanup_ui_lifecycle_proof() {
     if [ -n "${source_cli:-}" ] && [ -n "${source_repo:-}" ] && [ -n "${source_port:-}" ]; then
       (cd "$source_repo" && node "$source_cli" ui stop --host 127.0.0.1 --port "$source_port" --json > "$tmp_root/source-cleanup-stop.json" 2>/dev/null) || true
     fi
     if [ -n "${installed_pairflow:-}" ] && [ -n "${installed_repo:-}" ] && [ -n "${installed_port:-}" ]; then
       (cd "$installed_repo" && HOME="$isolated_home" "$installed_pairflow" ui stop --host 127.0.0.1 --port "$installed_port" --json > "$tmp_root/installed-cleanup-stop.json" 2>/dev/null) || true
     fi
   }
   trap cleanup_ui_lifecycle_proof EXIT INT TERM

   npm pack --json --pack-destination "$tmp_root" > "$tmp_root/npm-pack.json"
   tarball_path="$tmp_root/$(node -e "const pack=require(process.argv[1]); console.log(pack[0].filename)" "$tmp_root/npm-pack.json")"
   git status --short -- dist ui/dist package.json package-lock.json pnpm-lock.yaml

   source_port="$(node -e "const net=require('node:net'); const s=net.createServer(); s.listen(0,'127.0.0.1',()=>{console.log(s.address().port); s.close();});")"
   installed_port="$(node -e "const net=require('node:net'); const s=net.createServer(); s.listen(0,'127.0.0.1',()=>{console.log(s.address().port); s.close();});")"
   echo "source_port=$source_port"
   echo "installed_port=$installed_port"

   (cd "$source_repo" && node "$source_cli" ui start --host 127.0.0.1 --port "$source_port" --assets-dir "$repo_root/ui/dist" --json > "$tmp_root/source-start.json")
   (cd "$source_repo" && node "$source_cli" ui status --host 127.0.0.1 --port "$source_port" --json > "$tmp_root/source-status.json")
   node - "$tmp_root/source-start.json" "$tmp_root/source-status.json" "$source_repo" <<'NODE'
   const fs = require("node:fs");
   const path = require("node:path");
   const [startPath, statusPath, repo] = process.argv.slice(2);
   const start = JSON.parse(fs.readFileSync(startPath, "utf8"));
   const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
   const expectedStatePath = path.resolve(repo, ".pairflow", "runtime", "ui-service.json");
   const realStatePath = fs.realpathSync.native(start.statePath);
   const realExpectedStatePath = fs.realpathSync.native(expectedStatePath);
   const proof = {
     start_running: start.status === "running" && start.reasonCode === "ui_service_started" && start.exitCode === 0,
     status_running: status.status === "running" && status.reasonCode === "ui_service_already_running" && status.exitCode === 0,
     state_path_exact: realStatePath === realExpectedStatePath,
     start_pid: start.pid,
     status_pid: status.pid,
     url: start.url
   };
   console.log(JSON.stringify(proof, null, 2));
   if (!proof.start_running || !proof.status_running || !proof.state_path_exact) {
     process.exitCode = 1;
   }
   NODE
   curl -fsS "http://127.0.0.1:$source_port/" >/dev/null
   (cd "$source_repo" && node "$source_cli" ui restart --host 127.0.0.1 --port "$source_port" --assets-dir "$repo_root/ui/dist" --json > "$tmp_root/source-restart.json")
   (cd "$source_repo" && node "$source_cli" ui stop --host 127.0.0.1 --port "$source_port" --json > "$tmp_root/source-stop.json")
   node - "$tmp_root/source-restart.json" "$tmp_root/source-stop.json" "$source_repo" <<'NODE'
   const fs = require("node:fs");
   const path = require("node:path");
   const [restartPath, stopPath, repo] = process.argv.slice(2);
   const restart = JSON.parse(fs.readFileSync(restartPath, "utf8"));
   const stop = JSON.parse(fs.readFileSync(stopPath, "utf8"));
   const statePath = path.resolve(repo, ".pairflow", "runtime", "ui-service.json");
   const proof = {
     restart_running: restart.status === "running" && restart.reasonCode === "ui_service_started" && restart.exitCode === 0,
     stop_stopped: stop.status === "stopped" && stop.reasonCode === "ui_service_stopped" && stop.exitCode === 0,
     state_removed_after_stop: !fs.existsSync(statePath),
     restart_pid: restart.pid,
     stopped_pid: stop.pid
   };
   console.log(JSON.stringify(proof, null, 2));
   if (!proof.restart_running || !proof.stop_stopped || !proof.state_removed_after_stop) {
     process.exitCode = 1;
   }
   NODE

   HOME="$isolated_home" npm_config_cache="$isolated_npm_cache" npm install --prefix "$prefix" "$tarball_path"
   installed_pairflow="$prefix/node_modules/.bin/pairflow"
   "$installed_pairflow" --version

   (cd "$installed_repo" && HOME="$isolated_home" "$installed_pairflow" ui start --host 127.0.0.1 --port "$installed_port" --json > "$tmp_root/installed-start.json")
   (cd "$installed_repo" && HOME="$isolated_home" "$installed_pairflow" ui status --host 127.0.0.1 --port "$installed_port" --json > "$tmp_root/installed-status.json")
   node - "$tmp_root/installed-start.json" "$tmp_root/installed-status.json" "$installed_repo" "$prefix" <<'NODE'
   const fs = require("node:fs");
   const path = require("node:path");
   const [startPath, statusPath, repo, prefix] = process.argv.slice(2);
   const start = JSON.parse(fs.readFileSync(startPath, "utf8"));
   const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
   const packageRoot = fs.realpathSync(path.resolve(prefix, "node_modules", "@pairflow", "cli"));
   const expectedStatePath = path.resolve(repo, ".pairflow", "runtime", "ui-service.json");
   const state = JSON.parse(fs.readFileSync(start.statePath, "utf8"));
   const realStatePath = fs.realpathSync.native(start.statePath);
   const realExpectedStatePath = fs.realpathSync.native(expectedStatePath);
   const proof = {
     start_running: start.status === "running" && start.reasonCode === "ui_service_started" && start.exitCode === 0,
     status_running: status.status === "running" && status.reasonCode === "ui_service_already_running" && status.exitCode === 0,
     state_path_exact: realStatePath === realExpectedStatePath,
     command_uses_installed_pairflow: state.command.some((part) => fs.existsSync(part) && fs.realpathSync(part).startsWith(packageRoot + path.sep)),
     command_has_no_assets_dir: !state.command.includes("--assets-dir"),
     start_pid: start.pid,
     status_pid: status.pid,
     url: start.url
   };
   console.log(JSON.stringify(proof, null, 2));
   if (
     !proof.start_running ||
     !proof.status_running ||
     !proof.state_path_exact ||
     !proof.command_uses_installed_pairflow ||
     !proof.command_has_no_assets_dir
   ) {
     process.exitCode = 1;
   }
   NODE
   test -f "$prefix/node_modules/@pairflow/cli/ui/dist/index.html"
   curl -fsS "http://127.0.0.1:$installed_port/" > "$tmp_root/installed-index.html"
   test -s "$tmp_root/installed-index.html"
   ! rg -q "Frontend assets are not built yet" "$tmp_root/installed-index.html"
   (cd "$installed_repo" && HOME="$isolated_home" "$installed_pairflow" ui restart --host 127.0.0.1 --port "$installed_port" --json > "$tmp_root/installed-restart.json")
   (cd "$installed_repo" && HOME="$isolated_home" "$installed_pairflow" ui stop --host 127.0.0.1 --port "$installed_port" --json > "$tmp_root/installed-stop.json")
   node - "$tmp_root/installed-restart.json" "$tmp_root/installed-stop.json" "$installed_repo" <<'NODE'
   const fs = require("node:fs");
   const path = require("node:path");
   const [restartPath, stopPath, repo] = process.argv.slice(2);
   const restart = JSON.parse(fs.readFileSync(restartPath, "utf8"));
   const stop = JSON.parse(fs.readFileSync(stopPath, "utf8"));
   const statePath = path.resolve(repo, ".pairflow", "runtime", "ui-service.json");
   const proof = {
     restart_running: restart.status === "running" && restart.reasonCode === "ui_service_started" && restart.exitCode === 0,
     stop_stopped: stop.status === "stopped" && stop.reasonCode === "ui_service_stopped" && stop.exitCode === 0,
     state_removed_after_stop: !fs.existsSync(statePath),
     restart_pid: restart.pid,
     stopped_pid: stop.pid
   };
   console.log(JSON.stringify(proof, null, 2));
   if (!proof.restart_running || !proof.stop_stopped || !proof.state_removed_after_stop) {
     process.exitCode = 1;
   }
   NODE

   cleanup_ui_lifecycle_proof
   trap - EXIT INT TERM
   echo "cleanup_target=$tmp_root"
   rm -rf "$tmp_root"
   test ! -e "$tmp_root" && echo "cleanup_result=removed"
   ```
4. Confirm checkout remains limited to evidence edits after proof:
   ```bash
   git status --short
   ```

### Acceptance Checks

1. Task artifact exists at
   `plans/tasks/2026-05-31-npm-release-dx-onboarding/7d-ui-lifecycle-proof.md`
   with `status: approved` only after ReviewSpec task-mode approves it.
2. Parent plan tracker points `7d-ui-lifecycle-proof` at the live task path
   before execution and later archives it only after proof evidence is
   recorded.
3. Source-checkout `start`, `status`, `restart`, and `stop` pass in an isolated
   temp repo root.
4. Installed-package `start`, `status`, `restart`, and `stop` pass in an
   isolated temp repo root through the installed package binary.
5. Installed-package proof does not pass repo-local `--assets-dir`; HTTP probe
   succeeds from the packaged server.
6. Every lifecycle state path is under its temp repo root.
7. Stop cleanup removes proof-created state and leaves no known proof-created
   service running.
8. Temporary proof directories are removed or retained with explicit reason.
9. Evidence decision is recorded as `ui_lifecycle_proof_passed` or
   `ui_lifecycle_proof_blocked`.

### Evidence To Record

Use this section after execution.

```yaml
evidence_status: completed
executed_at: "2026-06-08T10:11:19+02:00"
commands:
  - "git status --short"
  - "node --version"
  - "pnpm --version"
  - "npm --version"
  - "node -p \"require('./package.json').name + ' ' + require('./package.json').version\""
  - "pnpm build"
  - "npm pack --json --pack-destination \"$tmp_root\""
  - "source-checkout pairflow ui start|status|restart|stop with explicit --assets-dir"
  - "npm install --prefix \"$prefix\" \"$tarball_path\" with isolated HOME/cache"
  - "\"$installed_pairflow\" --version"
  - "installed-package pairflow ui start|status|restart|stop without --assets-dir"
  - "packaged ui/dist/index.html and fallback-placeholder audit"
  - "cleanup"
tool_versions:
  node_version: "v26.0.0"
  pnpm_version: "10.8.1"
  npm_version: "11.12.1"
  package_name: "@pairflow/cli"
  package_version: "0.1.0"
build_and_pack:
  fresh_build_result: "passed"
  fresh_pack_result: "passed"
  build_artifact_status_audit: "clean for dist/ui/dist/package lock surfaces"
  tarball_source: "fresh local npm pack"
isolated_paths:
  source_repo: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.9WulNehmo0/source-repo"
  installed_repo: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.9WulNehmo0/installed-repo"
  prefix: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.9WulNehmo0/prefix"
  isolated_home: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.9WulNehmo0/home"
  isolated_npm_cache: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.9WulNehmo0/npm-cache"
  path_note: "temporary proof paths removed during cleanup; successors should regenerate"
ports:
  source_port: 57900
  installed_port: 57901
source_lifecycle:
  start_running: true
  status_running: true
  state_path_exact: true
  restart_running: true
  stop_stopped: true
  state_removed_after_stop: true
  start_pid: 46807
  status_pid: 46807
  restart_pid: 46923
  stopped_pid: 46923
  url: "http://127.0.0.1:57900"
installed_lifecycle:
  installed_version_output: "0.1.0"
  start_running: true
  status_running: true
  state_path_exact: true
  command_uses_installed_pairflow: true
  command_has_no_assets_dir: true
  restart_running: true
  stop_stopped: true
  state_removed_after_stop: true
  start_pid: 47064
  status_pid: 47064
  restart_pid: 47179
  stopped_pid: 47179
  url: "http://127.0.0.1:57901"
state_path_boundaries:
  source_state_path_exact_realpath: true
  installed_state_path_exact_realpath: true
  macos_var_private_var_alias_observed: true
  first_string_exact_source_audit_result: false
  realpath_rerun_source_audit_result: true
packaged_asset_boundary:
  package_local_index_html_present: true
  installed_http_probe_succeeded: true
  fallback_placeholder_absent: true
  repo_local_assets_dir_not_passed_to_installed_command: true
cleanup_status:
  cleanup_target: "/var/folders/4y/yw924nm97658pxnmc5mr7gt00000gn/T/tmp.9WulNehmo0"
  cleanup_result: "removed"
git_status_after: "modified task evidence/checklist only"
decision: "ui_lifecycle_proof_passed"
notes:
  - "The first source lifecycle audit failed on macOS /var versus /private/var path spelling; a diagnostic confirmed realpath equality."
  - "The approved checklist was refined to compare lifecycle state paths by native realpath while preserving exact .pairflow/runtime/ui-service.json semantics."
  - "pnpm build emitted the existing non-blocking esbuild ignored-build-scripts warning."
  - "npm emitted a non-blocking notice that npm 11.16.0 is available."
```
