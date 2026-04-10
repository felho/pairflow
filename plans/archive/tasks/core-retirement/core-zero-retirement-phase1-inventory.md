---
artifact_type: task
artifact_id: task_core_zero_retirement_phase1_inventory_v1
title: "Core Zero Retirement Phase 1 Inventory"
status: completed
phase: phase1
target_files:
  - "plans/archive/plans/core-zero-retirement-plan-v1.md"
  - "plans/archive/tasks/core-zero-retirement-phase1-inventory.md"
  - "plans/archive/plans/core-zero-retirement-inventory-ledger-v1.md"
prd_ref: null
plan_ref: plans/archive/plans/core-zero-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Core Zero Retirement Phase 1 Inventory

## L0 - Policy

### Goal

Készítsen gépileg auditálható inventory-ledgert a teljes `src/core/**` fáról,
amely a `core-zero` végcélt szolgálja: a `src/core/**` teljes kifogyasztását és
végső törlését, nem pedig egy interim compatibility steady state fenntartását.

### In Scope

1. A teljes aktuális `src/core/**` fa fájlszintű inventoryja.
2. Minden fájl bucketelése:
   - `thin-proxy`
   - `compat-facade`
   - `retained-behavior`
3. Minden fájl lane-hozzárendelése a `core-zero` terv alapján.
4. Minden fájl delete-eligibility státusza.
5. A párhuzamosítható lane-ek write-set és merge-szabályainak rögzítése.

### Out of Scope

1. Bármely `src/core/**` fájl tényleges törlése.
2. `src/v11/**` vagy `src/cli/**` consumer-ek átírása.
3. Runtime vagy public contract viselkedés módosítása.
4. Boundary test policy további szigorítása vagy lazítása.

### Safety Defaults

1. Ha egy `core` fájl szerepe nem egyértelmű, alapértelmezésben
   `retained-behavior` bucketet kap.
2. Ha egy fájl több lane-re is illeszkedne, első körben egyetlen primary
   owner-lane-t kell kijelölni.
3. Törlési jogosultság csak bizonyítottan `zero-consumer` fájlhoz adható.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Érintett kontraktusok:
   - `N/A`

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `2`
6. `risk_score`: `7`
7. `single-task allowed`: `no`
8. If `no`, required split:
   - `foundation/refactor`
   - `delivery`
   - `activation/rollout` (optional)
9. Authority/source-of-truth note:
   - canonical source: `src/v11/**`
   - forbidden secondary sources: `src/core/**` mint elfogadott végállapot

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | plans/archive/plans/core-zero-retirement-inventory-ledger-v1.md | new ledger artifact | `N/A -> markdown inventory` | new file | Teljes `src/core/**` inventory, bucket, lane, delete-eligibility, notes | P1 | required-now | `src/core/**` aktuális fájllista |
| CS2 | plans/archive/plans/core-zero-retirement-plan-v1.md | phase-1 references | `markdown update -> markdown update` | progress / dependency sections | A plan hivatkozik a ledgerre mint phase-1 source of truth | P2 | required-now | Phase 1 inventory completion |
| CS3 | plans/archive/tasks/core-zero-retirement-phase1-inventory.md | task contract | `markdown task -> markdown task` | current file | A végrehajtási szabályok explicit, worker-kompatibilis formában rögzítve vannak | P1 | required-now | task-consistency gate |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Inventory ledger row | Nincs egységes ledger | Egy sor / `src/core/**` fájl | `path`, `bucket`, `lane`, `delete_eligibility`, `current_consumers`, `notes` | `target_v11_owner`, `blocked_by`, `parallelizable_with` | additive docs artifact | P1 | required-now |
| Lane summary section | Szétszórt plan-text | Egységes lane summary | `lane_id`, `scope`, `owned_paths`, `merge_rule`, `validation_minimum` | `est_parallelism`, `resync_rule` | additive docs artifact | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Docs / planning | Új ledger és task dokumentum létrehozása, plan refs frissítése | `src/core/**`, `src/v11/**`, `src/cli/**` módosítás | Ez a task tisztán inventory/spec munka | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Egy `core` fájl bucketje nem egyértelmű | N/A | fallback | `retained-behavior` bucket + explicit note | CORE_ZERO_BUCKET_UNKNOWN | warn | P1 | required-now |
| Consumer-szám nem bizonyítható egy körben | `rg` / static scan | fallback | `delete_eligibility=blocked` | CORE_ZERO_CONSUMER_UNCONFIRMED | warn | P1 | required-now |
| Lane-ütközés valószínű | N/A | fallback | egyetlen owner-lane kijelölése + `parallelizable_with` üres | CORE_ZERO_LANE_CONFLICT | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/archive/plans/core-zero-retirement-plan-v1.md`, aktuális `src/core/**` fájllista, aktuális `src/v11/src/cli/tests -> src/core` consumer scan | P2 | required-now |
| must-not-use | becslés pusztán fájlszámból, bucket nélküli delete javaslat, implicit lane-hozzárendelés | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | full inventory completeness | aktuális `src/core/**` fa | ledger elkészül | minden `src/core/**` fájl pontosan egyszer szerepel | P1 | required-now | `find src/core -type f` összevetés |
| T2 | bucket determinism | vegyes thin/bridge/retained példák | bucketelés lefut | minden fájl kap pontosan egy bucketet | P1 | required-now | representative sample review |
| T3 | lane ownership determinism | több klaszteren átívelő fájlak | lane-hozzárendelés lefut | minden fájl kap primary lane-t | P1 | required-now | lane summary cross-check |
| T4 | delete-safety conservatism | bizonytalan consumer-helyzet | delete_eligibility számítás lefut | a fájl nem kap `ready-delete` státuszt bizonyíték nélkül | P1 | required-now | blocked row examples |
| T5 | parallelization readiness | 8-10 lane modell | lane summary elkészül | a tervből levezethető a diszjunkt worker-felosztás | P2 | required-now | merge/write-set notes |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Érdemes a ledgerhez később gépi generálót vagy ellenőrző scriptet adni.
2. [later-hardening] A lane summary később worker-template blokkot is kaphat.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Inventory generálás scriptelt támogatása | L2 | P2 | later-hardening | planning follow-up | Külön tooling task nyitása a ledger drift ellen |
| H2 | Lane-level merge checklist sablon | L2 | P2 | later-hardening | orchestration follow-up | Worker handoff sablon hozzáadása a Phase 2 előtt |

## Review Control

1. Minden bucket-döntéshez rövid indoklás kell, ha nem thin proxy.
2. Max 2 L1 hardening round.
3. A `ready-delete` státuszhoz explicit consumer-bizonyíték kell.
4. A lane-ütközést nem szabad hallgatólagosan hagyni.
5. A task csak akkor tekinthető implementálhatónak, ha a ledgerből közvetlenül
   kiolvasható a következő worker-wave.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.

## Assumptions

1. A `core-zero` terv a végcél és nem interim bridge steady state.
2. A későbbi végrehajtásnál 8-10 worker lane reális cél marad.
3. A `Phase 1` inventory docs-only körként biztonságosan futtatható.

## Open Questions

1. A ledger önálló markdown artifact legyen-e hosszabb távon, vagy később
   gépi generálású snapshot?
2. A `retained-behavior` bucketen belül szükség van-e további alcímkékre
   (`runtime`, `read-model`, `public-facade`, `metrics`)?

## Execution Result

1. Elkészült a teljes inventory ledger: `plans/archive/plans/core-zero-retirement-inventory-ledger-v1.md`.
2. A Phase 2 worker-wave most már lane-alapon indítható a ledgerből.
