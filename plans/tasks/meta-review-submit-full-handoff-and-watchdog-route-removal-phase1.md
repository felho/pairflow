---
artifact_type: task
artifact_id: task_meta_review_submit_full_handoff_watchdog_route_removal_phase1_v1
title: "Meta-Review Submit Full Handoff + Watchdog Normal-Route Removal (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/bubble/metaReview.ts
  - src/v11/shared/metaReview/metaReviewCommandApi.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/shared/watchdog/watchdogMetaReviewRouting.ts
  - src/v11/shared/watchdog/watchdogCommandRouting.ts
  - docs/pairflow-initial-design.md
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/contracts/v11/metaReviewGate.contract.test.ts
  - tests/v11/application/metaReview/metaReviewFacadeParity.test.ts
  - tests/v11/application/watchdog/watchdogCommandApi.test.ts
prd_ref: null
plan_ref: docs/v1.1-boundary-simplification/v1.1-implementation-roadmap.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Submit Full Handoff + Watchdog Normal-Route Removal (Phase 1)

## L0 - Policy

### Goal

Tegyuk a `pairflow bubble meta-review submit` parancsot a meta-review turn teljes, normal handoff parancsava.
Sikeres submit utan a rendszer ugyanabban a command flow-ban rogzitse a canonical meta-review eredmenyt, alkalmazza a gate route-ot, lepjen tovabb a kovetkezo lifecycle allapotba, es zarja le a meta-reviewer ownershipet.

### Context

Megfigyelt architekturalis aszimmetria:
1. implementer/reviewer `pass` es reviewer `converged` eseten a handoff a command sajat felelossege,
2. meta-review eseten a `submit` jelenleg csak snapshotot/artifactot persistal,
3. a normal tovabblepes (`APPROVAL_REQUEST` vagy auto-rework dispatch) egy kulon watchdog/recovery utvonalra marad,
4. ettol limbo allapot keletkezhet: a domain eredmeny mar canonical, de a bubble meg nem lepett tovabb.

Desired semantic simplification:
1. `meta-review submit` jelentese: "rogzitettem a dontest es tovabbvittem a gate-et",
2. watchdog jelentese: timeout/liveness/recovery, nem normal success-path orchestrator.

### In Scope

1. A `meta-review submit` happy path kibovitese ugy, hogy a canonical submit utan azonnal alkalmazza a megfelelo gate route-ot.
2. A meta-review success-path watchdog routing eltavolitasa: a watchdog ne route-oljon normal, canonical submit snapshotbol.
3. A `submit` eredmeny-contract kibovitese, hogy a route outcome/lifecycle allapot egyertelmuen latszodjon.
4. A meta-reviewer ownership deactivation ugyanabban a submit flow-ban tortenjen, mint a gate route.
5. CLI/render/docs update, hogy a `submit` teljes handoff szemantikaja lathato legyen.
6. Regresszios tesztek a submit->route happy pathra es arra, hogy a watchdog mar nem primary meta-review progression engine.

### Out of Scope

1. Altalanos impossible-state reconcile/watchdog redesign.
2. Altalanos transcript-state reconciler kiterjesztes minden commandra.
3. Uj opcionis CLI flag (`--apply-route` vagy hasonlo).
4. Uj meta-review recommendation policy.

### Safety Defaults

1. Sikeres `submit` utan a rendszernek ugyanabban a flow-ban route-olnia kell; normal success-path nem maradhat `META_REVIEW_RUNNING` allapotban.
2. Ha a canonical persist sikerul, de a gate apply/resolution nem, a command fail-closed hibaval alljon meg, explicit recovery jelzessel; ne tavasszon a watchdog normal success-path route-jara.
3. A watchdog nem lehet masodlagos authority ugyanarra a normal meta-review tovabblepesre, amit a `submit` mar vegre kell hajtson.
4. Crash/retry recovery megengedett, de ez fallback mechanizmus; nem a primary submit szemantika resze.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - `pairflow bubble meta-review submit` CLI szemantika,
   - meta-review lifecycle transition semantics,
   - watchdog responsibility boundary,
   - operator-facing status/help text.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReview.ts` | canonical submit path | `submitMetaReviewResult(input: MetaReviewSubmitInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewSubmitResult>` | success path, a canonical snapshot/artifact persist utan | A submit ugyanabban a command flow-ban hivja meg a gate apply/resolution logikat, es a visszaadott eredmeny mar a routed lifecycle outcome-ot reprezentalja | P1 | required-now | current limbo gap between successful submit and later watchdog route |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` | gate apply entry | existing apply helper(s) -> `Promise<MetaReviewGateResult>` | submit-driven invocation path | Tovabbra is ez marad a canonical gate decision engine, de normal success-path-ben kozvetlenul a `submit` hivja, nem a watchdog recovery | P1 | required-now | preserve one policy engine, remove duplicate progression authority |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | recovery path | `recoverMetaReviewGateFromSnapshot(...) -> Promise<MetaReviewGateResult>` | command/recovery boundary | Recovery megmarad fallbacknek ugyanarra az esetre, amikor egy mar canonical submit utan a normal handoff valamiert nem zart le; nem lehet normal happy-path authority | P1 | required-now | recovery remains but loses primary progression role |
| CS4 | `src/v11/shared/watchdog/watchdogMetaReviewRouting.ts` | meta-review watchdog routing | `maybeRouteMetaReviewBeforeExpiry(...)` / `maybeRouteMetaReviewOnExpiry(...)` | `META_REVIEW_RUNNING` branch | A before-expiry normal canonical-submit routing kikerul; a watchdog nem route-ol success-path approve/rework snapshotbol | P1 | required-now | remove semantic duplication |
| CS5 | `src/v11/shared/watchdog/watchdogCommandRouting.ts` | watchdog lifecycle resolution | `resolveWatchdogLifecycleRoute(...) -> Promise<BubbleWatchdogResult>` | non-expired meta-review branch | A watchdog csak liveness/timeout/recovery szerepet tart meg; normal meta-review progression nem innen tortenik | P1 | required-now | watchdog authority boundary |
| CS6 | `src/v11/application/metaReview/metaReviewCliDispatcher.ts` + `src/v11/application/metaReview/metaReviewCliRenderers.ts` | submit facade and rendering | existing dispatch/render path | `submit` command return handling | A CLI output explicitten jelezze, hogy a submit route-olta a gate-et, milyen lifecycle allapotba jutott, es milyen envelope/route outcome keletkezett | P2 | required-now | operator clarity |
| CS7 | `docs/pairflow-initial-design.md` | command semantics docs | markdown | meta-review and watchdog sections | A docs rogzitsek, hogy a `submit` a teljes handoff, a watchdog pedig nem normal meta-review progression engine | P2 | required-now | contract/doc sync |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review submit command semantics | canonical result persist only | canonical result persist + immediate route apply + ownership close | `bubble_id`, `round`, `recommendation`, `summary`, `report_json` | `rework_target_message`, warnings | behavior change | P1 | required-now |
| Meta-review submit result | returns canonical submit snapshot outcome only | returns canonical submit + routed lifecycle outcome | `run_id`, `recommendation`, `status`, `lifecycle_state` | gate route metadata, warnings | additive/behavior-tightening | P1 | required-now |
| Watchdog meta-review semantics | may route from canonical submit snapshot on normal path | no normal success-path route from canonical submit snapshot | timeout/liveness data | diagnostic metadata | behavior change | P1 | required-now |
| Recovery semantics | mixed with normal progression | fallback-only after failed/incomplete normal handoff | canonical persisted submit snapshot | diagnostics/reason metadata | behavior clarification | P2 | required-now |

Normative rules:
1. `meta-review submit` must either finish the normal gate handoff or fail with explicit error; "submit succeeded, bubble still waiting for later watchdog route" is not a valid success outcome.
2. A single semantic authority must own normal meta-review progression: the submit command.
3. Watchdog may observe or recover abnormal states, but it must not be the normal continuation path for successful meta-review submit.
4. Recovery is allowed only as fallback after interrupted/failed normal handoff, not as hidden required second phase of every successful submit.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state | canonical submit snapshot write + immediate gate state transition in one command flow | successful submit that leaves normal path in `META_REVIEW_RUNNING` awaiting watchdog | handoff completeness is mandatory | P1 | required-now |
| Transcript/inbox | gate route append during submit when human request or auto-rework dispatch is needed | delayed append delegated to watchdog on happy path | transcript authority stays explicit | P1 | required-now |
| Runtime sessions | meta-reviewer pane deactivation during submit-driven handoff | leaving active meta-review ownership open after successful routed submit | ownership closure belongs to submit flow | P1 | required-now |
| Watchdog | timeout/liveness/recovery only | normal meta-review success-path route apply | authority boundary hard rule | P1 | required-now |

Constraint: no duplicate normal-routing authorities may remain after this task (`submit` and watchdog cannot both own the same happy-path transition).

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| canonical submit validation fails | meta-review submit input/state ownership | throw | no mutation | existing submit reason code surface | warn/error | P1 | required-now |
| canonical submit persists but gate apply fails | gate apply / transcript append / state transition | throw | explicit recoverable transition failure; no hidden watchdog continuation | `META_REVIEW_SUBMIT_ROUTE_APPLY_FAILED` | error | P1 | required-now |
| canonical submit persists but ownership close fails | runtime session mutation | throw | explicit recoverable transition failure; snapshot remains authoritative | `META_REVIEW_SUBMIT_PANE_CLOSE_FAILED` | error | P1 | required-now |
| watchdog sees canonical submit in normal non-expired path | watchdog runtime | result | no normal route apply; continue watchdog liveness logic only | N/A | info | P1 | required-now |
| fallback recovery explicitly invoked after interrupted submit | recovery command/path | fallback | replay route from canonical snapshot | existing recovery reason code surface | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing canonical submit validation and parity contract in `src/core/bubble/metaReview.ts` | P1 | required-now |
| must-use | existing meta-review gate apply/recovery policy modules as the single gate decision engine | P1 | required-now |
| must-use | explicit docs update for submit/watchdog semantics | P2 | required-now |
| must-not-use | watchdog as hidden second mandatory stage of every successful submit | P1 | required-now |
| must-not-use | new optional CLI flag for route apply when the behavior is unconditional | P1 | required-now |
| must-not-use | duplicate route logic copied into submit and watchdog separately | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Approve submit completes full handoff | bubble in `META_REVIEW_RUNNING` with valid canonical approve payload | `meta-review submit` runs | command returns success, bubble enters `READY_FOR_HUMAN_APPROVAL`, approval request exists, meta-reviewer pane ownership closes | P1 | required-now | automated test |
| T2 | Rework submit completes full handoff | bubble in `META_REVIEW_RUNNING` with valid rework payload and budget-compatible route | `meta-review submit` runs | command returns success, implementer rework dispatch occurs in same command flow | P1 | required-now | automated test |
| T3 | Submit does not depend on later watchdog | canonical submit scenario | `meta-review submit` succeeds | no additional watchdog invocation is required for normal progression | P1 | required-now | automated test |
| T4 | Watchdog no longer normal-routes canonical submit | canonical submit already completed | watchdog runs before expiry | watchdog does not perform duplicate route/apply for the same happy path | P1 | required-now | automated test |
| T5 | Route-apply failure surfaces explicitly | injected failure after canonical snapshot write | `meta-review submit` runs | command fails with explicit route-apply reason; no silent limbo success result | P1 | required-now | automated test |
| T6 | Recovery remains fallback-only | interrupted submit fixture with canonical snapshot but incomplete handoff | explicit recovery path runs | route is replayed deterministically without making watchdog the normal authority | P2 | required-now | automated test |
| T7 | CLI output clarity | successful approve/rework submit | CLI render runs | output clearly states routed lifecycle outcome and next state | P2 | required-now | automated test |
| T8 | Docs parity | task implementation changes merged | docs review | `meta-review submit` and watchdog semantics are documented consistently | P2 | required-now | doc review |

## Acceptance Criteria

1. AC1: `pairflow bubble meta-review submit` is the single normal handoff command for successful meta-review completion.
2. AC2: After successful submit, the bubble no longer waits for watchdog to perform the normal route apply.
3. AC3: Watchdog no longer owns normal canonical-submit routing in non-expired meta-review path.
4. AC4: Recovery remains available only as fallback for interrupted/failed handoff, not as required second phase of normal submit.
5. AC5: Operator-facing CLI/docs make the new authority split explicit: submit = handoff, watchdog = liveness/recovery.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2, CS6 | T1, T2, T7 |
| AC2 | CS1, CS4, CS5 | T1, T3, T4 |
| AC3 | CS4, CS5 | T4 |
| AC4 | CS3, CS4 | T5, T6 |
| AC5 | CS6, CS7 | T7, T8 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A submit route-apply es ownership-close szakaszt erdemes kozos mutation boundary ala rendezni, hogy a general reconcile story egyszerubb legyen.
2. [later-hardening] Ha kesobb altalanos command-finalization runner jon letre, a meta-review submit ezt a kozos mintat hasznalja, ne special-case maradjon.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Generic command finalization abstraction | L2 | P2 | later-hardening | architectural follow-up | submit/apply/close common finalization boundary kialakitasa |
| H2 | Crash-injection regression suite | L2 | P2 | later-hardening | resilience gap | injectalt persist-after/append-after failure matrix a kritikus handoff commandokra |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. P1 regresszio, ha sikeres `meta-review submit` utan a normal bubble progression tovabbra is watchdogtol fugg.
3. P1 regresszio, ha a watchdog meg mindig duplicate success-path route authority marad.
4. P1 regresszio, ha a submit success output nem bizonyitja egyertelmuen a routed lifecycle allapotot.
5. `contract_boundary_override=yes`, ezert a `plan_ref` kotelezo es az L1 CLI/lifecycle sorokkal osszhangban kell maradjon.

## Assumptions

1. A meta-review gate apply policy megtarthato kozos canonical decision engine-kent; nem kell kulon submit-only policy fork.
2. A general impossible-state reconcile watchdog/refactor kulon follow-up taskban lesz kezelve.

## Open Questions (Non-Blocking)

1. A submit route result surface pontosan milyen envelope metadata-t adjon vissza a CLI-nek (`gate_route`, `envelope_id`, `target_state`) ugy, hogy a facade parity megmaradjon.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a `meta-review submit` teljes normal handoffot vegez,
2. a watchdog normal meta-review success-path routing szerepe megszunik,
3. a recovery csak fallback marad, es
4. a CLI/docs ezt a szemantikat egyertelmuen rogzitik.
