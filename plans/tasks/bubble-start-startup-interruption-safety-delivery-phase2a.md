---
artifact_type: task
artifact_id: task_bubble_start_startup_interruption_safety_delivery_phase2a_v1
title: "Bubble Start Startup Interruption Safety Delivery (Phase 2A)"
status: draft
phase: phase2a
target_files:
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandCleanup.ts
  - src/v11/application/start/startCliRunner.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/tmuxManager.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start Startup Interruption Safety Delivery (Phase 2A)

## L0 - Policy

### Goal

Leszallitani a startup interruption safety reteget ugy, hogy a fresh start partial hibai es a `SIGINT`/`SIGTERM` megszakitasok ne hagyjanak maguk utan hamis `RUNNING` snapshotot, es ne teardownoljanak vakon megosztott eroforrasokat.

### In Scope

1. Typed tmux launch attribution delivery.
2. Explicit startup interruption cleanup `SIGINT`/`SIGTERM` alatt.
3. Teardown ownership szabalyok deliveryje a start cleanupban.
4. Fresh startup commit pont implementacios lezárása Phase 1 contract alapjan.

### Out of Scope

1. `PREPARING_WORKSPACE` recovery branch live reuse / stale reclaim viselkedese.
2. Reconcile alignment.
3. Operator/status UX.

### Safety Defaults

1. Startup interruption utan nincs vak tmux kill pusztan expected session nev alapjan.
2. `RUNNING` csak explicit startup commit utan perzisztalhato.
3. Ha az ownership nem bizonyithatoan local-attempt, preserve-for-recovery az alapertelmezett.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - start command lifecycle contract
   - tmux launch attribution contract
   - interruption cleanup contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `5`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: Phase 1 startup resource contract
   - forbidden secondary sources: inferred tmux existence, raw process interruption without cleanup policy

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | launch attribution | `launchBubbleTmuxSession(input) -> { sessionName, ... }` + typed launch error | tmux launch boundary | A session-letrehozas explicit attributiont ad a cleanupnak | P1 | required-now | T1 |
| CS2 | `src/v11/application/start/startCommandApi.ts` | startup failure capture | `startBubble(input, dependencies) -> StartBubbleResult` | start command catch path | A startup catch path a typed attributionot es signal-safe cleanup policy-t hasznalja | P1 | required-now | T2 |
| CS3 | `src/v11/application/start/startCommandCleanup.ts` | cleanup ownership | `cleanupFailedStart(input) -> Promise<void>` | cleanup boundary | A cleanup csak explicit local-attempt ownershipnel rollbackel | P1 | required-now | T3 |
| CS4 | `src/v11/application/start/startCliRunner.ts` | signal interruption handling | CLI runner lifecycle | CLI entrypoint | `SIGINT`/`SIGTERM` alatt explicit startup cleanup fut | P1 | required-now | T4 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Tmux launch error | partial typed semantics | explicit local-attempt attribution | `sessionName`, `sessionCreated`, launch stage | cause metadata | internal hardening | P1 | required-now |
| Startup interruption cleanup | JS exception centric | signal-aware cleanup contract | interruption type, attributable resources, rollback policy | diagnostics | internal hardening | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| tmux | explicit local-attempt rollback | expected-name blind kill | ownership evidence kotelezo | P1 | required-now |
| state | startup commit utan `RUNNING` persist | pre-launch `RUNNING` persist | Phase 1 contract szerint | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| tmux launch partial fail | tmux | throw | preserve-for-recovery vagy explicit local rollback | `START_TMUX_PARTIAL_LAUNCH` | error | P1 | required-now |
| startup interrupted by signal | process signal | fallback | explicit cleanup policy fut, then fail-closed | `START_INTERRUPTED` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1 startup contract, typed tmux attribution | P1 | required-now |
| must-not-use | pre-launch `RUNNING`, blind cleanup by expected session name | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | partial tmux launch attribution | session created, later stage fails | launch runs | typed local-attempt attribution error jon vissza | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |
| T2 | startup catch path consumes attribution | fresh start partial tmux fail | `startBubble` runs | cleanup a typed attribution alapjan dont | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | cleanup ownership is not inferred | unrelated/pre-existing session collision | cleanup runs | nem kill-eli a nem-local sessiont | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T4 | signal interruption cleanup | tmux session mar el, state meg startup alatt | process interrupted | explicit startup cleanup path fut | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kulon interruption reason artifact hasznos lehet operator diagnosztikahoz.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Operator-visible interruption diagnostics | L2 | P2 | later-hardening | Phase split | Phase 3 |

## Review Control

1. A legfontosabb review kerdes: bizonyitottan local-attempt eroforrasokra rollbackel-e a flow.

## Spec Lock

Mark task as `IMPLEMENTABLE` when a startup interruption vagy partial tmux launch hiba nem tud hamis `RUNNING` allapotot vagy blind cleanupot okozni.
