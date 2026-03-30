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
  - src/v11/shared/watchdog/watchdogMetaReviewRouting.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/core/bubble/listBubbles.ts
  - src/core/ui/presenters/bubblePresenter.ts
  - src/types/ui.ts
  - ui/src/lib/types.ts
  - ui/src/state/useBubbleStore.ts
  - docs/pairflow-initial-design.md
  - tests/core/state/stateSchema.test.ts
  - tests/core/runtime/watchdog.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/cli/bubbleStatusCommand.test.ts
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
5. A compatibility adapter csak durable state/transcript authoritybol dolgozhat; runtime-derived fallback nem engedett.

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
2. `running authority` = `active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` mezok egyuttese ugyanahhoz az aktiv handoffhoz kotve.
3. `legacy meta-review compatibility state` = olyan lifecycle label vagy adapter-shape, amely operatori vagy atmeneti kompatibilitasi szerepet tart meg, de nem kulon authority forras.
4. `context-preserving restart` = olyan runtime/session ujraattacholas, amely nem modositja a canonical running authorityt.
5. `role-neutral timeout semantics` = timeout minden actor eseten ugyanazon `deadline_at` + hianyzo durable result szabalybol kovetkezik.

### Phase 3 Shape Decision

1. Phase 3 canonical persisted target shape-je top-level `execution_context` authority blokk legyen a bubble state-ben.
2. A top-level `active_role` Phase 3-ban megmarad explicit canonical selectornek, de a timeout/restart/recovery authorityt mar a generic `execution_context` vezeti.
3. `meta_review.execution_context` Phase 3-ban compatibility adapter/home lehet, de nem maradhat kulon primary authority source.
4. A legacy `META_REVIEW_RUNNING` lifecycle label megmaradhat transitional compatibility allapotkent, de ugyanazt a top-level `execution_context` authorityt kell hordozza, mint a generic `RUNNING(active_role=meta_reviewer)` modell.
5. Phase 3-ban a generic running context legalabb a kovetkezo mezoket canonicalizalja: `active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt`.

## L1 - Change Contract

### 1) Call-site Matrix

| ID  | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | ---- | -------------- | -------------------------------- | --------------- | ----------------- | -------- | ------ | -------- |
| CS1 | `src/types/bubble.ts` + `src/core/state/initialState.ts` + `src/core/state/stateSchema.ts` | generic running persisted shape | `BubbleStateSnapshot` es state validation/defaulting -> type definitions / validation | top-level state schema | Bevezeti a generic top-level `execution_context` authority blokkot, es kikoti, hogy minden aktiv actor-futas ugyanazt a canonical shape-et hasznalja | P1 | required-now | Phase 3 target architecture explicit generic running contextet kovetel |
| CS2 | `src/core/state/machine.ts` + `src/core/state/transitions.ts` | lifecycle/state transitions | `applyStateTransition(...) -> BubbleStateSnapshot`, transition adjacency tables | running es human/meta-review branch-ek | A state machine a generic running authority modellre epuljon, es a legacy `META_REVIEW_*` utak csak compatibility route-kent maradjanak meg | P1 | required-now | jelenleg kulon meta-review lifecycle shape el |
| CS3 | `src/v11/shared/start/startCommandFlows.ts` + `src/v11/shared/start/startCommandApi.ts` | start/resume/reattach | `runResumeStartFlow(...)`, `startBubble(...) -> Promise<StartBubbleResult>` | implementer/reviewer runtime attach path | Implementer es reviewer aktiv futas is canonical generic running contexttel induljon vagy reattacholodjon; restart/restart-resume ne nyithasson uj authority contextet | P1 | required-now | Phase 3 a teljes loopra kiterjeszti az authority modellt |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts` + `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` + `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | meta-review activation compatibility | meta-review gate activation/recovery entrypontok -> Promise results | meta-review compatibility boundary | A meta-review flow ugyanazt a top-level generic `execution_context` authorityt nyissa/olvassa, mikozben a legacy `META_REVIEW_*` labels transitional compatibilityben megmaradhatnak | P1 | required-now | Phase 3-ban a meta-review nem maradhat kulon authority modell |
| CS5 | `src/core/runtime/watchdog.ts` + `src/v11/shared/watchdog/watchdogMetaReviewRouting.ts` | timeout authority | `computeWatchdogStatus(...) -> WatchdogStatus`, `maybeRouteMetaReviewBeforeExpiry(...)`, `maybeRouteMetaReviewOnExpiry(...)` | watchdog reference es expiry routing | Minden actor timeout authorityja ugyanabból a generic execution contextbol jojjon; meta-review compatibility route se olvasson kulon authorityt | P1 | required-now | Phase 3 exit criteria: kozos timeout semantics |
| CS6 | `src/core/bubble/metaReviewExecutionContext.ts` + `src/core/bubble/metaReview.ts` | compatibility adapter + submit authority | context validation/resolution helpers + `submitMetaReviewResult(...) -> Promise<MetaReviewSubmitResult>` | meta-review authority reader path | A meta-review-specific helper adapterre szukuljon: a primary authority a generic top-level context legyen, a submit pedig ezt hasznalja | P1 | required-now | Phase 4 elott a meta-review submit megmarad, de mar generic authorityra kell epuljon |
| CS7 | `src/v11/shared/status/statusCommandViewBuilder.ts` + `src/core/bubble/listBubbles.ts` + `src/core/ui/presenters/bubblePresenter.ts` + `src/types/ui.ts` + `ui/src/lib/types.ts` + `ui/src/state/useBubbleStore.ts` | operator/UI projection | status/list/UI projection builders -> views/models | lifecycle/status surface | A status/list/UI a generic running authorityt es a compatibility labelt kulon mutassa; a meta-review ne tunjon kulon execution modellnek | P2 | required-now | operatori szemantika kulcsfontossagu a migrationhoz |
| CS8 | `docs/pairflow-initial-design.md` | lifecycle/spec sync | markdown | state machine + running semantics | A docs rogzitsek, hogy a bubble canonical active authorityja generic running context, es a legacy `META_REVIEW_*` allapotok transitional compatibility retegkent maradnak | P2 | required-now | docs drift Phase 3-ban magas kockazat |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
| -------- | ------- | ------ | --------------- | --------------- | ------------- | -------- | ------ |
| Running authority state | implementer/reviewer: implicit `RUNNING` ownership; meta-review: `meta_review.execution_context` | top-level generic `execution_context` authority minden actorra | `active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` | actor-specific diagnostics vagy runtime observability | additive migration with compatibility adapter | P1 | required-now |
| Meta-review authority home | `meta_review.execution_context` primary authority | top-level `execution_context` primary authority; `meta_review.execution_context` compatibility mirror/adapter only | same canonical fields as generic context | legacy snapshot metadata a `meta_review` alatt | behavior tightening | P1 | required-now |
| Generic RUNNING timeout input | mixed role-specific semantics | role-neutral `execution_context.deadline_at` | `active_role`, `awaited_output_type`, `started_at`, `deadline_at`, `handoff_id`, `round`, `attempt` | runtime observability | behavior change | P1 | required-now |
| Restart/reattach authority preservation | role-specific branches, especially meta-review | same generic context-preservation invariant minden actorra | current `execution_context` | activity timestamps / runtime diagnostics | behavior clarification | P1 | required-now |
| Legacy lifecycle compatibility | `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_APPROVAL` mixed canonical+compat paths | explicit compatibility adapter/label separation | canonical top-level running authority | legacy labels, legacy summaries, operator routing metadata | transitional compatibility only | P1 | required-now |
| Status/UI surface | lifecycle label-heavy, actor-specific interpretation | generic running authority + compatibility label projection | current state label, active role, authority deadline/context | runtime diagnostics, compatibility label | additive presentation change | P2 | required-now |

Normative rules:

1. Phase 3 primary authorityja a top-level generic `execution_context`; nested legacy authority blokk nem maradhat vele parhuzamos primary source.
2. A generic `execution_context` minden aktiv actor esetben ugyanazt a canonical mezokeszletet hordozza.
3. `active_role` Phase 3-ban canonical state selector marad; a role a context resze is, de nem lehet implicit vagy runtime-derived.
4. Restart/rebind/resume minden actor eseten csak observability/activity surface-et frissithet; authority contextet nem.
5. A watchdognak nincs role-specifikus authority fallbackje; minden actor timeoutja a canonical `deadline_at`-ot koveti.
6. A legacy `META_REVIEW_*` allapotok Phase 3-ban legfeljebb compatibility route es UI label szerepet tölthetnek be.
7. Ha a compatibility adapter a legacy meta-review allapotot generic running authorityra vetiti, ezt durable state/transcript authoritybol kell megtennie, nem runtime livenessbol.
8. A generic running authority es a lifecycle label kozt barmilyen ellentmondas invalid state-nek minosul.
9. `READY_FOR_APPROVAL` es `READY_FOR_HUMAN_APPROVAL` compatibility branch-ek Phase 3-ban megmaradhatnak, de nem tarthatnak fenn kulon running authority modellt.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
| ---- | ------- | --------- | ----- | -------- | ------ |
| Bubble state | top-level generic `execution_context` authority bevezetese | nested, role-specific authority modellek tovabbeleltetese primary source-kent | state contract valtozik, plan_ref kotelezo | P1 | required-now |
| State machine | generic running route semantics bevezetese | kulon meta-review-only authority transition fenntartasa | compatibility labels maradhatnak | P1 | required-now |
| Start/resume/restart | actor-neutral context-preservation invariants | restart altali implicit context-ujranyitas barmely actorra | Phase 3 kulcs semantikaja | P1 | required-now |
| Watchdog | kozos authority resolver minden actorra | actor-specifikus timeout authority fallback | implementer/reviewer/meta-review parity kell | P1 | required-now |
| Meta-review paths | compatibility adapter a generic contextre | `meta_review.execution_context` mint kulon primary authority | Phase 4 elofeltetel | P1 | required-now |
| Status/UI | authority vs compatibility label kulon megjelenitese | UI/state surface, amely a meta-reviewt kulon execution modellkent tartja fenn | operatori migrateability fontos | P2 | required-now |
| Docs/spec | generic running authority dokumentalasa | docs drift a Phase 1-2 meta-review-only authority modellnel | docs required | P2 | required-now |

Constraint: ha az implementation csak helper-szinten "kozosit" context-resolvert, de a persisted state shape es lifecycle authority kulon marad implementer/reviewer vs meta-review kozott, az nem eleg; Phase 3 domain-shape unificationt kovetel.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
| ------- | ------------------- | -------- | --------------------- | ----------- | --------- | -------- | ------ |
| aktiv actor-futas generic execution context nelkul | state schema / transition | throw | invalid-state reject; no implicit role-specific fallback | `RUNNING_EXECUTION_CONTEXT_INVALID` vagy normalized validation error | error | P1 | required-now |
| legacy `META_REVIEW_RUNNING` allapot top-level generic context nelkul marad | compatibility adapter | normalize or throw | deterministic adapter from durable authority, kulonben invalid-state error | `RUNNING_EXECUTION_CONTEXT_INVALID` vagy normalized compatibility error | warn/error | P1 | required-now |
| restart/reattach uj contextet probal nyitni meglévo aktiv authority mellett | runtime/start orchestration | throw | keep existing persisted authority; no synthetic replacement | `RUNNING_EXECUTION_CONTEXT_MISMATCH` vagy normalized restart error | error | P1 | required-now |
| watchdog actor-specifikus fallback authorityra esne vissza | watchdog resolver | throw | explicit invalid-state path; no `last_command_at` or role-specific fallback | `RUNNING_EXECUTION_CONTEXT_INVALID` | error | P1 | required-now |
| status/list/UI egyszerre ket authority source-ot lat | projection layer | reject or degrade to validation warning | render validation/state mismatch, ne hallgasson el semmit | normalized status validation reason | warn/error | P2 | required-now |
| meta-review submit legacy helperbol meg a nested authorityt probalja primarykent olvasni | submit path | explicit reject | typed submit error; nested legacy authority nem lehet primary source | `META_REVIEW_STATE_INVALID` vagy normalized submit error | error | P1 | required-now |
| docs/spec update elmarad state-shape valtozas mellett | docs sync | fallback | task nem tekintheto kesznek docs update nelkul | N/A | warn | P2 | required-now |

Path-specific failure semantics:

1. `throw` itt typed schema / state-transition / orchestration hibat jelent, nem silent compatibility fallbacket.
2. `normalize or throw` csak migration boundaryn engedett, es csak durable authority inputokbol.
3. `explicit reject` submit surface-en typed actor error; nem eredmenyezhet route mutationt.

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
| T8  | legacy meta-review labels remain compatibility-only | bubble meta-review flow a human gate vagy fail compatibility statebe lep | state/status projection fut | a projection megorzi a compatibility labelt, de nem tart fenn kulon nested primary authorityt | P1 | required-now | automated test |
| T9  | status/list/UI show generic running authority semantics | bubble aktiv actor-futassal jelenik meg | status/list/UI view epul | a view a generic running authorityt mutatja, es a meta-reviewt nem kulon execution modellkent kezeli | P2 | required-now | automated test |
| T10 | invalid mixed-authority state is rejected | top-level generic context es legacy nested authority ellentmond egymasnak | schema/load/runtime path fut | deterministic invalid-state hiba keletkezik; nincs silent precedence drift | P1 | required-now | automated test |
| T11 | meta-review submit reads generic authority | aktiv meta-review compatibility route fut | submit erkezik | a submit a top-level generic running authorityt olvassa, nem a nested legacy authorityt primarykent | P1 | required-now | automated test |
| T12 | docs/spec parity | implementation updates merged | doc review | a docs kimondja, hogy a canonical active authority generic running context, es a legacy `META_REVIEW_*` labels transitional compatibility retegkent maradnak | P2 | required-now | doc review |

Verification note:

1. `T1`-`T5` kulon fedje le az implementer/reviewer es meta-review pathokat; nem eleg csak meta-review parityt ellenorizni.
2. `T6`-`T7` actoronként ugyanarra a canonical mezokeszletre kell assertaljanak, nem csak a timeout vegeredmenyre.
3. `T8`-`T10` kulon bizonyitsak a compatibility label megtartasat es a mixed-authority state fail-closed kezeleset.
4. `T11` explicitten bizonyitsa, hogy a nested meta-review authority Phase 3-ban mar adapter, nem primary source.

### Acceptance Criteria

1. AC1: Minden aktiv actor-futas top-level generic `execution_context` authority blokkot hasznal canonical source-kent.
2. AC2: Az implementer, reviewer es meta-review timeout/restart/recovery szemantikaja ugyanarra a running authority modellre epul.
3. AC3: A legacy `META_REVIEW_*` allapotok Phase 3-ban legfeljebb compatibility labelkent maradnak meg, kulon primary authority modell nelkul.
4. AC4: Status/list/UI projection a generic running authorityt tekinti canonicalnak, es a meta-reviewt nem kulon execution modellkent prezentalja.
5. AC5: A docs/spec egyertelmuen rogzitik a generic running authority modellt es a compatibility boundaryt.

### Acceptance Traceability

| AC  | Primary Call Sites | Mandatory Tests |
| --- | ------------------ | --------------- |
| AC1 | CS1, CS2, CS3, CS4 | T1, T2, T3, T10 |
| AC2 | CS3, CS4, CS5, CS6 | T4, T5, T6, T7, T11 |
| AC3 | CS2, CS4, CS6 | T3, T8, T10, T11 |
| AC4 | CS7 | T8, T9 |
| AC5 | CS8 | T12 |

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
