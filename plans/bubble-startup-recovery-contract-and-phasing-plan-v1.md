---
artifact_type: plan
artifact_id: plan_bubble_startup_recovery_contract_and_phasing_v1
title: "Bubble Startup Recovery Contract and Phasing Plan"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Bubble Startup Recovery Contract and Phasing

## Objective

Ujra-keretezni a `bubble start` startup/recovery viselkedeset ugy, hogy a `CREATED -> PREPARING_WORKSPACE -> RUNNING` szekvenciahez explicit eroforras-szerzodes tartozzon.

Sikernek az szamit, ha:
1. a `PREPARING_WORKSPACE` nem implicit "feluton elakadt" allapot, hanem explicit recovery boundary,
2. a canonical `state.json` snapshot explicit `startup_recovery` blokkal irja le a startup authority allapotat,
3. a start flow nem hagy maga utan hamis `RUNNING` snapshotot,
4. a partial startup hibak nem teardownolnak vakon megosztott eroforrasokat,
5. a kovetkezo implementacios kor clean `main`-rol indulhat, a mostani lokalis kiserleti patch pedig nem delivery baseline.

## Current Codebase Check (2026-04-10)

1. A checked-out tree-ben a `src/v11/application/start/**` scope jelenleg tobb review-korben alakult, lokalis recovery-kiserleti valtozasokat tartalmaz.
2. A beszelgetes soran kiderult, hogy a scope mar nem lokalis bugfix:
   - state snapshot,
   - runtime session registry,
   - tmux session,
   - git worktree/branch
   egyszerre mozog.
3. A jelenlegi lokalis implementacio nem tekintheto merge-celpontnak; a kovetkezo kor spec-first ujrainditast igenyel.

## Complexity / Split Rationale

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `activation_coupling`: `2`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `2`
6. `risk_score`: `9`
7. Why a plan is needed:
   - a startup/recovery scope internal lifecycle contractot valtoztat,
   - ugyanaz a fogalom egyszerre erinti a state-et, a registryt, a tmuxot es a worktree lifecycle-t,
   - a korabbi "simple fix" diffek valojaban recovery-protokoll atirasok lettek.
8. Split decision:
   - `phase1a schema/invariants foundation`
   - `phase1b preparing routing/admission`
   - `phase1c failure-policy persistence`
   - `phase1d running commit gate + reason propagation`
   - `startup interruption safety delivery`
   - `preparing-state recovery delivery`
   - `operator/recovery-surface hardening`
9. Milestone-gated behavior to defer:
   - kulon operator UX vagy uj lifecycle command surface nem resze az elso implementation kornek.
10. Canonical-state decision:
   - a `startup_recovery` descriptor a `state.json` resze; nem kulso optional artifact.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1A | Canonical startup recovery schema and invariants | `docs/pairflow-initial-design.md`, `src/types/bubble.ts`, `src/v11/shared/state/**`, review findingok | typed `startup_recovery` schema, legacy compatibility note, invariant/validation table | a canonical descriptor shape es a `CREATED` / `PREPARING_WORKSPACE` / `RUNNING` state invariansok kulon, ellentmondasmentesen le vannak zarva |
| Phase 1B | `PREPARING_WORKSPACE` routing and admission contract | Phase 1A foundation | `resolveStartBubbleMode(...)` admission rules, retry-safe descriptor gate, stale/missing descriptor fail-closed policy | a start routing deterministicen elvalasztja a `fresh`, `recover_preparing` es `resume` utakat, es unsafe descriptor mellett fail-closed marad |
| Phase 1C | Startup failure-policy persistence contract | Phase 1A-1B foundation | `rollback` / `retry` / `preserve_for_recovery` persistence semantics, cleanup persistence contract | a failure-policy producer es consumer ugyanazt a canonical jelentest hasznalja; rollback es retry vegallapot nem mond ellent a kovetkezo start routingnak |
| Phase 1D | `RUNNING` commit gate and reason propagation contract | Phase 1A-1C foundation | explicit commit-ready gate, `START_RUNNING_COMMIT_BLOCKED` canonical propagation, mutation seam contract | a `RUNNING` commit gate canonical reason code-ja nem vész el wrapper szinteken, es a clear/archive semantics explicit |
| Phase 2A | Startup interruption safety delivery | Phase 1A-1D foundation | tmux launch attribution, signal-safe startup cleanup, explicit teardown ownership szabalyok | partial startup hiba es process interruption nem hagy maga utan hamis `RUNNING` snapshotot vagy vak teardown-t |
| Phase 2B | `PREPARING_WORKSPACE` recovery delivery | Phase 1A-1D foundation + Phase 2A delivery | `recover_preparing` start/restart path, live tmux reuse vs stale reclaim, reconcile alignment | a `PREPARING_WORKSPACE` bubble deterministicen ujraindithato vagy ujrahasznalhato explicit contract menten |
| Phase 3 | Operator/recovery surface hardening | Phase 2B delivery | status/reconcile attention semantics, incident docs, optional diagnostics tightening | a recovery allapotok operatori olvasata tiszta es nincs rejtett manualis lepes a normal pathon |

## Task List

1. `plans/tasks/bubble-start-startup-recovery-schema-and-invariants-phase1a.md`
2. `plans/tasks/bubble-start-preparing-routing-and-admission-phase1b.md`
3. `plans/tasks/bubble-start-startup-failure-policy-persistence-phase1c.md`
4. `plans/tasks/bubble-start-running-commit-gate-and-reason-propagation-phase1d.md`
5. `plans/tasks/bubble-start-startup-interruption-safety-delivery-phase2a.md`
6. `plans/tasks/bubble-start-preparing-workspace-recovery-delivery-phase2b.md`
7. `plans/tasks/bubble-start-preparing-workspace-recovery-operator-hardening-phase3.md`

## Dependencies

1. `docs/pairflow-initial-design.md`
2. `src/v11/application/start/**`
3. `src/v11/application/reconcile/runReconcileFlow.ts`
4. `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
5. `src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts`

## Risks and Mitigations

1. Risk: a foundation scope megint egyetlen taskba csuszik vissza.
   Mitigation: a Phase 1 kulon 1A-1D taskokra bomlik schema/invariant, routing, failure-policy persistence es commit-gate reason-propagation bontasban.

2. Risk: a signal handling es a tmux attribution ugyanabban a patchben osszecsuszik a recovery deliveryvel.
   Mitigation: Phase 2A csak interruption safety es teardown ownership delivery lehet; `recover_preparing` behavior nem.

3. Risk: a `PREPARING_WORKSPACE` recovery task ujra osszekeveri a live reuse es a stale reclaim semantikat.
   Mitigation: Phase 2B-ben kotelezoen kulon acceptance class a live tmux reuse es a stale registry reclaim.

4. Risk: a jelenlegi lokalis patch tanulsagai elvesznek.
   Mitigation: a plan es a task kifejezetten rogzitik, hogy a patch learning baseline, nem merge target.

5. Risk: a recovery implementacio tovabbra is csak stubolt dependencykkel latszik jonak.
   Mitigation: a validation strategy kotelezove teszi a default dependency integration coverage-et.

6. Risk: a descriptor helye korul nyitva marad az authority kerdes, es emiatt uj review-loop indul.
   Mitigation: a plan Phase 1-ben elore dont a canonical state-be tett `startup_recovery` block mellett.

## Validation Strategy

1. Phase 1 validacio:
   - document-level consistency review,
   - state/invariant tabla teljesseg-ellenorzes,
   - failure-policy matrix review,
   - scope-boundary review annak bizonyitasara, hogy Phase 2A/2B/3 acceptance nem szivarog vissza.
2. Phase 1B validacio:
   - mode-routing review,
   - retry-safe descriptor admission tests,
   - stale/missing descriptor fail-closed review.
3. Phase 1C validacio:
   - failure-policy producer/consumer consistency review,
   - rollback vs retry vegallapot tesztek,
   - cleanup persistence conflict handling.
4. Phase 1D validacio:
   - commit-gate contract tests,
   - canonical reason-code propagation review,
   - `startup_recovery` clear/archive semantics review.
5. Phase 2A validacio:
   - tmux launch attribution regressziok,
   - signal interruption cleanup coverage,
   - teardown ownership regressziok.
6. Phase 2B validacio:
   - targeted `startBubble` default dependency tests,
   - `startupReconciler` es `restartRecovery` integration coverage,
   - live tmux reuse vs stale reclaim coverage.
7. Phase 3 validacio:
   - status/reconcile operator smoke paths,
   - stale/partial startup incident proofek.

## Assumptions

1. A startup/recovery contract belso boundary valtozas, nem uj user-facing product feature.
2. A `PREPARING_WORKSPACE` tovabbra is ervenyes lifecycle state marad; nem uj top-level state bevezetese az elso cel.
3. A kovetkezo implementacios kor clean `main`-rol fog indulni.
4. A Phase 1 foundation munka 1A-1D task-lancra van bontva; runtime delivery csak ezutan jon Phase 2A/2B/3-ban.

## Decisions Captured

1. A `startup_recovery` descriptor a canonical `state.json` resze.
2. A `RUNNING` commit pont kulon explicit transition, amely clear-eli vagy archival-only allapotba teszi a `startup_recovery` blokkot.
3. A stale descriptor kulon fail-closed trigger; generic retry vagy resume nem engedheto descriptor mismatch mellett.
4. Phase 1-ben a `retry` csak explicit retry metadata mellett ervenyes; kulonben `preserve-for-recovery` a default.
5. Legacy snapshot migrationnel a hianyzo `startup_recovery` blokk csak `CREATED` es `RUNNING` alatt kompatibilis; `PREPARING_WORKSPACE` alatt fail-closed routing szukseges.
6. `RUNNING` alatt a recovery blokk cleared-by-default; ha retained, csak minimal archival-only marker shape megengedett.
7. Az eredeti egyben tartott Phase 1 task superseded lett; a tovabbi implementation authority a Phase 1A-1D task-lancban van.
8. Phase 1A-1D nem szallit tmux attribution deliveryt, live reuse/reclaim deliveryt vagy operator surface hardeninget.
