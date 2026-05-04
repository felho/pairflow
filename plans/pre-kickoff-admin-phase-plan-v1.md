---
artifact_type: plan
artifact_id: plan_pre_kickoff_admin_phase_v1
plan_id: pre-kickoff-admin-phase-plan-v1
created_on: "2026-05-04"
title: "Pre-Kickoff Admin Phase Plan"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-prep-admin-contract
  - 2-prep-admin-publish
  - 3-doc-bubble-start-integration
  - 4-impl-bubble-start-integration
  - 5-close-admin-verifier
active_task_id: 1-prep-admin-contract
archive_group: 2026-05-04-pre-kickoff-admin-phase-plan-v1
task_tracker:
  - task_id: 1-prep-admin-contract
    task_path: plans/tasks/1-prep-admin-contract.md
    status: approved
  - task_id: 2-prep-admin-publish
    task_path: null
    status: not_created
  - task_id: 3-doc-bubble-start-integration
    task_path: null
    status: not_created
  - task_id: 4-impl-bubble-start-integration
    task_path: null
    status: not_created
  - task_id: 5-close-admin-verifier
    task_path: null
    status: not_created
---

# Plan: Pre-Kickoff Admin Phase

## Objective

Reduce the amount of time `ExecutePairflowPlan` keeps the main worktree dirty
by moving long plan/task preparation and bubble-start administration into the
bubble worktree before kickoff, then publishing the bounded administration to
`main` only through a short fail-closed window.

The core model is:

1. create an ideation-mode bubble as the carrier worktree,
2. perform bounded pre-kickoff administration inside that bubble worktree,
3. commit the admin change on the bubble branch,
4. publish that admin commit back to clean `main`,
5. kickoff the same bubble only after the publish succeeds,
6. fail closed to an operator checkpoint if the admin publish conflicts or
   cannot prove its postconditions.

This plan intentionally keeps `ideation` as the existing technical mode name.
The new behavior is a stricter workflow contract over an existing mode, not a
rename of the runtime concept.

## Done Definition

1. The Pairflow docs/skills define bounded pre-kickoff administration for
   ideation-created bubbles as an optional pattern before any behavior switch.
2. `UsePairflow` exposes a manual pre-kickoff admin publish workflow that can
   commit bounded admin changes in the bubble worktree, publish them to `main`,
   and fail closed without running kickoff.
3. `ExecutePairflowPlan` document-bubble creation uses the pre-kickoff admin
   pattern while the implementation-bubble path remains functional under the
   previous model.
4. `ExecutePairflowPlan` implementation-bubble creation uses the same
   pre-kickoff admin pattern after the document path is proven.
5. Bubble close aftermath becomes verifier-first: scoped admin may be completed
   inside the bubble branch, while `main` performs a short verification and only
   applies deterministic reconciliation when required.
6. After every task in this plan, the skills remain operational: either the old
   route still works, or one fully usable new route is available without relying
   on a future task.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Operators can use an ideation-created bubble as a pre-kickoff admin carrier before normal doc or implementation work begins. | end_to_end | `pairflow bubble create --ideation`, bounded admin in the bubble worktree, pre-kickoff admin publish, then `pairflow bubble kickoff`. | Lifecycle/skill contracts, manual publish workflow, ExecutePairflowPlan route integration, and validation evidence for document and implementation start routes. | Operator approval for any manual checkpoint when publish conflicts. | Task 2 proves the manual operator path; task 3 proves the document-bubble route path; task 4 proves the implementation-bubble route path. |
| Post-close administration can be verified instead of always recreated on `main`. | end_to_end | Bubble close path returns settled result; `UpdateProgress` checks refreshed plan/task/admin postconditions first and applies deterministic reconciliation only when required. | Close handler contract, `UpdateProgress` verifier-first behavior, and tests/evidence for already-satisfied and deterministic-reconcile paths. | Bubble branch must include scoped admin when available; operator checkpoint remains required for ambiguous refreshed state. | Task 5 proves verifier-first no-edit behavior when admin is already present and deterministic reconciliation when it is absent but recoverable. |

## Guiding Principles

1. Business invariant: `main` should be touched only during short publish,
   merge, or verification windows. Long review, task creation, and admin prep
   must not leave `main` dirty.
2. Control model: Pairflow lifecycle state remains Pairflow authority, plan
   metadata remains sequencing authority, task metadata remains task-local
   execution authority, and the pre-kickoff admin publish result proves only the
   bounded metadata/progress changes it names.
3. Read-path rule: kickoff may consume the task payload only after the required
   admin publish has succeeded and the refreshed `main` state proves the
   intended linkage/status postconditions.
4. Forbidden fallback: do not infer successful admin publication from bubble
   worktree files, chat history, transcript prose, or a local unmerged commit.
   Do not kickoff after a failed or ambiguous admin publish.
5. Allowed resolution path: when a route requires pre-kickoff admin, create the
   bubble in ideation mode, apply bounded admin in the bubble worktree, commit
   it, publish the commit to clean `main`, verify the refreshed authority state,
   then kickoff the same bubble with the appropriate task.
6. Missing-data rule: if the bubble id, worktree, admin commit, selected admin
   scope, merge result, or refreshed metadata postcondition cannot be proven,
   stop at a human checkpoint before kickoff.
7. Sequencing note:
   - Task 1 is documentation-only and does not switch behavior.
   - Task 2 adds a manual workflow without making any route depend on it.
   - Task 3 integrates only the document-bubble start path.
   - Task 4 integrates only the implementation-bubble start path.
   - Task 5 improves close aftermath independently through verifier-first
     semantics.
8. Skill source-of-truth and sync rule: any task that modifies repo-local
   Pairflow skill files must follow the repository skill sync policy after the
   repo-local source change is committed. For `UsePairflow` changes, this means
   updating `.claude/skills/UsePairflow/**` first, then running the documented
   installer/sync workflow to `~/.claude/skills`, and recording the required
   follow-up global-skill commit separately. The plan must not treat global
   installed skill files as the editable source.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/INSTALL.md`
   - `.claude/skills/UsePairflow/SKILL.md`
   - `.claude/skills/UsePairflow/Workflows/CreateBubble.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/UpdateProgress.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
2. Closed canonical elements / terms:
   - `--ideation` creates a bubble with persisted `[ideation] mode = true`.
   - `ideation.task_pending=true` means kickoff has not yet supplied the task
     payload.
   - `doc_bubble_id` and `impl_bubble_id` are linkage-only task metadata.
   - `status=implementable` is the durable proof that document refinement
     closed successfully.
   - `status=in_progress` means implementation work is linked or started.
3. Explicitly authorized reinterpretation: ideation-created bubbles may perform
   bounded pre-kickoff administration before kickoff. This does not make
   product/source implementation valid during the pre-kickoff admin phase.
4. Downstream task impact: successor tasks must preserve operational continuity
   after each slice and must not require an unimplemented future route to keep
   `ExecutePairflowPlan` usable.
5. Skill sync impact: tasks that modify `UsePairflow` source must include the
   repo-local edit, repo commit, installer/sync, and separate global-skill
   commit sequence. Tasks that modify only `ExecutePairflowPlan` still keep
   repo-local skill files as source of truth and must not edit installed global
   copies directly.

## Current Status

### Completed Work

1. Pairflow supports ideation-mode bubble creation and round-0 hold.
2. `UsePairflow` already recognizes `RUNNING round=0` ideation state as a valid
   hold and avoids automatic kickoff.
3. `ExecutePairflowPlan` already has distinct document-bubble and
   implementation-bubble route surfaces.
4. Existing metadata contracts already define `doc_bubble_id`,
   `impl_bubble_id`, `approved`, `implementable`, and `in_progress` meanings.
5. Repository policy already defines Pairflow skill source-of-truth and sync
   rules: repo-local `.claude/skills/**` files are edited first, installed
   global skill copies are derived artifacts, and `UsePairflow` changes require
   the documented sync workflow after the repo-local commit.

### Open Work

1. No explicit pre-kickoff admin publish workflow exists.
2. `ExecutePairflowPlan` still performs or expects some bubble-start
   administration around the main route instead of inside the bubble carrier.
3. Kickoff is not gated on a proved admin publish when a route requires
   pre-kickoff admin.
4. Close aftermath is not yet verifier-first; it can still duplicate admin work
   on `main` even when the bubble branch already carried it.
5. The new plan/task sequence must carry the existing skill sync policy into
   each skill-modifying task so the repo-local source and installed skill copies
   do not drift.

### Deferred / Future Work

1. Renaming `ideation` to a more specific prep mode is out of scope.
2. Remote-bubble support for this pattern is out of scope unless a successor
   plan defines laptop-routed publish semantics explicitly.
3. Product/source implementation during pre-kickoff admin remains forbidden.
4. Automatic conflict resolution is out of scope; conflicts stop at an operator
   checkpoint.

## Progress / Phase Summary

1. Phase 1: document the optional pre-kickoff admin contract.
2. Phase 2: add a manual UsePairflow workflow to publish bounded admin.
3. Phase 3: route document-bubble start through the admin publish pattern.
4. Phase 4: route implementation-bubble start through the admin publish
   pattern.
5. Phase 5: make close aftermath verifier-first and prefer bubble-contained
   admin.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-prep-admin-contract` | `plans/tasks/1-prep-admin-contract.md` | Document the optional pre-kickoff admin pattern in UsePairflow and ExecutePairflowPlan contracts without changing default behavior or requiring any new route. | N/A | No explicit contract exists for bounded admin before kickoff. | draft |
| `2-prep-admin-publish` | `null` | Add a manual UsePairflow workflow for pre-kickoff admin publish: status check, scope check, bubble-worktree commit, short main publish, postcondition verification, fail-closed no-kickoff behavior, and required UsePairflow skill sync after repo-local source commit. | `1-prep-admin-contract` | Operators cannot run the pattern through a first-class workflow. | not_created |
| `3-doc-bubble-start-integration` | `null` | Integrate only `CreateDocumentBubble` with the pre-kickoff admin publish workflow while leaving implementation-bubble creation on the existing path, including required skill sync for any UsePairflow edits. | `2-prep-admin-publish` | Document-bubble start still needs main-side admin/linkage handling. | not_created |
| `4-impl-bubble-start-integration` | `null` | Integrate only `CreateImplementationBubble` with the pre-kickoff admin publish workflow after the document path is proven, including required skill sync for any UsePairflow edits. | `3-doc-bubble-start-integration` | Implementation-bubble start still needs main-side admin/linkage handling. | not_created |
| `5-close-admin-verifier` | `null` | Make close aftermath verifier-first: accept scoped admin already carried by the bubble branch, and reconcile on `main` only when deterministic postconditions are missing. | `4-impl-bubble-start-integration` | Close aftermath can still spend unnecessary time editing `main`. | not_created |

## Task Acceptance Contracts

1. `1-prep-admin-contract`
   - Adds documentation/skill contract only.
   - Preserves the existing create/start/kickoff behavior.
   - Defines allowed and forbidden pre-kickoff admin scope.
   - Explains that the pattern is optional until later route tasks adopt it.
   - If it edits `UsePairflow`, it must carry the repo-local edit and required
     skill sync handoff in the task acceptance/validation wording instead of
     treating installed global skills as out of scope forever.
2. `2-prep-admin-publish`
   - Adds a manual workflow that can be used by an operator independently.
   - Does not require `ExecutePairflowPlan` to use it yet.
   - Never kickoffs after a failed admin publish.
   - Includes the repository-required `UsePairflow` skill install/sync workflow
     and separate global-skill commit when the repo-local skill change lands.
3. `3-doc-bubble-start-integration`
   - Changes only the document-bubble create/start route.
   - Leaves implementation-bubble creation functional under the previous path.
   - Proves that a document-bubble route can publish admin and then kickoff.
   - Preserves the skill sync policy for any touched `UsePairflow` files.
4. `4-impl-bubble-start-integration`
   - Changes only the implementation-bubble create/start route.
   - Requires successful admin publish before implementation kickoff.
   - Preserves the existing lifecycle authority split.
   - Preserves the skill sync policy for any touched `UsePairflow` files.
5. `5-close-admin-verifier`
   - Does not require pre-kickoff route changes to remain useful.
   - Checks for bubble-contained admin before editing on `main`.
   - Fails closed when refreshed post-close state is ambiguous.

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Pre-kickoff admin is not formally allowed or bounded. | `1-prep-admin-contract` | Documentation-only first slice keeps current skills usable. |
| No first-class manual publish workflow exists. | `2-prep-admin-publish` | Operator can use the new path before orchestration depends on it. |
| Document-bubble start still uses old admin timing. | `3-doc-bubble-start-integration` | First route integration, smallest lifecycle scope. |
| Implementation-bubble start still uses old admin timing. | `4-impl-bubble-start-integration` | Second route integration after document route proof. |
| Close aftermath duplicates admin on `main`. | `5-close-admin-verifier` | Independent close-side optimization. |

## Dependencies and Order

1. `1-prep-admin-contract` must land first because it makes the new pattern
   explicit without behavior risk. If this task edits `UsePairflow`, the
   repo-local skill commit must be followed by the documented skill sync
   workflow and separate global-skill commit before operators rely on the
   installed skill copy.
2. `2-prep-admin-publish` must land before route integration because
   `ExecutePairflowPlan` should not depend on an unimplemented workflow.
   Its UsePairflow source changes must complete the same sync sequence before
   the manual workflow is considered available outside the repo checkout.
3. `3-doc-bubble-start-integration` precedes implementation integration because
   document-bubble start has the narrower postcondition: persist
   `doc_bubble_id` while status remains `approved`.
4. `4-impl-bubble-start-integration` follows because it also owns the
   `status=in_progress` transition.
5. `5-close-admin-verifier` runs last because close aftermath benefits from the
   same admin locality model but has separate trigger and proof rules.

## Risks and Assumptions

1. Assumption: keeping `ideation` as the technical mode name is acceptable
   because the new contract is about the pre-kickoff phase, not user-facing
   naming.
2. Risk: merging an admin commit before kickoff can conflict with another
   bubble's plan/task updates. The required behavior is fail-closed checkpoint,
   not automatic conflict resolution.
3. Risk: if kickoff consumes unmerged bubble-worktree state, the lifecycle
   truth and `main` metadata can diverge. Kickoff must be gated on published and
   re-read admin postconditions whenever the route requires admin publish.
4. Risk: broad admin scope could turn pre-kickoff into hidden implementation.
   Scope must stay limited to plan/task/progress metadata and directly related
   docs/admin notes.
5. Assumption: remote support can remain deferred because current
   `ExecutePairflowPlan` V1 already excludes remote execution support.

## Validation Strategy

1. Task 1: docs/skill review only; no runtime behavior changes.
2. Task 2: targeted lifecycle/workflow validation for manual admin publish,
   including fail-closed dirty-main/conflict/no-kickoff cases.
3. Task 3: targeted `ExecutePairflowPlan` document-bubble route validation.
4. Task 4: targeted `ExecutePairflowPlan` implementation-bubble route
   validation.
5. Task 5: targeted close aftermath tests proving verifier-first behavior and
   deterministic reconciliation fallback.
6. For every task that modifies `UsePairflow`, validation includes checking the
   repo-local diff, running the documented `.claude/skills/INSTALL.md` sync
   workflow to `~/.claude/skills`, and recording the required separate
   global-skill commit evidence.
