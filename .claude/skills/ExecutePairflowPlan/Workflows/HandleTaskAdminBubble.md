---
description: Route task creation and task review admin through a document ideation carrier before document refinement kickoff
argument-hint: <plan-path> <task-id-or-task-path>
allowed-tools: Read, Bash
---

# Handle Task Admin Bubble

## Purpose

Own the task-admin routing layer behind `ExecutePairflowPlan` `CreateTask` and
`ReviewTask`.

This workflow owns only:

1. creating or safely reusing the canonical `<task_id>-doc` ideation carrier
2. running task creation, task refinement, task splitting, and task review admin
   inside that carrier worktree
3. delegating task artifact creation/review decisions to `CreatePairflowSpec`
4. publishing the bounded task-admin commit to clean `main` through
   `PublishPreKickoffAdmin`
5. kicking off the same carrier for document refinement only after refreshed
   approval and publish proof
6. stopping at a truthful checkpoint when task admin is not document-kickoff
   ready

This workflow does not own:

1. product/source implementation
2. raw document-bubble review or close classification after kickoff, which
   belongs to `HandleDocumentBubble`
3. implementation-bubble lifecycle
4. direct task/plan metadata repair on `main`
5. remote execution support

## Route-Surface Role

This repo-local workflow backs these stable route surfaces:

1. `CreateTask`
2. `ReviewTask`

The surface names stay stable for the top-level orchestrator. This workflow is
the required carrier/admin owner; the top-level orchestrator must not satisfy
these routes by editing task or plan artifacts directly on `main`.

## Inputs

Read only the minimum authoritative inputs needed for the route:

1. `REPO_PATH`
2. `PLAN_PATH`
3. `PLAN_METADATA`
4. `TASK_ID`
5. `TASK_PATH`, when an active task artifact already exists
6. `TASK_METADATA`, when `TASK_PATH` exists
7. `ROUTE_CONTEXT`, either `CreateTask` or `ReviewTask`
8. `DERIVED_DOC_BUBBLE_ID`, mechanically `<task_id>-doc`
9. `DERIVED_DOC_BUBBLE_STATUS`, from Pairflow status for that exact id
10. `CREATE_PAIRFLOW_SPEC_RESULT`, from `CreateTask` or `ReviewSpec task-mode`
11. `PUBLISH_PRE_KICKOFF_ADMIN_RESULT`
12. `REFRESHED_MAIN_PLAN_AND_TASK_METADATA`
13. `REFRESHED_IDEATION_HOLD_STATUS`

Input rules:

1. plan metadata decides active task sequencing
2. task metadata decides detailed task-local status when a task artifact exists
3. Pairflow status is lifecycle authority for the ideation carrier
4. route-caused plan/task/progress/docs admin edits must be made in the carrier
   worktree
5. refreshed `main` artifacts are the only authority that admin state was
   published
6. transcript prose, operator memory, unmerged carrier commits, and stale
   pre-publish reads are not publish proof

## Entry Conditions

Run this workflow only for:

1. `CreateTask` when the plan tracker row is `not_created`, has a canonical
   `task_id`, and no task artifact exists yet
2. `ReviewTask` when an active task artifact exists but is not bubble-ready

If the task is already `approved` with no `doc_bubble_id`, route to
`CreateDocumentBubble` instead. If the task has a linked document bubble, raw
lifecycle routing belongs to `HandleDocumentBubble`.

## Decision Order

### 1. Create Or Reuse The Carrier

Use exactly `<task_id>-doc`.

1. Before create, read Pairflow status for `<task_id>-doc`.
2. Reuse only a safe round-0 ideation hold:
   - lifecycle state is `RUNNING`
   - active round is `0`
   - `ideation.task_pending=true`
3. If no such bubble exists, delegate create/start through `UsePairflow`
   `CreateBubble` with `--ideation`, the canonical id, and document review
   artifact type.
4. If create reports the id already exists, re-read status for the same id and
   reuse only the safe round-0 ideation hold.
5. Never create an alternate id for the same task.

### 2. Run Task Admin In The Carrier Worktree

Before editing, apply `references/Delegation-Gates.md` and record a route-ledger
entry tying the mutation to `CreateTask` or `ReviewTask`.

For `CreateTask`:

1. delegate task creation to `CreatePairflowSpec CreateTask`
2. write the created task artifact, plan tracker row, and any directly related
   plan/progress/docs admin in the carrier worktree
3. delegate `CreatePairflowSpec ReviewSpec` in `task-mode` for the latest
   created task unless the delegated creation contract explicitly returns an
   already-approved task

For `ReviewTask`:

1. delegate `CreatePairflowSpec ReviewSpec` in `task-mode`
2. if it returns `refine_task`, apply the refinement in the carrier worktree and
   rerun `ReviewSpec task-mode` from refreshed task content
3. if it returns `split_task`, `route_back_to_plan`, or `block_not_ready`, apply
   only the bounded admin state explicitly authorized by that decision

Approval rules:

1. `status=approved` may be written only after the latest task artifact has
   `ReviewSpec task-mode decision=approve_task`
2. `doc_bubble_id=<task_id>-doc` may be written in the same selected admin
   change set only when document kickoff is intended
3. direct `main` edits are forbidden

### 3. Publish Bounded Admin

Invoke `PublishPreKickoffAdmin` with:

1. `BUBBLE_ID=<task_id>-doc`
2. `CURRENT_TASK_OR_ROUTE_CONTEXT.route_context=CreateTask` or `ReviewTask`
3. `SELECTED_ADMIN_PATHS` including the parent plan and every created/refined,
   split, superseding, or directly affected task artifact
4. named postconditions matching the delegated task decision

If product/source/runtime paths appear in the carrier changed-path set, stop
with `OUT_OF_SCOPE_BUBBLE_CHANGES` through `PublishPreKickoffAdmin`; do not
stage a partial admin commit around them.

### 4. Kickoff Only After Approval Proof

Kickoff is allowed only when all of the following are true:

1. the latest task review result is `approve_task`
2. refreshed `main` plan metadata proves the expected active task and tracker
   row
3. refreshed `main` task metadata proves `status=approved`
4. refreshed `main` task metadata proves `doc_bubble_id=<task_id>-doc`
5. `PublishPreKickoffAdmin` returned `publish_result=success`,
   `kickoff_allowed=true`, exact `admin_commit`, and exact
   `published_main_ref`
6. refreshed Pairflow status proves the same `<task_id>-doc` round-0 ideation
   hold

Then delegate same-bubble kickoff through `UsePairflow` `InterveneBubble`.
The kickoff payload is document-refinement work:

1. allowed edits are the approved task/spec/plan/progress/docs artifacts needed
   to refine the document contract
2. product/runtime/source implementation edits are forbidden
3. if the document agent discovers implementation is needed to answer the task,
   it must return a blocker or normalized replanning request instead of editing
   source

### 5. Stop At The Correct Boundary

Return a handler-local settled boundary after successful same-carrier kickoff:

```yaml
action_surface: <CreateTask|ReviewTask>
continuation_mode: stop_at_settled_checkpoint
source_owner: task_admin_bubble_layer
scope: task
reason_code: <TASK_CREATION_REQUIRED|TASK_REVIEW_REQUIRED>
delegated_workflows:
  - UsePairflow.CreateBubble
  - CreatePairflowSpec.<CreateTask-or-ReviewSpec>
  - PublishPreKickoffAdmin
  - UsePairflow.InterveneBubble
publish_postcondition: admin_publish_succeeded
kickoff_postcondition: same_bubble_kicked_off
handoff_boundary_note: Task admin was created/reviewed in the ideation carrier, published to main, and the same carrier was kicked off for document refinement.
```

Return a human checkpoint instead of kickoff when:

1. the carrier cannot be created or safely reused
2. task review returns `split_task`, `route_back_to_plan`, or
   `block_not_ready` and no approved latest task is ready for document kickoff
3. admin publish fails or is ambiguous
4. refreshed `main` postconditions do not match the named expectations
5. refreshed hold evidence is missing
6. same-bubble kickoff fails

Checkpoint results must name the delegated decision and the missing proof. They
must not ask the orchestrator to repair task/plan metadata directly on `main`.
