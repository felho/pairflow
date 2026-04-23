---
artifact_type: task
artifact_id: task_commit_remote_completion_continuity_alignment_phase1c_v1
title: "Commit Remote Completion Continuity Alignment (Phase 1C)"
status: draft
phase: phase1c
target_files:
  - src/v11/application/commit/commitCommandApi.ts
  - src/v11/application/commit/commitCommandFinalization.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.ts
  - src/v11/application/commit/commitRemotePorts.ts
  - tests/v11/application/commit/commitCommandApi.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.test.ts
  - tests/core/bubble/commitBubble.test.ts
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
prd_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
  - plans/archive/tasks/remote-bubble-execution/phase3b1-remote-commit-routing-and-continuity.md
  - plans/tasks/commit-completion-artifact-contract-foundation-phase1b.md
owners:
  - "felho"
---

# Task: Commit Remote Completion Continuity Alignment (Phase 1C)

## Purpose

1. A remote started bubble commit continuity consume-ot atallitani az uj completion-artifact contractra.
2. Levalasztani a remote sync-back es remote payload truthot a retained `done-package.md` preserve baseline-rol.

## Bounded Slice

1. Remote continuity consume alignment.
2. Nem shared contract foundation task.
3. Nem retained UI/start/non-commit consumer retirement task.

## In Scope

1. Remote commit payload marker/parse/update alignment az uj replacement contractra.
2. Local sync-back continuity explicit parityje az uj completion-artifact contracttal.
3. Fail-closed remote error taxonomy megtartasa.

## Out Of Scope

1. UI result consume switch
2. start/resume prompt switch
3. non-commit ref policy cleanup
4. old compat mezok teljes torlese

## Review Control

1. A review ne engedje, hogy a remote continuity task opportunista modon shared result contractot redesignoljon.
2. Ha a remote alignmenthez a retained UI/start consume is kotelezoen mozdulna, a task tul szeles, tovabbi split kell.
