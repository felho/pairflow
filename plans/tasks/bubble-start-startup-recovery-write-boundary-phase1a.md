---
artifact_type: task
artifact_id: task_bubble_start_startup_recovery_write_boundary_phase1a_v1
title: "Bubble Start Startup Recovery Write Boundary (Phase 1A-write-boundary)"
status: implementable
phase: phase1a-write-boundary
target_files:
  - src/v11/shared/start/startStateMutation.ts
  - src/v11/application/start/startCommandFlows.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start Startup Recovery Write Boundary (Phase 1A-write-boundary)

## Current Codebase Check (2026-04-10)

1. A human-gate rework alapjan a megmaradt Phase 1A bizonytalansag mar nem wording kerdes, hanem write-boundary ownership.
2. A jelenlegi combined artifact nyitva hagyta, hogy a canonical descriptor authoring az `applyStateTransition(...)` bovitesevel vagy a mutation layerben tortenjen.
3. Ugyanebbol a combined artifactbol tobb schema-valid, de behavior-szinten eltero elso persisted `PREPARING_WORKSPACE` baseline kovetkezhetett volna.

### Implementation Target Decision

1. `implementable_now`: `yes`
2. A chosen seam ebben a taskban: az elso canonical startup-recovery descriptor authoring a `src/v11/shared/start/startStateMutation.ts` mutation layer ownershipe.
3. Az `applyStateTransition(...)` maradhat lifecycle-transition helper, de nem lehet onallo persisted descriptor-authority felulet.
4. A task csak a concrete write boundaryt zarja le; a schema-validity/read semantics authority a `plans/tasks/bubble-start-startup-recovery-schema-authority-phase1a.md` ownershipe.

## L0 - Policy

### Goal

Lezarni a canonical `startup_recovery` first-write authoring seamet ugy, hogy a fresh `CREATED -> PREPARING_WORKSPACE` es a fresh-start elso `PREPARING_WORKSPACE -> RUNNING` persisted write deterministic, explicit es schema-valid legyen, koztes invalid snapshot nelkul.

### In Scope

1. A chosen authoring seam rogzitese a start mutation boundaryn.
2. Az elso canonical `CREATED -> PREPARING_WORKSPACE` persisted write contract.
3. Az elso fresh-start `PREPARING_WORKSPACE -> RUNNING` persisted write contract.
4. A mutation / transition-boundary plumbing, amely megakadalyazza a schema-invalid intermediate write-okat.
5. A write-proof regression test matrix.

### Out of Scope

1. `startup_recovery` schema/vocabulary validity ownership.
2. `resolveStartBubbleMode(...)` routing semantics.
3. `rollback|retry|preserve_for_recovery` failure-policy persistence.
4. `FAILED` cleanup persistence.
5. `RUNNING` commit-gate error reason propagation vagy gate-decision semantics.

### Safety Defaults

1. Fresh start pathon a descriptor authoring csak a mutation seamen keresztul tortenhet.
2. Az elso persisted `PREPARING_WORKSPACE` snapshotnak mar schema-valid active descriptorral kell rendelkeznie.
3. Az elso fresh-start persisted `RUNNING` snapshot nem tartalmazhat active `startup_recovery` blokkot.
4. Nincs descriptor-nelkuli koztes `PREPARING_WORKSPACE` write.
5. A flow layer nem irhat ki alternativ, ad hoc snapshot-authoring pathot a mutation seamen kivul.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - start mutation seam,
   - first canonical startup write contract,
   - transition-boundary plumbing contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `0`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `5`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: mutation-seam-altal eloallitott es atomikusan perzisztalt kovetkezo snapshot
   - forbidden secondary sources: direct `applyStateTransition(...)` persistence authority, flow-layer ad hoc snapshot authoring

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/start/startStateMutation.ts` | first preparing write seam | `executeStartPreparingMutation(...) -> Promise<StartLoadedStateSnapshot>` | mutation seam | a full next snapshotot authoralja es irja ki, schema-valid active descriptorral | P1 | required-now | T1, T2 |
| CS2 | `src/v11/shared/start/startStateMutation.ts` | first running write seam | `executeStartRunningMutation(...) -> Promise<StartLoadedStateSnapshot>` | mutation seam | a fresh success-path `RUNNING` snapshotot ugy authoralja, hogy active descriptor nem maradhat perzisztalva | P1 | required-now | T3 |
| CS3 | `src/v11/application/start/startCommandFlows.ts` | flow-to-mutation ownership | `runFreshStartFlow(...)` | flow boundary | a flow csak a mutation seam altal authoralt canonical snapshotot perzisztalja; nincs parhuzamos authoring path | P1 | required-now | T1, T4 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| chosen authoring seam | implicit/ambiguous | mutation-layer snapshot authoring | `executeStartPreparingMutation(...)`, `executeStartRunningMutation(...)` owns canonical descriptor persistence | `applyStateTransition(...)` may remain helper only | internal contract hardening | P1 | required-now |
| first fresh `PREPARING_WORKSPACE` write | schema-valid but underspecified baseline | single canonical baseline write | `stage=preparing_workspace`, `ownership_confidence=authoritative`, `runtime_session_status=absent`, `worktree_status=partial`, `tmux_status=absent`, `updated_at`, stable startup `attempt_id` | `next_start_policy`, `retry_reason_code`, `tmux_session_name` absent by default on fresh path | internal contract hardening | P1 | required-now |
| first fresh `RUNNING` write | success-path persistence underspecified | explicit success-path persisted shape | no active `startup_recovery` block under `RUNNING`; if retained, archival-only minimal marker only | archival-only marker optional | internal contract hardening | P1 | required-now |

Implementation notes:

1. A stable startup `attempt_id` forrasa a start invocation boundary; a mutation seam ugyanazt az azonositót kell tovabbvigye minden ugyanazon startup attempt persisted write-jan.
2. A fresh `PREPARING_WORKSPACE` baseline nem kenyszerulhet korai failure-policy tokenre; `next_start_policy` es `retry_reason_code` fresh pathon default szerint hianyzik.
3. A flow layer csak inputot adhat a mutation seamnek; a teljes persisted descriptor-shape authoringja ott zarul.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| mutation seam | full next-snapshot authoring + atomic persistence | descriptor-nelkuli koztes `PREPARING_WORKSPACE` write | write boundary ownership explicit | P1 | required-now |
| flow layer | mutation seam meghivasa, input tovabbitasa | ad hoc `writeStateSnapshot(...)` descriptor authoring a flowbol | single write authority | P1 | required-now |
| transition helper | lifecycle shell szamitas helperkent | persisted descriptor-authority mint kulon alternative seam | `applyStateTransition(...)` nem baseline chooser | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| a mutation seam nem tud schema-valid active descriptorral `PREPARING_WORKSPACE` snapshotot authoralni | mutation seam + schema authority | throw | nincs partial persist | `START_PREPARING_CONTRACT_INVALID` | error | P1 | required-now |
| a success-path `RUNNING` write active descriptorral maradna | mutation seam + schema authority | throw | nincs invalid running persist | `START_RUNNING_CONTRACT_INVALID` | error | P1 | required-now |
| a flow layer megprobalna a mutation seamet megkerulni | flow boundary | throw | fail-closed, single write authority retained | `START_WRITE_BOUNDARY_BYPASS_FORBIDDEN` | error | P1 | required-now |

Constraint:

1. Commit-gate decision es `START_RUNNING_COMMIT_BLOCKED` propagation tovabbra is Phase 1D ownership; ez a task csak a success-path persisted write shape-et es a seam ownershipet zarja le.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/tasks/bubble-start-startup-recovery-schema-authority-phase1a.md` mint upstream validity authority | P1 | required-now |
| must-use | explicit chosen seam: mutation-layer snapshot authoring a `src/v11/shared/start/startStateMutation.ts` boundaryn | P1 | required-now |
| must-not-use | `applyStateTransition(...)` expansion mint alternativ persisted descriptor-authoring baseline | P1 | required-now |
| must-not-use | flow-layer ad hoc snapshot authoring vagy schema-invalid koztes write | P1 | required-now |
| must-not-use | routing, failure-policy persistence, `FAILED` cleanup, `RUNNING` commit-gate propagation ownership visszahuzasa ebbe a taskba | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | chosen seam is single writer | fresh start invocation | `runFreshStartFlow(...)` fut | a canonical descriptor write a mutation seamhez kotott; nincs parhuzamos authoring path | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |
| T2 | first `CREATED -> PREPARING_WORKSPACE` write baseline | fresh `CREATED` snapshot | `executeStartPreparingMutation(...)` fut | a persisted snapshot mar schema-valid active descriptorral, explicit baseline mezokkel jon letre, policy-token kenyszer nelkul | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | first fresh `PREPARING_WORKSPACE -> RUNNING` success write | fresh success-path start | `executeStartRunningMutation(...)` fut | a persisted `RUNNING` snapshot missing vagy archival-only recovery blokkot tartalmaz, active descriptor nelkul | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T4 | no schema-invalid intermediate write | fresh start path | preparing majd running write-ek futnak | nincs descriptor-nelkuli `PREPARING_WORKSPACE` persist es nincs schema-invalid intermediate snapshot | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |

## Acceptance Criteria

1. AC1: A task explicitten kijeloli, hogy a canonical descriptor authoring a mutation layer ownershipe, nem az `applyStateTransition(...)` kibovitese.
2. AC2: A fresh `CREATED -> PREPARING_WORKSPACE` first persisted write contract egyetlen canonical baseline mezokeszlettel van lezarva.
3. AC3: A fresh success-path `PREPARING_WORKSPACE -> RUNNING` first persisted write contract explicitten tiltja az active `startup_recovery` retained allapotot.
4. AC4: A mutation/transition boundary nem tud schema-invalid intermediate snapshotot perzisztalni.
5. AC5: A task nem huzza vissza magahoz a schema-validity authorityt vagy a Phase 1B / 1C / 1D downstream ownershipet.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests / Evidence |
|---|---|---|
| AC1 | CS1, CS3 | T1 |
| AC2 | CS1 | T2 |
| AC3 | CS2 | T3 |
| AC4 | CS1, CS2, CS3 | T4 |
| AC5 | `Out of Scope`, `must-not-use` rows, schema-authority dependency | document review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha kesobb kulon direct mutation test file jon letre, a seam-level regressziokat erdemes kivenni a nagy `startBubble` integacios filebol.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | dedicated seam-level mutation tests | L2 | P2 | later-hardening | review follow-up | kulon `startStateMutation` test filere bontani, ha a write boundary novekedik |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. A review fo kerdese: a task egyertelmuen kijeloli-e, hol authoralodik es milyen baseline-nal iródik ki eloszor a canonical descriptor.

## Spec Lock

Ez a task artifact `IMPLEMENTABLE`, mert:

1. a concrete write seam explicitten ki van jelolve es nem hagy alternativ persisted-authoring pathot,
2. a first persisted `PREPARING_WORKSPACE` es fresh success-path `RUNNING` snapshot contract egyertelmu,
3. a task tesztelhetoen tiltja a schema-invalid intermediate write-okat,
4. a schema-validity authority kulon a `1A-schema-authority` taskban marad, igy nincs residual ownership overlap.
