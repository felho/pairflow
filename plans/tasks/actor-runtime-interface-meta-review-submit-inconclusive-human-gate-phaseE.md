---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_submit_inconclusive_human_gate_phaseE_v1
title: "Actor Runtime Interface Meta-Review Submit Inconclusive Human-Gate Alignment (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/core/bubble/metaReview.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - README.md
  - docs/pairflow-initial-design.md
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Submit Inconclusive Human-Gate Alignment (Phase E)

## L0 - Policy

### Goal

Igazitsa a `submitMetaReviewResult(...)` es a `pairflow bubble meta-review submit` szemantikajat ahhoz a route-policyhoz, amit a recovery path mar tud:
1. a canonical `inconclusive` meta-review outcome valid submit eredmeny,
2. nem submit-hiba,
3. es a normal submit flow-ban `human_gate_inconclusive` route-tal `READY_FOR_HUMAN_APPROVAL` allapotba kell jusson.

Ez a task azt a konkret bugot zarja le, ahol az `inconclusive` submit elobb canonical snapshotot persistal, majd exceptionnel megall, emiatt a bubble `RUNNING` + active `meta_reviewer` limbo allapotban ragad.

### In Scope

1. A `submitMetaReviewResult(...)` normal submit szemantikajanak javitasa ugy, hogy az `inconclusive` recommendation route-olhato legyen.
2. A submit path es a recovery path recommendation->route szerzodesenek egységesitese.
3. A fel-commitolt allapot megszuntetese, ahol canonical snapshot/artifact mar letezik, de a lifecycle route nincs alkalmazva.
4. A submit-result, transcript/inbox es CLI surface regresszios tesztjei `inconclusive` eseten.
5. A docs frissitese, ha a user-facing `submit` szemantika valtozasa dokumentacios pontositast igenyel.

### Out of Scope

1. Uj meta-review recommendation tipus vagy policy bevezetese.
2. A watchdog teljes redesignja.
3. A recovery command torlese vagy altalanos reconcile refaktor.
4. Uj operatori flag vagy ketfazisu `submit -> apply` workflow bevezetese.
5. A `rework` budget policy vagy `approve` parity policy atirasa.

### Safety Defaults

1. Egy active meta-review authority window alatt tovabbra is legfeljebb egy canonical submit rogzithet ugyanarra a roundra.
2. Sikeres `inconclusive` submit utan a bubble nem maradhat `RUNNING` + active `meta_reviewer` allapotban.
3. A normal submit path es a recovery path nem hasznalhat ket eltero recommendation->route szemantikat ugyanarra a canonical snapshotra.
4. Ha a canonical snapshot persist utan a gate apply vagy a pane close hibazik, az tovabbra is explicit recoverable hiba legyen; ne legyen silent success.
5. A recovery maradjon fallback, de ne legyen kotelezo masodik fazis egy legitim `inconclusive` submit utan.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - `pairflow bubble meta-review submit` operator szemantika,
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

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReview.ts` | `submitMetaReviewResult` | `submitMetaReviewResult(input: MetaReviewSubmitInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewSubmitResult>` | canonical submit success path a snapshot/artifact persist es route apply korul | `inconclusive` recommendation ne dobjon submit-hibat pusztan routeability miatt; a submit a shared gate route apply flow-val `human_gate_inconclusive` eredmenyre fusson | P1 | required-now | aktualis bug: canonical snapshot persist utan exception, limbo `RUNNING` bubble |
| CS2 | `src/core/bubble/metaReview.ts` | `assertSubmitRecommendationRouteable` vagy utodja | helper -> `void` | submit pre-route validation | vagy megszunik, vagy ugy szukul, hogy az `inconclusive` ne legyen tiltott normal canonical outcome | P1 | required-now | jelenleg ez tiltja a recovery altal amugy tamogatott route-ot |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts` | `resolveHumanGateRoute` | `(recommendation: MetaReviewRecommendation, budgetAvailable: boolean) -> MetaReviewGateRoute` | shared route policy | a submit path altal is ez legyen a recommendation truth, hogy `inconclusive -> human_gate_inconclusive` egyseges maradjon | P1 | required-now | recovery mar ezt hasznalja |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | `recoverMetaReviewGateFromSnapshot` | existing signature | fallback path | regressziosan meg kell maradnia annak, hogy canonical `inconclusive` snapshotbol `READY_FOR_HUMAN_APPROVAL` route keletkezik; ne legyen duplicate route append | P1 | required-now | recovery parity guard |
| CS5 | `tests/core/bubble/metaReview.test.ts` | submit tests | vitest | submit `inconclusive` coverage | a mostani "persist then reject" expectation helyett success + routed lifecycle expectation kell | P1 | required-now | jelenlegi teszt a hibas viselkedest kodolja le |
| CS6 | `tests/core/bubble/metaReviewGate.test.ts` | recovery tests | vitest | parity/regression | bizonyitsa, hogy a normal submit semantic alignment utan a recovery route-policy valtozatlan marad | P2 | required-now | existing parity surface |
| CS7 | `tests/cli/bubbleMetaReviewCommand.test.ts` + CLI renderer files | CLI submit/status rendering | dispatcher/render path | operator surface | a submit eredmeny es a kovetkezo bubble allapot ne sugalljon route-failed limbot legitim `inconclusive` esetben | P2 | required-now | operator clarity |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Canonical submit recommendation semantics | `approve`/`rework` route-olhato, `inconclusive` snapshot-persist utan exception | `approve`, `rework`, `inconclusive` mind legitim canonical submit outcome; a route policy dont a lifecycle route-rol | `bubble_id`, `round`, `recommendation`, `summary`, `report_json` | `rework_target_message`, warnings | behavior change | P1 | required-now |
| Recommendation to human-gate route mapping | submit path special-case eltér a recoverytol | shared mapping: `approve -> human_gate_approve`, `inconclusive -> human_gate_inconclusive`, `rework -> auto_rework` vagy budget-hiany eseten human gate | recommendation, budget availability, parity metadata | route diagnostics | behavior tightening | P1 | required-now |
| Submit result contract | legitim `inconclusive` submit typed hibakent ter vissza | legitim `inconclusive` submit success eredmenyt ad routed `gate_route` + `lifecycle_state` adattal | `status`, `recommendation`, `lifecycle_state`, `gate_route` | warnings, report refs | additive/semantic correction | P1 | required-now |
| Transcript/inbox approval request | recovery pathon mar kepes `human_gate_inconclusive` envelope-ra | normal submit path is ugyanazt az `APPROVAL_REQUEST` envelope shape-et allitja elo | `latest_recommendation=inconclusive`, `meta_review_gate_route=human_gate_inconclusive` | parity metadata, findings metadata | non-breaking | P1 | required-now |
| Error contract | `inconclusive` normal submit maga submit-hiba | csak valodi route-apply / append / pane-close hiba marad submit-hiba | existing typed reason codes for post-persist failures | diagnostics | behavior tightening | P1 | required-now |

Normative rules:
1. A canonical `inconclusive` meta-review outcome valid decision, nem invalid input.
2. A submit es a recovery ugyanarra a persisted canonical snapshotra nem adhat ket kulonbozo route szemantikat.
3. A "snapshot persisted but recommendation non-routeable" allapot nem maradhat letezo normal-path modell.
4. A submit path nem hozhat letre olyan intentional exceptiont, amelyet a recovery path ugyanarra az allapotra sikeres route-kent kezel.
5. A duplicate canonical submit tiltasa valtozatlanul marad.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state | canonical submit snapshot write + gate-driven lifecycle transition | canonical snapshot persist intentional limbo exceptionnel | state es route semantics maradjanak osszhangban | P1 | required-now |
| Transcript/inbox | `APPROVAL_REQUEST` append `human_gate_inconclusive` route-tal | recoveryre hagyott normal-path approval append | a normal submit maga route-oljon | P1 | required-now |
| Runtime session | meta-reviewer pane deactivation a routed submit flow vegen | active meta-reviewer ownership nyitva hagyasa sikeres `inconclusive` submit utan | pane close failure tovabbra is explicit recoverable hiba lehet | P1 | required-now |
| CLI/docs | routed allapot egyertelmu jelzese | `inconclusive` submit route-failurekent vagy "recorded but not routed" allapotkent valo kommunikacio | csak ha user-visible semantics valtozik | P2 | required-now |

Constraint: a normal submit path nem fugghet watchdogtol vagy explicit recovery commandtol ahhoz, hogy egy legitim `inconclusive` decision human gate-re jusson.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `recommendation=inconclusive` canonical submitben | N/A | result | route apply `human_gate_inconclusive` szerint | N/A | info | P1 | required-now |
| canonical submit mar rogzitett ugyanarra az active roundra | state store | throw | no mutation | `META_REVIEW_STATE_INVALID` | warn | P1 | required-now |
| canonical snapshot persist utan gate route apply/append hibazik | transcript/state mutation | throw | explicit recoverable failure, snapshot maradhat authoritative | existing typed submit route/apply failure surface | error | P1 | required-now |
| canonical route apply sikerult, de pane close hibazik | runtime session mutation | throw | explicit recoverable failure; ne route-oljon ujra recovery | existing typed pane-close failure surface | error | P1 | required-now |
| explicit recovery mar routed `human_gate_inconclusive` outcome utan fut | recovery path | fallback | detect authoritative route outcome es ne appendeljen duplicate approval requestet | existing recovery parity guard surface | warn | P2 | required-now |
| dependency failure during docs/CLI projection | renderer/docs only | fallback | keep runtime contract primary; diagnostics may degrade, lifecycle nem | N/A | warn | P2 | required-now |

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
| T1 | Inconclusive submit routes to human gate | bubble `RUNNING` active `meta_reviewer` authorityval, canonical `inconclusive` payload | `submitMetaReviewResult(...)` fut | success eredmeny, `gate_route=human_gate_inconclusive`, `lifecycle_state=READY_FOR_HUMAN_APPROVAL` | P1 | required-now | automated test |
| T2 | Inconclusive submit appends approval request | ugyanaz mint T1 | submit fut | transcript/inbox kap `APPROVAL_REQUEST` envelope-ot `latest_recommendation=inconclusive` es `meta_review_gate_route=human_gate_inconclusive` metadata-val | P1 | required-now | automated test |
| T3 | Old broken expectation removed | current fixture ami ma "persist then reject" teszt | submit fut | a teszt mar nem exceptiont, hanem routed success-t var | P1 | required-now | automated test |
| T4 | Approve path unchanged | valid approve submit fixture | submit fut | approve tovabbra is human approval gate-re route-ol regresszio nelkul | P1 | required-now | automated test |
| T5 | Rework path unchanged | valid rework submit fixture | submit fut | existing auto-rework / budget semantics valtozatlan marad | P1 | required-now | automated test |
| T6 | Recovery parity remains consistent | canonical `inconclusive` snapshot recovery fixture | `recoverMetaReviewGateFromSnapshot(...)` fut | recovery tovabbra is `human_gate_inconclusive` route-ra jut | P1 | required-now | automated test |
| T7 | Post-persist route failure stays recoverable | injected failure a snapshot persist utan, route apply vagy append kozben | submit fut | explicit typed failure, de nem recommendation-blacklist miatt; recovery kesobb deterministicen befejezheto | P1 | required-now | automated test |
| T8 | No duplicate approval request after fallback recovery | routed vagy reszben routed `inconclusive` fixture | recovery explicit fut | nincs duplicate `APPROVAL_REQUEST` ugyanarra a roundra/handoffra | P2 | required-now | automated test |
| T9 | CLI/operator output clarity | successful `inconclusive` submit | CLI render fut | output nem sugall hibas limbot vagy manual recovery-kotelezettseget normal-path success eseten | P2 | required-now | automated test or renderer assertion |

## Acceptance Criteria

1. AC1: A canonical `inconclusive` meta-review outcome normal submit pathon valid route-olhato decision.
2. AC2: A submit es a recovery ugyanazt a recommendation->route szemantikat hasznalja `inconclusive` eseten.
3. AC3: A bubble nem marad intentional `RUNNING` + active `meta_reviewer` limbo allapotban egy sikeres `inconclusive` submit utan.
4. AC4: A mostani "persist then reject" tesztelvart viselkedes megszunik, helyette routed success lesz a canonical expectation.
5. AC5: A post-persist valodi route/apply/pane-close hibak explicit recoverable hibak maradnak.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2, CS3 | T1, T2, T3 |
| AC2 | CS1, CS3, CS4 | T6 |
| AC3 | CS1, CS7 | T1, T9 |
| AC4 | CS5 | T3 |
| AC5 | CS1, CS4 | T7, T8 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Erdemes kuloniteni a "pre-persist validation" es a "post-persist route reconciliation" boundaryt, hogy hasonlo fel-commitolt state tobbe ne keletkezhessen mas recommendation pathokon sem.
2. [later-hardening] A submit es a recovery kozos mutation-finalization seame kesobb tovabb egyszerusitheto, hogy a happy path ne "recover"-t hivjon szemantikailag.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Submit/recovery finalization seam cleanup | L2 | P2 | later-hardening | current analysis | nevezze at es szukitse a kozos reconcile/finalize engine-t, hogy a happy path ne recovery-fogalmon fusson |
| H2 | Additional crash-injection matrix around post-persist failures | L2 | P2 | later-hardening | resilience follow-up | bovitse a submit coverage-t append-failure, state-conflict es pane-close race esetekre |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. P1 regresszio, ha `inconclusive` submit tovabbra is intentional exceptionnel all meg a canonical snapshot persist utan.
3. P1 regresszio, ha a submit es a recovery route-policy tovabbra is elter ugyanarra a recommendationre.
4. P1 regresszio, ha sikeres `inconclusive` submit utan a bubble normal-pathban `RUNNING` allapotban marad.
5. `contract_boundary_override=yes`, ezert a `plan_ref` kotelezo es a submit/lifecycle sorokkal osszhangban kell maradjon.

## Assumptions

1. A recovery oldali `human_gate_inconclusive` route mar a kivant canonical szemantikat kepviseli.
2. A user-facing `submit` surface szemantikai pontositasa belefer a jelenlegi Phase E actor-runtime cleanup iranyba.

## Open Questions (Non-Blocking)

1. A CLI outputban eleg-e a routed `lifecycle_state` + `gate_route`, vagy erdemes kulon explicit mondatot is adni arra, hogy az `inconclusive` submit human gate-re kerult?

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. az `inconclusive` submit normal routed outcome lesz,
2. a submit es recovery route-policyja egyezik,
3. a limbo allapot megszunik,
4. es a post-persist valodi hibak tovabbra is explicit recoverable hibak maradnak.
