---
artifact_type: plan
artifact_id: plan_commit_snapshot_and_completion_artifact_retirement_v1
title: "Commit Snapshot And Completion Artifact Retirement Plan"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Commit Snapshot And Completion Artifact Retirement

## Objective

Szetbontani a korabbi, tul szeles commit/done-package removal iranyt olyan bounded szeletekre, amelyek:
1. eloszor a canonical commit truthot tisztazzak,
2. utana explicit replacement contractot adnak a retained completion-artifact consume familyknek,
3. es csak a legvegen szuntetik meg a `done-package` retained compat surface-t.

## Current Codebase Check (2026-04-24)

1. A current tree tovabbra is `DONE_PACKAGE` envelope-ra es `artifacts/done-package.md` artifactra ul:
   - protocol/type validation
   - local commit runtime
   - remote commit continuity
   - UI commit result projection
   - start/resume prompt completion guidance
   - nem-commit workflow ref mintak
2. A korabbi egytaskos removal-scope valojaban tobb consume familyt erint egyszerre:
   - protocol + local commit write path
   - shared commit result / completion-artifact contract
   - remote continuity consume
   - retained UI/start/non-commit consume family
3. Emiatt a munka mar nem egyetlen task, hanem producer/contract closure + consume-family alignment sequence.

## Guiding Principles

1. `business_invariant`
   - A bubble commit canonical closure truthja a git commit + state transition + transcript boundary event legyen, ne egy prose summary artifact.
2. `control_model`
   - A canonical commit boundary truthot a commit runtime ownershipolja.
   - A completion artifact csak consumer contract lehet, nem canonical commit authority.
3. `read_path_rule`
   - Commit boundary dontesek a git/state/transcript lancbol olvashatok.
   - Retained consume familyk csak explicit replacement contract alapjan valthatnak le a `done-package` surface-rol.
4. `forbidden_fallback`
   - `done-package.md` vagy a `DONE_PACKAGE` summary nem maradhat implicit canonical truth.
   - Archivalt remote continuity preserve baseline nem irhato felul csendesen.
5. `allowed_resolution_path`
   - additive foundation -> additive replacement contract -> remote alignment -> retained consumer alignment -> compat retirement
6. `missing_data_rule`
   - amig a replacement contract nincs bevezetve es az adott consumer nincs atallitva, a retained `done-package` consume fail-closed modon preserved baseline marad

## Sequencing Note

1. `Phase 1A`
   - canonical commit snapshot foundation
   - local commit input dependency decoupling
   - retained `done-package` compat surface preserved
2. `Phase 1B`
   - replacement completion-artifact/result contract foundation
   - additive shared contract, retained compat mellett
3. `Phase 1C`
   - remote commit continuity alignment az uj replacement contractra
4. `Phase 1D`
   - retained UI/start/non-commit consumer alignment
   - `done-package` compat retirement

## Task List

1. [plans/tasks/commit-snapshot-foundation-and-local-done-package-input-decoupling-phase1a.md](/Users/felho/dev/pairflow/plans/tasks/commit-snapshot-foundation-and-local-done-package-input-decoupling-phase1a.md)
   - `Phase 1A`
   - foundation-only
2. [plans/tasks/commit-completion-artifact-contract-foundation-phase1b.md](/Users/felho/dev/pairflow/plans/tasks/commit-completion-artifact-contract-foundation-phase1b.md)
   - `Phase 1B`
   - additive replacement contract foundation
3. [plans/tasks/commit-remote-completion-continuity-alignment-phase1c.md](/Users/felho/dev/pairflow/plans/tasks/commit-remote-completion-continuity-alignment-phase1c.md)
   - `Phase 1C`
   - remote continuity consume alignment
4. [plans/tasks/commit-retained-completion-consumer-retirement-phase1d.md](/Users/felho/dev/pairflow/plans/tasks/commit-retained-completion-consumer-retirement-phase1d.md)
   - `Phase 1D`
   - retained consumer alignment + compat retirement

## Dependencies

1. `docs/pairflow-initial-design.md`
2. `README.md`
3. `plans/archive/plans/pairflow-initial-plan.md`
4. `plans/archive/tasks/remote-bubble-execution/phase3b1-remote-commit-routing-and-continuity.md`

## Risks And Mitigations

1. Risk: a canonical commit truth es a retained completion artifact ujra osszemosodik.
   Mitigation: explicit foundation-first sequencing; `done-package` Phase 1A-ban csak compat surface.
2. Risk: a remote continuity preserved baseline csendben torik.
   Mitigation: kulon Phase 1C task explicit remote consume ownershiptal.
3. Risk: a shared result contract tul koran toresre kerul.
   Mitigation: Phase 1B additive contract; retirement csak Phase 1D-ben.
4. Risk: a UI/start/non-commit consume cleanup opportunista "mellekmunka" lesz.
   Mitigation: kulon retained consumer retirement task.

## Validation Strategy

1. Phase 1A:
   - protocol/local commit/tests/docs
2. Phase 1B:
   - shared contract parity es additive result compatibility
3. Phase 1C:
   - remote continuity and sync-back regression
4. Phase 1D:
   - UI/start/non-commit consumer regression + docs cleanup

## Assumptions

1. A `done-package` teljes retirementje tovabbra is cel, de nem Phase 1A scope.
2. A retained consumer familyk explicit replacement contract nelkul nem vonhatok ossze egyetlen taskba biztonsagosan.
