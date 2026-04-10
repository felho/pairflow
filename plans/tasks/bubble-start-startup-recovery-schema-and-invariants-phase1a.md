---
artifact_type: task
artifact_id: task_bubble_start_startup_recovery_schema_and_invariants_phase1a_v1
title: "Bubble Start Startup Recovery Schema and Invariants (Phase 1A)"
status: superseded
phase: phase1a
superseded_reason: "Human-gate rework showed that the combined Phase 1A artifact still mixed two different implementation authorities: schema/read-path validity and the concrete persistence/write-boundary authoring seam. Keeping them in one implementable task left a real authoring choice open and allowed multiple schema-valid but behaviorally different first persisted states, so the combined artifact is replaced by two narrower follow-up tasks."
superseded_by:
  - plans/tasks/bubble-start-startup-recovery-schema-authority-phase1a.md
  - plans/tasks/bubble-start-startup-recovery-write-boundary-phase1a.md
target_files:
  - plans/tasks/bubble-start-startup-recovery-schema-authority-phase1a.md
  - plans/tasks/bubble-start-startup-recovery-write-boundary-phase1a.md
  - plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start Startup Recovery Schema and Invariants (Phase 1A)

## Superseded Status

Ez az artifact mar nem aktiv implementation baseline.

A split oka:
1. A schema-validity/read-path authority es a concrete write-boundary authoring seam kulon ownershipot igenyel.
2. A combined artifact nyitva hagyta, hogy a canonical descriptor authoring az `applyStateTransition(...)` bovitesevel vagy a mutation layerben tortenjen.
3. A combined artifact nem zarta le eleg szukre az elso canonical `PREPARING_WORKSPACE` persisted descriptor baseline-t, igy tobb schema-valid, de behavior-szinten eltero allapot maradt lehetseges.

## Replacement Tasks

| Replacement Artifact | Owns | Must Not Own |
|---|---|---|
| `plans/tasks/bubble-start-startup-recovery-schema-authority-phase1a.md` | canonical `startup_recovery` type/schema authority, vocabulary closure, lifecycle invariant matrix, legacy compatibility / fail-closed read semantics, inspection/read-path expectations | concrete descriptor authoring seam, first persisted write contract, mutation plumbing |
| `plans/tasks/bubble-start-startup-recovery-write-boundary-phase1a.md` | chosen persistence authoring seam, exact `CREATED -> PREPARING_WORKSPACE` es fresh-start `PREPARING_WORKSPACE -> RUNNING` write contract, mutation / transition-boundary plumbing, write-proof tests | schema vocabulary ownership, routing, failure-policy persistence, `RUNNING` commit-gate propagation |

## Baseline Rule

1. Kesőbbi implementernek ezt a combined artifactot nem szabad implementation targetkent kezelnie.
2. A state validity/read-path authority kizarolag a `schema-authority` utod-taskban van.
3. A concrete persisted-write seam authority kizarolag a `write-boundary` utod-taskban van.
4. Routing, failure-policy persistence es `RUNNING` commit-gate scope tovabbra is a Phase 1B / 1C / 1D taskokban marad.

## Handoff Note

Ez a file historical split note. Aktiv L1 implementation contract mar nincs benne.
