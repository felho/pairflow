---
artifact_type: task
artifact_id: task_meta_review_approve_advisory_open_findings_semantic_support_phase2_v3
title: "Meta-Review Approve + Advisory Open Findings Semantic Support (Phase 2)"
status: implementable
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
plan_ref: plans/archive/tasks/meta-review-gate/meta-review-summary-structured-parity-enforcement-phase1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/tasks/meta-review-gate/meta-review-summary-structured-parity-enforcement-phase1.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Approve + Advisory Open Findings Semantic Support (Phase 2)

## L0 - Policy

### Goal

Legyen explicit es audit-biztos a use-case, amikor a meta-review recommendation `approve`, de marad nyitott, nem-blokkolo advisory finding (P2/P3). A rendszer ezt ne kezelje ellentmondaskent, hanem strukturaltan, egyertelmu szemantikaval.

### Context (Phase1 Delta)

1. Phase1 fix utan a summary-vs-structured mismatch blokkolva lesz.
2. Ugyanakkor legitim workflow, hogy `approve` mellett advisory nyitott pont maradjon.
3. Jelenleg ez implicit vagy tiltott kombinaciokba csuszhat, emiatt approval jelentese nem eleg pontos.
4. Phase2 explicit policy-delta:
   - Phase1 "approve + barmilyen open finding fail-closed" guard helyett split-aware guard kell.
   - Uj szabaly: `approve` csak akkor tiltott, ha nyitott blocking finding van.

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
2. Advisory-only approve eseten split metadata kotelezoen audit-kepes (`findings_claimed_open_total`, `findings_blocking_open_total`, `findings_advisory_open_total`).
3. Split metadata hiany/inconsistency eseten fail-closed dispatch-failed route (nem silent approve).
4. Determinisztikus szamossagi invariansok:
   - `findings_claimed_open_total = findings_blocking_open_total + findings_advisory_open_total`
   - ha jelen van `findings_artifact_open_total`, akkor `findings_artifact_open_total = findings_claimed_open_total`

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
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts` | preflight validation | `(recommendation, reportJson) -> pass|fail` | approve semantic gate branch | `approve` ne fail-eljen automatikusan open findingre; split-invariant + blocking guard fusson (`blocking==0` kotelezo). Supersession csak ezen approve semantic gate dontesi agra vonatkozik; phase1 parity contradiction tovabbra is fail-closed precondition. | P1 | required-now | T1,T2,T3,T4,T8,T11,T12 |
| CS2 | `src/core/bubble/metaReview.ts` | canonical report_json normalization | `(recommendation, reportJson, runId) -> canonicalReportJson` | `resolveCanonicalMetaReviewReportJson` | advisory-only approve esetben canonical split mezok megorzese/normalizalasa determinisztikusan | P1 | required-now | T1,T5 |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts` | parity/open-split metadata extraction | `(reportJson) -> FindingsParityMetadata` | split resolver helpers | approval metadata deterministicen hordozza claimed/blocking/advisory totalokat es parity allapotot | P1 | required-now | T5,T6,T11 |
| CS4 | `src/core/bubble/approvalRequestEnvelope.ts` | summary consistency + metadata mapping | `(summary, parityMetadata, findings) -> normalized summary/metadata` | approval request assembly | legit advisory-only approve esetben ne legyen false mismatch-normalization; metadata explicit maradjon | P1 | required-now | T6,T7 |
| CS5 | `src/types/protocol.ts` | protocol typing clarification | type/schema delta | parity metadata contract | split mezo-kovetelmenyek canonical approve route-ban tipusszinten dokumentaltak es teszteltek | P2 | required-now | T9 |
| CS6 | `src/core/runtime/tmuxDelivery.ts`, `src/v11/shared/start/startCommandPrompts.ts`, `src/v11/shared/metaReviewGate/metaReviewGateNotify.ts` | instruction contract | string update | meta-review task prompt | approve+advisory scenariohoz split metadata kitoltes explicit guidance + fail-closed reminder | P2 | required-now | T10 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Approve semantic meaning | implicit "clean" felhang | explicit "no blocking findings" | `recommendation=approve`, `findings_blocking_open_total=0` | `findings_advisory_open_total>=0` | behavior clarification | P1 | required-now |
| Open findings accounting | osszemosott/eseti | split canonical accounting | `findings_claimed_open_total`, `findings_blocking_open_total`, `findings_advisory_open_total` | `findings_artifact_open_total` | additive/tightening | P1 | required-now |
| Approval parity | mismatch kulon kezeles | split-aware parity | parity status + split counts | diagnostics | additive | P1 | required-now |

#### 2.1 Normative split field contract (phase2)

1. `recommendation=approve` eseten a split triplet kotelezo:
   - `findings_claimed_open_total`
   - `findings_blocking_open_total`
   - `findings_advisory_open_total`
2. Mindharom mezo egesz szam (`integer`) es `>= 0`.
3. Kotelezo invarians:
   - `findings_claimed_open_total = findings_blocking_open_total + findings_advisory_open_total`
4. Ha `findings_artifact_open_total` jelen van, akkor:
   - `findings_artifact_open_total = findings_claimed_open_total`
5. `findings[]` lista optional marad, de ha jelen van, nem mondhat ellent a split totaloknak.

#### 2.2 Normative semantic rules (phase2)

1. `recommendation=approve` legit, ha:
   - `findings_blocking_open_total == 0`,
   - `findings_advisory_open_total >= 0`,
   - claimed/parity metadata internally consistent,
   - phase1 summary-vs-structured parity guard sem sertett.
2. `recommendation=approve` invalid, ha barmilyen blocking finding nyitott.
3. Advisory-only approve esetben summary allithat nyitott findingot, ha structured split ezt alataamasztja.
4. A split mezo-kotelezettseg normativ forrasa a 2.1.1 pont; ennek hianya approve pathon fail-closed.
5. Phase1 parity policy valtozatlanul ervenyes:
   - summary es structured metadata nem lehet ellentmondo.
6. Structured metadata marad az authority source; summary csak akkor elfogadhato, ha az invariansokkal konzisztens.
7. Supersession note:
   - phase1 rule #3 (`recommendation=approve` + barmilyen nyitott finding fail-closed) a `metaReviewGateFindingsValidation` approve semantic gate dontesi agaban phase2-ben superseded,
   - helyette ugyanebben a gate dontesi pontban blocking-only tiltasi szabaly ervenyes,
   - phase1 `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` parity guard valtozatlanul kotelezo precondition marad az approve semantic gate futasa elott.
8. Scope boundary note:
   - a split mezo-kovetelmenyek ebben a phase2 taskban az approve semantic gate utvonalra vonatkoznak;
   - non-approve (`rework|inconclusive`) split semantics ebben a taskban out-of-scope.

#### 2.3 Implementation clarifier (docs-only scope)

1. Runtime implementacios fazisban kulon ellenorizendo az approval payloadban:
   - summary allitasok es split metadata mezo(k) kozotti konzisztencia,
   - parity/invariant megfeleles a gate dontes elott.
2. Ez a task dokumentacios clarifier; nem novel scope-ot `src/**` vagy runtime implementacio iranyba ebben a korben.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Approval routing | approve advisory-only path explicit metadata-val | approve blocking finding mellett | safety boundary | P1 | required-now |
| Metadata normalization | split invariansok enforce-olasa | split nelkuli implicit "guess" approval | auditability | P1 | required-now |
| Summary normalization | mismatch jelzes csak tenyleges metadata konfliktusnal | legitim advisory-open summary elnyomasa | operator trust | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| summary vs structured contradiction (phase1 parity guard) | summary assertion + report_json | fail | submit/gate reject, parity fix required | `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` | warn | P1 | required-now |
| approve + blocking_open_total > 0 | split metadata | fail | dispatch-failed / explicit reject | `META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT` | warn | P1 | required-now |
| approve + advisory_open_total > 0 + split valid | split metadata | result | human_gate_approve route megengedett | `META_REVIEW_APPROVE_ADVISORY_ONLY` | info | P1 | required-now |
| approve path + required split field hianyzik | report_json | fail | submit/gate reject, resubmit required | `META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED` | warn | P1 | required-now |
| split osszegzes/parity inkonzisztens | parity helpers | fail | dispatch-failed normalized summaryval | `META_REVIEW_FINDINGS_PARITY_GUARD` | warn | P1 | required-now |
| approve + split mezo format invalid (negative/non-integer) | report_json schema | fail | submit/gate reject, schema fix required | `META_REVIEW_APPROVE_ADVISORY_SPLIT_FORMAT_INVALID` | warn | P1 | required-now |

Reason-code precedence (deterministic):
1. Required split field hiba (`META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED`) megeloz minden semantic dontest.
2. Split format/range hiba (`META_REVIEW_APPROVE_ADVISORY_SPLIT_FORMAT_INVALID`) megelozi a parity/semantic guardokat.
3. Phase1 parity contradiction (`META_REVIEW_SUMMARY_STRUCTURED_MISMATCH`) a semantic gate elott ervenyesul.
4. Ezutan parity/invariant guard (`META_REVIEW_FINDINGS_PARITY_GUARD`) ervenyesul, beleertve az artifact-open invariant mismatch esetet is.
5. Vegul approve semantic guard:
   - blocking present -> `META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT`
   - advisory-only valid -> `META_REVIEW_APPROVE_ADVISORY_ONLY`.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `resolveFindingsOpenSplitFromReportJson`, `resolveFindingsParityMetadataFromReportJson` | P1 | required-now |
| must-use | existing summary consistency engine (`approvalRequestEnvelope`), csak split-aware kiegeszitessel | P1 | required-now |
| must-use | phase1 summary-vs-structured guard eredmenyeire epites (nem megkerules), mint kotelezo precondition az approve semantic gate dontesi ag elott | P1 | required-now |
| must-not-use | uj, parhuzamos open-finding parser logika meglvo helper-ek helyett | P2 | required-now |
| must-not-use | approval dontes summary-only text parser alapjan structured split nelkul | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Approve + advisory-only valid | `approve`, `claimed=1`, `blocking=0`, `advisory=1`, summary advisory-open | validation fut | pass, `META_REVIEW_APPROVE_ADVISORY_ONLY` diagnostic route | P1 | required-now | automated test |
| T2 | Approve + blocking invalid | `approve`, `claimed=1`, `blocking=1`, `advisory=0` | validation fut | fail `META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT` | P1 | required-now | automated test |
| T3 | Approve + missing required split fields | `approve` recommendation, required split mezo(k) hianyoznak | submit/gate fut | fail `META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED` | P1 | required-now | automated test |
| T4 | Approve + split arithmetic mismatch | `claimed=2`, `blocking=0`, `advisory=1` | validation fut | fail `META_REVIEW_FINDINGS_PARITY_GUARD` | P1 | required-now | automated test |
| T5 | Canonicalization keeps split semantics | advisory-only approve payload | canonical report_json write | split counts persisted determinisztikusan | P1 | required-now | automated test |
| T6 | Approval envelope metadata parity | advisory-only approve | envelope build | metadata contains claimed/blocking/advisory totals and parity fields | P1 | required-now | automated test |
| T7 | Summary normalization no over-normalize | legit advisory-open summary + split aligned | summary consistency eval | summary marad eredeti, nincs false mismatch | P1 | required-now | automated test |
| T8 | Summary/structured contradiction still blocked | summary `no findings`, structured advisory-open | submit/gate fut | fail phase1 parity guard reason code-dal | P1 | required-now | automated test |
| T9 | Protocol typing compatibility | split/parity fields jelen/nem jelen, approve/non-approve path | typecheck/test | additive typing regresszio nelkul | P2 | required-now | automated test |
| T10 | Prompt contract for meta-reviewer | meta-review task signal | prompt render | explicit split kitoltes guidance + approve advisory semantics szerepel | P2 | required-now | automated test |
| T11 | Artifact-open invariant enforcement | `claimed=1`, `blocking=0`, `advisory=1`, `artifact=2` | validation fut | fail `META_REVIEW_FINDINGS_PARITY_GUARD` | P1 | required-now | automated test |
| T12 | Split format guard precedence | `approve`, split mezo non-integer vagy negativ | validation fut | fail `META_REVIEW_APPROVE_ADVISORY_SPLIT_FORMAT_INVALID` (semantic gate elott) | P1 | required-now | automated test |

## Acceptance Criteria (Binary)

1. AC1: `approve + advisory-only open` deterministicen tamogatott split-aware route-on.
2. AC2: `approve + blocking_open > 0` determinisztikusan tiltott (`META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT`).
3. AC3: Approve pathon split triplet hianya vagy format hiba fail-closed.
4. AC4: Split arithmetic/parity invarians sertese fail-closed (`META_REVIEW_FINDINGS_PARITY_GUARD`).
5. AC5: Approval envelope metadata claimed/blocking/advisory totalokat audit-kepesen hordozza.
6. AC6: Phase1 summary-vs-structured parity guard tovabbra is ervenyes.
7. AC7: Prompt/runbook guidance expliciten leirja approve+advisory split kitoltesi kotelezettseget.

## AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1,T5,T6,T7 |
| AC2 | T2 |
| AC3 | T3,T12 |
| AC4 | T4,T11 |
| AC5 | T6 |
| AC6 | T8 |
| AC7 | T10 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add dedicated semantic flag in report_json (pl. `approve_semantics: blocking_clean`) for easier downstream analytics.
2. [later-hardening] Extend CLI human-readable status with concise "approve-with-advisory" badge.

## Assumptions

1. "Approve" uzleti jelentese: nincs blokkolo nyitott finding, de advisory nyitott finding lehet.
2. A phase1 guard mar biztositja, hogy summary-vs-structured contradiction ne csuszhasson at.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Approve-with-advisory analytics | L2 | P2 | later-hardening | ops/reporting | add route/count metric by advisory_open_total |

## Resolution Record

1. Claim-state enum kerdes: kulon `advisory_open_only` enum ebben a fazisban nem kotelezo; split-based semantics az authority.
2. `findings[]` lista kerdes: advisory-only approve eseten optional marad; kotelezo audit-source a split triplet.

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Semantikai valtozas csak split-invariant alapu, deterministic szabalyokkal.
3. Legitim advisory-only approve ne legyen tobbe mismatch-kent kezelve.
4. Blocker definicio: csak `P0/P1 + required-now + L1` finding blokkolja az IMPLEMENTABLE allapotot.

## Revision Log

1. `v2` (docs-only implementer refinement): status `implementable`; split triplet invariansok, reason-code precedence, phase1-delta explicititas, AC+traceability matrix, open question feloldas.
2. `v3` (R1 fix pack): phase1 mismatch reason-code visszaemelve az error contractba; T2 claimed-total pontositas; CS/T evidence remap; kulon artifact-open invariant teszt (`T11`); split format kulon reason-code (`META_REVIEW_APPROVE_ADVISORY_SPLIT_FORMAT_INVALID`); explicit phase1 rule #3 supersession.
3. `v4` (human rework clarifier pack): SPLIT_REQUIRED trigger scope altalanositva approve-path required split hianyra (Error/Fallback + T3), supersession boundary komponens-szinten explicititve (Normative rules + CS1 + Dependency), es docs-only payload-konzisztencia implementation clarifier hozzaadva.
4. `v5` (human advisory rework): non-approve path scope-hatar explicititve a 2.2 blokk vegen; split-required duplikacio csokkentve (2.2.4 most 2.1.1-re hivatkozik); precedence 4. pontban artifact-open invariant mismatch explicititve.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. `approve + advisory_only_open` workflow explicit es konzisztens structured metadata-val tamogatott.
2. `approve + blocking_open` determinisztikusan tiltott.
3. Approval request summary + metadata paritas audit-kepesen fennmarad.
4. Split field invariansok (`claimed = blocking + advisory`) deterministicen enforce-oltak.
5. Phase1 summary-vs-structured parity guard nem gyengul phase2-ben.
