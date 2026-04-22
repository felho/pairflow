---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task13_launch_compatibility_surface_removal_v1
title: "Actor Runtime Interface Opportunity 2 Task 13: Launch Compatibility Surface Removal"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/ports/tmuxSessions.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - src/v11/defaults/start/startBubbleDefaults.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/index.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/tmuxManager.test.ts
  - tests/core/bubble/orchestrationLoopSmoke.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 13: Launch Compatibility Surface Removal

## Current Codebase Check (Expected Post O2-T12)

1. Az `O2-T12` utan a canonical launch contract mar topology-neutral exact termekkel el:
   - `LAUNCH_ACK_COMMAND_FAILED`
   - `command_failed`
   - shared `runner` mező nelkul
2. Ettol fuggetlenul residual compat surface meg mindig maradhat:
   - `LaunchBubbleTmuxSession*` alias/result/port family
   - `launchBubbleTmuxSessionAck(...)`
   - `launchBubbleTmuxSession(...)`
   - retained start override seam vagy legacy bridge
   - retained repo-root/public export
   - retained core test/harness vocabulary
3. Ez a task ownershipolja a strict closeoutot:
   - nincs rename,
   - nincs replacement ugyanazon boundaryn belul,
   - nincs backward compatibility budget,
   - a vegallapot zero-hit a launch compat vocabularyra `src/**` es `tests/**` alatt.

## Closed-Contract Drift Anchors

1. Source anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/tasks/actor-runtime-interface-opportunity2-task12-launch-contract-foundation-neutralization.md`
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
   - `src/index.ts`
2. Canonical elements that must stay fixed:
   - `LaunchBubbleSessionInput`
   - `LaunchBubbleSessionAck`
   - `LaunchBubbleSessionAckPort`
   - `launchBubbleSessionAck(...)`
   - `LAUNCH_ACK_COMMAND_FAILED`
   - `command_failed`
3. Compat elements to delete fully:
   - `LaunchBubbleTmuxSession*`
   - `launchBubbleTmuxSessionAck(...)`
   - `launchBubbleTmuxSession(...)`
   - legacy launch override/fallback bridge
4. Forbidden reinterpretations:
   - a retained compat family nem maradhat harmless wrapperkent
   - a repo-root/public export nem maradhat “just alias” statuszban
5. Drift status:
   - `no_drift` only if the final state keeps the `O2-T12` canonical terms fixed and torli a compat familyt

## L0 - Policy

### Goal

1. A retained launch compatibility surface teljes torlese a source-bol, exportokbol es tesztekbol.
2. A start/restart/core harness teljes consume oldali atallitasa a canonical launch contractra.
3. A repo-root/public launch compat export surface megszuntetese.
4. A vegallapotban a launch boundaryhoz egyetlen vocabulary tartozhat.

### Non-Compatibility Policy (Explicit)

1. Nincs backward compatibility budget.
2. Nem elfogadhato:
   - retained alias type export
   - retained wrapper function export
   - legacy override seam
   - bridge helper
   - old scenario-nev vagy test-assert vocabulary

### Business Invariant

1. A canonical launch truth tovabbra is `running | failed_to_start`.
2. A canonical launch failure taxonomy az `O2-T12` altal lezart neutral taxonomy marad.
3. A retained tmux runtime adapter letezhet, de launch compat vocabulary nelkul.

### Allowed Resolution Path

1. Direct canonical `launchBubbleSessionAck(...)`
2. Direct canonical `LaunchBubbleSessionAckPort` override
3. Direct canonical `LaunchBubbleSessionAck`-alapu test/harness proof

### Forbidden Fallback

1. `LaunchBubbleTmuxSession*`
2. `launchBubbleTmuxSessionAck(...)`
3. `launchBubbleTmuxSession(...)`
4. `projectLegacyLaunchPortToSessionAckPort(...)`
5. `launch_ack_failed_compat`
6. `legacy_launch_bridge_failed`

## Scope Reality / Shape Proof

1. Primary bounded-task shape:
   - `consumer_family_alignment`
2. Secondary shape:
   - `activation_or_read_model`
3. Why this mix is safe:
   - a canonical contract es producer mar az `O2-T12` ownershipjaban lezart;
   - ez a task mar csak a residual compat consume/export/test falloutot ownershipolja;
   - nincs uj canonical term vagy producer rewrite.
4. Explicitly deferred:
   - generic tmux runtime utility atnevezes
   - onboarding / extension-surface simplification (`O3-T1`)

## Authority Boundary Map

1. `authority_producer`
   - preserved baseline only
2. `persisted_authority`
   - `N/A`
3. `internal_execution_consumers`
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
4. `workflow_orchestration_consumers`
   - `tests/contracts/v11/start.contract.runner.ts`
   - `tests/core/bubble/startBubble.test.ts`
   - `tests/core/runtime/restartRecovery.test.ts`
   - `tests/core/bubble/orchestrationLoopSmoke.test.ts`
5. `read_model_consumers`
   - `src/index.ts`
6. `cleanup_recovery_consumers`
   - restart recovery harness proof surface
7. Export surfaces closed in this phase:
   - yes

## Closure-Budget Gate

1. Closure buckets touched:
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `read_model_consumers`
   - `cleanup_recovery_consumers`
2. Intentionally collapsed closures:
   - `internal_execution_consumers` + `workflow_orchestration_consumers`
3. Why this collapse is safe:
   - ugyanannak a launch compat consume familynek a residual override/bridge/test falloutja zarul;
   - a producer es shared contract mar closed baseline.
4. Explicitly deferred closures:
   - `authority_producer`
   - `shared_contract` mint uj canonical term ownership

## Baseline Preservation

1. `must_preserve_behaviors`
   - start/restart flows ugyanugy launcholhatnak canonical ack consume-val
   - public API a canonical launch surface-re szukul
2. `allowed_resolution_paths`
   - direct canonical start dependency override
   - direct canonical repo-root/public export
3. `forbidden_regression_interpretations`
   - compat torles nem lazithatja a runtime viselkedest alias wrapperre utalva
   - test harness canonicalra irasa nem hozhat vissza legacy bridge-et mas neven
4. `replacement_proof_required_if_removed`
   - minden torolt compat import/use helyett explicit canonical import/use pathnak kell maradnia

## Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `split_decision`: `already_split`
9. Why no further split:
   - a producer/shared-contract closure mar kulon taskban zart;
   - itt mar csak a residual compat consume/export/test fallout maradt.

## Kill List

Az alabbi neveknek el kell tunniuk `src/**` es `tests/**` alol:

1. `LaunchBubbleTmuxSessionInput`
2. `LaunchBubbleTmuxSessionAckStatus`
3. `LaunchBubbleTmuxSessionAckReasonCode`
4. `LaunchBubbleTmuxSessionAckFailureKind`
5. `RunningLaunchBubbleTmuxSessionAck`
6. `WorkspaceRequiredLaunchBubbleTmuxSessionAck`
7. `SessionExistsLaunchBubbleTmuxSessionAck`
8. `TmuxCommandFailedLaunchBubbleTmuxSessionAck`
9. `LaunchBubbleTmuxSessionAck`
10. `LaunchBubbleTmuxSessionResult`
11. `LaunchBubbleTmuxSessionAckPort`
12. `LaunchBubbleTmuxSessionPort`
13. `launchBubbleTmuxSessionAck`
14. `launchBubbleTmuxSession`
15. `projectLegacyLaunchPortToSessionAckPort`
16. `launch_ack_failed_compat`
17. `legacy_launch_bridge_failed`

## Required Edits

1. A shared launch tipusokbol torolni kell a retained `LaunchBubbleTmuxSession*` familyt.
2. A producer familybol torolni kell a retained launch wrapper exportokat.
3. A start dependency contract nem fogadhat legacy tmux launch override seamet.
4. A start orchestration nem bridge-elhet legacy launch resultot canonical ackka.
5. A repo-root/public surface-rol torolni kell a retained launch compat exportokat.
6. A contract runner es core harness teszteket canonical launch vocabularyra kell atirni.

## Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - a canonical start dependency override path teljes legyen
   - a repo-root export surface canonical launch API-t adjon
2. Side effects forbidden before validations pass:
   - retained compat wrapper/export nem maradhat compile-preserving maradeknak
3. Invalid/precondition-failure behavior:
   - legacy override-callsiterol nincs fallback; fail-closed refactor kifejezett atirast igenyel
4. Coordination primitives in scope:
   - none

## Acceptance Criteria

### Functional

1. A start/restart/core harness launch consume-family kizárólag canonical launch contractot hasznal.
2. Nincs retained launch compat wrapper, override vagy export.
3. A repo-root/public surface sem tart launch compat vocabularyt.

### Zero-Hit Audit

```bash
rg -n "LaunchBubbleTmuxSession|launchBubbleTmuxSession|launchBubbleTmuxSessionAck|projectLegacyLaunchPortToSessionAckPort|launch_ack_failed_compat|legacy_launch_bridge_failed" src tests -S
```

### Validation

1. `pnpm typecheck`
2. `pnpm build`
3. `pnpm vitest tests/v11/application/start/startCommandOrchestration.test.ts tests/contracts/v11/start.contract.runner.ts tests/core/bubble/startBubble.test.ts tests/core/runtime/restartRecovery.test.ts tests/core/runtime/tmuxManager.test.ts tests/core/bubble/orchestrationLoopSmoke.test.ts`
