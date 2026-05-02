# Delegation Gates

Use these gates before any `ExecutePairflowPlan` route mutates plan, task, bubble,
progress, or archive state.

## Pre-Action Gate

Before mutating any artifact or running any lifecycle command, answer:

1. What route did `ResolvePlanState` return?
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
4. `doc_bubble_id` linkage requires a successful `CreateDocumentBubble`
   handler result with the created/started bubble id.
5. `impl_bubble_id` linkage and `status=in_progress` require a successful
   `CreateImplementationBubble` handler result.
6. `status=implementable` requires a successful `CloseDocumentBubble` handler
   result.
7. task archive/progress aftermath requires a successful `UpdateProgress` result.

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
