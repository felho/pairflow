---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_submit_inconclusive_human_gate_phaseE_v1
title: "Actor Runtime Interface Meta-Review Submit Inconclusive Human-Gate Alignment (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Submit Inconclusive Human-Gate Alignment (Phase E)

## Current Codebase Check (2026-04-10)

1. A task eredeti `target_files` listaja tobb ponton stale: a submit runtime mar nem `src/core/bubble/metaReview.ts`, hanem elsosorban `src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts` es `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts` alatt el.
2. A bug viszont tovabbra is valos current-state gap: a live codeban meg mindig letezik az `assertSubmitRecommendationRouteable("inconclusive")` tiltasa, mikozben a shared gate policy es a recovery path mar canonical `human_gate_inconclusive` route-kent kezeli ugyanezt az outcome-ot.
3. A mai acceptance surface is megvan es aktualis: a "persist then reject" elvart viselkedest tovabbra is a `tests/core/bubble/metaReview.test.ts` rogzit egy explicit regresszios fixture-ben, a recovery parityt a `tests/core/bubble/metaReviewGate.test.ts`, a retained facade-t a `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`, a public actor-emit wrapper parityt pedig a `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`.
4. A task ezert tovabbra is legitim es bounded implementation target, de a base write setet a `submit` runtime + routing seam, a shared gate policy/recovery seam, a retained `emitMetaReviewV11` facade, a canonical actor-emit wrapper, valamint az ezekhez tartozo core/contract/wrapper regresszios tesztek menten kell ujrairni.
5. A CLI/docs surface jelenleg masodlagos es conditional: a mai renderer mar lathatoan surfacedeli a `gate_route` + `lifecycle_state` mezoket, ezert renderer- vagy docs-touch csak akkor indokolt, ha a corrected success path utan a wording meg mindig limbot vagy recovery-kotelezettseget sugall. Emiatt a renderer/helper/test surface nem resze a default base write setnek.

### Implementation Target Decision

1. `implementable_now`: `yes`
2. A legszukebb aktualis implementation seam a canonical submit flow `write canonical submit state/artifact -> assert routeability -> recover/apply shared gate route -> finalize result` lanc, nem a removed legacy operator subtree.
3. A retained `submit` facade es a public `pairflow agent emit --kind meta_review_result` wrapper explicit parity surface, ezert a task nem allhat meg a shared submit seamnel; facade- es wrapper-szintu coverage is kotelezo.
4. `README.md` es `docs/pairflow-initial-design.md` jelen taskban nem primary write target. Docs frissites csak bizonyitott user-visible semantics delta eseten indokolt.

### Recommended Sequencing

1. Ez a task tartalmilag fuggetlen az operator read-surface closure tasktol; csak akkor kell szorosabban egyeztetni veluk, ha az `inconclusive` happy-path miatt a CLI renderer wording is modosul.
2. Az approve-advisory guidance hardening taskkal a runtime policy-layer nem fed at, de a `tests/core/bubble/metaReview.test.ts` es `tests/core/bubble/metaReviewGate.test.ts` kozos touched surface lehet, ezert merge-sorrend vagy rebase-friction miatt erdemes ugyanabban az idoszakban tudatosan koordinálni.

## L0 - Policy

### Goal

Igazitsa a `submitMetaReviewResult(...)` es a canonical `pairflow agent emit --kind meta_review_result` submit flow szemantikajat ahhoz a route-policyhoz, amit a recovery path mar tud:
1. a canonical `inconclusive` meta-review outcome valid submit eredmeny,
2. nem submit-hiba,
3. es a normal submit flow-ban `human_gate_inconclusive` route-tal `READY_FOR_HUMAN_APPROVAL` allapotba kell jusson.

Ez a task azt a konkret bugot zarja le, ahol az `inconclusive` submit elobb canonical snapshotot persistal, majd exceptionnel megall, emiatt a bubble `RUNNING` + active `meta_reviewer` limbo allapotban ragad.

### Current Behavior Anchor (2026-04-10)

1. A jelenlegi `src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts::submitMetaReviewResult(...)` flow a canonical snapshot write utan meghivja a `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts::assertSubmitRecommendationRouteable(...)` guardot, es ez ma explicitten elutasitja az `inconclusive` recommendationt.
2. Ugyanebben a flow-ban a submit mar most is a `recoverMetaReviewSubmitRoute(...)` seam-en keresztul a `recoverMetaReviewGateFromSnapshot(...)` executor fele delegal a persisted canonical snapshot route-olasahoz.
3. A shared gate policy jelenlegi canonical route-ja mar most is `resolveHumanGateRoute("inconclusive", false) -> "human_gate_inconclusive"`.
4. A submit result mar tartalmaz operator-visible route surface-et (`lifecycle_state`, `gate_route`, `gate_envelope_type`), tehat az elvart routed-success contract additive strukturaval nem igenyel uj special-case submit API-t.
5. A publikus canonical write boundary ma az actor emit wrapper-lanc: `emitMetaReviewerActorProtocolV11(...) -> emitMetaReviewActorResultV11(...) -> submitMetaReviewResultV11(...) -> submitMetaReviewResult(...)`; a legacy `pairflow bubble meta-review submit` operator surface el van tavolitva, es explicit iranyitott hibaval a canonical actor emit pathra terel.
6. A CLI clarity seam mar ma is a `buildMetaReviewSubmitHeaderLines(...)` helperen keresztul epul, ezert renderer-touch csak akkor legitim, ha a corrected routed-success utan a surfaced szoveg meg mindig ketertelmu.

### In Scope

1. A `submitMetaReviewResult(...)` normal submit szemantikajanak javitasa ugy, hogy az `inconclusive` recommendation route-olhato legyen.
2. A submit path es a recovery path recommendation->route szerzodesenek egységesitese.
3. A fel-commitolt allapot megszuntetese, ahol canonical snapshot/artifact mar letezik, de a lifecycle route nincs alkalmazva.
4. A submit-result es transcript/inbox regresszios tesztjei `inconclusive` eseten kotelezoek; a CLI/operator surface assertion csak akkor kotelezo, ha a corrected success path utan a renderelt szoveg meg mindig felreertheto.
5. A submit contract regression coverage-je a core tesztek mellett a retained v11 submit contract surface-en es a canonical actor emit wrapper parity surface-en is frissuljon.
6. A docs frissitese csak akkor szukseges, ha a user-facing `submit` szemantika vagy CLI copy tenylegesen valtozik.

### Out of Scope

1. Uj meta-review recommendation tipus vagy policy bevezetese.
2. A watchdog teljes redesignja.
3. A recovery command torlese vagy altalanos reconcile refaktor.
4. Uj operatori flag vagy ketfazisu `submit -> apply` workflow bevezetese.
5. A `rework` budget policy vagy `approve` parity policy atirasa.
6. A removed `pairflow bubble meta-review submit` operator write-surface visszahozasa vagy implicit compatibility-pathkent valo ujranyitasa.

### Safety Defaults

1. Egy active meta-review authority window alatt tovabbra is legfeljebb egy canonical submit rogzithet ugyanarra a roundra.
2. Sikeres `inconclusive` submit utan a bubble nem maradhat `RUNNING` + active `meta_reviewer` allapotban.
3. A normal submit path es a recovery path nem hasznalhat ket eltero recommendation->route szemantikat ugyanarra a canonical snapshotra.
4. Ha a canonical snapshot persist utan a gate apply vagy a pane close hibazik, az tovabbra is explicit recoverable hiba legyen; ne legyen silent success.
5. A recovery maradjon fallback, de ne legyen kotelezo masodik fazis egy legitim `inconclusive` submit utan.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - canonical `pairflow agent emit --kind meta_review_result` submit szemantika,
   - meta-review lifecycle transition semantics,
   - transcript/inbox approval-request contract,
   - status/CLI surface a submit utan lathato allapotrol.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `6`
7. `single-task allowed`: `yes`
8. Split note:
   - a scope egy bounded semantic-alignment bugfix, mert nem vezet be uj authorityt, csak a mar letezo recovery route-policyt emeli be a normal submit pathba.
9. Authority/source-of-truth note:
   - canonical source: a persisted canonical meta-review snapshot + a shared recommendation->route gate policy
   - forbidden secondary sources: submit-only special-case blacklist, watchdog-based happy-path continuation, tmux/pane megfigyelesbol levezetett route authority

### Implementation Direction

1. A bounded fix preferalt alakja: a submit path maradjon canonical snapshot write -> shared gate route apply, ne vezessen be kulon `inconclusive` side pathot.
2. Ha a recovery executor mar megfelelo parity- es duplicate-guardot ad, a submit tovabbra is hasznalhatja azt ugyanazon canonical snapshot route-olasara; a problema a blacklist/guard szemantikaja, nem feltetlenul maga a recovery-call seam.
3. A task akkor is teljesiti a contractot, ha a kozos submit/recovery finalization seam megmarad, amennyiben a normal submit happy path tobbe nem dob intentional exceptiont legitim `inconclusive` outcome-ra.
4. A CLI clarity minimuma a sikeres submit eredmenyeben a helyes `gate_route` + `lifecycle_state`; explicit magyarazo mondat csak akkor kotelezo, ha a jelenlegi renderelt szoveg regressziosan ketertelmu marad.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts` | `submitMetaReviewResult` | `submitMetaReviewResult(input: MetaReviewSubmitInput, dependencies?: MetaReviewCommandDependencies) -> Promise<MetaReviewSubmitResult>` | canonical submit success path a snapshot/artifact persist es route apply korul | `inconclusive` recommendation ne dobjon submit-hibat pusztan routeability miatt; a submit a shared gate route apply flow-val `human_gate_inconclusive` eredmenyre fusson | P1 | required-now | aktualis bug: canonical snapshot persist utan exception, limbo `RUNNING` bubble |
| CS2 | `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts` | `assertSubmitRecommendationRouteable` vagy utodja | `assertSubmitRecommendationRouteable(recommendation: MetaReviewRecommendation) -> void` | submit pre-route validation | vagy megszunik, vagy ugy szukul, hogy az `inconclusive` ne legyen tiltott normal canonical outcome | P1 | required-now | jelenleg ez tiltja a recovery altal amugy tamogatott route-ot |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts` | `resolveHumanGateRoute` | `(recommendation: MetaReviewRecommendation, budgetAvailable: boolean) -> MetaReviewGateRoute` | shared route policy | a submit path altal is ez legyen a recommendation truth, hogy `inconclusive -> human_gate_inconclusive` egyseges maradjon | P1 | required-now | recovery mar ezt hasznalja |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | `recoverMetaReviewGateFromSnapshot` | existing signature | fallback path | regressziosan meg kell maradnia annak, hogy canonical `inconclusive` snapshotbol `READY_FOR_HUMAN_APPROVAL` route keletkezik; ne legyen duplicate route append | P1 | required-now | recovery parity guard |
| CS5 | `tests/core/bubble/metaReview.test.ts` | submit tests | vitest | submit `inconclusive` coverage | a mostani "persist then reject" expectation helyett success + routed lifecycle expectation kell; a post-persist failure coverage maradjon kulon explicit recoverable branchkent | P1 | required-now | jelenlegi teszt a hibas viselkedest kodolja le |
| CS6 | `tests/core/bubble/metaReviewGate.test.ts` | recovery tests | vitest | parity/regression | bizonyitsa, hogy a normal submit semantic alignment utan a recovery route-policy valtozatlan marad | P2 | required-now | existing parity surface |
| CS7 | `tests/cli/bubbleMetaReviewCommand.test.ts` + `src/v11/application/metaReview/metaReviewCliRenderers.ts` + `src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts` | CLI submit/status rendering | dispatcher/render path | conditional operator surface | csak akkor kell renderer/assertion touch, ha a corrected success path utan a surfaced output meg mindig route-failed limbot vagy manual recovery-kotelezettseget sugall | P2 | conditional-if-needed | a jelenlegi helper mar surfacedeli a `gate_route` + `lifecycle_state` mezoket; csak bizonyitott wording-gap eseten legitim write target |
| CS8 | `src/v11/application/metaReview/emitMetaReviewV11.ts` + `tests/contracts/v11/metaReviewSubmitCoverage.test.ts` | `submitMetaReviewResultV11` facade + retained contract coverage | `submitMetaReviewResultV11(input: MetaReviewSubmitInput, dependencies?: MetaReviewCommandDependencies) -> Promise<MetaReviewSubmitResult>` | retained v11 facade / contract parity | a retained submit contract is routed success-kent kezelje a legitim `inconclusive` canonical outcome-ot, ne csak a core test surface | P2 | required-now | contract parity |
| CS9 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` + `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | `emitMetaReviewActorResultV11` + `emitMetaReviewerActorProtocolV11` | actor-emit wrapper -> `Promise<ActorEmitResultV11>` | canonical public meta-review submit wrapper | a publikus `agent emit --kind meta_review_result` path ne szukitse vissza a corrected core submit szemantikajat; legitim `inconclusive` outcome ugyanarra a routed success eredmenyre fusson | P1 | required-now | public write boundary parity |
| CS10 | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` | actor-emit wrapper parity tests | vitest | wrapper regression | explicit coverage a canonical public wrapperen, hogy `inconclusive` submit is routed success-kent jojjon vissza a bubble lifecycle allapottal egyutt | P2 | required-now | public boundary regression guard |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Canonical submit recommendation semantics | `approve`/`rework` route-olhato, `inconclusive` snapshot-persist utan exception | `approve`, `rework`, `inconclusive` mind legitim canonical submit outcome; a route policy dont a lifecycle route-rol | `bubble_id`, `round`, `recommendation`, `summary`, `report_json` | `rework_target_message`, warnings | behavior change | P1 | required-now |
| Recommendation to human-gate route mapping | submit path special-case eltér a recoverytol | shared mapping: `approve -> human_gate_approve`, `inconclusive -> human_gate_inconclusive`, `rework -> auto_rework` vagy budget-hiany eseten human gate | recommendation, budget availability, parity metadata | route diagnostics | behavior tightening | P1 | required-now |
| Submit result contract | legitim `inconclusive` submit typed hibakent ter vissza | legitim `inconclusive` submit success eredmenyt ad routed `gate_route` + `lifecycle_state` adattal | `status`, `recommendation`, `lifecycle_state`, `gate_route`, `gate_envelope_type` | warnings, report refs, `run_id` | additive/semantic correction | P1 | required-now |
| Transcript/inbox approval request | recovery pathon mar kepes `human_gate_inconclusive` envelope-ra | normal submit path is ugyanazt az `APPROVAL_REQUEST` envelope shape-et allitja elo | envelope `type=APPROVAL_REQUEST`, `latest_recommendation=inconclusive`, `meta_review_gate_route=human_gate_inconclusive` | parity metadata, findings metadata | non-breaking | P1 | required-now |
| Error contract | `inconclusive` normal submit maga submit-hiba | csak valodi route-apply / append / pane-close hiba marad submit-hiba | existing typed reason codes for post-persist failures | diagnostics | behavior tightening | P1 | required-now |
| Canonical public submit wrapper | removed legacy operator semantics felreolvashato lehet | a publikus write path explicitten az actor emit wrapper, amely a corrected core submit routed-success contractjat adja vissza | `kind=meta_review_result`, authority context, canonical submit payload | CLI wrapper metadata | behavior clarification | P1 | required-now |

Normative rules:
1. A canonical `inconclusive` meta-review outcome valid decision, nem invalid input.
2. A submit es a recovery ugyanarra a persisted canonical snapshotra nem adhat ket kulonbozo route szemantikat.
3. A "snapshot persisted but recommendation non-routeable" allapot nem maradhat letezo normal-path modell.
4. A submit path nem hozhat letre olyan intentional exceptiont, amelyet a recovery path ugyanarra az allapotra sikeres route-kent kezel.
5. A duplicate canonical submit tiltasa valtozatlanul marad.
6. A sikeres submit result surface tovabbra is a routed outcome-ot kell tukrozze; `gate_route`, `lifecycle_state` es `gate_envelope_type` nem lehet null/helyettesito erteku legitim `inconclusive` submit utan.
7. Ha a gate route apply es az approval append mar sikeresen committed, akkor a kesobbi pane-close/deactivation hiba post-commit operational failure-nek szamit: a canonical route outcome authoritative marad, es recovery/ujraprobalas nem appendelhet duplicate approval requestet ugyanarra a routed submitre.
8. A legitim `inconclusive` submit success coverage minimuma nem csak a routed allapotot, hanem az operator-visible `gate_envelope_type=APPROVAL_REQUEST` mezot is explicitten ellenorzi.
9. A canonical public write surface a `pairflow agent emit --kind meta_review_result`; a removed `pairflow bubble meta-review submit` operator nem tekintendo normativ submit contractnak ebben a taskban.
10. A canonical actor-emit wrapper nem szukitheti vissza a core-ban legitimkent kezelt `inconclusive` routed-success szemantikat.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state | canonical submit snapshot write + gate-driven lifecycle transition | canonical snapshot persist intentional limbo exceptionnel | state es route semantics maradjanak osszhangban | P1 | required-now |
| Transcript/inbox | `APPROVAL_REQUEST` append `human_gate_inconclusive` route-tal | recoveryre hagyott normal-path approval append | a normal submit maga route-oljon | P1 | required-now |
| Runtime session | meta-reviewer pane deactivation a routed submit flow vegen | active meta-reviewer ownership nyitva hagyasa sikeres `inconclusive` submit utan | pane close failure tovabbra is explicit recoverable hiba lehet, de a mar committed route/appoval append boundaryt nem nyithatja ujra | P1 | required-now |
| CLI/docs | routed allapot egyertelmu jelzese | `inconclusive` submit route-failurekent vagy "recorded but not routed" allapotkent valo kommunikacio | csak ha a corrected runtime path utan a user-visible wording tovabbra is felreertheto | P2 | conditional-if-needed |

Constraint: a normal submit path nem fugghet watchdogtol vagy explicit recovery commandtol ahhoz, hogy egy legitim `inconclusive` decision human gate-re jusson.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `recommendation=inconclusive` canonical submitben | N/A | result | route apply `human_gate_inconclusive` szerint | N/A | info | P1 | required-now |
| canonical submit mar rogzitett ugyanarra az active roundra | state store | throw | no mutation | `META_REVIEW_STATE_INVALID` | warn | P1 | required-now |
| canonical snapshot persist utan gate route apply/append hibazik | transcript/state mutation | throw | explicit recoverable failure, snapshot maradhat authoritative | existing typed submit route/apply failure surface | error | P1 | required-now |
| canonical route apply sikerult, de pane close hibazik | runtime session mutation | throw | explicit recoverable post-commit failure; a routed lifecycle state + approval request authoritative marad, recovery/ujraprobalas csak pane cleanup/deactivation jellegu lehet, uj route/appoval append nelkul | existing typed pane-close failure surface | error | P1 | required-now |
| explicit recovery mar routed `human_gate_inconclusive` outcome utan fut | recovery path | fallback | detect authoritative route outcome es ne appendeljen duplicate approval requestet | existing recovery parity guard surface | warn | P2 | required-now |
| dependency failure during docs/CLI projection | renderer/docs only | fallback | keep runtime contract primary; diagnostics may degrade, lifecycle nem | N/A | warn | P2 | conditional-if-needed |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing shared gate routing semantics (`resolveHumanGateRoute`, recovery executor) | P1 | required-now |
| must-use | existing canonical submit parity/state validation before route apply | P1 | required-now |
| must-use | existing recovery duplicate-route guards es human gate persistence helpers | P1 | required-now |
| must-not-use | submit-only `inconclusive` blacklist, ha a recovery ugyanazt az outcome-ot legitimnek kezeli | P1 | required-now |
| must-not-use | watchdog mint normal-path continuation authority | P1 | required-now |
| must-not-use | kulon `inconclusive` submit side channel vagy special CLI flag | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Inconclusive submit routes to human gate | bubble `RUNNING` active `meta_reviewer` authorityval, canonical `inconclusive` payload | `submitMetaReviewResult(...)` fut | success eredmeny, `gate_route=human_gate_inconclusive`, `lifecycle_state=READY_FOR_HUMAN_APPROVAL`, `gate_envelope_type=APPROVAL_REQUEST` | P1 | required-now | automated test |
| T2 | Inconclusive submit appends approval request | ugyanaz mint T1 | submit fut | transcript/inbox kap `APPROVAL_REQUEST` envelope-ot envelope `type=APPROVAL_REQUEST`, `latest_recommendation=inconclusive` es `meta_review_gate_route=human_gate_inconclusive` metadata-val | P1 | required-now | automated test |
| T3 | Old broken expectation removed | current fixture ami ma "persist then reject" teszt | submit fut | a teszt mar nem exceptiont, hanem routed success-t var | P1 | required-now | automated test |
| T4 | Approve path unchanged | valid approve submit fixture | submit fut | approve tovabbra is human approval gate-re route-ol regresszio nelkul | P1 | required-now | automated test |
| T5 | Rework path unchanged | valid rework submit fixture | submit fut | existing auto-rework / budget semantics valtozatlan marad | P1 | required-now | automated test |
| T6 | Recovery parity remains consistent | canonical `inconclusive` snapshot recovery fixture | `recoverMetaReviewGateFromSnapshot(...)` fut | recovery tovabbra is `human_gate_inconclusive` route-ra jut | P1 | required-now | automated test |
| T7 | Post-persist route failure stays recoverable | injected failure a snapshot persist utan, route apply vagy append kozben | submit fut | explicit typed failure, de nem recommendation-blacklist miatt; recovery kesobb deterministicen befejezheto | P1 | required-now | automated test |
| T8 | No duplicate approval request after fallback recovery | routed vagy reszben routed `inconclusive` fixture | recovery explicit fut | nincs duplicate `APPROVAL_REQUEST` ugyanarra a roundra/handoffra | P2 | required-now | automated test |
| T9 | CLI/operator output clarity | successful `inconclusive` submit, es a runtime-fix utan a renderer-szoveg meg mindig potencialisan felreertheto | CLI render fut | output nem sugall hibas limbot vagy manual recovery-kotelezettseget normal-path success eseten; minimum a routed `gate_route` + `lifecycle_state` olvashato | P2 | conditional-if-needed | automated test or renderer assertion |
| T10 | Retained submit contract parity | successful `inconclusive` submit a retained facade surface-en | contract coverage fut | a retained submit contract is success-kent adja vissza a routed outcome-ot (`human_gate_inconclusive`, `READY_FOR_HUMAN_APPROVAL`, `gate_envelope_type=APPROVAL_REQUEST`) | P2 | required-now | automated test |
| T11 | Pane-close failure stays post-commit only | route apply + approval append mar committed, de pane deactivation hibara van injektalt fixture | submit fut, majd recovery/ujraprobalas surface vizsgalodik | a typed hiba explicit marad, de a mar committed routed outcome authoritative marad es nincs duplicate approval append | P2 | required-now | automated test |
| T12 | Canonical actor emit wrapper parity | active meta-review authority + legitim `inconclusive` payload a public actor emit wrapperen keresztul | `emitMetaReviewerActorProtocolV11(...)` vagy outer actor emit dispatcher fut | a visszaadott `meta_review_result` routed success marad (`human_gate_inconclusive`, `READY_FOR_HUMAN_APPROVAL`, `gate_envelope_type=APPROVAL_REQUEST`) | P2 | required-now | automated test |

## Acceptance Criteria

1. AC1: A canonical `inconclusive` meta-review outcome normal submit pathon valid route-olhato decision.
2. AC2: A submit es a recovery ugyanazt a recommendation->route szemantikat hasznalja `inconclusive` eseten.
3. AC3: A bubble nem marad intentional `RUNNING` + active `meta_reviewer` limbo allapotban egy sikeres `inconclusive` submit utan.
4. AC4: A mostani "persist then reject" tesztelvart viselkedes megszunik, helyette routed success lesz a canonical expectation.
5. AC5: A post-persist valodi route/apply/pane-close hibak explicit recoverable hibak maradnak.
6. AC6: A retained submit contract surface is ugyanazt a routed-success szemantikat tukrozi legitim `inconclusive` canonical outcome-ra.
7. AC7: A sikeres route/appoval append utan bekovetkezo pane-close hiba explicit post-commit operational failure marad, es nem nyithatja ujra a gate mutationt vagy az approval appendet.
8. AC8: A legitim `inconclusive` submit success path explicitten bizonyitja a `gate_envelope_type=APPROVAL_REQUEST` surfaced mezot a core es retained submit coverage-ben.
9. AC9: A canonical public actor emit submit wrapper is ugyanazt a routed-success szemantikat tukrozi legitim `inconclusive` canonical outcome-ra, mint a corrected core submit seam.
10. AC10: Az existing `approve` es `rework` submit pathok regresszio nelkul valtozatlan route-semantikaval maradnak a bounded `inconclusive` alignment mellett.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2, CS3 | T1, T2, T3 |
| AC2 | CS1, CS3, CS4 | T6 |
| AC3 | CS1, CS2 | T1, T3 |
| AC4 | CS5 | T3 |
| AC5 | CS1, CS4 | T7, T8, T11 |
| AC6 | CS1, CS8 | T10 |
| AC7 | CS1, CS4 | T8, T11 |
| AC8 | CS1, CS5, CS8 | T1, T10 |
| AC9 | CS1, CS9, CS10 | T12 |
| AC10 | CS1, CS3, CS4 | T4, T5 |

Megjegyzes: `CS7` / `T9` csak akkor aktiv kotelezettseg, ha a corrected runtime path utan a retained CLI renderer wording tenylegesen felreertheto marad.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Erdemes kuloniteni a "pre-persist validation" es a "post-persist route reconciliation" boundaryt, hogy hasonlo fel-commitolt state tobbe ne keletkezhessen mas recommendation pathokon sem.
2. [later-hardening] A submit es a recovery kozos mutation-finalization seame kesobb tovabb egyszerusitheto, hogy a happy path ne "recover"-t hivjon szemantikailag.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Submit/recovery finalization seam cleanup | L2 | P2 | later-hardening | current analysis | nevezze at es szukitse a kozos reconcile/finalize engine-t, hogy a happy path ne recovery-fogalmon fusson |
| H2 | Additional crash-injection matrix around post-persist failures | L2 | P2 | later-hardening | resilience follow-up | bovitse a submit coverage-t append-failure, state-conflict es pane-close race esetekre |
| H3 | Expanded pane-close post-commit crash matrix | L2 | P2 | later-hardening | reviewer follow-up | a required-now T11 baseline utan tovabbi variansok rogzitese retry/order/race permutaciokra |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. P1 regresszio, ha `inconclusive` submit tovabbra is intentional exceptionnel all meg a canonical snapshot persist utan.
3. P1 regresszio, ha a submit es a recovery route-policy tovabbra is elter ugyanarra a recommendationre.
4. P1 regresszio, ha sikeres `inconclusive` submit utan a bubble normal-pathban `RUNNING` allapotban marad.
5. `contract_boundary_override=yes`, ezert a `plan_ref` kotelezo es a submit/lifecycle sorokkal osszhangban kell maradjon.

## Assumptions

1. A recovery oldali `human_gate_inconclusive` route mar a kivant canonical szemantikat kepviseli.
2. A user-facing `submit` surface szemantikai pontositasa belefer a jelenlegi Phase E actor-runtime cleanup iranyba.

## Decision Guidance (Non-Blocking)

1. Default operator clarity baseline: a routed `lifecycle_state` + `gate_route` elegendo minimum contract.
2. Kulon explicit magyarazo mondat csak akkor javasolt, ha a renderer/assertion review szerint a jelenlegi text meg mindig recovery-kotelezettseget vagy limbot sugallna.
3. A removed `pairflow bubble meta-review submit` operator nem ujranyitando target; a task public boundaryje a canonical actor emit wrapper.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. az `inconclusive` submit normal routed outcome lesz,
2. a submit es recovery route-policyja egyezik,
3. a limbo allapot megszunik,
4. a retained submit contract surface is ezt a routed-success szemantikat tukrozi,
5. a legitim `inconclusive` success path explicitten mutatja a `gate_envelope_type=APPROVAL_REQUEST` surfaced mezot,
6. a route apply + approval append utan bekovetkezo pane-close/deactivation hiba explicit post-commit operational failure marad, es recovery/ujraprobalas nem appendelhet duplicate approval requestet ugyanarra a routed submitre,
7. a canonical public actor emit wrapper is ugyanezt a routed-success szemantikat tukrozi,
8. es a post-persist valodi hibak tovabbra is explicit recoverable hibak maradnak.
