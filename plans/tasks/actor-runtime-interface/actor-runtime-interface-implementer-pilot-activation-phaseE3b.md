---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_activation_phaseE3b_v1
title: "Actor Runtime Interface Implementer Pilot Activation (Phase E3b)"
status: implementable
updated_at: 2026-04-16
phase: phaseE3b
target_files:
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

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/pass/passResultDelivery.ts`
   - `src/v11/application/askHuman/askHumanCommandApi.ts`
   - `src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts`
   - `src/v11/application/askHuman/askHumanCommandOrchestration.ts`
   - `src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts`
   - `src/v11/application/askHuman/runAskHumanFlow.ts`
   - `src/v11/application/askHuman/askHumanNotificationEmission.ts`
   - `src/v11/application/askHuman/askHumanFinalization.ts`
2. Actual touched scope: primary `activation_or_read_model`, adjacent `consumer_family_alignment` only az implementer mainline command-entry -> orchestration -> flow -> finalization activation seam menten.
3. Mutation entrypoints in scope:
   - implementer-origin actor emit -> `emitPassFromWorkspace` / `emitAskHumanFromWorkspace`
   - `askHuman` public command entry
   - `runAskHumanFlow` execution + finalization path
4. Hidden scope ruled out:
   - authority producer nincs scope-ban; a canonical `execution_id`/guard vocabulary mar `E3a`/predecessor baseline,
   - stale/duplicate/restart parity nincs scope-ban; ez successor `E3c`,
   - reviewer/meta-reviewer rollout nincs scope-ban; ez successor `E4`,
   - broad topology cleanup vagy retained adapter rewrite nincs scope-ban.
5. Branch inventory note:
   - fresh activation vs retained non-mainline edge,
   - explicit success outcome vs explicit negative delivery outcome,
   - omitted `delivery` compatibility edge vs mainline explicit outcome path.
6. Why the declared task shape matches reality:
   - a command-to-flow mainline entrypointok itt nem kulon producer vagy parity closuret nyitnak, hanem ugyanannak az activation seamnek az elejet owns-oljak, amely `runAskHumanFlow`/finalization/public projection pathban zarul le.

### Authority Boundary Map

1. Authority producer: predecessor closurek; a canonical authority source-of-truth tovabbra is top-level `execution_context`.
2. Stored authority: persisted bubble state / `execution_context` + fingerprint, task-level rewrite nelkul.
3. In-scope consumers:
   - implementer actor emit runtime path,
   - implementer `askHuman` command-entry/orchestration mainline,
   - activation-owned delivery outcome / finalization / public projection consume chain.
4. Explicit out-of-scope consumers:
   - stale/conflicting/restart parity consume family (`E3c`),
   - reviewer/meta-reviewer consume families (`E4`),
   - retained read-model/operator surfaces.
5. Export surfaces closed in this phase: no; csak az implementer fresh activation closure zarul, nem a multi-role export surface.

### Baseline Preservation

1. Must-preserve behaviors:
   - explicit canonical execution identity = `handoff_id` + explicit `execution_id`,
   - reviewer/non-implementer `human_question` baseline retained marad,
   - omitted `delivery` csak retained non-mainline compatibility/override/test edge maradhat.
2. Allowed resolution paths:
   - implementer actor emit -> `emitAskHumanFromWorkspace`,
   - public `askHuman` command entry -> orchestration -> `runAskHumanFlow`,
   - `runAskHumanFlow` -> finalization -> public projection ugyanazon canonical authority chain menten.
3. Forbidden regression interpretations:
   - `command-to-flow mainline` explicit ownership nem ertelmezheto broad plumbing cleanupkent,
   - explicit runtime outcome kovetelmeny nem szigoritheto pane activity / transport visibility truthra,
   - E3a wrapper/authority closure nem nyithato ujra activation proof cimen.
4. Replacement proof required if removed:
   - ha barmely current mainline activation/finalization/public projection path megszunik, explicit replacement path + equivalence vagy intentional-difference proof kell a validationben.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_or_read_model`
2. Secondary shape (if any): `consumer_family_alignment`; safe, mert ugyanaz az implementer activation seam ownershipe a command-entry/orchestration consume oldalon es a flow/finalization consume oldalon.
3. Preconditions that must pass before side effects:
   - canonical authority snapshot match (`handoff_id`, `execution_id`, optional guards),
   - routing/orchestration input valid,
   - explicit delivery/runtime outcome csak legitim activation pathrol johet.
4. Side effects forbidden before preconditions pass:
   - success-shaped public projection,
   - implicit acceptance/success claim pane visibility vagy transport activity alapjan.
5. Invalid/precondition-failure behavior: zero success side effects; fail-closed vagy explicit no-success/unavailable surface.
6. Coordination primitives in scope: N/A

### In Scope

1. Implementer `pass` fresh activation proof.
2. Implementer `human_question` fresh activation proof.
3. `askHuman` command-to-flow mainline explicit activation ownershipa a public command entry -> orchestration -> flow -> finalization -> public projection lanc menten.
4. Runtime delivery outcome producer/normalization seam.
5. Flow-result -> finalization -> public-result projection chain.
6. Ack-hiany melletti no-success behavior vedelme.

### Out of Scope

1. Stale authority reject.
2. Duplicate delivery suppression.
3. Restart recovery parity.
4. `E3a` authority/wrapper/dispatcher decisions ujranyitasa.
5. Reviewer/meta-reviewer rollout.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `8`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: top-level `execution_context` -> actor emit / askHuman command-entry -> `runAskHumanFlow` -> finalization/public projection
   - competing identifiers or fallback identities: pane activity, transport visibility, omitted `delivery`, stale/reused `execution_id`
10. Authority/source-of-truth note:
   - canonical source: top-level `execution_context` + explicit runtime outcome/provenance
   - forbidden secondary sources: pane activity, tmux visibility, implicit bool rovidites, `handoff_id`-only vagy guard-only authority
11. Closure-budget triage:
   - closure buckets touched: `internal_execution_consumers`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: activation mainline command-entry/orchestration consume + flow/finalization consume; safe, mert ugyanazon implementer activation seam ownershipehez tartoznak
   - explicitly deferred closures: `authority_producer`, `read_model_consumers`, `cleanup_recovery_consumers`, parity hardening, reviewer/meta-reviewer rollout
12. Bounded-task-shape decision:
   - primary shape: `activation_or_read_model`
   - secondary shape: `consumer_family_alignment`
   - why this bounded mix is safe: a task nem uj authorityt vagy parity policyt vezet be, hanem a lezart canonical authority foundationon ugyanannak az activation seamnek a consume-path ownershipet zarja le.

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
| CS2 | `src/v11/application/askHuman/askHumanCommandApi.ts` | public command entry | a public `askHuman` entry az activation-owned command-to-flow mainlineba lep, es nem bypassolja a flow/finalization/public projection lancot | P1 | required-now | T2 |
| CS3 | `src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts`, `src/v11/application/askHuman/askHumanCommandOrchestration.ts`, `src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts` | command-to-flow orchestration chain | a dispatch/orchestration chain ugyanazt a canonical execution identityt es activation ownershipet viszi tovabb `runAskHumanFlow` fele, broad plumbing cleanup vagy parity policy nelkul | P1 | required-now | T2, T3 |
| CS4 | `src/v11/application/pass/passResultDelivery.ts` | pass delivery/result seam | success projection explicit runtime outcome-hoz kotott marad | P1 | required-now | T1 |
| CS5 | `src/v11/application/askHuman/runAskHumanFlow.ts` | flow ownership seam | a flow canonical execution identityt visz tovabb es explicit delivery outcome-orientalt | P1 | required-now | T2, T3 |
| CS6 | `src/v11/application/askHuman/askHumanNotificationEmission.ts` | negative outcome normalization | thrown delivery emit vagy mapped reject explicit negative outcome-va normalizalodik | P1 | required-now | T3 |
| CS7 | finalization files + shared contracts | projection chain | final/public result csak explicit runtime outcome-ra vagy explicit retained non-mainline edge-re epul | P1 | required-now | T2, T4 |

### 2) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | implementer `pass` fresh activation | success projection explicit runtime outcome-ra epul ugyanazon canonical execution identityn | P1 | required-now | automated test |
| T2 | implementer `human_question` fresh activation | a public command entry -> orchestration -> flow -> finalization mainline explicit delivery outcome/projection ownershipet ad ugyanazon canonical execution identity menten | P1 | required-now | automated test |
| T3 | mapped vagy normalized negative delivery | explicit no-success surface keletkezik; nincs implicit success | P1 | required-now | automated test |
| T4 | omitted `delivery` retained edge | csak non-mainline compatibility/override/test edge marad; success claim nincs | P1 | required-now | automated test |

## L2 - Implementation Notes

1. Ha a `human_question` activation csak broad plumbing cleanupkent zarhato le, az scope-hiba, nem `E3b` ownership.
2. Ha activation bizonyitashoz uj authority-vocabulary kellene, az upstream docs drift jele, nem activation-level dontes.
3. A `target_files` kozul a source-of-truth anchorok a `Canonical Contract Anchors` blokkban maradnak; a mutable implementation scope itt csak az activation-owned command-entry/orchestration/flow/finalization consume lanc.
