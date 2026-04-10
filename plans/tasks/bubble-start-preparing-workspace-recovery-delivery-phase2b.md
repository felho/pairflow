---
artifact_type: task
artifact_id: task_bubble_start_preparing_workspace_recovery_delivery_phase2b_v1
title: "Bubble Start PREPARING_WORKSPACE Recovery Delivery (Phase 2B)"
status: draft
phase: phase2b
target_files:
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/application/reconcile/runReconcileFlow.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/startupReconciler.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start PREPARING_WORKSPACE Recovery Delivery (Phase 2B)

## L0 - Policy

### Goal

Leszallitani a `PREPARING_WORKSPACE` recovery pathot ugy, hogy a bubble explicit contract alapjan:
1. ujrahasznaljon egy elo tmux/runtime sessiont, vagy
2. reclaimelje a stale registry ownershipet es relauncholja a startupot.

### In Scope

1. `recover_preparing` start mode delivery.
2. Live tmux reuse path.
3. Stale registry reclaim + relaunch path.
4. Reconcile es restart alignment a `PREPARING_WORKSPACE` recovery contracttal.

### Out of Scope

1. Tmux launch attribution internals (Phase 2A).
2. Operator/status hardening.

### Safety Defaults

1. `PREPARING_WORKSPACE` nem generic resume.
2. Elo tmux session ujrahasznalata csak explicit recovery contract mellett megengedett.
3. Dead tmux + stale registry esetben deterministic reclaim kell; nincs manual-only recovery default.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - start mode routing
   - runtime session ownership reuse/reclaim
   - reconcile stale reasoning

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `6`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: Phase 1 startup recovery contract
   - forbidden secondary sources: generic runtime-state assumptions without preparing contract

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/start/startCommandOrchestration.ts` | mode routing | `resolveStartBubbleMode(state) -> StartBubbleMode` | state routing | `PREPARING_WORKSPACE` kulon recovery modot kap | P1 | required-now | T1 |
| CS2 | `src/v11/application/start/startCommandSession.ts` | ownership reuse/reclaim | `claimRuntimeSessionOwnership(input) -> RuntimeSessionOwnership` | ownership claim boundary | explicit reuse vs reclaim kulonul el | P1 | required-now | T2, T3 |
| CS3 | `src/v11/application/start/startCommandFlows.ts` | preparing recovery flow | `runRecoverPreparingStartFlow(...) -> FreshStartResult` | start orchestration | live session reuse vagy stale relaunch deterministicen fut | P1 | required-now | T2, T3 |
| CS4 | `src/v11/application/reconcile/runReconcileFlow.ts` | stale reasoning | `resolveStaleReason(...) -> reason | null` | reconcile boundary | a `PREPARING_WORKSPACE` allapot nem generic runtime stale szaballyal kezelodik | P1 | required-now | T4 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Preparing recovery ownership | implicit | explicit reuse/reclaim result | `claimed`, `reusedLiveSession`, `tmuxSessionName` | provenance diagnostics | internal hardening | P1 | required-now |
| Preparing recovery state route | generic state-based routing | contract-based route | lifecycle state, recovery descriptor | diagnostics | internal hardening | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| registry | stale reclaim explicit contract alapjan | reclaim live session ownership bizonyitas nelkul | live vs stale kulonuljon el | P1 | required-now |
| tmux | live session reuse vagy relaunch | generic resume without attribution | preparing recovery nem egyenlo RUNNING resume | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `PREPARING_WORKSPACE` + live tmux | runtime/tmux | result | reuse path | `START_PREPARING_RECOVERABLE` | info | P1 | required-now |
| `PREPARING_WORKSPACE` + dead tmux + stale registry | runtime/tmux | fallback | reclaim + relaunch | `START_PREPARING_RECLAIM` | warn | P1 | required-now |
| `PREPARING_WORKSPACE` + ambiguous ownership | runtime/tmux | throw | preserve-for-recovery, no generic resume | `START_PREPARING_OWNERSHIP_AMBIGUOUS` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1 contract, Phase 2A attribution/cleanup semantics | P1 | required-now |
| must-not-use | generic RUNNING resume semantics `PREPARING_WORKSPACE` alatt | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | mode routing | persisted `PREPARING_WORKSPACE` bubble | start runs | `recover_preparing` agra megy | P1 | required-now | `tests/v11/application/start/startCommandOrchestration.test.ts` |
| T2 | live tmux reuse | preparing state + live session | start runs | reuse without bootstrap/relaunch | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | stale reclaim relaunch | preparing state + dead tmux + stale registry | start runs | claim remove + relaunch + running transition | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T4 | reconcile alignment | preparing bubbles live/dead tmux variants | reconcile runs | explicit stale/non-stale handling | P1 | required-now | `tests/core/runtime/startupReconciler.test.ts`, `tests/core/runtime/restartRecovery.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Külon reconcile reason code-ok tovabbi operator diagnosztikahoz hasznosak lehetnek.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Additional reconcile diagnostics for preparing recovery | L2 | P2 | later-hardening | planning | Phase 3 |

## Review Control

1. A review fo kerdese: elvalik-e egyertelmuen a live reuse es a stale reclaim.

## Spec Lock

Mark task as `IMPLEMENTABLE` when `PREPARING_WORKSPACE` alatt a start deterministicen reuse-ol vagy reclaimel, es nem generic resume-zik.
