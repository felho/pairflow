---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_approval_and_projection_consumer_cutover_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Approval and Projection Consumer Cutover (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/v11/shared/approval/approvalTranscriptContext.ts
  - src/v11/shared/approval/approvalRoutingEligibility.ts
  - src/v11/shared/status/statusCommandViewProjection.ts
  - src/v11/shared/list/listCommandApi.ts
  - tests/v11/application/approval/approvalRoutingEligibility.test.ts
  - tests/v11/application/list/listCommandApi.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached Approval and Projection Consumer Cutover (Phase E)

## Current Codebase Check (2026-04-11)

1. Az approval override eligibility ma meg `state.meta_review.last_autonomous_recommendation` alapjan dont.
2. A bubble status/list projection ma meg cached last-run mezoket surfacedel:
   - recommendation
   - status
   - summary
   - report ref
   - updated at
3. A state-shape foundation task utan ezek a consumer seams explicit transcript/current-round es live-authority alapu cutovert igenyelnek.

## Executive Summary

1. Ez a masodik foundation task a consumer oldali cutover szelete.
2. A cel, hogy:
   - approval idoben a source-of-truth current-round transcript/gate metadata legyen,
   - status/list ne cached last-run payloadot mutasson, hanem csak elo authority/runtime/gate allapotot.
3. Ez a task mar nem mozgat state schema-t vagy persistence write seam-et.

## L0 - Policy

### Goal

Allitsa at az approval es projection consumer seams-t a cached state helyett transcript/current-round metadata es live authority/runtime adatokra.

### In Scope

1. Az approval recommendation source-of-truth cutoverja.
2. A transcript-context helper bovitese/szukitese annyira, amennyi az approval donteshez kell.
3. A status/list meta-review projection contract cleanupja cached last-run mezok nelkul.
4. A fenti consumer seams regresszios tesztjei.

### Out of Scope

1. State schema vagy persistence write seam valtoztatas.
2. Public CLI/read-model/skill/UI/docs torles.
3. Uj approval policy vagy route semantics bevezetese.

### Safety Defaults

1. Ha current-round recommendation metadata nem vezetheto le transcriptbol, approval fail-closed marad.
2. A task nem hozhat vissza cached state fallbacket.
3. Status/list projection inkabb legyen szukebb, mint hogy stale cached payloadot mutasson.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - approval decision metadata contract,
   - status/list projection contract.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: `current round -> latest approval request metadata -> approval decision`
   - competing identifiers or fallback identities: cached `last_autonomous_recommendation`, cached last-run projection fields
10. Authority/source-of-truth note:
   - canonical source: current-round transcript/gate metadata + live authority/runtime data
   - forbidden secondary sources: cached last-run state scalars

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/approval/approvalTranscriptContext.ts`, `src/v11/shared/approval/approvalRoutingEligibility.ts` | `readApprovalTranscriptContext`, `resolveApprovalDecisionMetadata` | `readApprovalTranscriptContext(transcriptPath: string, round: number, dependencies: { readTranscriptEnvelopes: ReadTranscriptEnvelopesPort }) -> Promise<ApprovalTranscriptContext>`; `resolveApprovalDecisionMetadata(input: ResolveApprovalDecisionMetadataInput) -> Promise<Record<string, unknown>>` | approval seam | Approval override eligibility a current-round transcript/gate metadata alapjan dontson; cached state ne legyen source-of-truth. | P1 | required-now | approval tests |
| CS2 | `src/v11/shared/status/statusCommandViewProjection.ts`, `src/v11/shared/list/listCommandApi.ts` | `buildStatusMetaReviewView`, `listBubbles` | existing view builders -> updated view builders | projection seam | A projection ne surfacedeljen cached `latestStatus/latestRecommendation/latestSummary/latestReportRef/latestUpdatedAt` adatot; csak elo authority/runtime/gate status jelenjen meg. | P1 | required-now | list/status tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Approval recommendation source | `state.meta_review.last_autonomous_recommendation` | transcript/current-round approval metadata | current round, latest approval request metadata, override flags | parity diagnostics | breaking internal contract correction | P1 | required-now |
| Status/list meta-review projection | cached last-run summary/report/status fields | live authority/runtime/gate-only projection | `authorityActive`; live runtime/gate fields if available | route diagnostics | breaking view simplification | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Transcript reads | current-round approval request metadata reads | cached state fallback | transcript is canonical in this task | P1 | required-now |
| Status/list projection | field removal/tightening | synthetic placeholders preserving old cached view | absence is better than stale payload | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Approval decision during human gate but no current-round recommendation metadata can be derived | transcript | throw | no mutation | `APPROVAL_RECOMMENDATION_UNAVAILABLE` | warn | P1 | required-now |
| Status/list view has no live meta-review authority | N/A | result | render no live meta-review detail | N/A | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `readApprovalTranscriptContext(...)` and current-round transcript metadata | P1 | required-now |
| must-not-use | `state.meta_review.last_autonomous_recommendation` as approval source-of-truth | P1 | required-now |
| must-not-use | cached report ref or summary reconstruction in status/list seams | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Approval without cached state fallback | bubble `READY_FOR_HUMAN_APPROVAL`, transcript has latest round approval request metadata | `resolveApprovalDecisionMetadata(...)` runs | recommendation at decision is derived correctly from transcript metadata | P1 | required-now | automated test |
| T2 | Non-approve recommendation still requires override | latest round approval request indicates `rework` or `inconclusive` | approve path runs without override | same fail-closed override behavior remains, but without reading cached state | P1 | required-now | automated test |
| T3 | Status/list no longer expose cached last-run fields | bubble has no live meta-review authority | status/list projection builds | cached recommendation/status/summary/report fields are absent from surfaced contract | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a UI vagy mas consumer kesobb tul sokat fuggott a removed status/list fields-tol, kulon consumer-contract cleanup task nyithato.

## Assumptions

1. A current-round approval request metadata elegendo source-of-truth az approval override donteshez.

## Open Questions

1. Nincs blocker open question.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | esetleges UI-consumer follow-up, ha a projection szukites tovabbi feluleteket erint | L2 | P2 | later-hardening | task authoring | csak konkret import/consumer torzs miatt nyisd meg |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
