---
artifact_type: task
artifact_id: task_protocol_first_meta_review_runtime_decoupling_phase2_v1
title: "Protocol-First Meta-Review Runtime Decoupling (Phase 2)"
status: draft
phase: phase2
target_files:
  - src/types/bubble.ts
  - src/core/state/initialState.ts
  - src/core/state/stateSchema.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateNotify.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyRunRouting.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryContext.ts
  - src/core/bubble/metaReview.ts
  - src/core/runtime/watchdog.ts
  - src/v11/shared/watchdog/watchdogMetaReviewRouting.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - docs/pairflow-initial-design.md
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/core/human/approval.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/state/stateSchema.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
prd_ref: null
plan_ref: plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Protocol-First Meta-Review Runtime Decoupling (Phase 2)

## L0 - Policy

### Goal

Levlasztani a meta-review runtime notify/delivery bizonytalansagat a domain route-rol ugy, hogy a durable handoff utan a bubble domain tovabbra is az explicit execution context authorityhoz kotott aktiv meta-review allapotban maradjon.
Phase 2 sikeres, ha a meta-review kickoff utan a hamis notify-path fail route megszunik, a runtime uncertainty kulon surface-re kerul, es a submit, watchdog, recovery ugyanazt a rogzitett execution contextet es ugyanazt a durable result authorityt olvassa.

### Context

Megfigyelt coupling-hiba:

1. a meta-review kickoff ma a durable handoff utan meg mindig a pane-level delivery confirmationre var,
2. a `notifyMetaReviewerSubmissionRequest(...)` ma `throw`-ol delivery-unconfirmed vagy pane-exited helyzetben,
3. az apply path ezt a runtime bizonytalansagot domain `META_REVIEW_FAILED` route-ta tudja forditani,
4. emiatt egy hamis negativ notify vagy atmeneti pane-problema fail-closed domain allapotot okozhat ugy, hogy a canonical handoff es az execution context mar letrejott,
5. ez ellentmond a plan transport-uncertainty policyjanak, amely szerint a `confirmed|uncertain|failed` delivery signal operator/runtime surface, nem domain routing authority.

Phase 2 nem a generic `RUNNING(active_role=...)` modell bevezetese.
Ez a kor a Phase 1-ben bevezetett explicit `meta_review.execution_context` authorityre epit, es csak a meta-review notify/recovery/watchdog/submit couplingot rendezi at.

### In Scope

1. A meta-review kickoff utani runtime notify/delivery eredmeny kulon, nem-authority observability surface-re emelese.
2. A convergence/apply path atallitasa ugy, hogy durable handoff + execution context utan a notify bizonytalansag ne route-oljon domain `META_REVIEW_FAILED` allapotba.
3. A recovery path atkotese ugyanarra a canonical execution context + durable transcript authorityra, amelyet a submit es a watchdog is hasznal.
4. A submit acceptance explicit rogzitese arra az esetre is, amikor korabban a notify/runtime surface `uncertain` vagy `failed` allapotot mutatott, de a canonical handoff aktiv maradt.
5. A watchdog timeout szemantika szigoritasanak vegigvitele: timeout csak a rogzitett `deadline_at` + hianyzo durable `meta_review_result` alapjan tortenhet.
6. Kulon runtime uncertainty/status surface megjelenitese a status/state oldalon ugy, hogy ez ne keveredjen authority mezokkel.
7. Schema-, contract- es end-to-end coverage frissitese notify false negative, restart, recovery, timeout es duplicate/late result esetekre.
8. Docs/spec szinkron a `docs/pairflow-initial-design.md`-ben a Phase 2 runtime/domain boundaryrol.

### Out of Scope

1. A bubble lifecycle allapotgép teljes generic `RUNNING(active_role=...)` atalakitasa.
2. Az implementer/reviewer/meta-reviewer kozos execution context representation Phase 3 elotti bevezetese.
3. Az actor-facing CLI teljes unificationja vagy a `pairflow bubble meta-review submit` kivezetese.
4. A `META_REVIEW_*` lifecycle nevek teljes cleanupja.
5. A teljes tmux/runtime layer redesign a bubble minden actorara.
6. A Phase 4-5 scope-ba tartozo actor-command retirement es legacy state cleanup.

### Safety Defaults

1. A durable meta-review handoff appendje utan a notify/delivery bizonytalansag nem valthat ki domain `META_REVIEW_FAILED` route-ot onmagaban.
2. A runtime uncertainty mezok explicitten nem-authority observability mezok; sem timeout, sem submit, sem recovery authoritykent nem hasznalhatok.
3. A timeout tovabbra is fail-closed a canonical execution context deadline-jara, de kizarolag akkor, ha a vart durable `meta_review_result` nem erkezett meg hataridore.
4. Recovery nem nyithat uj execution contextet es nem szintetizalhat uj authority ablakot notify bizonytalansag miatt.
5. Submit acceptance vagy reject kizarolag a canonical execution contextre, a durable transcript allapotra es a handoff/round egyezesre epulhet; korabbi notify eredmeny nem lehet blockolo gate.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - meta-review kickoff/apply routing contract,
   - runtime delivery observability contract,
   - meta-review submit acceptance contract,
   - meta-review recovery contract,
   - watchdog timeout + expiry routing contract,
   - state/schema contract az observability vs authority szetvalasztasara,
   - status/inspection contract a runtime uncertainty lathatosagara.

### Normative Reference Policy

1. `plan_ref`: `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - Ez a canonical Phase 2 source a transport uncertainty es domain routing szetvalasztasara.
2. `system_context_ref`: `docs/pairflow-initial-design.md`
   - A bubble lifecycle compatibility modell tovabbra is innen jon, amig a task explicit Phase 2 szaballyal felul nem irja.
3. Precedence rule:
   - ha a jelenlegi implementation notify/delivery problemanal `META_REVIEW_FAILED` route-ot valaszt,
   - ebben a korben a plan transport-uncertainty policy es a Phase 1 execution-context authority az elsodleges.

### Terminology Lock

1. `durable handoff boundary` = az a pont, amikor a meta-review kickoff envelope durable modon appendelve lett a transcriptba, es az execution context aktiv.
2. `runtime uncertainty` = a notify/delivery/runtime layer olyan allapota, mint `confirmed`, `uncertain` vagy `failed`, amely operatori/observability signal, de nem domain authority.
3. `durable result authority` = az aktiv execution contexthez tartozo canonical `meta_review_result` transcript-envelope.
4. `domain route` = az a lifecycle dontes, amely `meta_review_running`, human gate, auto rework, approval vagy timeout iranyba viszi a bubble-t.
5. `false negative notify` = olyan eset, amikor a runtime nem tud delivery confirmot adni, de az actor a durable handoff alapjan megis sikeresen submitol.
6. `late or duplicate result` = olyan `meta_review_result`, amely egy mar lezart, lecserelt vagy lejart contexthez erkezik, vagy ugyanarra a contextre masodik canonical eredmenyt probal appendelni.

### Phase 2 Shape Decision

1. Phase 2-ben a meta-review authority tovabbra is `state.meta_review.execution_context` alatt marad.
2. A runtime uncertainty kulon, nem-authority blokkban jelenjen meg `state.meta_review` alatt; ez lehet adapter-shape, de explicitten el kell valasztani az execution contexttol.
3. A notify/apply result contractnak structured delivery observabilityt kell hordoznia; puszta `throw` nem eleg ott, ahol a durable handoff mar sikeres.
4. A current-round durable `meta_review_result` transcript authority erosebb, mint barmely korabbi notify bizonytalansag.
5. `META_REVIEW_FAILED` Phase 2-ben megmaradhat compatibility statekent mas okokbol, de nem johet letre pusztan a notify confirmation hianya vagy pane-level false negative miatt a durable handoff utan.

## L1 - Change Contract

### 1) Call-site Matrix

| ID  | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | ---- | -------------- | -------------------------------- | --------------- | ----------------- | -------- | ------ | -------- |
| CS1 | `src/types/bubble.ts` + `src/core/state/initialState.ts` + `src/core/state/stateSchema.ts` | meta-review persisted shape | `BubbleMetaReviewSnapshotState` es state validation/defaulting -> type definitions / validation | `meta_review` schema alatt | A state explicitten kulonitse el az authority execution contextet a runtime notify/delivery observability surface-tol; az uj runtime mezok nem lehetnek authorityk | P1 | required-now | Phase 2 kulon runtime surface-et kovetel |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` + `src/v11/shared/metaReviewGate/metaReviewGateNotify.ts` | notify delivery contract | `notifyMetaReviewerSubmissionRequest(input, dependencies) -> Promise<...>` | notify result shape | A notify path structured delivery observabilityt adjon vissza `confirmed|uncertain|failed` statuszokkal, es a durable handoff utan ne csak `throw`-al jelezzen hamis negativ runtime allapotot | P1 | required-now | a jelenlegi `Promise<void>` + `throw` domain couplingot okoz |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` + `src/v11/shared/metaReviewGate/metaReviewGateApplyRunRouting.ts` | convergence -> meta-review kickoff route | `applyMetaReviewGateOnConvergence(input, dependencies) -> Promise<MetaReviewGateResult>` | kickoff utani apply path | Ha a durable kickoff envelope es a canonical execution context mar letrejott, a meta-review route maradjon `meta_review_running`; a notify bizonytalansag csak runtime surface-en jelenjen meg | P1 | required-now | ma a notify warning/failure `META_REVIEW_FAILED` route-ra tud esni |
| CS4 | `src/core/bubble/metaReview.ts` | submit acceptance | `submitMetaReviewResult(input, dependencies) -> Promise<MetaReviewSubmitResult>` | active-window validation + current-round authority check | A submit elfogadhato legyen akkor is, ha korabban a notify `uncertain` vagy `failed` volt, feltetelezve hogy a canonical execution context aktiv es a result current-round durable authority | P1 | required-now | false negative notify nem blokkolhatja a domain eredmenyt |
| CS5 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` + `src/v11/shared/metaReviewGate/metaReviewGateRecoveryContext.ts` | recovery routing | `recoverMetaReviewGateFromSnapshot(input, dependencies) -> Promise<MetaReviewGateResult>` | snapshot-based recovery decision branch | Recovery ugyanazt az aktiv execution contextet es ugyanazt a durable current-round result authorityt olvassa, mint a submit/watchdog; runtime notify status nem lehet recovery-fail shortcut | P1 | required-now | a plan kifejezetten kozos authorityt kovetel submit/watchdog/recovery kozott |
| CS6 | `src/core/runtime/watchdog.ts` + `src/v11/shared/watchdog/watchdogMetaReviewRouting.ts` | expiry routing | `computeWatchdogStatus(...) -> WatchdogStatus`, `maybeRouteMetaReviewBeforeExpiry(...)`, `maybeRouteMetaReviewOnExpiry(...)` | meta-review timeout es expiry route | Timeout kizarolag a canonical `deadline_at` + hianyzo durable `meta_review_result` alapjan tortenhet; runtime uncertainty nem szamithat implicit timeoutnak vagy fail route-nak | P1 | required-now | Phase 2 exit criteria explicit | 
| CS7 | `src/v11/shared/status/statusCommandViewBuilder.ts` | operator visibility | `buildBubbleStatusView(...) -> BubbleStatusView` | metaReview status projection | A status felulet kulon mutassa a runtime uncertainty surface-t es ne lifecycle state-kent kommunikalja a notify false negative-et | P2 | required-now | operatori diagnosztika es rollback-biztonsag |
| CS8 | `docs/pairflow-initial-design.md` | lifecycle/spec sync | markdown | meta-review runtime / transport notes | A docs kimondja, hogy durable handoff utan a delivery confirmation nem domain authority; a timeout a hianyzo durable resultbol kovetkezik | P2 | required-now | plan/spec sync kotelezo |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
| -------- | ------- | ------ | --------------- | --------------- | ------------- | -------- | ------ |
| Meta-review authority state | explicit `meta_review.execution_context` Phase 1-ben | valtozatlan authority blokk | `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` | none az authority reszben | unchanged from Phase 1 | P1 | required-now |
| Runtime uncertainty state | implicit warning/throw vagy `META_REVIEW_FAILED` route | explicit non-authority `meta_review` alatti runtime observability blokk | `delivery_status`, `updated_at` | `reason_code`, `message`, `target_pane`, `attempt_count` | additive adapter shape | P1 | required-now |
| Notify API contract | `Promise<void>` es exceptional flow | structured notify result object | `delivery_status` | `reason_code`, `message`, `target_pane`, `attempt_count` | behavior change | P1 | required-now |
| Apply/kickoff route contract | notify-hibatol fuggoen `meta_review_running` vagy `human_gate_run_failed` jellegu fallback | durable handoff utan mindig `meta_review_running`, runtime surface-szel | canonical state + gate envelope + delivery observability | warning metadata | behavior tightening | P1 | required-now |
| Submit acceptance authority | canonical context + current submit path, de notify bizonytalansag implicit side effect lehet | canonical context + durable result authority; notify status irrelevans gate input | active execution context, matching round, active deadline window | diagnostics for duplicate/late suppression | behavior clarification | P1 | required-now |
| Recovery authority | snapshot+runResult routing reszben legacy failure-pathokra is tamaszkodik | transcript + canonical execution context + durable result authority | active execution context, current-round transcript evidence | runtime observability diagnostics | behavior tightening | P1 | required-now |
| Status surface | meta-review latest autonomous snapshot | meta-review latest autonomous snapshot + runtime uncertainty blokk | `delivery_status`, `updated_at` | `reason_code`, `message` | additive UI/state presentation | P2 | required-now |

Normative rules:

1. A durable meta-review kickoff envelope appendje utan a domain route authority mar nem kerulhet vissza a notify/runtime layer kezebe.
2. `delivery_status` es kapcsolodo runtime mezok observability szolgaltatasok; sem watchdog, sem submit, sem recovery nem hasznalhatja oket authority inputkent.
3. Ha a current-round durable `meta_review_result` jelen van es ervenyes az aktiv execution context windowjaban, a korabbi notify `uncertain` vagy `failed` allapot nem blokkolhatja a route-ot.
4. Timeoutot csak az okozhat, hogy az aktiv execution context `deadline_at` ideje letelt, es addig nem erkezett current-round durable `meta_review_result`.
5. Recoverynek ugyanazt a current-round authorityt kell olvasnia, mint a submit pathnak; nem lehet kulon "recovery-only" implicit gate modell.
6. `META_REVIEW_FAILED` compatibility state Phase 2-ben sem jelenthet notify confirmation hianyabol szarmazo domain fail route-ot a durable handoff utan.
7. Az uj runtime observability blokk explicit adapter/home-ja `state.meta_review`; nem emelheto authority mezok koze, es nem helyettesitheti az execution contextet.
8. Duplicate vagy late meta-review submit nem nyithat uj route-ot a mar lezart vagy lecserelt handoffhoz; typed reject vagy deterministic suppresszio szukseges.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
| ---- | ------- | --------- | ----- | -------- | ------ |
| State schema | explicit runtime uncertainty mezok a `meta_review` alatt | runtime mezok authoritykent hasznalasa | authority vs observability szetvalasztas maradjon egyertelmu | P1 | required-now |
| Notify/runtime path | structured delivery observability visszaadasa | durable handoff utani notify bizonytalansag miatti domain `META_REVIEW_FAILED` route | false negative notify Phase 2 fo kockazata | P1 | required-now |
| Kickoff/apply | `meta_review_running` route megtartasa delivery bizonytalansag mellett | fail-closed domain route tisztan pane-level confirm hiany miatt | delivery sikeresseg nem domain prerequisite a kickoff utan | P1 | required-now |
| Submit path | canonical result acceptance aktiv contextben | notify status miatti reject, ha a canonical context es result ervenyes | submit a durable transcriptbol dolgozik | P1 | required-now |
| Recovery | transcript/state alapjan deterministic route | notify log alapjan special-case fail route | recovery authority submit/watchdog parityt kovet | P1 | required-now |
| Watchdog | deadline + hianyzo result alapu timeout | delivery uncertain/failed implicit timeoutnak kezelese | Phase 2 exit criteria | P1 | required-now |
| Status/UI | runtime uncertainty kulon megjelenitese | lifecycle state osszemosasa a runtime warninggal | operatori lathatosag fontos | P2 | required-now |
| Docs/spec | runtime/domain boundary leirasa | hallgato docs drift a regi fail-closed notify modellrol | docs required | P2 | required-now |

Constraint: ha az implementation a notify/runtime problema kezelest puszta log warningra redukalja tartos vagy status-szintu surface nelkul, az nem eleg; Phase 2 explicit operator-visible runtime uncertainty surface-et kovetel.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
| ------- | ------------------- | -------- | --------------------- | ----------- | --------- | -------- | ------ |
| durable kickoff envelope appendje sikeres, de pane marker confirm nem talalhato | tmux capture / pane input | result | `delivery_status=uncertain`, state marad `META_REVIEW_RUNNING`, nincs domain fail route | existing notify reason vagy normalized `META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED` | warn | P1 | required-now |
| durable kickoff envelope appendje sikeres, de a meta-reviewer pane kilepett vagy shellre esett vissza | tmux capture | result | `delivery_status=failed` vagy `uncertain` explicit reasonnal, state marad `META_REVIEW_RUNNING`, operator-visible runtime diagnostics | existing `META_REVIEWER_PANE_EXITED` vagy normalized runtime reason | warn/error | P1 | required-now |
| notify path a durable handoff boundary elott hibazik | transcript append / state transition | throw | nincs partial kickoff success; a domain nem allhat hamisan aktiv contextbe | normalized transition/runtime error | error | P1 | required-now |
| submit erkezik aktiv execution contextben, mikozben runtime uncertainty all fenn | submit path | accept | canonical current-round result authority alapjan normal route | N/A | info | P1 | required-now |
| submit erkezik lejart vagy lecserelt handoffra | submit path | explicit reject | typed submit error; nincs route mutation | existing round/state invalid reason vagy new duplicate/late reason | error | P1 | required-now |
| recovery fut aktiv contextben runtime uncertainty mellett, de a durable result mar jelen van | transcript authority | result | recovery a canonical resultbol routol tovabb; korabbi notify status csak diagnostic | N/A | info | P1 | required-now |
| recovery fut aktiv contextben runtime uncertainty mellett, es nincs durable result, de a deadline meg nem jart le | execution context | result | no fail route; bubble marad aktiv meta-review allapotban runtime diagnostics-szal | N/A | info | P1 | required-now |
| watchdog lejarat aktiv contextben durable result nelkul | execution context + transcript | escalate | canonical timeout summary, recovery/human gate route a transcript/state authoritybol | existing timeout summary / normalized reason | warn/error | P1 | required-now |
| duplicate vagy keso result masodszor is appendelodne ugyanarra a contextre | transcript/state | explicit reject or suppress | deterministic no-op vagy typed reject, de nincs uj route | normalized duplicate/late result reason | warn/error | P1 | required-now |
| docs/spec update elmarad protocol valtozas mellett | docs sync | fallback | task nem tekintheto kesznek docs update nelkul | N/A | warn | P2 | required-now |

Path-specific failure semantics:

1. `result` itt olyan structured visszaterest jelent, amely domain route helyett runtime uncertainty observabilityt hordoz.
2. `throw` csak akkor elfogadhato, ha a durable handoff boundary meg nem teljesult, vagy az authority/state transition invalid.
3. `explicit reject` a submit surface-en typed actor error, nem hallgato ignore; `suppress` csak akkor elfogadhato, ha a contract-teszt explicitten bizonyitja a deterministic viselkedest.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
| ---- | ----- | -------- | ------ |
| must-use | `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` Phase 2 exit criteria es transport-uncertainty policy | P1 | required-now |
| must-use | Phase 1 `meta_review.execution_context` authority contract | P1 | required-now |
| must-use | durable transcript handoff/result envelope model | P1 | required-now |
| must-use | kozos authority reasoning submit/watchdog/recovery kozott | P1 | required-now |
| must-use | operator-visible runtime uncertainty surface a `meta_review` namespace alatt | P1 | required-now |
| must-not-use | notify confirmation hianya mint domain `META_REVIEW_FAILED` trigger a durable handoff utan | P1 | required-now |
| must-not-use | runtime uncertainty mezok timeout vagy submit authoritykent | P1 | required-now |
| must-not-use | Phase 3 generic `RUNNING(active_role=...)` bevezetese ebben a korben | P1 | required-now |
| must-not-use | Phase 4 actor-CLI unification scope vagy command retirement | P2 | required-now |
| must-not-use | olyan compatibility shortcut, amely recoveryben vagy watchdogban visszahozza a notify-driven fail route-ot | P1 | required-now |

### 6) Test Matrix

| ID  | Scenario | Given | When | Then | Priority | Timing | Evidence |
| --- | -------- | ----- | ---- | ---- | -------- | ------ | -------- |
| T1  | notify false negative, then successful submit | durable meta-review kickoff envelope appended, active execution context letrejott, notify `uncertain` | current-round structured meta-review submit erkezik deadline-en belul | submit elfogadott, a route a canonical resultbol megy tovabb, es a korabbi notify uncertainty nem blokkol | P1 | required-now | automated test |
| T2  | pane unavailable after durable kickoff does not fail route | active execution context letrejott, meta-reviewer pane exited vagy marker confirm nem sikerul | convergence/apply kickoff flow lefut | state `META_REVIEW_RUNNING` marad, runtime uncertainty surface frissul, nincs immediate `META_REVIEW_FAILED` | P1 | required-now | automated test |
| T3  | watchdog ignores runtime uncertainty before deadline | aktiv meta-review context es runtime uncertainty jelen van, durable result meg nincs | watchdog fut a canonical deadline elott | `not_expired`/no-op eredmeny, nincs fail route pusztan notify status miatt | P1 | required-now | automated test |
| T4  | timeout only on missing durable result at deadline | aktiv meta-review context, runtime uncertainty jelen lehet, durable result nincs | watchdog a canonical `deadline_at` utan fut | timeout/escalation tortenik, es ennek oka a hianyzo durable result + lejart context, nem a notify status | P1 | required-now | automated test |
| T5  | recovery uses same authority as submit/watchdog | aktiv meta-review context, notify bizonytalansag utan a transcriptben jelen van a current-round result | recovery fut snapshotbol | recovery a canonical resultbol routol tovabb ugyanarra a round/contextre, es nem recovery-only failure shortcutot valaszt | P1 | required-now | automated test |
| T6  | restart preserves context and uncertainty surface | aktiv meta-review context es runtime uncertainty jelen van | restart/rebind/recover flow fut | execution context valtozatlan marad, runtime uncertainty surface megorizheto vagy determinisztikusan ujraepitheto, nincs uj handoff | P1 | required-now | automated test |
| T7  | duplicate or late result suppression | egy current-round canonical result mar elfogadva lett, vagy a context lecserelodott/lejart | ujabb submit erkezik ugyanarra vagy regi handoffra | typed reject vagy deterministic suppresszio tortenik; nincs uj route es nincs authority drift | P1 | required-now | automated test |
| T8  | status surface shows runtime uncertainty separately | aktiv meta-review context runtime notify warninggal | status/list/inspection view epul | a view kulon mutatja a runtime uncertainty mezot, es nem lifecycle failurekent prezentalja | P2 | required-now | automated test |
| T9  | docs/spec parity | implementation updates merged | doc review | a docs kimondja, hogy a delivery confirmation observability signal, nem domain authority; timeout durable result hianyabol kovetkezik | P2 | required-now | doc review |

Verification note:

1. A `T1`, `T5` es `T7` szcenarioknak explicitten current-round handoff/round alapon kell igazolniuk a durable result authorityt; nem eleg csak a "submit succeeded/failed" allitas.
2. A `T2`, `T3` es `T4` teszteknek kulon kell ellenorizniuk a runtime uncertainty surface-et es a lifecycle allapotot, hogy a ket reteg ne mosodjon ossze.
3. A `T6` restart/recovery tesztnek bizonyitania kell, hogy Phase 1 execution context invariansok valtozatlanok maradnak, es a Phase 2 runtime surface nem vezeti vissza az activity-driven authorityt.

### Acceptance Criteria

1. AC1: Durable meta-review kickoff utan a notify/delivery bizonytalansag nem route-olhatja a bubble-t `META_REVIEW_FAILED` allapotba onmagaban.
2. AC2: A runtime uncertainty explicit, operator-visible, nem-authority surface-kent jelenik meg a `meta_review` namespace alatt es/vagy a status viewban.
3. AC3: A submit, watchdog es recovery ugyanazt a Phase 1-ben bevezetett canonical execution contextet es ugyanazt a durable result authorityt olvassa.
4. AC4: Timeout kizarolag a canonical `deadline_at` + hianyzo durable `meta_review_result` kombinaciobol kovetkezhet.
5. AC5: False negative notify utan a current-round canonical meta-review result tovabbra is elfogadhato es vegigviheti a route-ot.
6. AC6: Duplicate vagy late result nem okozhat uj route-ot vagy authority driftet.
7. AC7: A docs/spec egyertelmuen rogzitik a runtime/domain boundaryt Phase 2-re.

### Acceptance Traceability

| AC  | Primary Call Sites | Mandatory Tests |
| --- | ------------------ | --------------- |
| AC1 | CS2, CS3           | T2              |
| AC2 | CS1, CS2, CS7      | T2, T8          |
| AC3 | CS4, CS5, CS6      | T1, T3, T5, T6  |
| AC4 | CS6                | T3, T4          |
| AC5 | CS2, CS3, CS4      | T1              |
| AC6 | CS4, CS5           | T7              |
| AC7 | CS8                | T9              |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A runtime uncertainty blokk adapter-shape maradhat Phase 2-ben, de mar most ugy kell formalni, hogy Phase 3-ban generic running-context observabilityve emelheto legyen.
2. [later-hardening] Erositett kozos helper hasznos lehet a current-round durable `meta_review_result` felderitesere submit/recovery/watchdog kozott, de ez nem rejtheti el az authority boundarykat.
3. [later-hardening] Ha a notify path structured resultre all at, a CLI/status surface erdemes ugyanazt a status vocabularyt (`confirmed|uncertain|failed`) ujrahasznalni.

## Hardening Backlog (Optional)

| ID  | Item | Layer | Priority | Timing | Source | Proposed Action |
| --- | ---- | ----- | -------- | ------ | ------ | --------------- |
| H1  | Generic runtime observability surface minden actorra | L2 | P2 | later-hardening | plan phase boundary | Phase 3-ban emeljuk ki a meta-review-only runtime uncertainty shape-et kozos running observability modellbe |
| H2  | Actor-agnostic durable result lookup helper | L2 | P2 | later-hardening | shared authority concern | Phase 3-4-ben kozositsuk a current-handoff result authority felderiteset implementer/reviewer/meta-reviewer kozott |
