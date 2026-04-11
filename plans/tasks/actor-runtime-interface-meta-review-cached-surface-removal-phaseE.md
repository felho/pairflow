---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_surface_removal_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Surface Removal (Phase E)"
status: superseded
phase: phaseE
superseded_reason: "The original delivery/removal task still mixed three distinct execution slices (CLI/read-stack removal, workflow+UI cleanup, active docs cleanup). After the risk gate was corrected to `single-task allowed: no`, the bounded implementation path is an explicit three-task split rather than one umbrella task."
superseded_by:
  - plans/tasks/actor-runtime-interface-meta-review-cached-cli-read-stack-removal-phaseE.md
  - plans/tasks/actor-runtime-interface-meta-review-cached-workflow-ui-cleanup-phaseE.md
  - plans/tasks/actor-runtime-interface-meta-review-cached-active-docs-cleanup-phaseE.md
target_files:
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/ReviewBubble.md
  - src/cli/index.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliTypes.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts
  - src/v11/application/metaReview/metaReviewCliOptionParser.ts
  - src/v11/application/metaReview/metaReviewCliOptionParserHelpers.ts
  - src/v11/application/metaReview/metaReviewCliOptionTypes.ts
  - src/v11/application/metaReview/metaReviewCliCommand.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/shared/metaReview/metaReviewCommandApi.ts
  - src/v11/shared/metaReview/metaReviewCommandReadArtifacts.ts
  - src/v11/shared/metaReview/metaReviewCommandReadFreshness.ts
  - src/v11/shared/metaReview/metaReviewCommandReadProjection.ts
  - src/v11/shared/metaReview/metaReviewCommandReadRuntime.ts
  - src/v11/shared/metaReview/metaReviewTypes.ts
  - README.md
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
  - ui/src/components/canvas/BubbleCanvas.tsx
  - ui/src/components/canvas/BubbleCanvas.test.tsx
  - plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
  - plans/tasks/actor-runtime-interface-meta-review-operator-read-surface-closure-phaseE.md
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/v11/application/metaReview/metaReviewCliEntrypointParity.test.ts
  - tests/v11/shared/metaReview/metaReviewCommandReadArtifacts.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached Surface Removal (Phase E)

## Superseded Decision (2026-04-11)

1. Ez a task mar ne legyen kozvetlen implementation target.
2. A korrigalt Complexity Risk Gate mellett a dokumentum sajat maga mondta ki, hogy `single-task allowed: no`.
3. Ebbol az kovetkezik, hogy az umbrella removal scope nem maradhat egyetlen vegrehajthato task, ha a kisebb bounded delivery szeletek nincsenek explicitten definialva.
4. A helyes replacement split:
   - `plans/tasks/actor-runtime-interface-meta-review-cached-current-round-authority-and-runtime-consumer-cutover-phaseE.md`
   - `plans/tasks/actor-runtime-interface-meta-review-cached-cli-read-stack-removal-phaseE.md`
   - `plans/tasks/actor-runtime-interface-meta-review-cached-workflow-ui-cleanup-phaseE.md`
   - `plans/tasks/actor-runtime-interface-meta-review-cached-active-docs-cleanup-phaseE.md`
5. A harom foundation task tovabbra is kotelezo precondition:
   - `plans/tasks/actor-runtime-interface-meta-review-cached-current-round-authority-and-runtime-consumer-cutover-phaseE.md`
   - `plans/tasks/actor-runtime-interface-meta-review-cached-state-shape-and-persistence-decoupling-phaseE.md`
   - `plans/tasks/actor-runtime-interface-meta-review-cached-approval-and-projection-consumer-cutover-phaseE.md`

## Historical Scope Summary

1. A historical umbrella task celja helyes marad: a cached meta-review functionality teljes public/operator/docs/UI/skill surface-nek kivezetese.
2. A problema nem a celallapottal volt, hanem azzal, hogy egyetlen taskban keverte:
   - a public CLI es cached read-stack runtime removal scope-ot,
   - a repo-local workflow es UI prompt consume cleanupot,
   - az aktiv docs es plan/task traceability cleanupot.
3. Ez a dokumentum ezentul csak traceability artifact; az aktiv implementation authority a harom replacement taskban van.

## Review Control

1. Ha barmelyik replacement task ujra elkezdi visszahuzni a masik ket szeletet a sajat scope-jaba, azt ujabb split vagy scope-tightening triggerkent kell kezelni.

## Spec Lock

This historical artifact remains `SUPERSEDED`.
