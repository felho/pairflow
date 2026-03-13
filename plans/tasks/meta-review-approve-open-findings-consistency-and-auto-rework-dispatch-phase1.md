---
artifact_type: task
artifact_id: task_meta_review_approve_open_findings_consistency_auto_rework_dispatch_phase1_v1
title: "Meta-Review Recommendation/Claim Consistency + Auto-Rework Dispatch (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewGate.ts
  - src/core/human/approval.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/types/protocol.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/human/approval.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Recommendation/Claim Consistency + Auto-Rework Dispatch (Phase 1)

## L0 - Policy

### Goal

Szuntessuk meg azt a folyamatblokkolo allapotot, amikor a meta-review snapshot onellentmondo:
`recommendation=approve` + `findings_claim_state=open_findings`.
Ilyenkor a rendszer ne ragadjon human approval gate-ben, hanem determinisztikusan rework iranyba menjen.

### Context (Regression Evidence)

1. Bubble peldany: `b_stripe_v2_s09_firm_lockout_checkout_imp_01`
2. Tunet:
   - meta-review snapshot: `recommendation=approve`, de `report_json.findings_claim_state=open_findings`
   - orchestrator eredmeny: `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: CLAIM_SOURCE_INVALID`
3. Hatás: implementer automatikus folytatás helyett manualis human beavatkozas kell.

### In Scope

1. Recommendation-claim parity szabaly formalizalasa meta-review pipeline-ban.
2. Inkonzisztens allapot automatikus, fail-closed rework routolasa.
3. Determinisztikus reason code + audit metadata.
4. CLI/status diagnosztika kiegeszitese, hogy a parity hiba egyertelmuen latszodjon.
5. Regresszios teszt a reprodukalt esetre.

### Out of Scope

1. Meta-review minosegi scoring policy redesign.
2. Severity ontology modositas (`P0..P3` ertelem valtozatlan).
3. Full transcript migration visszamenoleg.

### Safety Defaults

1. Barmilyen recommendation-claim inkonzisztencia fail-closed kezelendo.
2. Inkonzisztencia eseten approve never wins.
3. Elonyben reszesitett fallback: auto-rework dispatch (nem human gate ragadas).

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett runtime teruletek:
   - meta-review snapshot feldolgozas,
   - meta-review gate dispatch,
   - approval routing diagnosztika.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReview.ts` | meta-review submit/write path | `(input) -> metaReviewSnapshot` | snapshot normalization | Inkonzisztens tuple (`approve` + `open_findings`) ne maradjon approval-kepes allapotban; canonical parity flag keruljon tarolasra | P1 | required-now | T1,T2 |
| CS2 | `src/core/bubble/metaReviewGate.ts` | gate routing | `(metaReviewSnapshot, bubbleState) -> gateDecision` | gate decision branch | `approve + open_findings` eseten deterministic auto-rework route, ne human approval request | P1 | required-now | T3,T4 |
| CS3 | `src/core/human/approval.ts` | approval guard | `(approvalContext) -> decision` | pre-approval consistency guard | parity hibas allapotban approve blokkolasa override nelkul | P2 | required-now | T5 |
| CS4 | `src/cli/commands/bubble/metaReview.ts` | meta-review status/last-report render | `(state) -> output` | diagnostics rendering | lathato legyen a parity allapot es fallback route reason code | P2 | required-now | T6 |
| CS5 | `src/types/protocol.ts` | metadata typing | type delta | protocol typing | additive parity mezok tipusdefinicioja (`findings_parity_state`, `parity_reason_code`) | P2 | required-now | T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review parity | implicit/fragmented | explicit parity state | `recommendation`, `findings_claim_state` | `findings_count` | non-breaking additive | P1 | required-now |
| Gate outcome | invalid combo -> human gate error | invalid combo -> auto-rework | `gate_decision`, `reason_code` | `parity_details` | behavior-tightening | P1 | required-now |
| Diagnostics | generic CLAIM_SOURCE_INVALID | explicit parity reason | `parity_reason_code` | `normalized_recommendation` | additive | P2 | required-now |

Normative parity rules:
1. `findings_claim_state=open_findings` nem kompatibilis `recommendation=approve` ertekkel.
2. Kompatibilis parok:
   - `approve` -> `clean|unknown`
   - `rework|inconclusive` -> `open_findings|unknown|clean`
3. Inkompatibilis par eseten a gate kotelezoen fail-closed.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Meta-review routing | auto-rework dispatch inconsistency eseten | human-gate dead-end inconsistency eseten | stop-the-loop fix | P1 | required-now |
| Metadata persistence | parity state/reason tarolasa | parity hiba elnyelese log nelkul | auditability kotelezo | P1 | required-now |
| Approval path | approve guard parity hibara | csendes approve parity hiba mellett | explicit safety boundary | P2 | required-now |

Constraint: parity hiba eseten nincs optimistic fallback approve iranyba.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `recommendation=approve` + `findings_claim_state=open_findings` | meta-review snapshot | fallback | auto-rework dispatch | `META_REVIEW_RECOMMENDATION_CLAIM_MISMATCH` | warn | P1 | required-now |
| parity metadata hianyos | snapshot parser | fallback | treat as `unknown`, no approve auto-pass | `META_REVIEW_PARITY_METADATA_MISSING` | warn | P2 | required-now |
| rework dispatch internal failure | dispatcher | result | explicit error envelope + retryable status | `META_REVIEW_REWORK_DISPATCH_FAILED` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing meta-review gate and approval routing pipeline | P1 | required-now |
| must-use | deterministic reason-code based routing | P1 | required-now |
| must-not-use | summary-only NLP fallback parity donteshez | P2 | required-now |
| must-not-use | silent normalization approval iranyba | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Parity mismatch detection | snapshot: `approve + open_findings` | parity calc fut | mismatch state expliciten jelolve | P1 | required-now | automated test |
| T2 | Compatible approve path | snapshot: `approve + clean` | gate fut | approval route normal marad | P1 | required-now | automated test |
| T3 | Auto-rework on mismatch | snapshot: `approve + open_findings` | gate dispatch fut | implementer-rework dispatch tortenik, nincs human approval request | P1 | required-now | automated test |
| T4 | No dead-end approval request | mismatch scenario | orchestrator transition fut | nincs `CLAIM_SOURCE_INVALID` dead-end | P1 | required-now | automated test |
| T5 | Approval guard | mismatch parity metadata jelen | human approve endpoint hivodik | approve blokkolva override nelkul | P2 | required-now | automated test |
| T6 | CLI diagnostics | mismatch parity state | `meta-review status/last-report` | explicit `parity_reason_code` latszik | P2 | required-now | automated test |
| T7 | Type compatibility | parity fields jelen/nem jelen | typecheck fut | additive typing regresszio nelkul | P2 | required-now | automated test |
| T8 | Regression replay | reprodukalt S09 snapshot fixture | gate fut | deterministic rework, bubble RUNNING implementer | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] parity mismatch telemetry dashboard (`count/day`, `bubble_id`, `round`).
2. [later-hardening] explicit recovery CLI (`pairflow bubble meta-review recover --from-parity-mismatch`).

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | parity mismatch trend monitor | L2 | P2 | later-hardening | operational feedback | metric + alert threshold |
| HB2 | enriched mismatch forensics | L2 | P3 | later-hardening | debugging pain | include tuple + normalized tuple in diagnostics |

## Review Control

1. Minden findinghez kotelezo: `priority`, `timing`, `layer`, `evidence`.
2. Mismatch reprodukcio es auto-rework dispatch teszt P1 blocker coverage.
3. Human gate dead-end regresszio nem maradhat nyitva Phase 1 utan.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. `approve + open_findings` kombinalt allapot nem eredmenyezhet human approval dead-endet.
2. Inkonzisztencia eseten deterministic auto-rework dispatch fut.
3. Parity diagnosztika status/CLI szinten auditálható.
