---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_state_decoupling_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached State Decoupling (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/types/bubble.ts
  - src/v11/domain/state/initialState.ts
  - src/v11/shared/state/stateSchemaMetaReview.ts
  - src/v11/shared/state/stateSchemaMetaReviewAutonomous.ts
  - src/v11/shared/state/stateSchemaMetaReviewAutonomousSupport.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunPersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/approval/approvalTranscriptContext.ts
  - src/v11/shared/approval/approvalRoutingEligibility.ts
  - src/v11/shared/status/statusCommandViewProjection.ts
  - src/v11/shared/list/listCommandApi.ts
  - tests/v11/application/approval/approvalRoutingEligibility.test.ts
  - tests/v11/application/list/listCommandApi.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/metaReview.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached State Decoupling (Phase E)

## Current Codebase Check (2026-04-11)

1. A bubble state schema es az initial state ma meg teljes cached snapshot scalars blokkot tart fenn `state.meta_review.last_autonomous_*` mezokkel.
2. A submit es live-run persistence seam-ek ma meg ezeket a cached mezoket irjak vissza canonical state-be:
   - `src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts`
   - `src/v11/shared/metaReview/liveRun/metaReviewLiveRunPersistence.ts`
3. Az approval override eligibility ma meg `state.meta_review.last_autonomous_recommendation` alapjan dont:
   - `src/v11/shared/approval/approvalRoutingEligibility.ts`
4. A status/list projection ma meg cached snapshot-ot surfacedel:
   - `src/v11/shared/status/statusCommandViewProjection.ts`
   - `src/v11/shared/list/listCommandApi.ts`
5. Emiatt a cached meta-review teljes torlese nem kezdheto a public CLI/docs surface levagasaval; eloszor a control-path source-of-truthot kell atallitani.

## Executive Summary

1. Ez a task a teljes cached-meta-review removal foundation szelete.
2. A cel nem az, hogy a cached operator surfaces eltunjenek, hanem az, hogy a rendszer mukodese mar ne fuggjon a cached snapshot/state mezoktol.
3. A task akkor sikeres, ha:
   - a canonical control-path nem olvas `last_autonomous_*` mezoket,
   - a `meta_review` state blokk csak elo authority/runtime/gate ownership adatokat tart,
   - az approval override es a human-gate dontes transcript- vagy current-round metadata-alapu,
   - a status/list projection nem advertizal cached last-report/status adatot.
4. A public CLI/read-model/docs torlese nem ennek a tasknak a resze; azt a paros delivery task vegzi.

## L0 - Policy

### Goal

Vagja el a cached meta-review snapshot/state es a canonical runtime-control path kozotti fuggoseget ugy, hogy a rendszer a teljes cached-surface removal utan is determinisztikusan mukodjon.

### In Scope

1. A `BubbleMetaReviewSnapshotState` es a kapcsolodo state schema szukitese a live authority/runtime/gate ownership adatokra.
2. Az approval eligibility source-of-truth atallitasa transcript/current-round metadata iranyba.
3. A submit/live-run persistence seam-ek atirasa ugy, hogy ne irjanak `last_autonomous_*` cached scalars mezoket canonical state-be.
4. A meta-review gate/finalization helperek igazitsa az uj, szukitett state shape-hez.
5. A bubble status/list projection cleanupja, hogy ne cached last-run payloadot mutasson.
6. A fenti valtozasok regresszios tesztjei.

### Out of Scope

1. A `pairflow bubble meta-review` public CLI namespace torlese.
2. A `ReviewBubble --meta-review-source=cached` skill workflow torlese.
3. A `status` / `last-report` read-model fajlok es CLI rendererek torlese.
4. README, UI, skill es historical docs sweep.
5. Uj meta-review route vagy recommendation szemantika bevezetese.

### Safety Defaults

1. A canonical meta-review authority tovabbra is az aktiv `execution_context`, nem a cached snapshot.
2. Approval idoben a recommendation source-of-truth a current-round transcript/gate metadata; ha ez nem olvashato ki, a rendszer fail-closed marad.
3. A task nem vezethet be ketforrasu "bridge" logikat, amely egyszerre olvas transcriptet es `last_autonomous_*` cached mezoket fallbackkent.
4. A live runtime-delivery es sticky human-gate ownership csak akkor maradhat a state-ben, ha tovabbra is current-run/current-gate celra hasznalt.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - bubble state schema contract,
   - approval decision metadata contract,
   - status/list projection contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `9`
8. `single-task allowed`: `no`
9. Required split:
   - `foundation/refactor`
   - `delivery`
10. Identity/join note:
   - canonical identity path: `current round -> latest approval request / gate metadata -> approval decision`
   - competing identifiers or fallback identities: `state.meta_review.last_autonomous_*`, cached report ref, stale last-run scalars
11. Authority/source-of-truth note:
   - canonical source: `execution_context` + transcript/current-round gate metadata
   - forbidden secondary sources: `state.meta_review.last_autonomous_recommendation`, `last_autonomous_report_ref`, cached last-run summary/status`

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts`, `src/v11/domain/state/initialState.ts` | `BubbleMetaReviewSnapshotState`, `createInitialBubbleState` | type/state shape -> type/state shape | meta-review state definition | A `meta_review` state shape ne tartalmazza a cached `last_autonomous_*` scalars blokkot; csak live authority/runtime/gate ownership mezok maradhatnak. | P1 | required-now | type + state schema compile/test |
| CS2 | `src/v11/shared/state/stateSchemaMetaReview.ts`, `src/v11/shared/state/stateSchemaMetaReviewAutonomous.ts`, `src/v11/shared/state/stateSchemaMetaReviewAutonomousSupport.ts` | `validateMetaReviewSnapshot(...)` es kapcsolodo validators | `(input: unknown, errors: ValidationError[]) -> BubbleMetaReviewSnapshotState \| undefined` | meta-review schema validation | A validator az uj, szukitett shape-et fogadja el; explicit compatibility bridge vagy dual-shape policy nem adando hozza. | P1 | required-now | schema tests / build |
| CS3 | `src/v11/shared/approval/approvalTranscriptContext.ts`, `src/v11/shared/approval/approvalRoutingEligibility.ts` | `readApprovalTranscriptContext`, `resolveApprovalDecisionMetadata` | `readApprovalTranscriptContext(transcriptPath: string, round: number, dependencies: { readTranscriptEnvelopes: ReadTranscriptEnvelopesPort }) -> Promise<ApprovalTranscriptContext>`; `resolveApprovalDecisionMetadata(input: ResolveApprovalDecisionMetadataInput) -> Promise<Record<string, unknown>>` | approval decision metadata seam | Approval override eligibility a current-round transcript/gate metadata alapjan dontson; `state.meta_review.last_autonomous_recommendation` ne legyen source-of-truth. | P1 | required-now | approval tests |
| CS4 | `src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts`, `src/v11/shared/metaReview/liveRun/metaReviewLiveRunPersistence.ts`, `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`, `src/v11/shared/metaReview/metaReviewSnapshot.ts` | `writeCanonicalSubmitState`, `buildNextMetaReviewStateSnapshot`, gate/finalization helpers | existing persistence/finalization helpers -> updated state writes | canonical submit + live-run persistence | A runtime ne irjon cached `last_autonomous_*` mezoket state-be; a gate/finalization helper-ek az uj szukitett `meta_review` shape mellett is determinisztikusan route-oljanak. | P1 | required-now | core gate tests |
| CS5 | `src/v11/shared/status/statusCommandViewProjection.ts`, `src/v11/shared/list/listCommandApi.ts` | `buildStatusMetaReviewView`, `listBubbles` | existing view builders -> updated view builders | status/list projection | A projection ne surfacedeljen cached `latestStatus/latestRecommendation/latestSummary/latestReportRef/latestUpdatedAt` adatot; csak elo authority/runtime/gate status jelenjen meg. | P1 | required-now | list/status tests |
| CS6 | tests | approval/list/status/meta-review gate coverage | `vitest` coverage | regression surface | Kotelezo coverage kell arra, hogy a control-path mar nem cached snapshot mezokon all. | P1 | required-now | automated tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `state.meta_review` schema | live authority/runtime + cached `last_autonomous_*` scalars | live authority/runtime/gate ownership only | `execution_context`, `runtime_delivery`, `auto_rework_count`, `auto_rework_limit`, `sticky_human_gate` | none | breaking internal state reduction; no explicit compatibility bridge | P1 | required-now |
| Approval recommendation source | `state.meta_review.last_autonomous_recommendation` | transcript/current-round approval metadata | current round, latest approval request metadata, override flags | route diagnostics | breaking internal contract correction | P1 | required-now |
| Status/list meta-review projection | cached last-run summary/report/status fields | live authority/runtime/gate-only projection | `authorityActive`; runtime/gate fields if available | route diagnostics | breaking view simplification | P1 | required-now |
| Submit/live-run state persistence | writes cached last-run scalars into state | does not persist cached last-run scalars in state | live authority/runtime fields only | gate counters | breaking internal write contract | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| State snapshot | state shape reduction and canonical rewrites without cached scalars | dual-write or fallback-write to removed `last_autonomous_*` fields | no migration bridge | P1 | required-now |
| Transcript reads | current-round approval request metadata reads | snapshot fallback when transcript data is missing | transcript is the only decision source in approval flow | P1 | required-now |
| Status/list projection | remove cached surfaced fields | synthetic placeholder values that preserve old UI contract | absence is preferable to fake continuity | P1 | required-now |

Constraint: if no current-round approval metadata exists, approval must fail closed rather than reconstructing recommendation from deprecated cached state.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Approval decision during human gate but no current-round recommendation metadata can be derived | transcript | throw | no mutation | `APPROVAL_RECOMMENDATION_UNAVAILABLE` | warn | P1 | required-now |
| State snapshot still contains removed cached fields in old persisted file | state file load | result | ignore removed keys implicitly; no dedicated compatibility branch | N/A | info | P2 | required-now |
| Status/list view has no live meta-review authority | N/A | result | render no live meta-review detail | N/A | info | P2 | required-now |
| Gate/finalization path no longer has cached report ref in state | transcript/artifact metadata | result | use current-run/gate inputs only; do not recreate cached snapshot | N/A | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `readApprovalTranscriptContext(...)` and current-round transcript metadata | P1 | required-now |
| must-use | existing live authority/runtime fields (`execution_context`, `runtime_delivery`, `sticky_human_gate`) where still semantically valid | P1 | required-now |
| must-not-use | `state.meta_review.last_autonomous_recommendation` as approval source-of-truth | P1 | required-now |
| must-not-use | cached report ref or summary reconstruction in status/list/approval seams | P1 | required-now |
| must-not-use | compatibility shims that keep removed state fields alive for API parity | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Approval without cached state fallback | bubble `READY_FOR_HUMAN_APPROVAL`, transcript has latest round approval request metadata, state has no `last_autonomous_*` data | `resolveApprovalDecisionMetadata(...)` runs | recommendation at decision is derived correctly from transcript metadata | P1 | required-now | automated test |
| T2 | Non-approve recommendation still requires override | latest round approval request indicates `rework` or `inconclusive` | approve path runs without override | same fail-closed override behavior remains, but without reading cached state | P1 | required-now | automated test |
| T3 | State persistence writes reduced meta-review shape | active submit/live-run fixture | state write occurs | persisted `meta_review` block omits cached `last_autonomous_*` scalars | P1 | required-now | automated test |
| T4 | Status/list no longer expose cached last-run fields | bubble has no live meta-review authority | status/list projection builds | cached recommendation/status/summary/report fields are absent from surfaced contract | P1 | required-now | automated test |
| T5 | Sticky human gate remains live-only | human-gate fixture with sticky route | state transition/finalization runs | sticky gate behavior still works without cached snapshot scalars | P1 | required-now | automated test |
| T6 | Old persisted state file does not require migration bridge | fixture contains deprecated cached keys | state load + new write path runs | new write emits reduced shape without dedicated migration code | P2 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A `metaReviewSnapshot` naming a foundation task utan felrevezeto lehet; kesobbi follow-upban atnevezheto, ha mar nincs snapshot semantics.
2. [later-hardening] Ha a status/list consumer types tul sok cached fieldre epulnek, kulon UI-contract tightening follow-up nyithato a delivery task utan.

## Assumptions

1. A state validator jelenleg nem enforce-ol extra-key tilalmat, igy regi persisted fajlok removed mezoi passzivan elviselhetok dedikalt migration bridge nelkul.
2. A current-round approval request metadata elegendo source-of-truth az approval override donteshez.

## Open Questions

1. Nincs blocker open question. A task szandekosan fail-closed policyval fogalmaz, hogy transcript-hiany eseten se kelljen cached fallback.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `metaReviewSnapshot` naming cleanup a reduced state shape utan | L2 | P2 | later-hardening | task authoring | nyiss kulon rename/refactor follow-upot csak akkor, ha a delivery task utan is zavarja az olvashatosagot |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
