---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_activation_phaseE3b_v1
title: "Actor Runtime Interface Implementer Pilot Activation and Parity Closure (Phase E3b)"
status: implementable
phase: phaseE3b
target_files:
  - src/v11/shared/state/executionContext.ts
  - src/v11/shared/delivery/tmuxDeliveryContract.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/askHuman.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Implementer Pilot Activation and Parity Closure (Phase E3b)

## L0 - Policy

### Goal

1. Aktiválja az implementer pilotot az `E3a` alatt lezart wrapper/authority foundation felett.
2. Bizonyitsa parity evidence-szel az implementer-first pilot minimum csomagjat:
   - fresh delivery,
   - human-input request,
   - stale authority reject,
   - conflicting-context fail-closed,
   - duplicate delivery suppresszio,
   - restart utani uj execution authority.
3. Tartsa meg a retained tmux/runtime surfacet observability-only adapterkent.

### Domain / Control Model Summary

1. Business invariant: a pilot activation nem gyengitheti az `E3a` same-authority foundationt.
2. Control model: explicit authority + explicit runtime ack-source marad a truth; pane activity tovabbra sem acceptance/running forras.
3. Read-path rule: runtime delivery truth csak explicit ack/provenance boundaryrol johet.
4. Forbidden fallback:
   - nincs second successful launch duplicate signalra,
   - nincs restart utani stale authority reuse,
   - nincs pane-visible activitybol szarmaztatott pilot success claim.
5. Allowed resolution path:
   - retained tmux adapter maradhat transport/provenance/debug surface,
   - duplicate masodik signal explicit reject vagy suppresszalt no-op lehet,
   - restart utan friss authority mellett mehet tovabb a pilot.
6. Missing-data rule: explicit ack hianyaban nincs success inference.
7. Phase boundary:
   - wrapper/authority foundation predecessor (`E3a`)
   - implementer activation/parity owned here
   - reviewer/meta-reviewer rollout deferred `E4`

### Authority Boundary Map

1. `internal_execution_consumers`
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
2. `workflow_orchestration_consumers`
   - implementer pass / ask-human runtime tests
3. `cleanup_recovery_consumers`
   - `tests/core/runtime/restartRecovery.test.ts`

### In Scope

1. Implementer pilot runtime activation es parity proof.
2. Duplicate delivery minimum policy bizonyitasa.
3. Restart recovery es stale authority parity.
4. Tmux observability-only retained semantics vedese.

### Out of Scope

1. Wrapper/authority shape redesign.
2. Public emit surface redesign.
3. Reviewer/meta-reviewer rollout.
4. Full tmux cleanup vagy topology csere.

### Safety Defaults

1. Ha a pilot activation csak pane-derived success inferenciaval lenne zold, a task fail-closed.
2. Ha duplicate signal shape bizonytalan, reject vagy suppresszalt no-op az elfogadhato minimum; masodik successful launch nem.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - runtime delivery ack provenance contract
   - restart recovery authority continuity contract
   - duplicate delivery suppression minimum contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `9`
8. `single-task allowed`: `yes`
9. Split note:
   - authority/wrapper foundation mar predecessorben lezart (`E3a`),
   - ez a task csak activation + parity closure.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Control model | Explicit ack/provenance az egyetlen pilot success source. | Tmux activity nem acceptance proof. | P1 | required-now |
| Duplicate rule | Masodik signal nem hozhat masodik successful launch-t. | Reject vagy suppresszalt no-op kell. | P1 | required-now |
| Restart rule | Uj execution authority kotelezo restart utan. | Regi emit stale marad. | P1 | required-now |
| Phase boundary | Foundation dontesek nem nyithatok ujra. | `E3a` baseline adottsag. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/state/executionContext.ts` | restart/running helpers | Restart utan uj authority kelljen. | P1 | required-now | T4 |
| CS2 | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | delivery ack contract | Explicit ack/provenance marad a pilot truth-source. | P1 | required-now | T3 |
| CS3 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | retained adapter runtime | Tmux maradjon observability-only adapter. | P1 | required-now | T3 |
| CS4 | listed tests | runtime parity surfaces | Fresh delivery + duplicate + restart + stale authority bizonyitott legyen. | P1 | required-now | T1-T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Delivery ack provenance | typed ack baseline mar van | implementer pilot explicitten erre epul | preserved baseline + activation proof | P1 | required-now |
| Duplicate handling | minimum policy meg explicit bizonyitast ker | nincs masodik successful launch | compatible tightening | P1 | required-now |
| Restart continuity | retained recovery path letezik | csak uj authority valid restart utan | preserved baseline + parity proof | P1 | required-now |

Normative rules:

1. A task nem nevezheti at a tmux adaptert canonical authority vagy ack-source komponensse.
2. A task nem relaxalhatja a stale-authority fail-closed modellt.
3. A task nem foglalhat magaba reviewer vagy meta-reviewer rolloutot.

### 3) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
|---|---|---|---|---|
| duplicate masodik delivery | result | explicit reject vagy suppresszalt no-op | P1 | required-now |
| restart utan regi authority | throw | uj authority remint szukseges | P1 | required-now |
| ack hianyzik, de pane activity latszik | fallback | diagnostics lehet, success inference nem | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | fresh implementer delivery | pilot canonical route-on fut | P1 | required-now | automated test |
| T2 | human-input request parity | `human_question` pilot szinten vedett | P1 | required-now | automated test |
| T3 | tmux observability-only delayed/missing ack mellett | nincs pane-derived success truth | P1 | required-now | automated test |
| T4 | restart recovery uj authorityt igenyel | regi stale, uj valid | P1 | required-now | automated test |
| T5 | duplicate delivery suppresszio | nincs masodik successful `accepted`/`running` | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az implementer pilot utan a duplicate policy altalanosithato a tobbi role-ra, az mar `E4` alatt kapjon shared helper formát.
