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

### Opportunity 2: Topology-Neutral Delivery and Executor Split

1. A jelenlegi current tree retained tmux control mechanikara tamaszkodik.
2. A follow-up celja, hogy a `tmux` retained operatori/observability adapter maradjon, mikozben a canonical delivery trigger es ack boundary topology-semleges lesz.
3. Ez akkor erdekes, ha:
   - remote runner,
   - API/IPC delivery,
   - vagy non-tmux actor launch irany felmerul.

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
   - `S1` generic runtime kernel boundary clarification,
   - `S2` delivery/executor topology-neutral contract clarification,
   - `S3` onboarding es extension-surface simplification.
4. Azert ez a sorrend, mert:
   - onboardingot nem erdemes stabil generic core nelkul nyitni,
   - topology-neutral deliveryt nem erdemes full rewritekent kezelni, amig a boundary nevei es ownershipja nem tiszta.

## Suggested First Implementation Slice

1. Ha a successor planbol tenyleges munka indul, az elso bounded task ne runtime rewrite legyen.
2. A legkisebb ertelmes elso szelet:
   - a role-neutral actor runtime kernel dokumentalt, typed belso contractja,
   - a mostani wrapper logic inventoryja,
   - es egy explicit mapping arrol, mi marad policy-level kulonbseg.
3. Ez docs+typed-boundary taskkent kezdheto, mielott barmilyen delivery topology vagy CLI surface mozdul.

## Done Definition

1. Ez a plan akkor szamit lezartnak, ha az alabbi ket allitas egyike igaz:
   - explicit dontes szuletik arrol, hogy a post-Phase-E architekturális follow-up nem prioritas, es nem nyilik implementacios task,
   - vagy legalabb egy bounded successor task letrejon a fenti opportunity area-k valamelyikere.
2. Implementacios sikerkriteriumot ez a plan szandekosan nem vallal; azt a kesobbi task(ok) ownershipoljak.

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
