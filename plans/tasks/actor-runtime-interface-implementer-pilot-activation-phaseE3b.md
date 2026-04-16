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

1. A current tree-ben az `E1`, `E2a`, `E2b`, `E2c` es `E3a` predecessor closurek mar lezart baseline-kent oroklodnek; ez a task mar nem owns-ol authority-, wrapper- vagy outer-dispatch dontest.
2. A kulon `E3b0` predecessor-vagas superseded: a current-tree code-read alapjan a public `askHuman` command-to-flow builder/plumbing retegek nem adnak stabil onallo closure-t, ezert az esetlegesen szukseges minimalis mainline explicitte tel ennek a tasknak a bounded ownershipjen belul marad.
3. Az `E3b` ownershipje szandekosan szuk: a fresh implementer `pass` es fresh implementer `human_question` activation proofja, valamint ezek explicit activation-result / delivery projection seam-jei, beleertve a `human_question` command-to-flow mainline legszuksegesebb explicitte tetelet ott, ahol ez nelkul az activation truth ownershipe tovabbra is implicit maradna.
4. A `human_question` bounded seam-set itt nem allhat meg a finalization/public projection retegnel: a belso `RunAskHumanFlowResult` contract (`src/v11/shared/askHuman/askHumanFlowContract.ts`) is ownership-hatar, mert a finalization es a publikus command result ezt projektalja tovabb.
5. A runtime mainline delivery producer seam explicit E3b ownership: a default tmux delivery boundary success vagy negative outcome-ja az `AskHumanEmitTmuxDeliveryNotificationResult` contract (`src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`) menten lep be a lancba a `src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts` mappingjan keresztul, es ha maga a delivery emit dob, a `src/v11/application/askHuman/askHumanNotificationEmission.ts` explicit `rejected` / `tmux_send_failed` sentinelre normalizal, mielott a finalization/public projection tovabbviszi.
6. Az E3b default runtime mainline ownership a public `askHuman` command entrytol a `runAskHumanFlow`-ig tarto bounded activation-seamet is magaba foglalhatja annyiban, amennyiben ez a fresh-path activation explicit ownershipehez szukseges: `emitAskHumanFromWorkspace` -> command/orchestration handoff -> `runAskHumanFlow` -> finalization dependency builder/defaults/resolution-input-builder/resolution lanc ugyanazt az explicit delivery-outcome-orientalt utat kenyszeriti ki, uj kotelezo sentinel shape bevezetese nelkul, majd a finalization/public projection ezt viszi tovabb.
7. A retained omitted-`delivery` compatibility/override/test edge itt mar nem command/orchestration ownership-claimkent, hanem a flow-result -> finalization -> public-result chain retained compatibility szabalyakent marad explicit: optional/omitted `delivery` nem valhat success-shaped projectionne, es nem irhatja felul a current-tree explicit negative delivery mainline-t.
8. Az `E3a` retained outer-dispatch baseline-je es a reviewer/non-implementer `human_question` preserved baseline-je ebben a taskban csak orokolt adottsag; itt nem szukitheto es nem nevezheto at.
9. Az `E3c` kizarolag successor closure marad: stale/duplicate/restart parity, conflicting-context fail-closed es restart recovery proof nem hozhato elo ide activation proof cimen.

## L0 - Policy

### Goal

1. Aktiválja az implementer pilot fresh-pathjat a lezart `E3a` same-authority foundation felett.
2. Bizonyitsa explicit activation evidence-szel az implementer-first minimum csomagot:
   - fresh `pass`,
   - fresh `human_question`,
   - ack-hiany melletti no-success inference.
3. Hagyja kulon successor closureben a stale/duplicate/restart parity es fail-closed hardening munkat (`E3c`).

### Domain / Control Model Summary

1. Business invariant: a pilot activation nem gyengitheti az `E3a` same-authority foundationt.
2. Control model: explicit authority + explicit runtime ack-source marad a truth; pane activity tovabbra sem acceptance/running forras.
3. Read-path rule: implementer pilot success csak explicit runtime ack/provenance boundaryrol vagy ennek same-authority projectionjabol olvashato.
4. Projection boundary: az activation-result surface csak explicit delivery/provenance outcome-bol epulhet. A current-tree default runtime mainline explicit delivery outcome-orientalt: a default tmux delivery boundary mapped success/reject outcome-ja ugyanugy ervenyes projection, mint a thrown delivery emitbol normalizalt explicit negative outcome. Omitted `delivery` csak nem-mainline kompatibilitasi/override/test edge-ben maradhat relevans, ha a delivery outcome lanc tenylegesen nem all elo. Pane activity, implicit bool rovidites vagy transport-lathatosag nem jelenhet meg success-shaped projectionkent.
5. Forbidden fallback:
   - nincs pane-visible activitybol szarmaztatott pilot success claim,
   - nincs role-local authority shortcut a fresh activation kedveert,
   - nincs stale/duplicate/restart parity closure ebben a taskban eldugva.
6. Allowed resolution path:
   - retained tmux adapter maradhat transport/provenance/debug surface,
   - a fresh implementer `pass` es `human_question` a lezart `E3a` wrapper/authority route-on aktivodhat,
   - same-authority compatibility projection megengedett, ha az explicit ack mar a decision source,
   - `askHuman` eseten a default runtime mainline a public command entrytol a `runAskHumanFlow` -> explicit delivery outcome producer -> wiring/defaults/resolution-input-builder/resolution -> finalization/projection lancig owned bounded seam lehet ott, ahol ez az activation truth explicitte tetelehez szukseges,
   - `askHuman` eseten az explicit negative delivery outcome a preferalt no-success runtime projection; ez normal mapped tmux rejectkent vagy thrown delivery emitre adott explicit `tmux_send_failed` normalizalaskent is megerkezhet,
   - az omitted `delivery` retained non-mainline kompatibilitasi/override/test edge maradhat a flow-result -> finalization -> public-result chainben,
   - omitted `delivery` csak addig megengedett, ameddig ez nem valik success-shaped projectionne.
7. Missing-data rule: explicit ack hianyaban nincs success inference; a pilot fresh-path nem claimelhet successful activationt. Ez `askHuman` esetben nem kenyszerit uj sentinel shape-et: a default runtime mainline-ben a mapped vagy normalizalt explicit negative delivery outcome mar eleg no-success evidence, es csak olyan non-mainline edge-ben maradhat ervenyben az omitted `delivery`, ahol a delivery outcome lanc tenylegesen nem all elo.
8. Phase boundary:
   - wrapper/authority foundation predecessor (`E3a`)
   - implementer fresh-path activation owned here
   - stale/duplicate/restart parity es fail-closed hardening successor (`E3c`)
   - reviewer/meta-reviewer rollout deferred `E4`

### Authority Boundary Map

1. Authority producer: inherited explicit `state.execution_context` + `ActorEmitContextSnapshot` chain from `E1`/`E3a`.
2. Stored authority: bubble state snapshot fingerprint + execution-context mezok; uj persisted authority nincs ebben a taskban.
3. In-scope consumers:
   - implementer `pass` fresh-path consume
   - implementer `human_question` fresh-path consume
   - `human_question` runtime delivery outcome producer seam
   - `human_question` default finalization dependency wiring/defaults/resolution-input-builder/resolution seam
   - `human_question` flow-result -> finalization -> public-result projection seam
   - a kapcsolodo direct flow result/projection seam-ek
4. Explicit out-of-scope consumers:
   - stale authority reject
   - duplicate delivery suppresszio
   - restart recovery parity
   - broad builder-only cleanup vagy a bounded activation mainlineon tuli command/orchestration refaktor
   - reviewer/meta-reviewer actor pathok
5. Export surfaces closed in this phase: `yes`, de csak az implementer fresh-path activation szintjen; broad parity vagy multi-role export closure nem.

### Baseline Preservation

1. Must-preserve behaviors:
   - az `E3a` same-authority wrapper route es fail-closed authority baseline valtozatlan marad;
   - a public `askHuman` command-to-flow bounded mainline csak annyiban szukulhet vagy explicitte teheto, amennyiben ez kozvetlenul az activation truth ownershipet zarja le;
   - a tmux/runtime retained surface observability-only adapter marad;
   - a `human_question` default runtime mainline explicit delivery outcome-orientalt marad a mapped/normalizalt producer seam + dependency wiring/defaults/resolution-input-builder/resolution + finalization lanc menten;
   - a `human_question` belso es publikus result contractban az omitted `delivery` csak retained non-mainline kompatibilitasi/override/test edgekent maradhat meg, ha explicit delivery outcome tenylegesen nem jon letre;
   - ack-hiany vagy failed launch/delivery nem valhat implicit success-sze.
2. Allowed resolution paths:
   - explicit implementer authority -> canonical actor emit -> runtime ack/projection -> fresh-path activation result
   - same-authority compatibility projection, ha az explicit ack mar a decision source
3. Forbidden regression interpretations:
   - a fresh-path activation nem ertelmezheto ugy, hogy stale/duplicate/restart parity is mar itt le van zarva;
   - a pane activity tovabbra sem valhat success proof-fava.
4. Replacement proof required if removed:
   - ha a retained runtime projection barmely activation resze lecserelodik, explicit evidence kell arra, hogy az uj path ugyanazt a same-authority activation truthot hordozza.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_or_read_model`
2. Secondary shape (if any): `consumer_family_alignment`
   Bounded proof: ugyanaz a szuk implementer fresh-path consume surface zarja le az activation es projection closuret, es a command/orchestration retegből is legfeljebb annyit owns-ol, amennyi a bounded activation mainline explicitte tetelezesehez kell, kulon restart/duplicate recovery nelkul.
3. Preconditions that must pass before side effects:
   - az `E3a` same-authority foundation ervenyes,
   - a public `askHuman` command-to-flow bounded mainline explicit ownershipe igazolhato,
   - az implementer authoritative context explicit es coherent,
   - az activation-result projection csak explicit delivery/provenance outcome-bol epulhet.
4. Side effects forbidden before preconditions pass:
   - nincs implementer pilot success claim,
   - nincs workflow advance pane-derived jelre,
   - nincs fresh activation fallback legacy shortcut authorityra.
5. Invalid/precondition-failure behavior: zero successful activation side effect; explicit failure vagy explicit negative delivery outcome az elsoleges no-success surface, es csak delivery-outcome hianyaban marad omitted `delivery` non-mainline compatibility edgekent, success claim nelkul.
6. Coordination primitives in scope: `N/A`

### In Scope

1. Implementer `pass` fresh-path activation proof.
2. Implementer `human_question` fresh-path activation proof.
3. A `pass` es `human_question` activation-result / delivery projection seam-jeinek explicit ack-driven proofja.
4. A `human_question` belso flow-result (`RunAskHumanFlowResult`) es a final/public projection contractok alignmentje ugyanazon bounded seam-seten belul.
5. Ack-hiany melletti no-success inference explicit vedese a fresh activation pathon ugy, hogy a mapped vagy normalizalt explicit negative delivery outcome az elsoleges runtime no-success surface, az omitted `delivery` pedig csak nem-mainline kompatibilitasi/override/test edge marad.
6. A public `askHuman` command entrytol a `runAskHumanFlow`-ig tarto mainline legszuksegesebb explicitte tetele ott, ahol ez nelkul az activation truth ownershipe tovabbra is indokolatlanul szetszorodna.

### Out of Scope

1. Stale authority reject.
2. Conflicting-context fail-closed parity.
3. Duplicate delivery suppresszio.
4. Restart recovery parity.
5. `E3a` inherited wrapper-, authority-, outer-dispatch- vagy reviewer/non-implementer baseline donteseinek ujranyitasa.
6. Broad builder-only cleanup vagy a bounded activation mainlineon tuli command/orchestration simplifikacio.
7. Reviewer/meta-reviewer rollout.
8. Full tmux cleanup vagy topology csere.

### Safety Defaults

1. Ha a fresh activation csak pane-derived success inferenciaval lenne zold, a task fail-closed.
2. Ha a command/orchestration retegek broad cleanupot igenyelnenek ahelyett, hogy a bounded activation mainline zarna oket, az mar nem ennek a tasknak a closure-ja.
3. Ha a parityhoz stale/duplicate/restart hardening kellene, azt az `E3c` successor owns-olja.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - implementer pilot activation contract
   - `askHuman` command-to-flow activation mainline ownership contract
   - runtime ack/provenance consume contract
   - `human_question` delivery outcome producer + normalization contract
   - `human_question` finalization dependency wiring/defaults/resolution-input-builder/resolution contract
   - `human_question` flow-result -> finalization -> command-result projection contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: `state.execution_context` -> `ActorEmitContextSnapshot` -> implementer actor emit -> explicit runtime ack/projection
   - competing identifiers or fallback identities: pane activity, legacy shortcut authority, prompt-visible runtime text
10. Authority/source-of-truth note:
   - canonical source: explicit implementer authority + explicit runtime ack/provenance
   - forbidden secondary sources: pane activity, transport-only tmux visibility
11. Closure-budget triage:
   - closure buckets touched: `internal_execution_consumers`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: implementer fresh-path activation + activation-result projection + a `human_question` command-to-flow mainline legszuksegesebb explicitte tetele, mert ugyanaz az explicit ack-driven bounded path zarja le oket kulon parity/recovery closure nelkul
   - explicitly deferred closures: `cleanup_recovery_consumers`, broad parity hardening, multi-role rollout
12. Bounded-task-shape decision:
   - primary shape: `activation_or_read_model`
   - secondary shape: `consumer_family_alignment`
   - why this bounded mix is safe: csak az implementer fresh-path aktivaciojara es ennek explicit delivery/result projectionjaira szukul, es a command/orchestration retegből is csak annyit owns-ol, amennyi a bounded activation mainline egyertelmu lezarasahoz kell; nem visz be kulon duplicate/restart/stale recovery closuret vagy broad builder-cleanup refaktort

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Control model | Explicit ack/provenance az egyetlen implementer pilot success source. | Tmux activity nem acceptance proof. | P1 | required-now |
| Fresh-path scope | Ez a task csak fresh `pass` es fresh `human_question` activationt owns-ol. | Stale/duplicate/restart parity nem huzhato ide. | P1 | required-now |
| Projection boundary | Az activation result csak explicit delivery/provenance outcome-bol jelenhet meg. | Nincs pane-derived, bool-shortcut vagy implicit success projection. | P1 | required-now |
| Missing-data rule | Ack hianyaban nincs success inference. | A pilot fresh-path explicit failuret vagy mapped/normalizalt explicit negative delivery outcome-ot tart meg; outcome hianyaban az omitted `delivery` csak retained non-mainline compatibility/override/test edgekent marad. Uj kotelezo sentinel nem jelenik meg. | P1 | required-now |
| Phase boundary | Foundation dontesek nem nyithatok ujra. | `E3a` baseline adottsag, `E3c` parity successor marad; a public `askHuman` mainlinebol csak a bounded activationhoz szukseges resz owned here. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Implementer runtime activation result/projection | implementer `pass`, implementer `human_question` | additive | explicit activation proof a lezart same-authority pathon | stale/duplicate/restart parity -> `E3c` |
| `AskHumanEmitTmuxDeliveryNotificationResult` producer seam | implementer `human_question` runtime delivery emission + finalization defaults/normalization | additive proof tightening | a mapped tmux reject es a thrown delivery emitre adott explicit negative normalizalas egyazon E3b mainline producer seamkent van nevesitve | producer redesign vagy broad adapter cleanup -> kulon successor |
| default finalization dependency wiring/defaults/resolution-input-builder/resolution seam | implementer `human_question` run/finalize mainline | additive proof tightening | a runtime mainline explicit delivery outcome-orientalt wiring/defaults/resolution-input-builder/resolution lanc nevesitese uj kotelezo sentinel shape bevezetese nelkul | wiring redesign vagy broad adapter cleanup -> kulon successor |
| `RunAskHumanFlowResult` -> `EmitAskHumanResult` projection chain | implementer `human_question` finalization/public result | additive proof tightening | a valos bounded seam-set explicit nevesitese ugy, hogy az explicit negative delivery runtime path marad az elsoleges no-success projection, az omitted `delivery` pedig csak non-mainline compatibility edge | uj sentinel/result redesign -> kulon successor vagy explicit contract-change task |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `E3a` same-authority wrapper/emit route | preserve | activation tests bizonyitjak, hogy ugyanazon path aktivodik | P1 | required-now |
| bounded `askHuman` command-to-flow activation mainline | preserve/tighten | public command integration ugyanarra a `runAskHumanFlow` handoffra mutat, es a seam explicitte tetele nem valik broad refaktorra | P1 | required-now |
| explicit activation-result projection | preserve/tighten | `pass` es `human_question` result surface explicit ack-driven marad | P1 | required-now |
| default finalization dependency wiring/defaults/resolution-input-builder/resolution mainline | preserve | explicit proof, hogy override hianyaban a runtime mapped vagy normalizalt explicit delivery outcome producerre huzza ra a finalizationt, beleertve az adapter-seamet is, uj kotelezo sentinel shape bevezetese nelkul | P1 | required-now |
| `human_question` omitted `delivery` compatibility edge | preserve csak retained edgekent | explicit traceability evidence, hogy ez nem default runtime mainline, hanem csak outcome-hianyos compatibility/override/test eset a flow-result/finalization/public-result chainben | P1 | required-now |
| ack hianya nem jelent success-t | preserve | explicit no-success evidence delayed/missing ack eseten | P1 | required-now |

Bridge rule:

1. Az ack-driven projection kovetelmeny nem azt jelenti, hogy minden missing-ack esethez uj explicit sentinel kell; azt jelenti, hogy success-shaped projection csak valos delivery/provenance outcome-bol johet. A default runtime mainline explicit delivery outcome-ot probal eloallitani a public command entry -> orchestration -> `runAskHumanFlow` -> wiring/defaults/resolution-input-builder/resolution lanc menten. Ha van mapped vagy normalizalt explicit negative delivery outcome, az az elsoleges no-success projection; outcome hianyaban pedig az omitted `delivery` csak retained non-mainline compatibility/override/test edgekent marad ervenyes a flow-result/finalization/public-result chainben.

### 0c) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| fresh activation precondition hiany | explicit implementer authority + canonical wrapper/emit route + explicit bounded command-to-flow mainline ownership | workflow advance, success claim, pane-derived activation | zero successful activation side effect | P1 | required-now |
| activation-result projection hianyzo ackkal | explicit delivery/provenance outcome jelenlete vagy hianya, valamint a default wiring/defaults/resolution-input-builder/resolution mainline ervenyesulese | success-shaped projection hianyzo ack mellett | ha a mainline producer seam mapped vagy normalizalt explicit negative delivery outcome-ot adott, azt kell tovabbvinni mint elsoleges no-success surface; kulonben az omitted `delivery` csak retained non-mainline compatibility/override/test edgekent maradhat, de nincs success claim | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | implementer actor emit runtime path | a fresh implementer output ugyanazon canonical route-on aktivodik, es a result surface nem kap kulon authority shortcutot | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/pass/passResultDelivery.ts` | implementer `pass` activation-result projection | fresh implementer `pass` explicit activation truthra epul, es hianyzo ackbol nem csinal success projectiont | P1 | required-now | T1, T3 |
| CS3 | `src/v11/application/askHuman/askHumanCommandApi.ts` + `src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts` + `src/v11/application/askHuman/askHumanCommandOrchestration.ts` + `src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts` | public command-to-flow activation mainline | a public `askHuman` entrytol a `runAskHumanFlow`-ig tarto bounded mainline explicit ownershipen marad, es csak a fresh activation closurehoz szukseges mertekben szukitheto | P1 | required-now | T2 |
| CS4 | `src/v11/application/askHuman/runAskHumanFlow.ts` | `runAskHumanFlow` | a default runtime mainline a finalization dependency wiring/defaults/resolution-input-builder/resolution lancot hasznalja, nem optional compatibility shortcutot | P1 | required-now | T2, T3 |
| CS5 | `src/v11/application/askHuman/askHumanFinalizationDependencyBuilder.ts` | `buildAskHumanFinalizationDependencies` | override hianyaban a default finalization dependencies explicit delivery outcome-orientalt mainline-t kotnek be | P1 | required-now | T2, T3 |
| CS6 | `src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts` | `askHumanFinalizationDependencyDefaults.emitTmuxDeliveryNotification` | a default runtime mainline a tmux delivery boundaryt explicit ask-human delivery outcome shape-re mapeli | P1 | required-now | T2, T3 |
| CS7 | `src/v11/shared/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.ts` | `buildAskHumanFinalizationDependencyResolutionInput` | a runtime mainline explicit adapter-seamen viszi at a finalization dependency overrides-t a resolver fele; ez a lepes nem maradhat implicit, ha a teljes default mainline bounded ownership | P1 | required-now | T2, T3 |
| CS8 | `src/v11/application/askHuman/askHumanFinalizationDependencyResolution.ts` | `resolveAskHumanFinalizationDependencies` | a runtime mainline explicit resolution source-on megy at, miutan az input-builder adapter mar lekepezte a dependency shape-et; ez a seam nem maradhat implicit | P1 | required-now | T2, T3 |
| CS9 | `src/v11/application/askHuman/askHumanNotificationEmission.ts` | `emitOptionalAskHumanNotifications` | a runtime mainline a delivery outcome-ot tovabbviszi, es tmux delivery hiba eseten explicit negative outcome-ra normalizal ahelyett, hogy eldobna a delivery infot | P1 | required-now | T2, T3 |
| CS10 | `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts` | `AskHumanEmitTmuxDeliveryNotificationResult` | a negative/success delivery outcome producer contract explicit shape-je a bounded seam-set resze marad | P1 | required-now | T2, T3 |
| CS11 | `src/v11/shared/askHuman/askHumanFlowContract.ts` | `RunAskHumanFlowResult.delivery?` | a belso ask-human flow-result contract a bounded seam-set resze marad; finalization/public projection nem irhatja felul hallgatolagosan mas shape-re | P1 | required-now | T2, T3 |
| CS12 | `src/v11/application/askHuman/askHumanFinalization.ts` | implementer `human_question` finalization flow | fresh implementer `human_question` explicit activation truthra epul, es a finalization a producer + wiring/defaults/resolution-input-builder/resolution + belso flow-result contracttal kompatibilis projectiont ad | P1 | required-now | T2, T3 |
| CS13 | `src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts` | `buildAskHumanFinalizationResult` | helper-level projection shape-et epit a publikus `human_question` resulthez; ez shape-level proof, nem onmagaban runtime mainline proof | P1 | required-now | T4 |
| CS14 | `src/v11/shared/askHuman/askHumanCommandContract.ts` | `EmitAskHumanResult.delivery?` | a publikus ask-human result contract ugyanazt az optional delivery boundaryt tukrozi, amit a producer+wiring+flow-result+finalization path hordoz, de a runtime elsolegesen explicit delivery outcome-okra tamaszkodik | P1 | required-now | T2, T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Implementer activation result | fresh-path implicit/parity-vegyes task scope | explicit fresh activation closure | preserved baseline + activation proof | P1 | required-now |
| `PassResultDelivery` projection | ack-derived mezok leteznek | success/reject csak explicit delivery truthbol kepezheto | preserved baseline + proof tightening | P1 | required-now |
| `AskHumanEmitTmuxDeliveryNotificationResult` producer contract | explicit delivery outcome producer shape letezik | explicit ownership-hatarkent nevesitett runtime mainline producer + normalization seam | preserved baseline + seam closure | P1 | required-now |
| finalization dependency wiring/defaults/resolution-input-builder/resolution contract | default dependency builder, defaults, resolution-input adapter es resolution source leteznek | explicit ownership-hatarkent nevesitett runtime mainline wiring seam | preserved baseline + seam closure | P1 | required-now |
| `RunAskHumanFlowResult.delivery?` | belso flow-resultben optional delivery letezik | explicit ownership-hatarkent nevesitett, preserved baseline | preserved baseline + seam closure | P1 | required-now |
| `EmitAskHumanResult.delivery?` projection | explicit delivery surface letezik, de optional | activation truth explicit delivery/provenance outcome-bol jelenhet meg; outcome hianyaban a `delivery` csak non-mainline compatibility/override/test edgekent hagyhato el | preserved baseline + proof tightening | P1 | required-now |
| Ack consume rule | explicit ack baseline mar van | activation explicitten erre epul | preserved baseline | P1 | required-now |

Normative rules:

1. A task nem nevezheti at a tmux adaptert canonical authority vagy ack-source komponensse.
2. A task nem claimelhet stale/duplicate/restart parity closure-t.
3. A task nem irhat elo uj kotelezo `missing-delivery`/`unavailable` sentinel shape-et ott, ahol a jelenlegi ask-human contract optional/elhagyott `delivery` baseline-t tart meg.

### 3) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
|---|---|---|---|---|
| ack hianyzik, de pane activity latszik | result | diagnostics lehet, success inference nem | P1 | required-now |
| implementer fresh activation authority nelkul vagy incoherent contexttel futna | throw/result | fail-closed, nincs activation claim | P1 | required-now |
| activation-result projection explicit ack nelkul lenne sikeresnek latszo | result | meglevo mapped vagy normalizalt explicit negative delivery outcome az elsoleges fallback, vagy outcome hianyaban omitted `delivery` mint non-mainline compatibility/override/test edge, de nincs success claim | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|
| T1 | fresh implementer `pass` activation | a pilot canonical route-on fut ugyanazon explicit authority + ack truth felett, es a `pass` result projection ezt explicit delivery-statuszal hordozza | P1 | required-now | targeted automated tests (`emitActorProtocolV11`, `passResultDelivery`, `core/agent/pass`) |
| T2 | fresh implementer `human_question` activation mainline | a `human_question` pilot szinten vedett es explicit activation truthra epul, es a public command entry -> orchestration -> `runAskHumanFlow` -> producer/defaults normalization -> wiring/defaults/resolution-input-builder/resolution -> belso flow-result -> finalization -> publikus command-result lanc explicit delivery outcome-orientalt default runtime mainline-kent viselkedik | P1 | required-now | targeted automated tests (`emitActorProtocolV11`, `emitAskHumanV11`, `askHumanCommandOrchestration`, `runAskHumanFlow`, `askHumanFinalizationDependencyBuilder`, `askHumanFinalizationDependencyResolutionInputBuilder`, `askHumanFinalizationDependencyResolution`, `askHumanNotificationEmission`, `askHumanFinalization`, `core/agent/askHuman`) |
| T3 | delayed/missing ack a fresh pathon | nincs pane-derived success truth vagy success-shaped projection; ha van mapped vagy normalizalt explicit negative delivery outcome, az marad az elsoleges no-success evidence a producer+wiring/resolution-input-builder/resolution mainline seamtol kezdve, egyebkent az omitted `delivery` csak non-mainline compatibility/override/test edgekent jelenhet meg, de nincs success claim | P1 | required-now | targeted automated tests (`passResultDelivery`, `emitAskHumanV11`, `runAskHumanFlow`, `askHumanFinalizationDependencyBuilder`, `askHumanFinalizationDependencyResolutionInputBuilder`, `askHumanFinalizationDependencyResolution`, `askHumanNotificationEmission`, `askHumanFinalization`, `core/agent/pass`, `core/agent/askHuman`) |
| T4 | helper-level projection es delivery side-effect coverage | a builder-shape es contract-runner coverage csak azt bizonyitja, amit tenylegesen fed: publikus result helper-shape, illetve delivery side-effect capture normalizalas; nem onmagaban teljes runtime mainline proof | P1 | required-now | targeted automated tests (`askHumanFinalizationArtifacts`, `askHuman.contract.runner`) |

### 5) Spec Lock

Task allapot tovabbra is `implementable`, ha a dokumentum ugyanarra a szuk activation/projection slice-ra zarodik:

1. a `Current Tree Position` blokk explicitten kimondja, hogy az `E1`-`E3a` predecessor closurek lezart baseline-kent oroklodnek, a kulon `E3b0` predecessor-vagas superseded, es `E3b` csak a bounded activation mainlinehoz szukseges command-to-flow explicitte tetelt owns-olja authority-, wrapper- vagy broad builder-cleanup dontes nelkul;
2. az `In Scope` blokk pontosan a fresh implementer `pass` es `human_question` activation proofra, ezek explicit activation-result / delivery projection seam-jeire, a `human_question` runtime delivery outcome producer seamjere, a belso `RunAskHumanFlowResult` -> final/public projection chainre, valamint az ack-hiany melletti no-success inference vedelmere szukul;
3. az `Out of Scope` explicitten tiltja az `E3a` inherited wrapper/fallback/reviewer-baseline ujranyitasat, a broad builder-only cleanupot vagy a bounded activation mainlineon tuli command/orchestration simplifikaciot, valamint az `E3c` stale/duplicate/restart parity closure idehuzasat;
4. a `target_files` es a `Call-site Matrix` ugyanazt a bounded seam-setet tukrozi: `src/v11/application/askHuman/askHumanCommandApi.ts`, `src/v11/application/askHuman/askHumanCommandOrchestrationDispatch.ts`, `src/v11/application/askHuman/askHumanCommandOrchestration.ts`, `src/v11/shared/askHuman/askHumanCommandFlowOrchestration.ts`, `src/v11/application/actorProtocol/actorProtocolEmitters.ts`, `src/v11/application/pass/passResultDelivery.ts`, `src/v11/application/askHuman/runAskHumanFlow.ts`, `src/v11/application/askHuman/askHumanFinalizationDependencyBuilder.ts`, `src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts`, `src/v11/shared/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.ts`, `src/v11/application/askHuman/askHumanFinalizationDependencyResolution.ts`, `src/v11/application/askHuman/askHumanNotificationEmission.ts`, `src/v11/application/askHuman/askHumanFinalization.ts`, `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`, `src/v11/shared/askHuman/askHumanFlowContract.ts`, `src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts`, `src/v11/shared/askHuman/askHumanCommandContract.ts`, `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/v11/application/pass/passResultDelivery.test.ts`, `tests/v11/application/askHuman/emitAskHumanV11.test.ts`, `tests/v11/application/askHuman/askHumanCommandOrchestration.test.ts`, `tests/v11/application/askHuman/runAskHumanFlow.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationDependencyBuilder.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationDependencyResolution.test.ts`, `tests/v11/application/askHuman/askHumanNotificationEmission.test.ts`, `tests/v11/application/askHuman/askHumanFinalization.test.ts`, `tests/v11/application/askHuman/askHumanFinalizationArtifacts.test.ts`, `tests/contracts/v11/askHuman.contract.runner.ts`, `tests/core/agent/pass.test.ts`, `tests/core/agent/askHuman.test.ts`;
5. a `Test Matrix` explicitten szetvalasztja a mainline runtime proofot a helper-level coverage-tol: a `runAskHumanFlow` utan induló default runtime mainline proof T2-T3 alatt marad; ehhez az `emitAskHumanV11`, `runAskHumanFlow` es a kapcsolodo finalization/dependency tesztek nev szerint hozzarendeltek; az `askHumanFinalizationArtifacts` es az `askHuman.contract.runner` tovabbra is csak T4 helper-level/side-effect coverage, nem parity/restart hardening.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a fresh activation proof utan a result shape egyszerusitheto, azt csak az `E3c` es `E4` utani cleanupban szabad tenni.
