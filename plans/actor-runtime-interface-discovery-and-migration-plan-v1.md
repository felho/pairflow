---
artifact_type: plan
artifact_id: plan_actor_runtime_interface_discovery_and_migration_v1
title: "Actor Runtime Interface Discovery and Migration Preparation"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Actor Runtime Interface Discovery and Migration Preparation

## Objective

Elokesziteni egy olyan actor runtime interface-et vagy actor adapter contractot, amely:
1. egyseges, canonical boundaryt ad az `implementer`, `reviewer` es `meta_reviewer` actorok futasahoz,
2. lehetove teszi uj actorok bevezeteset uj actor-specifikus CLI/domain branch-ek nelkul,
3. csokkenti a jelenlegi actor-specifikus behavior, parser es runtime-coupling mennyiseget,
4. Phase 4 es Phase 5 utan biztonsagos, kis lepeses migraciot tamogat egy rewrite helyett.

Ez a plan discovery- es preparation-jellegu. Nem celja a Phase 4 vagy Phase 5 leszallitasi scope-janak felulirasa vagy kiszelesitese.

## Decision Baseline

1. Terminologia: a javasolt uj boundary munkaneve `actor runtime interface`; ezzel ekvivalens elfogadhato terminus az `actor adapter contract` vagy `actor driver contract`. Nem pusztan TypeScript interface-rol van szo, hanem egy teljes runtime/domain boundaryrol.
2. Scope boundary: a Phase 4 es Phase 5 marad a canonical actor-emission surface es a legacy cleanup kotelezo szallitasanak helye. Ez a plan ezekkel parhuzamos discovery-es tervezesi munka, nem uj delivery gate a folyamat kozben.
3. Canonical source of truth: a jovobeli actor runtime interface-et nem a jelenlegi role-specifikus command surface unionjabol kell levezetni, hanem a protocol-first target modellbol, kulonosen a generic actor-facing protocol surface-bol es az explicit authority-contractbol.
4. Inventory policy: a jelenlegi actor-viselkedesek inventoryja leiro artifact, nem normativ target contract. Az inventory celja a jelenlegi behaviorok, side effectek, special-case-ek es drift-ek feltarasa, nem azok legitimacioja.
5. Capability-first policy: a target actor runtime interface capability-alapu legyen. A kerdes nem az, hogy ma milyen commandok vannak, hanem az, hogy egy actor-futasnak milyen minimalis kepessegekre van szuksege a canonical protocol modell kiszolgalasahoz.
6. Role-model policy: kulon kell kezelni a `Role`, az `Actor` es az `AgentConfig` fogalmat. A `reviewer` mint workflow-szerep, a `claude` mint konkret actor es az agent persona/skill/mode konfiguracio nem ugyanaz a boundary, es a jovobeli interface-et nem szabad ezek osszemosasara epiteni.
7. Authority policy: az actor runtime interface nem hozhat letre, nem modosithat es nem zarhat bubble lifecycle authorityt kozvetlenul. Az actor kizárólag explicit execution contextet kap, durable handoffbol dolgozik, es canonical actor outputot bocsat ki.
8. Event-boundary policy: a jovobeli actor runtime interface mar a discovery fazisban is normalizalt input/output boundarykent kezelendo. A cel nem command-spelling alapú actor API, hanem olyan boundary, amely EventEnvelope-szeru inputot es canonical actor outputot vagy typed artifactot hasznal.
9. Separation policy: az actor runtime interface ne keverje ossze a workflow/domain logikat, a runtime/transport kerdeseket es a role-specifikus policyt. A routing, state transition es authority tovabbra is orchestrator/domain felelosseg.
10. Executor-boundary policy: az actor runtime interface es az executor interface kulon absztrakcio maradjon. Az executor a process/workspace/sync/relay/liveness reteget kezeli; az actor interface azt, amit az actor egy workflow-step vegrehajtasakor lat es hasznal.
11. Small-core policy: a target actor runtime interface magja maradjon kicsi es canonical. Nem cel a mai actor behaviorok teljes unionjat egyetlen kotelezo alapszerzodessé tenni.
12. Extension policy: a ritkabb, opcionális vagy experimentalis actor-viselkedesek lehetnek bounded extension surface-re teve, ha a core contract valtozatlan marad, es az extension nem lep be authority-, routing- vagy state-ownership domainbe.
13. Forbidden-extension policy: workflow state ownership, authority resolution, lifecycle transition, hard capability enforcement es canonical actor-output validation nem szervezheto ki extension retegbe.
14. Migration policy: a vart atallasi minta strangler jellegu legyen. Eloszor wrapper/adapter boundary jelenjen meg a meglevo canonical surface folott, es csak kesobb migralodjanak ra fokozatosan az egyes actor implementaciok.
15. Rewrite avoidance policy: a cel nem uj actor framework egyszeri nagy atirassal, hanem kis lepeses refaktorok sorozata, amelyek minden lepesnel megtartjak a canonical protocol behavior parityt.
16. Phase dependency: a tenyleges actor runtime cutover Phase 4 es Phase 5 utan kezdodhet. A discovery, simulation es migration-spine tervezes viszont mar most elkezdheto, ha nem valtoztatja meg a Phase 4/5 immediate acceptance contractjat.

## Target Architecture Hypothesis

### Runtime Boundary

1. Egy actor-futas bemenete egy explicit execution context + handoff payload + relevans protocol snapshot legyen.
2. Az actor ne shell-contextbol, `cwd`-bol vagy legacy helper-ekbol talalja ki a bubble authorityt.
3. Az actor kimenete ne role-specifikus command legyen, hanem canonical actor output, human input request vagy typed artifact write.
4. A boundary tervezesi celja legyen, hogy a mai CLI-parancsok kesobb legfeljebb vekony wrapperkent EventEnvelope-szeru vagy azzal ekvivalens canonical boundaryra forditsanak.

### Capability Model

1. A minimalis capability-keszlet varhatoan ilyesmi:
   - `receiveExecutionContext`
   - `readHandoff`
   - `readRelevantProtocolState`
   - `emitOutput`
   - `requestHumanInput`
   - `publishArtifact` vagy ezzel ekvivalens artifact/output helper, ha tenylegesen szukseges
   - opcionálisan `ackIntent` vagy ezzel ekvivalens relay/operation boundary, ha kesobb idempotens executor-relay modellre akarunk kozeliteni
2. A kovetkezo dolgok kifejezetten ne legyenek actor capabilityk:
   - bubble state transition vegrehajtasa,
   - authority mezok implicit feloldasa,
   - lifecycle routing,
   - legacy command semantics fenntartasa,
   - tmux/session/pane statusbol levezetett domain dontes.

### Extension Surface Hypothesis

1. A jövobeli designban erdemes kulon kezelni:
   - kotelezo core actor capability-ket,
   - bounded extension pontokat,
   - tiltott extension domain-eket.
2. A bounded extension surface jo jeloltjei lehetnek:
   - step-start context enrichment,
   - role- vagy actor-specifikus prompt/policy dekoraciok,
   - optional artifact producers,
   - findings/rendering/summary helper-ek,
   - human interaction UI helper-ek,
   - kulso integracios adapterek,
   - diagnostics vagy advisory guardok.
3. A kovetkezo teruletek ne legyenek extensionre bízva:
   - workflow state transition,
   - authority-resolution vagy implicit context inference,
   - lifecycle routing,
   - hard capability enforcement,
   - canonical actor-output schema es acceptance validation.
4. Az extension policy celja nem teljes plugin-platform definialasa a discovery fazisban, hanem annak eldöntese, hogy a jovobeli actor runtime interface-nek mely behaviorok legyenek kotelezo core reszei, es melyek maradhatnak opcionális bovitopontok.

### Role Model

1. Az `implementer`, `reviewer` es `meta_reviewer` ugyanazt az actor runtime interface-et hasznaljak.
2. Ami szerepspecifikus marad, az:
   - a kapott handoff tartalma,
   - a workflow-ban betoltott `Role`,
   - a konkret vegrehajto `Actor`,
   - az `AgentConfig`,
   - az elvart output-kind,
   - az actor sajat policyja vagy promptja,
   - adott esetben a supportalt output-shape-ek szukebb halmaza.
3. A szerepspecifikus kulonbseg ne kulon transport/API/CLI boundary legyen, hanem ugyanazon interface mas konfiguracioja vagy policy-ja.

## Workstreams

### Workstream 1: Current-State Behavior Inventory

1. Ossze kell gyujteni a jelenlegi actor behaviorokat a teljes codebase-ben.
2. Az inventory minimum retegei:
   - entrypointok es parser-ek,
   - `Role` / `Actor` / `AgentConfig` szetvalasztasa a jelenlegi codepathokban,
   - actor-specifikus validation/policy,
   - runtime/context lookup es helperek,
   - durable protocol emit pathok,
   - event/relay normalizalas vagy annak hianya,
   - executor-fuggosegek (workspace, sync, process, relay, liveness),
   - olyan behaviorok, amelyek extension ponttá tehetok,
   - artifact- es side-effect pathok,
   - legacy aliasok es compatibility branch-ek.
3. Minden behaviorrol rogzitendo:
   - kozos vagy szerepspecifikus,
   - canonical, transitional vagy accidental,
   - targetben kotelezo core, bounded extension, adapterbe szorithato vagy eltavolitando.

### Workstream 2: Capability Contract Derivation

1. Az inventory utan egy capability-alapu contractot kell levezetni.
2. A contractot a protocol-first target modellhez kell igazitani, nem a jelenlegi command surface-hez.
3. Ki kell mondani:
   - milyen input authority es input artifact kell az actor futasahoz,
   - hogyan valik el a `Role`, `Actor` es `AgentConfig`,
   - milyen canonical outputokat bocsathat ki,
   - milyen normalizalt event vagy relay boundaryra epit,
   - milyen side effectek engedettek,
   - milyen muveletek tilosak az actor boundaryn,
   - mi tartozik mar az executor interface-hez es nem az actor interface-hez,
   - mely behaviorok kotelezo core capabilityk, es melyek bounded extension pontok.

### Workstream 3: Scenario Simulation

1. Kell egy use-case matrix, amelyen a javasolt interface vegigtesztelheto.
2. Minimum szcenariok:
   - implementer pass,
   - reviewer fix-request,
   - reviewer convergence,
   - meta-review result,
   - human input escalation,
   - stale authority,
   - conflicting context,
   - restart/recovery kornyezet,
   - duplicate relay vagy duplicate intent,
   - stale intent egy mar tovabblepett workflow-stepre,
   - artifact-heavy output,
   - optional extensionnel kiegeszitett actor behavior,
   - retained compatibility adapter path.
3. Minden szcenarional meg kell vizsgalni:
   - milyen input kell,
   - mely capability-k szuksegesek,
   - milyen output keletkezik,
   - milyen provenance es idempotency kovetelmeny jelenik meg,
   - core capability vagy extension pont kell-e hozza,
   - van-e megmarado szerepspecifikus policy,
   - eleg-e a javasolt interface,
   - ha nem, mi hianyzik.

### Workstream 4: Migration Spine

1. Meg kell tervezni a kis lepeses migracios utat.
2. Elvi sorrend:
   - canonical actor-emission surface stabilizalasa Phase 4-ben,
   - legacy cleanup Phase 5-ben,
   - belso actor runtime contract bevezetese wrapperkent,
   - minimalis core capability-k befagyasztasa,
   - bounded extension pontok kijelolese,
   - actor-boundary es executor-boundary explicit szetvalasztasa,
   - egy pilot actor migracioja parity mellett,
   - fokozatos rollout a tobbi actorra.
3. A migration spine minden lepesere rogzitendo:
   - mi az elozetes feltetel,
   - milyen parity evidence kell,
   - mi marad transitional adapter,
   - mi torolheto a kovetkezo fazisban.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase A | Current-state actor behavior inventory | jelenlegi actor CLI entrypointok, runtime helper-ek, protocol emit pathok, prompt/runtime guidance | checked-in behavior inventory a kozos, szerepspecifikus, transitional es accidental behaviorokrol, kulon `Role`/`Actor`/`AgentConfig`, actor-vs-executor es core-vs-extension nezetekkel | a teljes actor surface inventorozva van, es minden relevans behavior kapott target-minositest |
| Phase B | Capability-alapu actor runtime interface draft | Phase A inventory, protocol-first Phase 3/4/5 target modellek, v2 boundary irany | actor runtime interface RFC vagy ezzel ekvivalens contract draft capability modellel, tiltott muveletekkel, authority boundaryval, actor-vs-executor szetvalasztassal es bounded extension policyval | letezik egy normativ contract draft, amely mar nem legacy command-union logikabol indul ki, v2-kompatibilis boundary-gondolkodast kovet, es kis core-ra epul |
| Phase C | Scenario simulation es gap analysis | Phase B contract draft, use-case matrix | scenario matrix + coverage/gap report, kulon provenance/idempotency/stale-intent es core-vs-extension megfigyelesekkel | minden jelenlegi fo actor-use-case vegig van jatszva, es az interface-gapek explicitten rogzitettek |
| Phase D | Migration spine es rollout strategy | Phase B-C artifactok, Phase 4/5 aktualis allapota | kis lepeses migracios terv parity gate-ekkel, pilot actor javaslattal, actor-vs-executor boundarydontesekkel, core freeze ponttal es adapter cleanup sorrenddel | a Phase 5 utani elso implementacios fazis rewrite nelkul elkezdheto |

## Task List

1. `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA.md`
2. `plans/tasks/actor-runtime-interface-capability-contract-phaseB.md`
3. `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC.md`
4. `plans/tasks/actor-runtime-interface-migration-spine-phaseD.md`
5. `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` (kesobbi task, csak Phase 5 utan)

## Dependencies

1. [protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md](/Users/felho/dev/pairflow/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md)
2. [protocol-first-cli-and-protocol-surface-unification-phase4.md](/Users/felho/dev/pairflow/plans/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md)
3. [protocol-first-legacy-meta-review-model-removal-phase5.md](/Users/felho/dev/pairflow/plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md)
4. `docs/pairflow-initial-design.md`
5. A jelenlegi actor CLI entrypointok, runtime helper-ek, prompt/guidance builder-ek es protocol persistence pathok codebase inventoryja.

## Risks and Mitigations

1. Risk: a discovery az aktualis legacy behaviorokat emeli be target contractta -> Mitigation: az inventory leiro artifact, a normativ interface-et kulon capability-derivation fazis adja.
2. Risk: a Phase 4/5 delivery fokusza szetszalad -> Mitigation: explicit scope boundary; ez a plan discovery/preparation only a tenyleges cutover elott.
3. Risk: a jovobeli interface tul bove lesz, mert a jelenlegi command-uniont masolja -> Mitigation: tilos a command-surface uniont vegleges contractkent kezelni; a targetet a canonical protocol model vezeti.
4. Risk: a jovobeli interface tul szuk lesz, es nem fedi le a valos actor-use-case-eket -> Mitigation: kulon scenario simulation matrix es gap analysis.
5. Risk: a kesobbi migracio nagy rewrite-iranyba csuszik -> Mitigation: migration spine parity gate-ekkel, pilot actorral es strangler mintaval.
6. Risk: szerepspecifikus policy es runtime concern osszemosodik -> Mitigation: capability tiltólista es explicit authority boundary a contract draftban.

## Validation Strategy

1. Docs validation: a planbol kovetkezo taskok kulon artifactokban bizonyitsak a current-state inventory, a capability contract, a scenario matrix es a migration spine teljességet.
2. Traceability validation: minden current-state behavior kapjon minositest (`common`, `role-specific`, `transitional`, `accidental`) es target-dontest (`core`, `extension`, `adapt`, `remove`).
3. Scenario validation: a simulation matrix bizonyitsa, hogy a javasolt interface a mai fo use-case-eket lefedi, vagy explicit gapet jelez; kulon kezelje az idempotency, stale-intent, provenance es core-vs-extension kovetelmenyeket.
4. Migration validation: a kesobbi taskokban minden migration stephez parity evidence es cleanup ownership tartozzon.
5. Architectural validation: a vegleges actor runtime interface ne sertse a protocol-first plan authority- es routing-invariansait, mar a discovery szinten se mossa ossze az actor boundaryt az executor boundaryval, es ne szervezzen ki kernel-felelossegeket extension retegbe.

## Assumptions

1. Ehhez a munkahoz egyelore eleg a `Plan -> Task` lanc; kulon PRD nem kotelezo.
2. A Phase 4 es Phase 5 tovabbra is elsobbseget elvez a tenyleges runtime/CLI szerzodes szallitasaban.
3. A discovery fazis mar Phase 4 kozben is elkezdheto, ha nem valtoztatja meg a bubble-ben aktiv implementacios scope-ot.
4. A tenyleges actor runtime cutover csak akkor kezdheto, ha a canonical actor-emission surface es a legacy cleanup mar eleg stabil.
