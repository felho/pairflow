---
artifact_type: task
artifact_id: task_actor_runtime_interface_implementer_pilot_activation_phaseE3b_v1
title: "Actor Runtime Interface Implementer Pilot Activation (Phase E3b)"
status: implementable
updated_at: 2026-04-17
phase: phaseE3b
target_files:
  - src/v11/application/pass/emitPassV11.ts
  - src/v11/application/pass/passCommandOrchestration.ts
  - src/v11/application/pass/emitPassContextBuilder.ts
  - src/v11/application/pass/passRoutingInvocationBuilders.ts
  - src/v11/application/pass/passRoutingPreparation.ts
  - src/v11/application/pass/passFlowDispatch.ts
  - src/v11/application/pass/normalPassFlowInvocationBuilders.ts
  - src/v11/application/pass/runNormalPassFlow.ts
  - src/v11/application/pass/normalPassFinalization.ts
  - src/v11/application/pass/passResultBuilder.ts
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
  - tests/v11/application/pass/emitPassV11.test.ts
  - tests/v11/application/pass/normalPassFinalization.test.ts
  - tests/v11/application/pass/passResultDelivery.test.ts
  - tests/v11/application/pass/passResultBuilder.test.ts
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
plan_ref: plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Implementer Pilot Activation (Phase E3b)

## Current Tree Position (2026-04-17)

1. `E3a` utan ez activation closure, nem authority-foundation task.
2. Az `execution_id` canonical authority szerepe itt mar lezart adottsag.
3. Az egyetlen nyitott implementer-seam itt a fresh `pass` es fresh `human_question` activation explicit ownershipe ugyanazon current authoritative execution context menten, nem stale/parity ujranyitas.

## L0 - Policy

### Goal

1. Aktiválja az implementer pilot fresh-pathjat a lezart canonical execution authority modellen.
2. Bizonyitsa, hogy a fresh implementer `pass` es fresh implementer `human_question` activation csak explicit runtime outcome/provenance alapjan claimel success-t.
3. Hagyja kulon successor closureben a stale/duplicate/restart parity es fail-closed hardening munkat, es ne szukitse a reviewer/meta-reviewer successorok mozgasat.

### Canonical Contract Anchors

1. `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`
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
6. Fresh activation: a current authoritative execution contexthoz tartozo implementer mainline activation, nem stale/duplicate/restart parity edge.
7. Activation closure: a fresh implementer `pass` es fresh implementer `human_question` success-claim ownershipa ugyanazon canonical execution identity menten, az emit/command entryponttol a final/public projectionig.
8. Command-to-flow mainline: a fresh implementer `askHuman` public command entry -> orchestration -> `runAskHumanFlow` mainline.
9. Pass activation mainline: implementer actor emit -> `emitPassFromWorkspaceV11` -> `emitPassFromWorkspace` -> `buildEmitPassContext` -> pass routing/dispatch -> normal pass flow -> pass delivery/finalization/result -> public PASS projection ugyanazon canonical execution identity menten.

### Domain / Control Model Summary

1. Activation truth = canonical execution identity + explicit runtime outcome.
2. Pane activity, transport visibility vagy implicit bool rovidites nem success-source.
3. `pass` eseten az implementer actor emit -> `emitPassFromWorkspaceV11` -> `emitPassFromWorkspace` -> `buildEmitPassContext` -> pass routing/dispatch -> normal pass flow -> pass delivery/finalization/result -> public PASS projection ugyanannak a fresh implementer activation seamnek a resze, nem kulon authority-producer reopen.
4. `askHuman` eseten a public command entry -> orchestration -> `runAskHumanFlow` -> delivery outcome / normalization -> finalization -> public projection ugyanannak a fresh implementer activation seamnek a resze lehet, nem kulon authority-producer reopen.
5. Missing explicit success outcome mellett nincs success claim.
6. Stale/duplicate/restart parity nem hozhato ide activation proof cimen.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/pass/emitPassContextBuilder.ts`
   - `src/v11/application/pass/passRoutingInvocationBuilders.ts`
   - `src/v11/application/pass/passRoutingPreparation.ts`
   - `src/v11/application/pass/passFlowDispatch.ts`
   - `src/v11/application/pass/normalPassFlowInvocationBuilders.ts`
   - `src/v11/application/pass/runNormalPassFlow.ts`
   - `src/v11/application/pass/passResultDelivery.ts`
   - `src/v11/application/pass/normalPassFinalization.ts`
   - `src/v11/application/pass/passResultBuilder.ts`
   - `src/v11/application/askHuman/askHumanCommandApi.ts`
   - `src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts`
   - `src/v11/application/askHuman/askHumanCommandOrchestration.ts`
   - `src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts`
   - `src/v11/application/askHuman/runAskHumanFlow.ts`
   - `src/v11/application/askHuman/askHumanNotificationEmission.ts`
   - `src/v11/application/askHuman/askHumanFinalization.ts`
2. Actual touched scope: primary `activation_closure`; read-model widening nem nyilik. Adjacent `consumer_family_alignment` csak az implementer mainline command-entry -> orchestration -> flow -> finalization activation seam menten engedett.
3. Mutation entrypoints in scope:
   - implementer-origin actor emit -> `emitPassFromWorkspace` / `emitAskHumanFromWorkspace`
   - pass wrapper/context/routing mainline -> `emitPassFromWorkspaceV11` -> `emitPassFromWorkspace` -> `buildEmitPassContext` -> pass routing/dispatch
   - pass normal-flow execution -> `runNormalPassFlow`
   - fresh implementer `askHuman` public command entry
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
   - a command-to-flow mainline entrypointok itt nem kulon producer vagy parity closuret nyitnak, hanem az `E3a`-tol orokolt canonical authority foundation felett ugyanannak az activation seamnek az elejet owns-oljak, amely `runAskHumanFlow`/finalization/public projection pathban zarul le.

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
5. Export surfaces closed in this phase: no; csak az implementer fresh activation closure zarul, a multi-role export-surface harmonization es consume rollout successor munka marad.

### Baseline Preservation

1. Must-preserve behaviors:
   - explicit canonical execution identity = `handoff_id` + explicit `execution_id`,
   - reviewer/non-implementer `human_question` baseline retained marad,
   - omitted `delivery` csak retained non-mainline compatibility/override/test edge maradhat.
2. Allowed resolution paths:
   - implementer actor emit -> `emitPassFromWorkspaceV11` -> `emitPassFromWorkspace` -> `buildEmitPassContext` -> pass routing/dispatch -> `runNormalPassFlow` -> pass delivery/finalization/result -> public PASS projection,
   - implementer actor emit -> `emitAskHumanFromWorkspace`,
   - public `askHuman` command entry -> orchestration -> `runAskHumanFlow`,
   - `runAskHumanFlow` -> finalization -> public projection ugyanazon canonical authority chain menten.
3. Forbidden regression interpretations:
   - `command-to-flow mainline` explicit ownership nem ertelmezheto broad plumbing cleanupkent,
   - explicit runtime outcome kovetelmeny nem szigoritheto pane activity / transport visibility truthra,
   - E3a wrapper/authority closure nem nyithato ujra activation proof cimen,
   - E3b activation closure nem szukitheti be az `E3c` parity vagy az `E4` multi-role consume rollout successor-teret.
4. Replacement proof required if removed:
   - ha barmely current mainline activation/finalization/public projection path megszunik, explicit replacement path + equivalence vagy intentional-difference proof kell a validationben.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_closure`.
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
2. Implementer `pass` preserved activation mainline az actor emit -> `emitPassFromWorkspaceV11` -> `emitPassFromWorkspace` -> `buildEmitPassContext` -> pass routing/dispatch -> `runNormalPassFlow` -> pass delivery/finalization/result -> public PASS projection lanc menten.
3. Implementer `human_question` fresh activation proof a public command entrytol a final/public projectionig.
4. `askHuman` command-to-flow mainline explicit activation ownershipa a public command entry -> orchestration -> flow -> finalization -> public projection lanc menten.
5. Runtime delivery outcome producer/normalization seam.
6. Flow-result -> finalization -> public-result projection chain.
7. Ack-hiany melletti no-success behavior vedelme.

### Out of Scope

1. Stale authority reject.
2. Duplicate delivery suppression.
3. Restart recovery parity.
4. `E3a` authority/wrapper/dispatcher decisions ujranyitasa.
5. Reviewer/meta-reviewer consume rollout es multi-role export-surface harmonization.
6. Retained read-model/operator surface alignment.

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
   - canonical identity paths: top-level `execution_context` -> actor emit -> `emitPassFromWorkspaceV11` -> `emitPassFromWorkspace` -> `buildEmitPassContext` -> pass routing/dispatch -> `runNormalPassFlow` -> pass delivery/finalization/result/public PASS projection; valamint top-level `execution_context` -> actor emit / askHuman command-entry -> `runAskHumanFlow` -> finalization/public projection
   - competing identifiers or fallback identities: pane activity, transport visibility, omitted `delivery`, stale/reused `execution_id`
10. Authority/source-of-truth note:
   - canonical source: top-level `execution_context` + explicit runtime outcome/provenance
   - forbidden secondary sources: pane activity, tmux visibility, implicit bool rovidites, `handoff_id`-only vagy guard-only authority
11. Closure-budget triage:
   - closure buckets touched: `internal_execution_consumers`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: pass activation context/routing/dispatch consume + normal-pass flow/finalization/result consume + askHuman activation mainline command-entry/orchestration consume + flow/finalization consume; ez a Closed Terms 7-9 szerinti activation-closure + explicit mainline ownership, es safe, mert ugyanazon implementer activation seam ownershipehez tartoznak
   - explicitly deferred closures: `authority_producer`, `read_model_consumers`, `cleanup_recovery_consumers`, parity hardening, reviewer/meta-reviewer rollout
12. Bounded-task-shape decision:
   - primary shape: `activation_closure`
   - secondary shape: `consumer_family_alignment`
   - why this bounded mix is safe: a task nem uj authorityt vagy parity policyt vezet be, hanem a lezart canonical authority foundationon ugyanannak az activation closure-nek a consume-path ownershipet zarja le.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Canonical identity inheritance | `handoff_id` + explicit `execution_id` lezart baseline. | E3b nem downgrade-olhatja `execution_id`-t guard vagy metadata szerepbe. | P1 | required-now |
| Activation success | Success-shaped result csak explicit runtime outcome-bol johet. | Pane activity es transport visibility nem eleg. | P1 | required-now |
| Negative path | Explicit negative delivery outcome az elsoleges no-success runtime signal. | Omitted `delivery` csak retained non-mainline edge lehet. | P1 | required-now |
| Phase boundary | Ez implementer fresh activation closure, nem parity vagy multi-role consume rollout closure. | Stale/duplicate/restart proof `E3c`-ben, a reviewer/meta-reviewer consume rollout es export-surface harmonization `E4`-ben marad. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | implementer-origin emit runtime path | implementer-origin emit runtime pathon a fresh `pass` es a fresh `human_question` ugyanazon canonical execution identityvel aktivodik | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/pass/emitPassV11.ts`, `src/v11/application/pass/passCommandOrchestration.ts` | pass wrapper entry | a fresh implementer `pass` preserved activation mainline az actor emit utan a canonical wrapper/orchestration entryn marad | P1 | required-now | T1, T1a |
| CS3 | `src/v11/application/pass/emitPassContextBuilder.ts`, `src/v11/application/pass/passRoutingInvocationBuilders.ts`, `src/v11/application/pass/passRoutingPreparation.ts` | pass context and routing seam | a canonical execution identity es activation intent explicit context/routing surface-en megy tovabb, nem implicit workspace shortcuton vagy reviewer/E4 parity policy-n | P1 | required-now | T1, T1a |
| CS4 | `src/v11/application/pass/passFlowDispatch.ts`, `src/v11/application/pass/normalPassFlowInvocationBuilders.ts`, `src/v11/application/pass/runNormalPassFlow.ts` | pass dispatch and normal-flow seam | az implementer `pass` activation a normal-pass route-on zarodik, reviewer auto-converge/convergence policy nelkul | P1 | required-now | T1, T1a |
| CS5 | `src/v11/application/askHuman/askHumanCommandApi.ts` | public command entry | a fresh implementer `askHuman` entry az activation-owned command-to-flow mainlineba lep, es nem bypassolja a flow/finalization/public projection lancot | P1 | required-now | T2 |
| CS6 | `src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts`, `src/v11/application/askHuman/askHumanCommandOrchestration.ts`, `src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts` | command-to-flow orchestration chain | a dispatch/orchestration chain ugyanazt a canonical execution identityt es activation ownershipet viszi tovabb `runAskHumanFlow` fele, broad plumbing cleanup vagy parity policy nelkul | P1 | required-now | T2, T3 |
| CS7 | `src/v11/application/pass/passResultDelivery.ts`, `src/v11/application/pass/normalPassFinalization.ts`, `src/v11/application/pass/passResultBuilder.ts` | pass delivery/finalization/public result seam | success projection explicit runtime outcome-hoz kotott marad, es a `pass` preserved mainline replacement-proofja a delivery mappingtol a final/public PASS projectionig ezen a seam-en zarul | P1 | required-now | T1, T1a |
| CS8 | `src/v11/application/askHuman/runAskHumanFlow.ts` | flow ownership seam | a flow canonical execution identityt visz tovabb es explicit delivery outcome-orientalt | P1 | required-now | T2, T3 |
| CS9 | `src/v11/application/askHuman/askHumanNotificationEmission.ts` | negative outcome normalization | thrown delivery emit vagy mapped reject explicit negative outcome-va normalizalodik | P1 | required-now | T3 |
| CS10 | finalization files + shared contracts | projection chain | final/public result csak explicit runtime outcome-ra vagy explicit retained non-mainline edge-re epul | P1 | required-now | T2, T4 |

### 1a) Target File Anchoring

1. `CS1` ownershipa ala tartozik `src/v11/application/actorProtocol/actorProtocolEmitters.ts`, valamint a kapcsolodo `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/core/agent/pass.test.ts`, `tests/core/agent/askHuman.test.ts`.
2. `CS2-CS4` `pass` ownershipa ala tartozik `src/v11/application/pass/emitPassV11.ts`, `src/v11/application/pass/passCommandOrchestration.ts`, `src/v11/application/pass/emitPassContextBuilder.ts`, `src/v11/application/pass/passRoutingInvocationBuilders.ts`, `src/v11/application/pass/passRoutingPreparation.ts`, `src/v11/application/pass/passFlowDispatch.ts`, `src/v11/application/pass/normalPassFlowInvocationBuilders.ts`, `src/v11/application/pass/runNormalPassFlow.ts`, valamint a kapcsolodo `tests/v11/application/pass/emitPassV11.test.ts`.
3. `CS7` `pass` ownershipa ala tartozik `src/v11/application/pass/passResultDelivery.ts`, `src/v11/application/pass/normalPassFinalization.ts`, `src/v11/application/pass/passResultBuilder.ts`, valamint a kapcsolodo `tests/v11/application/pass/passResultDelivery.test.ts`, `tests/v11/application/pass/normalPassFinalization.test.ts`, `tests/v11/application/pass/passResultBuilder.test.ts`; a `tests/core/agent/pass.test.ts` intentional shared anchor `CS1`-gyel, mert az implementer-origin actor emit edge-et es a pass public-projection boundaryt ugyanazon canonical execution chainen koti ossze.
4. `CS5-CS6-CS8` ownershipa ala tartozik `src/v11/application/askHuman/askHumanCommandApi.ts`, `src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts`, `src/v11/application/askHuman/askHumanCommandOrchestration.ts`, `src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts`, `src/v11/application/askHuman/runAskHumanFlow.ts`, valamint a kapcsolodo `tests/v11/application/askHuman/emitAskHumanV11.test.ts`, `tests/v11/application/askHuman/askHumanCommandOrchestration.test.ts`, `tests/v11/application/askHuman/runAskHumanFlow.test.ts`, `tests/contracts/v11/askHuman.contract.runner.ts`.
5. `CS9` ownershipa ala tartozik `src/v11/application/askHuman/askHumanNotificationEmission.ts` es a kapcsolodo `tests/v11/application/askHuman/askHumanNotificationEmission.test.ts`.
6. `CS10` ownershipa ala tartozik `src/v11/application/askHuman/askHumanFinalizationDependencyBuilder.ts`, `src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts`, `src/v11/application/askHuman/askHumanFinalizationDependencyResolution.ts`, `src/v11/application/askHuman/askHumanFinalization.ts`, `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`, `src/v11/shared/askHuman/askHumanFlowContract.ts`, `src/v11/shared/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.ts`, `src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts`, `src/v11/shared/askHuman/askHumanCommandContract.ts`, valamint a kapcsolodo builder/resolution/finalization/artifact regression tesztek: `tests/v11/application/askHuman/askHumanFinalizationDependencyBuilder.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationDependencyResolution.test.ts`, `tests/v11/application/askHuman/askHumanFinalization.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationArtifacts.test.ts`, tovabba a shared-contract regression anchor `tests/contracts/v11/askHuman.contract.runner.ts`.

### 1b) Pass Evidence Anchoring

1. `tests/v11/application/pass/emitPassV11.test.ts` explicit proof-surface resze ennek a tasknak, mert wrapper-parity evidence-et ad arra, hogy a preserved `pass` activation mainline az `emitPassFromWorkspaceV11` -> `emitPassFromWorkspace` lancban marad.
2. `tests/contracts/v11/pass.contract.runner.ts` nem required E3b proof anchor, mert a jelenlegi runner reviewer auto-converge / convergence viselkedest is hordoz, ami successor `E4` scope.
3. E3b-ben a required `pass` proof surface implementer activation evidence-re szukul: `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` + `tests/v11/application/pass/emitPassV11.test.ts` + `tests/v11/application/pass/passResultDelivery.test.ts` + `tests/v11/application/pass/normalPassFinalization.test.ts` + `tests/v11/application/pass/passResultBuilder.test.ts` + `tests/core/agent/pass.test.ts`.
4. Ha a `tests/contracts/v11/pass.contract.runner.ts` kesobb implementer-only activation subsetre bonthato, az kulon successor-proof anchor lehet; a jelenlegi mixed reviewer auto-converge / convergence esetek azonban nem E3b required evidence.
5. A ket nev szerint kert anchor kozul `tests/v11/application/pass/emitPassV11.test.ts` igen, `tests/contracts/v11/pass.contract.runner.ts` pedig intentional deferred reference az E4-es mixed reviewer behavior miatt.

### 2) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | implementer `pass` fresh activation | success projection explicit runtime outcome-ra epul ugyanazon canonical execution identityn | P1 | required-now | automated test |
| T1a | implementer `pass` preserved mainline proof | az actor emit -> `emitPassFromWorkspaceV11` -> `emitPassFromWorkspace` -> `buildEmitPassContext` -> pass routing/dispatch -> `runNormalPassFlow` -> pass delivery/finalization/result/public PASS projection lanc replacement-safe preserved pathkent bizonyithato | P1 | required-now | automated test |
| T2 | implementer `human_question` fresh activation | a public command entry -> orchestration -> flow -> finalization mainline explicit delivery outcome/projection ownershipet ad ugyanazon canonical execution identity menten | P1 | required-now | automated test |
| T3 | mapped vagy normalized negative delivery | explicit no-success surface keletkezik; nincs implicit success | P1 | required-now | automated test |
| T4 | omitted `delivery` retained edge | csak non-mainline compatibility/override/test edge marad; success claim nincs | P1 | required-now | automated test |

## L2 - Implementation Notes

1. Ha a `human_question` activation csak broad plumbing cleanupkent zarhato le, az scope-hiba, nem `E3b` ownership.
2. Ha activation bizonyitashoz uj authority-vocabulary kellene, az upstream docs drift jele, nem activation-level dontes.
3. A `target_files` kozul a source-of-truth anchorok a `Canonical Contract Anchors` blokkban maradnak; a mutable implementation scope itt csak a `pass` activation mainline es az activation-owned command-entry/orchestration/flow/finalization consume lanc.
