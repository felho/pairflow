---
artifact_type: task
artifact_id: task_mcp_disabled_agent_launch_v1
task_family_id: mcp-disabled-agent-launch
sequence_key: "1"
task_id: 1-mcp-disabled-agent-launch
title: "Default-Disabled MCP Agent Launch Policy"
status: in_progress
phase: phase1
target_files:
  - src/v11/shared/command/agentCommand.ts
  - src/v11/shared/config/bubbleConfigVocabulary.ts
  - src/v11/shared/config/bubbleConfigTypes.ts
  - src/config/defaults.ts
  - src/config/repoConfig.ts
  - src/config/bubbleConfig.ts
  - src/config/bubbleConfig/render.ts
  - src/v11/application/create/internal/runtime/createRepoDefaultsResolver.ts
  - src/v11/application/create/internal/runtime/createCommandRuntime.ts
  - src/v11/application/create/internal/preparation/createBubblePreparation.ts
  - src/v11/application/start/internal/runtime/startCommandTmuxLaunch.ts
  - src/v11/application/restart/restartCommandOrchestration.ts
  - src/v11/application/restart/runRestartFlow.ts
  - src/v11/infrastructure/channel/tmux/reviewerContext.ts
  - src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts
  - src/v11/application/metaReviewGate/internal/metaReviewGateApply.ts
  - src/v11/application/metaReviewGate/internal/metaReviewGateCleanRerunPaneBinding.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRuntimeCapabilities.ts
  - src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts
  - tests/core/runtime/agentCommand.test.ts
  - tests/config/repoConfig.test.ts
  - tests/config/bubbleConfig.test.ts
  - tests/core/bubble/createBubble.test.ts
  - tests/v11/application/create/createRepoDefaultsRuntimeIsolation.test.ts
  - tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/bubble/restartBubble.test.ts
  - tests/core/runtime/reviewerContext.test.ts
prd_ref: null
plan_ref: plans/mcp-disabled-agent-launch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 1-mcp-disabled-agent-launch-doc
impl_bubble_id: 1-mcp-disabled-agent-launch-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-09-mcp-disabled-agent-launch-plan-v1
---

# Task: Default-Disabled MCP Agent Launch Policy

## L0 - Policy

### Goal

Add a typed Pairflow launch policy that disables MCP tools for Pairflow-started
role panes by default, while allowing explicit per-role opt-in from
configuration. The backing agent binary (`codex` or `claude`) determines the
mechanical disable strategy only after the role policy has been resolved.

### Domain / Control Model Summary

1. Business invariant: Pairflow-created role panes must not receive MCP tool
   access unless Pairflow configuration explicitly opts the workflow role into
   MCP access.
2. Control model: Pairflow owns launch-time MCP policy by workflow role
   (`implementer`, `reviewer`, `meta_reviewer`); user-level Codex/Claude MCP
   configuration remains outside Pairflow except where Pairflow applies
   session-scoped disable flags for a role's resolved agent binary.
3. Read-path rule: Pairflow reads its own config for role policy. Codex disabled
   mode may read `codex mcp list --json` at launch time only when the current
   role resolves to `codex` and that role's policy is `disabled`.
4. Forbidden fallback: when a role policy is `disabled`, do not launch that role
   pane with MCPs potentially enabled because disable flag construction failed.
5. Allowed resolution path: for Codex-backed roles, deriving `-c` overrides
   from the same Codex CLI's effective MCP JSON list is the allowed
   deterministic resolution path. Each enabled server name must be encoded as a
   TOML-quoted key segment, for example
   `mcp_servers."server.name".enabled=false`.
6. Missing-data rule: malformed/unavailable Codex MCP JSON while a Codex-backed
   role has policy `disabled` must fail closed before starting that role pane.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here for config parsing/rendering and launch command
     construction
   - internal execution closure: owned here for agent launch command script
   - workflow/orchestration closure: owned here for the bounded
     `buildAgentCommand(...)` consumer set: start/restart launch,
     reviewer-context launch, and meta-review gate pane launch
   - read-model closure: out of scope
   - activation closure: owned here for the same bounded launch activation set:
     start/restart launch, reviewer-context launch, and meta-review gate pane
     launch
   - cleanup/recovery closure: out of scope

### Plan Linkage

1. Parent plan gap closed: all open work in
   `plans/mcp-disabled-agent-launch-plan-v1.md`.
2. Depends on: N/A.
3. Unlocks / impacts successors: future UI/status reporting can surface the
   effective role MCP policy after this task.
4. Task-list impact: this document refinement updates the parent plan task
   tracker/list status for `1-mcp-disabled-agent-launch` to `implementable`.
5. Inherited validation / exit expectation: config tests, command construction
   tests, and normal Pairflow verification gates.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/command/agentCommand.ts`
   - `tests/core/runtime/agentCommand.test.ts`
   - `src/config/defaults.ts`
   - `src/config/repoConfig.ts`
   - `src/config/bubbleConfig.ts`
   - `src/config/bubbleConfig/render.ts`
   - `src/v11/shared/config/bubbleConfigTypes.ts`
2. Canonical elements:
   - role identity: `implementer | reviewer | meta_reviewer`
   - agent identity: `codex | claude`
   - launch-time MCP policy values: `disabled | enabled`
   - default policy: `disabled` for every supported role
3. Guard elements:
   - Codex MCP JSON discovery validity
   - shell-safe construction of Codex `-c` overrides
   - Claude strict empty MCP config flags
4. Compat-only elements:
   - existing user/global MCP server definitions remain untouched
   - existing `.mcp.json` local overlay remains unchanged unless a later task
     explicitly changes overlay policy
5. Forbidden reinterpretations:
   - do not use backing agent binary (`codex`, `claude`) as the configuration
     authority for MCP policy
   - do not ignore role identity when two roles resolve to the same backing
     agent with different MCP policies
   - do not remove or edit user MCP config files as a way to disable MCPs
   - do not hard-code current local server names such as `codescene` or
     `supabase`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/shared/command/agentCommand.ts`
   - `src/v11/application/create/internal/runtime/createRepoDefaultsResolver.ts`
   - `src/v11/application/create/internal/runtime/createCommandRuntime.ts`
   - `src/v11/application/create/internal/preparation/createBubblePreparation.ts`
   - `src/v11/application/start/internal/runtime/startCommandTmuxLaunch.ts`
   - `src/v11/application/restart/restartCommandOrchestration.ts`
   - `src/v11/application/restart/runRestartFlow.ts`
   - `src/v11/infrastructure/channel/tmux/reviewerContext.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - `src/v11/application/metaReviewGate/internal/metaReviewGateApply.ts`
   - `src/v11/application/metaReviewGate/internal/metaReviewGateCleanRerunPaneBinding.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateRuntimeCapabilities.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `tests/core/runtime/agentCommand.test.ts`
   - `tests/core/bubble/createBubble.test.ts`
   - `tests/v11/application/create/createRepoDefaultsRuntimeIsolation.test.ts`
   - `tests/v11/application/start/startCommandOrchestration.test.ts`
   - `tests/core/bubble/startBubble.test.ts`
   - `tests/core/bubble/restartBubble.test.ts`
   - `tests/core/runtime/reviewerContext.test.ts`
2. Actual touched scope: config contract, create-time persistence, and internal
   execution launch command consumers.
3. Mutation entrypoints in scope: create-time bubble config rendering persists
   the resolved role MCP policy into `bubble.toml`. No lifecycle state machine
   mutation or post-create policy persistence is introduced.
4. Hidden scope ruled out: UI display, live pane status read-models, and MCP file
   overlay policy are out of scope.
5. Branch inventory note:
   - role `implementer` vs `reviewer` vs `meta_reviewer`
   - backing agent `codex` vs `claude`
   - policy `disabled` vs `enabled`
   - Codex JSON discovery success vs parse/failure
   - startup prompt present vs absent
6. Why the declared task shape matches reality: one launch-command producer and
   a bounded launch-consumer set own the behavior; no cross-command lifecycle
   state semantics change is required.

### Authority Boundary Map

1. Authority producer: Pairflow config resolution produces per-role MCP policy.
2. Stored authority: repo defaults and rendered bubble config store the selected
   role policy when configured.
3. In-scope consumers: role launch assembly and `buildAgentCommand(...)` call
   sites for start/restart, reviewer-context launch, and meta-review gate pane
   launch.
4. Explicit out-of-scope consumers: UI status, bubble list/status output, docs
   beyond any needed config example.
5. Export surfaces closed in this phase: yes; config vocabulary and command
   construction behavior.

### Baseline Preservation

1. Must-preserve behaviors:
   - existing permission bypass flags for `codex` and `claude`
   - existing Pairflow command profile bootstrap
   - startup prompt quoting
   - workspace path pinning
   - missing binary fallback to interactive shell
2. Allowed resolution paths:
   - Codex per-server disable override generation from `codex mcp list --json`
     after role policy resolution
   - Claude strict empty MCP config flags
3. Forbidden regression interpretations:
   - do not make MCP disable depend on removing `.mcp.json`
   - do not make Codex disable depend on static server-name configuration
4. Replacement proof required if removed: any replacement for Codex JSON
   discovery must prove equivalent coverage of all effective configured servers.

### Success / Completion Proof Boundary

N/A. This task changes launch command capability boundaries, not bubble lifecycle
success or completion semantics.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape: `internal_execution_closure`, bounded to launch command
   construction.
3. Preconditions that must pass before role-pane launch: when a role resolves to
   Codex and that role's MCP policy is `disabled`, the allowed discovery
   subcommand `codex mcp list --json`, JSON shape validation, TOML key encoding,
   and override array construction must succeed before invoking the final Codex
   role-pane command. Discovery must run under a bounded timeout; timeout,
   cancellation, or signal termination is a precondition failure and follows the
   same fail-closed fallback path as non-zero discovery exit. For this task the
   discovery timeout is a hard-coded launch-script constant of 5 seconds; do not
   add a repo config key, bubble config key, or public CLI/API flag for it.
4. Side effects forbidden before preconditions pass: invoking the final
   role-pane `codex` command before the disabled-policy role has a validated
   discovery result and constructed MCP-disable argument array. The allowed
   discovery subcommand is not the forbidden role-pane launch. The constructed
   array may be empty only when the validated discovery result has zero enabled
   MCP servers.
5. Invalid/precondition-failure behavior: print an actionable failure message
   and drop to interactive shell, consistent with existing launch failure style.
6. Coordination primitives in scope: N/A.

### In Scope

1. Add a typed MCP launch policy vocabulary, likely `disabled | enabled`.
2. Add defaults: `implementer=disabled`, `reviewer=disabled`,
   `meta_reviewer=disabled`.
3. Add repo defaults parsing for per-role opt-in, for example:
   ```toml
   [defaults.role_mcp]
   implementer = "disabled"
   reviewer = "enabled"
   meta_reviewer = "disabled"
   ```
4. Persist/render the resolved policy into bubble config so start/restart paths
   consume durable bubble-local launch policy.
5. Extend the role launch path so it resolves the role MCP policy before calling
   `buildAgentCommand(...)`; `BuildAgentCommandInput` should receive the
   resolved policy plus enough role context for diagnostics.
6. For Claude disabled mode, add:
   ```bash
   --strict-mcp-config --mcp-config '{"mcpServers":{}}'
   ```
7. For Codex disabled mode, after a disabled role resolves to `codex`, generate
   launch-time overrides from:
   ```bash
   codex mcp list --json
   ```
   and pass one override per enabled discovered server:
   ```bash
   -c 'mcp_servers."server.name".enabled=false'
   ```
   If discovery succeeds and validates but contains zero enabled servers, the
   empty override array is valid because there are no effective Codex MCP
   servers to disable.
8. Preserve `enabled` mode by omitting MCP-disabling flags and preserving current
   launch behavior.
9. Add focused unit/config tests.

### Out of Scope

1. Editing `~/.codex/config.toml`, `.codex/config.toml`, `~/.claude.json`, or
   `.mcp.json`.
2. Removing `.mcp.json` from local overlay defaults.
3. Adding a UI or status read-model for MCP policy.
4. Supporting future non-`codex`/non-`claude` agent binaries.
5. Replacing Codex's MCP UX if a future first-class `--no-mcp` flag appears.

### Safety Defaults

1. Default policy is `disabled` for every supported role.
2. Unknown policy values fail config validation.
3. Codex disabled mode fails closed if effective MCP server discovery cannot be
   parsed.
4. Generated shell must remain `bash -n` parseable under existing tests.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - config contract: new per-role MCP launch policy in repo/bubble config
   - internal command contract: role launch assembly passes the resolved role
     policy into `buildAgentCommand(...)`, which changes launch argv defaults

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `3`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `10`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Single-task allowance rationale:
    - the implementation surface spans create-time persistence, three launch
      consumer families (start/restart, reviewer-context launch, and
      meta-review gate pane launch), plus upstream meta-review apply/rerun
      input-threading callers that construct pane-binding inputs
    - despite that spread, the authority remains one durable role MCP policy
      contract and one command-construction input extension, with focused tests
      named for each launch and input-threading family
11. Identity/join note:
    - canonical identity path: workflow role (`implementer | reviewer |
      meta_reviewer`) for policy, then concrete `AgentName` (`codex | claude`)
      for CLI-specific disable mechanics
    - competing identifiers or fallback identities: backing agent names must not
      be used as policy keys
12. Authority/source-of-truth note:
    - canonical source: Pairflow resolved role config
    - forbidden secondary sources: existing user MCP config must not override
      Pairflow disabled policy for Pairflow-created panes
13. Closure-budget triage:
    - closure buckets touched: config contract, create-time persistence, and
      internal execution launch consumers
    - intentionally collapsed closures: config persistence plus bounded command
      construction consumers, safe because no external read-model or lifecycle
      state-machine changes are introduced
    - explicitly deferred closures: UI/status reporting
14. Bounded-task-shape decision:
    - primary shape: config contract foundation
    - secondary shape: internal launch execution closure
    - why this bounded mix is safe: the create-time persisted policy is consumed
      by the bounded launch set named in the canonical matrix and required tests
15. Contract-dense decision:
    - gate triggered: yes
    - trigger reasons: config contract, launch input/interface change,
      structured parse/render acceptance, fail-closed behavior, and multiple
      downstream launch consumers
    - canonical matrix source: `Canonical Contract Matrix` below
    - mirrored surfaces: L0 control model, L1 change contract, L2 suggested
      design, required tests, and config examples

### Canonical Contract Matrix

This matrix is the source of truth for the role MCP launch policy contract.
Other sections must mirror these rows rather than creating independent policy
rules.

| Contract Row | Canonical Rule | Producer / Storage | Consumer / Runtime Behavior | Invalid / Missing Behavior | Required Proof |
|---|---|---|---|---|---|
| Role keys | The only supported role keys are `implementer`, `reviewer`, and `meta_reviewer`. | Repo defaults may specify these keys under `[defaults.role_mcp]`; rendered bubble config stores the same keys under `[role_mcp]`. | Launch assembly resolves the concrete workflow role first, then selects that role's MCP policy. | Unknown role policy keys in parsed config fail validation with a path-specific error. Missing supported keys default to `disabled`. | Repo and bubble config tests cover accepted keys, missing keys, and unknown keys. |
| Policy values | The only policy values are `disabled` and `enabled`. | Typed config vocabulary and bubble config types expose only these values. | `disabled` means Pairflow must add session-scoped MCP-disable mechanics for the resolved backing CLI. `enabled` means Pairflow adds no MCP-disable flags and preserves existing agent launch behavior. | Invalid values fail config validation with a path-specific error. Omitted values resolve to `disabled`. | Config validation tests and command tests cover both values for Codex and Claude roles. |
| Precedence | Effective policy is resolved from repo defaults during bubble creation/preparation, written into durable bubble config, then passed as explicit launch input for the pane role. Existing bubbles that lack `[role_mcp]` are already-created legacy bubbles and resolve missing role keys to `disabled`; repo-default opt-in applies only to newly created/prepared bubbles unless a later migration task explicitly rewrites bubble-local config. | Create-time repo-default resolution and bubble preparation write the resolved role policy into bubble config. `bubble start`, restart/resume, reviewer-context, and meta-review pane launch do not reread mutable repo defaults or write role policy back into bubble config. | Start, restart/resume, reviewer-context, and meta-review launch paths consume bubble-local resolved policy rather than rereading mutable repo defaults mid-bubble. `buildAgentCommand(...)` still defaults omitted launch input to `disabled` as a safety fallback, but all in-scope call sites must pass explicit role context from bubble-local policy. | If bubble config is malformed, parse fails before launch. If a call site omits role policy, command construction falls back to disabled and diagnostics include the required role name. | Create-time persistence tests, bubble config render/parse tests, and command construction tests prove precedence, legacy missing-key default behavior, and omission diagnostics. |
| Codex disabled mechanics | For a Codex-backed role with `disabled`, Pairflow runs the allowed discovery subcommand `codex mcp list --json` under a hard-coded 5 second timeout, accepts only a top-level JSON array whose enabled entries are objects with a non-empty string `name` and `enabled === true`, then invokes the final Codex role-pane command with one `-c` override per enabled server using a TOML-quoted server key segment: `mcp_servers."<escaped-name>".enabled=false`. Disabled entries (`enabled === false`) are ignored; an empty enabled-server set is valid and produces no MCP override args. | `buildAgentCommand(...)` emits the launch-time timeout-bounded discovery, Node.js-on-`PATH` JSON parsing, shape validation, TOML key-segment escaping, and override construction script for Codex disabled mode. The 5 second timeout is intentionally local to the generated launch script and is not read from repo defaults, bubble config, environment variables, or CLI flags. | The final Codex role-pane command is not invoked until timeout-bounded discovery, Node-based JSON parsing, shape validation, and shell-safe override construction succeed. Server names are data from the same Codex CLI's effective MCP list, not hard-coded repo assumptions. Raw interpolation into `mcp_servers.${name}.enabled=false` is forbidden because names can contain dotted-key or quoting characters. TOML key names with ASCII control characters (`U+0000`-`U+001F`, `U+007F`) are rejected before override construction; accepted names are encoded as TOML basic-string key segments by escaping `\` and `"`. | Discovery timeout after 5 seconds, cancellation, signal termination, non-zero discovery exit, missing `node` on `PATH`, Node parser script failure, malformed JSON, non-array output, enabled entry without a non-empty string `name`, unsupported/malformed `enabled` value, unsupported control characters in a server name, TOML key escaping failure, or shell construction failure emits `PAIRFLOW_ROLE_MCP_DISABLE_UNAVAILABLE` style diagnostics and drops to the existing interactive shell fallback without starting the Codex role-pane command for that role. | Agent command tests assert the 5 second timeout-bounded discovery script, timeout/cancellation fail-closed behavior, Node parser dependency/fail-closed behavior, accepted JSON shape, fail-closed branches, quoted-key escaping, control-character rejection, no hard-coded server names, and `bash -n` parseability. |
| Claude disabled mechanics | For a Claude-backed role with `disabled`, Pairflow passes `--strict-mcp-config --mcp-config '{"mcpServers":{}}'`. | `buildAgentCommand(...)` appends static strict empty MCP flags for Claude disabled mode. | Claude Code ignores non-explicit MCP configs for that session while preserving existing permission bypass and startup prompt behavior. | Missing static flags in disabled mode is a test failure. | Agent command tests assert strict empty config flags and preserved baseline flags. |
| Enabled mechanics | `enabled` is explicit opt-in to existing agent MCP behavior for that concrete workflow role only. | Repo/bubble config stores `enabled` per role. | Pairflow omits Codex discovery/disable overrides and omits Claude strict empty config flags for that role, even when another role using the same backing agent is disabled. | Cross-role leakage is forbidden; policy must not be keyed by backing agent name. | Tests cover two roles with the same backing agent and different policies. |
| Deferred read-model semantics | This task does not create a UI/status read model proving live MCP availability. | N/A | Runtime status may continue to omit effective MCP launch policy. | Do not add read-model completion claims in this task. | Task completion summary names UI/status reporting as deferred. |

### Ownership and Deferred Semantics

1. Pairflow owns only session-scoped launch policy for Pairflow-created role
   panes. User-level Codex/Claude MCP configuration files remain external
   authority outside Pairflow.
2. Config parsing/rendering owns durable policy storage. `buildAgentCommand(...)`
   owns CLI-specific disable mechanics after the workflow role and backing agent
   have both been resolved.
3. The meta-review gate runtime capability and pane binding are consumers of the
   same launch contract. The `meta_reviewer` policy must be threaded through
   the capability/input path into the pane command builder, not merely recovered
   from `buildAgentCommand(...)`'s default-disabled fallback. That preserves
   explicit `meta_reviewer = "enabled"` opt-in while still failing closed when
   a call site omits policy accidentally.
4. UI/status reporting of effective MCP policy is deferred. This task must not
   imply that operators can inspect live pane MCP state through Pairflow status.

### Mirrored Surface Checklist

When changing the role MCP policy contract, update these surfaces together:

1. L0 control model and forbidden fallback wording.
2. The `Canonical Contract Matrix`.
3. L1 domain/change/shared-compatibility tables.
4. L2 suggested design and required tests.
5. Repo defaults parser, bubble config parser/rendering, and typed bubble config
   definitions.
6. All `buildAgentCommand(...)` call sites, including start/restart,
   reviewer-context launch, and meta-review gate pane launch.
7. Create-time repo-default resolution and bubble preparation surfaces that
   persist resolved role policy into `bubble.toml`.
8. Meta-review gate apply/rerun callers that construct pane-binding inputs, so
   explicit `meta_reviewer = "enabled"` reaches the command builder.
9. Focused meta-review pane-binding tests when policy threading changes that
   path.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Pairflow-created role panes launch without MCP unless the role is explicitly opted in. | Defaults and launch commands must disable MCP for all supported roles. | P1 | required-now |
| Control model | Pairflow config owns MCP launch policy by role. | Do not rely on backing agent names, user MCP config edits, or local file deletion as policy authority. | P1 | required-now |
| Read-path rule | Codex disabled mode may query `codex mcp list --json` only after the role resolves to Codex. | The allowed discovery subcommand happens before launching the final Codex role-pane command and feeds `-c` overrides. | P1 | required-now |
| Forbidden fallback | Disabled role policy must not silently start MCP-enabled panes. | Codex discovery failure fails closed for that role. | P1 | required-now |
| Allowed resolution path | Same-CLI effective MCP list is allowed for Codex override generation after role resolution. | No hard-coded server names and no agent-level policy shortcut. | P1 | required-now |
| Missing-data rule | Missing/malformed Codex MCP JSON is a launch precondition failure for a Codex-backed disabled role. | Print actionable message and do not invoke the final Codex role-pane command. | P1 | required-now |
| Phase boundary | This task owns config and launch construction only. | UI/status reporting remains deferred. | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Role identity | bubble config / launch call-sites | MCP policy authority is `implementer | reviewer | meta_reviewer`. | add as policy authority | P1 | required-now |
| `AgentName` | `src/contracts/kernel/agentIdentity.ts` | Concrete binary identity remains `codex | claude` and only selects CLI disable mechanics. | preserve | P1 | required-now |
| Launch bypass flags | `src/v11/shared/command/agentCommand.ts` | Existing permission bypass behavior remains. | preserve | P1 | required-now |
| Pairflow command bootstrap | `src/v11/shared/command/agentCommand.ts` | MCP policy must not alter Pairflow command profile behavior. | preserve | P1 | required-now |
| Local overlay `.mcp.json` | `src/config/defaults.ts` | Overlay remains separate from session MCP disable. | preserve | P2 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | `buildAgentCommand(...)` is the launch command producer. | Tests should assert generated scripts, not only config parsing. | P1 | required-now |
| Actual touched scope | Config contract, create-time bubble config persistence, plus launch command construction consumers. | Keep changes local to config and command surfaces. | P1 | required-now |
| Mutation entrypoints in scope | Create-time bubble config rendering persists resolved role MCP policy into `bubble.toml`. | Do not add lifecycle state machine mutations or start/restart-time policy writes. | P1 | required-now |
| Hidden scope ruled out | UI/status and overlay changes are out of scope. | Do not expand implementation into read-model work. | P2 | required-now |
| Branch inventory note | role variants, backing agent variants, `disabled/enabled`, Codex discovery success/failure. | Tests must cover all meaningful branches. | P1 | required-now |
| Shape proof | One config source, one launch command producer, and the bounded consumer set: start/restart, reviewer-context launch, and meta-review gate pane launch. | Single task remains bounded. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | All open gaps in `mcp-disabled-agent-launch-plan-v1`. | Task completion should allow plan completion after archive aftermath. | P1 | required-now |
| Depends on | N/A. | Start directly. | P1 | required-now |
| Unlocks / impacts successors | Future UI/status reporting may consume policy. | Do not implement successor read-model now. | P2 | deferred |
| Task-list impact | The parent plan tracker/list is updated to `implementable` for this task. | No supersession. | P2 | required-now |
| Inherited validation / exit expectation | Focused tests plus full repo validation order. | Include evidence in implementation summary. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Repo defaults config | create-time config resolution and bubble preparation only | additive | Add optional per-role MCP policy with disabled defaults; start/restart launch paths consume rendered bubble-local policy and must not reread repo defaults. | N/A |
| Bubble config render/parse | start/restart launch, reviewer-context launch, and meta-review gate pane launch | additive | Persist resolved role policy in bubble config. | N/A |
| `BuildAgentCommandInput` | start/restart launch, reviewer-context launch, and meta-review gate pane launch | breaking internal call-site update | Require every in-scope call site to pass `roleName` and explicit bubble-local `roleMcpPolicy`; retain the command-builder disabled fallback only as a defensive omission guard. | N/A |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Existing Codex launch bypass flag | preserve | Existing and updated agent command tests. | P1 | required-now |
| Existing Claude launch bypass flags | preserve | Existing and updated agent command tests. | P1 | required-now |
| Startup prompt shell quoting | preserve | Existing `bash -n` parse tests plus prompt assertion. | P1 | required-now |
| Missing binary fallback | preserve | Generated script still keeps fallback branch. | P2 | required-now |

### 0f) Success / Completion Proof Boundary

N/A

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| Codex-backed role MCP disabled | Role policy is `disabled`, role resolves to `codex`, and the allowed discovery subcommand `codex mcp list --json` exits successfully within the hard-coded 5 second launch-script timeout with a validated top-level array of MCP entries. | Invoking the final Codex role-pane command before timeout-bounded JSON discovery, shape validation, TOML key encoding, and disable-argument array construction have succeeded. | Timeout after 5 seconds, cancellation, signal termination, or discovery/validation failure prints a `PAIRFLOW_ROLE_MCP_DISABLE_UNAVAILABLE` style message including role and agent, then drops to shell. A validated array with zero enabled servers is success and may invoke the final Codex role-pane command with no generated MCP override args. | P1 | required-now |
| Claude-backed role MCP disabled | Role policy is `disabled`, role resolves to `claude`, and static strict empty MCP flags are present. | Invoking `claude` without strict empty MCP config. | Covered by generated command tests. | P1 | required-now |
| Role policy enabled | The concrete workflow role policy is explicitly `enabled`. | Adding disable flags for that role, even if another role using the same agent is disabled. | Preserve current launch behavior for that role pane. | P1 | required-now |

## L2 - Implementation Notes

### Suggested Design

1. Add vocabulary:
   ```ts
   export const roleMcpPolicyValues = ["disabled", "enabled"] as const;
   export type RoleMcpPolicy = (typeof roleMcpPolicyValues)[number];
   ```
2. Add defaults:
   ```ts
   export const DEFAULT_ROLE_MCP_POLICY_BY_ROLE = {
     implementer: "disabled",
     reviewer: "disabled",
     meta_reviewer: "disabled"
   } as const;
   ```
3. Add config shape under repo defaults, for example:
   ```toml
   [defaults.role_mcp]
   implementer = "disabled"
   reviewer = "enabled"
   meta_reviewer = "disabled"
   ```
4. Render resolved bubble-local config, for example:
   ```toml
   [role_mcp]
   implementer = "disabled"
   reviewer = "disabled"
   meta_reviewer = "disabled"
   ```
5. Extend `BuildAgentCommandInput` with the resolved policy for the concrete
   role pane:
   ```ts
   roleName: "implementer" | "reviewer" | "meta_reviewer";
   roleMcpPolicy?: RoleMcpPolicy;
   ```
   `roleName` is required for all in-scope call sites. `roleMcpPolicy` remains
   optional only as a defensive command-builder fallback; call sites must pass
   the explicit bubble-local policy.
   Omitted-policy fallback diagnostics must always include the required
   `roleName`; conditional role-context wording is not acceptable for in-scope
   launch call sites.
   Default inside `buildAgentCommand` must still be `disabled` to avoid unsafe
   call-site omissions.
6. In Claude disabled mode, append strict empty MCP flags before startup prompt.
7. In Codex disabled mode, generate a shell array before invoking the final
   Codex role-pane command:
   - run the allowed discovery subcommand `codex mcp list --json`
   - parse with the same Node.js runtime class required to run the Pairflow CLI,
     using `node` on `PATH` in the generated launch script; if `node` is not
     available, JSON parsing exits non-zero, or the parser script itself fails,
     treat that as `PAIRFLOW_ROLE_MCP_DISABLE_UNAVAILABLE`
   - accept only a top-level JSON array; each enabled server entry must be an
     object with `enabled === true` and a non-empty string `name`; entries with
     `enabled === false` are ignored, and any other enabled/name shape fails
     closed before the final Codex role-pane command is invoked
   - encode every accepted server name as a TOML quoted key segment for the
     Codex config override path; reject names containing ASCII control
     characters (`U+0000`-`U+001F`, `U+007F`) and escape `\` and `"`, so a
     server named `foo.bar` becomes
     `mcp_servers."foo.bar".enabled=false` rather than two nested keys
   - build repeated `-c "mcp_servers.\"${escaped_name}\".enabled=false"` args;
     raw dotted-key interpolation from the unescaped server name is forbidden
   - invoke the final role-pane command as
     `codex "${codex_mcp_disable_args[@]}" ...`; the array may be empty only
     after a validated empty enabled-server result
8. Keep all shell interpolation quoted and covered by `bash -n` tests.

### Required Tests

1. `tests/core/runtime/agentCommand.test.ts`
   - default Codex-backed role command contains launch-time MCP-disable discovery
     logic
   - Codex disabled mode accepts a top-level array of `{ name, enabled }`
     entries, ignores `enabled === false`, and treats an empty enabled-server
     set as valid
   - Codex disabled mode fails closed before invoking the final Codex role-pane
     command for non-zero discovery exit, malformed JSON, non-array JSON,
     enabled entries without a non-empty string `name`, unsupported/malformed
     `enabled` values, accepted-name TOML encoding failures, names containing
     ASCII control characters, missing `node` on `PATH`, and Node parser script
     failure
   - Codex disabled mode encodes server names as TOML quoted key segments and
     covers names with dots, quotes, and backslashes; raw
     `mcp_servers.${name}.enabled=false` interpolation is not acceptable
   - Codex disabled mode rejects control-character names such as embedded
     newlines before invoking the final Codex role-pane command
   - Codex disabled mode tests assert no hard-coded server names such as
     `codescene` or `supabase`
   - default Claude-backed role command contains `--strict-mcp-config` and empty
     MCP config
   - explicit role `enabled` policy omits MCP-disable discovery/overrides even
     when the backing agent is Codex
   - explicit role `enabled` policy omits strict MCP flags even when the backing
     agent is Claude
   - two roles using the same backing agent can have different MCP policies
   - startup prompt remains last and shell-safe
   - generated command parses with `bash -n`
   - omitted `roleMcpPolicy` falls back to disabled while preserving
     role-aware diagnostics through the required `roleName`
   - discovery timeout uses the hard-coded 5 second launch-script constant and
     timeout, cancellation, or signal termination fails closed before invoking
     the final Codex role-pane command
2. `tests/config/repoConfig.test.ts`
   - repo defaults accept `disabled` and `enabled` under role keys
   - unknown role policy keys fail validation with a clear path
   - invalid values fail validation with clear path
   - omitted values default to disabled downstream
3. `tests/config/bubbleConfig.test.ts`
   - rendered bubble config includes resolved role policy
   - parser round-trips role policy
   - missing supported role policy keys default to `disabled` when bubble config
     is parsed
   - unknown role policy keys fail validation with a clear path
   - invalid bubble policy fails validation
4. Create-time persistence tests must cover both mandatory validation surfaces:
   `tests/core/bubble/createBubble.test.ts` covers rendered bubble config, and
   `tests/v11/application/create/createRepoDefaultsRuntimeIsolation.test.ts`
   covers repo-default isolation:
   - assert repo-default role MCP policy is resolved during create/preparation
     and rendered durably into bubble config
   - assert later start/restart consumers can use the bubble-local policy
     without rereading mutable repo defaults
5. `tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts`
   - explicit `meta_reviewer = "enabled"` policy from bubble config is threaded
     through the meta-review runtime capability / pane-binding input path into
     `buildAgentCommand(...)`
   - the meta-review pane path does not rely on `buildAgentCommand(...)`'s
     default-disabled fallback when an explicit opt-in is configured
   - disabled/default meta-reviewer policy still produces the same fail-closed
     MCP-disable behavior as other roles
   - prove the upstream meta-review apply/rerun callers construct pane-binding
     inputs with explicit `meta_reviewer` role policy in this file, using
     focused apply/rerun caller fixtures
6. Existing start/restart tests:
   - assert start launch passes the bubble-local resolved `implementer`
     `roleMcpPolicy` and role name into `buildAgentCommand(...)`, rather than
     relying on the command builder's default-disabled fallback
   - assert restart/resume launch reuses bubble-local resolved role policy and
     does not reread mutable repo defaults mid-bubble
   - update fixtures only where new rendered config is expected
7. Reviewer-context launch coverage, either in existing reviewer-context tests or
   a new focused test:
   - assert reviewer pane launch passes bubble-local resolved `reviewer`
     `roleMcpPolicy` and role name into `buildAgentCommand(...)`
   - assert `reviewer = "enabled"` reaches command construction even when
     `implementer` remains disabled

### Verification Commands

1. Pre-implementation stop-condition evidence, before source implementation and
   before validation commands:
   - record the installed Codex CLI help/flag check showing no first-class
     no-MCP launch flag was available before implementation, or route back if
     such a flag exists
   - record a bounded `codex mcp list --json` discovery smoke result showing it
     does not start MCP servers or require network/auth side effects in the
     implementation environment, or route back if that evidence cannot be
     obtained safely. The safe observation method must run the command under the
     same 5 second timeout in an isolated disposable environment with no
     secret-bearing MCP credentials, capture process exit/stdout/stderr, and use
     an accepted system observation source such as process tree,
     network/file-access tracing, or an equivalent local sandbox trace to show no
     MCP server child process, network connection, or auth prompt was attempted.
   - validate the same smoke output against the task's Codex JSON contract:
     top-level array, enabled entries are objects with `enabled === true` and a
     non-empty string `name`, disabled entries use `enabled === false`, and any
     other shape is a route-back/refinement trigger before implementation starts
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm fitness:check:ci`
5. `pnpm test -- tests/core/runtime/agentCommand.test.ts tests/config/repoConfig.test.ts tests/config/bubbleConfig.test.ts tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts`
   - this focused run must include the meta-review apply/rerun caller
     input-construction proof described in Required Tests item 5 inside
     `metaReviewGatePaneBinding.test.ts`
6. `pnpm test -- tests/core/bubble/createBubble.test.ts tests/v11/application/create/createRepoDefaultsRuntimeIsolation.test.ts`
7. `pnpm test -- tests/v11/application/start/startCommandOrchestration.test.ts tests/core/bubble/startBubble.test.ts tests/core/bubble/restartBubble.test.ts tests/core/runtime/reviewerContext.test.ts`
8. `pnpm test`
9. `pnpm build`

### Stop Conditions

1. Stop and refine the task if `codex mcp list --json` cannot be observed safely
   using the timeout-bounded disposable-environment method above.
2. Stop and refine the task if `codex mcp list --json` is proven to start MCP
   servers or require network/auth checks.
3. Stop and refine the task if the installed `codex mcp list --json` output
   does not match the required JSON shape before implementation starts.
4. Stop and refine the task if Codex exposes a first-class no-MCP flag in the
   installed version before implementation starts.
5. Stop and refine the task if implementation needs to remove `.mcp.json` from
   local overlay defaults.
6. Stop and refine the task if a new public CLI/API flag is required.

## Spec Lock

In this task-artifact convention, `status: implementable` means
specification-ready handoff, not that runtime code changes are already
delivered.

Task state is `IMPLEMENTABLE` because:

1. The role MCP policy authority is closed to Pairflow workflow roles
   (`implementer`, `reviewer`, `meta_reviewer`) and does not depend on backing
   agent identity as the policy key.
2. The config producer, durable bubble config storage, and launch command
   consumer boundaries are enumerated in the canonical contract matrix.
3. The fail-closed Codex discovery behavior and the Claude strict empty MCP
   config behavior are both specified with invalid/missing behavior and required
   tests.
4. UI/status reporting and future agent binaries are explicitly deferred and do
   not block the launch-policy implementation.
5. The implementation verification commands and focused test files are named in
   the task, including meta-reviewer policy threading coverage.

This implementable status must be downgraded back to `draft` or re-reviewed if
Codex MCP discovery is proven to start servers or require external network/auth
side effects, if the installed Codex CLI exposes a first-class no-MCP launch flag
before implementation starts, or if implementation requires editing user MCP
configuration or introducing a new public CLI/API flag.
