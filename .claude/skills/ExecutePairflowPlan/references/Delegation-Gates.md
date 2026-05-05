# Delegation Gates

Use these gates before any `ExecutePairflowPlan` route mutates plan, task, bubble,
progress, or archive state.

Manual backing workflow exception: when a repo-local backing workflow is invoked
directly by an explicit operator step and is not a `ResolvePlanState`
`target_workflow_surface`, answer the Pre-Action Gate with the named workflow
invocation, current task/route context, and that workflow's own authorization
record. Missing `ResolvePlanState` route output alone must not block the manual
workflow; missing workflow invocation, task/route context, or authorization proof
still stops the action.

## Pre-Action Gate

Before mutating any artifact or running any lifecycle command, answer:

1. What route did `ResolvePlanState` return, or what explicit manual backing
   workflow invocation is being executed?
2. Is the route owned by another workflow surface?
3. If yes, what delegated workflow result authorizes the next action?
4. Did that result come from a fresh sub-agent context, or from an explicitly
   separate workflow step when sub-agents are unavailable?
5. Is the route ledger entry updated with that result?

If any answer is missing, stop. Do not inspect locally and continue.

## Mutation Authorization Gate

Allowed mutations require an authorizing delegated result:

1. `status=approved` requires `ReviewSpec task-mode decision=approve_task`
   for the latest task artifact.
2. `plan_status=approved` requires `ReviewSpec plan-mode decision=approve_plan`
   for the latest plan artifact.
3. task creation requires a `CreateTask` result that names the created/refined
   task path and status.
4. task-admin artifact editing for `CreateTask` or `ReviewTask` requires a
   `PublishPreKickoffAdmin` pre-side-effect authorization record before the file
   edit occurs. The record must name the route context, exact carrier
   `BUBBLE_WORKTREE_PATH` from Pairflow status, selected admin paths, clean
   `main` proof, ideation hold proof, selected-route scope proof, named
   postconditions, and changed-path coverage including untracked files. The edit
   must occur in that carrier worktree; if the delegate cannot prove its
   execution root equals `BUBBLE_WORKTREE_PATH`, it may return only proposed
   content or a review decision.
5. document-route `doc_bubble_id` metadata editing in the bubble worktree
   requires a `PublishPreKickoffAdmin` pre-side-effect authorization record
   before the file edit occurs. Final `doc_bubble_id` linkage recognition then
   requires a successful `CreateDocumentBubble` handler result with the
   created/started bubble id, structured `PublishPreKickoffAdmin` success,
   refreshed `main` metadata proof, and same-bubble kickoff proof.
6. implementation-route `impl_bubble_id` linkage and `status=in_progress`
   metadata editing in the bubble worktree requires a
   `PublishPreKickoffAdmin` pre-side-effect authorization record before the file
   edit occurs. Final linkage/status recognition then requires a successful
   `CreateImplementationBubble` handler result with the created, safely reused,
   or pre-kickoff-resumed bubble id as applicable, structured
   `PublishPreKickoffAdmin` success, refreshed `main` metadata proof, and
   same-bubble kickoff proof when kickoff runs. Linked active-hold
   classification after kickoff is a lifecycle boundary, not final
   linkage/status recognition for a new admin mutation.
7. `status=implementable` requires a successful `CloseDocumentBubble` handler
   result.
8. task archive/progress aftermath requires a successful `UpdateProgress` result.
9. bounded pre-kickoff admin editing/staging/commit/publish requires a
   `PublishPreKickoffAdmin` pre-side-effect authorization record, written before
   editing, staging, committing, or publishing in the operator route ledger or
   workflow notes for the current run, that names
   selected explicit admin paths, named postconditions, clean main authority,
   ideation hold proof, selected-route scope proof, and changed-path coverage
   including untracked files. The final `PublishPreKickoffAdmin` workflow result
   is produced after the publish or checkpoint path; it is not required before
   the workflow can perform its own authorized side effects.
10. document-bubble kickoff after pre-kickoff admin publish requires the final
   `PublishPreKickoffAdmin` success result plus refreshed handler-side proof
   that `main` task metadata contains `doc_bubble_id=<task_id>-doc` with
   `status=approved`, and that Pairflow still reports the same bubble in
   round-0 ideation hold.
11. implementation-bubble kickoff after pre-kickoff admin publish requires the
    final `PublishPreKickoffAdmin` success result plus refreshed handler-side
    proof that `main` task metadata contains `impl_bubble_id=<task_id>-impl`
    with `status=in_progress`, and that Pairflow still reports the same bubble
    in round-0 ideation hold.

Task-admin post-edit guard:

1. After any task-admin edit, `REPO_PATH` must still have empty
   `git status --porcelain=v1`.
2. All changed, staged, and untracked files in `BUBBLE_WORKTREE_PATH` must be
   covered by the selected admin paths or by the explicit changed-path coverage
   in the authorization record.
3. If `main` becomes dirty during task admin, stop with
   `MAIN_DIRTY_DURING_TASK_ADMIN`; do not continue to publish or kickoff.

Do not commit route-caused metadata changes unless the staged mutation is covered
by one of these authorizations.

## ReviewSpec Hard Stop

For `ReviewPlan` and `ReviewTask`, local inspection is never sufficient.

1. If sub-agents are available, fresh sub-agent delegation is mandatory.
2. If sub-agents are unavailable, create a distinct compact workflow step that
   rereads the refreshed artifact and returns an explicit ReviewSpec decision.
3. Reading `ReviewSpec.md` and applying its rules in the orchestrator context
   does not satisfy the gate.

## Common Violation

Violation:

```text
Resolve route=task_review.
Read ReviewSpec.md locally.
Inspect the task in the orchestrator context.
Decide approve_task.
Update status=approved.
Continue to CreateDocumentBubble.
```

Correct:

```text
Resolve route=task_review.
Append route ledger entry with delegated_result=null.
Delegate CreatePairflowSpec ReviewSpec task-mode in fresh context.
Record the returned decision in the route ledger.
Only if decision=approve_task, update status=approved and continue.
```

## Drive-Until-Blocked Limit

`drive-until-blocked` applies only after every upstream delegated gate in the
current route chain has a concrete result. Delegation gates outrank continuation
momentum.
