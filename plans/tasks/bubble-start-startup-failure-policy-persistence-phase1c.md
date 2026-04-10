---
artifact_type: task
artifact_id: task_bubble_start_startup_failure_policy_persistence_phase1c_v1
title: "Bubble Start Startup Failure Policy Persistence (Phase 1C)"
status: draft
phase: phase1c
target_files:
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandCleanup.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/shared/start/startStateMutation.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/contracts/v11/start.contract.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start Startup Failure Policy Persistence (Phase 1C)

## Current Codebase Check (2026-04-10)

1. A bubble review szerint a `rollback`, `retry` es `preserve_for_recovery` policyk producer- es consumer-oldala nem teljesen konzisztens.
2. A bootstrap-failure es post-launch failure utak jelenleg olyan descriptorokat irhatnak vissza, amelyek ellentmondanak a kovetkezo start admissionnek.

## L0 - Policy

### Goal

Lezarni a startup failure-policy persistence contractot ugy, hogy a cleanup altal perzisztalt `rollback|retry|preserve_for_recovery` vegallapotok ugyanazzal a canonical jelentessel birjanak, amit a kovetkezo start routing es operator recovery feltetelez.

### In Scope

1. Failure policy selection (`rollback`, `retry`, `preserve_for_recovery`) canonical jelentese.
2. Cleanup proof-status es persisted descriptor shape osszehangolasa.
3. Bootstrap failure, tmux launch failure, post-launch failure es ownership-ambiguous pathok persistence semantics.
4. Cleanup persistence conflict/write-failure canonical reason code-jai.

### Out of Scope

1. Tmux launch attribution delivery.
2. Signal interruption handling.
3. Live tmux reuse vagy stale reclaim delivery.
4. `RUNNING` commit gate canonical propagationja.

### Safety Defaults

1. `rollback` nem hagyhat olyan `PREPARING_WORKSPACE` snapshotot, amely nem ujraindithato es nem magyarazhato.
2. `retry` csak olyan descriptor-shape-et perzisztalhat, amely admission oldalon is retry-safe.
3. Ha teardown proof nem eleg eros, a default `preserve_for_recovery`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - startup cleanup policy
   - runtime ownership vocabulary
   - persisted failure-policy semantics

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `2`
6. `risk_score`: `7`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: persisted failure-policy descriptor a cleanup utan
   - forbidden secondary sources: test-only expected semantics descriptor-consumer alignment nelkul

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/start/startCommandCleanup.ts` | failure policy selection | `cleanupFailedStart(input) -> Promise<void>` | cleanup boundary | producer-oldali `rollback|retry|preserve_for_recovery` semantics explicit es konzisztens | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/start/startCommandSession.ts` | ownership vocabulary | `claimRuntimeSessionOwnership(...) -> RuntimeSessionOwnership` | ownership boundary | dead residue, observed live es ambiguous ownership kulon persistence-szemantikat kap | P1 | required-now | T3 |
| CS3 | `src/v11/shared/start/startStateMutation.ts` | failed cleanup mutation | `executeStartFailedCleanupMutation(...)` | persistence seam | cleanup vegallapot nem mond ellent a kovetkezo startnak | P1 | required-now | T1, T2 |
| CS4 | `tests/contracts/v11/start.contract.runner.ts` | contract expectations | runner assertions | contract test boundary | seed cases a canonical persistence semanticset ellenorzik | P1 | required-now | T4 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| failure policy descriptor | partial/inconsistent | consumer-aligned persisted semantics | `next_start_policy`, `stage`, ownership/runtime/worktree/tmux statuses, `retry_reason_code` | diagnostics | internal contract hardening | P1 | required-now |
| cleanup proof status | implicit | explicit producer input | proven teardown booleans, launched tmux session, ownership signal | diagnostics | internal contract hardening | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| cleanup persistence | canonical descriptor update vagy explicit rollback target state | descriptor shape irasa consumer alignment nelkul | producer-consumer consistency kotelezo | P1 | required-now |
| runtime session cleanup | only if proof-backed policy megengedi | dead residue reclaim Phase 1C-ben mint general recovery delivery | fail-closed elsobbseget elvez | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| bootstrap fail local prep utan | workspace bootstrap | fallback | canonical rollback vegallapot | `START_BOOTSTRAP_FAILED` | error | P1 | required-now |
| post-launch failure verified tmux cleanup-pal | tmux/state | fallback | canonical retry-safe persistence | `START_PREPARING_RETRYABLE` | warn | P1 | required-now |
| teardown nem bizonyithato | tmux/runtime/worktree cleanup | fallback | preserve-for-recovery | `START_TMUX_TEARDOWN_UNVERIFIED` / `START_RUNTIME_SESSION_TEARDOWN_UNVERIFIED` / `START_WORKTREE_ROLLBACK_UNVERIFIED` | warn | P1 | required-now |
| cleanup state write conflict | state store | throw | canonical command error surface | `START_RECOVERY_STATE_CONFLICT` | warn | P1 | required-now |
| cleanup state write I/O hiba | state store | throw | canonical command error surface | `START_RECOVERY_STATE_WRITE_FAILED` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1A schema authority, Phase 1B admission expectations | P1 | required-now |
| must-not-use | dead runtime residue automatikus reclaimje mint Phase 1C default | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | bootstrap failure persistence | local prep + bootstrap hiba | cleanup fut | rollback vegallapot canonical es ujrainditasi szempontbol ertelmes | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T2 | post-launch failure persistence | tmux mar elindult, `RUNNING` commit megbukik | cleanup fut | retry vagy preserve_for_recovery producer shape consumer-kompatibilis | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | dead runtime residue | stale registry entry, no live tmux | start fut | fail-closed semantics explicit, no hidden reclaim | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/contracts/v11/start.contract.runner.ts` |
| T4 | contract corpus update | seed cases | contract runner fut | canonical persistence semantics marad regression-proof | P1 | required-now | `tests/contracts/v11/start.contract.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Teardown proof metadata kesobb operator reportban is hasznos lehet.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | operator-visible teardown proof diagnostics | L2 | P2 | later-hardening | review follow-up | Phase 3 follow-up |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. A review fo kerdese: ugyanazt a vegallapotot olvassa-e ki a kovetkezo start, amit a cleanup perzisztal.

## Spec Lock

Mark task as `IMPLEMENTABLE` when a failure-policy producer nem tud olyan persisted descriptor-shape-et eloallitani, amely admission vagy operator oldalon onellentmondo.
