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
  - tests/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.test.ts
prd_ref: null
plan_ref: plans/converged-advisory-findings-contract-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Converged Advisory Findings Approval Consistency (Phase 1)

## L0 - Policy

### Goal

Biztositsuk, hogy a converged utvonalon atadott advisory findingok az approval/meta-review vonalig audit-keszen megmaradjanak, es approval oldalon ne jelenhessen meg hamis "clean" allapot:
1. advisory finding lista strukturaltan tovabbitodik a convergence payloadban,
2. parity metadata explicit blocking vs advisory bontast ad,
3. defense-in-depth utvonalon mismatch jeloles kotelezo hard reject nelkul.

### In Scope

1. WP2: convergence payload finding lista tovabbitasa.
2. WP2: minimal aggregate metrika publikacio (`advisory_findings_open_total`) converged finalization metadata/event vonalon.
3. WP3: `FindingsParityMetadata` bovitese:
   - `findings_blocking_open_total`
   - `findings_advisory_open_total`
4. WP3: approval envelope summary normalization + defense-in-depth metadata jeloles.
5. WP2+WP3 downstream consumer audit es update az erintett fogyasztokban.
6. WP2+WP3 automatizalt tesztfedes (T1-T8, T9a, T9b, T10-T13), beleertve parity helper, parity wiring es summary verifier regressziot.

### Out of Scope

1. WP1 command-level parser/guard implementacio (`converged --finding`, hard reject logic) - Task 1 felelosseg.
2. WP4 reviewer guidance/docs rollout - Task 3 felelosseg.
3. Uj claim class vagy recommendation model valtoztatas a SummaryVerifier gate-ben.
4. Per-severity aggregate (`P2/P3`) metric rollout Phase 1-ben.

### Safety Defaults

1. Approval oldalon nincs csendes clean, ha `findings_advisory_open_total > 0`.
2. WP3 defense-in-depth mismatch eseten approval request tovabbmehet, de explicit mismatch jeloles kotelezo.
3. Uj parity mezok hianyanal nincs implicit `0` fallback (fail-closed).
4. Inverz mismatch iranyban is kotelezo a jeloles: ha advisory finding-lista nem ures, de aggregate advisory count `0` (vagy forditva), `findings_parity_status = "mismatch"` kotelezo.

### Fail-Closed Boundary

1. A fail-closed viselkedes ebben a taskban az `advisory_v1` transcript/payload pathra vonatkozik.
2. Legacy/in-flight (`legacy_inflight`) transcript normalizacio nem resze ennek a tasknak.

### Entry Criteria

1. Task 1 outputja elerheto: structured findings atadas command/flow boundary-n mar determinizalt.
2. Task 1 referencia (`plans/tasks/01-converged-advisory-findings-cli-and-flow-contract-phase1.md`) Spec Lock allapota legalabb `IMPLEMENTABLE`, `open_blocker_count = 0`, `open_required_now_count = 0`.

### Scope Lock

1. A scope WP2+WP3-ra korlatozott; WP1 command-level reject logika nem kerul duplikalasra WP3-ban.
2. Implementacios lock: modositas csak a `target_files` listaban szereplo WP2+WP3 erintett feluleteken engedelyezett; ezen kivuli fajlok csak explicit scope-bovitessel erinthetok.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - event payload metadata contract (converged + approval envelope metadata)
   - protocol typing/validation contract (`FindingsParityMetadata`)
   - meta-review gate parity mapping contract
3. Blast radius bound:
   - csak a `target_files` listaban szereplo WP2+WP3 metadata/payload/parity/approval consistency feluletek erinthetok;
   - CLI parser (WP1) es reviewer rollout/docs (WP4) feluletek erintese tilos.

### Dependency

1. Task 2 csak Task 1 utan indulhat (findings mar command-levelen validalt es tovabbitott bemenet legyen).

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/converged/convergedExecution.ts` | convergence envelope append | `(input) -> Promise<...>` | `appendConvergenceEnvelope` payload build | structured advisory findings bekerul a convergence payloadba, finding-szintu adatokkal | P1 | required-now | T1 |
| CS2 | `src/v11/application/converged/convergedFinalizationMetadata.ts` + `src/v11/application/converged/convergedFinalizationEvents.ts` | lifecycle metadata publish | metadata builder/event emit signatures | finalization metadata publish pontok | `advisory_findings_open_total` publikalt es transcriptbol visszakeresheto | P1 | required-now | T9a,T9b |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts` | parity derivation helpers | helper signatures (type delta) | parity derivation logic | advisory vs blocking open count explicit derivation | P1 | required-now | T2 |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts` | report/parity metadata mapping | `(reportJson) -> FindingsParityMetadata` | parity metadata normalization | uj parity mezok konzisztens atadasa (`findings_blocking_open_total`, `findings_advisory_open_total`) | P1 | required-now | T3 (direct),T4 (validator-side) |
| CS5 | `src/core/bubble/approvalRequestEnvelope.ts` | approval request normalization | `appendHumanApprovalRequestEnvelope(input) -> Promise<...>` | summary consistency + metadata assembly | no silent clean, mismatch eseten deterministic reason code | P1 | required-now | T5,T6,T12,T13 |
| CS6 | `src/types/protocol.ts` + `src/core/protocol/validators.ts` | metadata schema/validation | type + validator delta | protocol metadata definitions | uj parity mezok type-safe es validator-kompatibilis megjelenese | P1 | required-now | T4,T7 |
| CS7 | `src/core/protocol/resumeSummary.ts` | transcript summary rendering | `(envelopes) -> string` | parity diagnostic formatter | advisory/blocking parity jelzes lathato marad operator summaryban | P2 | required-now | T8,T12 |
| CS8 | `src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts` | downstream parity wiring | existing helper signatures | parity metadata tovabbitas pontjai | nincs elveszo parity mezo a gate pipeline-ban | P2 | required-now | T10,T11 |

Traceability note:
1. T10 cross-cutting gate invariant teszt, CS5-CS8 egyutthatasat validalja.
2. T12 cross-cutting visibility teszt az approval metadata es transcript oldali lathatosagot validalja (elsodlegesen CS5/CS7), es nem allit kozvetlen CS1 ownershipet.
3. CS4 evidence ownership explicit: T3 a kozvetlen metadata-mapper ownership (`tests/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.test.ts`), T4 validator-side kompatibilitasi coverage (`tests/core/protocol/validators.test.ts`).
4. Count-list mismatch ownership explicit: T13 validalja a `CONVERGED_ADVISORY_COUNT_LIST_MISMATCH` route-ot (Normative rules #7 + Error/Fallback mismatch trigger).
5. T13 file-level ownership explicit: T13 -> `tests/core/bubble/approvalRequestEnvelope.test.ts`.
6. T12 file-level ownership explicit: T12 -> `tests/core/bubble/approvalRequestEnvelope.test.ts`, `tests/core/protocol/resumeSummary.test.ts`.

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| FindingsParityMetadata | claimed/artifact totals + status | + advisory/blocking open totals | `findings_parity_status` mismatch utvonalon, `findings_blocking_open_total`, `findings_advisory_open_total` | parity diagnostics | additive non-breaking | P1 | required-now |
| Convergence payload | summary (+ optional metadata) | summary + structured findings + advisory metric source | `summary`, advisory `findings[]` (ha advisory allitas van) | refs | behavior tightening | P1 | required-now |
| Approval summary normalization | parser/parity mismatch handling | parser/parity + defense-in-depth mismatch reason | `approval_summary_normalization_reason_code` mismatch utvonalon | diagnostic counters | additive | P1 | required-now |

Normative rules:
1. `findings_advisory_open_total > 0` mellett clean jelzes nem adhato approval oldalon.
2. Defense-in-depth scenario-ban (WP1 guard bypass integracios utvonalon):
   - `findings_parity_status = "mismatch"`
   - `approval_summary_normalization_reason_code = "CONVERGED_SUMMARY_FINDINGS_CONTRADICTION_DEFENSE_IN_DEPTH"`
3. WP3 nem vezet be uj command-level hard rejectet; approval route folytathato, de mismatch audit metadata kotelezo.
4. Hianyzo uj parity mezok az `advisory_v1` transcript/payload pathon explicit hibat jelentenek, nem normalizalhatok nullara.
5. Approval kontextusban az aggregate count mellett a finding-lista (minimum `severity` + `title`) visszakeresheto marad transcript/payload szinten.
6. Count-list ketiranyu konzisztencia kotelezo: aggregate advisory count es advisory finding-lista nem mondhatnak ellent egymasnak.
7. Count-list mismatch diagnosztika dedikalt reason code-dal tortenik: `CONVERGED_ADVISORY_COUNT_LIST_MISMATCH`.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Protocol metadata | additive parity mezok | silent fallback to `0` missing data eseten | fail-closed elv | P1 | required-now |
| Approval summary | deterministic normalization + reason-code insertion | clean status implicit meghagyasa mismatch eseten | defense-in-depth policy | P1 | required-now |
| Ops summary | parity diagnostic bovitese | parity eltetes elrejtese | auditability kotelezo | P2 | required-now |
| Downstream consumers | explicit update/audit az erintett fogyasztokban | "hidden" metadata channel validator/schema mellett | parity source-of-truth a protocol metadata | P1 | required-now |
| Audit enforcement | file-level consumer audit lista kotelezo | PASS audit lista nelkul | audit hiany deterministic review-gate block | P1 | required-now |

Constraint: command-level rejectet WP3 nem duplikalhat, de metadata-level mismatch jeloles kotelezo.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| WP1 guard bypass + contradiction | upstream integration path | fallback | approval megy tovabb mismatch metadata-val | `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION_DEFENSE_IN_DEPTH` | warn | P1 | required-now |
| advisory parity mezok hianya `advisory_v1` transcript/payload pathon | metadata mapper | throw | fail-closed metadata assembly | `CONVERGED_ADVISORY_METADATA_REQUIRED` | error | P1 | required-now |
| advisory count vs finding-list mismatch (inverz iranyt is beleertve) | approval metadata assembler | fallback | mismatch status + normalization reason code, route mehet tovabb | `CONVERGED_ADVISORY_COUNT_LIST_MISMATCH` | warn | P1 | required-now |
| validator nem tudja feldolgozni uj parity mezoket | protocol validator | throw | explicit schema validation error | `PROTOCOL_METADATA_INVALID` | error | P1 | required-now |
| resume summary render mismatch | formatter | result | fallback textual parity diagnostic, adatvesztes nelkul | `RESUME_PARITY_DIAGNOSTIC_DEGRADED` | warn | P2 | required-now |
| downstream consumer audit lista hianyos | review control gate | result | status=blocked; PASS elutasitva, audit lista potlasa kotelezo | `CONVERGED_DOWNSTREAM_AUDIT_INCOMPLETE` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing approvalRequestEnvelope normalization path | P1 | required-now |
| must-use | existing meta-review parity helper pipeline | P1 | required-now |
| must-use | downstream consumer audit checklist | P1 | required-now |
| must-not-use | parallel hidden metadata channels a protocol schema mellett | P2 | required-now |
| must-not-use | mismatch clean-up by summary text overwrite parity status nelkul | P1 | required-now |
| must-not-use | claim_class/recommendation policy modositas Task 2 scope-ban | P1 | required-now |
| must-not-use | PASS emit audit lista nelkul (`Review Control` #2) | P1 | required-now |

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
| T9a | lifecycle metric metadata surface | advisory findings jelen | converged finalization metadata build fut | `advisory_findings_open_total` megjelenik metadata builder kimenetben | P1 | required-now | automated test |
| T9b | lifecycle metric event surface | advisory findings jelen | converged finalization event publish fut | `advisory_findings_open_total` megjelenik kibocsatott event metadata-ban | P1 | required-now | automated test |
| T10 | summary verifier gate invariant | advisory parity/normalization valtozasok mellett | reviewer summary verifier gate tesztek futnak | gate dontesi matrix valtozatlan marad (`claim_class` bovites nelkul) | P2 | required-now | automated test |
| T11 | CS8 parity wiring direct evidence | parity metadata input a gate apply helperben | apply helper route fut | parity mezok valtozatlanul tovabbitodnak downstream metadata-ba | P2 | required-now | automated test |
| T12 | approval finding-list visibility | approval metadata + advisory finding lista jelen | approval/transcript payload generalas fut | finding-list visszakeresheto marad legalabb `severity` + `title` mezokkel | P2 | required-now | automated test (`tests/core/bubble/approvalRequestEnvelope.test.ts`, `tests/core/protocol/resumeSummary.test.ts`) |
| T13 | count-list mismatch route diagnostics | advisory count es advisory finding-list szandekosan ellentmondo bemenet | approval metadata assembly fut | mismatch route aktiv, reason code = `CONVERGED_ADVISORY_COUNT_LIST_MISMATCH` es parity status mismatch | P1 | required-now | automated test (`tests/core/bubble/approvalRequestEnvelope.test.ts`) |

Acceptance gate:
1. P1 tesztek (T1-T7, T9a, T9b, T13) kotelezoen zold.
2. P2 tesztek (T8, T10, T11, T12) legalabb regresszioellenorzes szinten lefedettek es dokumentaltak.
3. Minden P1 call-site (CS1-CS6) legalabb egy P1 prioritasu evidenciaval rendelkezik.
4. T10 megerositi, hogy a claim-class/recommendation semantics valtozatlan.
5. Nincs orphan teszt: minden T ID vagy kozvetlen CS evidenciaban, vagy Traceability note cross-cutting kategoriajaban szerepel.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Per-severity advisory aggregate (`P2/P3`) metric elokeszitese phase2-hoz.
2. [later-hardening] Ops dashboard panel update advisory vs blocking parity fieldekkel.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | parity dashboard visualization | L2 | P3 | later-hardening | ops feedback | add metric panel docs + alerts |
| HB2 | richer mismatch forensic metadata | L2 | P3 | later-hardening | debug ergonomics | add structured mismatch context blob |

## Review Control

1. Kotelezo coverage: T1-T8, T9a, T9b, T10-T13.
2. Downstream consumer audit lista kotelezo a PR summary-ban, explicit file-level hivatkozassal.
3. Downstream consumer audit nem halaszthato `later-hardening` allapotba ezen task scope-jaban.
4. Kotelezo reviewer checkpoint: nincs uj functional scope a plan WP2+WP3-on tul.
5. Task 3 csak akkor indulhat, ha approval metadata parity stabil es auditalhato.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. structured advisory findings payload megjelenik convergence vonalon.
2. `advisory_findings_open_total` publish deterministicen megjelenik finalization metadata-ban.
3. `FindingsParityMetadata` bovitese mukodik es validatorral konzisztens.
4. defense-in-depth mismatch jeloles deterministic (`mismatch` + reason code).
5. approval oldalon nincs csendes clean advisory-open esetben.
6. summary verifier gate invarians regresszioban igazolt (claim-class valtozas nelkul).
7. P1 call-site prioritasok es P1 test-evidence mapping deterministicen osszehangolt (nincs P1-only scope P2-only acceptance evidence-szel).
8. downstream consumer audit teljes es explicit file-levelen visszakeresheto.
9. Approval finding-list visibility explicit es visszakeresheto (`severity` + `title`) transcript/payload szinten, P2 regresszios gate coverage-del (T12).
10. Count-list mismatch route (`CONVERGED_ADVISORY_COUNT_LIST_MISMATCH`) explicit es auditalhato T13 evidence-szel, file-level ownership mappinggel.

## Assumptions

1. Task 1 mar biztosan szallit structured findings inputot converged flow fele.
2. Uj parity mezok additive bevezetese nem tori a meglvo consumer sorokat.

## Open Questions

1. N/A (blocker nyitott kerdes nincs).
