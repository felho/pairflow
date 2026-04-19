---
artifact_type: plan
artifact_id: plan_actor_runtime_interface_post_phaseE_successor_v1
title: "Actor Runtime Interface Post-Phase-E Successor Plan"
status: proposed
prd_ref: null
owners:
  - "felho"
---

# Plan: Actor Runtime Interface Post-Phase-E Successor

## Why This Plan Exists

1. A `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` ala tartozó Phase E closure-lanc current-tree szinten lezarult.
2. Ettol fuggetlenul az eredeti north star csak reszben teljesult:
   - a canonical authority es multi-role consume parity megvan,
   - de a runtime boundary tovabbra is erosen role- es tmux-formaju,
   - es uj actor/role onboarding ma is kodszintu enum- es wrapper-bovitest ker.
3. Ez a plan nem a lezart Phase E ujranyitasa. Kulon successor ownershipot ad azoknak az opcionális, de technikailag legitim follow-upoknak, amelyek az eredeti actor-runtime viziohoz tartoznak.

## Current Codebase Check (2026-04-17)

1. A canonical actor emit authority baseline mar letezik:
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - explicit `execution_context` + `execution_id` + expected role/round/fingerprint authorityval.
2. A runtime surface azonban meg mindig role-specifikus wrapperekben el:
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - kulon `implementer`, `reviewer`, `meta_reviewer` wrapperrel es kulon authority guardokkal.
3. Az actor output contract fixalt workflow-kindokra epul:
   - `src/types/protocol.ts`
   - `actorOutputKinds = pass | human_question | convergence | meta_review_result`.
4. A CLI onboarding szinten is fixalt role vocabulary van:
   - `src/cli/commands/agent/emit.ts`
   - az `--expected-role` parser csak `implementer | reviewer | meta_reviewer` ertekeket fogad el.
5. A delivery/runtime control tovabbra is erosen tmux-kotott:
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - pane target resolution, capture-pane alapú stuck-input recovery, `send-keys` / submit semantics.
6. A meta-review gate default dependency graph szinten is kozvetlen tmux primitivekre ul:
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`.
7. Emiatt a current tree stabil es mukodo, de meg nem topology-neutral, nem role-neutral, es nem uj-actor-friendly actor runtime kernel.

## Objective

1. Kulon ownership ala rendezni azokat a post-Phase-E valtoztatasi iranyokat, amelyek az eredeti actor-runtime terv architekturális celjat tovabb viszik.
2. Meghatarozni, hogy ezek kozul melyik:
   - csak opcionális strategiai fejlesztes,
   - melyik ad tiszta uj actor onboarding utat,
   - es melyik igenyel mar Plan -> Task implementacios lancot.

## Business Invariant

1. Az actor runtime boundary tovabbra sem birtokolhat workflow state transitiont, bubble authority resolutiont vagy lifecycle ownershipot.
2. A canonical execution authority maradjon explicit, durable es same-authority alapon ellenorizheto.
3. A jovobeli runtime boundary nem regresszalhat vissza tmux/pane/input-buffer observability jelekre mint canonical success truthra.

## Control Model

1. Az orchestrator/domain retegek ownershipja valtozatlan:
   - authority resolution,
   - routing,
   - lifecycle/state progression,
   - acceptance validation.
2. Az actor runtime boundary ownershipja legfeljebb:
   - explicit execution context fogadasa,
   - durable handoff olvasasa,
   - canonical actor output kibocsatasa,
   - opcionálisan typed delivery/ack relayhez valo csatlakozas.
3. Az executor/delivery topology nem valtoztathatja meg a canonical actor input/output contractot.

## Read Path Rule

1. A current-tree baseline megitelesehez a source-of-truth a kod:
   - `actorEmitContext` adja a canonical authority baseline-t,
   - `emitActorProtocolV11` mutatja a mai role-specifikus wrappingot,
   - `protocol.ts` mutatja a fixalt output es role vocabularyt,
   - `tmuxDelivery.ts` es `metaReviewGateCommandDefaults.ts` mutatja a retained delivery topology kotodest.

## Forbidden Fallback

1. Nem szabad a lezart Phase E closure-t ugy ujranyitni, mintha current-tree bugfix vagy parity-hiany maradt volna.
2. Nem szabad a jovo runtime simplificationt puszta naming-polishkent kezelni, ha valojaban uj contract boundaryrol van szo.
3. Nem szabad azt allitani, hogy az uj actor onboarding mar megoldott, amig a role/output vocabulary tovabbra is fix enum- es wrapper-boviteshez kotott.

## Allowed Resolution Path

1. Post-Phase-E follow-up csak kulon successor planbol indulhat.
2. Implementacios task csak akkor nyithato, ha az adott workstream pontosan kijeloli:
   - mely contract valtozik,
   - mi marad zart baseline,
   - es mi a bounded elso implementacios szelet.

## Missing Data Rule

1. Ha nincs explicit termek- vagy architekturális igeny uj actorokra, remote runtime topologyra vagy plugin-szeru onboardingra, ez a plan maradhat pusztan strategiai parkoloban.
2. Ilyenkor nem kotelezo implementacios taskot nyitni.

## Non-Goals

1. Nem cel a lezart Phase E E1-E4 taskok ujranyitasa.
2. Nem cel egyszeri nagy actor framework rewrite.
3. Nem cel a tmux operatori felulet teljes eltavolitasa.
4. Nem cel uj workflow role bevezetese ebben a planban.

## Opportunity Areas

### Opportunity 1: Generic Actor Runtime Kernel

1. A jelenlegi runtime surface kulon role-wrapperkent el.
2. A follow-up celja egy kisebb, role-neutral core boundary:
   - kozos emit/runtime kernel,
   - szerepspecifikus policy mint konfiguracio vagy bounded guard,
   - nem kulon actor API per role.
3. Ez akkor erdekes, ha:
   - uj actorokat akartok hozzaadni,
   - uj role projection johet,
   - vagy a mostani wrapper-sprawl mar lassitja a kodmozgatast.
4. A jelenlegi legjobb decomposition-becslés szerint ez most mar `3` explicit bounded szelet, konzervativ felso becslessel `3-4`:
   - `O1-T1`: docs-only kernel boundary clarification a task artifact in-place refinementjevel es source-anchored kernel contract note-tal
   - `O1-T2`: belso typed authority / route / policy matrix bevezetese public vocabulary rewrite nelkul
   - `O1-T3`: a jelenlegi wrapper-sprawl raulitese a belso matrixra explicit kernel + policy + workflow-adapter szetvalasztassal
   - opcionális `O1-T4`: retained fallback / parity / cleanup hardening, ha ez nem zarhato biztonsagosan `O1-T3`-ban
5. Ez tovabbra is decomposition-becsles, nem befagyasztott vegso phase-count:
   - a current tree-ben az `O1-T2` mar kulon lezart szelet, ezert a lane minimuma mar `O1-T1 -> O1-T2 -> O1-T3`,
   - a current-tree closure szerint kulon `O1-T4` nem nyilt meg; a lane az `O1-T3` implementacioval es a szuk follow-up cleanupokkal zarhato lett.

### Opportunity 2: Topology-Neutral Delivery and Executor Split

1. A jelenlegi current tree retained tmux control mechanikara tamaszkodik.
2. A follow-up celja, hogy a `tmux` retained operatori/observability adapter maradjon, mikozben a canonical delivery trigger es ack boundary topology-semleges lesz.
3. Ez akkor erdekes, ha:
   - remote runner,
   - API/IPC delivery,
   - vagy non-tmux actor launch irany felmerul.
4. Az `O2-T1` docs-only boundary note-ja:
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
5. Az `Opportunity 2` current-tree reality check alapjan nem egyetlen implementacios task:
   - a shared delivery/launch contract retained `tmux` naminggel ma is tobb consume familyre sugarzik szet,
   - kulon producer/adapter foundation, workflow-orchestration consume es read-model/public compat closure latszik,
   - emiatt az `O2` lane minimuma az `O2-T1` docs-only clarification utan tovabbi tobb bounded task.
6. A legkisebb safe decomposition jelen allapot szerint:
   - `O2-T1`: docs-only topology/delivery/executor boundary clarification es sequencing lock
   - `O2-T2`: topology-neutral delivery contract + retained adapter foundation
   - `O2-T3`: topology-neutral delivery consume-family alignment
   - `O2-T4`: topology-neutral launch/executor contract foundation
   - `O2-T5`: topology-neutral launch/executor consume-family alignment + repo-root/public export cleanup

### Opportunity 3: New Actor Onboarding Contract

1. Ma uj role vagy output-shape bevezetese explicit enum, parser es wrapper valtoztatast ker.
2. A follow-up celja, hogy uj actor/role onboardinghoz kevesebb kodhelyen kelljen beavatkozni.
3. Ez nem jelent teljesen dinamkus, schema nelkuli rendszert; a cel egy kisebb, jobban lokalizalt extension surface.

### Opportunity 4: Core vs Extension Surface Rationalization

1. A discovery plan mar felvetette, hogy a runtime core maradjon kicsi.
2. A current tree-ben meg mindig sok workflow-shape kozvetlenul a core protocol vocabularybe van egetve.
3. A follow-up celja eldonteni:
   - mi a kotelezo core,
   - mi lehet bounded extension,
   - es mi marad adapter/compat retegben.

## Recommended Sequencing

1. Elso dontes: van-e valos igeny uj actor/topology/onboarding flexibilitasra.
2. Ha nincs, a plan maradhat `proposed` allapotban, implementacios task nelkul.
3. Ha van, az ajanlott sorrend:
   - `O1-T1` generic runtime kernel boundary clarification,
   - `O2-T1` delivery/executor topology-neutral contract clarification,
   - `O3-T1` onboarding es extension-surface simplification.
4. Azert ez a sorrend, mert:
   - onboardingot nem erdemes stabil generic core nelkul nyitni,
   - topology-neutral deliveryt nem erdemes full rewritekent kezelni, amig a boundary nevei es ownershipja nem tiszta.
5. Az `Opportunity 1` elso bounded taskja:
   - historical task artifact: `plans/archive/tasks/actor-runtime-interface-opportunity1-task1-generic-runtime-kernel-boundary-clarification.md`
6. Az `O1-T1` docs-only outputja source-anchored boundary note-ot kotelez:
   - `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md`
7. `O1-T2` es `O1-T3` csak az `O1-T1` altal lezart exact route/policy matrixon es preserved baseline-okon ulhet:
   - nem nyithatjak ujra az execution authority note closed jelenteset,
   - nem lazithatjak a reviewer fallback vagy meta-reviewer guard preserved baseline-jat implicit cleanup cimszo alatt.
8. `O2-T1` csak preserved-baseline clarification lane lehet:
   - a lezart delivery ack baseline-t (`accepted | rejected`) nem nyithatja ujra,
   - a lezart launch ack baseline-t (`running | failed_to_start`) nem nyithatja ujra,
   - csak a topology/executor-boundary es retained adapter ownership pontositasat ownershipolja.
   - normativ note path: `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
9. `O2-T2`-`O2-T5` producer-first sorrendben kell nyiljanak:
   - elobb a topology-neutral delivery es launch/executor foundation szeletek,
   - utana a workflow-orchestration consume-family alignment,
   - es csak a consume-family cutover utan a retained public/read-model compat cleanup.
10. `O3-T1` csak az `Opportunity 1 / O1-T1` altal lezart boundary- es vocabulary-matrix utan nyithato:
   - onboarding simplification csak az `O1-T1` kernel boundary note-ra es az `O2-T1` delivery/executor boundary note-ra epulhet,
   - es csak az `O2` implementation lane enough-closureja utan nyithato biztonsagosan, amikor a retained `tmux` delivery/executor coupling mar nem keveredik a canonical boundaryval,
   - a zart baseline vocabulary explicit mappingjara es a topology/executor boundary explicit szetszalazasara kell tamaszkodnia,
   - az `Opportunity 4` alapertelmezetten ebbe a lane-be van beolvasztva mint core-vs-extension rationalization,
   - kulon `O4-T1` csak akkor nyithato, ha az `Opportunity 1 / O1-T1` outputja bizonyitja, hogy ez onallo bounded closure.
11. A current tree-ben az `Opportunity 1` mar lezart successor lane:
   - emiatt az `Opportunity 2` current next implementation slice-a mar nem az `O2` lane definialasa, hanem a launch/executor lane consume-family + public export closure kovetkezo bounded szelete, az `O2-T5`

## Opportunity 2 Decomposition

1. `O2-T1`
   - status: completed docs-only boundary clarification
   - artifact path: `plans/tasks/actor-runtime-interface-opportunity2-task1-topology-neutral-delivery-executor-clarification.md`
   - output: `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
2. `O2-T2`
   - status: completed foundation slice
   - shape: `shared_contract` + `authority_producer` foundation
   - artifact path: `plans/tasks/actor-runtime-interface-opportunity2-task2-topology-neutral-delivery-contract-and-retained-adapter-foundation.md`
   - goal: topology-neutral delivery ack/port naming bevezetese retained `tmux` adapter parityvel, workflow consume-atallitas nelkul
   - expected target family:
     - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
     - `src/v11/shared/ports/tmuxDelivery.ts`
     - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
     - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - why separate: a delivery contract es producer seam mar most tobb workflow/read-model consumerre sugarzik ki
3. `O2-T3`
   - status: completed consume-family alignment slice
   - shape: `internal_execution_consumers` + `workflow_orchestration_consumers`
   - artifact path: `plans/archive/tasks/actor-runtime-interface-opportunity2-task3-topology-neutral-delivery-consume-family-alignment.md`
   - goal: a delivery consume-family atallitasa a topology-neutral delivery contractra ugy, hogy a retained compat projection mar csak same-authority bridge legyen, ne canonical consume source
   - expected target family:
     - `src/v11/shared/kickoff/**`
     - `src/v11/shared/askHuman/**`
     - `src/v11/application/approval/**`
     - `src/v11/application/converged/**`
     - `src/v11/application/pass/**`
     - `src/v11/application/reply/**`
     - `src/v11/application/askHuman/**`
     - `src/v11/application/watchdog/**`
     - `src/v11/shared/delivery/implementerHandoffDelivery.ts`
     - `src/v11/shared/metaReview/metaReviewDeliveryCapabilities.ts`
   - explicit out-of-scope family:
     - `src/v11/shared/ports/uiRouter.ts`
     - `src/index.ts`
   - why separate: ez mar consume-family alignment, nem producer rename vagy public/read-model cleanup
4. `O2-T4`
   - status: completed foundation slice
   - shape: `shared_contract` + `authority_producer` foundation
   - task artifact: `plans/archive/tasks/actor-runtime-interface-opportunity2-task4-topology-neutral-launch-executor-contract-foundation.md`
   - goal: topology-neutral launch/executor ack/port naming bevezetese retained `tmux` launch producer parityvel
   - expected target family:
     - `src/v11/shared/ports/tmuxSessions.ts`
     - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
     - `src/v11/defaults/start/startBubbleDefaults.ts`
   - why separate: a launch/executor seam kulon contract es kulon producer closure a message-delivery oldaltol
5. `O2-T5`
   - status: current next consume-family slice
   - shape: `workflow_orchestration_consumers` + `read_model_consumers`
   - task artifact: `plans/tasks/actor-runtime-interface-opportunity2-task5-topology-neutral-launch-executor-consume-family-alignment.md`
   - goal: a launch/executor consume-family es a retained repo-root/public export coupling topology-neutral contractra allitasa
   - expected target family:
     - `src/v11/application/start/**`
     - `src/index.ts`
     - kapcsolodo start contract runner es core bubble coverage
   - explicit out-of-scope family:
     - `src/v11/application/restart/**` direct launch contract rewrite
     - `src/v11/defaults/metaReviewGate/**`
     - `src/v11/shared/ports/uiRouter.ts`
     - terminate/delete/merge session cleanup surfaces
   - why separate: itt mar a retained start consume csalad es a repo-root/public export fallout zarasa tortenik, nem producer closure; a restart lane current-tree szinten a `startBubble(...)` inherited parityn keresztul koveti ezt a closure-t
6. `O2` lane done csak akkor claimelheto, ha:
   - `O2-T1` lezart baseline,
   - a delivery es launch/executor producer foundation kulon source-of-truth-kent megvan,
   - a consume familyk atalltak a topology-neutral contractra vagy explicit retained compat statuszt kaptak,
   - es a retained `tmux` vocabulary mar nem keveredik a canonical delivery/executor boundary jelentesevel.

## Historical First Implementation Slice (`Opportunity 1`)

1. Ez a blokk mar nem a current next slice-ot jeloli, hanem az `Opportunity 1` lane historical elso bounded szeletet rogziti.
2. Az `O1` legkisebb ertelmes elso szelete az volt, hogy:
   - a role-neutral actor runtime kernel dokumentalt, typed belso contractot kapjon,
   - a wrapper logic explicit inventory keszuljon,
   - es megszulessen egy pontos mapping arrol, mi marad policy-level kulonbseg.
3. Ez docs+typed-boundary taskkent indult, mielott barmilyen delivery topology vagy CLI surface mozdult volna.
4. Ennek a historical docs-only first slice-nak a task anchorja:
   - `plans/archive/tasks/actor-runtime-interface-opportunity1-task1-generic-runtime-kernel-boundary-clarification.md`
5. Ennek a historical first slice-nak a normativ boundary note-ja:
   - `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md`
6. A current tree-ben ez a slice mar lezart baseline; a current next successor slice-t az alatti progress update es disposition szekcio `O2-T1`-kent nevezi meg.

## Current Tree Progress Update (2026-04-19)

1. Az `O1-T1` docs-only boundary clarification mar lezart baseline:
   - archived task artifact: `plans/archive/tasks/actor-runtime-interface-opportunity1-task1-generic-runtime-kernel-boundary-clarification.md`
   - normative note: `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md`
2. Az `O1-T2` code-level matrix slice 2026-04-17-en merge-olve lett a `main` branchre:
   - merge commit: `afa6558d622540e842986e44cab68ad6af91c2d8`
   - bounded closure: a typed internal authority / route / policy matrix explicit current-tree source-of-truth-ja mar kulon file-ban el:
     - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
3. Az `O1-T3` kernel + policy + workflow-adapter separation mar lezart current-tree implementacios szelet:
   - archived task artifact: `plans/archive/tasks/actor-runtime-interface-opportunity1-task3-kernel-policy-workflow-adapter-separation.md`
   - explicit shared execute seam: `src/v11/application/actorProtocol/actorRuntimeKernel.ts`
   - route/policy source-of-truth: `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
   - workflow adapter surface: `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - thin outer entrypoint: `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
4. Az `O1-T3` utani szuk cleanup current-tree szinten szinten lezart:
   - a retained wrapper-compat surface el lett tavolitva,
   - a belso route naming role-neutralabb lett,
   - a matrix inspection export surface szukult.
5. Az optionalis `O1-T4` kulon successor taskkent nem nyilt meg:
   - retained fallback / parity / cleanup hardening nem maradt nyitva kulon bounded consumer fallouttal.
6. Emiatt az `Opportunity 1` current-tree successor lane lezarhato.
7. Az `Opportunity 2` docs-only first slice-a mar lezart baseline:
   - completed task artifact: `plans/tasks/actor-runtime-interface-opportunity2-task1-topology-neutral-delivery-executor-clarification.md`
   - normative note: `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - closure: topology-neutral delivery/executor contract boundary clarification retained `tmux` adapter ownership explicit source-anchor inventoryval
   - preserved baseline: a `Phase E2a`-ban lezart typed delivery/launch ack semantics tovabbra sem reopenolhato
8. Az `O2-T2` code-level delivery foundation 2026-04-18-an merge-olve lett a `main` branchre:
   - completed task artifact: `plans/tasks/actor-runtime-interface-opportunity2-task2-topology-neutral-delivery-contract-and-retained-adapter-foundation.md`
   - merge commit: `6d1a80b6c53b051cbf5da7f9614b3449b2f8c202`
   - bounded closure:
     - additive topology-neutral delivery contract/port naming explicit a retained shared surface-en
     - canonical producer seam explicit: `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts::emitDeliveryNotificationAck(...)`
     - retained `emitTmuxDeliveryNotification(...)` wrapper es legacy result projection preserved maradt
9. Az `O2-T3` delivery consume-family alignment 2026-04-18-an merge-olve lett a `main` branchre:
   - archived task artifact: `plans/archive/tasks/actor-runtime-interface-opportunity2-task3-topology-neutral-delivery-consume-family-alignment.md`
   - merge commit: `f4b9e24179b4777db562cd74963a8d6a5d6136c7`
   - bounded closure:
     - a delivery consume-family direct decision pathjai mar a topology-neutral `DeliveryAck` truthra ulnek
     - a retained `EmitTmuxDeliveryNotificationResult` projection explicit compat bridge maradt, nem canonical consume source
     - a delivery public/read-model cleanup es a launch/executor lane tovabbra is kulon successor closure maradt
10. Az `O2-T4` launch/executor foundation 2026-04-19-en merge-olve lett a `main` branchre:
   - archived task artifact: `plans/archive/tasks/actor-runtime-interface-opportunity2-task4-topology-neutral-launch-executor-contract-foundation.md`
   - merge commit: `aa296ddff6486db69d3577931573446e4531f404`
   - bounded closure:
     - additive topology-neutral launch ack/input/port naming explicit a retained shared surface-en
     - canonical producer seam explicit: `src/v11/infrastructure/channel/tmux/tmuxManager.ts::launchBubbleSessionAck(...)`
     - retained `launchBubbleTmuxSessionAck(...)` es `launchBubbleTmuxSession(...)` compatibility bridge preserved maradt
11. Az `Opportunity 2` current next bounded implementation slice-a:
   - `O2-T5`
   - scope: topology-neutral launch/executor consume-family alignment a start-orchestration lane-ben + retained repo-root/public export cleanup
   - task artifact: `plans/tasks/actor-runtime-interface-opportunity2-task5-topology-neutral-launch-executor-consume-family-alignment.md`

## Done Definition

1. Ez a plan akkor szamit lezartnak, ha az alabbi ket allitas egyike igaz:
   - explicit dontes szuletik arrol, hogy a post-Phase-E architekturális follow-up nem prioritas, es minden opportunity `deferred` vagy `parkolt` dispositiont kap,
   - vagy minden opportunity explicit successor lane-hez vagy explicit deferred/parkolt dispositionhoz van kotve, es legalabb az elso bounded successor task letrejon.
2. Implementacios sikerkriteriumot ez a plan szandekosan nem vallal; azt a kesobbi task(ok) ownershipoljak.

## Opportunity Disposition

1. `Opportunity 1`
   - completed successor lane
   - completed slices:
     - `O1-T1` docs-only kernel boundary clarification
     - `O1-T2` belso typed authority / route / policy matrix
     - `O1-T3` kernel + policy + workflow-adapter separation
   - kulon `O1-T4` nem nyilt meg
   - disposition: closed on current tree
2. `Opportunity 2`
   - open successor lane
   - completed slices:
     - `O2-T1` docs-only topology/delivery/executor boundary clarification
     - `O2-T2` topology-neutral delivery contract + retained adapter foundation
     - `O2-T3` topology-neutral delivery consume-family alignment
     - `O2-T4` topology-neutral launch/executor contract foundation
   - current next slice:
     - `O2-T5` topology-neutral launch/executor consume-family alignment + repo-root/public export cleanup
   - preserved baseline: a lezart typed ack/runtime-success semantics nem reopenolhato
3. `Opportunity 3`
   - deferred successor lane `O3-T1`
   - csak az `O1-T1` kernel boundary note-ra es az `O2-T1` delivery/executor boundary note-ra epulhet
4. `Opportunity 4`
   - default szerint `O3-T1` resze
   - kulon lane csak akkor, ha az `O1-T1` boundary output kulon bounded closurekent bizonyitja

## Traceability

1. Historical predecessor:
   - `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
2. Current closeout anchors:
   - `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md`
   - `plans/actor-runtime-interface-execution-authority-contract-note-v1.md`
3. Current source anchors:
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/types/protocol.ts`
   - `src/cli/commands/agent/emit.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
