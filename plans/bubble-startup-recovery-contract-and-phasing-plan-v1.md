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
2. a start flow nem hagy maga utan hamis `RUNNING` snapshotot,
3. a partial startup hibak nem teardownolnak vakon megosztott eroforrasokat,
4. a kovetkezo implementacios kor clean `main`-rol indulhat, a mostani lokalis kiserleti patch pedig nem delivery baseline.

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
   - `foundation/refactor`
   - `startup interruption safety delivery`
   - `preparing-state recovery delivery`
   - `operator/recovery-surface hardening`
9. Milestone-gated behavior to defer:
   - kulon operator UX vagy uj lifecycle command surface nem resze az elso implementation kornek.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | Startup resource contract foundation | `docs/pairflow-initial-design.md`, jelenlegi `src/v11/application/start/**`, review findingok | explicit `PREPARING_WORKSPACE` invariant tabla, startup commit pont, failure policy (`rollback` / `retry` / `preserve-for-recovery`) | a start flow resource-szerzodese implementalhato modon le van zarva, de meg nincs delivery valtozas |
| Phase 2A | Startup interruption safety delivery | Phase 1 foundation | tmux launch attribution, signal-safe startup cleanup, explicit teardown ownership szabalyok | partial startup hiba es process interruption nem hagy maga utan hamis `RUNNING` snapshotot vagy vak teardown-t |
| Phase 2B | `PREPARING_WORKSPACE` recovery delivery | Phase 1 foundation + Phase 2A delivery | `recover_preparing` start/restart path, live tmux reuse vs stale reclaim, reconcile alignment | a `PREPARING_WORKSPACE` bubble deterministicen ujraindithato vagy ujrahasznalhato explicit contract menten |
| Phase 3 | Operator/recovery surface hardening | Phase 2B delivery | status/reconcile attention semantics, incident docs, optional diagnostics tightening | a recovery allapotok operatori olvasata tiszta es nincs rejtett manualis lepes a normal pathon |

## Task List

1. `plans/tasks/bubble-start-preparing-workspace-recovery-foundation-phase1.md`
2. `plans/tasks/bubble-start-startup-interruption-safety-delivery-phase2a.md`
3. `plans/tasks/bubble-start-preparing-workspace-recovery-delivery-phase2b.md`
4. `plans/tasks/bubble-start-preparing-workspace-recovery-operator-hardening-phase3.md`

## Dependencies

1. `docs/pairflow-initial-design.md`
2. `src/v11/application/start/**`
3. `src/v11/application/reconcile/runReconcileFlow.ts`
4. `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
5. `src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts`

## Risks and Mitigations

1. Risk: a Phase 1 task megint delivery-taskka hizik.
   Mitigation: a foundation task explicitten csak a startup resource contractot es failure policy-t zarja le.

2. Risk: a signal handling es a tmux attribution ugyanabban a patchben osszecsuszik a recovery deliveryvel.
   Mitigation: Phase 2A csak interruption safety es teardown ownership delivery lehet; `recover_preparing` behavior nem.

3. Risk: a `PREPARING_WORKSPACE` recovery task ujra osszekeveri a live reuse es a stale reclaim semantikat.
   Mitigation: Phase 2B-ben kotelezoen kulon acceptance class a live tmux reuse es a stale registry reclaim.

4. Risk: a jelenlegi lokalis patch tanulsagai elvesznek.
   Mitigation: a plan es a task kifejezetten rogzitik, hogy a patch learning baseline, nem merge target.

5. Risk: a recovery implementacio tovabbra is csak stubolt dependencykkel latszik jonak.
   Mitigation: a validation strategy kotelezove teszi a default dependency integration coverage-et.

## Validation Strategy

1. Phase 1 validacio:
   - document-level consistency review,
   - state/invariant tabla teljesseg-ellenorzes,
   - failure-policy matrix review.
2. Phase 2A validacio:
   - tmux launch attribution regressziok,
   - signal interruption cleanup coverage,
   - teardown ownership regressziok.
3. Phase 2B validacio:
   - targeted `startBubble` default dependency tests,
   - `startupReconciler` es `restartRecovery` integration coverage,
   - live tmux reuse vs stale reclaim coverage.
4. Phase 3 validacio:
   - status/reconcile operator smoke paths,
   - stale/partial startup incident proofek.

## Assumptions

1. A startup/recovery contract belso boundary valtozas, nem uj user-facing product feature.
2. A `PREPARING_WORKSPACE` tovabbra is ervenyes lifecycle state marad; nem uj top-level state bevezetese az elso cel.
3. A kovetkezo implementacios kor clean `main`-rol fog indulni.

## Open Questions

1. Kulon persisted `startup_recovery` block keruljon-e a canonical state-be, vagy eleg egy kulso artifact? Ez Phase 1 implementacios dontes, de a tasknak kotelezoen le kell fednie.
