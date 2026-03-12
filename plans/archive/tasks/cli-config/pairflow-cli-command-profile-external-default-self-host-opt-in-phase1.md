---
artifact_type: task
artifact_id: task_pairflow_cli_command_profile_external_default_self_host_opt_in_phase1_v1
title: "Pairflow CLI Command Profile: External Default + Self-Host Opt-In (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/core/bubble/createBubble.ts
  - src/core/runtime/agentCommand.ts
  - src/core/runtime/pairflowCommand.ts
  - src/core/bubble/statusBubble.ts
  - src/core/agent/converged.ts
  - src/cli/commands/bubble/create.ts
  - tests/core/runtime/pairflowCommand.test.ts
  - tests/core/runtime/agentCommand.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/agent/converged.test.ts
  - tests/cli/bubbleCreateCommand.test.ts
prd_ref: null
plan_ref: plans/archive/plans/cli-config/pairflow-cli-command-profile-external-default-self-host-opt-in-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Pairflow CLI Command Profile: External Default + Self-Host Opt-In (Phase 1)

## L0 - Policy

### Goal

Fix the repo-agnostic base case bug where bubble agents fail with `PAIRFLOW_COMMAND_PATH_STALE` in non-Pairflow repositories by making PATH-resolved external Pairflow CLI the default command profile, while preserving current worktree-local behavior as explicit self-host opt-in.

### Context

Observed mismatch:
1. Current bootstrap hard-pins agent panes to `<worktree>/dist/cli/index.js`.
2. This is valid for self-host development of Pairflow itself, but not for normal usage where Pairflow orchestrates another repository.
3. In base-case repositories without local Pairflow build outputs, the wrapper fails closed (`exit 86`) and emits `PAIRFLOW_COMMAND_PATH_STALE`.

### In Scope

1. Introduce bubble-level command profile with explicit values:
   - `external` (default),
   - `self_host` (opt-in).
2. Update agent bootstrap command wiring to respect selected profile.
3. Update command-path assessment semantics so `stale` is evaluated only when profile requires self-host local entrypoint identity.
4. Preserve strong fail-closed behavior in `self_host` mode.
5. Add CLI surface for selecting profile at bubble create.
6. Add tests for profile selection, command construction, status reporting, and converged rollout metadata behavior.

### Out of Scope

1. Meta-review protocol redesign.
2. Full command-discovery framework across all tools.
3. Backfilling historical bubbles.
4. Per-command profile split (bootstrap/typecheck/test independent profile selection).

### Safety Defaults

1. Default profile is `external`.
2. `self_host` remains strict fail-closed when local entrypoint is missing or mismatch.
3. Unknown profile value must fail validation; no silent downgrade.
4. Existing bubbles without explicit profile field must be interpreted as `external` for forward-safe base-case behavior.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - bubble config schema (new command-profile field),
   - CLI create options (new selector),
   - runtime command bootstrap behavior,
   - status/converged command-path diagnostics semantics.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | bubble config type extension | `BubbleConfig` type fields | bubble config schema/type declarations | Add command profile enum (`external|self_host`) with deterministic default interpretation | P1 | required-now | stale behavior must be profile-aware |
| CS2 | `src/core/bubble/createBubble.ts` | bubble config assembly | `createBubble(...) -> Promise<BubbleCreateResult>` | config construction before persistence | Persist selected profile from CLI/input; if absent, write `external` | P1 | required-now | base-case must not depend on local Pairflow build |
| CS3 | `src/cli/commands/bubble/create.ts` | create command parsing | `handleBubbleCreateCommand(...)` | create options parsing | Add `--pairflow-command-profile external|self_host` and validate | P1 | required-now | explicit operator control for self-host exception |
| CS4 | `src/core/runtime/agentCommand.ts` | bootstrap composition | `buildAgentCommand(input) -> string` | wrapper bootstrap generation | Build wrapper behavior according to profile: external calls PATH-resolved CLI; self_host uses local entrypoint pinning | P1 | required-now | command path must align with intended mode |
| CS5 | `src/core/runtime/pairflowCommand.ts` | profile-aware command path helpers | `assessPairflowCommandPath(input) -> PairflowCommandPathAssessment`; `buildPairflowCommandBootstrap(...)` | runtime command helper module | Compute stale only for self-host identity rule; external mode reports non-stale unless command missing | P1 | required-now | avoid false-positive stale in base case |
| CS6 | `src/core/bubble/statusBubble.ts` | status command-path diagnostics | `getBubbleStatus(...) -> Promise<BubbleStatusView>` | commandPath assembly | Include profile-aware status/reason text consistent with runtime mode | P1 | required-now | status must explain real problem, not self-host mismatch in external mode |
| CS7 | `src/core/agent/converged.ts` | rollout blocking reason derivation | `resolveMetaReviewRolloutBlockingReasonCodes(...)` | reason code aggregation | `PAIRFLOW_COMMAND_PATH_STALE` included only when active profile is `self_host` and assessment is stale | P1 | required-now | block signals must match actual risk |
| CS8 | `tests/core/runtime/pairflowCommand.test.ts` | helper tests | vitest | existing test file | Add profile-specific stale/non-stale and wrapper behavior coverage | P1 | required-now | regression guard |
| CS9 | `tests/core/runtime/agentCommand.test.ts` | bootstrap script tests | vitest | existing test file | Verify generated script path and fallback per profile | P1 | required-now | regression guard |
| CS10 | `tests/core/bubble/statusBubble.test.ts` | status rendering logic | vitest | existing test file | Verify commandPath messages for external vs self_host | P1 | required-now | user-visible correctness |
| CS11 | `tests/core/agent/converged.test.ts` | rollout reason tests | vitest | existing test file | Verify stale reason blocking only under self_host | P1 | required-now | avoids false rollout-block analytics |
| CS12 | `tests/cli/bubbleCreateCommand.test.ts` | create CLI option tests | vitest | existing test file | Validate option parsing/default and invalid value rejection | P1 | required-now | contract enforcement |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble command profile | implicit self-host assumption | explicit profile enum | `pairflow_command_profile` with values `external|self_host` | none | additive with defaulting for old configs | P1 | required-now |
| CLI create contract | no profile selector | explicit selector option | `--pairflow-command-profile` value validation | omitted -> default `external` | additive | P1 | required-now |
| Command-path assessment | always compares active entrypoint vs worktree-local entrypoint | profile-aware assessment logic | mode-aware status + reason mapping | diagnostic detail fields | behavior fix | P1 | required-now |
| Agent wrapper behavior | always local-entrypoint wrapper | mode-aware wrapper | external: PATH-resolved pairflow command path; self_host: local entrypoint pinning | diagnostic exports | behavior fix | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state/config | persist new profile field | silent profile inference from repository name/path | default only from explicit rule (omitted => external) | P1 | required-now |
| Runtime command bootstrap | profile-aware wrapper script | bypassing wrapper contract entirely | wrapper remains authoritative pane command launcher | P1 | required-now |
| Status/metrics semantics | profile-aware stale classification | preserving stale false-positive behavior under external mode | rollout blockers must represent real risk | P1 | required-now |

Constraint: if profile is `self_host`, existing fail-closed behavior remains unchanged.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid CLI profile value | CLI parser | throw | reject command with actionable message | PAIRFLOW_COMMAND_PROFILE_INVALID | error | P1 | required-now |
| profile missing in bubble config | state/config reader | fallback | interpret as `external` | PAIRFLOW_COMMAND_PROFILE_DEFAULTED | info | P2 | required-now |
| external profile but pairflow command unavailable in PATH | runtime bootstrap | fail-closed | clear missing-binary guidance; interactive shell fallback preserved | PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE | error | P1 | required-now |
| self_host profile local entrypoint missing/mismatch | runtime bootstrap/assessment | fail-closed | existing stale flow + guidance | PAIRFLOW_COMMAND_PATH_STALE | error | P1 | required-now |
| profile-aware assessment cannot resolve active entrypoint | status/converged diagnostics | result | report `unknown` without false stale under external profile | PAIRFLOW_COMMAND_PATH_UNRESOLVED | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing wrapper bootstrap architecture in `pairflowCommand.ts` | P1 | required-now |
| must-use | existing bubble create CLI/config plumbing | P1 | required-now |
| must-not-use | repository-name heuristic to auto-force `self_host` | P1 | required-now |
| must-not-use | silent fallback from `self_host` to `external` after stale detection | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Create default profile | bubble create without profile flag | create command runs | stored config profile is `external` | P1 | required-now | `tests/cli/bubbleCreateCommand.test.ts` |
| T2 | Create explicit self-host profile | bubble create with `--pairflow-command-profile self_host` | create command runs | stored config profile is `self_host` | P1 | required-now | `tests/cli/bubbleCreateCommand.test.ts` |
| T3 | Reject invalid profile | invalid profile token | create command parses args | command fails with validation error | P1 | required-now | `tests/cli/bubbleCreateCommand.test.ts` |
| T4 | External wrapper path | profile `external` | agent command script is built | wrapper calls PATH-resolved pairflow command path; does not hard-require local entrypoint | P1 | required-now | `tests/core/runtime/agentCommand.test.ts` |
| T5 | Self-host wrapper path | profile `self_host` | agent command script is built | wrapper pins local entrypoint and keeps stale fail-closed semantics | P1 | required-now | `tests/core/runtime/agentCommand.test.ts` |
| T6 | Status under external profile | profile `external`, active entrypoint differs from worktree local | status command runs | commandPath is not reported as stale mismatch | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` |
| T7 | Status under self-host profile | profile `self_host`, active entrypoint mismatch | status command runs | commandPath reports `stale` with `PAIRFLOW_COMMAND_PATH_STALE` | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` |
| T8 | Converged blocking reasons external mode | profile `external` | converged reason aggregation runs | no blocking code added for stale mismatch | P1 | required-now | `tests/core/agent/converged.test.ts` |
| T9 | Converged blocking reasons self-host mode | profile `self_host` + stale | converged reason aggregation runs | blocking reason includes `PAIRFLOW_COMMAND_PATH_STALE` | P1 | required-now | `tests/core/agent/converged.test.ts` |
| T10 | Legacy bubble config compatibility | existing bubble config without profile field | runtime/status loads config | deterministic default to `external` | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` |

## Acceptance Criteria

1. AC1: Base-case repo-agnostic bubbles work without local Pairflow build artifact requirement.
2. AC2: `external` is the deterministic default profile for new and legacy profile-missing bubbles.
3. AC3: `self_host` remains explicitly selectable and keeps strict stale fail-closed behavior.
4. AC4: `PAIRFLOW_COMMAND_PATH_STALE` is emitted only for self-host identity violations, not external-mode normal operation.
5. AC5: Bubble create CLI validates profile input and rejects invalid values deterministically.
6. AC6: Status and converged rollout diagnostics are profile-aware and semantically aligned.

### 7) Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS2, CS4, CS5, CS8, CS9 | T1, T4, T6 |
| AC2 | CS1, CS2, CS3, CS5, CS6 | T1, T10 |
| AC3 | CS1, CS3, CS4, CS5, CS8, CS9 | T2, T5, T7 |
| AC4 | CS5, CS6, CS7 | T6, T7, T8, T9 |
| AC5 | CS3, CS12 | T3 |
| AC6 | CS6, CS7, CS10, CS11 | T6, T7, T8, T9 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Introduce `auto` profile in a later phase if explicit repo-local Pairflow development heuristics are still needed.
2. [later-hardening] Persist command-profile decision telemetry in bubble lifecycle events for rollout observability.
3. [later-hardening] Consider profile-specific operator hints in startup prompts to reduce confusion.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Optional `auto` mode with explicit precedence rules | L2 | P2 | later-hardening | design follow-up | separate task after external default rollout stabilizes |
| H2 | Extended diagnostics for external command discovery | L2 | P3 | later-hardening | UX follow-up | add richer actionable suggestions without changing fail-closed behavior |

## Review Control

1. P1 regresszió, ha `external` profile mellett továbbra is kötelező a worktree-local `dist/cli/index.js`.
2. P1 regresszió, ha `self_host` profile fail-closed védelme gyengül vagy silent fallbacket kap externalra.
3. P1 regresszió, ha `PAIRFLOW_COMMAND_PATH_STALE` továbbra is megjelenik external base-case mismatch miatt.

## Assumptions

1. Base-case product intent: Pairflow tipikusan nem a Pairflow repo fejlesztésére, hanem más repositoryk orchestrationjére használatos.
2. CLI option bővítés (`bubble create`) elfogadható ebben a fázisban.

## Open Questions (Non-Blocking)

1. Nincs.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. AC1-AC6 traceability sorai maradéktalanul lefedik a CS1-CS12 és T1-T10 contractokat.
2. T1-T10 lefutási/eredményelvárásai profile-aware stale szemantikával teljesülnek.
3. Nincs nyitott blocker vagy open question, amely a required-now scope-ot újranyitná.
