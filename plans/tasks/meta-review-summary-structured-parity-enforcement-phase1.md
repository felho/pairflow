---
artifact_type: task
artifact_id: task_meta_review_summary_structured_parity_enforcement_phase1_v1
title: "Meta-Review Summary vs Structured Parity Enforcement (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/bubble/metaReview.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsClaimParsing.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/v11/shared/start/startCommandPrompts.ts
  - src/v11/shared/metaReviewGate/metaReviewGateNotify.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/bubble/startBubble.test.ts
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

### Normative Submit Validation Order (Phase1)

1. `submitMetaReviewResult` kotelezoen ellenorzi, hogy `input.report_json` jelen van es objektum.
2. Structured field gate kotelezoen ellenorzi, hogy `findings_claim_state` + `findings_claim_source` mindketto jelen van, es `findings_count` jelen van, valamint nemnegativ egesz.
3. Structured claim/count parse kotelezoen lefut (`resolveStructuredMetaReviewClaimFromReportJson`, `resolveFindingsCountFromMetaReviewReportJson`), es a claim source csak `meta_review_artifact` lehet.
4. Summary assertion parse kotelezoen lefut (`evaluatePositiveSummaryFindingsAssertion`, `evaluateNoFindingsSummaryFindingsAssertion`).
5. Summary-vs-structured parity guard a fenti ket forras kozott fail-closed.
6. `resolveCanonicalMetaReviewReportJson` csak sikeres parity validation utan futhat; canonicalization nem hasznalhato parity bypass-ra.

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
| CS1 | `src/core/bubble/metaReview.ts` | `submitMetaReviewResult` | `(input: MetaReviewSubmitInput, dependencies?: MetaReviewDependencies) => Promise<MetaReviewSubmitResult>` | jelenlegi `report_json` shape check utan, de `resolveCanonicalMetaReviewReportJson` hivasa elott | `report_json` hianya, claim mezok hianya, invalid `findings_count`, vagy parity mismatch eseten deterministic throw | P1 | required-now | T1,T2,T3,T4,T5,T9,T10 |
| CS2 | `src/core/bubble/metaReview.ts` | submit-time parity helper (uj vagy lokalis blokk) | `({ summary, recommendation, reportJson }) => void` (`throw MetaReviewError` on violation) | `submitMetaReviewResult` flow kozepen, canonicalization elott | pozitiv summary assertion nem mehet at `clean/0` structured allapottal, es forditva; ambiguous summary nem triggerel hard rejectet | P1 | required-now | T2,T3,T6 |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsClaimParsing.ts` | parser helper reuse | `resolveStructuredMetaReviewClaimFromReportJson({reportJson})` + `resolveFindingsCountFromMetaReviewReportJson(reportJson)` | parity helper implementacio | ugyanaz a claim/count parser legyen a gate es submit oldalon; ne legyen duplikalt parser logika | P1 | required-now | T1,T2,T3,T4 |
| CS4 | `src/core/runtime/tmuxDelivery.ts`, `src/v11/shared/start/startCommandPrompts.ts`, `src/v11/shared/metaReviewGate/metaReviewGateNotify.ts` | meta-review submit instruction text | `buildDeliveryMessage(...) => string`, `buildMetaReviewerStartupPrompt(...) => string`, `notifyMetaReviewerSubmissionRequest(...) => Promise<void>` | meta-reviewer utasitas stringek | utasitas explicit kotelezze a `--report-json` payloadot es parity-konzisztens claim/count kitoltest | P2 | required-now | T8 |
| CS5 | `tests/core/bubble/metaReview.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts`, `tests/core/bubble/startBubble.test.ts`, `tests/core/bubble/metaReviewGate.test.ts` | regresszio es prompt contract tesztek | vitest | submit/prompt regression coverage | mismatch scenariok deterministicen reprodukalva es blokkolva; prompt-helyenkent kulon regresszio jelzes | P1 | required-now | T1-T10 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review submit payload | `report_json` gyakorlatban optional | parity-vedett structured submit (`report_json` kotelezo) | `findings_claim_state`, `findings_claim_source`, `findings_count` (nemnegativ egesz) | split/digest/run-link metadata, report artifact refs | behavior-tightening (intentional) | P1 | required-now |
| Summary vs structured relation | implicit/heuristic | explicit validated | summary parser + structured count/claim | parser diagnostics | additive diagnostics | P1 | required-now |
| Prompt contract | `--report-json` emlitve, de konnyen kihagyhato | explicit operational requirement | structured submit instruction | examples | non-breaking text update | P2 | required-now |

Normative consistency rules (phase1):
1. Ha summary pozitiv allitast tesz nyitott findingra, structured side nem lehet `findings_count=0`.
2. Ha summary "no findings" allitast tesz, structured side nem lehet pozitiv open finding count.
3. `recommendation=approve` + structured `open_findings` marad fail-closed (existing guard marad).
4. Ambiguous summary eseten structured mezok a source-of-truth.
5. `findings_claim_source` submit oldalon csak `meta_review_artifact` lehet.
6. `findings_claim_state` + `findings_claim_source` egyutt kotelezo; mindketto hianya is schema-invalid reject.
7. `findings_count` kotelezo es csak nemnegativ egesz lehet; hiany/invalid ertek schema-invalid reject.
8. Canonicalization csak normalizalhat, de nem irhatja felul a parity guardot.

Canonical reason-code contract (phase1):
1. `META_REVIEW_SCHEMA_INVALID`: hianyzo vagy schema-szinten invalid `report_json` / claim tuple / `findings_count`.
2. `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH`: summary assertion es structured claim/count kozti tartalmi ellentmondas.
3. `CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC`: info-only diagnosztika; onmagaban nem submit reject ok.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Submit lifecycle | reject inconsistent submit | silent canonicalization `clean/0` contradiction alatt | quality gate behavior | P1 | required-now |
| Diagnostics | explicit reason code + operator message | generic "schema invalid" context nelkul; reason-code drift | auditability + retry clarity | P1 | required-now |
| Prompting | structured contract erositese | summary-only submit mint "normal" pattern | operator guidance | P2 | required-now |

Constraint: a guard csak validate/route szint, nincs product/runtime feature side-effect.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `report_json` hianyzik submitkor | submit payload | throw | submit elutasitva, ujrasubmit szukseges | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| mindket claim mezo hianyzik (`findings_claim_state` + `findings_claim_source`) | required structured field gate | throw | submit elutasitva, claim mezok kotelezo potlasa szukseges | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| structured claim tuple invalid (`state/source` hiany vagy invalid ertek) | `resolveStructuredMetaReviewClaimFromReportJson` | throw | submit elutasitva, structured claim javitasa szukseges | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| `findings_count` hianyzik vagy invalid (`<0`, nem egesz szam, nem szam) | required structured field gate + `resolveFindingsCountFromMetaReviewReportJson` | throw | submit elutasitva, `findings_count` javitasa szukseges | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| structured claim source != `meta_review_artifact` | structured claim parser result | throw | submit elutasitva, source korrekcio szukseges | `META_REVIEW_SCHEMA_INVALID` | warn | P1 | required-now |
| summary open-claim vs structured zero mismatch | summary parser + report_json | throw | submit elutasitva, parity fix szukseges | `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` | warn | P1 | required-now |
| summary no-findings vs structured open mismatch | summary parser + report_json | throw | submit elutasitva, parity fix szukseges | `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` | warn | P1 | required-now |
| parser nem tud egyertelmu claimet adni | summary parser | result | structured report_json marad source-of-truth | `CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `evaluatePositiveSummaryFindingsAssertion`, `evaluateNoFindingsSummaryFindingsAssertion` (`src/core/convergence/policy.ts`) | P1 | required-now |
| must-use | `resolveStructuredMetaReviewClaimFromReportJson`, `resolveFindingsCountFromMetaReviewReportJson` + explicit required-field gate (`claim_state`, `claim_source`, `findings_count`) | P1 | required-now |
| must-use | existing meta-review error normalization (`MetaReviewError`) | P1 | required-now |
| must-use | existing canonical reason-code family (`META_REVIEW_SCHEMA_INVALID`, `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH`) | P1 | required-now |
| must-not-use | summary-only legacy parser dontes structured parity helyett | P1 | required-now |
| must-not-use | uj, kulon parser logika duplikalasa meglvo helper-ek helyett | P2 | required-now |
| must-not-use | uj top-level reason code bevezetese phase1-ben, ha az existing kodok egyertelmuen fedik a hibat | P2 | required-now |

### 6) Test Matrix

Canonical test-scope decision (phase1):
1. Meglevo `tests/core/**` tesztfajlokra tamaszkodunk; nem varunk el uj `tests/v11/...` tesztfajl letrehozasat ebben a phase1 taskban.
2. A kovetkezo tesztfajl-halmaz a kotelezo scope-lock:
   - `tests/core/bubble/metaReview.test.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`
   - `tests/core/bubble/startBubble.test.ts`
   - `tests/core/bubble/metaReviewGate.test.ts`
3. Ugyanez a fajlhalmaz jelenik meg a YAML `target_files` listaban, a CS5 sorban, es a T8 evidence mappingben.

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Missing report_json reject | valid summary + no `report_json` | submit fut | deterministic reject + reason code | P1 | required-now | automated test |
| T2 | Positive summary vs `findings_count=0` | summary szerint van nyitott finding, structured zero | submit fut | reject `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` | P1 | required-now | automated test |
| T3 | No-findings summary vs structured open | summary clean, structured open | submit fut | reject `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH` | P1 | required-now | automated test |
| T4 | Aligned summary+structured approve | summary clean, structured clean/0 | submit fut | success + canonical artifact | P1 | required-now | automated test |
| T5 | Invalid claim tuple reject | `findings_claim_state` jelen, `findings_claim_source` hianyzik (vagy forditva) | submit fut | reject `META_REVIEW_SCHEMA_INVALID` | P1 | required-now | automated test |
| T6 | Ambiguous summary accepted with structured source-of-truth | summary nem allit explicit open/no-findings claimet, structured clean/0 | submit fut | success, nincs mismatch reject | P2 | required-now | automated test |
| T7 | Structured source not allowed | `findings_claim_source=legacy_summary_parser` | submit fut | reject `META_REVIEW_SCHEMA_INVALID` | P1 | required-now | automated test |
| T8 | Meta-review instruction text parity contract | meta-review task signal | prompt render | mindharom prompt-hely expliciten jelzi a kotelezo `--report-json` submitet | P2 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` (`tmuxDelivery` prompt), `tests/core/bubble/startBubble.test.ts` (`startCommandPrompts` meta-reviewer startup prompt), `tests/core/bubble/metaReviewGate.test.ts` (`metaReviewGateNotify` dispatch path), `tests/core/bubble/metaReview.test.ts` (submit contract scope-lock consistency with the same declared test set) |
| T9 | Missing/invalid `findings_count` reject | `findings_count` hianyzik vagy invalid (`-1`, `1.5`, `"1"`) | submit fut | reject `META_REVIEW_SCHEMA_INVALID` | P1 | required-now | automated test (`tests/core/bubble/metaReview.test.ts` submit block) |
| T10 | Both-claim-fields-missing reject | `findings_claim_state` es `findings_claim_source` egyarant hianyzik | submit fut | reject `META_REVIEW_SCHEMA_INVALID` | P1 | required-now | automated test (`tests/core/bubble/metaReview.test.ts` submit block) |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Introduce dedicated helper module for summary-vs-structured parity checks to share between submit and future recovery paths.
2. [later-hardening] Add per-reason metric for mismatch rejects (`META_REVIEW_SUMMARY_STRUCTURED_MISMATCH`).

## Assumptions

1. Phase1-ben konzervativ fail-closed szabaly prioritas, hogy ne mehessen at ujabb ellentmondas.
2. `approve + advisory open findings` use-case kulon phase2-ben lesz explicit szemantikaval feloldva.

## Open Questions

None (phase1). Reason-code mapping explicit: schema issues -> `META_REVIEW_SCHEMA_INVALID`, parity contradiction -> `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH`.

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
3. Reason-code mapping stabil es egyertelmu (`META_REVIEW_SCHEMA_INVALID` vs `META_REVIEW_SUMMARY_STRUCTURED_MISMATCH`).
4. Meta-reviewer promptok expliciten a structured parity submit mintat erosítik.
5. Required structured mezok (`findings_claim_state`, `findings_claim_source`, `findings_count`) hianya/invalid allapota explicit fail-closed szabalyban van rogzitve (nem implicit parser-viselkedes).
