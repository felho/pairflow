---
artifact_type: task
artifact_id: task_protocol_first_meta_review_runtime_decoupling_phase1_v1
title: "Protocol-First Meta-Review Runtime Decoupling (Phase 1)"
status: implementable
phase: phase1
target_files:
  - "src/v11/shared/metaReviewGate/metaReviewGateApply.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateApplyRunRouting.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateNotify.ts"
  - "src/v11/shared/watchdog/watchdogMetaReviewRouting.ts"
  - "src/core/bubble/metaReview.ts"
  - "tests/cli/bubbleMetaReviewCommand.test.ts"
  - "tests/contracts/v11/converged.contract.test.ts"
  - "tests/contracts/v11/converged.contract.runner.ts"
  - "tests/contracts/v11/cases/converged/"
  - "tests/contracts/v11/metaReviewGate.contract.test.ts"
  - "tests/contracts/v11/metaReviewGate.contract.runner.ts"
  - "tests/contracts/v11/cases/meta-review-gate/"
  - "tests/contracts/v11/pass.contract.test.ts"
  - "tests/contracts/v11/pass.contract.runner.ts"
  - "tests/contracts/v11/cases/pass/"
  - "tests/core/bubble/metaReviewGate.test.ts"
  - "tests/core/bubble/metaReview.test.ts"
  - "tests/core/bubble/watchdogBubble.test.ts"
prd_ref: null
plan_ref: plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Protocol-First Meta-Review Runtime Decoupling (Phase 1)

## L0 - Policy

### Goal

Megszuntetni azt a domain-szintu couplingot, amelyben a meta-review gate aktivacioja pusztan tmux/pane delivery bizonytalansag miatt `META_REVIEW_FAILED` allapotba eshet.

Phase 1 celja nem a teljes state machine atirasa, hanem az elso elvu boundary helyreallitasa:
1. a durable handoff legyen a domain authority,
2. a runtime delivery bizonytalansag kulon observability signal legyen,
3. a timeout csak hianyzo durable eredmeny alapjan routoljon.

### In Scope

1. A meta-review gate activation flow olyan atalakítása, hogy a durable TASK append utan a delivery uncertainty ne okozzon fail-closed routingot.
2. A meta-review notify path error-semantikajanak szetvalasztasa domain error es runtime uncertainty kategoriakra.
3. Watchdog authority pontositasa: timeout akkor route-oljon, ha nincs durable accepted meta-review result a hataridoig.
4. Tesztlefedett compatibility behavior, amely megtartja a jelenlegi surface-et, de megszunteti a hamis interim `META_REVIEW_FAILED` esetet.

### Out of Scope

1. A teljes bubble lifecycle state machine altalanos `RUNNING(active_role=...)` modellre migracioja.
2. A canonical `meta_review_result` envelope bevezetese.
3. Az actor-facing CLI/protocol surface altalanositasa es a role-specifikus actor commandok (`pass`, `converged`, `ask-human`, `bubble meta-review submit`) kivezetese.
4. Az `orchestra` actor-command alias surface kivezetese.
5. Implementer/reviewer delivery flow attervezese.

### Safety Defaults

1. Ha durable meta-review TASK mar appendelve lett, a bubble ne routoljon `META_REVIEW_FAILED` allapotba pusztan notify/delivery uncertainty miatt.
2. Ha durable TASK append nem sikerul, a meta-review gate ne maradjon reszben aktivalt allapotban.
3. Ha timeoutig nem erkezik durable accepted meta-review result, a timeout route maradhat fail-closed.
4. Ha runtime signal bizonytalan, azt kulon diagnosztikai warningkent kell kezelni, nem clean successkent.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - belso event/message workflow contract a meta-review handoff authority sorrendjeben,
   - state/runtime boundary contract,
   - watchdog timeout semantics.

### Terminology Lock

1. `durable handoff` = transcript/inbox szinten appendelt tartos handoff envelope.
2. `runtime uncertainty` = olyan transport-level allapot, ahol a handoff kezbesitesenek tmux-confirmationje bizonytalan, de durable handoff mar letezik.
3. `domain failure` = olyan workflow-level hiba, ahol a bubble state transition explicit fail-safe vagy timeout policybol kovetkezik.
4. `timeout authority` = az a szabaly, hogy a vart durable eredmeny hianya, es nem a delivery uncertainty a timeout route alapja.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` | meta-review gate activation | `applyMetaReviewGateOnConvergence(input, dependencies?) -> Promise<MetaReviewGateResult>` | `stageMetaReviewRunningState(...)` utan, notify route elott/utan | durable TASK append utan a notify uncertainty nem routolhat `human_gate_run_failed`-ra; a bubble `META_REVIEW_RUNNING` allapotban marad | P1 | required-now | megfigyelt interim failed state |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateApplyRunRouting.ts` | durable TASK append boundary | `routeMetaReviewKickoffOrRunFailed(input) -> Promise<MetaReviewGateResult>` | TASK append es fallback route kapcsolata | a domain authority a durable TASK append legyen; append failure rollback/fail maradhat, de append success utan a kesobbi notify uncertainty ne okozzon fail route-ot | P1 | required-now | elso elvu boundary |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateNotify.ts` | meta-review notify runtime signal | `notifyMetaReviewerSubmissionRequest(input, dependencies?) -> Promise<void>` vagy kompatibilis runtime status visszaadas | tmux capture/marker confirm path | a notify path ne dobjon olyan domain-ertelmu hibat, amelybol a gate activation fail route-ot vezet le, ha a durable TASK mar appendelve van | P1 | required-now | notify heurisztika tranziense |
| CS4 | `src/v11/shared/watchdog/watchdogMetaReviewRouting.ts` | timeout authority | `maybeRouteMetaReviewOnExpiry(input) -> Promise<BubbleWatchdogResult | null>` | timeout route trigger | timeout route only akkor aktiv, ha nincs durable, active-windowben ervenyes accepted meta-review result | P1 | required-now | timeout semantics |
| CS5 | `src/core/bubble/metaReview.ts` | submit acceptance and routing | `submitMetaReviewResult(input, dependencies?) -> Promise<MetaReviewSubmitResult>` | `META_REVIEW_RUNNING` submit path | uncertain delivery utan is a valid active meta-review run submitja normalisan routolhato legyen, ha a state context meg aktiv es a round egyezik | P1 | required-now | false failed state utan is tovabbfuto reviewer jelenseg |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review activation authority | state staging + notify confirmation implicit coupling | durable TASK append az authority; notify csak runtime signal | `bubble_id`, `round`, durable TASK envelope id/sequence | runtime warning metadata | internal, compatibility-preserving | P1 | required-now |
| Notify output semantics | throw-based failure semantics keveredik domain route-tal | runtime signal `confirmed|uncertain|failed` jelleggel, domain route authority nelkul | `target_pane`, reason/status | debug context | internal, compatibility-preserving | P1 | required-now |
| Timeout authority | reszben transport/path-dependent | only missing durable accepted meta-review result in active window | active round, active window timestamp, durable accepted result presence | runtime liveness notes | internal, compatibility-preserving | P1 | required-now |
| Submit acceptance | interim failed state blokkolhat valid submitot | active meta-review execution context mellett a valid submit route-olhato maradjon | `round`, current execution state, durable submit payload | diagnostics | internal, compatibility-preserving | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Transcript/inbox | durable meta-review TASK append, durable approval/timeout route append | domain route append pusztan marker-presence vagy marker-hiany alapjan | append success utan a workflow authority mar a transcript | P1 | required-now |
| Runtime sessions | pane binding aktiv/inaktiv jelzese, runtime warning surface | pane binding failurebol kozvetlen domain fail route | runtime warning kulon observability lane | P1 | required-now |
| Watchdog | durable result hianyaban timeout route | delivery uncertainty alapjan elozetes fail route | timeout authority protocol-first | P1 | required-now |
| Logging/metrics | runtime uncertainty emit | runtime uncertainty clean successkent elnyelese | warning lane kotelezo | P2 | required-now |

Constraint: a tmux marker/capture tartalom nem lehet domain authority.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| meta-review TASK append sikertelen | transcript append | throw | state restore / fail route a jelenlegi fail-safe policy szerint | `META_REVIEW_GATE_TRANSITION_INVALID` vagy meglevo append-failure family | error | P1 | required-now |
| notify uncertain a durable TASK append utan | tmux/pane runtime | fallback | `META_REVIEW_RUNNING` marad; runtime uncertainty warning emit | `META_REVIEW_REQUEST_DELIVERY_UNCERTAIN` | warn | P1 | required-now |
| pane binding unavailable a durable TASK append utan | runtime session registry | fallback | `META_REVIEW_RUNNING` marad; operator/runtime warning emit; restart/reconcile utalvany engedett | `META_REVIEWER_PANE_UNAVAILABLE` | warn | P1 | required-now |
| durable accepted result hianyzik timeoutig | transcript/state | result | timeout route current fail-safe policy szerint | `META_REVIEW_TIMEOUT_NO_RESULT` | error | P1 | required-now |
| valid submit erkezik uncertain activation utan | active meta-review state + submit payload | result | normal recovery/routing path | none | info | P1 | required-now |
| stale/cross-round submit | state/round mismatch | throw | state unchanged | `META_REVIEW_ROUND_MISMATCH` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | durable transcript append mint activation authority; active-round submit validation; watchdog active-window result check | P1 | required-now |
| must-not-use | tmux marker presence/hianya domain fail route authoritykent | P1 | required-now |
| must-not-use | notify uncertainty -> `META_REVIEW_FAILED` kozvetlen routing | P1 | required-now |
| must-not-use | restart/recovery scrollback-only allapotrekonstrukcio domain truthkent | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | notify false negative after durable TASK append | meta-review gate TASK append sikeres, notify path uncertain/error | activation flow lefut | bubble `META_REVIEW_RUNNING` marad; nincs `human_gate_run_failed` | P1 | required-now | megfigyelt transient bug |
| T2 | pane binding unavailable but durable activation preserved | runtime session/pane binding unavailable, durable TASK mar appendelheto | activation flow lefut | bubble `META_REVIEW_RUNNING` marad, runtime warning surface keletkezik | P1 | required-now | transport != domain failure |
| T3 | durable TASK append failure | append hibaval megall | activation flow | rollback/fail-safe route; bubble nem marad hamis aktiv allapotban | P1 | required-now | durable authority boundary |
| T4 | successful meta-review submit after uncertain activation | bubble aktiv meta-review contextben van, korabbi notify uncertain volt | valid submit erkezik ugyanarra a roundra | route normalisan `READY_FOR_HUMAN_APPROVAL` vagy auto-rework pathra megy | P1 | required-now | reviewer tovabbfutasi jelenseg kezelese |
| T5 | timeout only from missing durable result | activation sikeres, de nincs durable accepted meta-review result active windowben | watchdog deadline lejar | timeout route aktiv, fail-safe policy szerint | P1 | required-now | protocol-first timeout authority |
| T6 | durable accepted result inside active window blocks timeout | aktiv meta-review context + durable accepted meta-review result active windowben | watchdog timeout elott/utan fut | nincs false timeout route | P1 | required-now | existing good-path parity |
| T7 | stale result outside active window | regi durable accepted meta-review result van, aktualis activation uj active windowvel fut | watchdog fut | stale result nem ved meg az aktualis futast a timeouttol | P2 | required-now | active-window integrity |
| T8 | contract corpus no longer encodes fail-closed notify path as baseline | converged / meta-review-gate / repeat-clean autoconverge contract cases jelenleg `human_gate_run_failed` vagy `META_REVIEW_FAILED` baseline-ra epulnek | Phase 1 semanticsre frissitett contract suite fut | a Phase 1 altal erintett contract fixture-ok es runner expectationok az uj non-fail-closed authorityt tukrozik | P1 | required-now | jelenlegi contract corpus drift |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Phase 1-ben elfogadhato egy compatibility adapter, amely megtartja a jelenlegi `META_REVIEW_RUNNING` state nevet, mikozben a domain authority mar durable handoff alapra kerul.
2. [later-hardening] A runtime warning surface lehet artifact, metric vagy status-view extension, de ne legyen uj domain envelope kotelezo Phase 1-ben.
3. [later-hardening] Ha a notify API statuszt ad vissza, azt erdemes altalanos delivery runtime contract iranyaba elmozdithato formaban kialakitani.

## Assumptions

1. A bubble jelenlegi compatibility surface-e Phase 1-ben meg megtarthato, ha a hamis `META_REVIEW_FAILED` route megszunik.
2. A watchdog mar eleg kozel van a protocol-first timeout authorityhoz; itt foleg a trigger authority tisztazasa kell.
3. A Phase 1 task nem koveteli meg a teljes envelope taxonomy ujranevezeset.

## Open Questions

1. No blocking open questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Generic delivery status contract minden actorra | L2 | P2 | later-hardening | target architecture | Phase 2-ben altalanositsuk `confirmed|uncertain|failed` runtime signalra |
| H2 | Generic actor-facing CLI/protocol surface kialakitasa es actor-specifikus command retirement | L2 | P2 | later-hardening | target architecture | Phase 3 kulon task |
| H3 | Legacy `META_REVIEW_*`, approval compatibility es UI/state cleanup | L2 | P2 | later-hardening | target architecture | Phase 4 kulon task |
| H4 | Contract corpus es CLI help/guidance teljes legacy cleanupja | L2 | P2 | later-hardening | target architecture | Phase 4-ben szedjuk ki a mar csak compatibility miatt megtartott wordinget es fixture-maradekokat |

## Review Control

1. A task nem terjeszkedhet teljes state machine rewrite iranyba ugyanebben a korben.
2. A task akkor jo, ha a transport uncertaintyt kiszedi a domain fail route authoritybol.
3. Uj `required-now` csak akkor johet be, ha a protocol-first boundary megtartasahoz kozvetlenul kell.
4. A Phase 1 implementacio nem hozhat uj scrollback- vagy marker-alapu authorityt masik neven.
5. Minden tesztnek explicit modon bizonyitania kell, hogy a domain timeout authority durable result-hianyon alapul.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
