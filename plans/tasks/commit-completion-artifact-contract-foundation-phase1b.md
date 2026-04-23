---
artifact_type: task
artifact_id: task_commit_completion_artifact_contract_foundation_phase1b_v1
title: "Commit Completion Artifact Contract Foundation (Phase 1B)"
status: draft
phase: phase1b
target_files:
  - src/v11/application/commit/commitCommandContract.ts
  - src/v11/application/commit/commitCommandApiContract.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/application/commit/commitCommandApi.ts
  - tests/v11/application/commit/commitCommandApi.test.ts
  - tests/contracts/v11/commit.contract.runner.ts
  - tests/contracts/v11/commit.contract.test.ts
  - docs/pairflow-initial-design.md
  - README.md
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
prd_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
  - plans/archive/tasks/remote-bubble-execution/phase3b1-remote-commit-routing-and-continuity.md
owners:
  - "felho"
---

# Task: Commit Completion Artifact Contract Foundation (Phase 1B)

## Purpose

1. Additive replacement contract bevezetese a retained `donePackagePath` helyett/ mellett.
2. A commit domainben explicitte tenni, hogy:
   - mi a canonical commit snapshot,
   - mi a completion artifact consume contract,
   - es mi a retained compat mezok sorsa.

## Bounded Slice

1. Shared contract foundation only.
2. Nem remote alignment task.
3. Nem retained consumer retirement task.

## In Scope

1. Uj additive completion-artifact contract shape bevezetese a commit resultben.
2. A retained `donePackagePath` explicit compat fieldde minositese.
3. A commit result es a UI router result contract koherens additive shape-re hozasa.
4. Contract tesztek frissitese ugy, hogy a successor consume familyk tudjanak mire atallni.

## Out Of Scope

1. remote sync-back alignment
2. start/resume prompt alignment
3. UI consume switch
4. `donePackagePath` torlese

## Critical Decision

1. Ez a task kotelezoen kimondja:
   - melyik mezo lesz a replacement completion-artifact contract,
   - es meddig marad retained compat mezo a `donePackagePath`.
2. Ha ez a dontes nem explicit, a Phase 1C/1D taskok nem implementalhatok.

## Review Control

1. A review ne engedje, hogy a shared contract breaking modon valtozzon a current consume familyk explicit inventoryja nelkul.
2. Ha a replacement contract nem additive, a task route-back vagy tovabbi split szukseges.
