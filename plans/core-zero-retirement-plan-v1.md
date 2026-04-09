---
artifact_type: plan
artifact_id: plan_core_zero_retirement_v1
title: "Core Zero Retirement Plan"
status: in_progress
prd_ref: null
owners:
  - "felho"
---

# Plan: Core Zero Retirement

## Objective

Ez a terv a `src/core/**` teljes felszámolását célozza.

Nem az a végállapot, hogy a `core` egy kis, elfogadott shim-rétegként megmarad.
A végállapot ez:

1. a kanonikus alkalmazási, domain, shared és infrastructure ownership teljesen
   `src/v11/**` alatt él,
2. a `src/v11/**`, `src/cli/**`, a contract harness és a public surface nem függ
   a `src/core/**`-tól,
3. a `src/core/**` összes fájlja vagy migrálva, vagy törölve van,
4. a `core-shim-boundary-coverage` teszt újra szigorú blocker marad,
5. a repo végállapotban nem tart fenn legacy `core` compatibility parkolót.

Jelenlegi baseline:

- `src/core/**` fájlok száma: `139`
- a legutóbbi dependency/frontier unblock kész
- `ci:local`: PASS
- `fitness:check:ci`: PASS
- a `src/v11/src/cli -> src/core` direkt frontier a korábbi hullámok után már
  nagyrészt kifogyott
- Phase 1 inventory ledger: `plans/core-zero-retirement-inventory-ledger-v1.md`

Ez a terv tehát nem unblock-terv, hanem **endgame decommission plan**.

## Complexity / Split Rationale

1. `risk_score`: `8/10`
2. Why a plan is needed:
   - canonical source-of-truth végső áthelyezése több klaszterben még hátravan,
   - a `core` nem egy homogén shim-réteg, hanem thin proxy + compatibility
     facade + retained behavior keveréke,
   - a törlés csak consumer retirement után biztonságos,
   - a munka több, egymástól részben független lane-re bontható, ezért a
     párhuzamosítás külön tervezést igényel.
3. Split decision:
   - `foundation/refactor`
   - `migration`
   - `decommission`
4. Milestone-gated behavior to defer:
   - `N/A`

## End-State Rules

1. Nem elfogadható végállapot a “thin `core` bridge inventory”.
2. Nem elfogadható végállapot az “explicit temporary bridge” sem.
3. Bármely megmaradó `src/core/**` fájl csak átmeneti állapot lehet.
4. A terv sikerességi feltétele nem pusztán a zöld CI, hanem:
   - `src/core/**` üres vagy teljesen megszűnt,
   - nincs consumer a `core` felé,
   - a parity/contract/facade coverage már közvetlenül a `v11` canonical
     surface-t ellenőrzi.

## Current Core Typology Snapshot

Jelenlegi nagy klaszterek:

- `bubble`: `47`
- `runtime`: `26`
- `metrics`: `11`
- `ui`: `8`
- `state`: `6`
- `protocol`: `5`
- `reviewer`: `5`
- `agent`: `5`
- `util`: `5`
- `watchdog`: `4`
- `human`: `4`
- kisebb klaszterek: `convergence`, `archive`, `repo`, `gates`, `workspace`

Hasznos munkatípusok:

1. `thin proxy`
   - többnyire sima `export * from "../../v11/..."`
   - ezeket consumer retirement után közvetlenül lehet törölni

2. `compatibility facade`
   - még stabil core-facing neveket vagy csomagolt defaults surface-t tartanak
   - consumer migration után törölhetők

3. `retained behavior`
   - még saját wiring, runtime döntés vagy összerakott default object maradt benne
   - ezekhez külön redesign/migration batch kell

Representative examples:

- thin proxy:
  - `src/core/protocol/transcriptStore.ts`
  - `src/core/workspace/git.ts`
  - `src/core/bubble/bubbleLookup.ts`
- compatibility facade:
  - `src/core/bubble/startBubble.ts`
  - `src/core/runtime/startupReconciler.ts`
  - `src/core/repo/createCliDefaults.ts`
- retained behavior:
  - `src/core/bubble/metaReview.ts`
  - `src/core/metrics/events.ts`
  - valószínűleg néhány `*Defaults.ts` fan-in modul

## Parallelization Model

Ez a munka agresszíven párhuzamosítható, de nem egyetlen közös branchen.

Ajánlott működési modell:

1. max `8-10` worker lane
2. minden lane saját diszjunkt write setet kap
3. minden lane csak kis, futtatható, merge-ready batch-et adhat vissza
4. minden merge után:
   - `main` gyors validáció
   - a többi worker worktree sync
   - majd a következő batch

Kötelező szabályok:

1. ugyanazt a `core` fájlt egyszerre csak egy worker birtokolhatja
2. ugyanazt a `v11` canonical target modult egyszerre csak egy worker írhatja
3. parity/contract harness rewrite lane külön fusson a runtime retained-behavior
   lane-ektől
4. “delete files” csak akkor mehet workerre, ha a consumer retirement már
   bizonyított

## Recommended Lane Topology

### Lane A: Thin Proxy Retirement

Fókusz:

- `protocol`
- `workspace`
- `util`
- egyes `state` proxyk

Cél:

- a vékony `core` re-exportok összes consumerének közvetlen `v11` targetre
  átírása
- utána fájltörlés

### Lane B: Bubble Command Facade Retirement

Fókusz:

- `start`
- `restart`
- `resume`
- `open`
- `inbox`
- `status`
- `stop`

Cél:

- a core command facade-ok kifogyasztása
- parity/contract harness közvetlen `v11` targetre állítása

### Lane C: Human / Agent Surface Retirement

Fókusz:

- `askHuman`
- `reply`
- `approval`
- `pass`
- `converged`

Cél:

- a core-facing human/agent facade-ok törlése
- az esetleges legacy baseline logika megszüntetése

### Lane D: Runtime Defaults Retirement

Fókusz:

- `tmux*`
- `sessionsRegistry`
- `reviewerDeliveryDefaults`
- `passValidationDefaults`
- `metaReview*Defaults`

Cél:

- a core runtime defaults fan-in modulok felbontása vagy közvetlen `v11`
  surface-re cserélése

### Lane E: Bubble Defaults Retirement

Fókusz:

- `createBubbleDefaults`
- `mergeBubbleDefaults`
- `deleteBubbleDefaults`
- `statusInboxDefaults`
- `statusGateDefaults`
- `kickoffDefaults`

Cél:

- az application/shared oldalon még meglévő core perimeter bridge-ek további
  kifogyasztása
- utána a defaults-fájlak törlése

### Lane F: Reviewer / Metrics / Watchdog Retirement

Fókusz:

- `reviewer/*`
- `metrics/*`
- `watchdog/*`

Cél:

- a retained behavior és infrastructure fan-in szétválasztása
- a core köztes réteg megszüntetése

### Lane G: Meta-Review Endgame

Fókusz:

- `src/core/bubble/metaReview.ts`
- kapcsolódó runtime defaults
- live-run és submit/recovery compatibility surface

Megjegyzés:

- ez külön, architecture-sensitive lane
- ide ne kerüljön egyszerre más nagy retained-behavior klaszter

### Lane H: Final Decommission / Delete Sweep

Fókusz:

- fájltörlések
- import cleanup
- manifest / public surface cleanup
- boundary test visszaszigorítása

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | Inventory lock and lane ownership | current `src/core/**` tree, current contract/parity/fitness state | explicit typed inventory, lane map, delete eligibility rules | every `src/core/**` file is tagged as `thin-proxy`, `compat-facade`, or `retained-behavior` |
| Phase 2 | Consumer retirement for thin proxies | Phase 1 inventory | direct consumer rewrites, first delete batches | all thin proxies have either zero consumers or explicit blocker note |
| Phase 3 | Compatibility facade retirement | Phase 2 cleaned frontier | command/harness/runtime facade removals | all simple/medium compat facades retired from active consumers |
| Phase 4 | Retained behavior migration | only retained clusters remain | `metaReview`, `metrics`, `reviewer`, selected runtime defaults migrated to canonical `v11` owners | no retained canonical behavior remains in `src/core/**` |
| Phase 5 | Core delete sweep | zero-consumer inventory | file deletions, manifest cleanup, stricter boundary tests | `src/core/**` deleted or empty by policy-approved exception count `0` |

## Task List

1. `plans/tasks/core-zero-retirement/phase1-inventory-and-lane-lock.md`
2. `plans/tasks/core-zero-retirement/phase2-thin-proxy-retirement.md`
3. `plans/tasks/core-zero-retirement/phase3-command-facade-retirement.md`
4. `plans/tasks/core-zero-retirement/phase3-runtime-defaults-retirement.md`
5. `plans/tasks/core-zero-retirement/phase4-metrics-reviewer-watchdog-retirement.md`
6. `plans/tasks/core-zero-retirement/phase4-meta-review-endgame.md`
7. `plans/tasks/core-zero-retirement/phase5-core-delete-sweep.md`

## Dependencies

1. `core-shim-boundary-coverage` must remain authoritative and eventually
   return to a strict zero-residual model.
2. Existing contract/parity harnesses must keep behavioral guarantees while
   consumer retirement proceeds.
3. `v11` canonical targets must stay file-disjoint between active lanes.
4. Worker merge cadence must be short; no long-lived divergent branches.

## Risks and Mitigations

1. `False progress by bridge accumulation`
   - mitigation: every bridge batch must state whether it reduces consumer count
     or only relocates the problem
2. `Parallel merge noise`
   - mitigation: diszjunkt lane ownership and rapid sync after each merge
3. `Retained behavior hidden behind thin-looking files`
   - mitigation: Phase 1 file-level tagging before delete waves
4. `Parity tautology`
   - mitigation: test/harness lanes may not silently point both sides at the
     same implementation without explicit de-baselining decision
5. `Stopping at an interim steady state`
   - mitigation: explicit plan rule that bridge inventory is not acceptable
     end-state

## Validation Strategy

1. Every merged batch runs:
   - targeted `eslint`
   - targeted `vitest`
   - `pnpm typecheck`
   - `pnpm fitness:check:ci`
2. Every wave checkpoint runs:
   - `pnpm run ci:local`
3. Phase completion evidence must record:
   - current `src/core/**` file count
   - current `src/v11/src/cli -> src/core` import count
   - remaining tagged retained-behavior files
4. Success is measured by:
   - decreasing `src/core/**` file count,
   - decreasing `core` consumer count,
   - not only by green CI.

## Success Criteria

The plan is complete only when all of the following are true:

1. `find src/core -type f` returns `0`
2. `src/v11/**`, `src/cli/**`, and contract harnesses no longer import from
   `src/core/**`
3. no explicit residual core bridge inventory remains
4. the repo passes `ci:local`
5. the final architecture no longer relies on legacy `core` compatibility code
