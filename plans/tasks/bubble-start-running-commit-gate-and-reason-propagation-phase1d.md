---
artifact_type: task
artifact_id: task_bubble_start_running_commit_gate_and_reason_propagation_phase1d_v1
title: "Bubble Start RUNNING Commit Gate and Reason Propagation (Phase 1D)"
status: draft
phase: phase1d
target_files:
  - src/v11/shared/start/startStateMutation.ts
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandFlows.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/contracts/v11/start.contract.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start RUNNING Commit Gate and Reason Propagation (Phase 1D)

## Current Codebase Check (2026-04-10)

1. A bubble review alapjan a `START_RUNNING_COMMIT_BLOCKED` ma nem marad vegig canonical reason code a start boundarykon.
2. A `RUNNING` commit-ready gate kulon acceptance class, mert egyszerre erinti a mutation seamet es a top-level command error surfacet.

## L0 - Policy

### Goal

Lezarni a `RUNNING` commit gate-et ugy, hogy a commit-ready feltetelek explicit, canonical boundaryt alkossanak, es a gate hibai kulon `reasonCode`-dal, nem pusztan wrapped message-kent maradjanak meg.

### In Scope

1. `RUNNING` commit-ready preconditions explicit mutation-gate-je.
2. `START_RUNNING_COMMIT_BLOCKED` canonical reason code propagationja a start API feluleteig.
3. `startup_recovery` clear/archive semantics a sikeres commit ponton.
4. Contract tests a gate-es reason-code megorzesre.

### Out of Scope

1. Failure-policy selection es cleanup producer semantics.
2. Tmux attribution vagy signal handling.
3. Live recovery/reclaim delivery.

### Safety Defaults

1. `RUNNING` csak explicit commit-ready gate utan perzisztalhato.
2. Commit gate hiba nem veszhet el generic wrapperben.
3. Sikeres `RUNNING` transition utan az aktiv `startup_recovery` blokk nem maradhat canonical authority.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - start mutation seam
   - start command error surface
   - commit-ready state contract

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `6`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: `RUNNING` commit gate + propagated `reasonCode`
   - forbidden secondary sources: message-prefix parsing mint egyetlen authority

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/start/startStateMutation.ts` | commit gate | `executeStartRunningMutation(...) -> StartLoadedStateSnapshot` | mutation seam | explicit commit-ready gate canonical reason code-dal | P1 | required-now | T1 |
| CS2 | `src/v11/application/start/startCommandFlows.ts` | flow commit step | `runFreshStartFlow(...)`, `runRecoverPreparingStartFlow(...)` | start flow | commit gate hiba canonicalan marad tovabbitva | P1 | required-now | T2 |
| CS3 | `src/v11/application/start/startCommandApi.ts` | error surface | `startBubble(...) -> StartBubbleResult` | top-level API boundary | gate reason code nem veszik el generic wrap alatt | P1 | required-now | T2, T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| commit gate failure | plain error message prefix | canonical start error | `reasonCode`, human-readable message | cause | internal contract hardening | P1 | required-now |
| success commit clear behavior | implicit delete | explicit clear/archive rule | no active `startup_recovery` authority under `RUNNING` | optional archival marker | internal contract hardening | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| `RUNNING` transition | explicit commit-ready gate utan persist | precondition nelkuli `RUNNING` write | commit-point authority explicit marad | P1 | required-now |
| error mapping | canonical reason-code preservation | message-only wrapper elveszti a gate identityt | top-level API auditability kotelezo | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| runtime ownership nem commit-ready | state mutation | throw | canonical gate error | `START_RUNNING_COMMIT_BLOCKED` | error | P1 | required-now |
| worktree status nem commit-ready | state mutation | throw | canonical gate error | `START_RUNNING_COMMIT_BLOCKED` | error | P1 | required-now |
| tmux status nem commit-ready | state mutation | throw | canonical gate error | `START_RUNNING_COMMIT_BLOCKED` | error | P1 | required-now |
| successful running commit | state mutation | result | clear/archive `startup_recovery` authority | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1A schema, explicit commit-ready gate | P1 | required-now |
| must-not-use | regex/message-prefix fallback mint canonical reason propagation | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | commit gate blocks unsafe RUNNING write | preparing descriptor nem commit-ready | running mutation fut | canonical `START_RUNNING_COMMIT_BLOCKED` | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T2 | top-level reason propagation | flow commit gate hibat kap | `startBubble` catch lefut | `reasonCode` nem veszik el wrapperben | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/contracts/v11/start.contract.runner.ts` |
| T3 | successful running commit clears recovery | commit-ready preparing descriptor | start flow sikeres | `RUNNING` alatt aktiv `startup_recovery` nincs | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Külon machine-readable metadata hasznos lehet a commit gate altipusokhoz.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | fine-grained commit-gate subcodes | L2 | P2 | later-hardening | review follow-up | kulon diagnostics follow-up |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. A review fo kerdese: a commit-point hiba ugyanazzal a reason code-dal latszik-e minden boundaryn.

## Spec Lock

Mark task as `IMPLEMENTABLE` when a `RUNNING` commit gate hiba nem veszhet el wrapper szinteken, es a sikeres `RUNNING` transition explicit recovery-clear semanticset alkalmaz.
