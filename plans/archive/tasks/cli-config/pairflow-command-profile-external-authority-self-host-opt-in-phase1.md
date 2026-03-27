---
artifact_type: task
artifact_id: task_pairflow_command_profile_external_authority_self_host_opt_in_phase1_v1
title: "Pairflow Command Profile: External Authority + Self-Host Opt-In (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/runtime/pairflowCommand.ts
  - src/core/runtime/agentCommand.ts
  - src/v11/application/converged/metaReviewRolloutBlockingReasonCodes.ts
  - tests/core/runtime/pairflowCommand.test.ts
  - tests/core/runtime/agentCommand.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/v11/application/converged/metaReviewRolloutBlockingReasonCodes.test.ts
  - docs/meta-review-gate-rollout-runbook.md
  - docs/meta-review-gate-e2e-validation.md
prd_ref: null
plan_ref: plans/archive/plans/cli-config/pairflow-cli-command-profile-external-default-self-host-opt-in-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Pairflow Command Profile: External Authority + Self-Host Opt-In (Phase 1)

## L0 - Policy

### Goal

Eliminate the remaining self-host drift model from `external` command profile semantics.
When a bubble is configured with `pairflow_command_profile=external`, the authoritative Pairflow CLI must be the PATH-resolved external tool, not the bubble worktree's local Pairflow build, even when the target repository is Pairflow itself.
Authority is selected by explicit profile, not by repository identity: `self_host` remains the only opt-in mode where the worktree-local Pairflow build is authoritative.

### Context

Observed mismatch in current implementation:
1. `pairflow bubble status` can still report `PAIRFLOW_COMMAND_PATH_STALE` under `external` profile when the active Pairflow `dist/cli/index.js` entrypoint differs from the worktree-local `dist/cli/index.js`.
2. The external-profile bootstrap wrapper still prefers the worktree-local entrypoint when present.
3. Operator guidance and rollout docs still describe worktree-local command-path identity as desirable or required in places.
4. Product clarification: Pairflow is the orchestration tool. When used on the Pairflow repository as a codebase, `external` profile should still mean "use the external Pairflow tool", not "implicitly self-host from the bubble worktree".

### In Scope

1. Remove worktree-local execution preference from `external` profile bootstrap logic.
2. Remove external-profile stale classification caused solely by mismatch with the worktree-local Pairflow build.
3. Keep `self_host` as the only profile that requires worktree-local entrypoint identity and fail-closed stale behavior.
4. Align rollout blocking reason aggregation with the corrected profile semantics.
5. Update operator-facing docs/guidance so rollout readiness and smoke commands are profile-aware: `external` expects external authority, `self_host` expects worktree-local authority.
6. Add regression tests for external-vs-self_host semantics in runtime helper, pane bootstrap, status, and converged rollout blocking.

### Out of Scope

1. Changing the default profile value or bubble config schema.
2. Adding new command profile modes.
3. Reworking Pairflow's full self-host development workflow beyond the explicit `self_host` profile.
4. General runtime health redesign unrelated to command-path authority.

### Safety Defaults

1. In `external` profile, lack of PATH-resolved `pairflow` remains a fail-closed error.
2. In `external` profile, local worktree Pairflow presence or mismatch is diagnostic only and must not become a blocker.
3. In `self_host` profile, local worktree entrypoint identity remains strict and fail-closed.
4. No repository-name or path heuristic may silently force `self_host`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - runtime command-path assessment semantics,
   - agent-pane bootstrap behavior,
   - rollout blocking reason semantics,
   - operator documentation around command-path readiness.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/pairflowCommand.ts` | command-path assessment | `assessPairflowCommandPath(input) -> PairflowCommandPathAssessment` | `profile === "external"` branch | External profile must not return `stale` merely because active Pairflow `dist/cli/index.js` differs from worktree-local entrypoint. Only PATH unavailability may block external mode. | P1 | required-now | current status output reproduces false stale in Pairflow-on-Pairflow external flow |
| CS2 | `src/core/runtime/pairflowCommand.ts` | pane bootstrap | `buildPairflowCommandBootstrap(worktreePath, profile) -> string[]` | `profile === "external"` branch | External wrapper must execute PATH-resolved external `pairflow` only; it must not prefer or silently fall back to worktree-local entrypoint. | P1 | required-now | current wrapper still execs local entrypoint when present |
| CS3 | `src/core/runtime/pairflowCommand.ts` | operator guidance | `buildPairflowCommandGuidance(worktreePath, profile) -> string` | `profile === "external"` branch | Guidance must describe external tool authority and self_host opt-in clearly; it must not say external wrapper prefers worktree-local build. | P2 | required-now | current text contradicts intended semantics |
| CS4 | `src/core/runtime/agentCommand.ts` | agent pane launch integration | `buildAgentCommand(input) -> string` | bootstrap composition | Generated agent command must preserve the corrected external-authority bootstrap semantics and keep self_host opt-in semantics unchanged. | P1 | required-now | pane lifecycle behavior must match helper contract |
| CS5 | `src/v11/application/converged/metaReviewRolloutBlockingReasonCodes.ts` | rollout blocking resolver | `resolveMetaReviewRolloutBlockingReasonCodesV11(input) -> string[]` | stale reason aggregation | `PAIRFLOW_COMMAND_PATH_STALE` must be emitted only for `self_host` stale identity failures, not for external-mode mismatch. | P1 | required-now | rollout blockers must track real risk only |
| CS6 | `docs/meta-review-gate-rollout-runbook.md` + `docs/meta-review-gate-e2e-validation.md` | rollout/operator docs | markdown guidance | command-path readiness sections, blocking reason-code enumerations, metrics expectations, determinism/failure interpretation sections, and metrics-report smoke marker rows | External profile must no longer require or prefer worktree-local command-path identity in docs, the blocking rollout reason-code contract must explicitly include `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE` as the fail-closed external PATH-unavailable case, and the metrics-report smoke step must explicitly require both command-path blocker counters in runbook and evidence template. | P2 | required-now | active docs still imply worktree-local readiness and omitted the external unavailable blocker |
| CS7 | `tests/core/runtime/pairflowCommand.test.ts` | helper regression tests | `vitest` | existing test file | Lock external non-stale mismatch behavior, external bootstrap authority, self_host stale identity, and guidance wording. | P1 | required-now | regression guard |
| CS8 | `tests/core/runtime/agentCommand.test.ts` | bootstrap script regression tests | `vitest` | existing test file | Verify generated agent scripts preserve external-vs-self_host authority rules. | P1 | required-now | pane bootstrap parity |
| CS9 | `tests/core/bubble/statusBubble.test.ts` | status semantics | `vitest` | existing test file | Verify status under external profile does not report stale due to worktree-local mismatch, while self_host still does. | P1 | required-now | user-visible correctness |
| CS10 | `tests/v11/application/converged/metaReviewRolloutBlockingReasonCodes.test.ts` | rollout blocker tests | `vitest` | existing test file | Verify external mismatch is non-blocking and self_host mismatch remains blocking. | P1 | required-now | rollout-readiness correctness |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| External profile authority | mixed model: external profile can still prefer/compare against worktree-local Pairflow build | single model: PATH-resolved external Pairflow tool is authoritative | `profile=external`, PATH-resolved `pairflow` availability | informational local-entrypoint detail | behavior-tightening | P1 | required-now |
| Self-host profile authority | explicit local-entrypoint identity and stale fail-closed | unchanged | `profile=self_host`, local worktree entrypoint | diagnostic detail fields | non-breaking | P1 | required-now |
| Command-path status semantics | external profile may emit `PAIRFLOW_COMMAND_PATH_STALE` on local mismatch | external profile emits `external` or `missing`, never stale due only to local mismatch | `status`, `profile`, `message` | `entrypointConsistency` | behavior change | P1 | required-now |
| Rollout blocking semantics | stale code may be emitted for external mismatch | stale code emitted only for self_host identity failures | `reasonCode`, `profile`, `status` | none | behavior change | P1 | required-now |
| Operator rollout docs semantics | runbook/template assume worker-side readiness means `worktree_local` | runbook/template express profile-consistent readiness: `external -> external`, `self_host -> worktree_local` | configured profile, smoke command form, expected command-path marker | local entrypoint detail in external mode | documentation change | P2 | required-now |

Normative rules:
1. `external` means external tool authority, even when the bubble worktree belongs to the Pairflow repository.
2. Worktree-local Pairflow identity is authoritative only in `self_host` profile.
3. External-mode mismatch with a local worktree entrypoint may be observable, but it must not be represented as `PAIRFLOW_COMMAND_PATH_STALE`.
4. External-mode readiness is blocked only when PATH-resolved `pairflow` is unavailable.
5. Rollout docs and validation templates must describe command-path readiness as profile-consistent, not universally `worktree_local`.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime bootstrap | external wrapper invokes PATH `pairflow`; self_host wrapper invokes local entrypoint | external wrapper silently executing worktree-local Pairflow | authority model must be profile-driven | P1 | required-now |
| Status/diagnostics | external mode may report informational external status with active entrypoint detail | external mismatch represented as stale/blocking | diagnostics must match product semantics | P1 | required-now |
| Rollout blockers | self_host stale remains blocking | external mismatch becoming rollout blocker | avoid false rollout stops | P1 | required-now |
| Docs/guidance | clarify external-tool vs self-host boundary, including profile-aware smoke commands and readiness markers | wording that implies external should use worktree-local Pairflow | operator model must stay coherent | P2 | required-now |
| Rollout reason-code docs | explicitly enumerate external PATH-unavailable fail-closed behavior | omitting `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE` from rollout blocking reason-code lists or incident guidance | rollout docs must match required-now error contract | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| external profile and PATH `pairflow` unavailable | runtime environment | fail-closed | abort with actionable install/profile guidance | `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE` | error | P1 | required-now |
| external profile and worktree-local entrypoint differs from active entrypoint | local worktree build | result | report non-stale external status; do not block | N/A | info | P1 | required-now |
| self_host profile and local entrypoint missing | local worktree build | fail-closed | existing stale contract remains | `PAIRFLOW_COMMAND_PATH_STALE` | error | P1 | required-now |
| self_host profile and active entrypoint mismatches local entrypoint | active runtime path | fail-closed | existing stale contract remains | `PAIRFLOW_COMMAND_PATH_STALE` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing explicit `pairflow_command_profile` config contract | P1 | required-now |
| must-use | existing PATH availability check for external profile | P1 | required-now |
| must-use | explicit `self_host` profile as the only local-authority path | P1 | required-now |
| must-not-use | repository-name/path heuristic to auto-force self_host | P1 | required-now |
| must-not-use | external-profile fallback to worktree-local Pairflow execution | P1 | required-now |
| must-not-use | external mismatch represented as `PAIRFLOW_COMMAND_PATH_STALE` | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | External assessment ignores local mismatch | `profile=external`, active entrypoint differs from worktree-local, PATH `pairflow` available | `assessPairflowCommandPath` runs | result is non-stale external status | P1 | required-now | automated test |
| T2 | Self-host assessment remains stale on mismatch | `profile=self_host`, active entrypoint differs from worktree-local | `assessPairflowCommandPath` runs | result is `stale` with `PAIRFLOW_COMMAND_PATH_STALE` | P1 | required-now | automated test |
| T3 | External bootstrap uses external authority only | `profile=external`, local entrypoint path exists | `buildPairflowCommandBootstrap` runs | wrapper executes PATH-resolved `pairflow` and does not exec local entrypoint first | P1 | required-now | automated test |
| T4 | External bootstrap still fails closed when PATH tool missing | `profile=external`, PATH `pairflow` unavailable | wrapper startup executes | `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE` path remains intact | P1 | required-now | automated test |
| T5 | Status under external profile is non-stale | bubble uses `external` profile and local/active entrypoints differ | `bubble status` runs | command path is not `stale` | P1 | required-now | automated test |
| T6 | Status under self_host profile stays stale | bubble uses `self_host` profile and local/active entrypoints differ | `bubble status` runs | command path is `stale` | P1 | required-now | automated test |
| T7 | Rollout blocking excludes external mismatch | external command-path mismatch status | blocking reason resolver runs | no `PAIRFLOW_COMMAND_PATH_STALE` returned | P1 | required-now | automated test |
| T8 | Rollout blocking includes self_host mismatch | self_host stale status | blocking reason resolver runs | `PAIRFLOW_COMMAND_PATH_STALE` returned | P1 | required-now | automated test |
| T9 | Guidance and rollout docs are profile-aware | `profile=external` or `profile=self_host` | guidance/docs render | wording and smoke expectations describe external authority vs self_host opt-in without unconditional worktree-local readiness claim, rollout blocker lists explicitly include `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE` for external PATH-unavailable failure, metrics/determinism sections mention the corresponding external-unavailable failure case, and the metrics-report smoke row explicitly requires both command-path blocker counters | P2 | required-now | automated/doc review |

## Acceptance Criteria

1. AC1: `external` profile no longer prefers or requires worktree-local Pairflow authority.
2. AC2: `external` profile never reports `PAIRFLOW_COMMAND_PATH_STALE` solely because worktree-local Pairflow differs from the active external entrypoint.
3. AC3: `self_host` remains the only profile with worktree-local identity enforcement and stale fail-closed behavior.
4. AC4: Rollout blocking and operator docs are aligned with the corrected external-vs-self_host authority model.

### 7) Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2, CS3, CS4 | T1, T3, T4, T9 |
| AC2 | CS1, CS5, CS9, CS10 | T1, T5, T7 |
| AC3 | CS1, CS2, CS4, CS5 | T2, T6, T8 |
| AC4 | CS3, CS5, CS6 | T5, T7, T8, T9 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] If future UX needs it, keep `entrypointConsistency` as informational metadata in external mode without any blocking semantics.
2. [later-hardening] Add a dedicated self-host developer runbook instead of mixing self-host guidance into general rollout docs.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Separate self-host docs | L2 | P2 | later-hardening | operator UX | split external and self-host guidance into different docs/sections |
| H2 | External authority telemetry | L2 | P3 | later-hardening | observability | add lightweight metrics for external/missing/self_host path usage |

## Review Control

1. P1 regresszió, ha `external` profile alatt a wrapper továbbra is a worktree-local Pairflow-t futtatja.
2. P1 regresszió, ha `external` mismatch továbbra is `PAIRFLOW_COMMAND_PATH_STALE`-ként jelenik meg status vagy rollout blocker felületen.
3. P1 regresszió, ha `self_host` stale fail-closed védelme gyengül.

## Assumptions

1. The explicit `pairflow_command_profile` contract already exists and does not need redesign in this phase.
2. The archived plan `plans/archive/plans/cli-config/pairflow-cli-command-profile-external-default-self-host-opt-in-plan-v1.md` remains a valid planning reference for this narrower active task.

## Open Questions (Non-Blocking)

1. Nincs.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. `external` profile authority is fully external-tool based.
2. `self_host` remains the only local-entrypoint identity-enforcing mode.
3. Status, rollout blocking, and docs no longer encode worktree-local preference under `external`.
