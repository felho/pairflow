---
artifact_type: task
artifact_id: task_bubble_start_preparing_routing_and_admission_phase1b_v1
title: "Bubble Start PREPARING_WORKSPACE Routing and Admission (Phase 1B)"
status: draft
phase: phase1b
target_files:
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandContext.ts
  - src/v11/application/start/startCommandApi.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/core/bubble/startBubble.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start PREPARING_WORKSPACE Routing and Admission (Phase 1B)

## Current Codebase Check (2026-04-10)

1. A bubble review szerint a retry-safe preparing descriptor producer- es consumer-oldala jelenleg nem ugyanazt a shape-et varja.
2. A `PREPARING_WORKSPACE` routing kulon admission gate-et igenyel a schema-level authority utan.

## L0 - Policy

### Goal

Lezarni a `bubble start` admission routingot ugy, hogy a `fresh`, `recover_preparing` es `resume` utak explicit descriptor-alapu szabalyok szerint valjanak el, stale vagy missing descriptor mellett pedig a rendszer fail-closed maradjon.

### In Scope

1. `resolveStartBubbleMode(...)` inputjának descriptor-alapu routingja.
2. Retry-safe preparing descriptor exact admission rules.
3. Missing, malformed es stale descriptor fail-closed behavior.
4. Legacy `PREPARING_WORKSPACE` compatibility snapshotok olvasasi kezelese routing elott.

### Out of Scope

1. Cleanup persistence policy.
2. `rollback` es `retry` vegallapot semantics.
3. `RUNNING` commit-point reason propagation.
4. Live tmux reuse / stale reclaim delivery.

### Safety Defaults

1. `PREPARING_WORKSPACE` nem generic `resume`.
2. Missing vagy unsafe descriptor mellett `recover_preparing` routing tilos.
3. Stale descriptor kulon fail-closed trigger, nem csendes downgrade.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - start mode routing
   - preparing admission gate
   - legacy snapshot compatibility read path

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `6`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: validated `startup_recovery` descriptor
   - forbidden secondary sources: expected tmux session name, raw registry residue, inferred bootstrap completeness

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/start/startCommandOrchestration.ts` | mode resolution | `resolveStartBubbleMode(state) -> StartBubbleMode` | routing boundary | explicit `fresh` / `recover_preparing` / `resume` split | P1 | required-now | T1 |
| CS2 | `src/v11/application/start/startCommandContext.ts` | state load compatibility | `loadStartExecutionContext(...)` | pre-routing load path | legacy preparing snapshotok csak fail-closed kompatibilitasig juthatnak | P1 | required-now | T2 |
| CS3 | `src/v11/application/start/startCommandApi.ts` | admission error surface | `startBubble(...) -> StartBubbleResult` | API boundary | canonical reason code-ot tart meg a stale/missing descriptor routing hibaknal | P1 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| preparing admission descriptor | loose/implicit | exact retry-safe gate | attempt prefix, stage, next-start policy, ownership confidence, runtime status, worktree status, tmux status, `retry_reason_code` | diagnostics | internal contract hardening | P1 | required-now |
| stale descriptor | undefined semantics | explicit fail-closed class | any mismatch against retry-safe gate | diagnostics | internal contract hardening | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| routing | explicit mode resolution and reason-code emission | cleanup, reclaim vagy tmux launch behavior beemelese | admission only | P1 | required-now |

Constraint: a task nem oldhat meg ownership cleanupot routing oldalon.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| missing canonical descriptor `PREPARING_WORKSPACE` alatt | state snapshot | throw | fail-closed | `START_PREPARING_CONTRACT_MISSING` | warn | P1 | required-now |
| malformed preparing descriptor | state snapshot | throw | fail-closed | `START_PREPARING_CONTRACT_MISSING` | warn | P1 | required-now |
| stale/unsafe preparing descriptor | state snapshot | throw | fail-closed | `START_PREPARING_DESCRIPTOR_STALE` | warn | P1 | required-now |
| valid retry-safe preparing descriptor | state snapshot | result | `recover_preparing` mode | `START_PREPARING_RETRYABLE` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1A schema authority, exact retry-safe gate | P1 | required-now |
| must-not-use | generic `PREPARING_WORKSPACE` resume semantics | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | valid retry-safe preparing route | canonical retry-safe descriptor | `resolveStartBubbleMode` fut | `recover_preparing` eredmeny | P1 | required-now | `tests/v11/application/start/startCommandOrchestration.test.ts` |
| T2 | legacy/malformed preparing snapshot | missing vagy hibas descriptor | context load + routing fut | fail-closed, no silent compatibility promotion | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | stale descriptor admission | unsafe field combination vagy wrong attempt prefix | `startBubble` fut | canonical stale reason code jon vissza | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A stale descriptor mismatch classokat kesobb kulon diagnostics metadata-val lehet boviteni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | finer-grained stale mismatch diagnostics | L2 | P2 | later-hardening | review follow-up | Phase 3 diagnostics follow-up |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. A review fo kerdese: ugyanazt a retry-safe shape-et varja-e a consumer, amit a foundation engedelyez.

## Spec Lock

Mark task as `IMPLEMENTABLE` when `PREPARING_WORKSPACE` alatt a start admission explicit, deterministic es fail-closed, generic resume nelkul.
