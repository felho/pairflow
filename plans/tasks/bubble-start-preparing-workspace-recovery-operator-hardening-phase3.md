---
artifact_type: task
artifact_id: task_bubble_start_preparing_workspace_recovery_operator_hardening_phase3_v1
title: "Bubble Start PREPARING_WORKSPACE Recovery Operator Hardening (Phase 3)"
status: draft
phase: phase3
target_files:
  - src/v11/shared/status/bubbleAttention.ts
  - src/v11/application/reconcile/runReconcileFlow.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/runtime/startupReconciler.test.ts
  - tests/v11/shared/status/bubbleAttention.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start PREPARING_WORKSPACE Recovery Operator Hardening (Phase 3)

## L0 - Policy

### Goal

Tisztava tenni a `PREPARING_WORKSPACE` recovery operatori olvasatat status es reconcile surface-eken.

### In Scope

1. Status attention semantics preparing recovery allapotokra.
2. Reconcile warning/detail semantics.
3. Minimal incident-oriented operator diagnostics.

### Out of Scope

1. Core startup/recovery delivery.
2. Uj lifecycle state.

### Safety Defaults

1. Az operator surface nem mondhat ellent a canonical startup recovery contractnak.
2. A preparing recovery allapot ne legyen sem csendben elrejtve, sem generic runtime mismatchkent felrecimkezve.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `1`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `3`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: delivered startup recovery contract from earlier phases
   - forbidden secondary sources: ad hoc operator wording not grounded in contract

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/status/bubbleAttention.ts` | preparing attention | `resolveBubbleAttention(input) -> UiBubbleAttention | null` | status attention boundary | a preparing recovery allapot explicit, nem felrevezeto attentiont kap | P1 | required-now | T1 |
| CS2 | `src/v11/application/reconcile/runReconcileFlow.ts` | reconcile reporting | `runReconcileFlow(...) -> report` | reconcile output | preparing recovery esetek operatorilag ertelmezheto reportot adnak | P1 | required-now | T2 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Status attention | implicit/suppressed wording | explicit preparing-recovery wording | code, severity, label, detail | diagnostics | internal/operator hardening | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| status/reconcile output | contract-grounded preparing diagnostics | generic runtime mismatch wording | wording must map to startup contract | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| preparing recovery detected | startup contract | result | explicit operator diagnostic | `START_PREPARING_RECOVERABLE` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | earlier phase startup contract wording | P1 | required-now |
| must-not-use | stale/generic runtime mismatch wording for preparing recovery | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | status attention | preparing recovery state | status attention resolves | explicit accurate operator wording jelenik meg | P1 | required-now | `tests/v11/shared/status/bubbleAttention.test.ts`, `tests/core/bubble/listBubbles.test.ts` |
| T2 | reconcile report | preparing recovery variants | reconcile runs | actionable reportot ad, nem generic stale/runtime mismatch outputot | P1 | required-now | `tests/core/runtime/startupReconciler.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Incident runbook linkeles vagy doc ref hasznos lehet status surface-en kivul.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Incident runbook doc linkage | L2 | P2 | later-hardening | planning | kulon docs follow-up |

## Review Control

1. A wording review nem irhatja felul a canonical startup contractot.

## Spec Lock

Mark task as `IMPLEMENTABLE` when status es reconcile surface-ek nem hallgatjak el es nem felrecimkezik a preparing recovery allapotot.
