---
artifact_type: task
artifact_id: task_protocol_first_running_execution_context_unification_phase3_v1
title: "Protocol-First Running Execution Context Unification (Phase 3)"
status: draft
phase: phase3
target_files:
  - src/types/bubble.ts
  - src/core/state/initialState.ts
  - src/core/state/stateSchema.ts
  - src/core/state/stateStore.ts
  - src/core/state/machine.ts
  - src/core/state/transitions.ts
  - src/core/runtime/watchdog.ts
  - src/core/bubble/metaReviewExecutionContext.ts
  - src/core/bubble/metaReview.ts
  - src/v11/shared/start/startCommandFlows.ts
  - src/v11/shared/start/startCommandApi.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistenceHelpers.ts
  - src/v11/shared/watchdog/watchdogMetaReviewRouting.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/core/bubble/listBubbles.ts
  - src/core/ui/presenters/bubblePresenter.ts
  - src/types/ui.ts
  - ui/src/lib/types.ts
  - ui/src/lib/actionAvailability.ts
  - ui/src/lib/attachAvailability.ts
  - ui/src/state/useBubbleStore.ts
  - ui/src/components/actions/ActionBar.tsx
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - docs/pairflow-initial-design.md
  - tests/core/state/stateSchema.test.ts
  - tests/core/state/stateStore.test.ts
  - tests/core/state/machine.test.ts
  - tests/core/state/transitions.test.ts
  - tests/core/runtime/watchdog.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewExecutionContext.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/cli/bubbleStatusCommand.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - ui/src/lib/actionAvailability.test.ts
  - ui/src/lib/attachAvailability.test.ts
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
  - ui/src/components/actions/ActionBar.test.tsx
prd_ref: null
plan_ref: plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Protocol-First Running Execution Context Unification (Phase 3)

## L0 - Policy

### Goal

Altalanositani a Phase 1-2-ben meta-review scope-ra bevezetett execution-context authority modellt a teljes bubble loopra ugy, hogy a `RUNNING` allapot minden actor esetben ugyanazon canonical authority shape-et hasznalja.
Phase 3 sikeres, ha az implementer, reviewer es meta-reviewer futasok kozos persisted running execution contexttel mukodnek, a timeout/restart/recovery szemantika minden actorra ugyanarra az authority modellre epul, es a legacy `META_REVIEW_*` allapotok mar csak compatibility adapterkent elnek tovabb.

### Context

Megmaradt strukturális szetcsuszas:

1. a bubble loop ma ket kulon authority modellel el:
   - altalanos `RUNNING` implementer/reviewer ownership mezokkel,
   - kulon meta-review authority a `meta_review.execution_context` blokkban,
2. emiatt a timeout, restart/recovery es status/UI reasoning ma szereplo-specifikus agakat tart fenn,
3. a meta-review Phase 1-2 mar bizonyitotta, hogy a durable execution context a helyes authority forras,
4. de ugyanez az authority shape meg nincs kiterjesztve az implementer/reviewer utakra,
5. ez a Phase 4 CLI/protocol unification es a Phase 5 legacy cleanup elott felesleges special-case feluleteket hagy a state machine-ben.

Phase 3 nem a CLI entrypointok vagy actor-command semantics unificationja.
Ez a kor kizarolag a domain state shape es runtime authority modell kozositeset vegzi el, compatibility adapterrel a legacy `META_REVIEW_*` allapotokhoz.

### In Scope

1. Canonical generic running execution context persisted shape bevezetese a teljes bubble loopra.
2. Implementer, reviewer es meta-reviewer aktiv futasok atkotese ugyanarra a running authority modellre.
3. Timeout authority kozositese minden actorra ugy, hogy a canonical `deadline_at` legyen az egyetlen domain timeout forras.
4. Restart/reattach/recovery szemantika kozositese ugy, hogy runtime activity sehol ne mutalhassa az authority contextet.
5. Compatibility adapter bevezetese a legacy `META_REVIEW_RUNNING` / `META_REVIEW_FAILED` modellek es az uj generic running context kozott.
6. Status/list/UI projection atallitasa a generic running context szemantikara, mikozben a legacy allapotok operatori kompatibilitasa megmarad.
7. Schema-, contract- es compatibility coverage frissitese a teljes loopra.
8. Docs/spec szinkron a `docs/pairflow-initial-design.md`-ben a generic running authority modellrol.

### Out of Scope

1. Actor-facing CLI entrypointok unificationja vagy retirementje.
2. `pairflow pass`, `pairflow converged`, `pairflow ask-human`, `pairflow bubble meta-review submit` command family redesignja.
3. `META_REVIEW_*` legacy state-ek teljes eltavolitasa.
4. Approval compatibility branch-ek teljes cleanupja.
5. Human-facing bubble lifecycle surface atnevezese vagy command-level UX redesign.
6. Phase 5 vegallapotu codebase lean-down.

### Safety Defaults

1. A canonical authority a generic running execution context legyen; `active_since`, `last_command_at`, tmux liveness, pane delivery vagy snapshot metadata sehol nem lehet alternativ authority forras.
2. Phase 3-ban a legacy `META_REVIEW_*` allapotok megmaradhatnak compatibility labelkent, de nem tarthatnak fenn kulon authority modellt.
3. Ha egy flow nem tud generic running contextet letrehozni vagy ervenyesiteni, fail-closed validacios vagy transition hibaval alljon meg.
4. Restart/rebind/reattach semelyik actor eseten nem nyithat uj authority contextet es nem tolhatja ki a meglevo `deadline_at`-ot.
5. A compatibility adapter csak durable authoritybol dolgozhat; a schema/load normalization boundary inputja kizarolag a persisted snapshot authority lehet, transcript authority pedig legfeljebb compatibility projection/recovery inputkent hasznalhato. Runtime-derived fallback nem engedett.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - bubble state schema es persisted lifecycle contract,
   - state transition contract,
   - running watchdog authority contract minden actorra,
   - restart/reattach authority-preservation contract,
   - meta-review compatibility adapter contract,
   - status/list/UI state projection contract.

### Normative Reference Policy

1. `plan_ref`: `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - Ez a canonical forras a generic `RUNNING` authority modellhez es a Phase 3 exit criteriahoz.
2. `system_context_ref`: `docs/pairflow-initial-design.md`
   - A bubble lifecycle compatibility modell tovabbra is innen jon, amig Phase 3 explicitten felul nem ir egy state-shape vagy authority szabaly.
3. Precedence rule:
   - ha a jelenlegi implementation kulon meta-review execution modellel dolgozik,
   - ebben a korben a plan generic running-context celallapota az elsodleges, a legacy `META_REVIEW_*` shape csak compatibility boundary lehet.

### Terminology Lock

1. `generic running execution context` = persisted authority blokk, amely minden aktiv actor-futast ugyanazzal a canonical shape-pel ir le.
2. `running authority` = az `execution_context` canonical mezokeszlete: `execution_context.active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt`, ugyanahhoz az aktiv handoffhoz kotve.
3. `legacy meta-review compatibility state` = olyan lifecycle label vagy adapter-shape, amely operatori vagy atmeneti kompatibilitasi szerepet tart meg, de nem kulon authority forras.
4. `context-preserving restart` = olyan runtime/session ujraattacholas, amely nem modositja a canonical running authorityt.
5. `role-neutral timeout semantics` = timeout minden actor eseten ugyanazon `deadline_at` + hianyzo durable result szabalybol kovetkezik.
6. `normalization boundary` = az egyetlen persisted-snapshot schema/load validation/defaulting boundary, ahol legacy durable authority input canonical top-level `execution_context` shape-re normalizalhato; ezen tul mar nincs reader-specifikus authority-source valasztas.
7. `derived active_role selector` = a top-level `active_role` csak az `execution_context.active_role` deterministic mirror/projection mezője lehet; onallo authorityt nem hordozhat.

### Phase 3 Shape Decision

1. Phase 3 canonical persisted target shape-je top-level `execution_context` authority blokk legyen a bubble state-ben.
2. A top-level `active_role` Phase 3-ban megmaradhat explicit lifecycle/UI selectornek, de csak az `execution_context.active_role` derived mirrorjekent; a timeout/restart/recovery authorityt a generic `execution_context` vezeti.
3. `meta_review.execution_context` Phase 3-ban compatibility adapter/home lehet, de nem maradhat kulon primary authority source.
4. A legacy `META_REVIEW_RUNNING` lifecycle label megmaradhat transitional compatibility allapotkent, de ugyanazt a top-level `execution_context` authorityt kell hordozza, mint a generic `RUNNING(active_role=meta_reviewer)` modell.
5. Phase 3-ban a generic running context legalabb a kovetkezo mezoket canonicalizalja: `active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt`.
6. Legacy persisted snapshot Phase 3-ba csak determinisztikus, persisted-snapshot authority alapú normalizációs boundaryn lephet be: ezt a boundaryt kizarolag a schema/load validation/defaulting reteg birtokolja. Ha normalizáció tortenik, annak eredmenye a top-level `execution_context`, es ugyanabban a request/load ciklusban mar ez az egyetlen olvashato authority; ha ehhez nincs eleg persisted authority input, a snapshot fail-closed invalid state. Transcript authority ebben a boundaryban nem valhat alternativ authority-source-sza.
7. State transition path uj vagy frissitett aktiv futast mar csak canonical top-level `execution_context` shape-ben emitálhat; transition nem vegezhet masodlagos legacy-normalizaciot.
8. Az implementer, reviewer es meta-review activation/read path ugyanazt a canonical running-context nyitó/olvasó szemantikát kovesse; actor-specifikus wrapper lehet, de kulon authority-szabaly nem.

## L1 - Change Contract

### 1) Call-site Matrix

| ID  | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | ---- | -------------- | -------------------------------- | --------------- | ----------------- | -------- | ------ | -------- |
| CS1 | `src/types/bubble.ts` + `src/core/state/initialState.ts` + `src/core/state/stateSchema.ts` + `src/core/state/stateStore.ts` | generic running persisted shape | `BubbleStateSnapshot`, state validation/defaulting, snapshot load/inspect -> type definitions / validation / read boundary | top-level state schema + persisted snapshot load boundary | Bevezeti a generic top-level `execution_context` authority blokkot, es kizárólag a schema/load validation/defaulting boundary birtokolhatja a legacy snapshotok normalizációját; mixed-authority snapshotnal csak determinisztikus canonicalizációt vagy fail-closed rejectet enged | P1 | required-now | Phase 3 target architecture explicit generic running contextet kovetel |
| CS2 | `src/core/state/machine.ts` + `src/core/state/transitions.ts` | lifecycle/state transitions | `applyStateTransition(...) -> BubbleStateSnapshot`, transition adjacency tables | running es human/meta-review branch-ek | A state machine a generic running authority modellre epuljon, a legacy `META_REVIEW_*` utak csak compatibility route-kent maradjanak meg, es transition mar csak canonical top-level `execution_context` shape-et irhasson ki; secondary legacy-normalizáció nem engedett | P1 | required-now | jelenleg kulon meta-review lifecycle shape el |
| CS3 | `src/v11/shared/start/startCommandFlows.ts` + `src/v11/shared/start/startCommandApi.ts` | start/resume/reattach | `runResumeStartFlow(...)`, `startBubble(...) -> Promise<StartBubbleResult>` | implementer/reviewer runtime attach path + shared running-context primitive ownership | A start/resume/reattach reteg birtokolja az implementer es reviewer aktiv futas canonical top-level `execution_context` nyitasat/reattachjat, es itt kell kialakulnia annak a kozos, ujrafelhasznalhato running-context primitive keszletnek is, amelyet mas actor activation/read pathok fogyaszthatnak. Restart/restart-resume ne nyithasson uj authority contextet, ne hozzon letre reader-specifikus authority-source valasztast, es a top-level `active_role`-t csak derived mirror-kent irhassa ki | P1 | required-now | Phase 3 a teljes loopra kiterjeszti az authority modellt |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts` + `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` + `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` + `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts` | meta-review activation compatibility | meta-review gate activation/recovery/human-gate persistence entrypontok -> Promise results | meta-review compatibility boundary | A meta-review activation/recovery/human-gate persistence nem definiálhat kulon authority policyt: ugyanazokat a CS3-ban mar kijelolt kozos running-context primitiveket kell fogyasztania, es legfeljebb a legacy lifecycle label, human-approval summary, vagy nested mező compatibility mirrorozasat/adaptalasat retegezheti rajuk. A human-gate persistence writer nem hozhat letre kulon authority home-ot, nem irhat felul canonical top-level `execution_context` mezot, es authority-source valasztasi szabaly vagy fallback itt nem jelenhet meg | P1 | required-now | Phase 3-ban a meta-review nem maradhat kulon authority modell |
| CS5 | `src/core/runtime/watchdog.ts` + `src/v11/shared/watchdog/watchdogMetaReviewRouting.ts` | timeout authority | `computeWatchdogStatus(...) -> WatchdogStatus`, `maybeRouteMetaReviewBeforeExpiry(...)`, `maybeRouteMetaReviewOnExpiry(...)` | watchdog reference es expiry routing | Minden actor timeout authorityja ugyanabból a generic execution contextbol jojjon; meta-review compatibility route se olvasson kulon authorityt | P1 | required-now | Phase 3 exit criteria: kozos timeout semantics |
| CS6 | `src/core/bubble/metaReviewExecutionContext.ts` + `src/core/bubble/metaReview.ts` + `tests/core/bubble/metaReviewExecutionContext.test.ts` + `tests/cli/bubbleMetaReviewCommand.test.ts` + `tests/contracts/v11/metaReviewSubmitCoverage.test.ts` | compatibility adapter + submit authority | context validation/resolution helpers + `submitMetaReviewResult(...) -> Promise<MetaReviewSubmitResult>` | meta-review authority reader path + contract surface | A meta-review-specific helper adapterre szukuljon: a primary authority a generic top-level context legyen, a submit pedig ezt hasznalja, es a legacy nested authority-primary elvarasokat a contract/CLI tesztek Phase 3 szerint felul kell irjak | P1 | required-now | Phase 4 elott a meta-review submit megmarad, de mar generic authorityra kell epuljon |
| CS7 | `src/v11/shared/status/statusCommandViewBuilder.ts` + `src/core/bubble/listBubbles.ts` + `src/core/ui/presenters/bubblePresenter.ts` + `src/types/ui.ts` + `ui/src/lib/types.ts` + `ui/src/lib/actionAvailability.ts` + `ui/src/lib/attachAvailability.ts` + `ui/src/state/useBubbleStore.ts` + `ui/src/components/canvas/BubbleExpandedCard.tsx` | operator/UI projection | status/list/UI projection builders -> views/models | lifecycle/status surface + direct UI availability/render branches | A status/list/UI a generic running authorityt, az `active_role`-t es az esetleges compatibility labelt kulon mutassa; a meta-review ne tunjon kulon execution modellnek, a direct UI lifecycle-branch-ek is ezt a szemantikát kovessek, es mixed-authority allapotot ne fedjen el | P2 | required-now | operatori szemantika kulcsfontossagu a migrationhoz |
| CS8 | `docs/pairflow-initial-design.md` | lifecycle/spec sync | markdown | state machine + running semantics | A docs rogzitsek, hogy a bubble canonical active authorityja generic running context, es a legacy `META_REVIEW_*` allapotok transitional compatibility retegkent maradnak | P2 | required-now | docs drift Phase 3-ban magas kockazat |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
| -------- | ------- | ------ | --------------- | --------------- | ------------- | -------- | ------ |
| Running authority state | implementer/reviewer: implicit `RUNNING` ownership; meta-review: `meta_review.execution_context` | top-level generic `execution_context` authority minden actorra | `active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` | actor-specific diagnostics vagy runtime observability | additive migration with compatibility adapter | P1 | required-now |
| Top-level `active_role` selector | top-level role mezo implicit authority-sullyal | az `execution_context.active_role` derived mirror/projectionje; onallo authority nem lehet | `active_role` csak canonical contexthez kotve | lifecycle/UI ergonomia | behavior tightening | P1 | required-now |
| Meta-review authority home | `meta_review.execution_context` primary authority | top-level `execution_context` primary authority; `meta_review.execution_context` compatibility mirror/adapter only | same canonical fields as generic context | legacy snapshot metadata a `meta_review` alatt | behavior tightening | P1 | required-now |
| Normalization boundary | readerenkent vagy call-site-onkent implicit authority-source drift lehet | egyetlen determinisztikus schema/load validation/defaulting boundary normalizalhat legacy snapshotot canonical top-level contextre | durable persisted-snapshot authority input + canonical top-level fields | migration diagnostics | transitional compatibility only | P1 | required-now |
| Generic RUNNING timeout input | mixed role-specific semantics | role-neutral `execution_context.deadline_at` | `active_role`, `awaited_output_type`, `started_at`, `deadline_at`, `handoff_id`, `round`, `attempt` | runtime observability | behavior change | P1 | required-now |
| Restart/reattach authority preservation | role-specific branches, especially meta-review | same generic context-preservation invariant minden actorra | current `execution_context` | activity timestamps / runtime diagnostics | behavior clarification | P1 | required-now |
| Legacy lifecycle compatibility | `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_APPROVAL` mixed canonical+compat paths | explicit compatibility adapter/label separation | canonical top-level running authority | legacy labels, legacy summaries, operator routing metadata | transitional compatibility only | P1 | required-now |
| Status/UI surface | lifecycle label-heavy, actor-specific interpretation | generic running authority + compatibility label projection | current state label, active role, authority deadline/context | runtime diagnostics, compatibility label | additive presentation change | P2 | required-now |

Normative rules:

1. Phase 3 primary authorityja a top-level generic `execution_context`; nested legacy authority blokk nem maradhat vele parhuzamos primary source.
2. A generic `execution_context` minden aktiv actor esetben ugyanazt a canonical mezokeszletet hordozza.
3. Az authority-role canonical forrasa az `execution_context.active_role`; a top-level `active_role` csak derived selector lehet, es nem lehet implicit vagy runtime-derived.
4. Restart/rebind/resume minden actor eseten csak observability/activity surface-et frissithet; authority contextet nem.
5. A watchdognak nincs role-specifikus authority fallbackje; minden actor timeoutja a canonical `deadline_at`-ot koveti.
6. A legacy `META_REVIEW_*` allapotok Phase 3-ban legfeljebb compatibility route es UI label szerepet tölthetnek be.
7. Ha a compatibility adapter a legacy meta-review allapotot generic running authorityra vetiti, ezt durable authoritybol kell megtennie: schema/load normalizációhoz csak persisted snapshot authority hasznalhato, transcript authority legfeljebb compatibility projectiont vagy recovery route-ot tamogathat. Runtime liveness egyik esetben sem lehet authority input.
8. A generic running authority es a lifecycle label kozt barmilyen ellentmondas invalid state-nek minosul.
9. `READY_FOR_APPROVAL` es `READY_FOR_HUMAN_APPROVAL` compatibility branch-ek Phase 3-ban megmaradhatnak, de nem tarthatnak fenn kulon running authority modellt.
10. Normalizáció csak a schema/load validation/defaulting boundaryn engedett, ahol a boundary explicit ellenorzi, hogy van-e eleg persisted-snapshot authority input a canonical top-level `execution_context` eloallitasahoz; ha nincs, invalid-state hibaval megall. Transcript authority itt nem fallback. Transition path uj snapshotot mar csak canonical shape-ben irhat ki, de legacy persisted snapshotot nem normalizalhat masodlagosan.
11. E boundary utan minden olvaso mar kizárólag a top-level authorityt fogyaszthatja.
12. Az execution context nyitasa/olvasasa megosztott canonical primitiveken alapuljon; actor-specifikus helper csak input-adapter lehet, nem kulon authority policy.
13. Ha top-level `active_role` mező megmarad, annak minden aktiv contextben byte-for-byte egyeznie kell az `execution_context.active_role` ertekevel; barmilyen elteres invalid state.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
| ---- | ------- | --------- | ----- | -------- | ------ |
| Bubble state | top-level generic `execution_context` authority bevezetese | nested, role-specific authority modellek tovabbeleltetese primary source-kent | state contract valtozik, plan_ref kotelezo | P1 | required-now |
| State machine | generic running route semantics bevezetese | kulon meta-review-only authority transition fenntartasa | compatibility labels maradhatnak | P1 | required-now |
| Start/resume/restart | actor-neutral context-preservation invariants | restart altali implicit context-ujranyitas barmely actorra | Phase 3 kulcs semantikaja | P1 | required-now |
| Watchdog | kozos authority resolver minden actorra | actor-specifikus timeout authority fallback | implementer/reviewer/meta-review parity kell | P1 | required-now |
| Meta-review paths | compatibility adapter a generic contextre, beleertve a human-gate persistence writer utat is | `meta_review.execution_context` mint kulon primary authority | Phase 4 elofeltetel | P1 | required-now |
| Normalization boundary | determinisztikus, egyszeri legacy->canonical normalizáció durable inputbol | lazy, reader-specifikus authority-source valasztasi heurisztika vagy ket authority-source parhuzamos eletben tartasa | normalization boundary explicit legyen | P1 | required-now |
| Status/UI | authority vs compatibility label kulon megjelenitese | UI/state surface, amely a meta-reviewt kulon execution modellkent tartja fenn | operatori migrateability fontos | P2 | required-now |
| Docs/spec | generic running authority dokumentalasa | docs drift a Phase 1-2 meta-review-only authority modellnel | docs required | P2 | required-now |

Constraint: ha az implementation csak helper-szinten "kozosit" context-resolvert, de a persisted state shape es lifecycle authority kulon marad implementer/reviewer vs meta-review kozott, az nem eleg; Phase 3 domain-shape unificationt kovetel.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
| ------- | ------------------- | -------- | --------------------- | ----------- | --------- | -------- | ------ |
| aktiv actor-futas generic execution context nelkul | state schema / transition | throw | invalid-state reject; no implicit role-specific fallback | `RUNNING_EXECUTION_CONTEXT_INVALID` vagy normalized validation error | error | P1 | required-now |
| top-level `active_role` nem egyezik az `execution_context.active_role` ertekevel | state schema / transition / projection | throw | explicit invalid-state hiba; a mirror mező nem javithatja felul az authorityt | `RUNNING_ACTIVE_ROLE_MISMATCH` | error | P1 | required-now |
| legacy `META_REVIEW_RUNNING` allapot top-level generic context nelkul marad | compatibility adapter | normalize or throw | deterministic adapter from persisted snapshot authority, kulonben invalid-state error; transcript authority itt legfeljebb recovery/projection tamogatas lehet | `RUNNING_EXECUTION_CONTEXT_INVALID` vagy normalized compatibility error | warn/error | P1 | required-now |
| human-gate persistence compatibility labelt vagy summary-t irna ki canonical top-level authority nelkul vagy azzal ellentmondva | meta-review gate persistence | throw | explicit invalid-state/persistence hiba; compatibility output nem mentheto kulon authority home-kent | `RUNNING_EXECUTION_CONTEXT_MISMATCH` vagy normalized persistence error | error | P1 | required-now |
| ugyanaz a snapshot kulonbozo reader pathokon mas authority forrast valasztana | schema/load/runtime projection | throw | explicit mismatch hiba; nincs reader-level authority-source fallback | `RUNNING_EXECUTION_CONTEXT_MISMATCH` | error | P1 | required-now |
| restart/reattach uj contextet probal nyitni meglévo aktiv authority mellett | runtime/start orchestration | throw | keep existing persisted authority; no synthetic replacement | `RUNNING_EXECUTION_CONTEXT_MISMATCH` vagy normalized restart error | error | P1 | required-now |
| watchdog actor-specifikus fallback authorityra esne vissza | watchdog resolver | throw | explicit invalid-state path; no `last_command_at` or role-specific fallback | `RUNNING_EXECUTION_CONTEXT_INVALID` | error | P1 | required-now |
| status/list/UI egyszerre ket authority source-ot lat | projection layer | reject or degrade to validation warning | render validation/state mismatch, ne hallgasson el semmit | normalized status validation reason | warn/error | P2 | required-now |
| meta-review submit legacy helperbol meg a nested authorityt probalja primarykent olvasni | submit path | explicit reject | typed submit error; nested legacy authority nem lehet primary source | `META_REVIEW_STATE_INVALID` vagy normalized submit error | error | P1 | required-now |
| docs/spec update elmarad state-shape valtozas mellett | docs sync | fallback | task nem tekintheto kesznek docs update nelkul | N/A | warn | P2 | required-now |

Path-specific failure semantics:

1. `throw` itt typed schema / state-transition / orchestration hibat jelent, nem silent compatibility fallbacket.
2. `normalize or throw` csak normalization boundaryn engedett, es csak persisted snapshot authority inputokbol.
3. `explicit reject` submit surface-en typed actor error; nem eredmenyezhet route mutationt.
4. Readerenkenti authority-source kulonbseg onmagaban contract-serto allapotnak szamit, meg akkor is, ha valamelyik reader "helyes" authorityt latna.
5. A derived mirror-mezo (`active_role`) csak redundans projection lehet; ha authorityval ellentmond, az authority nyer helyette, de a snapshotot hibanak kell tekinteni, nem csendben javitani.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
| ---- | ----- | -------- | ------ |
| must-use | `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` Phase 3 target architecture es exit criteria | P1 | required-now |
| must-use | Phase 1-2 execution-context authority invariansai | P1 | required-now |
| must-use | top-level persisted running authority shape mint canonical domain source | P1 | required-now |
| must-use | explicit compatibility adapter a legacy `META_REVIEW_*` labelshez | P1 | required-now |
| must-use | kozos timeout/restart/recovery reasoning minden actorra | P1 | required-now |
| must-not-use | role-specific authority fallback implementer/reviewer/meta-reviewer szerint | P1 | required-now |
| must-not-use | `meta_review.execution_context` vagy mas nested blokk mint parhuzamos primary authority | P1 | required-now |
| must-not-use | runtime activity, pane liveness vagy session rebind authoritykent | P1 | required-now |
| must-not-use | Phase 4 actor-command unification scope | P2 | required-now |
| must-not-use | Phase 5 legacy cleanup scope | P2 | required-now |

### 6) Test Matrix

| ID  | Scenario | Given | When | Then | Priority | Timing | Evidence |
| --- | -------- | ----- | ---- | ---- | -------- | ------ | -------- |
| T1  | implementer running context is canonicalized | implementer aktiv RUNNING handoff indul | state persisted/loaded | top-level `execution_context` tartalmazza a canonical authority mezoket es `active_role=implementer` | P1 | required-now | automated test |
| T2  | reviewer running context uses the same authority shape | reviewer aktiv handoff indul | state persisted/loaded | ugyanaz a generic `execution_context` shape ervenyes, mint implementernel | P1 | required-now | automated test |
| T3  | meta-review compatibility state maps to generic running authority | legacy `META_REVIEW_RUNNING` state nyilik | activation/recovery/load path fut | top-level generic `execution_context` lesz a primary authority, a legacy meta-review path csak compatibility marad | P1 | required-now | automated test |
| T4  | restart does not mutate generic running authority for implementer/reviewer | aktiv implementer vagy reviewer context letezik | restart/resume/reattach fut | `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt`, `active_role` valtozatlan maradnak | P1 | required-now | automated test |
| T5  | restart does not mutate generic running authority for meta-review | aktiv meta-review compatibility context letezik | restart/resume/reattach fut | ugyanaz a generic authority invarians ervenyesul, mint a tobbi actorra | P1 | required-now | automated test |
| T6  | watchdog timeout is role-neutral before deadline | implementer/reviewer/meta-review actorhoz aktiv generic context tartozik | watchdog deadline elott fut | `not_expired` eredmeny minden actorra ugyanabból a canonical `deadline_at`-bol jon | P1 | required-now | automated test |
| T7  | watchdog timeout is role-neutral after deadline | implementer/reviewer/meta-review actorhoz aktiv generic context tartozik, durable result hianyzik | watchdog deadline utan fut | timeout/escalation ugyanazon generic authority modellbol kovetkezik, role-specific fallback nelkul | P1 | required-now | automated test |
| T8  | legacy meta-review labels remain compatibility-only | bubble meta-review flow a human gate vagy fail compatibility statebe lep | human-gate persistence + state/status projection fut | a persisted human-gate vagy fail-compatibility snapshot megorzi a compatibility labelt/summary-t, de nem tart fenn kulon nested primary authorityt es nem irja felul a canonical top-level `execution_context`-et | P1 | required-now | automated test |
| T9  | status/list/UI show generic running authority semantics | bubble aktiv actor-futassal jelenik meg | status/list/UI view epul | a view a generic running authorityt mutatja, es a meta-reviewt nem kulon execution modellkent kezeli; a direct UI availability/card branch-ek is ezzel maradnak osszhangban | P2 | required-now | automated test |
| T10 | invalid mixed-authority state is rejected | top-level generic context, top-level `active_role` mirror vagy legacy nested authority ellentmond egymasnak | schema/load/runtime path fut | deterministic invalid-state hiba keletkezik; nincs silent precedence drift es nincs mirror-alapu authority-feluliras | P1 | required-now | automated test |
| T11 | meta-review submit reads generic authority | aktiv meta-review compatibility route fut | submit erkezik | a submit a top-level generic running authorityt olvassa, nem a nested legacy authorityt primarykent | P1 | required-now | automated test |
| T12 | legacy snapshot normalization is deterministic | legacy persisted snapshot top-level `execution_context` nelkul, de persisted nested authority inputtal toltodik | schema/load validation/defaulting normalizáció lefut | a boundary egyszer canonical top-level contextre normalizal, es a tovabbi olvasok mar nem valaszthatnak mas authority source-ot; transcript authority nem fallback a load boundaryban | P1 | required-now | automated test |
| T13 | reader-specific authority drift is rejected | ugyanaz a snapshot status/watchdog/submit utvonalon kulonbozo authority source-ra mutatna | reader pathok futnak | deterministic mismatch hiba keletkezik; nincs per-reader authority-source fallback | P1 | required-now | automated test |
| T14 | missing persisted authority input fails closed at normalization boundary | legacy persisted snapshot top-level `execution_context` nelkul toltodik, de nincs eleg persisted authority input a canonical context eloallitasahoz | schema/load validation/defaulting fut | explicit invalid-state hiba keletkezik, nincs partial normalization, implicit fallback, transcript-alapu boundary fallback vagy reader-szintu authority-source valasztas | P1 | required-now | automated test |
| T15 | human-gate persistence does not reintroduce split authority | meta-review gate human approvalra vagy inconclusive human decisionre routol | human-gate persistence state write megtortenik | a persisted snapshot megtartja a canonical top-level authorityt, a compatibility summary/label csak projection, es nincs kulon persistence-only authority home | P1 | required-now | automated test |
| T16 | docs/spec parity | implementation updates merged | doc review | a docs kimondja, hogy a canonical active authority generic running context, a top-level `active_role` legfeljebb derived selector, a legacy `META_REVIEW_*` labels transitional compatibility retegkent maradnak, es a Terminology Lock normalization-boundary / compatibility-state fogalmait kovetkezetesen hasznalja | P2 | required-now | doc review |

Verification note:

1. `T1`-`T5` kulon fedje le az implementer/reviewer es meta-review pathokat; nem eleg csak meta-review parityt ellenorizni.
2. `T6`-`T7` actoronként ugyanarra a canonical mezokeszletre kell assertaljanak, nem csak a timeout vegeredmenyre.
3. `T8`-`T10` kulon bizonyitsak a compatibility label megtartasat es a mixed-authority state fail-closed kezeleset.
4. `T11` explicitten bizonyitsa, hogy a nested meta-review authority Phase 3-ban mar adapter, nem primary source.
5. `T12`-`T14` kulon fedje le a normalization-boundary normalizáció determinisztikusságát, a hianyzo persisted input fail-closed kezeleset, es azt, hogy nincs readerenkenti authority-source drift.
6. `T15` explicitten fedje le, hogy a human-gate persistence writer nem vezet vissza split authorityt a compatibility summary/label alatt.
7. `T16` ellenorizze, hogy a docs/spec nyelv a canonical authority mellett a derived `active_role` selector, a normalization boundary es a legacy compatibility-state fogalmait is kovetkezetesen hasznalja.
8. A normalization-boundary fedeseben a `stateStore` read/inspect ut is explicitten benne legyen; nem eleg csak schema-szintu unit coverage.
9. A UI coverage ne alljon meg a presenter/store szinten; kulon fedje le az action-availability, attach-availability es approval-package card legacy lifecycle-branch-eit is.

### Acceptance Criteria

1. AC1: Minden aktiv actor-futas top-level generic `execution_context` authority blokkot hasznal canonical source-kent, es barmely top-level `active_role` mező csak ennek derived mirrorje lehet.
2. AC2: Az implementer, reviewer es meta-review timeout/restart/recovery szemantikaja ugyanarra a running authority modellre epul.
3. AC3: A legacy `META_REVIEW_*` allapotok Phase 3-ban legfeljebb compatibility labelkent maradnak meg, kulon primary authority modell nelkul.
4. AC4: Status/list/UI projection a generic running authorityt tekinti canonicalnak, es a meta-reviewt nem kulon execution modellkent prezentalja.
5. AC5: A docs/spec egyertelmuen rogzitik a generic running authority modellt es a compatibility boundaryt.
6. AC6: A legacy->canonical normalizáció snapshotonként egyetlen logikai boundary marad: csak eleg durable inputbol tortenhet meg, kulonben fail-closed hibat ad, es ugyanaz a snapshot nem vezethet reader-specifikus authority-source drifthez.

### Acceptance Traceability

| AC  | Primary Call Sites | Mandatory Tests |
| --- | ------------------ | --------------- |
| AC1 | CS1, CS2, CS3, CS4 | T1, T2, T3, T10 |
| AC2 | CS3, CS4, CS5, CS6 | T4, T5, T6, T7, T11 |
| AC3 | CS2, CS4, CS6 | T3, T8, T10, T11 |
| AC4 | CS7 | T8, T9 |
| AC5 | CS8 | T16 |
| AC6 | CS1, CS2, CS3, CS4, CS6, CS7 | T12, T13, T14, T15 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Erdemes lehet a Phase 3-ban kulon generic `runningExecutionContext` helper modult bevezetni, de csak akkor, ha ettol a persisted authority shape tovabbra is explicit marad.
2. [later-hardening] A legacy `meta_review.execution_context` Phase 3 utan fokozatosan readonly adapter-mirrorszintre szorithato.
3. [later-hardening] A status/UI migration Phase 3-ban mar kezdje el a generic authority nyelvezetet hasznalni, hogy a Phase 5 cleanup kevesebb feluleten torjon.

## Assumptions

1. A Phase 3-hoz eleg a `Plan -> Task` lanc; kulon PRD nem kotelezo.
2. A top-level canonical authority blokk neve `execution_context` lesz.
3. A legacy `META_REVIEW_*` allapotok Phase 3-ban megmaradhatnak compatibility labelkent, de uj funkcionalis authority nem epulhet rajuk.

## Hardening Backlog (Optional)

| ID  | Item | Layer | Priority | Timing | Source | Proposed Action |
| --- | ---- | ----- | -------- | ------ | ------ | --------------- |
| H1  | Generic running-context helper extraction | L2 | P2 | later-hardening | implementation ergonomics | A Phase 3 stabilizalasa utan emeljunk ki kozos helper modult a running authority resolve/persist logicahoz |
| H2  | Compatibility label audit a teljes UI feluleten | L2 | P2 | later-hardening | migration surface | A Phase 3 merge utan kulon audit ellenorizze, hol maradt meg meta-review-only megfogalmazas vagy special-case vizualis kezeles |
