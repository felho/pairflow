---
artifact_type: task
artifact_id: task_bubble_start_startup_recovery_schema_and_invariants_phase1a_v1
title: "Bubble Start Startup Recovery Schema and Invariants (Phase 1A)"
status: draft
phase: phase1a
target_files:
  - src/types/bubble.ts
  - src/v11/shared/state/stateSchema.ts
  - src/v11/shared/state/stateSchemaSnapshotSlices.ts
  - src/v11/infrastructure/state/stateSnapshotInspection.ts
  - tests/core/state/machine.test.ts
  - tests/core/state/stateStore.test.ts
  - tests/v11/infrastructure/state/stateStore.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start Startup Recovery Schema and Invariants (Phase 1A)

## Current Codebase Check (2026-04-10)

1. A review loop alapjan a canonical `startup_recovery` shape, a legacy compatibility es a state-level invariant enforcement kulon lezaro munkat igenyel.
2. A korabbi egyben tartott Phase 1 taskban a schema-es lifecycle-invariant scope osszecsuszott a routing- es cleanup-delivery kerdesekkel.

## L0 - Policy

### Goal

Lezarni a canonical `startup_recovery` schema, validation es lifecycle-invariant contractot ugy, hogy a kesobbi routing- es failure-policy taskok mar egyetlen, ellentmondasmentes state authorityre epuljenek.

### In Scope

1. A typed `startup_recovery` shape a canonical `BubbleStateSnapshot`-ban.
2. A `CREATED` / `PREPARING_WORKSPACE` / `RUNNING` allapotokhoz tartozo invariansok validationje.
3. Legacy snapshot compatibility note a hianyzo `startup_recovery` blokk eseten.
4. Active vs archival-only `startup_recovery` shape explicit kulonvalasztasa.

### Out of Scope

1. `resolveStartBubbleMode(...)` retry-safe routing implementation.
2. Cleanup policy producer/consumer semantics.
3. `RUNNING` commit gate behavior vagy reason-code propagation.
4. Tmux/session attribution delivery.

### Safety Defaults

1. `PREPARING_WORKSPACE` alatt a canonical `startup_recovery` authority kotelezo.
2. `CREATED` alatt aktiv `startup_recovery` nem maradhat perzisztalva.
3. `RUNNING` alatt aktiv `startup_recovery` nem maradhat canonical authority.
4. Legacy `PREPARING_WORKSPACE` snapshot inferred migrationje tilos; csak fail-closed compatibility megengedett.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - lifecycle state schema
   - persisted state validation contract
   - startup recovery authority boundary

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `5`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: persisted `state.json` snapshot `startup_recovery` blokkja
   - forbidden secondary sources: inferred tmux/runtime/worktree residue schema-level truth sourcekent

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | startup recovery schema | `BubbleStateSnapshot.startup_recovery` | canonical type layer | explicit active vs archival descriptor shape | P1 | required-now | T1 |
| CS2 | `src/v11/shared/state/stateSchemaSnapshotSlices.ts` | validation slice | `validateStartupRecoverySnapshot(...) -> BubbleStartupRecoveryState | undefined` | state validation layer | lifecycle-state-specific invariant enforcement | P1 | required-now | T2 |
| CS3 | `src/v11/shared/state/stateSchema.ts` | normalized snapshot assembly | `validateBubbleStateSnapshot(...) -> BubbleStateSnapshot` | schema normalization | validated `startup_recovery` bekerul a canonical snapshotba | P1 | required-now | T2 |
| CS4 | `src/v11/infrastructure/state/stateSnapshotInspection.ts` | inspectable legacy parsing | `inspectStateSnapshot(...)` | state inspection boundary | legacy/malformed state inspection fail-soft, schema read fail-closed behavior tamogatasa | P1 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `startup_recovery` active shape | implicit/partial | explicit typed authority block | `attempt_id`, `stage`, `next_start_policy`, `ownership_confidence`, `runtime_session_status`, `worktree_status`, `tmux_status`, `tmux_session_name`, `updated_at` | `retry_reason_code` | internal contract hardening | P1 | required-now |
| `startup_recovery` archival shape | unspecified | explicit archival-only marker | `archived=true`, `archived_from_attempt_id` | `archived_at`, `reason_code` | internal contract hardening | P1 | required-now |
| Legacy compatibility | ad hoc | explicit matrix | `CREATED`/`RUNNING` missing-block compatibility, `PREPARING_WORKSPACE` fail-closed | diagnostics | internal contract hardening | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| state schema | canonical descriptor fields and lifecycle invariants | routing-policy or cleanup-policy behavior smuggling schema layerbe | schema csak authority shape-et rogzit | P1 | required-now |

Constraint: a task nem vezethet be runtime behavior activationt a validation layeren kivul.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `PREPARING_WORKSPACE` active descriptor nelkul | state snapshot | throw | schema validation fail-closed | `START_PREPARING_CONTRACT_MISSING` | warn | P1 | required-now |
| malformed `startup_recovery` fields | state snapshot | throw | schema validation fail-closed | `START_PREPARING_CONTRACT_MISSING` | warn | P1 | required-now |
| legacy `CREATED` / `RUNNING` snapshot missing descriptorral | state snapshot | result | compatibility retained, no descriptor synthesis | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | canonical state schema, explicit active vs archival descriptor split, lifecycle invariant table | P1 | required-now |
| must-not-use | inferred descriptor synthesis tmux/registry/worktree alapjan | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | typed descriptor shape | active and archival examples | type/schema load | canonical fields exactek es auditalhatok | P1 | required-now | `src/types/bubble.ts` |
| T2 | lifecycle invariants | `CREATED`, `PREPARING_WORKSPACE`, `RUNNING` snapshots | schema validation fut | csak a megengedett descriptor alakok mennek at | P1 | required-now | `tests/core/state/stateStore.test.ts`, `tests/v11/infrastructure/state/stateStore.test.ts` |
| T3 | legacy compatibility | hianyzo vagy malformed descriptoros snapshot | inspect/read fut | `CREATED`/`RUNNING` kompatibilis marad, `PREPARING_WORKSPACE` fail-closed marad | P1 | required-now | `src/v11/infrastructure/state/stateSnapshotInspection.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kulon docs matrix hasznos lehet a descriptor mezok operatori olvasatahoz.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | operator-facing descriptor glossary | L2 | P2 | later-hardening | planning | Phase 3 docs follow-up |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. Uj `required-now` csak evidence-backed `P0/P1` lehet a masodik round utan.
4. Ez a task nem huzhat be routing vagy cleanup delivery acceptance-et.

## Spec Lock

Mark task as `IMPLEMENTABLE` when a canonical `startup_recovery` schema es a lifecycle-state invariant matrix kulon, ellentmondasmentesen le van zarva.
