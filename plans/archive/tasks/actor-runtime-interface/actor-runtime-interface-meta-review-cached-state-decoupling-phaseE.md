---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_state_decoupling_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached State Decoupling (Phase E)"
status: superseded
phase: phaseE
superseded_reason: "The original combined foundation task mixed current-round runtime authority refactor, state-shape/persistence removal, and approval/projection consumer cutover. That proved too broad and loop-prone, so the scope was split into three narrower foundation tasks."
superseded_by:
  - plans/archive/tasks/actor-runtime-interface-meta-review-cached-current-round-authority-and-runtime-consumer-cutover-phaseE.md
  - plans/archive/tasks/actor-runtime-interface-meta-review-cached-approval-and-projection-consumer-cutover-phaseE.md
  - plans/tasks/actor-runtime-interface-meta-review-cached-persisted-authority-and-cleanup-recovery-removal-phaseE.md
target_files:
  - src/types/bubble.ts
  - src/v11/domain/state/initialState.ts
  - src/v11/shared/state/stateSchemaMetaReview.ts
  - src/v11/shared/state/stateSchemaMetaReviewAutonomous.ts
  - src/v11/shared/state/stateSchemaMetaReviewAutonomousSupport.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunPersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/approval/approvalTranscriptContext.ts
  - src/v11/shared/approval/approvalRoutingEligibility.ts
  - src/v11/shared/status/statusCommandViewProjection.ts
  - src/v11/shared/list/listCommandApi.ts
prd_ref: null
plan_ref: plans/archive/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached State Decoupling (Phase E)

## Superseded Decision (2026-04-11)

1. Ez a task mar ne legyen kozvetlen implementation target.
2. Az eredeti scope egyszerre mozgatott:
   - state shape/schema es persistence seam-eket,
   - approval source-of-truth cutovert,
   - status/list consumer projection cleanupot.
3. Ez a kombinacio magas loop-rizikot jelentett volna, mert a canonical source-of-truth cutover es a consumer cutover ugyanabban a taskban keveredett.
4. A helyes replacement split:
   - `plans/archive/tasks/actor-runtime-interface-meta-review-cached-current-round-authority-and-runtime-consumer-cutover-phaseE.md`
   - `plans/archive/tasks/actor-runtime-interface-meta-review-cached-approval-and-projection-consumer-cutover-phaseE.md`
   - `plans/tasks/actor-runtime-interface-meta-review-cached-persisted-authority-and-cleanup-recovery-removal-phaseE.md`
5. A cached-surface removal delivery task csak ez utan a harom foundation task utan hajthato vegre.

## Historical Scope Summary

1. A historical combined task celja az volt, hogy a cached meta-review state/control-path dependence egyben szunjon meg.
2. Ez a cel tovabbra is ervenyes, de vegrehajtasi szempontbol tul nagy szeletnek bizonyult.
3. Ez a dokumentum ezentul csak traceability artifact; az aktiv implementation authority a harom replacement taskban van.

## Review Control

1. Ha a harom replacement task kozul barmelyik ujra vegyes foundation+consumer scope-ba kezd terjeszkedni, azt ujabb split triggerkent kell kezelni.

## Spec Lock

This historical artifact remains `SUPERSEDED`.
