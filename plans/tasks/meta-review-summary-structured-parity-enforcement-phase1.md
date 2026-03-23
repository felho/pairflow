---
artifact_type: task
artifact_id: task_meta_review_summary_structured_parity_enforcement_phase1_v1
title: "Meta-Review Summary vs Structured Parity Enforcement (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/bubble/metaReview.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsClaimParsing.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/v11/shared/start/startCommandPrompts.ts
  - src/v11/shared/metaReviewGate/metaReviewGateNotify.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
prd_ref: null
plan_ref: plans/tasks/meta-review-approve-open-findings-consistency-and-auto-rework-dispatch-phase1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Summary vs Structured Parity Enforcement (Phase 1)

## L0 - Policy

### Goal

Szukitsuk nullara azt az allapotot, amikor a meta-review szoveges summary es a strukturalt `report_json` ugyanarra a runra ellentmondo allitast ad (pl. summary szerint van nyitott finding, metadata szerint `clean/0`).

### Context (Observed Evidence)

1. Real workflow tunet (`s16e-doc-refinement`):
   - human-facing summary: "1 nyitott nem blokkolo finding maradt",
   - structured metadata: `findings_claim_state=clean`, `findings_count=0`.
2. Kovetkezmeny:
   - audit parity gyengul,
   - automation metadata alapjan tevesen "clean" allapotot lat.

### In Scope

1. Structured submit contract szigoritasa: meta-review submit csak ellenorzott `report_json`-nal menjen at.
2. Summary vs structured consistency gate a submit oldalon (fail-closed).
3. Canonical reason-code alapu hiba visszajelzes, hogy a meta-reviewer ujra tudjon submitolni.
4. Meta-reviewer prompt/utasitas frissites: `--report-json` gyakorlati kotelezettseg egyertelmusitese.
5. Regresszios tesztek a fenti mismatch mintara.

### Out of Scope

1. `approve + advisory open findings` szemantika bevezetese (kulon task, phase2).
2. Meta-review recommendation policy ujratervezese.
3. Historical artifact atiras.

### Safety Defaults

1. Inkonzisztens submit fail-closed: nincs silent fallback `clean/0` summary-ellentmondas mellett.
2. Submit hiba eseten lifecycle maradjon `META_REVIEW_RUNNING`, explicit ujrasubmit celzassal.
3. Structured claim nelkul nincs approval route refresh.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Blast radius:
   - meta-review submit validation,
   - prompting/operational guidance szovegek,
   - teszt coverage.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReview.ts` | submit validation path | `(MetaReviewSubmitInput) -> MetaReviewSubmitResult` | `submitMetaReviewResult` canonicalization elott | `report_json` hianyos/ellentmondo esetben submit reject explicit reason code-dal | P1 | required-now | T1,T2,T3 |
| CS2 | `src/core/bubble/metaReview.ts` | summary-claim consistency check | `(summary, report_json, recommendation) -> ok|error` | submit-time guard | positive summary assertion nem mehet at `clean/0` structured allapottal, es forditva | P1 | required-now | T2,T4 |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsClaimParsing.ts` | claim/count parser reuse | existing helper reuse | consistency check helper | ugyanaz a claim/count parser legyen a gate es submit oldalon | P2 | required-now | T1,T4 |
| CS4 | `src/core/runtime/tmuxDelivery.ts`, `src/v11/shared/start/startCommandPrompts.ts`, `src/v11/shared/metaReviewGate/metaReviewGateNotify.ts` | meta-review submit instruction text | string contract | meta-reviewer utasitasok | utasitas egyertelmusitse a strukturalt `--report-json` kovetelmenyt es parity celjat | P2 | required-now | T5 |
| CS5 | `tests/core/bubble/metaReview.test.ts` | submit regresszio | vitest | submit spec tests | mismatch scenario deterministicen reprodukalva es blokkolva | P1 | required-now | T1-T4 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review submit payload | `report_json` gyakorlatban optional | parity-vedett structured submit | `findings_claim_state`, `findings_claim_source`, `findings_count` | split/digest/run-link metadata | behavior-tightening | P1 | required-now |
| Summary vs structured relation | implicit/heuristic | explicit validated | summary parser + structured count/claim | parser diagnostics | additive diagnostics | P1 | required-now |
| Prompt contract | `--report-json` emlitve, de konnyen kihagyhato | explicit operational requirement | structured submit instruction | examples | non-breaking text update | P2 | required-now |

Normative consistency rules (phase1):
1. Ha summary pozitiv allitast tesz nyitott findingra, structured side nem lehet `findings_count=0`.
2. Ha summary "no findings" allitast tesz, structured side nem lehet pozitiv open finding count.
3. `recommendation=approve` + structured `open_findings` marad fail-closed (existing guard marad).
4. Ambiguous summary eseten structured mezok a source-of-truth.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Submit lifecycle | reject inconsistent submit | silent canonicalization `clean/0` contradiction alatt | quality gate behavior | P1 | required-now |
| Diagnostics | explicit reason code + operator message | generic "schema invalid" context nelkul | auditability | P1 | required-now |
| Prompting | structured contract erositese | summary-only submit mint "normal" pattern | operator guidance | P2 | required-now |

Constraint: a guard csak validate/route szint, nincs product/runtime feature side-effect.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `report_json` hianyzik submitkor | submit payload | throw | submit elutasitva, ujrasubmit szukseges | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| summary open-claim vs structured zero mismatch | summary parser + report_json | throw | submit elutasitva, parity fix szukseges | `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` | warn | P1 | required-now |
| summary no-findings vs structured open mismatch | summary parser + report_json | throw | submit elutasitva, parity fix szukseges | `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` | warn | P1 | required-now |
| parser nem tud egyertelmu claimet adni | summary parser | result | structured report_json marad source-of-truth | `CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `evaluatePositiveSummaryFindingsAssertion`, `evaluateNoFindingsSummaryFindingsAssertion` (`src/core/convergence/policy.ts`) | P1 | required-now |
| must-use | `resolveFindingsCountFromMetaReviewReportJson` es meglvo claim parser helper-ek | P1 | required-now |
| must-use | existing meta-review error normalization (`MetaReviewError`) | P1 | required-now |
| must-not-use | summary-only legacy parser dontes structured parity helyett | P1 | required-now |
| must-not-use | uj, kulon parser logika duplikalasa meglvo helper-ek helyett | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Missing report_json reject | valid summary + no `report_json` | submit fut | deterministic reject + reason code | P1 | required-now | automated test |
| T2 | Positive summary vs `findings_count=0` | summary szerint van nyitott finding, structured zero | submit fut | reject `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` | P1 | required-now | automated test |
| T3 | No-findings summary vs structured open | summary clean, structured open | submit fut | reject `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` | P1 | required-now | automated test |
| T4 | Aligned summary+structured approve | summary clean, structured clean/0 | submit fut | success + canonical artifact | P1 | required-now | automated test |
| T5 | Meta-review instruction text | meta-review task signal | prompt render | instruction expliciten tartalmazza a structured submit kovetelmenyt | P2 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Introduce dedicated helper module for summary-vs-structured parity checks to share between submit and future recovery paths.
2. [later-hardening] Add per-reason metric for mismatch rejects (`META_REVIEW_SUMMARY_STRUCTURED_MISMATCH`).

## Assumptions

1. Phase1-ben konzervativ fail-closed szabaly prioritas, hogy ne mehessen at ujabb ellentmondas.
2. `approve + advisory open findings` use-case kulon phase2-ben lesz explicit szemantikaval feloldva.

## Open Questions

1. A mismatch hiba jelenjen-e CLI szinten sajat kulon top-level reason code mappinggel is, vagy eleg az existing error channel?

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Mismatch reject telemetry panel | L2 | P2 | later-hardening | ops visibility | add metrics/report slice for mismatch trend |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Phase1-ben barmely summary/structured contradiction blocker.
3. Reuse-first elv: uj guard implementacio ne duplikalja a mar meglevo parser/assertion helper-eket.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. Meta-review submit nem tud summary-vs-structured ellentmondassal atmenni.
2. Missing structured submit deterministicen rejectelodik.
3. Meta-reviewer promptok expliciten a structured parity submit mintat erosítik.
