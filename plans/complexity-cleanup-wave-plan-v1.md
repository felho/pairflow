---
artifact_type: plan
artifact_id: plan_complexity_cleanup_wave_v1
title: "Complexity Cleanup Wave Plan"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Complexity Cleanup Wave

## Objective

Last updated from `main` at `69fa43fc`.

A fitness hard-fail backlog az `error` check lezárása után egyetlen checkerre szűkült:

1. `complexity`

Ennek a tervnek a célja nem általános refaktor, hanem bounded, ellenőrizhető hullámokban lefaragni a complexity hard-fail backlogot úgy, hogy:

1. először a legkisebb, legolcsóbb budget-túllépéseket vegyük le,
2. csak ezután nyissunk nagyobb, architekturálisan kockázatosabb bontási köröket,
3. minden hullám után újrafussanak a releváns tesztek, a `pnpm typecheck`, és a teljes fitness report.

## Current Baseline

Legutóbbi teljes fitness report:

1. `boundary`: pass
2. `mutation`: pass
3. `transition`: pass
4. `error`: warn
5. `dependency`: pass
6. `critical_side_effect`: pass
7. `contract_timeout_policy`: pass
8. `complexity`: fail

Jelenlegi `complexity` summary:

1. `73` budget violation
2. a legnagyobb klaszterek:
   - `src/v11/infrastructure/ui/**`
   - `src/v11/shared/state/stateSchema.ts`
   - `src/v11/shared/metaReview/**`
   - `src/v11/infrastructure/artifact/**`
   - `src/v11/application/attach/emitAttachV11.ts`

## Working Strategy

### 1. Small-first

Először a kicsi, egyértelmű budget túllépéseket szedjük le:

1. pár sorral line-budget felett lévő függvények
2. egyetlen helper extracttel csökkenthető függvények
3. olyan fájlak, ahol nincs policy- vagy ownership-kockázat

### 2. File-disjoint waves

A nagyobb hullámokat csak akkor párhuzamosítjuk, ha a write-setek diszjunktak:

1. `pairflowCommand` / `passValidationCommandRunner`
2. `metaReviewLiveRunnerParsing`
3. `ui/server`
4. `ui/repoScope`
5. külön a nagy `ui/router`
6. külön a `stateSchema`

### 3. Big monoliths later

A legnagyobb offender-ek:

1. `src/v11/infrastructure/ui/router.ts`
2. `src/v11/shared/state/stateSchema.ts`
3. `src/v11/infrastructure/artifact/reviewer/testEvidenceRuntime.ts`
4. `src/v11/infrastructure/artifact/validation/passValidationEvidence.ts`

ezek külön, dedikált breakdown hullámot kapnak, csak azután, hogy a kisebb offender-ek elfogytak.

## Wave Inventory

### Wave 1: Low-Risk Line-Budget Relief

Goal:

1. gyorsan csökkenteni a backlogot a legkisebb bounded extractekkel

Initial targets:

1. `src/v11/infrastructure/executor/command/pairflowCommand.ts`
2. `src/v11/infrastructure/executor/validation/passValidationCommandRunner.ts`
3. `src/v11/shared/metaReview/liveRun/metaReviewLiveRunnerParsing.ts`

Acceptance:

1. a célzott függvények kikerülnek a `complexity` fail listából
2. nincs behavior-változás
3. releváns tesztek + `pnpm typecheck` + full fitness report zöld / complexity count csökken

### Wave 2: Medium Bounded Runtime Helpers

Goal:

1. a közepes méretű, jól szeletelhető runtime fájlak karcsúsítása

Initial targets:

1. `src/v11/infrastructure/ui/server.ts`
2. `src/v11/infrastructure/ui/repoScope.ts`
3. `src/v11/shared/metaReview/metaReviewCommandReadFreshness.ts`
4. `src/v11/shared/metaReviewGate/metaReviewGateApprovalParityState.ts`

Acceptance:

1. a célzott függvények complexity/line budget alatt vagy ahhoz közelebb kerülnek
2. a refaktor nem tol ownershipet rosszabb helyre

### Wave 3: Large Focused Breakups

Goal:

1. a legnagyobb, de még izolálható cluster-ek bontása

Initial targets:

1. `src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts`
2. `src/v11/shared/metaReview/metaReviewCanonicalization.ts`
3. `src/v11/shared/gates/docContractGates.ts`

### Wave 4: Heavyweight Infrastructure / State Monoliths

Goal:

1. a legnagyobb top offender-ek dedikált lebontása

Initial targets:

1. `src/v11/infrastructure/ui/router.ts`
2. `src/v11/shared/state/stateSchema.ts`
3. `src/v11/infrastructure/artifact/reviewer/testEvidenceRuntime.ts`
4. `src/v11/infrastructure/artifact/validation/passValidationEvidence.ts`

## Validation Protocol

Minden bounded batch után:

1. célzott `vitest` kör az érintett klaszterhez
2. célzott `eslint` az érintett fájlakra
3. `pnpm typecheck`
4. `pnpm exec tsx tools/fitness/run-report.ts`

`pnpm build` csak akkor kell, ha bubble lifecycle parancs következne. Ebben a wave-ben ilyen nincs.

## Progress Ledger

- [x] Error hard-fail backlog lezárva; `complexity` maradt az egyetlen hard-fail checker
- [ ] Wave 1 started
- [ ] Wave 1 completed
- [ ] Wave 2 started
- [ ] Wave 2 completed
- [ ] Wave 3 started
- [ ] Wave 3 completed
- [ ] Wave 4 started
- [ ] Wave 4 completed

## Notes

1. Ha egy `complexity` offender valójában policy- vagy boundary-refaktorba csúszna át, azt külön batch-re kell bontani.
2. Ha valamelyik large-file offendernél a checker-küszöb helyett a design a valódi probléma, ott nem szabad vak helper-szórással “kijátszani” a budgetet.
