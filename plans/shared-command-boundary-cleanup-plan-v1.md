---
artifact_type: plan
artifact_id: plan_shared_command_boundary_cleanup_v1
plan_id: shared-command-boundary-cleanup-plan-v1
created_on: "2026-05-05"
title: "Shared Command Boundary Cleanup Plan"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-commit-local-helpers
  - 2-merge-local-helpers
  - 3-remote-commit-rename
  - 4-remote-merge-rename
  - 5-inbox-api-rename
  - 6-attach-inventory-extract
  - 7-attach-boundary-closeout
  - 8-list-inventory
  - 9-list-local-move-a
  - 10-list-local-move-b
  - 11-list-boundary-closeout
  - 12-shared-command-fitness
active_task_id: 1-commit-local-helpers
archive_group: 2026-05-05-shared-command-boundary-cleanup-plan-v1
task_tracker:
  - task_id: 1-commit-local-helpers
    task_path: plans/tasks/1-commit-local-helpers.md
    status: approved
  - task_id: 2-merge-local-helpers
    task_path: null
    status: not_created
  - task_id: 3-remote-commit-rename
    task_path: null
    status: not_created
  - task_id: 4-remote-merge-rename
    task_path: null
    status: not_created
  - task_id: 5-inbox-api-rename
    task_path: null
    status: not_created
  - task_id: 6-attach-inventory-extract
    task_path: null
    status: not_created
  - task_id: 7-attach-boundary-closeout
    task_path: null
    status: not_created
  - task_id: 8-list-inventory
    task_path: null
    status: not_created
  - task_id: 9-list-local-move-a
    task_path: null
    status: not_created
  - task_id: 10-list-local-move-b
    task_path: null
    status: not_created
  - task_id: 11-list-boundary-closeout
    task_path: null
    status: not_created
  - task_id: 12-shared-command-fitness
    task_path: null
    status: not_created
---

# Plan: Shared Command Boundary Cleanup

## Objective

Finish the remaining modularity-review follow-up for command-named
`src/v11/shared/<command>/**` directories without creating broad bubbles. The
plan preserves the current behavior while moving command-local helpers back
under their owning `application/<command>/**` lanes and giving true shared
contracts command-neutral names.

This plan covers the current residual command-named shared directories:
`attach`, `commit`, `inbox`, `list`, and `merge`.

## Done Definition

1. No command-named `src/v11/shared/attach`, `commit`, `inbox`, `list`, or
   `merge` directory remains unless a task deliberately defers it with a
   source-anchored reason.
2. Command-local error, input-normalization, finalization, projection, and CLI
   helper logic lives under the owning `src/v11/application/<command>/**` lane.
3. True multi-consumer contracts or read-model helpers remain shared only under
   command-neutral names.
4. The `shared_promotion_single_lane` warning remains active as regression
   evidence for future parking-lot shapes.
5. Every implementation task validates with the narrow relevant checks plus the
   repository's required pre-completion verification for direct source changes.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| N/A: this is a modularity cleanup plan, not a new user/operator capability. | N/A | N/A | N/A | N/A | N/A |

## Guiding Principles

1. Business invariant: shared boundary names must communicate real ownership;
   command-specific knowledge should be local to the command lane unless a
   concrete multi-consumer contract requires sharing.
2. Control model: `src/v11/application/<command>/**` owns command orchestration
   and command-local helpers; `src/v11/shared/**` owns only command-neutral
   contracts, read models, primitives, and policies with multiple consumers.
3. Read-path rule: consumers should import command-local helpers from the owning
   application lane and shared contracts from command-neutral shared modules.
4. Forbidden fallback: do not keep a command-local helper in `shared/**` only
   because it may be reused later, because it avoids import churn, or because
   ownership is unclear.
5. Allowed resolution path: when a file has both command-local and shared
   responsibilities, split the smallest behavior-preserving piece first and
   defer broader decomposition to a successor task.
6. Missing-data rule: if a task cannot prove a file's ownership from current
   consumers and source semantics, it must produce or refine inventory instead
   of moving the file speculatively.
7. Sequencing / boundary note:
   - producer-first rule: inventory or local-helper moves must run before
     stricter command-name fitness hardening.
   - downstream consume families that remain separate: application command
     lanes, SSH/command executor infrastructure, UI router/read-model consumers,
     and architecture fitness checks.
   - cleanup/recovery timing: included incrementally; broad `list` and `attach`
     cleanup is intentionally split after inventory.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/modularity-review/2026-05-02-modularity-review.md`
   - `docs/architecture/v11-placement-and-extraction-governance.md`
   - `tools/fitness/checks/dependency.ts`
   - current directories under `src/v11/shared/{attach,commit,inbox,list,merge}/**`
2. Closed canonical elements / terms:
   - `src/v11/shared/**` is not a parking lot for one-command helpers.
   - A shared module must have command-neutral semantics and a concrete
     multi-consumer reason.
   - Report-only Shared Promotion warnings are triage evidence, not automatic
     proof that a move is correct.
3. Explicitly authorized reinterpretation: none. This plan applies the existing
   Shared Promotion Rule; it does not redefine it.
4. Downstream task impact: every task must preserve behavior and must document
   whether each touched file is command-local, shared contract, or deferred for
   inventory-driven follow-up.

## Current Status

### Completed Work

1. The original modularity review identified thirteen command-local
   `shared/<command>` directories.
2. The current tree has reduced the residual command-named directories to
   `attach`, `commit`, `inbox`, `list`, and `merge`.
3. The dependency fitness check includes a report-only
   `shared_promotion_single_lane` warning.
4. `pnpm fitness:check:ci` currently passes without hard-fail dependency or UI
   router boundary violations.

### Open Work

1. `shared/commit` still mixes remote commit contract shape with command-local
   commit helper/error/finalization logic.
2. `shared/merge` still mixes remote merge contract shape with command-local
   merge helper/error/input/routing logic.
3. Remote commit and merge contracts still live in command-named shared
   directories.
4. `shared/inbox/inboxCommandApi.ts` is consumed by both CLI and UI router code
   but carries command-shaped naming.
5. `shared/attach/resolveAttachBubbleExecution.ts` is a large shared file with
   both application and infrastructure consumers.
6. `shared/list/**` is the largest residual area and needs inventory before
   movement.
7. Fitness/governance can be tightened only after the known residual directories
   have been reduced or deliberately renamed.

### Deferred / Future Work

1. A full `list` read-model redesign is deferred. This plan should still remove
   or explicitly source-anchor any remaining command-named `shared/list`
   directory through closeout, but it must not redesign UI/read-model semantics
   beyond the minimum needed for command-neutral ownership.
2. A full `attach` runtime redesign is deferred. This plan should still remove
   or explicitly source-anchor any remaining command-named `shared/attach`
   directory through closeout, but it must not rewrite the attach runtime model.
3. Hard-failing every command-named shared directory is deferred until the
   residual directories are either gone or explicitly replaced by
   command-neutral names.

## Progress / Phase Summary

1. Phase 1: move small proven-local commit and merge helpers.
2. Phase 2: rename true remote contracts into command-neutral shared locations,
   one command family at a time.
3. Phase 3: clean up smaller naming/boundary seams for inbox and attach, with
   attach closeout separated from attach inventory.
4. Phase 4: inventory and then incrementally reduce `shared/list`, with a
   final list closeout/defer task before governance hardening.
5. Phase 5: add or tighten fitness/governance guardrails after the code shape is
   no longer transitional.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-commit-local-helpers` | `plans/tasks/1-commit-local-helpers.md` | Move only proven command-local commit helper/error/finalization files from `shared/commit` to `application/commit`, leaving remote commit contracts untouched. | N/A | `shared/commit` mixes command-local helpers with remote contract shape. | approved |
| `2-merge-local-helpers` | `null` | Move only proven command-local merge helper/error/input/routing files from `shared/merge` to `application/merge`, leaving `remoteMergeContract` untouched. | N/A | `shared/merge` mixes command-local helpers with remote contract shape. | not_created |
| `3-remote-commit-rename` | `null` | Rename the retained remote commit contract module into a command-neutral shared location and update imports without behavior changes. | `1-commit-local-helpers` | True shared remote commit contract remains under a command-named directory. | not_created |
| `4-remote-merge-rename` | `null` | Rename the retained remote merge contract module into a command-neutral shared location and update imports without behavior changes. | `2-merge-local-helpers` | True shared remote merge contract remains under a command-named directory. | not_created |
| `5-inbox-api-rename` | `null` | Rename or relocate the UI/CLI-consumed inbox API to a command-neutral boundary, without redesigning the read model. | `3-remote-commit-rename`, `4-remote-merge-rename` | `inboxCommandApi` is shared by UI/router code but named as a command-local API. | not_created |
| `6-attach-inventory-extract` | `null` | Produce source-backed ownership inventory for `resolveAttachBubbleExecution.ts` and extract only one smallest behavior-preserving slice if clearly owned. | `5-inbox-api-rename` | `shared/attach` is large and mixed; full decomposition is too broad for one bubble. | not_created |
| `7-attach-boundary-closeout` | `null` | Remove or rename the remaining command-named `shared/attach` boundary, or record an explicit source-anchored deferral if the inventory proves closure is unsafe now. | `6-attach-inventory-extract` | The attach gap needs explicit closeout ownership after inventory. | not_created |
| `8-list-inventory` | `null` | Produce source-backed ownership inventory for every `shared/list` file and classify each as CLI-local, UI/read-model shared, or deferred. | `7-attach-boundary-closeout` | `shared/list` is too large to move safely without inventory. | not_created |
| `9-list-local-move-a` | `null` | Move the first small set of inventory-proven CLI-local `shared/list` files to `application/list`, capped at a few files. | `8-list-inventory` | Begins reducing `shared/list` without broad read-model redesign. | not_created |
| `10-list-local-move-b` | `null` | Move the next small set of inventory-proven CLI-local `shared/list` files, or explicitly mark the remaining local files for closeout if no second move is needed. | `9-list-local-move-a` | Continues reducing `shared/list` in a bounded bubble-friendly slice. | not_created |
| `11-list-boundary-closeout` | `null` | Remove or rename the remaining command-named `shared/list` boundary, or record explicit source-anchored deferrals for any residual shared read-model modules. | `10-list-local-move-b` | The list gap needs explicit closeout ownership after incremental moves. | not_created |
| `12-shared-command-fitness` | `null` | Update governance and, if the remaining tree permits it, add or tighten command-named shared directory fitness warnings. | `11-list-boundary-closeout` | Regression guardrails should reflect the post-cleanup boundary. | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Commit command-local helpers remain in command-named shared boundary. | `1-commit-local-helpers` | Remote commit contracts are explicitly out of scope for task 1. |
| Merge command-local helpers remain in command-named shared boundary. | `2-merge-local-helpers` | Remote merge contracts are explicitly out of scope for task 2. |
| True shared remote commit contract still lives under a command-named folder. | `3-remote-commit-rename` | Runs after commit local-helper moves so the rename task is mostly import fanout. |
| True shared remote merge contract still lives under a command-named folder. | `4-remote-merge-rename` | Runs after merge local-helper moves so the rename task is mostly import fanout. |
| Inbox shared API has command-shaped naming despite UI/router consumption. | `5-inbox-api-rename` | Naming/boundary cleanup only; read-model redesign deferred. |
| Attach shared file is too broad for direct cleanup. | `6-attach-inventory-extract`, `7-attach-boundary-closeout` | Inventory first; closeout must either remove/rename the boundary or record explicit deferral. |
| List shared directory is too broad for direct cleanup. | `8-list-inventory`, `9-list-local-move-a`, `10-list-local-move-b`, `11-list-boundary-closeout` | Inventory owns classification; move tasks stay bounded; closeout owns residual disposition. |
| Future regressions can recreate command-local shared parking lots. | `12-shared-command-fitness` | Guardrails follow code cleanup rather than blocking transitional work. |

## Dependencies and Order

1. `1-commit-local-helpers` and `2-merge-local-helpers` are independent and may
   run in either order or in parallel if their touched files remain disjoint.
2. `3-remote-commit-rename` should run after task 1 so it only renames the
   retained shared commit contract rather than sorting mixed ownership at the
   same time.
3. `4-remote-merge-rename` should run after task 2 so it only renames the
   retained shared merge contract rather than sorting mixed ownership at the
   same time.
4. `5-inbox-api-rename` is intentionally small and should not redesign inbox
   read-model semantics.
5. `6-attach-inventory-extract` must run before `7-attach-boundary-closeout`
   because attach ownership is currently too mixed for a confident full move.
6. `8-list-inventory` must run before `9-list-local-move-a`,
   `10-list-local-move-b`, and `11-list-boundary-closeout`.
7. `9-list-local-move-a` and `10-list-local-move-b` must each cap movement to a
   few files and must not redesign UI/read-model semantics.
8. `12-shared-command-fitness` runs last so it can encode the final boundary
   shape instead of the current transitional one.

## Risks and Assumptions

1. Assumption: current behavior is correct; the plan is about ownership and
   boundary clarity, not feature behavior.
2. Risk: moving remote contract code together with command-local helpers would
   create broad import fanout and longer bubble loops; this is why those
   closures are split.
3. Risk: `list` and `attach` contain mixed ownership that is easy to misread;
   inventory-first tasks are required before broader movement.
4. Risk: command-neutral names chosen too early can hide the same ownership
   ambiguity under a new label; each rename task must document why the new name
   is command-neutral.
5. Assumption: report-only Shared Promotion warnings remain acceptable until the
   residual transitional directories are closed or renamed.

## Validation Strategy

1. For every implementation task, run `pnpm typecheck`.
2. Run `pnpm lint`.
3. Run `pnpm fitness:check:ci`.
4. Run the narrowest relevant tests for the touched command lane or contract
   surface.
5. Run broader affected suites when a task touches UI/router, SSH executor, or
   shared contract fanout.
6. Run `pnpm test` before declaring direct non-docs source changes complete.
7. Run `pnpm build` for source or CLI/runtime-affecting changes.
8. Run `pnpm --dir ui test` and `pnpm --dir ui build` only for tasks that touch
   UI router/read-model imports or browser-consumed contract surfaces.
