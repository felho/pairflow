---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3g1b_remote_merge_cleanup_proof_and_result_alignment_v1
title: "Remote Bubble Execution Remote Merge Cleanup Proof and Result Alignment (Phase 3G1B)"
status: implementable
phase: phase3g1b-remote-merge-cleanup-proof-and-result-alignment
target_files:
  - src/v11/application/merge/mergeCommandContract.ts
  - src/v11/application/merge/runMergeFlow.ts
  - src/v11/application/merge/mergeFlowFinalization.ts
  - src/v11/application/merge/mergeResultMapping.ts
  - src/v11/application/merge/mergeCommandDependencyResolution.ts
  - src/v11/defaults/merge/mergeCommandDefaults.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts
  - tests/core/bubble/mergeBubble.test.ts
  - tests/v11/application/merge/mergeCommandDependencyResolution.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.test.ts
prd_ref: null
plan_ref: plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
  - docs/remote-bubble-execution.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Merge Cleanup Proof and Result Alignment (Phase 3G1B)

## Feynman Summary / One-Screen Model

1. A `Phase 3G1A` a remote merge success proofjet a lokalis durable integration boundaryre helyezi at.
2. Ez a task zarja le azt, ami ettol meg nyitva marad:
   - explicit post-success remote cleanup seam,
   - cleanup success proof parity,
   - retained vegleges result/status/event truth alignment.
3. A tasknak ugyanabban a cleanup-routing familyben kell maradnia, mint a remote delete destructive closure.
4. A task nem ownershipolja a public operator wording alignmentet.
5. Az a `Phase 3G2` successor ownershipja.

## Current Codebase Check / Current-Tree Reality Check (2026-04-21)

1. A current tree-ben a remote merge vegleges resultje ma cleanup truthot is a remote helper payloadbol olvas:
   - [src/v11/application/merge/runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts:179)
2. A remote route local finalizationja ma reconcile-only, nem ad explicit cleanup-phase resultet:
   - [src/v11/application/merge/mergeFlowFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowFinalization.ts:41)
3. A retained result shape kulon file-ban epul:
   - [src/v11/application/merge/mergeResultMapping.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeResultMapping.ts:1)
4. A remote delete force-path ugyanebben a cleanup-routing familyben mar explicit proof-parityt kovetel:
   - [src/v11/application/delete/deleteBubble.ts](/Users/felho/dev/pairflow/src/v11/application/delete/deleteBubble.ts:263)
5. Target-file reality:
   - ez cleanup-proof es final truth-surface alignment task,
   - nem uj success-boundary foundation task,
   - nem operator/read-model wording task.

## Parent Plan Fit / Stable Sequencing

1. Ez a task a parent plan `Phase 3G` cleanup-routing residualjanak masodik bounded closure-ja.
2. Primer ownership:
   - post-success remote cleanup invocation,
   - cleanup success/failure proof,
   - retained vegleges result/event truth alignment.
3. Ez a task nem vallalja:
   - public CLI/help/skill/docs wording alignment.

## Plan Linkage

1. Parent plan gap closed:
   - a started remote merge cleanup closure mar nem lehet laza best-effort, es a vegleges truth surfaces nem maradhatnak mixed-phase allapotban.
2. Depends on:
   - `plans/tasks/remote-bubble-execution/phase3g1a-remote-merge-handoff-and-local-success-boundary.md`
3. Unlocks / impacts successors:
   - `Phase 3G2 remote merge operator contract alignment`
4. Task-list impact:
   - materializalja a `Phase 3G1A` utan kotelezo cleanup/result successor slice-ot.
5. Inherited validation / exit expectation:
   - explicit cleanup-phase failure taxonomy,
   - retained result booleans cleanup-truth szerint epulnek,
   - reused delete-family cleanup contract parity bizonyitott.

## Source-Anchor Consistency

1. Canonical source anchors:
   - [docs/remote-bubble-execution.md](/Users/felho/dev/pairflow/docs/remote-bubble-execution.md)
   - [src/v11/application/merge/mergeCommandContract.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeCommandContract.ts)
   - [src/v11/application/merge/mergeFlowFinalization.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeFlowFinalization.ts)
   - [src/v11/application/merge/mergeResultMapping.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeResultMapping.ts)
   - [src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts](/Users/felho/dev/pairflow/src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.ts)
   - [src/v11/application/delete/deleteBubble.ts](/Users/felho/dev/pairflow/src/v11/application/delete/deleteBubble.ts)
2. Closed canonical elements, amelyeket ez a task nem ertelmezhet ujra:
   - a durable success proof source mar a `Phase 3G1A` altal local boundaryre kerult,
   - a remote cleanup tovabbra sem publication gate,
   - a delete cleanup continuity retained baseline marad.
3. Uj explicit clarification, amelyet ez a task zar le:
   - merge cleanup success proof parityje,
   - retained vegleges cleanup booleans truth-forrasa.
4. `drift_status`: `closed_contract_revised_explicitly`

## Authority Boundary Map

1. `authority_producer`
   - nincs uj producer; a cleanup-phase ugyanazon merge-family authority chain folytatasa.
2. `persisted_authority`
   - in scope:
   - remote clone cleanup truth,
   - remote tmux/runtime/branch cleanup truth,
   - retained merge result cleanup booleans.
3. `internal_execution_consumers`
   - in scope:
   - explicit remote cleanup seam,
   - merge finalization cleanup-phase closure.
4. `workflow_orchestration_consumers`
   - in scope:
   - cleanup dispatch ordering es cleanup failure taxonomy.
5. `cleanup_recovery_consumers`
   - in scope:
   - proof parity a delete-family destructive closureval.
6. `read_model_consumers`
   - in scope mint retained truth-surface consumers:
   - merge CLI text/json surface,
   - UI router `UiMergeBubbleResult` typing,
   - package-exported `MergeBubbleResult` typing
   - explicit deferred:
   - operator wording/help/docs alignment,
   - consumer-facing terminology- vagy wording-racionalizalas.

## Scope Reality / Shape Proof

1. A bounded megvalositas a merge finalization/result familyben marad:
   - runMergeFlow remote route orchestration,
   - merge finalization,
   - merge result mapping,
   - remote merge executor cleanup contractja,
   - merge helper direct consumer typing,
   - merge tests.
2. A task ownershipolja a retained result/event truth alignmentet a meglvo consumer surfaces fele, de nem ownershipolja a public operator wording alignmentet.
3. Actual touched scope:
   - `fail_closed_hardening`
   - bounded `consumer_family_alignment`

## Closure Budget / Task-Shape Triage

1. `closure_buckets_touched`
   - `shared_contract`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
   - `read_model_consumers`
2. `collapsed_closures`
   - post-success cleanup invocation
   - cleanup proof parity
   - retained final truth alignment
3. `why_collapse_is_safe`
   - ugyanaz a merge finalization/result ownershipolja oket,
   - a retained read-model consume ugyanazon `MergeBubbleResult`/event truth surface lezarasabol el,
   - a canonical success proof source mar elozoleg stabilizalva van `Phase 3G1A`-ban.
4. `explicitly_deferred_closures`
   - operator/CLI/help/docs wording alignment
5. `primary_task_shape`
   - `fail_closed_hardening`
6. `secondary_task_shape`
   - `consumer_family_alignment`
7. `why_secondary_shape_is_safe`
   - a shared result surface alignment itt kozvetlenul a cleanup hardening closure resze, kulon operator consume alignment nelkul.

## Complexity-Risk Triage

1. `risk_score`
   - `5`
2. `split_decision`
   - `single_task_acceptable`
3. `authority_risk`
   - `1`
4. `surface_spread`
   - `1`
5. `identity_join_risk`
   - `1`
6. `activation_coupling`
   - `0`
7. `prerequisite_risk`
   - `1`
8. `acceptance_multiplicity`
   - `1`

## Baseline Preservation

1. `must_preserve_behaviors`
   - local bubble merge retained baseline valtozatlan marad,
   - a `Phase 3G1A` altal lezart local durable success boundary megmarad,
   - delete cleanup continuity retained baseline marad.
2. `allowed_resolution_paths`
   - local durable merge success proof utan explicit remote cleanup phase
   - cleanup-phase outcome -> retained merge result mapping
3. `forbidden_regression_interpretations`
   - local reconcile truth nem keverheto cleanup-complete truth-tal,
   - a merge cleanup proof nem lehet lazabb, mint a delete destructive proof ugyanazon artifact-osztalyokra.
4. `replacement_proof_required_if_removed`
   - ha a delete-family proof-parity nem teljesen oroklodik, az elteresnek explicit narrowed proofot kell adni.

## Success / Completion Proof Boundary

1. Current canonical success proof source:
   - `Phase 3G1A` utani local durable import/merge/persist boundary.
2. Target canonical success proof source:
   - valtozatlan.
3. Current canonical completion proof source:
   - implicit / vegyes a cleanup-phase es result surfaces kozott.
4. Target canonical completion proof source:
   - explicit post-success cleanup phase outcome.
5. Reused proof contract:
   - remote destructive cleanup contract a delete familybol.
6. Proof-parity rule:
   - `inherit_full_parity`
7. Final truth surfaces affected:
   - `MergeBubbleResult`
   - cleanup-phase failure shape
   - merge lifecycle event metadata
8. Mixed-truth surfaces allowed:
   - `none`

## Precondition and Side-Effect Boundary

1. Preconditions, amelyeknek cleanup dispatch elott at kell menniuk:
   - local durable success proof a `Phase 3G1A` szerint,
   - local reconcile/persist success.
2. Side effects, amelyek ezek elott tiltottak:
   - remote destructive cleanup,
   - vegleges cleanup-complete boolean mapping.
3. Invalid/precondition-failure behavior:
   - zero cleanup dispatch,
   - fail-closed.
4. Cleanup-phase failure behavior:
   - a local durable merge truth megmarad,
   - a failure kulon cleanup-phase hibakent jelenik meg.
5. Coordination primitives:
   - explicit lock/serialization nincs scope-ban.

## L0 - Policy

### Goal

1. A post-success remote cleanup kulon explicit merge-phase seamet kapjon.
2. A cleanup success proof legalabb ugyanazzal a szigorral zaruljon, mint a delete destructive closure.
3. A retained vegleges merge result booleans es event truth a cleanup phase tenyleges outcome-jara uljen.

### Non-Goals

1. Nincs public CLI/help/docs wording alignment ebben a taskban.
2. Nincs uj success-boundary cutover ebben a taskban; azt a `Phase 3G1A` mar lezarta.

### Business / Control Model

1. Business invariant:
   - ha a local durable merge mar sikeres, a cleanup failure sem veszitheti el ezt a truthot.
2. Control model:
   - a cleanup completion truthja a tenyleges post-success cleanup phase outcome-ja.
3. Read-path rule:
   - a vegleges retained cleanup booleans nem olvashatok a pre-cleanup helper payloadbol.
4. Forbidden fallback:
   - local reconcile truthot cleanup-complete truthkent visszaadni,
   - laza best-effort cleanupot vegleges success closurekent kezelni.
5. Missing-data rule:
   - ha a cleanup proof hianyzik vagy nem parity-safe, a merge success nem jelenhet meg cleanup-complete truth shape-pel.

## L1 - Command Contract and Sequencing

### Post-Success Cleanup Contract

1. Vezess be kulon explicit remote cleanup seamet a merge dependency/default familyben.
2. Ez a seam csak a `Phase 3G1A` durable success boundary utan hivhato.
3. A cleanup contractnak tartalmaznia kell mindazt a bizonyitekot, ami a retained cleanup booleans-hoz kell.

### Cleanup Proof Parity Rule

1. Ha a remote clone/worktree letezett, a merge cleanup success csak akkor zarhato le, ha `removedWorktree === true`.
2. Ha a remote tmux/runtime session letezett, a merge cleanup success csak akkor zarhato le, ha annak cleanupja bizonyitott.
3. Ha a remote bubble branch letezett es ennek cleanupja a merge closure resze, azt explicit bizonyitani kell.
4. A canonical remote worktree pathnak egyeznie kell a started pointer authorityval.
5. Ha a merge cleanup jogszeruen szukebb, mint a delete force-path, azt explicit narrowed contractkent kell leirni es tesztben bizonyitani.

### Final Truth Surface Alignment

1. A `mergeResultMapping` csak a tenyleges cleanup-phase outcome alapjan epitheti fel:
   - `runtimeSessionRemoved`
   - `removedWorktree`
   - `removedBubbleBranch`
2. A final retained resultben nem maradhat mixed-phase truth.
3. A merge lifecycle event metadata sem allithat cleanup-complete truthot cleanup proof nelkul.
4. A retained result shape-et fogyaszto meglevo consumer surfaces:
   - CLI merge text/json output,
   - UI router result typing,
   - package-exported merge result typing
   ugyanazt a stable shape-et tartjak meg, de innentol cleanup-phase truthot kell latniuk a vegleges mezokben.

### Cleanup-Phase Failure Contract

1. Ha a cleanup dispatch vagy cleanup proof elhasal:
   - a local durable merge truth megmarad,
   - a command nem adhat tiszta cleanup-complete success shape-et,
   - a hiba cleanup-phase failurekent latszik.
2. A failure taxonomy kulonitse el a local reconcile failuret a cleanup-phase failuretol.

## L2 - Implementation Notes

1. A remote route finalizationja adjon explicit cleanup-phase outcome-ot.
2. A `runMergeFlow` remote route a vegleges retained resultet mar ne kozvetlenul a pre-cleanup remote payloadbol epitse.
3. A `mergeResultMapping` es a returned `MergeBubbleResult` cleanup booleans csak cleanup-phase truthra uljenek.
4. Ha a delete-family proof parityhoz kozos helper hasznos, az a legszukebb merge/delete cleanup targetban szulethet meg; ne nyisson altalanos shared frameworkot.

## Acceptance Criteria

1. A post-success remote cleanup explicit merge-family seamkent fut.
2. A merge cleanup success proof parity-safe a delete family retained destructive contractjahoz kepest, vagy az elteres explicit narrowed rule-lal es teszttel fedett.
3. A vegleges retained `MergeBubbleResult` cleanup booleans a cleanup phase tenyleges outcome-jat tukrozik.
4. Ha a cleanup phase elhasal:
   - a local durable merge truth megmarad,
   - nincs cleanup-complete success shape,
   - a hiba kulon cleanup-phase failurekent jelenik meg.
5. Nincs mixed-truth final surface.

## Validation / Evidence

1. Unit:
   - cleanup seam contract mapping
   - cleanup-proof parity assertions
   - merge result truth alignment
   - helper-result direct consumer typing alignment
2. Integration:
   - started remote merge success local durable merge + cleanup success
   - cleanup failure local truthvesztes nelkul
   - artifact-existed-but-proof-missing fail-closed
   - retained CLI/UI/export consume stable-shape, final-truth behaviorrel
3. Regression:
   - a remote route vegleges resultje nem hasznalhat local reconcile truthot cleanup truth helyett.
   - a retained `MergeBubbleResult` surface nem maradhat compat-only vagy mixed-phase a `Phase 3G1B` utan.

## Done Definition

1. A started remote merge post-success cleanup closure explicit es parity-safe.
2. A retained vegleges merge result es event truth nem marad mixed-phase.
3. A `Phase 3G2` operator wording alignment most mar kulon, stabil successor lehet.
