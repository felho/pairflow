---
artifact_type: plan
artifact_id: plan_pairflow_cli_command_profile_external_default_self_host_opt_in_phase1_v1
title: "Pairflow CLI Command Profile: External Default + Self-Host Opt-In (Phase 1 Plan)"
status: implementable
prd_ref: null
owners:
  - "felho"
---

# Plan: Pairflow CLI Command Profile - External Default + Self-Host Opt-In (Phase 1)

## Objective

Eliminálni a base-case repo-agnosztikus használatot törő `PAIRFLOW_COMMAND_PATH_STALE` viselkedést úgy, hogy:
1. az alapértelmezett bubble command profile `external` legyen,
2. a jelenlegi worktree-local működés megmaradjon explicit `self_host` opt-in módként,
3. a státusz és rollout diagnosztika profile-aware legyen (nincs false stale external módban),
4. a scope ne vezessen be külön command-path override mechanizmust,
5. a `bubble create` profile input validáció determinisztikus legyen (invalid érték explicit reject).

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | External default + self-host opt-in bevezetés | aktuális runtime/bootstrap és stale diagnosztika | profile mező bubble configban, create CLI opció, profile-aware wrapper+assessment, tesztek | base-case non-Pairflow repo bubble nem bukik local `dist/cli/index.js` hiány miatt; self-host fail-closed megmarad |

## Task List

1. `plans/tasks/pairflow-cli-command-profile-external-default-self-host-opt-in-phase1.md`

## Dependencies

1. `docs/pairflow-initial-design.md`
2. `src/core/runtime/pairflowCommand.ts` wrapper/assessment contract
3. `src/core/runtime/agentCommand.ts` pane startup bootstrap

## Risks and Mitigations

1. Risk: self-host fejlesztési flow regressziója (fail-closed gyengülése).
   Mitigation: explicit `self_host` profile és fail-closed viselkedés változatlanul marad.
2. Risk: részleges implementáció miatt (pl. wrapper profile-aware, de status/converged reason mapping még nem), átmenetileg hamis vagy vegyes diagnosztika jelenik meg rollout alatt.
   Mitigation: a profile-aware reason mappinget kötelezően ugyanebben a scope-ban szállítani, és dedikált status+converged regressziós tesztekkel lezárni.
3. Risk: profile nélküli legacy bubble konfiguráció defaultolása félrecsúszik rollout közben.
   Mitigation: determinisztikus default `external` + legacy kompatibilitási teszt.

## Validation Strategy

1. Unit tesztek: profile parser/default, wrapper generation, stale assessment profile szerint.
2. Integration tesztek: bubble create CLI profile opció, status és converged reason aggregation.
3. Regression: `self_host` módban a jelenlegi `PAIRFLOW_COMMAND_PATH_STALE` fail-closed védelem változatlan.

## Objective to AC/Test Alignment

1. Objective #1 (`external` default) -> task AC1/AC2 -> T1, T4, T6, T10.
2. Objective #2 (`self_host` opt-in + fail-closed) -> task AC3 -> T2, T5, T7.
3. Objective #3 (profile-aware diagnostics) -> task AC4/AC6 -> T6, T7, T8, T9.
4. Objective #4 (no command-path override scope) -> task AC1/AC2/AC4 -> T4, T6, T10.
5. Objective #5 (deterministic CLI profile validation) -> task AC5 -> T3.

## Spec Lock Alignment

1. A plan completion gate-je a task (`plans/tasks/pairflow-cli-command-profile-external-default-self-host-opt-in-phase1.md`) Spec Lock szekciója.
2. A task `implementable` státusza csak akkor tartható fenn, ha nincs blocker/open question a required-now scope-ra.
