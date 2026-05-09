---
artifact_type: task
artifact_id: task_mcp_disabled_agent_launch_v1
task_family_id: mcp-disabled-agent-launch
sequence_key: "1"
task_id: 1-mcp-disabled-agent-launch
title: "Default-Disabled MCP Agent Launch Policy"
status: draft
phase: phase1
target_files:
  - src/v11/shared/command/agentCommand.ts
  - src/v11/shared/config/bubbleConfigTypes.ts
  - src/config/defaults.ts
  - src/config/repoConfig.ts
  - src/config/bubbleConfig.ts
  - src/config/bubbleConfig/render.ts
  - tests/core/runtime/agentCommand.test.ts
  - tests/config/repoConfig.test.ts
  - tests/config/bubbleConfig.test.ts
prd_ref: null
plan_ref: plans/mcp-disabled-agent-launch-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-09-mcp-disabled-agent-launch-plan-v1
---

# Task: Default-Disabled MCP Agent Launch Policy

## L0 - Policy

### Goal

Add a typed Pairflow launch policy that disables MCP tools for Pairflow-started
`codex` and `claude` agents by default, while allowing explicit per-agent opt-in
from configuration.

### Domain / Control Model Summary

1. Business invariant: Pairflow-created coding agents must not receive MCP tool
   access unless Pairflow configuration explicitly opts the concrete agent
   binary into MCP access.
2. Control model: Pairflow owns launch-time MCP policy for Pairflow-created
   panes; user-level Codex/Claude MCP configuration remains outside Pairflow
   except where Pairflow applies session-scoped disable flags.
3. Read-path rule: Pairflow reads its own config for policy. Codex disabled mode
   may read `codex mcp list --json` at launch time to derive per-server
   `enabled=false` overrides.
4. Forbidden fallback: when policy is `disabled`, do not launch an agent with
   MCPs potentially enabled because disable flag construction failed.
5. Allowed resolution path: for Codex, deriving `-c
   mcp_servers.<name>.enabled=false` from the same Codex CLI's effective MCP JSON
   list is the allowed deterministic resolution path.
6. Missing-data rule: malformed/unavailable Codex MCP JSON while policy is
   `disabled` must fail closed before starting Codex.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here for config parsing/rendering and launch command
     construction
   - internal execution closure: owned here for agent launch command script
   - workflow/orchestration closure: owned here only where start/restart already
     consumes `buildAgentCommand(...)`
   - read-model closure: out of scope
   - activation closure: owned here through existing `bubble start` launch path
   - cleanup/recovery closure: out of scope

### Plan Linkage

1. Parent plan gap closed: all open work in
   `plans/mcp-disabled-agent-launch-plan-v1.md`.
2. Depends on: N/A.
3. Unlocks / impacts successors: future UI/status reporting can surface the
   effective MCP policy after this task.
4. Task-list impact: N/A.
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
   - agent identity: `codex | claude`
   - launch-time MCP policy values: `disabled | enabled`
   - default policy: `disabled` for both `codex` and `claude`
3. Guard elements:
   - Codex MCP JSON discovery validity
   - shell-safe construction of Codex `-c` overrides
   - Claude strict empty MCP config flags
4. Compat-only elements:
   - existing user/global MCP server definitions remain untouched
   - existing `.mcp.json` local overlay remains unchanged unless a later task
     explicitly changes overlay policy
5. Forbidden reinterpretations:
   - do not treat agent role (`implementer`, `reviewer`, `meta_reviewer`) as the
     same thing as agent binary (`codex`, `claude`)
   - do not remove or edit user MCP config files as a way to disable MCPs
   - do not hard-code current local server names such as `codescene` or
     `supabase`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/shared/command/agentCommand.ts`
   - `src/v11/application/start/internal/runtime/startCommandTmuxLaunch.ts`
   - `src/v11/infrastructure/channel/tmux/reviewerContext.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `tests/core/runtime/agentCommand.test.ts`
2. Actual touched scope: config contract plus internal execution launch command.
3. Mutation entrypoints in scope: N/A; this task does not introduce persistent
   lifecycle mutations beyond config parsing/rendering.
4. Hidden scope ruled out: UI display, live pane status read-models, and MCP file
   overlay policy are out of scope.
5. Branch inventory note:
   - agent `codex` vs `claude`
   - policy `disabled` vs `enabled`
   - Codex JSON discovery success vs parse/failure
   - startup prompt present vs absent
6. Why the declared task shape matches reality: one launch-command producer and
   its config vocabulary own the behavior; no cross-command lifecycle state
   semantics change is required.

### Authority Boundary Map

1. Authority producer: Pairflow config resolution produces per-agent MCP policy.
2. Stored authority: repo defaults and rendered bubble config store the selected
   policy when configured.
3. In-scope consumers: `buildAgentCommand(...)` and existing start/restart/meta
   reviewer launch paths that call it.
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
3. Preconditions that must pass before side effects: when Codex MCP policy is
   `disabled`, server-name discovery and override construction must succeed
   before invoking `codex`.
4. Side effects forbidden before preconditions pass: invoking `codex` with MCP
   policy disabled but no disable overrides.
5. Invalid/precondition-failure behavior: print an actionable failure message
   and drop to interactive shell, consistent with existing launch failure style.
6. Coordination primitives in scope: N/A.

### In Scope

1. Add a typed MCP launch policy vocabulary, likely `disabled | enabled`.
2. Add defaults: `codex=disabled`, `claude=disabled`.
3. Add repo defaults parsing for per-agent opt-in, for example:
   ```toml
   [defaults.agent_mcp]
   codex = "disabled"
   claude = "enabled"
   ```
4. Persist/render the resolved policy into bubble config so start/restart paths
   consume durable bubble-local launch policy.
5. Extend `BuildAgentCommandInput` so command construction receives the MCP
   policy for the concrete `agentName`.
6. For Claude disabled mode, add:
   ```bash
   --strict-mcp-config --mcp-config '{"mcpServers":{}}'
   ```
7. For Codex disabled mode, generate launch-time overrides from:
   ```bash
   codex mcp list --json
   ```
   and pass one override per discovered server:
   ```bash
   -c 'mcp_servers.<name>.enabled=false'
   ```
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

1. Default policy is `disabled`.
2. Unknown policy values fail config validation.
3. Codex disabled mode fails closed if effective MCP server discovery cannot be
   parsed.
4. Generated shell must remain `bash -n` parseable under existing tests.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - config contract: new per-agent MCP launch policy in repo/bubble config
   - internal command contract: `buildAgentCommand(...)` consumes the resolved
     policy and changes launch argv defaults

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
    - canonical identity path: concrete `AgentName` (`codex | claude`)
    - competing identifiers or fallback identities: workflow role names must not
      be used as policy keys
11. Authority/source-of-truth note:
    - canonical source: Pairflow resolved config
    - forbidden secondary sources: existing user MCP config must not override
      Pairflow disabled policy for Pairflow-created panes
12. Closure-budget triage:
    - closure buckets touched: config contract, internal execution launch
    - intentionally collapsed closures: config plus direct command construction,
      safe because no external read-model or lifecycle state changes
    - explicitly deferred closures: UI/status reporting
13. Bounded-task-shape decision:
    - primary shape: config contract foundation
    - secondary shape: internal launch execution closure
    - why this bounded mix is safe: launch command construction is the only
      consumer needed to activate the config policy
14. Contract-dense decision:
    - gate triggered: no
    - trigger reasons: N/A
    - canonical matrix source: N/A
    - mirrored surfaces: N/A

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Pairflow-created agents launch without MCP unless explicitly opted in. | Defaults and launch commands must disable MCP for both supported agents. | P1 | required-now |
| Control model | Pairflow config owns Pairflow launch policy. | Do not rely on user MCP config edits or local file deletion. | P1 | required-now |
| Read-path rule | Codex disabled mode may query `codex mcp list --json`. | Discovery happens before launching Codex and feeds `-c` overrides. | P1 | required-now |
| Forbidden fallback | Disabled policy must not silently start MCP-enabled agents. | Codex discovery failure fails closed. | P1 | required-now |
| Allowed resolution path | Same-CLI effective MCP list is allowed for Codex override generation. | No hard-coded server names. | P1 | required-now |
| Missing-data rule | Missing/malformed Codex MCP JSON is a launch precondition failure. | Print actionable message and do not invoke Codex. | P1 | required-now |
| Phase boundary | This task owns config and launch construction only. | UI/status reporting remains deferred. | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `AgentName` | `src/contracts/kernel/agentIdentity.ts` | Concrete binary identity remains `codex | claude`. | preserve | P1 | required-now |
| Launch bypass flags | `src/v11/shared/command/agentCommand.ts` | Existing permission bypass behavior remains. | preserve | P1 | required-now |
| Pairflow command bootstrap | `src/v11/shared/command/agentCommand.ts` | MCP policy must not alter Pairflow command profile behavior. | preserve | P1 | required-now |
| Local overlay `.mcp.json` | `src/config/defaults.ts` | Overlay remains separate from session MCP disable. | preserve | P2 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | `buildAgentCommand(...)` is the launch command producer. | Tests should assert generated scripts, not only config parsing. | P1 | required-now |
| Actual touched scope | Config contract plus launch command construction. | Keep changes local to config and command surfaces. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | No lifecycle mutation changes. | P1 | required-now |
| Hidden scope ruled out | UI/status and overlay changes are out of scope. | Do not expand implementation into read-model work. | P2 | required-now |
| Branch inventory note | `codex/claude`, `disabled/enabled`, Codex discovery success/failure. | Tests must cover all meaningful branches. | P1 | required-now |
| Shape proof | One config source, one launch command consumer. | Single task remains bounded. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | All open gaps in `mcp-disabled-agent-launch-plan-v1`. | Task completion should allow plan completion after archive aftermath. | P1 | required-now |
| Depends on | N/A. | Start directly. | P1 | required-now |
| Unlocks / impacts successors | Future UI/status reporting may consume policy. | Do not implement successor read-model now. | P2 | deferred |
| Task-list impact | N/A. | No supersession. | P2 | required-now |
| Inherited validation / exit expectation | Focused tests plus full repo validation order. | Include evidence in implementation summary. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Repo defaults config | create/start config resolution | additive | Add optional per-agent MCP policy with disabled defaults. | N/A |
| Bubble config render/parse | start/restart launch paths | additive | Persist resolved policy in bubble config. | N/A |
| `BuildAgentCommandInput` | start launch, reviewer context, meta-review defaults | additive/breaking depending call-site update | Thread resolved policy into all call sites. | N/A |

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
| Codex MCP disabled | `codex mcp list --json` exits successfully and yields parseable server names. | Invoking `codex` without generated disable overrides. | Print `PAIRFLOW_AGENT_MCP_DISABLE_UNAVAILABLE` style message and drop to shell. | P1 | required-now |
| Claude MCP disabled | Static strict empty MCP flags are present. | Invoking `claude` without strict empty MCP config. | Covered by generated command tests. | P1 | required-now |
| Policy enabled | Policy is explicitly `enabled`. | Adding disable flags. | Preserve current launch behavior. | P1 | required-now |

## L2 - Implementation Notes

### Suggested Design

1. Add vocabulary:
   ```ts
   export const agentMcpPolicyValues = ["disabled", "enabled"] as const;
   export type AgentMcpPolicy = (typeof agentMcpPolicyValues)[number];
   ```
2. Add defaults:
   ```ts
   export const DEFAULT_AGENT_MCP_POLICY_BY_AGENT = {
     codex: "disabled",
     claude: "disabled"
   } as const;
   ```
3. Add config shape under repo defaults, for example:
   ```toml
   [defaults.agent_mcp]
   codex = "disabled"
   claude = "enabled"
   ```
4. Render resolved bubble-local config, for example:
   ```toml
   [agent_mcp]
   codex = "disabled"
   claude = "disabled"
   ```
5. Extend `BuildAgentCommandInput` with the policy for the concrete agent:
   ```ts
   agentMcpPolicy?: AgentMcpPolicy;
   ```
   Default inside `buildAgentCommand` must still be `disabled` to avoid unsafe
   call-site omissions.
6. In Claude disabled mode, append strict empty MCP flags before startup prompt.
7. In Codex disabled mode, generate a shell array before invoking Codex:
   - run `codex mcp list --json`
   - parse server names using a robust JSON parser available in the runtime
     environment
   - build repeated `-c "mcp_servers.${name}.enabled=false"` args
   - invoke `codex "${codex_mcp_disable_args[@]}" ...`
8. Keep all shell interpolation quoted and covered by `bash -n` tests.

### Required Tests

1. `tests/core/runtime/agentCommand.test.ts`
   - default Codex command contains launch-time MCP-disable discovery logic
   - default Claude command contains `--strict-mcp-config` and empty MCP config
   - explicit Codex `enabled` policy omits MCP-disable discovery/overrides
   - explicit Claude `enabled` policy omits strict MCP flags
   - startup prompt remains last and shell-safe
   - generated command parses with `bash -n`
2. `tests/config/repoConfig.test.ts`
   - repo defaults accept `disabled` and `enabled`
   - invalid values fail validation with clear path
   - omitted values default to disabled downstream
3. `tests/config/bubbleConfig.test.ts`
   - rendered bubble config includes resolved policy
   - parser round-trips policy
   - invalid bubble policy fails validation
4. Existing start/restart tests:
   - update fixtures only where new rendered config is expected.

### Verification Commands

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. `pnpm test -- tests/core/runtime/agentCommand.test.ts tests/config/repoConfig.test.ts tests/config/bubbleConfig.test.ts`
5. `pnpm test`
6. `pnpm build`

### Stop Conditions

1. Stop and refine the task if `codex mcp list --json` is proven to start MCP
   servers or require network/auth checks.
2. Stop and refine the task if Codex exposes a first-class no-MCP flag in the
   installed version before implementation starts.
3. Stop and refine the task if implementation needs to remove `.mcp.json` from
   local overlay defaults.
4. Stop and refine the task if a new public CLI/API flag is required.
