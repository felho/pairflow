---
artifact_type: task
artifact_id: task_meta_review_approve_advisory_open_findings_semantic_support_phase2_v1
title: "Meta-Review Approve + Advisory Open Findings Semantic Support (Phase 2)"
status: draft
phase: phase2
target_files:
  - src/core/bubble/metaReview.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsClaimParsing.ts
  - src/core/bubble/approvalRequestEnvelope.ts
  - src/types/protocol.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/v11/shared/start/startCommandPrompts.ts
  - src/v11/shared/metaReviewGate/metaReviewGateNotify.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/approvalRequestEnvelope.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.test.ts
  - docs/meta-review-gate-rollout-runbook.md
prd_ref: null
plan_ref: plans/tasks/meta-review-summary-structured-parity-enforcement-phase1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Approve + Advisory Open Findings Semantic Support (Phase 2)

## L0 - Policy

### Goal

Legyen explicit es audit-biztos a use-case, amikor a meta-review recommendation `approve`, de marad nyitott, nem-blokkolo advisory finding (P2/P3). A rendszer ezt ne kezelje ellentmondaskent, hanem strukturaltan, egyertelmu szemantikaval.

### Context

1. Phase1 fix utan a summary-vs-structured mismatch blokkolva lesz.
2. Ugyanakkor legitim workflow, hogy `approve` mellett advisory nyitott pont maradjon.
3. Jelenleg ez implicit vagy tiltott kombinaciokba csuszhat, emiatt approval jelentese nem eleg pontos.

### In Scope

1. Approve-route szemantika formalizalasa advisory open findings esetre.
2. Structured report_json kovetelmenyek kiegeszitese advisory/blocking split invariansokkal.
3. Validation guard modositas: ne a nyitott finding tenyet tiltsa, hanem a blokkolo invarians serulest.
4. Approval envelope metadata/szoveg konzisztencia biztositas explicit split mezo alapjan.
5. Prompt es runbook frissites, hogy a meta-reviewer helyesen toltse a split mezoket.
6. Regresszios tesztek a legitim `approve + advisory_open_total>0` workflowra.

### Out of Scope

1. Severity ontology modositas (`P0..P3` jelentese valtozatlan).
2. Auto-rework budget policy redesign.
3. Historical artifact migration.

### Safety Defaults

1. `approve` csak akkor engedett nyitott finding mellett, ha `blocking_open_total == 0`.
2. Advisory-only approve eseten split metadata kotelezoen audit-kepes.
3. Split metadata hiany/inconsistency eseten fail-closed dispatch-failed route (nem silent approve).

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - meta-review structured claim semantics,
   - approval envelope metadata semantics,
   - protocol typing (findings split/parity fields explicit use policy),
   - operator instruction contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts` | preflight validation | `(recommendation, reportJson) -> pass|fail` | approve branch validation | `approve` ne fail-eljen automatikusan open findingre; helyette split-invariant ellenorzes fusson (`blocking==0`) | P1 | required-now | T1,T2,T3 |
| CS2 | `src/core/bubble/metaReview.ts` | canonical report_json normalization | `(recommendation, reportJson, runId) -> canonicalReportJson` | `resolveCanonicalMetaReviewReportJson` | advisory-only approve esetben canonical split mezok megorzese/esetleges normalizalasa | P1 | required-now | T1,T4 |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts` | parity/open-split metadata extraction | `(reportJson) -> FindingsParityMetadata` | split resolver helpers | approval metadata deterministicen hordozza advisory/blocking nyitott mennyisegeket | P1 | required-now | T4,T5 |
| CS4 | `src/core/bubble/approvalRequestEnvelope.ts` | summary consistency + metadata mapping | `(summary, parityMetadata, findings) -> normalized summary/metadata` | approval request assembly | legit advisory-only approve esetben ne legyen mismatch-normalization; metadata explicit maradjon | P1 | required-now | T5,T6 |
| CS5 | `src/types/protocol.ts` | protocol typing clarification | type/schema delta | parity metadata contract | findings split mezok hasznalata canonical route-ban tipusszinten dokumentalt es tesztelt | P2 | required-now | T7 |
| CS6 | `src/core/runtime/tmuxDelivery.ts`, `src/v11/shared/start/startCommandPrompts.ts`, `src/v11/shared/metaReviewGate/metaReviewGateNotify.ts` | instruction contract | string update | meta-review task prompt | approve+advisory scenariohoz split metadata kitoltes explicit guidance | P2 | required-now | T8 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Approve semantic meaning | implicit "clean" felhang | explicit "no blocking findings" | `recommendation=approve`, `findings_blocking_open_total=0` | `findings_advisory_open_total>=0` | behavior clarification | P1 | required-now |
| Open findings accounting | osszemosott/eszeti | split canonical accounting | `findings_claimed_open_total`, `findings_blocking_open_total`, `findings_advisory_open_total` | `findings_artifact_open_total` | additive/tightening | P1 | required-now |
| Approval parity | mismatch kulon kezeles | split-aware parity | parity status + split counts | diagnostics | additive | P1 | required-now |

Normative semantic rules (phase2):
1. `recommendation=approve` legit, ha:
   - `findings_blocking_open_total == 0`,
   - `findings_advisory_open_total >= 0`,
   - claimed/parity metadata internally consistent.
2. `recommendation=approve` invalid, ha barmilyen blocking finding nyitott.
3. Advisory-only approve esetben summary allithat nyitott findingot, ha structured split ezt alataamasztja.
4. Structured split mezok nelkul advisory-only approve nem fogadhato el.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Approval routing | approve advisory-only path explicit metadata-val | approve blocking finding mellett | safety boundary | P1 | required-now |
| Metadata normalization | split invariansok enforce-olasa | split nelkuli implicit "guess" approval | auditability | P1 | required-now |
| Summary normalization | mismatch jelzes csak tenyleges metadata konfliktusnal | legitim advisory-open summary elnyomasa | operator trust | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| approve + blocking_open_total > 0 | split metadata | fail | dispatch-failed / explicit reject | `META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT` | warn | P1 | required-now |
| approve + advisory_open_total > 0 + split valid | split metadata | result | human_gate_approve route megengedett | `META_REVIEW_APPROVE_ADVISORY_ONLY` | info | P1 | required-now |
| approve + advisory summary, de split hianyzik | report_json | fail | submit/gate reject, resubmit required | `META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED` | warn | P1 | required-now |
| split osszegzes/parity inkonzisztens | parity helpers | fail | dispatch-failed normalized summaryval | `META_REVIEW_FINDINGS_PARITY_GUARD` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `resolveFindingsOpenSplitFromReportJson`, `resolveFindingsParityMetadataFromReportJson` | P1 | required-now |
| must-use | existing summary consistency engine (`approvalRequestEnvelope`), csak split-aware kiegeszitessel | P1 | required-now |
| must-use | phase1 summary-vs-structured guard eredmenyeire epites | P1 | required-now |
| must-not-use | uj, parhuzamos open-finding parser logika meglvo helper-ek helyett | P2 | required-now |
| must-not-use | approval dontes summary-only text parser alapjan structured split nelkul | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Approve + advisory-only valid | `approve`, `blocking=0`, `advisory=1` | validation fut | pass, no contradiction | P1 | required-now | automated test |
| T2 | Approve + blocking invalid | `approve`, `blocking>0` | validation fut | fail `META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT` | P1 | required-now | automated test |
| T3 | Approve advisory summary with missing split | summary open finding, split absent | submit/gate fut | fail `META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED` | P1 | required-now | automated test |
| T4 | Canonicalization keeps split semantics | advisory-only approve payload | canonical report_json write | split counts persisted determinisztikusan | P1 | required-now | automated test |
| T5 | Approval envelope metadata parity | advisory-only approve | envelope build | metadata includes claimed/blocking/advisory totals | P1 | required-now | automated test |
| T6 | Summary normalization does not over-normalize | legit advisory-open summary + split aligned | approval summary consistency eval | summary marad eredeti, nincs false mismatch | P1 | required-now | automated test |
| T7 | Protocol typing compatibility | parity fields jelen/nem jelen | typecheck/test | additive typing regresszio nelkul | P2 | required-now | automated test |
| T8 | Prompt contract for meta-reviewer | meta-review task signal | prompt render | explicit split kitoltes guidance szerepel | P2 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add dedicated semantic flag in report_json (pl. `approve_semantics: blocking_clean`) for easier downstream analytics.
2. [later-hardening] Extend CLI human-readable status with concise "approve-with-advisory" badge.

## Assumptions

1. "Approve" uzleti jelentese: nincs blokkolo nyitott finding, de advisory nyitott finding lehet.
2. A phase1 guard mar biztositja, hogy summary-vs-structured contradiction ne csuszhasson at.

## Open Questions

1. Kell-e kulon enum/allapot a claim state-hez (`advisory_open_only`), vagy eleg a split-based semantic rule?
2. Advisory-only approve eseten kotelezo legyen-e advisory finding lista (`findings[]`) is, vagy eleg a split count?

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Approve-with-advisory analytics | L2 | P2 | later-hardening | ops/reporting | add route/count metric by advisory_open_total |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Semantikai valtozas csak split-invariant alapu, deterministic szabalyokkal.
3. Legitim advisory-only approve ne legyen tobbe mismatch-kent kezelve.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. `approve + advisory_only_open` workflow explicit es konzisztens structured metadata-val tamogatott.
2. `approve + blocking_open` determinisztikusan tiltott.
3. Approval request summary + metadata paritas audit-kepesen fennmarad.
