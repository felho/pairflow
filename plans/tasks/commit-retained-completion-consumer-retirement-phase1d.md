---
artifact_type: task
artifact_id: task_commit_retained_completion_consumer_retirement_phase1d_v1
title: "Commit Retained Completion Consumer Retirement (Phase 1D)"
status: draft
phase: phase1d
target_files:
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/application/start/startCommandContext.ts
  - src/v11/application/start/startCommandTmuxLaunch.ts
  - src/v11/application/start/startCommandImplementerPrompts.ts
  - src/v11/application/start/startCommandResumeImplementerPrompt.ts
  - src/v11/application/commit/commitCliCommand.ts
  - src/cli/index.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/cli/bubbleApproveCommand.test.ts
  - tests/cli/convergedCommand.test.ts
  - tests/cli/bubbleCommitCommand.test.ts
  - README.md
  - docs/pairflow-initial-design.md
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
prd_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
  - plans/tasks/commit-completion-artifact-contract-foundation-phase1b.md
owners:
  - "felho"
---

# Task: Commit Retained Completion Consumer Retirement (Phase 1D)

## Purpose

1. A retained UI/start/non-commit consume family atallitasa az uj completion-artifact contractra.
2. A `done-package` compat surface kivezetese azokrol a consumer pontokrol, amelyek mar nem szorulnak preserve baseline-ra.

## Bounded Slice

1. Retained consumer alignment + compat retirement.
2. Nem canonical commit foundation task.
3. Nem remote continuity task.

## In Scope

1. UI commit result consume alignment.
2. Start/resume completion guidance alignment.
3. CLI/help/docs wording cleanup.
4. Nem-commit workflow `artifact://done-package.md` ref mintak explicit policy szerinti rendezese.

## Out Of Scope

1. Canonical commit snapshot payload redesign
2. Remote commit continuity producer/transport logic
3. Altalanos cross-bubble completion artifact framework

## Review Control

1. A review ne engedje, hogy a completion artifact ujra canonical source-of-truth-vá valjon.
2. Ha docs-only vagy CLI wording cleanup elorehoz olyan consume familyt, amelynek replacement contractja meg nincs stabilan lezarva, a task nem zarhato.
