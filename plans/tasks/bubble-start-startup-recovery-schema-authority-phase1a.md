---
artifact_type: task
artifact_id: task_bubble_start_startup_recovery_schema_authority_phase1a_v1
title: "Bubble Start Startup Recovery Schema Authority (Phase 1A-schema-authority)"
status: implementable
phase: phase1a-schema-authority
target_files:
  - src/types/bubble.ts
  - src/v11/shared/state/stateSchema.ts
  - src/v11/shared/state/stateSchemaSnapshotSlices.ts
  - src/v11/infrastructure/state/stateSnapshotInspection.ts
  - tests/core/state/stateSchema.test.ts
  - tests/core/state/stateStore.test.ts
  - tests/v11/shared/state/stateSchema.test.ts
  - tests/v11/infrastructure/state/stateStore.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start Startup Recovery Schema Authority (Phase 1A-schema-authority)

## Current Codebase Check (2026-04-10)

1. A review loop es a human-gate rework alapjan a canonical `startup_recovery` validity/read-path authority mar nem tarthato egy taskban a concrete persisted-write authoring seam-mel.
2. A schema-authority slice kulon ownershipot igenyel ahhoz, hogy a kovetkezo implementacios kor ne keverje ossze a "mi szamit ervenyes state-nek" es a "hol/hogyan irjuk ki eloszor" kerdeset.

### Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis csak a state validity/read-path authorityt zarja le:
   - canonical type layer,
   - state-schema normalization,
   - inspection/read compatibility path,
   - lifecycle invariant matrix,
   - legacy missing-block compatibility / fail-closed semantics.
3. A concrete persisted-write seam, az elso canonical descriptor baseline authoringja es a mutation plumbing kulon a `plans/tasks/bubble-start-startup-recovery-write-boundary-phase1a.md` artifact ownershipe.

## L0 - Policy

### Goal

Lezarni a canonical `startup_recovery` type/schema/read authorityt ugy, hogy a kozvetlenul szukseges write-boundary munka egyetlen, ellentmondasmentes validity contractra epuljon, minden tovabbi recovery-roadmap nelkul.

### In Scope

1. A typed `startup_recovery` shape a canonical `BubbleStateSnapshot`-ban.
2. A descriptor-field vocabulary closure es optionality rules.
3. A `CREATED` / `PREPARING_WORKSPACE` / `RUNNING` lifecycle invariant matrix.
4. Legacy missing-block compatibility es fail-closed read semantics.
5. Inspection/read-path expectations schema-invalid snapshotokhoz.

### Out of Scope

1. Concrete descriptor authoring seam vagy persistence strategy valasztasa.
2. Az elso canonical `CREATED -> PREPARING_WORKSPACE` write contract.
3. Az elso fresh-start `PREPARING_WORKSPACE -> RUNNING` persisted write contract.
4. `resolveStartBubbleMode(...)` routing behavior.
5. `rollback|retry|preserve_for_recovery` producer/consumer semantics.
6. `RUNNING` commit-gate propagation es success-path mutation ownership.

### Safety Defaults

1. `PREPARING_WORKSPACE` alatt explicit active descriptor kotelezo canonical authority.
2. `CREATED` alatt a canonical `startup_recovery` block missing-only.
3. `RUNNING` alatt active descriptor nem maradhat canonical authority; csak missing vagy minimal archival-only alak megengedett.
4. Side effect (`tmux`, registry, worktree residue) onmagaban nem szintetizalhat state truthot.
5. A read path fail-soft lehet inspection szinten, de uj authorityt nem talalhat ki.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - lifecycle state schema,
   - persisted state validation contract,
   - inspection/read compatibility contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `0`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `4`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: persisted `state.json` snapshot explicit `startup_recovery` blokkja
   - forbidden secondary sources: inferred tmux/runtime/worktree residue, write-seam-local temporary payload

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | startup recovery schema | `BubbleStateSnapshot.startup_recovery` | canonical type layer | explicit active vs archival descriptor shape es field optionality authority | P1 | required-now | T1 |
| CS2 | `src/v11/shared/state/stateSchemaSnapshotSlices.ts` | validation slice | `validateStartupRecoverySnapshot(...) -> BubbleStartupRecoveryState | undefined` | state validation layer | lifecycle-state-specific invariant enforcement es field-vocabulary validation | P1 | required-now | T1, T2 |
| CS3 | `src/v11/shared/state/stateSchema.ts` | normalized snapshot assembly | `validateBubbleStateSnapshot(...) -> BubbleStateSnapshot` | schema normalization | csak a Phase 1A-valid `startup_recovery` alak kerulhet a canonical snapshotba | P1 | required-now | T2 |
| CS4 | `src/v11/infrastructure/state/stateSnapshotInspection.ts` | inspectable legacy parsing | `inspectStateSnapshot(...)` | read/inspection boundary | legacy missing-block compatibility retained; invalid snapshot fail-closed classification explicit | P1 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `startup_recovery` active shape | implicit/partial | explicit typed authority block | `stage`, `ownership_confidence`, `runtime_session_status`, `worktree_status`, `tmux_status`, `updated_at` | `attempt_id`, `next_start_policy`, `retry_reason_code`, `tmux_session_name` csak akkor, ha a `tmux_status` named-session identityt allit | internal contract hardening | P1 | required-now |
| `startup_recovery` archival shape | unspecified | explicit archival-only marker | `archived=true` | `archived_from_attempt_id`, `archived_at`, `reason_code` | internal contract hardening | P1 | required-now |
| Legacy compatibility | ad hoc | explicit matrix | `CREATED`/`RUNNING` missing-block compatibility, `PREPARING_WORKSPACE` fail-closed | diagnostics | internal contract hardening | P1 | required-now |

Implementation notes:

1. A `next_start_policy` es `retry_reason_code` Phase 1A-schema-authorityban csak token-family closure; producer/consumer semanticsuk es persisted presence rule-juk kulon downstream ownership.
2. Az `attempt_id` ebben a slice-ban retained optional identity field; canonical sourcea es first-write kotelezosege a `1A-write-boundary` task ownershipe.
3. Az archival-only alak nem tartalmazhat active routing authorityt vagy live ownership claimet.

### 2.1) Vocabulary Authority Closure

| Field | Phase 1A-schema-authority Closure | Downstream Consumer |
|---|---|---|
| `stage` | canonical literal family explicit; nem maradhat free-form string | `1A-write-boundary` |
| `next_start_policy` | canonical token-family explicit (`rollback`, `retry`, `preserve_for_recovery` minimum csalad) | jelenlegi planon kivul |
| `ownership_confidence` | canonical literal family explicit; minimum coarse class szinten `authoritative`, `observed`, `ambiguous` vagy exact ekvivalens union | `1A-write-boundary` |
| `runtime_session_status` | canonical literal family explicit; minimum `absent`, `live`, `ambiguous` osztaly | `1A-write-boundary` |
| `worktree_status` | canonical literal family explicit; minimum `absent`, `partial`, `ready` osztaly | `1A-write-boundary` |
| `tmux_status` | canonical literal family explicit; minimum `absent`, `named_session`, `ambiguous` osztaly | `1A-write-boundary` |
| `retry_reason_code` | canonical reason-code token family; nem free-form operator szoveg | jelenlegi planon kivul |

### 2.2) Lifecycle Invariant Matrix

| Lifecycle State | Allowed `startup_recovery` Shape | Forbidden Shape | Schema-Level Meaning | Downstream Consumer |
|---|---|---|---|---|
| `CREATED` | missing block only | active block, archival-only block | nincs committed startup recovery authority | `1A-write-boundary` a first write elott ezt tekinti baseline-nak |
| `PREPARING_WORKSPACE` | explicit active descriptor only | missing block, archival-only block | partial startup authority csak explicit canonical descriptorral ertelmezheto | `1A-write-boundary` |
| `RUNNING` | missing block vagy minimal archival-only marker | active block | startup recovery mar nem aktiv authority | `1A-write-boundary` success-path writer |

### 2.3) Legacy Compatibility Matrix

| Persisted State | Missing `startup_recovery` Block | Result | Forbidden Follow-up |
|---|---|---|---|
| `CREATED` | kompatibilis | explicit "no active startup recovery contract" | active vagy archival-only block inferred visszatoltese side effectekbol |
| `PREPARING_WORKSPACE` | nem kompatibilis | fail-closed `START_PREPARING_CONTRACT_MISSING` | synthetic retry-safe descriptor migration |
| `RUNNING` | kompatibilis | cleared-by-default model retained | active recovery descriptor synthetic recreation side effectekbol |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| state schema | canonical descriptor fields, literal families, lifecycle invariants | routing-policy, cleanup-policy vagy write-seam behavior smuggling schema layerbe | validity authority only | P1 | required-now |
| inspection/read path | compatibility classification, fail-closed invalid-state diagnosis | authority synthesis tmux/registry/worktree residue alapjan | read path nem producer | P1 | required-now |

Constraint: ez a task nem valaszthat concrete persistence authoring seamet.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `CREATED` snapshot active vagy archival-only descriptorral | state snapshot | throw | schema validation fail-closed | `START_CREATED_CONTRACT_INVALID` | warn | P1 | required-now |
| `CREATED` snapshot malformed `startup_recovery` blockkal | state snapshot | throw | schema validation fail-closed | `START_CREATED_CONTRACT_INVALID` | warn | P1 | required-now |
| `PREPARING_WORKSPACE` snapshot descriptor nelkul | state snapshot | throw | schema validation fail-closed | `START_PREPARING_CONTRACT_MISSING` | warn | P1 | required-now |
| `PREPARING_WORKSPACE` snapshot malformed descriptorral | state snapshot | throw | schema validation fail-closed | `START_PREPARING_CONTRACT_INVALID` | warn | P1 | required-now |
| `RUNNING` snapshot active descriptorral | state snapshot | throw | schema validation fail-closed | `START_RUNNING_CONTRACT_INVALID` | warn | P1 | required-now |
| `RUNNING` snapshot malformed active descriptorral | state snapshot | throw | schema validation fail-closed | `START_RUNNING_CONTRACT_INVALID` | warn | P1 | required-now |
| legacy `CREATED` / `RUNNING` snapshot missing descriptorral | state snapshot | result | compatibility retained, no descriptor synthesis | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | canonical state schema, explicit active vs archival split, lifecycle invariant table | P1 | required-now |
| must-use | `plans/tasks/bubble-start-startup-recovery-write-boundary-phase1a.md` mint explicit downstream authoring consumer | P1 | required-now |
| must-not-use | inferred descriptor synthesis tmux/registry/worktree alapjan | P1 | required-now |
| must-not-use | concrete persistence seam, mutation plumbing vagy first-write baseline ownership visszahuzasa ebbe a taskba | P1 | required-now |
| must-not-use | retry routing, failure-policy persistence vagy commit-gate semantics roadmapkent valo visszacsempeszese ebbe a taskba | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | typed descriptor + vocabulary closure | active es archival peldak | type/schema load | canonical fields, literal families es optionality rules explicitten ellenorizhetok | P1 | required-now | `tests/core/state/stateSchema.test.ts`, `tests/v11/shared/state/stateSchema.test.ts` |
| T2 | lifecycle invariants | `CREATED`, `PREPARING_WORKSPACE`, `RUNNING` snapshots | schema validation fut | csak a Phase 1A-schema-authority altal engedett alakok validak | P1 | required-now | `tests/core/state/stateSchema.test.ts`, `tests/v11/shared/state/stateSchema.test.ts` |
| T3 | legacy compatibility inspect/read | hianyzo vagy malformed descriptoros snapshot | inspect/read fut | `CREATED`/`RUNNING` kompatibilis marad, `PREPARING_WORKSPACE` fail-closed marad | P1 | required-now | `tests/core/state/stateStore.test.ts`, `tests/v11/infrastructure/state/stateStore.test.ts` |

Validation note:

1. Mivel a canonical schema authority a `src/v11/shared/state/**` boundaryn el, a core schema suite mellett a `tests/v11/shared/state/stateSchema.test.ts` is explicit required-now regression surface.

## Acceptance Criteria

1. AC1: A canonical `startup_recovery` schema explicit active es archival-only alakra van bontva, es a mezo minimum keszlete nem kovetkeztetheto ki call-site-okbol.
2. AC2: A lifecycle invariant matrix egyertelmuen kimondja, hogy `CREATED` csak missing blockkal, `PREPARING_WORKSPACE` csak active descriptorral, `RUNNING` pedig csak missing vagy archival-only alakkal valid.
3. AC3: A legacy compatibility matrix explicit, es tiltja a missing `startup_recovery` blokk inferred visszaszintetizalasat side effectekbol.
4. AC4: A descriptor vocabulary authority explicit, de a concrete first-write presence rule ownership mar a `1A-write-boundary` taskhoz van kotve.
5. AC5: Inspection/read-path szinten nincs residual ambiguity arrol, hogy mely malformed vagy missing allapot kompatibilis es melyik fail-closed.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests / Evidence |
|---|---|---|
| AC1 | CS1, CS2 | T1 |
| AC2 | CS2, CS3 | T2 |
| AC3 | CS4 | T3 |
| AC4 | `Data and Interface Contract`, `Vocabulary Authority Closure`, `must-use`/`must-not-use` rows | document review |
| AC5 | CS4, Error Contract rows | T3 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kesőbb kulon diagnostics/subcode taxonomy johet a missing-vs-malformed altipusokhoz, ha a projekt erosebb operator-level osztalyozast akar.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | missing-vs-malformed diagnostics subcodes | L2 | P2 | later-hardening | review follow-up | kulon diagnostics taskban bontani, ha a canonical reason-code family ezt indokolja |
| H2 | operator-facing descriptor glossary | L2 | P3 | later-hardening | planning | Phase 3 docs follow-up |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. A review fo kerdese: a task egyertelmuen lezarja-e, mi szamit ervenyes vagy fail-closed `startup_recovery` state authoritynak, anelkul hogy a concrete write seamet is magahoz huzna.

## Spec Lock

Ez a task artifact `IMPLEMENTABLE`, mert:

1. a canonical `startup_recovery` type/schema authority explicit es write-seam-fuggetlen,
2. a lifecycle invariant matrix es a legacy compatibility closure kulon, ellentmondasmentesen zarul,
3. a concrete persisted-write ownership explicitten a `1A-write-boundary` utod-taskhoz van kotve,
4. a task nem tart fenn kulon routing-, failure-policy- vagy commit-gate roadmap ownershipet a jelenlegi minimal scope-on kivul.
