---
artifact_type: plan
artifact_id: plan_pairflow_cli_command_profile_external_default_self_host_opt_in_phase1_v1
title: "Pairflow CLI Command Profile: External Default + Self-Host Opt-In (Phase 1 Plan)"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Pairflow CLI Command Profile - External Default + Self-Host Opt-In (Phase 1)

## Objective

Eliminálni a base-case repo-agnosztikus használatot törő `PAIRFLOW_COMMAND_PATH_STALE` viselkedést úgy, hogy:
1. az alapértelmezett bubble command profile `external` legyen,
2. a jelenlegi worktree-local működés megmaradjon explicit `self_host` opt-in módként,
3. a státusz és rollout diagnosztika profile-aware legyen (nincs false stale external módban).

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

1. Risk: self-host fejlesztési flow véletlen gyengítése.
   Mitigation: explicit `self_host` profile és fail-closed viselkedés változatlanul marad.
2. Risk: részleges implementáció miatt (pl. wrapper profile-aware, de status/converged reason mapping még nem), átmenetileg hamis vagy vegyes diagnosztika jelenik meg rollout alatt.
   Mitigation: a profile-aware reason mappinget kötelezően ugyanebben a scope-ban szállítani, és dedikált status+converged regressziós tesztekkel lezárni.
3. Risk: profile nélküli régi bubble állapot inkompatibilitás.
   Mitigation: determinisztikus default `external`.

## Validation Strategy

1. Unit tesztek: profile parser/default, wrapper generation, stale assessment profile szerint.
2. Integration tesztek: bubble create CLI profile opció, status és converged reason aggregation.
3. Regression: `self_host` módban a jelenlegi `PAIRFLOW_COMMAND_PATH_STALE` fail-closed védelem változatlan.
