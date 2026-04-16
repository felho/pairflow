---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_activation_phaseE3b_v1
title: "Actor Runtime Interface Implementer Pilot Activation (Phase E3b)"
status: implementable
updated_at: 2026-04-16
phase: phaseE3b
target_files:
  - plans/actor-runtime-interface-execution-authority-contract-note-v1.md
  - src/v11/application/askHuman/askHumanCommandApi.ts
  - src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts
  - src/v11/application/askHuman/askHumanCommandOrchestration.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/pass/passResultDelivery.ts
  - src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts
  - src/v11/application/askHuman/runAskHumanFlow.ts
  - src/v11/application/askHuman/askHumanFinalizationDependencyBuilder.ts
  - src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts
  - src/v11/application/askHuman/askHumanFinalizationDependencyResolution.ts
  - src/v11/application/askHuman/askHumanFinalization.ts
  - src/v11/application/askHuman/askHumanNotificationEmission.ts
  - src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts
  - src/v11/shared/askHuman/askHumanFlowContract.ts
  - src/v11/shared/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.ts
  - src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts
  - src/v11/shared/askHuman/askHumanCommandContract.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/v11/application/pass/passResultDelivery.test.ts
  - tests/v11/application/askHuman/emitAskHumanV11.test.ts
  - tests/v11/application/askHuman/askHumanCommandOrchestration.test.ts
  - tests/v11/application/askHuman/runAskHumanFlow.test.ts
  - tests/v11/application/askHuman/askHumanFinalizationDependencyBuilder.test.ts
  - tests/v11/application/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.test.ts
  - tests/v11/application/askHuman/askHumanFinalizationDependencyResolution.test.ts
  - tests/v11/application/askHuman/askHumanFinalization.test.ts
  - tests/v11/application/askHuman/askHumanNotificationEmission.test.ts
  - tests/v11/application/askHuman/askHumanFinalizationArtifacts.test.ts
  - tests/contracts/v11/askHuman.contract.runner.ts
  - tests/core/agent/pass.test.ts
  - tests/core/agent/askHuman.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Implementer Pilot Activation (Phase E3b)

## Current Tree Position (2026-04-16)

1. `E3a` utan ez activation closure, nem authority-foundation task.
2. Az `execution_id` canonical authority szerepe itt mar lezart adottsag.
3. Az egyetlen nyitott implementer-seam itt a fresh `pass` es fresh `human_question` activation explicit ownershipe.

## L0 - Policy

### Goal

1. Aktiválja az implementer pilot fresh-pathjat a lezart canonical execution authority modellen.
2. Bizonyitsa, hogy a fresh `pass` es fresh `human_question` activation csak explicit runtime outcome/provenance alapjan claimel success-t.
3. Hagyja kulon successor closureben a stale/duplicate/restart parity es fail-closed hardening munkat.

### Canonical Contract Anchors

1. `plans/actor-runtime-interface-execution-authority-contract-note-v1.md`
2. `docs/pairflow-initial-design.md`
3. `src/types/protocol.ts`
4. `src/v11/shared/actorProtocol/actorEmitContext.ts`
5. `src/v11/shared/askHuman/askHumanFlowContract.ts`
6. `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`

### Closed Terms

1. Canonical execution identity: `handoff_id` + explicit `execution_id`.
2. Guard fields: `expected_role`, `expected_round`, `expected_state_fingerprint`.
3. Success-shaped projection csak explicit runtime outcome/provenance surface-bol johet.
4. Explicit negative delivery outcome az elsoleges no-success runtime signal.
5. Omitted `delivery` csak non-mainline compatibility/override/test edgekent maradhat.

### Domain / Control Model Summary

1. Activation truth = canonical execution identity + explicit runtime outcome.
2. Pane activity, transport visibility vagy implicit bool rovidites nem success-source.
3. `askHuman` eseten a public command entry -> orchestration -> `runAskHumanFlow` -> delivery outcome / normalization -> finalization -> public projection ugyanannak az activation seamnek a resze lehet.
4. Missing explicit success outcome mellett nincs success claim.
5. Stale/duplicate/restart parity nem hozhato ide activation proof cimen.

### In Scope

1. Implementer `pass` fresh activation proof.
2. Implementer `human_question` fresh activation proof.
3. `askHuman` command-to-flow mainline explicit activation ownershipa.
4. Runtime delivery outcome producer/normalization seam.
5. Flow-result -> finalization -> public-result projection chain.
6. Ack-hiany melletti no-success behavior vedelme.

### Out of Scope

1. Stale authority reject.
2. Duplicate delivery suppression.
3. Restart recovery parity.
4. `E3a` authority/wrapper/dispatcher decisions ujranyitasa.
5. Reviewer/meta-reviewer rollout.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Canonical identity inheritance | `handoff_id` + explicit `execution_id` lezart baseline. | E3b nem downgrade-olhatja `execution_id`-t guard vagy metadata szerepbe. | P1 | required-now |
| Activation success | Success-shaped result csak explicit runtime outcome-bol johet. | Pane activity es transport visibility nem eleg. | P1 | required-now |
| Negative path | Explicit negative delivery outcome az elsoleges no-success runtime signal. | Omitted `delivery` csak retained non-mainline edge lehet. | P1 | required-now |
| Phase boundary | Ez activation closure, nem parity closure. | Stale/duplicate/restart proof `E3c`-ben marad. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | implementer emit runtime path | fresh `pass` es `human_question` ugyanazon canonical execution identityvel aktivodik | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/pass/passResultDelivery.ts` | pass delivery/result seam | success projection explicit runtime outcome-hoz kotott marad | P1 | required-now | T1 |
| CS3 | `src/v11/application/askHuman/runAskHumanFlow.ts` | flow ownership seam | a flow canonical execution identityt visz tovabb es explicit delivery outcome-orientalt | P1 | required-now | T2, T3 |
| CS4 | `src/v11/application/askHuman/askHumanNotificationEmission.ts` | negative outcome normalization | thrown delivery emit vagy mapped reject explicit negative outcome-va normalizalodik | P1 | required-now | T3 |
| CS5 | finalization files + shared contracts | projection chain | final/public result csak explicit runtime outcome-ra vagy explicit retained non-mainline edge-re epul | P1 | required-now | T2, T4 |

### 2) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | implementer `pass` fresh activation | success projection explicit runtime outcome-ra epul ugyanazon canonical execution identityn | P1 | required-now | automated test |
| T2 | implementer `human_question` fresh activation | a mainline command-to-flow chain explicit delivery outcome/projection ownershipet ad | P1 | required-now | automated test |
| T3 | mapped vagy normalized negative delivery | explicit no-success surface keletkezik; nincs implicit success | P1 | required-now | automated test |
| T4 | omitted `delivery` retained edge | csak non-mainline compatibility/override/test edge marad; success claim nincs | P1 | required-now | automated test |

## L2 - Implementation Notes

1. Ha a `human_question` activation csak broad plumbing cleanupkent zarhato le, az scope-hiba, nem `E3b` ownership.
2. Ha activation bizonyitashoz uj authority-vocabulary kellene, az upstream docs drift jele, nem activation-level dontes.
