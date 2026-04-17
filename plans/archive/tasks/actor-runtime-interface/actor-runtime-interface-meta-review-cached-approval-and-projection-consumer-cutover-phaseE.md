---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_approval_and_projection_consumer_cutover_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Approval and Projection Consumer Cutover (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/v11/shared/approval/approvalTranscriptContext.ts
  - src/v11/shared/approval/approvalRoutingEligibility.ts
  - src/v11/shared/approval/pendingApprovalSignal.ts
  - src/types/ui.ts
  - src/v11/shared/inbox/inboxCommandApi.ts
  - src/v11/shared/status/statusCommandViewProjection.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/status/statusCommandInternals.ts
  - src/v11/shared/list/listCommandApi.ts
  - src/v11/shared/list/listCommandContract.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - src/v11/application/status/statusCliTextRenderer.ts
  - src/v11/application/status/statusCliTableRenderer.ts
  - ui/src/lib/types.ts
  - ui/src/state/useBubbleStore.ts
  - ui/src/state/useBubbleStore.test.ts
  - ui/src/components/canvas/BubbleCanvas.tsx
  - ui/src/components/canvas/BubbleCanvas.test.tsx
  - ui/src/test/fixtures.ts
  - tests/contracts/v11/approval.contract.runner.ts
  - tests/core/human/approval.test.ts
  - tests/core/bubble/inboxBubble.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/cli/bubbleStatusCommand.test.ts
  - tests/v11/application/approval/approvalRoutingEligibility.test.ts
  - tests/v11/application/approval/runApprovalFlow.test.ts
  - tests/v11/shared/approval/pendingApprovalSignal.test.ts
  - tests/v11/application/list/listCommandApi.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached Approval and Projection Consumer Cutover (Phase E)

## Current Codebase Check (2026-04-11)

1. Az approval override eligibility-ben a parity/run-failed transcript helper mar jelen van, de a recommendation source-of-truth ma meg `state.meta_review.last_autonomous_recommendation` es sticky-human-gate fallback.
2. A current-round human approval request transcript mar hordoz canonical recommendation metadata-t `payload.metadata.latest_recommendation` alatt.
3. A status/list meta-review view ma nem csak a projection builderben, hanem a typed contractokban, az exportalt UI summary/detail shape-ben, a UI presenter boundary-n es a CLI renderer fogyasztokban is cached last-run mezoket exposedol:
   - `latestRecommendation`
   - `latestStatus`
   - `latestSummary`
   - `latestReportRef`
   - `latestUpdatedAt`
4. A `presentBubbleSummaryFromListEntry(...)` / `presentBubbleDetail(...)` boundary ma pass-through modon adja tovabb a list/status `metaReview` shape-et, ezert a shared UI export narrowed contractja csak explicit presenter-mapper ownership mellett lesz tenylegesen enforce-olhato.
5. A shared UI export shape browser-oldalon kulon mirror contractkent is letezik `ui/src/lib/types.ts` alatt, ezt a `ui/src/state/useBubbleStore.ts` normalizer, a `ui/src/test/fixtures.ts` fixture surface es a `ui/src/components/canvas/BubbleCanvas.tsx` human-gate copy is fogyasztja; ezek ma meg cached `latest*` mezokre es konkretan `latestRecommendation` szovegre tamaszkodnak.
6. A canonical pending approval read-path ma meg tud ujabb cached meta-review snapshotbol szintetikus approval itemet gyartani a `src/v11/shared/approval/pendingApprovalSignal.ts` helperen keresztul, amit a `src/v11/shared/status/statusCommandInternals.ts` pending approval count-ja es a `src/v11/shared/inbox/inboxCommandApi.ts` approval item surface-e is fogyaszt; ez stale cached summary/report ref alapjan tovabbra is approval read-model hatast okozhat.
7. Az approval source-of-truth cutovernek tovabbi kozvetlen regression surface-e van a `tests/v11/application/approval/runApprovalFlow.test.ts`, a `tests/contracts/v11/approval.contract.runner.ts`, a `tests/v11/shared/approval/pendingApprovalSignal.test.ts` es a `tests/core/bubble/inboxBubble.test.ts` harnessben, ahol ma meg explicit snapshot-favoring viselkedes is lockolva van.
8. Az elozo Phase E foundation task mar owns-olta a live authority/runtime producer cutovert; ez a task annak consumer oldali folytatasa, nem uj authority/runtime foundation szelet.

## Executive Summary

1. Ez a Phase E masodik foundation taskja, kifejezetten consumer cutover scope-pal.
2. A cel ket reszre bomlik:
   - approval idoben a source-of-truth a latest current-round `APPROVAL_REQUEST.payload.metadata.latest_recommendation` legyen,
   - status/list/status CLI/browser-side UI consumerok es a canonical pending approval read-path ne cached last-run payloadot, hanem transcript/current-round illetve live authority/runtime/gate-derived allapotot mutassanak.
3. Ez a task nem nyul a cached state write shape-hoz, nem torol public cached CLI/read stack feluletet, es nem nyitja ujra a mar leszallitott authority/runtime producer cutovert, de a belso status/inbox approval-read consumereket mar ki kell vezetnie a cached snapshot preferalasarol.

## L0 - Policy

### Goal

Allitsa at az approval es projection consumer seams-t a cached state helyett explicit current-round transcript metadata es mar meglevo live authority/runtime/gate adatokra.

### In Scope

1. Az approval recommendation source-of-truth cutoverja a transcriptben levo latest human approval request metadata-ra.
2. A transcript-context helper szukitese/bovitese annyira, amennyi az approval donteshez tenylegesen kell.
3. A status/list meta-review projection contract szukitese cached last-run mezok nelkul.
4. A canonical pending approval read-path cutoverja ugy, hogy a belso inbox/status approval surface ne preferaljon ujabb cached meta-review snapshotot a current-round human approval request helyett.
5. A projection-shape valtozas tovabbvezetese a typed contractokba, exportalt UI summary/detail shape-be, UI portokba, UI presenter mapperekbe es status CLI rendererekbe.
6. A browser-side UI mirror/store/render consume pontok igazitas a narrowed shared `metaReview` shape-re.
7. A fenti consumer seams regresszios tesztjei.

### Out of Scope

1. State schema vagy persistence write seam valtoztatas.
2. A cached `last_autonomous_*` mezok fizikai torlese.
3. Public `bubble meta-review status|last-report` read-stack removal.
4. Uj approval policy vagy route semantics bevezetese.
5. Workflow, UI vagy docs cleanup a projection consumer contracton tul.

### Safety Defaults

1. Ha a latest current-round approval request metadata nem vezetheto le a transcriptbol, approval fail-closed marad.
2. A task nem hozhat vissza cached state fallbacket sem approvalban, sem projection consumerben.
3. Status/list/status CLI projection inkabb legyen szukebb, mint hogy stale cached payloadot mutasson.
4. A mar leszallitott live authority/runtime producer seam csak fogyasztando input; ezt a task nem redefineszalhatja.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - approval decision metadata contract,
   - canonical pending approval read contract,
   - status projection contract,
   - list projection contract,
   - exported UI summary/detail contract,
   - status/list consumer renderer contract,
   - browser-side UI mirror/store/render contract.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: `current round -> latest human APPROVAL_REQUEST envelope -> payload.metadata.latest_recommendation -> approval decision`
   - competing identifiers or fallback identities: cached `last_autonomous_recommendation`, sticky-human-gate fallback, cached status/list projection fields
10. Authority/source-of-truth note:
   - canonical source: current-round transcript metadata + mar meglevo live authority/runtime/gate projection
   - forbidden secondary sources: cached last-run state scalars mint approval vagy projection source-of-truth
11. Sequencing note:
   - ez a task owns-olja a consumer-side approval/projection cutovert,
   - de nem owns-olja a live authority/runtime producer helper-ek ujratervezeset,
   - es nem owns-olja a cached fieldek fizikai eltavolitasat.

## L1 - Change Contract

### 0) Sequencing and Ownership Contract

| Slice | Owned Here | Required Outcome | Deferred To |
|---|---|---|---|
| Approval recommendation source-of-truth consumer cutover | yes | approval a current-round transcript metadata alapjan dont, cached state nelkul | N/A |
| Canonical pending approval read-path consumer cutover | yes | inbox/status pending approval surface current-round human approval requestre tamaszkodik; ujabb cached snapshot nem irhatja felul a transcript approval itemet es nem hozhat letre szintetikus approval summary-t a belso consumer pathon | N/A |
| Status/list/UI presenter/UI summary/status CLI/browser UI meta-review projection tightening | yes | cached last-run mezok kikerulnek a consumer contractbol, es egy kozos narrowed `metaReview` shape vegig konzisztens marad a `UiBubbleSummary` / `UiBubbleDetail` export boundary-n es a browser-side consume retegen is, nem csak a status/list projection type-szinten. A status projection route mezoi status-only diagnosztikak: a presenter/UI export boundary-n ezeket explicit, dokumentalt es tesztelt field-dropkent kell kezelni, nem veletlen shape-veszteskent. | N/A |
| Live authority/runtime producer seams | no | csak a mar leszallitott authority/runtime input fogyasztasa | `plans/archive/tasks/actor-runtime-interface-meta-review-cached-current-round-authority-and-runtime-consumer-cutover-phaseE.md` |
| Cached field physical removal es cleanup/recovery closure | no | cached mezok atmenetileg inert retentionben maradhatnak | `plans/tasks/actor-runtime-interface-meta-review-cached-persisted-authority-and-cleanup-recovery-removal-phaseE.md` |
| Public cached read-stack removal | no | retained operator/read stack kulon removal taskban zarando | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-meta-review-cached-public-read-model-removal-phaseE.md` |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/approval/approvalTranscriptContext.ts`, `src/v11/shared/approval/approvalRoutingEligibility.ts` | `readApprovalTranscriptContext`, `resolveApprovalDecisionMetadata` | `readApprovalTranscriptContext(transcriptPath: string, round: number, dependencies: { readTranscriptEnvelopes: ReadTranscriptEnvelopesPort }) -> Promise<ApprovalTranscriptContext>`; `resolveApprovalDecisionMetadata(input: ResolveApprovalDecisionMetadataInput) -> Promise<Record<string, unknown>>` | approval seam | A recommendation-at-decision a latest current-round human `APPROVAL_REQUEST.payload.metadata.latest_recommendation` mezobol jojjon. `state.meta_review.last_autonomous_recommendation` es sticky-human-gate fallback ne maradjon source-of-truth. Ha nincs current-round human approval request vagy abban hianyzik a `latest_recommendation`, a path fail-closed dobjon `APPROVAL_RECOMMENDATION_UNAVAILABLE` hibaval akkor is, ha historical round vagy sticky compatibility context elerheto. A parity/run-failed transcript metadata fogyasztasa maradhat. | P1 | required-now | approval tests |
| CS2 | `src/v11/shared/approval/pendingApprovalSignal.ts`, `src/v11/shared/status/statusCommandInternals.ts`, `src/v11/shared/inbox/inboxCommandApi.ts` | `buildCanonicalPendingApprovalSignal`, `resolveCanonicalPendingApprovalSignal`, `resolvePendingApprovalCount`, `getBubbleInbox` | existing pending approval helper/read-model consumers -> updated helper/read-model consumers | canonical pending approval seam | A belso status/inbox approval surface ne preferaljon ujabb cached meta-review snapshotot a current-round human approval request helyett. `last_autonomous_summary` / `last_autonomous_report_ref` alapjan ne gyartson szintetikus canonical approval itemet es ne adjon approval countot, ha csak a cached snapshot ujabb. A current-round unresolved human approval request transcript maradjon az approval read source-of-truth; ha nincs ilyen, vagy az approval requestet mar `APPROVAL_DECISION` feloldotta, a belso pending approval read-model inkabb legyen ures, mint stale snapshot- vagy historical-request-alapu. | P1 | required-now | inbox/status tests |
| CS3 | `src/v11/shared/status/statusCommandViewProjection.ts`, `src/v11/shared/status/statusCommandViewBuilder.ts`, `src/v11/shared/list/listCommandApi.ts`, `src/v11/shared/list/listCommandContract.ts`, `src/v11/shared/ports/uiRouter.ts`, `src/types/ui.ts`, `src/v11/infrastructure/ui/presenters/bubblePresenter.ts` | `buildStatusMetaReviewView`, `buildBubbleStatusView`, `listBubbles`, status/list view types, `UiBubbleMetaReviewSummary`, `UiBubbleSummary`, `UiBubbleDetail`, `presentBubbleSummaryFromListEntry`, `presentBubbleDetail` | existing projection builders/types and UI presenter mappers -> updated builders/types/mappers | projection seam | A status/list consumer contract ne surfacedeljen cached `latestRecommendation/latestStatus/latestSummary/latestReportRef/latestUpdatedAt` mezoket. A status projection megtarthat status-only route mezoket (`latestRoute`, `latestRouteReasonCode`, `latestRouteObservedAt`), de ezek szandekosan status-command-only diagnosztikai mezok: a kozos UI `metaReview` exportban ezeknek explicit, dokumentalt es presenter-tesztekkel vedett field-dropkent kell kiesniuk. A `UiBubbleSummary` es `UiBubbleDetail` ugyanazt az egy kozos narrowed `metaReview` shape-et hasznalja; a UI export boundary ne vezessen be kulon detail-only meta-review shape-et es ne tartson meg cached mezoket compatibility okbol. Ezt a presenter mapper boundary-n mind summary, mind detail pathon ervenyesiteni kell; nem eleg csak a type es router contract szukitese. | P1 | required-now | status/list/UI tests |
| CS4 | `ui/src/lib/types.ts`, `ui/src/state/useBubbleStore.ts`, `ui/src/components/canvas/BubbleCanvas.tsx`, `ui/src/test/fixtures.ts` | browser-side shared `UiBubbleMetaReviewSummary`, store normalization, READY_FOR_HUMAN_APPROVAL copy, UI fixtures | existing browser UI mirror/store/render consumption -> updated narrowed-shape consumption | browser UI consumer seam | A browser-side UI ugyanazt a narrowed shared `metaReview` shape-et fogyassza, amit a backend export boundary ad. Ne rekonstrualjon cached `latestRecommendation/latestStatus/latestSummary/latestReportRef/latestUpdatedAt` mezoket frontend oldalon. Ha a human-gate copy ma recommendation-szovegre epit, azt generic vagy megmarado live mezokbol levezetheto wordingre kell atallitani, nem rejtett compatibility mezovel megmenteni. | P1 | required-now | browser UI tests |
| CS5 | `src/v11/application/status/statusCliTextRenderer.ts`, `src/v11/application/status/statusCliTableRenderer.ts` | `renderBubbleStatusText`, `renderBubbleStatusTable` | existing renderers -> updated renderers | status CLI consumer seam | A status CLI text/table a szukitett status meta-review contractot renderelje. Ne emlitsen cached summary/report/status/recommendation timestamp mezoket, ha azok mar nem reszei a projectionnek. | P1 | required-now | CLI tests |
| CS6 | `tests/contracts/v11/approval.contract.runner.ts`, `tests/core/human/approval.test.ts`, `tests/core/bubble/inboxBubble.test.ts`, `tests/core/bubble/metaReview.test.ts`, `tests/core/bubble/statusBubble.test.ts`, `tests/core/bubble/listBubbles.test.ts`, `tests/core/ui/bubblePresenter.test.ts`, `tests/cli/bubbleStatusCommand.test.ts`, `tests/v11/application/approval/approvalRoutingEligibility.test.ts`, `tests/v11/application/approval/runApprovalFlow.test.ts`, `tests/v11/application/list/listCommandApi.test.ts`, `tests/v11/shared/approval/pendingApprovalSignal.test.ts`, `ui/src/state/useBubbleStore.test.ts`, `ui/src/components/canvas/BubbleCanvas.test.tsx` | regression coverage | tests -> tests | approval/projection regression matrix | A coverage explicitten fogja az approval transcript source-of-truth cutovert, a pending approval read-path snapshot-deprioritizationt, a projection-shape szukitest es a renderer/list/status/UI consumerok aktualizalt contractjat. Ez a task owns-olja a `tests/core/bubble/metaReview.test.ts` frissiteset is, mert a jelenlegi status projection-path ott meg `status.metaReview.latestRecommendation` / `latestSummary` assertionokkal van lockolva. Ugyanigy owns-olja a flow-level `runApprovalFlow`, a contract-runner approval harness, a snapshot-preferring `pendingApprovalSignal` coverage es az inbox/status pending approval read-model tesztek igazitasat, plusz a browser UI store/render fogyasztok tesztjeit. | P1 | required-now | automated tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Approval recommendation source | `state.meta_review.last_autonomous_recommendation` vagy sticky-human-gate fallback | latest current-round human `APPROVAL_REQUEST.payload.metadata.latest_recommendation` | current round; latest human approval request envelope; `payload.metadata.latest_recommendation`; override flags | parity diagnostics from approval request metadata | breaking internal source-of-truth correction | P1 | required-now |
| Canonical pending approval read contract | transcript approval request + ujabb cached snapshot summary/report ref synthetic override-ja | current-round unresolved human approval request az egyetlen approval item source a belso status/inbox pending approval surface-en | current round; latest unresolved human approval request envelope; approval summary a transcriptbol | none | breaking internal read-model correction; stale snapshot nem irhatja felul a transcript approval itemet, nem hozhat letre synthetic approval itemet, es historical mar-resolved request sem maradhat pending | P1 | required-now |
| Status meta-review projection | cached last-run fields + route/runtime data | live authority/runtime + transcript-derived route-only projection | `actor`; `authorityActive`; `latestRoute`; `latestRouteReasonCode`; `latestRouteObservedAt`; `runtimeDelivery` | none | breaking view simplification; status-only route detail intentionally remains available only on the status command contract and is expected to be dropped at the shared UI export boundary | P1 | required-now |
| List meta-review projection | cached last-run fields + runtime data | live authority/runtime-only projection | `actor`; `authorityActive`; `runtimeDelivery` | none | breaking view simplification | P1 | required-now |
| Exported UI meta-review projection | `UiBubbleSummary` / `UiBubbleDetail` cached meta-review scalars-t is hordoz | egy kozos narrowed UI `metaReview` shape, amelyet a `UiBubbleSummary` es a `UiBubbleDetail` valtozatlanul megoszt; a status-only route mezok ezen a boundaryn szandekosan kiesnek, es ez az aszimmetria dokumentalt presenter ownership marad, nem accidental shape-loss | `actor`; `authorityActive`; `runtimeDelivery` | none | breaking internal/exported UI contract correction | P1 | required-now |
| Browser UI meta-review consume contract | a browser-side `ui/src/lib/types.ts` / store / fixtures / canvas copy cached meta-review scalarokra es recommendation wordingre epit | a browser-side consume retegek ugyanazt a kozos narrowed shared `metaReview` shape-et kovetik, cached scalarok es frontend-oldali reconstruction nelkul | `actor`; `authorityActive`; `runtimeDelivery` | none | breaking internal/frontend consumer contract correction; READY_FOR_HUMAN_APPROVAL copy nem fugghet removed recommendation mezotol | P1 | required-now |
| Status/list consumer render contract | renderer/consumer kozvetlenul cached mezoket olvas | renderer/consumer csak a szukitett live projectiont olvassa | a fenti projection-shape | formatting diagnostics | breaking internal consumer contract correction | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Approval transcript reads | current-round human approval request metadata read | cached state fallback vagy sticky-human-gate source-of-truth fallback, historical round approval request source-of-truthkent | transcript a canonical source ebben a taskban | P1 | required-now |
| Pending approval read-model | current-round unresolved human approval request item megtartasa a status/inbox surface-en | cached snapshot summary/report ref alapjan synthetic approval item vagy snapshot-priority override, illetve mar `APPROVAL_DECISION`-nel feloldott approval request pendingkent tartasa | a belso operator/status/inbox surface sem lehet stale cached approval sink | P1 | required-now |
| Status/list projection | field removal/tightening a consumer shape-ban | synthetic placeholders az elozo cached view megorzesere | absence is better than stale payload | P1 | required-now |
| Exported UI summary/detail shape | status/list narrowed contract tovabbvezetese a `UiBubbleSummary` / `UiBubbleDetail` exportokba egy kozos shared shape-kent; a status-only route mezok dokumentaltan nem mennek tovabb a shared UI `metaReview` shape-be, es ezt a presenter mapper boundary explicit enforce-olja, explicit route-field omission tesztekkel | UI export shape-ben retained cached fields tovabbelesztese, summary/detail kozt eltero meta-review shape bevezetese, vagy a status-only route mezok implicit tovabbelesztese a UI boundaryn | a UI export nem lehet rejtett compatibility sink | P1 | required-now |
| Browser UI store/view consume | a narrowed shared shape tovabbvezetese a `ui/src/lib/types.ts`, `useBubbleStore`, fixtures es `BubbleCanvas` consume pontokra | frontend oldali cached mezorekonstrukcio vagy READY_FOR_HUMAN_APPROVAL recommendation-szoveg retained compatibility alapon | a browser UI sem lehet kulon compatibility sink a backend export utan | P1 | required-now |
| Status CLI rendering | output szukitese a narrowed contract szerint | removed mezok mas nev alatt valo tovabbelesztese | ez consumer cleanup, nem public read-stack removal | P1 | required-now |
| Live authority/runtime producer seam | mar meglevo helper/input reuse | producer logic ujranyitasa vagy semantics valtoztatas | ez a task consumer-only a foundation utan | P1 | required-now |
| Cached `last_autonomous_*` write path | valtozatlan inert retention a kesobbi removalig | uj consumer dependence vagy source-of-truth megerosites | physical cleanup kulon task | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Approval decision during human gate but nincs latest current-round approval request recommendation metadata | transcript | throw | no mutation | `APPROVAL_RECOMMENDATION_UNAVAILABLE` | warn | P1 | required-now |
| Approval transcriptban van human gate envelope, de `latest_recommendation` hianyzik mikozben cached state tartalmazna | transcript + state | throw | cached state ignoralando | `APPROVAL_RECOMMENDATION_UNAVAILABLE` | warn | P1 | required-now |
| Approval decision during human gate but csak historical round approval request vagy sticky compatibility context maradt | transcript + state | throw | no mutation; historical/sticky context ignoralando source-of-truthkent | `APPROVAL_RECOMMENDATION_UNAVAILABLE` | warn | P1 | required-now |
| Status/inbox pending approval read-modelben nincs current-round human approval request, de cached snapshot tartalmaz ujabb summary/report ref-et | transcript + state | result | nincs pending approval item/count; cached snapshot ignoralando ezen a consumer pathon | N/A | info | P1 | required-now |
| Status/inbox pending approval read-modelben current-round approval request utan `APPROVAL_DECISION` erkezett, mikozben cached snapshot tovabbra is jelen van | transcript + state | result | nincs pending approval item/count; a resolved approval nem maradhat pending snapshot miatt | N/A | info | P1 | required-now |
| Status viewben nincs live meta-review authority | N/A | result | render only route/runtime detail if elerheto; egyebkent nincs meta-review last-run detail | N/A | info | P2 | required-now |
| List viewben nincs live meta-review authority | N/A | result | render only `authorityActive=false` es esetleges runtimeDelivery, cached last-run detail nelkul | N/A | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `readApprovalTranscriptContext(...)` es a latest current-round human approval request transcript metadata | P1 | required-now |
| must-use | `payload.metadata.latest_recommendation` mint approval recommendation source-of-truth | P1 | required-now |
| must-use | current-round unresolved human approval request transcript mint canonical pending approval item source a belso status/inbox read-modelben | P1 | required-now |
| must-use | az elozo foundation taskban leszallitott live authority/runtime/gate projection inputok | P1 | required-now |
| must-use | `UiBubbleSummary` / `UiBubbleDetail` kozos shared `metaReview` shape-paritas a narrowed status/list contracttal | P1 | required-now |
| must-use | browser-side `ui/src/lib/types.ts` / store / render consume parity ugyanazzal a narrowed shared `metaReview` shape-pel | P1 | required-now |
| must-not-use | `state.meta_review.last_autonomous_recommendation` mint approval source-of-truth | P1 | required-now |
| must-not-use | sticky-human-gate fallback recommendation sourcekent | P1 | required-now |
| must-not-use | historical round approval request source-of-truthkent approval recommendationre | P1 | required-now |
| must-not-use | `last_autonomous_summary` / `last_autonomous_report_ref` alapjan synthetic pending approval item vagy pending count a status/inbox consumer pathon | P1 | required-now |
| must-not-use | mar resolved approval request pendingkent tartasa csak azert, mert cached snapshot tovabbra is jelen van | P1 | required-now |
| must-not-use | cached summary/report/status/recommendation/update timestamp reconstruction status/list/status CLI seams-ben | P1 | required-now |
| must-not-use | exported UI summary/detail contract mint retained cached meta-review compatibility sink | P1 | required-now |
| must-not-use | browser UI mirror/store/render retained cached meta-review compatibility sinkkent | P1 | required-now |
| must-not-use | kulon summary-vs-detail meta-review shape bevezetese ebben a taskban | P1 | required-now |
| must-not-use | producer oldali authority/runtime helper semantics ujranyitasa ebben a szeletben | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Approval recommendation transcriptbol jon akkor is, ha cached state mast mond | bubble `READY_FOR_HUMAN_APPROVAL`, transcript latest current-round approval request metadata `latest_recommendation=rework`, cached state ettol eltero vagy stale | `resolveApprovalDecisionMetadata(...)` runs | `recommendation_at_decision` a transcript metadata-bol jon, es az override gate ezt koveti | P1 | required-now | automated test |
| T2 | Missing transcript recommendation fail-closed marad cached state ellenere is | approval request van, de `latest_recommendation` hianyzik; cached state-ben van recommendation | approve path runs | `APPROVAL_RECOMMENDATION_UNAVAILABLE` dobodik, cached state fallback nelkul | P1 | required-now | automated test |
| T3 | No-current-round approval request fail-closed marad approval eseten historical/sticky context ellenere is | bubble `READY_FOR_HUMAN_APPROVAL`, de a transcriptben nincs current-round human `APPROVAL_REQUEST`; lehet historical round approval request vagy `sticky_human_gate=true`, es a korabbi compatibility teszt ezt meg fallbackkel engedte | approve path runs | `APPROVAL_RECOMMENDATION_UNAVAILABLE` dobodik, es a korabbi sticky/history fallback coverage fail-closed expectationre fordul | P1 | required-now | automated test |
| T4 | Approval flow es contract harness ugyanazt a transcript source-of-truth cutovert koveti | flow-level vagy contract-runner approval fixture `READY_FOR_HUMAN_APPROVAL` allapotot seedel; transcript latest current-round approval request metadata adott, a state-ben levo `last_autonomous_recommendation` ettol elterhet | `runApprovalFlow` vagy approval contract runner execute-ol | a flow-level metadata es contract output is a transcript recommendationt koveti, nem a state seedet | P1 | required-now | automated test |
| T5 | Pending approval read-model nem preferal ujabb cached snapshotot | `READY_FOR_HUMAN_APPROVAL` bubble, transcriptben van current-round human approval request, state-ben ujabb `last_autonomous_summary` / `last_autonomous_report_ref` is jelen van | `resolveCanonicalPendingApprovalSignal(...)`, `getBubbleInbox(...)` vagy status pending count fut | a pending approval item/count a transcript approval requestet koveti; nincs `meta_review_snapshot:*` synthetic item es nincs snapshot-priority override | P1 | required-now | automated test |
| T6 | Pending approval read-model ures marad, ha csak cached snapshot marad | nincs current-round human approval request, de a state cached snapshot mezoi ujabbak | inbox/status pending approval surface buildel | nincs pending approval item/count; stale cached summary/report ref nem jelenik meg approval read-modelkent | P1 | required-now | automated test |
| T7 | Pending approval read-model decision utan semledik snapshot ellenere is | current-round human approval request utan `APPROVAL_DECISION` erkezett, es a state-ben tovabbra is jelen van cached `last_autonomous_summary` / `last_autonomous_report_ref` | `resolveCanonicalPendingApprovalSignal(...)`, `getBubbleInbox(...)` vagy status pending count fut | a pending approval item/count megszunik; resolved approval request nem marad pending, es a snapshot nem tamasztja vissza | P1 | required-now | automated test |
| T8 | Status projection nem exposedol cached last-run fields-t, de megtartja a route/runtime detailt | bubble statusban van transcript-derived route es/vagy live runtimeDelivery | status projection builds | `latestRecommendation/latestStatus/latestSummary/latestReportRef/latestUpdatedAt` hianyzik, mikozben route/runtime marad | P1 | required-now | automated test |
| T9 | List projection nem exposedol cached last-run fields-t | bubble list entryben nincs live authority | list view builds | a surfaced meta-review contract csak live authority/runtime shape-ot ad cached last-run detail nelkul | P1 | required-now | automated test |
| T10 | Exported UI summary/detail shape is one shared narrowed consumer | list/status backed UI presenter vagy summary/detail mapping a narrowed meta-review contracttal fut | `presentBubbleSummaryFromListEntry(...)` / `presentBubbleDetail(...)` utan `UiBubbleSummary` / `UiBubbleDetail` epul | a ket UI export ugyanazt az egy shared `metaReview` shape-et hasznalja, nem tartalmaz cached `latestRecommendation/latestStatus/latestSummary/latestReportRef/latestUpdatedAt` mezoket, es explicit route-field omission contractkent nem viszi tovabb a status-only `latestRoute/latestRouteReasonCode/latestRouteObservedAt` mezoket sem; a detail pathnak kulon assertionnel kell bizonyitania ezt, nem csak a summary pathnak | P1 | required-now | automated test |
| T11 | Browser UI store/render a narrowed shared shape-et koveti | a browser-side `UiBubbleSummary` mirror, a store normalizer es a canvas bubble copy ugyanarra a narrowed `metaReview` shape-re all at | `useBubbleStore` normalize es `BubbleCanvas` render fut | nincs cached `latestRecommendation/latestStatus/latestSummary/latestReportRef/latestUpdatedAt` dependency vagy fixture drift; a READY_FOR_HUMAN_APPROVAL copy recommendation mezotol fuggetlenul is ertelmes marad | P1 | required-now | automated test |
| T12 | Existing meta-review regression surface is updated for narrowed status projection | a jelenlegi `tests/core/bubble/metaReview.test.ts` status projection assertionok cached `latestRecommendation` / `latestSummary` mezokre epulnek | a task szerinti projection-shape szukites leszallitasa utan a regressziofutas frissul | a coverage az uj narrowed status meta-review contractot assertalja, es nem tartja eletben a removed cached mezoket | P1 | required-now | automated test |
| T13 | Status CLI renderer a narrowed projectiont koveti | status view mar a szukitett meta-review shape-ot hordozza | text/table rendering fut | a renderer nem var es nem ir ki removed cached mezoket, de a live route/runtime informaciot tovabbra is mutatja | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a narrowed projection contract a most explicitten scope-olt browser UI consume pontokon tuli tovabbi retained UI consume helyeken tor el, kulon consumer-cleanup task nyithato, de ez ne blokkolja a cached source-of-truth cutovert.

## Assumptions

1. A latest current-round human approval request metadata minden `READY_FOR_HUMAN_APPROVAL` approval donteshez elegendo source-of-truth.
2. A status/list/status CLI es browser-side UI consumer contract szukitese nem egyenlo a public cached read-stack removal taskkal; itt csak a belso fogyasztok cutoverja a cel.

## Open Questions

1. Nincs blocker open question.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | tovabbi UI-consumer cleanup, ha a narrowed projection mas retained consume helyeken is tor | L2 | P2 | later-hardening | task authoring | csak konkret evidence alapjan nyisd meg |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when the `P0/P1 + required-now` ownership, sequencing, contract es test-coverage expectations explicittek, internally consistentek, es minden ezen kivuli nyitott megfigyeles `later-hardening`-kent van jelolve. Az implementation utani tenyleges code/test completion nem ennek a spec-lock sornak, hanem a vegrehajtasnak az acceptance kriteriuma.
