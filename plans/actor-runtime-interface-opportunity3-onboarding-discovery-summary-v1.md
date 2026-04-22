---
artifact_type: note
artifact_id: note_actor_runtime_interface_opportunity3_onboarding_discovery_summary_v1
title: "Actor Runtime Interface Opportunity 3 Onboarding Discovery Summary"
status: active
updated_at: 2026-04-22
owners:
  - "felho"
---

# Opportunity 3 Discovery Summary

## Purpose

1. Ez a dokumentum a jelenlegi `O3` ideation/discovery snapshot.
2. Nem implementacios task, hanem source-anchored felderitesi osszefoglalo a kesobbi `O3-T1` task/plan bontashoz.
3. A cel az, hogy az `Opportunity 3` ne pusztan "uj role hozzaadasa" legyen, hanem tudatos atmeneti foundation lane a mai statikus Pairflow es egy kesobbi konfiguraciovezereltebb workflow-rendszer kozott.

## Working Interpretation

1. Az `O3` nem azt jelenti, hogy most azonnal teljesen dinamikus role/output/plugin rendszert kell epiteni.
2. Az `O3` azt jelenti, hogy a mai hardcoded role/agent/output/topology wiringot olyan explicit seam-ekre kell szetvagni, amelyek:
   - ma meg fail-closed retained baseline-on ulnek,
   - de kesobb konfiguraciova alakithatok ujabb nagy rewrite nelkul.
3. Emiatt az `O3` jo olvasata:
   - onboarding/extension-surface foundation,
   - nem full dynamic runtime rollout.

## Working Terminology

1. `role`
   - workflow-fogalom
   - workflow-owned role declaration, egy adott workflow configon beluli node/step funkcionális felelossege es capability kerete
2. `agent`
   - a role workflow-beli konkretizaciojanak vegrehajtoi profilja
   - persona, skills, mode, approach es egyeb behavior-config altal konkretizalt vegrehajto
3. `runner`
   - az underlying futtato motor / execution substrate
   - peldaul `codex`, `claude-code`, vagy kesobbi mas engine/harness
4. Working decision direction:
   - `role != agent`
   - `agent != runner`
5. Ez current-tree szinten meg nem jelenti, hogy mindharom first-class persisted entity lesz azonnal, de a discovery es a kesobbi `O3-T1` ezen a fogalmi szetvalasztason kell uljon.

## Working Mental Model

1. A workflow node-okbol / step-ekbol all.
2. A workflow a sajat role-jait maga deklaralja:
   - nem feltetelezunk kulon globalis, workflow-k kozott ujrahasznalando role-registryt.
3. Egy node-hoz workflow-szinten role van rendelve:
   - a role a node funkcionális felelosseget es capability keretet adja,
   - nem maga a konkret vegrehajto.
4. A role workflow-beli konkretizaciojahoz tartozhat:
   - melyik agent futtatja,
   - melyik runner hordozza,
   - mi a primer expected output,
   - milyen orchestration contractot kell teljesitenie (peldaul evidence/artifact/payload/completion elvarasok),
   - es a jelen O3-korben working assumptionkent sajat dedikalt panelt/topology slotot kap.
5. A node tenyleges vegrehajtasat a runner hordozza:
   - a runner az underlying vegrehajto motor / execution substrate.
6. A gate a workflow/node tulajdona:
   - nem a role tulajdona,
   - es nem az agent tulajdona.
7. Az orchestrator a role workflow-beli konkretizaciojahoz tartozo execution/orchestration contractot ervenyesiti:
   - peldaul kotelezo evidence-ek,
   - artifact jelenlet,
   - payload shape,
   - completion feltetelek.
8. A gate a node execution eredmenye es a tagabb workflow-context alapjan dont:
   - output/artifact,
   - findings,
   - transcript,
   - round/state/history,
   - policy metadata,
   - capability/state context.
9. Emiatt a helyes mentalis kep:
   - a workflow-nak node-jai vannak,
   - a workflow a sajat role-jait deklaralja,
   - a node-hoz role tartozik,
   - a role workflow-beli konkretizacioja adja az agentet, runnert, orchestration contractot es kapcsolodo bindingokat,
   - az orchestrator ezt a contractot ervenyesiti,
   - a tenyleges futast a runner hordozza,
   - a gate pedig a node vegrehajtasa utan meghatarozza a kovetkezo routingot.

## V2 Alignment Reading

1. A `docs/v2/pairflow-v2-architecture-plan-joint.md` draftban explicit kulon entity a `Role`, az `Actor` es az `AgentConfig`.
2. A jelen discovery olvasata szerint a V2 fogalmi megfeleltetes kb. ez:
   - V2 `Role` ~= itt `role`
   - V2 `Actor` ~= itt inkabb `agent`
   - V2 `AgentConfig` ~= itt az agent behavior/config resze
3. A jelen O3-nyelv ettol annyiban ter el, hogy az underlying futtato motort explicitebb kulon fogalomkent nevezi meg:
   - `runner`
4. Emiatt a jelen O3 terminologia nem all szemben a V2 visionnel:
   - inkabb ugyanazt a retegezest mondja ki a mai Pairflow-nyelvhez kozelebb allo szavakkal.

## Why Runner Is First-Class

1. A `runner` nem csak egy egyszeru config-string.
2. A `runner` meghatarozhatja:
   - milyen toolok erhetoek el,
   - milyen sandbox/capability boundary ervenyes,
   - milyen lifecycle muveletek vannak (`start`, `stop`, `restart`, `resume`),
   - milyen topologyhoz kotodik (local tmux / ssh / container / cloud),
   - hogyan megy a delivery / attach / relay,
   - milyen auth/session health es recovery utak leteznek.
3. Emiatt a `runner` mas termeszetu fogalom, mint a prompt, skill vagy mode:
   - azok foleg behavior-config elemek,
   - a runner inkabb execution substrate + capability envelope.
4. A V2 draft erre mar implicit bizonyitek:
   - kulon `Executor` boundaryt nevez meg,
   - es kulon emliti az optional hook/enforcement retegeket.
5. A `hook` itt runner-level interception / enforcement pontot jelenthet:
   - pre-action ellenorzes,
   - tool-call tiltás vagy atiras,
   - context injection,
   - file-scope enforcement.
6. Working consequence:
   - a `runner` nem jo, ha csak "egy a sok agent_config mezo kozul",
   - mert kesobb kulon execution/topology/executor concernne nohet.

## Current-Tree Source Anchors

1. Role baseline:
   - `src/types/bubble.ts`
   - `AgentRole = implementer | reviewer | meta_reviewer`
2. Output baseline (`ActorOutputKind` source name):
   - `src/types/protocol.ts`
   - `ActorOutputKind = pass | human_question | convergence | meta_review_result`
3. CLI emit parser:
   - `src/cli/commands/agent/emit.ts`
4. Runtime dispatch matrix:
   - `src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.ts`
5. Runtime adapter executors:
   - `src/v11/application/actorProtocol/actorRuntimeKernel.ts`
6. Canonical workflow-agent authority context:
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/shared/actorProtocol/actorEmitContextSupport.ts`
7. Execution-context role -> awaited-output mapping:
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/shared/metaReview/metaReviewExecutionContext.ts`
8. Bubble config role binding baseline:
   - `src/config/bubbleConfig.ts`
9. Runtime topology / pane model:
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
10. Delivery target -> pane routing:
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
11. V2 conceptual reference:
   - `docs/v2/pairflow-v2-architecture-plan-joint.md`

## Current-Tree Findings

### 1. Role vocabulary remains hardcoded

1. `AgentRole` ma globalis zart tipus:
   - `implementer`
   - `reviewer`
   - `meta_reviewer`
2. Ez nem csak helper-level detail, hanem state- es authority-shape baseline is.
3. Uj role ma nem lokalizalt extension point, hanem shared type contract modositas.

### 2. Output vocabulary remains hardcoded

1. `ActorOutputKind` ma zart tipus:
   - `pass`
   - `human_question`
   - `convergence`
   - `meta_review_result`
2. A public emit input shape diszkriminacioja is erre epul.
3. Emiatt uj role vagy uj workflow-owned role konkretizacio uj outputtal mar public contract work, nem csak runtime belso wiring.

### 3. Runtime dispatch is centralized but still closed-form

1. A jo hir, hogy a runtime dispatch mar nem wrapper-sprawl, hanem central route matrix.
2. A gond, hogy ez a matrix tovabbra is fix:
   - explicit route ID-k,
   - explicit `authorityRole`,
   - explicit `inputKind`,
   - explicit adapter ID-k,
   - explicit policy check katalogus.
3. Ez jo foundation a refaktorhoz, de jelenleg meg nem onboarding surface.

### 4. Adapter execution remains output-specific

1. A kernel executor map ma negy fix adapterre ul:
   - `pass_adapter`
   - `human_question_adapter`
   - `convergence_adapter`
   - `meta_review_result_adapter`
2. Ez azt jelenti, hogy az output-capability es az adapter-binding tovabbra is hardcoded.

### 5. Execution context still derives awaited output from role

1. A `resolveAwaitedOutputTypeForRole(...)` ma:
   - `meta_reviewer -> meta_review_result`
   - minden mas -> `pass_result`
2. Ez arra utal, hogy a role es az output expectation jelenleg osszecsuszik.
3. Ez valoszinuleg kulcs toruspont lesz, ha kesobb uj role vagy uj workflow-owned role konkretizacio sajat outputtal vagy eltoro completion semantics-szel jon.

### 6. Bubble config still models a fixed operational role binding baseline

1. A bubble config ma aktiv role bindingkent csak ezt modellezi:
   - `agents.implementer`
   - `agents.reviewer`
2. A `meta_reviewer` mar most is special-case retained role/topology path, nem ugyanazon a konfiguracios surface-en definialt teljes jogu role binding.
3. Emiatt az "uj role" kerdes nem csak emit/protocol kerdes, hanem config/topology ownership kerdes is.

### 7. Runtime topology remains fixed-slot based

1. A tmux runtime pane index baseline ma fix:
   - `status`
   - `implementer`
   - `reviewer`
   - `metaReviewer`
2. Delivery routing ugyanilyen fix role/pane mappingra ul.
3. A jelen O3-korben ezt egyszerusitjuk:
   - ha egy role aktiv role-kent megjelenik a workflowban, dedikalt panelt/topology slotot kap.

## Strategic Reading

1. Az `O3` alatt nem erdemes ujra belebetonozni a mostani szerepkeszletet egy masik hardcoded matrixba.
2. A jo cel az, hogy explicitte valjanak a ma osszecsuszott fogalmak:
   - workflow node/step definition
   - workflow-owned role declaration
   - agent
   - orchestration contract
   - gate/transition policy definition
   - output/capability definition
   - runner binding
   - dedikalt topology slot
   - delivery target
   - bubble config role binding
   - state/execution authority
3. Ugyanakkor az `O3` elso szeleteiben nem kell teljes runtime dinamizmust vallalni:
   - a public contract maradhat zarva,
   - a config maradhat korlatozott,
   - de a belso seam-ek mar ne legyenek role-sprawl jelleguek.

## Closure-Bucket Reading

1. `shared_contract`
   - `AgentRole`
   - `ActorOutputKind`
   - public emit input contract
2. `authority_producer`
   - workflow-agent emit context
   - dispatch plan
   - execution context derivation
3. `internal_execution_consumers`
   - `actorProtocol` source family / workflow-agent dispatch kernel
   - pass/ask-human/converged/meta-review adapter binding
4. `workflow_orchestration_consumers`
   - state/execution-context invariants
   - route/policy assumptions
   - role-specific evidence/artifact/payload/completion enforcement
5. `read_model_consumers`
   - CLI emit parser/help
   - public protocol-facing validation
6. `cleanup_recovery_consumers`
   - jelen discovery alapjan masodlagos, de uj teljes jogu runtime jelenlet eseten kesobb ide is athatna

## Recommended O3 Lane Split

### O3-T1

1. Name:
   - onboarding/extension-surface contract clarification
2. Shape:
   - `contract_or_persisted_authority_foundation`
3. Goal:
   - explicitte szetvalasztani a kovetkezo fogalmakat:
     - workflow node/step
     - role
     - agent
     - runner
     - orchestration contract
     - gate/transition policy
     - output kind
     - capability
     - dedikalt topology slot
     - delivery target
     - role binding
     - execution authority
4. Constraint:
   - kimondani, hogy most meg nem full dynamic runtime epul
   - de a jovobeli konfiguraciovezerelt modell a tervezesi irany

### O3-T2

1. Name:
   - internal role/capability foundation
2. Shape:
   - `shared_contract` + `authority_producer`
3. Goal:
   - a fix role x output x adapter x policy matrixot explicit belso definicios seam-re huzni
   - beleertve a role-specific orchestration contract explicitte tetelet
   - ugy, hogy a jovobeli uj output kind tamogatas foundation-je kialakuljon
   - de a jelenlegi public vocabulary meg ebben a szeletben ne nyiljon ki
4. Expected family:
   - `src/v11/application/actorProtocol/**`
   - `src/v11/shared/actorProtocol/**`
   - `src/v11/shared/state/executionContext.ts`

### O3-T3

1. Name:
   - minimal topology and delivery alignment
2. Shape:
   - `authority_producer` + `internal_execution_consumers`
3. Goal:
   - a workflow-owned role binding -> delivery target / dedikalt panel/topology slot baseline explicit tisztazasa
   - topology-variacio, slot-reuse es multiplexing nelkul
4. Expected family:
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.ts`
   - kapcsolodo runtime topology helper-ek

### O3-T4

1. Name:
   - config/state onboarding alignment
2. Shape:
   - `shared_contract` + `workflow_orchestration_consumers`
3. Goal:
   - a bubble config es state baseline felkeszitese arra, hogy a workflow-owned role binding baseline ne teljesen implicit fixed pair legyen
   - beleertve a dedikalt paneles baseline-hoz szukseges state/config igazitasokat
   - es a role-specific orchestration contract allapotigenyeit
4. Expected family:
   - `src/config/bubbleConfig.ts`
   - `src/types/bubble.ts`
   - state schema / inspection / validation family

### O3-T5

1. Name:
   - public CLI/protocol onboarding surface
2. Shape:
   - `read_model_consumers`
3. Goal:
   - a public emit/parser/protocol surface kontrollalt nyitasa vagy abstraction-je
   - beleertve az uj output kindok explicit, fail-closed bevezeteset
4. Expected family:
   - `src/cli/commands/agent/emit.ts`
   - `src/types/protocol.ts`
   - kapcsolodo CLI es workflow-agent protocol tesztek

## Important Non-Goals

1. Nem cel most teljesen tetszoleges, schema nelkuli workflow/role/agent definicio configbol.
2. Nem cel most plugin-rendszer vagy korlatlan runtime composition.
3. Nem cel a bubble workflow baseline teljes fellazitasa fail-closed replacement proof nelkul.
4. Nem cel most az `O3` alatt topology-neutral delivery/executor lane ujranyitasa.

## Key Open Questions

### Q1. Workflow-owned role declaration vs agent vs runner

1. Design direction:
   - a `role`, az `agent` es a `runner` kulon fogalom
   - a `role` nem globalis registry-elem, hanem workflow-owned declaration
   - az `agent` nem kulon lebego truth-owner, hanem a role workflow-beli konkretizaciojanak resze
2. Current reading:
   - a workflow sajat role-jait deklaralja
   - a role workflow-beli konkretizacioja hordozza az agentet, a runnert es a kapcsolodo bindingokat
   - a `runner` kulon fogalom marad, nem csak behavior-config mezo
3. Remaining flexibility question:
   - ugyanaz az agent-konfiguracios minta tobb workflow-owned role konkretizaciojaban is alkalmazhato-e
   - es egy workflow role kulonbozo bubble-instance-ekben kaphat-e eltero agentet override/binding formaban

### Q2. New output kind phasing

1. Design direction:
   - uj role-okkal uj output kindok is johetnek
   - ez az `O3` celallapot resze, nem opcionális extra
2. Phasing question:
   - az uj output kind tamogatas belso foundation-je melyik szeletben keszuljon el
   - es melyik kulon szeletben nyiljon meg a public emit/parser/protocol surface-en
3. Current reading:
   - a belso foundation elsodlegesen `O3-T2`
   - a public contract nyitas elsodlegesen `O3-T5`

### Q3. Dedicated panel baseline vs deferred topology variation

1. Design direction:
   - a jelen O3-korben, ha egy role aktiv a workflowban, sajat dedikalt panelt kap
   - topology slot reuse, conditional visibility es multiplexing most explicit deferred
2. Ez a working assumption itt tipikusan ezt jelenti:
   - sajat pane
   - sajat delivery target
   - sajat execution-context path
3. Deferred question:
   - kesobbi korben kell-e topology-variacio
   - peldaul slot reuse, overlay, vagy felteteles topology visibility
4. Current reading:
   - a minimal dedikalt topology/delivery baseline elsodlegesen `O3-T3`
   - a kapcsolodo config/state alignment elsodlegesen `O3-T4`

### Q4. Workflow config vs bubble instance phasing

1. Design direction:
   - a hardcoded global workflow truth feloldasanak celallapota nem bubble-local truth
   - hanem workflow-config / workflow-schema-owned truth, amit a bubble runtime instance-kent referal es peldanyosit
2. Bubble-instance olvasat:
   - a bubble nem maga talalja ki a workflow szerkezetet
   - hanem egy workflow config/schema futtatott peldanya, lokalis bindingokkal vagy override-okkal
3. Phasing question:
   - a workflow-truth levallasztasa melyik szeletben kezdodjon el a bubble configtol
   - es melyik kesobbi szeletben formalizalodik kulon workflow config/schema iranyba
4. Current reading:
   - a design direction elsodlegesen `O3-T1`
   - a bubble config instance/binding iranyba tolas elsodlegesen `O3-T4`
   - a teljes workflow-config formalizalas valoszinuleg mar tulmutat az elso O3 foundation szeleteken

### Q5. Primary expected output vs cross-cutting outcome

1. Design direction:
   - a role onmagaban ne implikaljon egyetlen kizarlagos output kindot
   - a primer vart output inkabb node/route-definition vagy capability-level truth legyen
   - emellett letezhessenek cross-cutting outcome-ok, mint peldaul a `human_question`
2. Cross-cutting outcome olvasat:
   - az ilyen outcome nem workflow-routing dontes
   - hanem execution eredmenyosztaly, amelyet a gate/orchestration ertelmez tovabb
3. Implication:
   - az `awaited_output_type` hosszu tavon nem maradhat egyszeruen role-derived lookup
   - el kell valni egymastol a primer expected output es a tobb role-ban is megjeleno cross-cutting outcome family
4. Open owner question:
   - a primer expected output canonical owner-e node/step definition legyen
   - route-definition legyen
   - vagy capability contract legyen
5. Current reading:
   - a role-derived lookup lebontasanak foundation-je elsodlegesen `O3-T2`
   - a kapcsolodo public/protocol alignment elsodlegesen `O3-T5`

## Current Recommendation

1. Az `O3`-at Plan -> tobb Task lane-kent kell kezelni.
2. A helyes elso lepes egy docs-only `O3-T1`, nem kozvetlen implementation task.
3. Az `O3-T1`-nek explicitten ki kell mondania:
   - mi marad zart baseline,
   - mi lesz az uj internal extension seam,
   - es hogyan keruljuk el, hogy a mai hardcoded wiringot egy masik hardcoded abstractionbe csomagoljuk.
4. Az uj output kind support mar nem nyitott igen/nem kerdes:
   - celallapotkent kell kezelni,
   - es az `O3`-ban phasing kerdeskent kell bontani internal foundation + public contract nyitas szeletekre.
5. A jelen O3-korben a role-ok dedikalt paneles baseline-on ertelmezettek:
   - a topology-variacio most deferred,
   - es csak kesobbi korben erdemes ujra megnyitni.
6. A workflow truth helye sem nyitott local-vs-global vita:
   - celallapotkent workflow-config/schema-owned truthkent kell kezelni,
   - es az `O3`-ban phasing kerdeskent kell bontani bubble-instance iranyu levallasztas + kesobbi workflow-config formalizalas szeletekre.
7. A primer expected output sem maradhat tisztan role-derived:
   - kulon kell valni a node/route/capability szintu primer expected output truthnak,
   - es a cross-cutting outcome familynek, mint peldaul a `human_question`.
8. A `role` sem globalis reuse-objektumkent kezelendo:
   - workflow-owned declarationkent kell kezelni,
   - es az agent/runner/orchestration contract/dedikalt panel baseline jellegu adatok ennek workflow-beli konkretizaciojahoz tartoznak.

## Discussion Use

1. Ez a dokumentum working draft.
2. A kovetkezo beszelgetesek celja:
   - a fenti nyitott kerdesek lezarasa,
   - az `O3-T1` pontos scope-janak rogzitese,
   - es utana a konkret task artifact megirasa.
