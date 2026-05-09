---
artifact_type: plan
artifact_id: plan_mcp_disabled_agent_launch_v1
plan_id: mcp-disabled-agent-launch-plan-v1
created_on: "2026-05-09"
title: "MCP-Disabled Agent Launch Defaults Plan"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-mcp-disabled-agent-launch
active_task_id: 1-mcp-disabled-agent-launch
archive_group: 2026-05-09-mcp-disabled-agent-launch-plan-v1
task_tracker:
  - task_id: 1-mcp-disabled-agent-launch
    task_path: plans/tasks/1-mcp-disabled-agent-launch.md
    status: in_progress
---

# Plan: MCP-Disabled Agent Launch Defaults

## Objective

Make Pairflow-launched role panes start without MCP tools by default, while
preserving an explicit per-role opt-in for cases where a workflow role actually
needs MCP access.

The first implementation should cover the current Pairflow workflow roles:
`implementer`, `reviewer`, and `meta_reviewer`, independent of whether a role is
backed by `codex` or `claude`.

## Done Definition

1. Pairflow agent launch command construction has a typed per-role MCP policy
   with default `disabled` for `implementer`, `reviewer`, and `meta_reviewer`.
2. `claude` launch disables MCPs through Claude Code's explicit isolated MCP
   config path: `--strict-mcp-config --mcp-config '{"mcpServers":{}}'`.
3. `codex` launch disables MCPs by discovering configured Codex MCP servers and
   passing one TOML-quoted key override, for example
   `-c 'mcp_servers."server.name".enabled=false'`, for every enabled/effective
   server.
4. Operators can opt individual workflow roles back into MCP access through
   Pairflow configuration for newly created/prepared bubbles. Already-created
   legacy bubbles without persisted `[role_mcp]` do not reread mutable repo
   defaults at start/restart time; missing bubble-local role keys resolve to
   `disabled` unless a later migration task explicitly rewrites the bubble
   config.
5. Launch behavior is covered by focused unit tests and the relevant config
   parsing/rendering tests.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Pairflow can launch `implementer`, `reviewer`, and `meta_reviewer` panes with MCP access disabled by default, regardless of the backing agent binary. | end_to_end | Bounded launch activation set that resolves role -> agent and calls `buildAgentCommand(...)`: `pairflow bubble start`, restart/resume launch, reviewer-context launch, and meta-review gate pane launch. | Pairflow role policy resolution, command construction, config parsing, bubble config rendering, tests | Installed `codex` and `claude` CLIs must support the documented flags used by the task when selected for a role; Codex disabled mode also requires `node` on `PATH` for launch-time JSON parsing | Planned in `1-mcp-disabled-agent-launch` |

## Guiding Principles

1. Business invariant: a Pairflow role pane should not receive MCP tool
   capability unless Pairflow configuration explicitly opts that workflow role
   into MCP.
2. Control model: Pairflow owns the launch-time MCP policy for Pairflow-created
   role panes; the underlying agent CLI still owns its own MCP configuration
   outside Pairflow.
3. Read-path rule: Pairflow may read its own repo/bubble configuration and, for
   Codex only, may query `codex mcp list --json` at launch time when the current
   role resolves to `codex` and its role MCP policy is `disabled`.
4. Forbidden fallback: do not silently start a Pairflow role pane with MCP
   enabled when that role's configured policy says `disabled` and the disable
   path cannot be constructed.
5. Allowed resolution path: a deterministic launch-time disable operation is
   allowed when it is derived from the current role's resolved agent CLI and
   that CLI's effective MCP server list.
6. Missing-data rule: if `codex mcp list --json` is unavailable, malformed, or
   cannot be parsed while a Codex-backed role has MCP policy `disabled`, that
   role pane launch must fail closed with an actionable message instead of
   starting with MCPs potentially enabled.
7. Sequencing / boundary note:
   - producer-first rule: config vocabulary and defaults must exist before
     launch command construction consumes them.
   - downstream consume families that remain separate: UI display of role MCP
     policy is not required in this plan.
   - cleanup/recovery timing: no cleanup/recovery behavior is included.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/command/agentCommand.ts`
   - `tests/core/runtime/agentCommand.test.ts`
   - `src/config/defaults.ts`
   - `src/config/repoConfig.ts`
   - `src/config/bubbleConfig/render.ts`
   - `src/v11/shared/config/bubbleConfigTypes.ts`
   - `pairflow.toml`
2. Closed canonical elements / terms:
   - role names remain `implementer | reviewer | meta_reviewer`.
   - `AgentName` values remain `codex | claude`.
   - Existing permission bypass flags remain part of launch behavior.
   - Existing `pairflow_command_profile` bootstrap behavior remains unchanged.
3. Explicitly authorized reinterpretation:
   - MCP policy authority moves from the backing agent binary to the workflow
     role. This is authorized because `pairflow.toml` already allows roles such
     as `reviewer` to resolve to different agents.
   - This plan must not reinterpret agent identity, role identity, or Pairflow
     command profile semantics beyond that policy-owner shift.
4. Downstream task impact:
   - `1-mcp-disabled-agent-launch` inherits these launch-command and config
     boundaries.

## Current Status

### Completed Work

1. Manual research found that Claude Code supports strict MCP isolation via
   `--strict-mcp-config` plus an empty `--mcp-config`.
2. Manual research found that Codex supports per-invocation config overrides and
   exposes effective MCP servers through `codex mcp list --json`.
3. Manual research found no Codex CLI `--no-mcp` equivalent in the installed
   help output.

### Open Work

1. Implement typed per-role MCP launch policy and defaults.
2. Wire the resolved role policy into agent launch command construction for
   `codex` and `claude`.
3. Add focused tests for disabled and opt-in behavior.

### Deferred / Future Work

1. UI/API display of effective role MCP launch policy.
2. Runtime status reporting that proves whether a live pane was launched with
   MCP disabled.
3. Support for additional future agent binaries.

## Progress / Phase Summary

2026-05-09 document refinement: task
`plans/tasks/1-mcp-disabled-agent-launch.md` is now specification-ready for
implementation. The refined task closes the role-policy authority boundary,
durable config/rendering contract, launch-command consumer contract, fail-closed
Codex discovery behavior, Claude strict empty MCP config behavior, focused test
matrix, and deferred UI/status reporting boundary.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-mcp-disabled-agent-launch` | `plans/tasks/1-mcp-disabled-agent-launch.md` | Add config-driven default-disabled MCP launch policy for Pairflow roles, then apply the resolved role policy to the backing `codex` or `claude` launch command. | N/A | All open work in this plan. | in_progress |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Per-role MCP policy defaults | `1-mcp-disabled-agent-launch` | Default must be disabled for `implementer`, `reviewer`, and `meta_reviewer`. |
| Claude MCP disable path | `1-mcp-disabled-agent-launch` | Use explicit strict empty config flags. |
| Codex MCP disable path | `1-mcp-disabled-agent-launch` | Discover server names via JSON list and pass disable overrides. |
| Operator opt-in | `1-mcp-disabled-agent-launch` | Config must allow `enabled` per role. |
| Verification | `1-mcp-disabled-agent-launch` | Unit/config tests plus normal type/lint/fitness/test/build gates. |

## Dependencies and Order

1. Config vocabulary and default resolution must be implemented before role
   launch command generation consumes the policy.
2. Codex disabled launch must not depend on hard-coded server names such as
   `codescene` or `supabase`.
3. Claude disabled launch must not rely on removing `.mcp.json` from local
   overlay; Pairflow still overlays project files, but the Claude CLI invocation
   must ignore all non-explicit MCP configs for that session.

## Risks and Assumptions

1. Assumption: `codex mcp list --json` is stable enough for launch-time
   discovery in the installed Codex CLI version.
2. Risk: future Codex may add a first-class `--no-mcp` flag. If the installed
   Codex CLI exposes that flag before this task's implementation starts, route
   back and refine this task instead of implementing per-server overrides. If
   the flag appears only after this task ships, a later replacement task can
   migrate to it.
3. Risk: querying Codex MCP config at launch must not start MCP servers or hang
   indefinitely. This task uses a hard-coded 5 second discovery timeout local to
   the generated launch script; it does not add a repo config key, bubble config
   key, environment variable, or public CLI/API flag for that timeout.
   Pre-implementation evidence must observe `codex mcp list --json` under the
   same 5 second timeout in an isolated disposable environment without
   secret-bearing MCP credentials, using process/network/file-access tracing or
   an equivalent local sandbox trace. If safe observation is unavailable, the
   command times out, or evidence shows MCP server startup or network/auth
   checks, route back to task refinement before shipping this approach.
4. Assumption: disabling all configured Codex MCP servers by name is equivalent
   to "no MCP tools available" for Pairflow's current use case.

## Validation Strategy

1. `tests/core/runtime/agentCommand.test.ts` proves launch command construction
   for default-disabled and opt-in cases.
2. Config parsing/rendering tests prove the new per-role policy round-trips
   through repo defaults and bubble config.
3. Normal verification for implementation: `pnpm typecheck`, `pnpm lint`,
   `pnpm fitness:check:ci`, focused tests, `pnpm test`, and `pnpm build`.
