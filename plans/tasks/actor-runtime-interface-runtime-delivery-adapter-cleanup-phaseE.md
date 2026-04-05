---
artifact_type: task
artifact_id: task_actor_runtime_interface_runtime_delivery_adapter_cleanup_phaseE_v1
title: "Actor Runtime Interface Runtime Delivery Adapter Cleanup (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/core/runtime/tmuxDelivery.ts
  - src/core/runtime/watchdog.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/watchdog/watchdogCommandFlow.ts
  - src/v11/shared/watchdog/watchdogPaneActivitySampler.ts
  - src/v11/application/watchdog/watchdogCommandContract.ts
  - src/v11/application/restart/runRestartFlow.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/runtime/watchdog.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/v11/shared/watchdog/watchdogPaneActivitySampler.test.ts
  - tests/v11/application/watchdog/watchdogCommandApi.test.ts
  - tests/v11/application/watchdog/watchdogFacadeParity.test.ts
  - tests/v11/application/restart/runRestartFlow.test.ts
  - tests/contracts/v11/watchdog.contract.test.ts
  - README.md
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Runtime Delivery Adapter Cleanup (Phase E)

## L0 - Policy

### Goal

A Phase E kovetkezo bounded cleanup-szelete a retained runtime delivery adapterek explicit leszukitese legyen ugy, hogy a `tmux` launch/pane delivery, a watchdog es a status projection egyertelmuen observability/projection reteg maradjon, mikozben a canonical delivery/ack authority tovabbra is explicit execution context + typed runtime outcome boundaryn alljon.

Ez a task akkor sikeres, ha:
1. a retained `tmuxDelivery` path nem sugall canonical `accepted` / `running` authorityt pane activity vagy send-success alapjan,
2. a watchdog es a status view ugyanazt az explicit delivery/ack boundaryt projektalja, nem passziv runtime jelekbol kovetkeztet delivery sikert,
3. restart/recovery utan tovabbra is csak uj execution authorityhoz kotott explicit delivery marad ervenyes,
4. a duplicate delivery es delayed/missing ack esetek explicit bounded semantics-et kapnak a retained adapter retegen belul is,
5. a scope nem dagad teljes topology-csereve, nem tavolitja el a `tmux` reteget, es nem nyit uj actor primitive-t.

### Context

1. A Phase D migration spine szerint a wrapper boundary, a delivery/ack boundary es a pilot cutover utan a retained adapterek cleanupja kovetkezik ott, ahol a cleanup trigger mar teljesult.
2. A most lezart meta-review operator cleanup a retained operator projection surface-et tisztazta, de a runtime oldalon a `tmuxDelivery`, a watchdog es a status projection tovabbra is kozel ul a canonical delivery allapothoz.
3. A Phase B contract mar rogzitette a typed runtime ack vocabularyt (`accepted`, `rejected`, `running`, `failed_to_start`), valamint azt is, hogy a pane-visible activity nem canonical authority-forras.
4. A Phase C matrix szerint a `SC8_DUPLICATE_DELIVERY`, `SC10_RESTART_RECOVERY` es `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` mar explicit gap/adapter-temak, amelyekhez bounded implementacios policy kell.
5. A current-state inventory szerint a `tmuxDelivery` es a watchdog retained runtime adapterek; a cel nem ezek hirtelen eltavolitasa, hanem az authority-vs-observability hatar tovabbi szukitese.

### In Scope

1. A retained runtime delivery adapter (`tmuxDelivery`) explicit boundary-tisztitasa.
2. A watchdog/reference-time semantics es a pane-observability semantics explicit megerositese.
3. A status projection delivery/ack szemantikajanak tisztazasa, hogy ne sugalljon canonical acceptance-t passziv runtime jelek alapjan.
4. Restart/recovery utani explicit delivery authority es stale-elozmeny semantics megerositese.
5. Duplicate delivery es delayed/missing ack bounded fallback szerzodese a touched runtime surface-eken.
6. A touched runtime/status/watchdog pathok kotelezo regresszios tesztjei es contract evidence-e.
7. Minimalis dokumentacios frissites csak akkor, ha a runtime/operator delivery semantics user-visible modon pontosodik.

### Out of Scope

1. Teljes topology-csere vagy a `tmux` reteg eltavolitasa.
2. Uj actor primitive, uj output family vagy uj lifecycle-state bevezetese.
3. Az actor-facing canonical `emit` surface ujranyitasa vagy redesignja.
4. A reviewer vagy meta-reviewer policy surfaces opportunistic ujranyitasa.
5. Altalanos restart/watchdog UX-redesign.
6. Olyan refaktor, amely nem a retained delivery/ack adapter boundary tisztitasat szolgalja.

### Safety Defaults

1. A canonical delivery/ack authority explicit runtime outcome + execution context paros marad; `tmux` pane activity, shell output vagy send-siker nem lehet canonical elfogadasi bizonyitek.
2. A retained runtime adapterek observability/projection szerepe megmaradhat, de nem keveredhet acceptance-, authority- vagy state-transition szemantikaval.
3. Duplicate masodik delivery ugyanarra a handoffra/executionre nem hozhat letre masodik sikeres `accepted` vagy `running` executiont.
4. Restart vagy resume utan a regi delivery authority stale marad; csak uj execution contexthez kotott explicit delivery marad ervenyes.
5. A watchdog escalation runtime-liveness reteg marad; nem kovetkeztethet actor-elfogadasra pusztan pane-lathatosagbol vagy pane-csendbol.
6. A task implementacios contract, de nem kovetel minden retained adapter azonnali eltavolitasat; a cleanup triggerhez igazodva csak a boundary tisztul kotelezo.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - runtime delivery/ack semantics,
   - watchdog/status projection contract,
   - restart/recovery delivery authority contract,
   - duplicate delivery suppression contract,
   - operator-visible runtime diagnostics contract.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical forras a Phase E retained adapter cleanup helyere a teljes migration programban.
2. Binding migration input:
   - `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md`
   - Ez rogzitette, hogy a retained `tmux`/watchdog/operator topology observability-only adapter maradjon, es hogy a duplicate delivery valamint az ack-source ownership Phase E-ben valjon implementacios policyva.
3. Binding target contract:
   - `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md`
   - Ez az authoritative typed ack es explicit authority boundary.
4. Binding scenario/parity input:
   - `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md`
   - A runtime delivery cleanup kotelezo parity inputjai innen jonnek.
5. Binding current-state grounding:
   - `plans/tasks/actor-runtime-interface-behavior-inventory-phaseA-inventory.md`
   - Ez mutatja, hogy a `tmuxDelivery` es a watchdog retained runtime adapterek.
6. Precedence rule:
   - target boundaryhoz a Phase B authoritative,
   - retained ownershiphoz es cleanup triggerhez a Phase D authoritative,
   - parity coverage-hez a Phase C authoritative,
   - current code csak grounding evidence.

### Terminology Lock

1. `runtime delivery adapter` = a retained `tmuxDelivery` + kapcsolodo runtime wiring, amely launch/delivery/projection feladatot lat el, de nem canonical authority-forras.
2. `typed runtime ack` = az explicit `accepted` / `rejected` / `running` / `failed_to_start` vocabulary.
3. `observability-only runtime signal` = pane activity, pane-csend, sampled shell output vagy registry projection, amely diagnostics lehet, de nem canonical acceptance.
4. `delivery authority` = annak explicit bizonyiteka, hogy az adott execution contexthez kotott runtime boundary elfogadta vagy elinditotta a munkat.
5. `duplicate delivery suppression` = ugyanazon handoff/execution ismételt deliveryjenek bounded reject vagy suppresszalt no-op alakja.
6. `watchdog projection` = a timeout/liveness status olyan olvasati reteg, amely explicit reference/deadline mezoket projektal, nem pane-derived authorityt.

### Deliverable Shape Lock

1. A kotelezo deliverable a retained runtime delivery, watchdog es status projection surface explicit observability-only / typed-ack boundary melletti kodszintu megerositese.
2. A kotelezo bizonyitas az automated parity evidence a `T1`-`T8` matrix szerint; a task nem zarhato le puszta commentekkel vagy narrativ "tmux is just observability" allitassal.
3. `README.md` es `docs/pairflow-initial-design.md` csak akkor kotelezoen touched, ha a runtime/operator delivery semantics user-visible modon pontosodik.
4. Nem kotelezo minden `target_files` elemet modositani; a lista implementation surface-budget.
5. Ha a cleanup user-visible semantics valtozas nelkul valosul meg, a docs diff elhagyhato, de ezt a completion summarynek explicitten allitania kell.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/tmuxDelivery.ts` | `emitTmuxDeliveryNotification`, envelope target resolution, delivery result shaping | A retained delivery adapter explicitten transport/projection reteg maradjon: send-success, session-presence vagy pane-capture ne alljon ossze canonical `accepted` / `running` szemantikava; duplicate masodik deliveryre bounded reject/no-op viselkedes kell | P1 | required-now | T1, T2, T4 |
| CS2 | `src/core/runtime/watchdog.ts` | `computeWatchdogStatus` | A watchdog reference/deadline projection explicit execution-contexthez kotodjon; pane activity vagy session lathatosag ne lehessen elfogadasi bizonyitek, csak liveness/diagnostics input | P1 | required-now | T3, T5 |
| CS3 | `src/v11/shared/status/statusCommandViewBuilder.ts` | `buildBubbleStatusView` runtime/pane/delivery projection | A status view runtimeDelivery/paneActivity/watchdog mezoit ugy kell projektalni, hogy az explicit ack es az observability-only signal ne mosodjon ossze | P1 | required-now | T3, T5, T8 |
| CS4 | `src/v11/shared/watchdog/watchdogPaneActivitySampler.ts`, `src/v11/shared/watchdog/watchdogCommandFlow.ts` | pane sampling + escalation flow | A sampling eredmenye explicitten diagnostics input maradjon; delayed/missing ack eseten az escalation ne allitson canonical delivery sikert vagy actor ownershipet | P1 | required-now | T5, T6 |
| CS5 | `src/v11/application/watchdog/watchdogCommandContract.ts` | watchdog output/view contract | A contract explicitten kulonböztesse meg a typed ack projectiont es a pane-derived observability adatot; ne hagyjon implicit authority-olvasatot | P2 | required-now | T5, T8 |
| CS6 | `src/v11/application/restart/runRestartFlow.ts` | restart utani runtime relaunch es recovery marker path | Restart utan csak uj explicit delivery authority maradjon ervenyes; a regi executionhez kotott delivery projection ne maradjon current-kent ertelmezheto | P1 | required-now | T6, T7 |
| CS7 | `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/runtime/watchdog.test.ts`, `tests/core/runtime/restartRecovery.test.ts`, `tests/v11/shared/watchdog/watchdogPaneActivitySampler.test.ts`, `tests/v11/application/watchdog/watchdogCommandApi.test.ts`, `tests/v11/application/watchdog/watchdogFacadeParity.test.ts`, `tests/v11/application/restart/runRestartFlow.test.ts`, `tests/contracts/v11/watchdog.contract.test.ts` | retained runtime regression surface | Kotelezo tesztfedezet kell a typed-ack vs pane-observability split, duplicate delivery suppression, restart utani uj authority es status/watchdog projection korul | P1 | required-now | T1-T8 |
| CS8 | `README.md`, `docs/pairflow-initial-design.md` | runtime/operator semantics | Csak akkor frissitendo, ha a delivery/ack vagy watchdog/status projection user-visible szemantikaja tenylegesen pontosodik | P2 | conditional-now | T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Runtime delivery outcome | retained `tmuxDelivery` result ma delivery-confirmation es projection kevereket hordoz | a retained adapter kimenete explicitten transport/projection marad; canonical `accepted` / `running` authorityt nem allit elo pusztan `tmux` muveletbol | handoff/execution identity, delivery target resolution, bounded delivery outcome | projection message, target pane, session name, reason code | non-breaking tightening a semantics szetvalasztasaval | P1 | required-now |
| Watchdog status | reference/deadline + pane sampling ma kozel ul a runtime deliveryhoz | a watchdog output explicit reference/deadline projection marad, es nem kovetkeztet actor-acceptance-re observability adatokbol | `monitored`, `referenceTimestamp`, `deadlineTimestamp`, `expired` | pane-derived diagnostics, remainingSeconds, monitoredAgent | non-breaking tightening | P1 | required-now |
| Status runtimeDelivery projection | a status view mutat runtimeDelivery es paneActivity adatot, de a hatar implicit lehet | a status output kulon tartja a canonical runtimeDelivery projectiont es a paneActivity diagnosticsot, es nem sugall current acceptance-t delayed/missing ack eseten | runtimeDelivery status/reason/observedAt, paneActivity read/sample state | session/pane diagnostics, message, observed handoff/round | public view semantics clarification | P1 | required-now |
| Restart/recovery delivery authority | restart utan retained runtime/session ujraindul, de a projection/currentness szetvalasztasa transitional | restart utan csak uj executionhez kotott explicit delivery/ack projection marad current; a regi projection historical vagy stale | `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` | recovery marker, diagnostics refs | non-breaking tightening | P1 | required-now |
| Duplicate delivery outcome | Phase C szerint a pontos shape meg bounded nyitott pont | a touched runtime pathokon ugyanarra a handoffra a masodik delivery explicit `rejected` vagy suppresszalt no-op lehet, de nem eredmenyezhet masodik successful current launchot | bubble/handoff/execution provenance, first-delivery decision | reject/no-op diagnostics | bounded policy concretization | P1 | required-now |

Normative rules:

1. A retained runtime adapter nem allithat elo canonical `accepted` vagy `running` allapotot pusztan attol, hogy a `tmux` send vagy session lookup sikeres volt.
2. A pane-visible activity, a pane-csend vagy a sampling output nem canonical authority-forras; legfeljebb observability input.
3. A status es a watchdog projection nem sugallhatja, hogy delayed/missing explicit ack mellett a bubble biztosan fut vagy biztosan atvette a munkat.
4. Restart utan a korabbi delivery projection current-semantikaja megszunik; csak uj execution authorityhoz kotott projection marad ervenyes.
5. Duplicate masodik delivery ugyanarra a handoffra csak bounded `rejected` vagy suppresszalt no-op alakban elfogadhato; uj typed actor output vagy uj lifecycle-state nem vezethetobe be.
6. A task nem nyithat uj actor-facing explicit authority override API-t a retained runtime adapter cleanup erdekeben.

### 2.5) Traceability Lock

| Source | This task must realize | Why this is binding here | Evidence |
|---|---|---|---|
| Phase D `S2_DELIVERY_ACK_BOUNDARY` | explicit delivery/ack boundary megerositese a retained `tmux` launch felett | ez a migration spine egyik konkret Phase E implementacios policy pontja | T1, T3, T5 |
| Phase D `Policy Ownership Matrix` duplicate delivery row | duplicate delivery suppression executor + kernel bounded policy maradjon | ez akadalyozza meg a masodik successful current launchot ugyanarra a handoffra | T2, T4 |
| Phase D `Retained Adapter Ownership and Cleanup` `tmux launch + pane delivery` row | a `tmux` retained transport/observability reteg maradjon, ne acceptance-forras | ez a cleanup trigger kozvetlen targya | T1, T5, T8 |
| Phase D `Retained Adapter Ownership and Cleanup` `watchdog / liveness monitor` row | a watchdog runtime-liveness reteg maradjon, ne authority-forras | a timeout/projection semantics tisztazasa csak igy bounded | T3, T5, T6 |
| Phase C `SC8_DUPLICATE_DELIVERY` | a duplicate delivery suppresszio pontos shape-je bounded modon konkretizalodjon a touched runtime pathokon | a matrix itt explicit gapet jelol | T2, T4 |
| Phase C `SC10_RESTART_RECOVERY` | restart utan uj execution authority kelljen | ez a retained restart/runtime adapter egyik kotelezo parity-invariansa | T6, T7 |
| Phase C `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` | a pane observability-only semantics explicit maradjon missing/delayed ack mellett is | ez a task magja | T3, T5, T8 |
| Phase A `ACT-RUNTIME-DELIVERY-TARGET`, `ACT-LIFECYCLE-WATCHDOG` | a current retained runtime adapterek cleanupja bounded maradjon | a grounding inventory mutatja, hogy ezek retained adapterek, nem core actor capabilityk | T1, T5 |

Normative rules:

1. Ha tobb implementacios ut vedheto, azt a valtozatot kell valasztani, amelyik explicittebbé teszi a typed ack es az observability-only signal kulonvalasztasat uj abstraction layer nelkul.
2. A duplicate delivery traceability minimuma explicitten mutassa meg, hogy az elso deliveryn kivul nincs masodik successful current execution.
3. A watchdog/status traceability minimuma explicitten mutassa meg, hogy a projection currentness nem pane-derived authority.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime delivery adapter | bounded delivery outcome/projection pontositasa, target resolution es duplicate suppression explicitte tétele | `tmux` send-success vagy session-jelenlet canonical acceptance-kent kezelese | retained adapter hardening | P1 | required-now |
| Watchdog/liveness | reference/deadline projection, escalation diagnostics es stale/current split pontositasa | pane-derived authority inference | runtime-liveness marad, nem actor authority | P1 | required-now |
| Status projection | runtimeDelivery/paneActivity/watchdog szetvalasztott megjelenitese | implicit current acceptance vagy guaranteed-running olvasat delayed/missing ack mellett | public projection tightening | P1 | required-now |
| Restart/recovery | uj execution authorityhoz kotott delivery projection tisztazasa | regi delivery projection currentkent tartasa restart utan | fail-closed default | P1 | required-now |
| Docs | runtime/operator delivery semantics pontositasa, ha kell | teljes runtime topology redesign dokumentalasa | csak touched semantics delta | P2 | conditional-now |

Pure-by-default rule:

1. Ha egy helper csak azert maradna a canonical szemantikaban, hogy pane-derived acceptance-t sejtessen, a default az egyszerusites vagy projection-only leszukites.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `tmux` delivery signal sikeres, de explicit runtime ack/current execution confirmation nincs | runtime delivery adapter + execution context | projection-only result | delivery lehet "attempted"/partial diagnostics, de nem canonical acceptance | existing delivery-unconfirmed family vagy equivalent bounded code | warn | P1 | required-now |
| duplicate masodik delivery ugyanarra a handoffra/executionre jon | delivery provenance + runtime state | bounded reject vagy suppresszalt no-op | nincs masodik successful current launch | existing duplicate-delivery family vagy equivalent bounded code | warn | P1 | required-now |
| watchdog pane activity hianyzik vagy unreadable | pane sampler + watchdog | diagnostics projection | a watchdog liveness marad ervenyes explicit reference/deadline alapon, de nincs authority inference | existing pane-sampler/watchdog diagnostics family | info/warn | P1 | required-now |
| status view delayed/missing runtime ack mellett current futast sugallna | status projection builder | fail-closed projection | runtimeDelivery/paneActivity explicit uncertainty vagy diagnostics allapotban marad | implementation-equivalent projection-stale/unknown family | warn | P1 | required-now |
| restart utan regi delivery projection mar currentkent olvashato | restart/recovery + execution context | stale mark / reject | csak uj executionhoz kotott projection marad current | existing stale authority/restart recovery family | error | P1 | required-now |
| dependency failure a pane samplerben vagy registry olvasasban | tmux/session registry | fallback | diagnostics-only surface degradalodhat, de canonical authority nem serulhet | existing registry/pane read failure family | warn | P2 | required-now |

Normative rules:

1. A fallback csak diagnostics/projection szintu lehet; canonical acceptance, running vagy authority nem szarmazhat fallback utvonalbol.
2. A duplicate-delivery fallback nem vezethet be uj typed runtime outcome csaladot; explicit `rejected` vagy suppresszalt no-op elegendo.
3. A degraded watchdog/status surface elfogadhato, ha fail-closed marad es nem allit tobbet a canonical allapotrol, mint amit explicit boundary bizonyit.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` retained adapter ownershipa es `S2` delivery/ack boundaryja | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` typed ack vocabularyja (`accepted`, `rejected`, `running`, `failed_to_start`) | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` runtime parity inputjai (`SC8`, `SC10`, `SC11`) | P1 | required-now |
| must-use | meglovo execution-context authority es restart recovery fail-closed modell | P1 | required-now |
| must-not-use | pane-visible activitybol vagy send-successbol levezetett canonical acceptance/running inference | P1 | required-now |
| must-not-use | uj actor primitive vagy uj lifecycle-state a runtime adapter cleanup miatt | P1 | required-now |
| must-not-use | teljes `tmux` topology removal ebben a sliceban | P1 | required-now |
| must-not-use | actor-facing explicit authority override API ujranyitasa | P1 | required-now |
| must-not-use | watchdog/status UI szepites, amely nincs kozvetlen contract-hatara a typed ack splithez | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | retained delivery adapter nem allit canonical acceptance-t puszta send-success alapjan | explicit execution context adott, `tmux` send sikeres, de nincs explicit runtime ack/current execution confirm | delivery path lefut | a kimenet projection-only marad; nincs implicit `accepted`/`running` authority | P1 | required-now | automated test |
| T2 | duplicate masodik delivery suppresszalodik | ugyanarra a `bubble_id` + `handoff_id` + executionre ket delivery erkezik | a masodik delivery feldolgozodik | explicit `rejected` vagy suppresszalt no-op jon; nincs masodik successful current launch | P1 | required-now | automated test |
| T3 | delayed/missing ack mellett a status es watchdog nem sugall current acceptance-t | pane activity lehet van vagy nincs, de explicit runtime ack hianyzik vagy kesik | status/watchdog projection lefut | a kimenet diagnostics/projection marad; pane activity nem canonical authority | P1 | required-now | automated test |
| T4 | duplicate delivery nem valtoztat current execution authorityt | elso delivery mar current executionhoz kotott | masodik duplicate delivery fut | a current execution identity nem cserelodik, nem jon letre uj current futas | P1 | required-now | automated test |
| T5 | watchdog pane sampler unreadable/missing session esetben is observability-only marad | sampler `no_session` vagy `pane_unreadable` eredmenyt ad | watchdog command/status view fut | escalation/lathatosag lehet degraded, de nincs delivery acceptance inference | P1 | required-now | automated test |
| T6 | restart recovery utan csak uj delivery authority marad current | runtime/session restart tortent | restart flow lefut, majd status/watchdog projection fut | a regi delivery projection stale vagy historical; az uj executionhez kotott delivery current | P1 | required-now | automated test |
| T7 | regi authorityhoz kotott delivery projection restart utan nem reuse-olodik | restart utan a korabbi handoff/execution projection jelen van | runtime vagy status path ezt olvassa | a regi projection nem lesz ujra currentkent elfogadva | P1 | required-now | automated test |
| T8 | watchdog/status contract parity megmarad a v11 surface-en | runtime adapter cleanup megtortent | watchdog facade/contract es status-related tests futnak | a public contract kovetkezetes marad a typed ack vs observability split mellett | P1 | required-now | automated test |
| T9 | docs csak akkor valtoznak, ha user-visible delivery semantics pontosodik | a runtime/operator delivery semantics tenylegesen lathatoan modosul | docs diff keszul | a dokumentacio csak a typed ack vs observability splitet es a retained adapter szerepet irja le, topology-redesign nelkul | P2 | conditional-now | doc diff |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a runtime delivery projectionhez kulon typed view-model indokolt, azt kulon follow-upban erdemes bevezetni, nem ebben a cleanup-szeletben.
2. [later-hardening] A retained `tmux` delivery es a status/watchdog projection kesobbi teljes egyszerusitese kulon Phase E vagy utani taskba keruljon, miutan a typed ack boundary tobb actoron stabil.
3. [later-hardening] Ha a watchdog/status contractbol kulon operator-facing "uncertain/degraded" vocabulary adodik, azt kulon bounded taskban erdemes formalizalni.

## Assumptions

1. A kovetkezo tartalmi lepes retained adapter cleanup, nem uj actor-cutover slice.
2. A `tmuxDelivery`, a watchdog es a status runtimeDelivery/paneActivity projection jelenleg eleg kozel vannak ugyanahhoz a boundaryhoz, hogy egy taskban kezelhetok legyenek.
3. A Phase B typed ack vocabulary es a Phase C `SC8`/`SC10`/`SC11` mar eleg normativ alapot adnak a taskhoz uj plan vagy PRD nelkul.

## Open Questions

1. Nem blocker: a duplicate delivery konkret alaja minden touched pathon explicit `rejected` vagy suppresszalt no-op legyen-e; mindketto elfogadhato, ha a contract ugyanaz marad.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Kulon typed runtime-delivery projection model formalizalasa | L2 | P2 | later-hardening | task draft | Nyiss kulon follow-up taskot, ha a cleanup utan is tobb helyen marad string-heavy projection logika |
| HB2 | Watchdog/status operator-facing degraded vocabulary szukebb formalizalasa | L2 | P3 | later-hardening | task draft | Csak akkor nyisd meg, ha a mostani cleanup utan is marad review-instabil projection-szoveg |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
