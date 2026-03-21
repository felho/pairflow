---
artifact_type: task
artifact_id: task_converged_advisory_findings_approval_consistency_phase1_v1
title: "Converged Advisory Findings Approval Consistency (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/v11/application/converged/convergedExecution.ts
  - src/v11/application/converged/convergedFinalizationMetadata.ts
  - src/v11/application/converged/convergedFinalizationEvents.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts
  - src/core/bubble/approvalRequestEnvelope.ts
  - src/core/protocol/resumeSummary.ts
  - src/core/protocol/validators.ts
  - src/types/protocol.ts
  - tests/v11/application/converged/convergedExecution.test.ts
  - tests/v11/application/converged/convergedFinalization.test.ts
  - tests/core/bubble/approvalRequestEnvelope.test.ts
  - tests/core/protocol/resumeSummary.test.ts
  - tests/core/protocol/validators.test.ts
  - tests/core/reviewer/summaryVerifierConsistencyGate.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.test.ts
prd_ref: null
plan_ref: plans/converged-advisory-findings-contract-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Converged Advisory Findings Approval Consistency (Phase 1)

## L0 - Policy

### Goal

Biztositsuk, hogy a converged advisory findingok strukturaltan atjussanak az approval/meta-review vonalig, es ott ne lehessen hamis clean jelzes:
1. finding lista payloadban megorzes,
2. parity metadata bovitese blocking vs advisory bontassal,
3. defense-in-depth jeloles bypass esetekre hard reject nelkul.

### In Scope

1. Convergence payload finding lista tovabbitas.
2. Minimal aggregate metrika (`advisory_findings_open_total`) converged finalize/event metadata-ban.
3. `FindingsParityMetadata` bovitese:
   - `findings_blocking_open_total`
   - `findings_advisory_open_total`
4. Approval envelope summary normalization + defense-in-depth metadata jeloles.
5. Downstream consumer audit es update.
6. Uj parity helper tesztfile + test directory letrehozas.
7. SummaryVerifier gate regresszios stabilitas-ellenorzes advisory bovitessel.

### Out of Scope

1. `converged` CLI parser behavior (Task 1 felelosseg).
2. Reviewer prompt/docs rollout (Task 3 felelosseg).
3. Per-severity aggregate (`P2/P3`) metric rollout.

### Safety Defaults

1. Approval oldalon nincs csendes clean, ha advisory open allapot van.
2. Defense-in-depth mismatch eseten approval request mehet tovabb, de explicit mismatch jeloles kotelezo.
3. Hianyzo uj parity mezok nelkul nincs implicit `0` fallback.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - event payload metadata contract (converged + approval envelope metadata)
   - protocol typing/validation contract (`FindingsParityMetadata`)
   - meta-review gate parity mapping contract

### Dependency

1. Task 2 csak Task 1 utan indulhat (findings mar command-levelen validalt es tovabbitott bemenet legyen).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/converged/convergedExecution.ts` | convergence envelope append | `(input) -> Promise<...>` | `appendConvergenceEnvelope` payload build | structured findings bekerul a convergence payloadba | P1 | required-now | T1 |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts` | parity derivation helpers | helper signatures (type delta) | parity derivation logic | advisory vs blocking open count explicit derivation | P1 | required-now | T2,T3 |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts` | report/parity metadata mapping | `(reportJson) -> FindingsParityMetadata` | parity metadata normalization | uj parity mezok atadasa es compatibility kezelese | P1 | required-now | T3,T4 |
| CS4 | `src/core/bubble/approvalRequestEnvelope.ts` | approval request normalization | `appendHumanApprovalRequestEnvelope(input) -> Promise<...>` | summary consistency + metadata assembly | mismatch eseten explicit normalization reason code, no silent clean | P1 | required-now | T5,T6 |
| CS5 | `src/types/protocol.ts` + `src/core/protocol/validators.ts` | metadata schema/validation | type + validator delta | protocol metadata definitions | uj parity mezok tipusosan es validalhatoan jelennek meg | P1 | required-now | T7 |
| CS6 | `src/core/protocol/resumeSummary.ts` | transcript summary rendering | `(envelopes) -> string` | parity diagnostic formatter | advisory/blocking parity jelzes lathato marad ops summaryban | P2 | required-now | T8 |
| CS7 | `src/v11/application/converged/convergedFinalizationMetadata.ts` | lifecycle metadata | `buildConvergedEventMetadata(input) -> Record<string, unknown>` | event metadata build | minimal advisory aggregate metric publikalt | P2 | required-now | T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| FindingsParityMetadata | claimed/artifact totals + status | + advisory/blocking open totals | `findings_parity_status` on mismatch paths | `findings_blocking_open_total`, `findings_advisory_open_total` | additive non-breaking | P1 | required-now |
| Convergence payload | summary (+ optional metadata) | summary + structured findings + advisory metric source | `summary`, `findings[]` on advisory path | refs | behavior tightening | P1 | required-now |
| Approval summary normalization | parser/parity mismatch handling | parser/parity + defense-in-depth mismatch reason | `approval_summary_normalization_reason_code` on mismatch | diagnostic counters | additive | P1 | required-now |

Normative rules:
1. `findings_advisory_open_total > 0` mellett clean jelzes nem adható.
2. Defense-in-depth scenario-ban:
   - `findings_parity_status = "mismatch"`
   - `approval_summary_normalization_reason_code = "CONVERGED_SUMMARY_FINDINGS_CONTRADICTION_DEFENSE_IN_DEPTH"`
3. Approval request route hard reject nelkul folytathato, de mismatch audit metadata kotelezo.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Protocol metadata | additive parity mezok | silent fallback to `0` missing data eseten | fail-closed elv | P1 | required-now |
| Approval summary | normalization reason-code insertion | clean status implicit meghagyasa mismatch eseten | defense-in-depth policy | P1 | required-now |
| Ops summary | parity diagnostic bovitese | parity eltetes elrejtese | auditability kotelezo | P2 | required-now |

Constraint: command-level rejectet WP3 nem duplikalhat, de metadata-level mismatch jeloles kotelezo.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| WP1 guard bypass + contradiction | upstream integration path | fallback | approval megy tovabb mismatch metadata-val | `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION_DEFENSE_IN_DEPTH` | warn | P1 | required-now |
| advisory parity mezok hianya uj pathon | metadata mapper | throw | fail-closed metadata assembly | `CONVERGED_ADVISORY_METADATA_REQUIRED` | error | P1 | required-now |
| validator unknown parity fields | protocol validator | throw | explicit schema validation error | `PROTOCOL_METADATA_INVALID` | error | P1 | required-now |
| resume summary render mismatch | formatter | result | fallback textual parity diagnostic | `RESUME_PARITY_DIAGNOSTIC_DEGRADED` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing approvalRequestEnvelope normalization path | P1 | required-now |
| must-use | existing meta-review parity helper pipeline | P1 | required-now |
| must-use | downstream consumer audit checklist | P1 | required-now |
| must-not-use | parallel hidden metadata channels a protocol schema mellett | P2 | required-now |
| must-not-use | mismatch clean-up by summary text overwrite parity status nelkul | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | convergence payload carries findings | advisory findings input | convergence envelope append fut | payload.findings jelen van | P1 | required-now | automated test |
| T2 | parity helper derives advisory/blocking totals | mixed finding set | parity helper fut | totals helyesek | P1 | required-now | automated test |
| T3 | metadata mapper keeps new fields | report/parity input | metadata map fut | `findings_blocking_open_total` + `findings_advisory_open_total` jelen | P1 | required-now | automated test |
| T4 | validator accepts additive fields | new parity metadata envelope | validator fut | schema valid | P1 | required-now | automated test |
| T5 | no silent clean on advisory open | advisory count > 0 | approval summary normalization fut | clean jelzes eltunik/normalizalodik | P1 | required-now | automated test |
| T6 | defense-in-depth mismatch path | contradiction bypass fixture | approval request build fut | mismatch status + defense reason code | P1 | required-now | automated test |
| T7 | protocol type safety | extended metadata types | typecheck fut | compile hiba nelkul | P1 | required-now | automated test |
| T8 | resume summary parity visibility | approval request metadata with new fields | resume summary build fut | advisory/blocking parity info latszik | P2 | required-now | automated test |
| T9 | lifecycle metric minimal aggregate | advisory findings jelen | converged finalization event fut | `advisory_findings_open_total` metadata publikalt | P2 | required-now | automated test |
| T10 | summary verifier gate invariant | advisory parity/normalization valtozasok mellett | reviewer summary verifier gate tesztek futnak | gate dontesi matrix valtozatlan marad (`claim_class` bovites nelkul) | P2 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Per-severity advisory aggregate (`P2/P3`) metric elokeszitese phase2-hoz.
2. [later-hardening] Ops dashboard panel update advisory vs blocking parity fieldekkel.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | parity dashboard visualization | L2 | P3 | later-hardening | ops feedback | add metric panel docs + alerts |
| HB2 | richer mismatch forensic metadata | L2 | P3 | later-hardening | debug ergonomics | add structured mismatch context blob |

## Review Control

1. Kotelezo coverage: T1-T10.
2. Downstream consumer audit tabla/felsorolas kotelezo a PR summary-ban.
3. Task 3 csak akkor indulhat, ha approval metadata parity stabil es auditalhato.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. structured advisory findings payload megjelenik convergence vonalon.
2. `FindingsParityMetadata` bovitese mukodik es validatorral konzisztens.
3. defense-in-depth mismatch jeloles deterministic (`mismatch` + reason code).
4. approval oldalon nincs csendes clean advisory-open esetben.
5. summary verifier gate invarians regresszioban igazolt (claim-class valtozas nelkul).

## Assumptions

1. Task 1 mar biztosan szallit structured findings inputot converged flow fele.
2. Uj parity mezok additive bevezetese nem tori a meglvo consumersorokat.

## Open Questions

1. N/A (blocker nyitott kerdes nincs).
