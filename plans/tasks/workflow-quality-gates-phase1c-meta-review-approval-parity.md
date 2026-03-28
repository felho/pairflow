---
artifact_type: task
artifact_id: task_workflow_quality_gates_phase1c_meta_review_approval_parity_v1
title: "Workflow Quality Gates Phase 1C - Meta-Review and Approval Parity"
status: implementable
phase: phase1c
target_files:
  - "src/core/bubble/metaReview.ts"
  - "src/core/bubble/approvalRequestEnvelope.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts"
  - "tests/core/bubble/metaReview.test.ts"
  - "tests/core/bubble/approvalRequestEnvelope.test.ts"
  - "tests/cli/bubbleMetaReviewCommand.test.ts"
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Workflow Quality Gates Phase 1C - Meta-Review and Approval Parity

## L0 - Policy

### Goal

Egységesiteni a same-round reviewer convergence truth source-ot a meta-review submit/run es az approval request build path kozott, hogy clean approve claim csak akkor mehessen at, ha ugyanaz a legfrissebb same-round reviewer snapshot tenylegesen clean.

### In Scope

1. Ugyanannak a latest same-round reviewer convergence snapshotnak a hasznalata a meta-review es approval pathokon.
2. Metadata-fallback szemantika egységesitese akkor is, ha a reviewer payload `findings` listaja ures vagy hianyzik.
3. Approval clean claim blockolas, ha a same-round reviewer convergence meg open findingot reportol.
4. Advisory finding fallback csak a megfelelo same-round reviewer snapshotbol tortenjen.
5. Paritas tesztek a metadata-only open findings, latest-snapshot wins, es clean/open mismatch esetekre.

### Out of Scope

1. PASS validation gate core.
2. Restart/reconcile recovery marker logika.
3. Reviewer directive vagy PASS artifact semantics.

### Safety Defaults

1. Approve pathon a clean claim fail-closed legyen, ha a same-round reviewer truth source open findingra utal.
2. Ha a metadata es a findings lista kozt bizonytalansag van, ne legyen silent clean normalization a reviewer truth source ellen.
3. A latest same-round snapshot legyen az authority; regebbi snapshot csak akkor szamit, ha nala ujabb nincs.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Belso human-gate/meta-review consistency hardening, publikus API vagy config modositas nelkul.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReview.ts` | same-round snapshot resolution + parity assert | internal helpers in `runMetaReview` / `submitMetaReviewResult` | meta-review report -> human gate boundary | Clean approve report ne mehessen at, ha latest reviewer convergence nem clean | P1 | required-now | Existing review finding pattern |
| CS2 | `src/core/bubble/approvalRequestEnvelope.ts` | latest reviewer convergence snapshot + approval guard | `appendHumanApprovalRequestEnvelope` | approval request build | Ugyanazt a truth source-ot hasznalja, mint a meta-review submit path | P1 | required-now | Jelenleg a ket path el tud csuszni |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts` | advisory finding extraction helpers | helper layer | approval fallback consistency | Metadata-only/open advisory snapshotok kompatibilis kezelese | P2 | required-now | Helper-level konzisztencia |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Same-round convergence snapshot | meta-review es approval kulon logikaval olvas | kozositett vagy szemantikailag azonos feloldas | `round`, `envelopeId`, `openFindingsTotal` | `advisoryFindings` | non-breaking internal | P1 | required-now |
| Clean approve claim guard | reszben findings-lista kozpontu | metadata-aware same-round truth-source guard | `summary/recommendation`, reviewer snapshot open total | `advisoryFindings` fallback | non-breaking internal | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Transcript read | latest same-round reviewer convergence read | cross-round vagy stale snapshot preferalasa ujabb same-round snapshot felett | Authority a legfrissebb same-round snapshot | P1 | required-now |
| Approval/meta-review routing | fail-closed block or proceed | clean approve atengedese metadata-only open findings mellett | Ez a task fo safety policyja | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| latest same-round reviewer snapshot open findingset reportol | transcript snapshot | throw | clean approve block | `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT` vagy meglovo fail-closed parity code | error | P1 | required-now |
| metadata-only open findings | transcript snapshot | throw | clean approve block | same as above | error | P1 | required-now |
| older snapshot open, latest clean | transcript snapshot | result | latest clean snapshot wins | none | info | P1 | required-now |
| advisory findings omitted from routing input | transcript snapshot | fallback | same-round reviewer advisory findings reuse | none | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | latest same-round transcript scan, current parity metadata helpers | P2 | required-now |
| must-not-use | approval-path es meta-review-path kulon open-count szemantika | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | metadata-only open findings on approval path | latest same-round snapshot `findings=[]`, metadata open total > 0 | approval request build | clean approve blocked | P1 | required-now | review identified fail-open risk |
| T2 | metadata-only open findings on meta-review submit path | latest same-round snapshot metadata open total > 0 | submit approve report | submit blocked | P1 | required-now | path parity |
| T3 | latest snapshot clean, older open | ket same-round snapshot | approval/meta-review | latest clean wins | P1 | required-now | stale snapshot regression |
| T4 | omitted advisory list in routing input | approval route input `findings` missing | approval request build | same-round reviewer advisory findings reused | P2 | required-now | summary parity |
| T5 | contradictory clean summary vs reviewer snapshot | clean approve claim | approval/meta-review | fail-closed parity error | P1 | required-now | authority consistency |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kesoibb lehet egy kozos helper a snapshot resolutionre, ha a ket path kodszinten is ugyanazt a primitive-et hasznalhatja.

## Assumptions

1. A reviewer convergence payload metadataja source-of-truth lehet akkor is, ha a `findings` lista ures vagy nem teljes.
2. A latest same-round snapshot authority-ja magasabb, mint barmely korabbi same-round advisory allapot.

## Open Questions

1. No blocking open questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Snapshot-resolution helper deduplikacio | L2 | P2 | later-hardening | code review 2026-03-28 | Kulon refactor, ha a parity semantics mar stabil |

## Review Control

1. A task nem enged be PASS gate vagy recovery-marker scope creep-et.
2. Uj `required-now` csak same-round reviewer truth source inkonzisztenciabol johet.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
