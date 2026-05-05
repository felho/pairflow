---
artifact_type: task
artifact_id: task_attach_boundary_closeout_v1
task_family_id: attach-boundary-closeout
sequence_key: "7"
task_id: 7-attach-boundary-closeout
title: "Attach Boundary Closeout"
status: approved
phase: phase3
target_files:
  - src/v11/shared/attach/resolveAttachBubbleExecution.ts
  - src/v11/shared/bubbleAttachment/resolveAttachBubbleExecution.ts
  - src/v11/application/attach/emitAttachV11.ts
  - src/v11/infrastructure/executor/command/pairflowCommandAttach.ts
  - tests/v11/application/attach/attachBubbleV11.test.ts
  - tests/core/bubble/attachBubble.test.ts
  - tests/cli/bubbleAttachCommand.test.ts
prd_ref: null
plan_ref: plans/shared-command-boundary-cleanup-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/shared-command-boundary-cleanup-plan-v1.md
  - plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/6-attach-inventory-extract.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
---

# Task: Attach Boundary Closeout

## L0 - Policy

### Goal

Close the residual command-named `src/v11/shared/attach/**` boundary after task
`6-attach-inventory-extract` proved the resolver is still a shared contract.
Prefer a behavior-preserving rename into a command-neutral shared boundary. If
fresh source review proves the rename is unsafe, record an explicit
source-anchored deferral instead of moving code speculatively.

### Domain / Control Model Summary

1. Business invariant: `src/v11/shared/**` names must communicate true shared
   ownership, not command-lane parking.
2. Control model: the existing resolver is shared by the application attach
   lane and the executor-command attach adapter. This task may rename that
   shared boundary, but it must not move the resolver into either consumer lane
   unless source review proves the other consumer no longer needs it.
3. Read-path rule: current consumers must import the resolver from one
   canonical shared path after the task.
4. Forbidden fallback: do not leave a compatibility barrel or alias under
   `src/v11/shared/attach/**`, do not duplicate resolver logic between
   consumers, and do not preserve the command-named directory merely because it
   avoids import churn.
5. Allowed resolution path: rename the residual shared boundary to a
   command-neutral capability name such as
   `src/v11/shared/bubbleAttachment/**`, update direct imports, and preserve all
   runtime behavior.
6. Missing-data rule: if the implementation cannot prove the command-neutral
   rename is behavior-preserving from current imports and tests, make no source
   move and add a deferral note with exact blocking source anchors.

### Plan Linkage

1. Parent plan gap closed: the residual `shared/attach` boundary remains after
   task 6 and needs explicit closeout.
2. Depends on: `6-attach-inventory-extract`.
3. Unlocks / impacts successor: `8-list-inventory` should proceed only after
   attach is removed, renamed, or explicitly deferred.
4. Refines/replaces: no existing task id.
5. Plan-level validation inherited: no command-named `src/v11/shared/attach`
   directory should remain unless this task records a source-anchored deferral.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/archive/tasks/2026-05-05-shared-command-boundary-cleanup-plan-v1/6-attach-inventory-extract.md`
   - `src/v11/shared/attach/resolveAttachBubbleExecution.ts`
   - `src/v11/application/attach/emitAttachV11.ts`
   - `src/v11/infrastructure/executor/command/pairflowCommandAttach.ts`
   - `docs/architecture/v11-placement-and-extraction-governance.md`
2. Canonical elements:
   - `resolveAttachBubbleExecution`
   - `ResolvedAttachBubbleExecution`
   - `AttachBubbleErrorContextShape`
   - remote pointer validation and diagnostics
   - attach launcher precedence
   - local and remote attach command resolution
3. Guard elements:
   - import paths may change
   - directory name may change
4. Compat elements:
   - exported type and function names may stay stable to avoid a behavior-risk
     rename in this boundary-only task
5. Forbidden reinterpretations:
   - do not change remote attach pointer validity semantics
   - do not change global config supplement fallback behavior
   - do not change tmux session lookup or command construction behavior
   - do not collapse application and infrastructure attach contracts into one
     broad API

### Scope Reality / Shape Proof

1. `rg "shared/attach|resolveAttachBubbleExecution" src/v11 tests` currently
   shows two production imports and no direct test imports.
2. Task 6's inventory classifies every exported and internal resolver area as
   `shared_contract` with `movement_decision: defer` for lane-local extraction.
3. The bounded closeout shape is therefore a path/name cleanup of the shared
   boundary, not an extraction or runtime redesign.
4. Hidden scope ruled out: changing attach CLI options, remote pointer storage,
   launcher availability, UI router behavior, and final governance hardening.

### Boundary Classification

1. Primary shape: `consumer_family_alignment`.
2. Closure buckets touched:
   - `shared_contract`: canonical resolver module path/name
   - `internal_execution_consumers`: application attach and executor-command
     attach imports
3. Deferred closures:
   - list inventory and list boundary cleanup
   - shared command directory fitness hardening
   - broader attach runtime decomposition

### In Scope

1. Re-read the task 6 inventory and current resolver consumers.
2. Rename the residual `src/v11/shared/attach/**` module to a
   command-neutral shared boundary if current source still supports that move.
3. Update direct production imports.
4. Run focused attach reference checks and relevant attach tests.
5. If the move is unsafe, leave source unchanged and add a source-anchored
   deferral note to this task.

### Out of Scope

1. Moving resolver logic into `application/attach` or
   `infrastructure/executor/command` without new single-owner proof.
2. Splitting resolver internals.
3. Changing exported resolver behavior, reason codes, diagnostics, or result
   shape.
4. Adding or tightening fitness rules.
5. Combining attach closeout with list cleanup.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Shared contract stays shared | Task 6 proved both attach consumers still need the resolver. | Rename the shared boundary instead of moving logic into one consumer lane unless fresh source disproves that proof. | P1 | required-now |
| Command-named boundary closeout | `shared/attach` must not remain by default. | Remove the directory through a canonical rename or record exact deferral evidence. | P1 | required-now |
| Behavior preservation | This is a boundary name cleanup, not runtime redesign. | Keep function/type names, reason codes, diagnostics, command construction, and launcher precedence unchanged. | P1 | required-now |
| No compatibility barrel | A retained `shared/attach` alias would fail the parent plan's closeout intent. | Update imports directly to the canonical renamed module. | P1 | required-now |

### 1) Call-Site Matrix

| Call Site | Current Role | Required Change |
|---|---|---|
| `src/v11/application/attach/emitAttachV11.ts` | Application attach lane imports and adapts `resolveAttachBubbleExecution`. | Import from the renamed shared boundary; no result mapping changes. |
| `src/v11/infrastructure/executor/command/pairflowCommandAttach.ts` | Executor-command attach adapter imports and adapts the same resolver. | Import from the renamed shared boundary; no error or command mapping changes. |
| `src/v11/shared/attach/resolveAttachBubbleExecution.ts` | Current command-named shared resolver module. | Move to `src/v11/shared/bubbleAttachment/resolveAttachBubbleExecution.ts` or record why this exact move is unsafe. |

### 2) Data and Interface Contract

1. Public TypeScript exports must remain behavior-compatible:
   - `AttachBubbleErrorContextShape`
   - `ResolvedAttachBubbleExecution`
   - `resolveAttachBubbleExecution`
2. Import path is the only intended contract change.
3. No new fields, statuses, diagnostics, or reason codes are introduced.
4. Unknown or invalid runtime inputs must follow the existing resolver behavior.

### 3) Side Effects Contract

1. Allowed source side effect: file move/rename and import updates.
2. Forbidden runtime side effects: no changed filesystem, tmux, remote pointer,
   or launcher behavior.
3. Do not create retained alias files under `src/v11/shared/attach/**`.

### 4) Error And Fallback Contract

1. Preserve `REMOTE_ATTACH_POINTER_INVALID`.
2. Preserve `REMOTE_ATTACH_CONFIG_SUPPLEMENT_UNAVAILABLE`.
3. Preserve schema validation fallback behavior for global config supplement
   loading.
4. Preserve local tmux-session missing behavior through each caller's existing
   `createAttachError` mapping.
5. If rename validation fails, do not partially keep imports split across old
   and new paths; revert the rename in the bubble and record deferral evidence.

### 5) Dependency Constraints

1. `application/attach` must not depend on `infrastructure/executor/command`.
2. `infrastructure/executor/command` must not depend on `application/attach`.
3. The renamed shared module must keep dependency direction compatible with
   current `v11` placement governance.

### 6) Test Matrix

| ID | Scenario | Command |
|---|---|---|
| T1 | Reference sweep proves no production import from `shared/attach` remains unless deferral is recorded. | `rg "shared/attach|resolveAttachBubbleExecution" src/v11 tests` |
| T2 | Application attach behavior remains covered. | `pnpm test -- tests/v11/application/attach/attachBubbleV11.test.ts` |
| T3 | Core bubble attach behavior remains covered. | `pnpm test -- tests/core/bubble/attachBubble.test.ts` |
| T4 | CLI attach behavior remains covered. | `pnpm test -- tests/cli/bubbleAttachCommand.test.ts` |
| T5 | Repository boundary checks remain clean. | `pnpm typecheck && pnpm lint && pnpm fitness:check:ci` |

Broader completion checks inherited from repo policy for direct source changes:

1. `pnpm test`
2. `pnpm build`

### 7) Shared Contract Compatibility

1. Current consumers: application attach and executor-command attach.
2. Compatibility decision: import-path-only change; behavior and export names
   remain stable.
3. Alignment ownership: this task updates both known production consumers.
4. Out-of-scope consumers: none found by the current reference sweep; if new
   consumers appear, update them only when they consume the same resolver
   contract directly.

### 8) Baseline Preservation

1. Preserve task 6's shared-contract classification.
2. Preserve existing resolver semantics exactly.
3. Replace only the command-named shared directory with a command-neutral
   shared capability boundary.

### 9) Closure-Budget Summary

1. Risk score: 4.
2. Split decision: single bounded task allowed because it changes one module
   path and two import consumers, with no runtime behavior change.
3. Authority/source-of-truth note: task 6 inventory remains the source-backed
   ownership proof; this task does not reopen resolver ownership.
4. Authority fan-out note: two internal execution consumers are aligned in the
   same task because both import the same shared resolver contract.

## L2 - Implementation Notes

1. Start with:

```bash
rg "shared/attach|resolveAttachBubbleExecution" src/v11 tests
```

2. Prefer `git mv` from:

```text
src/v11/shared/attach/resolveAttachBubbleExecution.ts
```

to:

```text
src/v11/shared/bubbleAttachment/resolveAttachBubbleExecution.ts
```

3. Update both direct imports.
4. Verify no `src/v11/shared/attach` directory remains after the rename.
5. If source review blocks the rename, add a `Deferral Evidence` section to
   this task with exact source anchors and leave `shared/attach` unchanged.

## Assumptions

1. `bubbleAttachment` is the intended command-neutral shared capability name for
   the existing shared resolver.
2. No hidden third production consumer exists beyond the current reference
   sweep.

## Open Questions

None.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Consider a later exported type/function name cleanup if `resolveAttachBubbleExecution` remains too command-shaped after the boundary rename. | shared contract | P3 | later-hardening | task 7 drafting | Defer until attach closeout proves the path rename is stable. |
