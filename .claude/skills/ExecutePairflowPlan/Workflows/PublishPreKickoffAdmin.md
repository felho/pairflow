---
description: Manually publish bounded pre-kickoff admin changes from an ideation bubble worktree to clean main before any kickoff
argument-hint: <repo-path> <bubble-id> <current-task-or-route-context> <selected-admin-paths> <named-postconditions> <authorization-record-ref>
allowed-tools: Read, Bash
---

# Publish Pre-Kickoff Admin

## Purpose

Own the manual `ExecutePairflowPlan` operator workflow for publishing bounded
pre-kickoff admin changes from an ideation bubble worktree back to `main`.

This workflow owns only:

1. proving the linked bubble is still an ideation round-0 hold
2. proving clean `main` before any admin staging, commit, or publish action
3. validating an explicit selected admin scope
4. committing only selected admin paths in the bubble worktree
5. publishing that admin commit to clean `main`
6. re-reading refreshed `main` metadata or selected artifact content and
   checking named postconditions
7. returning a structured publish result that never runs kickoff

This workflow does not own:

1. ideation create/start/kickoff semantics, which remain owned by `UsePairflow`
2. deciding which route adopts the pre-kickoff admin pattern; route adoption is
   owned by the consuming handler, while this workflow owns the bounded publish
   contract for adopted consumers including `CreateTask`, `ReviewTask`,
   `CreateDocumentBubble`, and `CreateImplementationBubble`
3. automatic merge-conflict recovery
4. remote publish support
5. new Pairflow CLI commands or runtime behavior
6. product/source implementation during pre-kickoff admin
7. deciding that a publish success is enough to kickoff; the consuming route
   must still re-check its own postconditions and then delegate kickoff

## Inputs

Read only the minimum authoritative inputs needed for the publish decision:

1. `REPO_PATH`
   - clean main checkout path used for Git status, publish, and refreshed
     postcondition reads
2. `BUBBLE_ID`
   - explicit Pairflow bubble id
3. `SELECTED_ADMIN_PATHS`
   - explicit normalized paths to commit and publish
4. `CURRENT_TASK_OR_ROUTE_CONTEXT`
   - the task artifact id/path or successor route context that explains why this
     manual backing workflow is being run and why each selected admin path is in
     scope
5. `NAMED_POSTCONDITIONS`
   - expected refreshed `main` plan/task/progress metadata values, or expected
     refreshed content proof for selected docs/admin/skill-workflow artifacts
     after publish
6. `AUTHORIZATION_RECORD_REF`
   - operator route-ledger or workflow-note location where the
     `PublishPreKickoffAdmin` pre-side-effect authorization record is stored
7. `PAIRFLOW_STATUS`
   - `pairflow bubble status --id <bubble-id> --repo <repo-path> --json`
8. `REFRESHED_PAIRFLOW_STATUS`
   - the same status command re-run after publish and before returning success
9. `BUBBLE_WORKTREE_PATH`
   - worktree path from Pairflow status; do not infer it from branch names
10. `MAIN_GIT_STATUS`
   - clean status and operation-state proof from `REPO_PATH`
11. `REFRESHED_MAIN_GIT_STATUS`
   - clean status, current `main` ref, and operation-state proof re-read from
     `REPO_PATH` immediately before staging and again before publish
12. `BUBBLE_GIT_STATUS_AND_DIFF`
   - operation-state proof, changed paths, staged paths, untracked paths, and
     selected-path diff from `BUBBLE_WORKTREE_PATH`
13. `REFRESHED_MAIN_ARTIFACTS`
   - plan/task/progress metadata and selected docs/admin/skill-workflow files
     re-read from `REPO_PATH` after publish
14. `MAIN_BASE_REF`
   - clean `main` ref captured before selected admin scope is treated as
     publishable
15. `ADMIN_COMMIT_CANDIDATE`
   - optional previously created admin commit id from an earlier workflow result
     or from the bubble branch when rerunning after a partial publish

Input rules:

1. `BUBBLE_ID`, `BUBBLE_WORKTREE_PATH`, `CURRENT_TASK_OR_ROUTE_CONTEXT`,
   `SELECTED_ADMIN_PATHS`, and `AUTHORIZATION_RECORD_REF` are required before any
   side effect.
2. Pairflow status is the only lifecycle authority for ideation round-0 hold
   state.
3. Git state is the only authority for commit and publish proof.
4. Refreshed `main` metadata or selected refreshed `main` artifact content is
   the only authority for `NAMED_POSTCONDITIONS` proof.
5. Refreshed Pairflow lifecycle status is separate hold evidence, not a named
   admin postcondition. Hold failures must use `PRE_KICKOFF_HOLD_NOT_PROVEN`,
   not `ADMIN_POSTCONDITION_MISSING`.
6. `ADMIN_COMMIT_CANDIDATE` is usable only when Git proves it is a single
   selected-scope admin commit. New publication additionally requires that
   commit to be based directly on `MAIN_BASE_REF`; already-published recovery
   requires refreshed `main` ref to equal the candidate.
7. Transcript prose, operator memory, branch-name guesses, unmerged bubble
   commits, raw changed-file globs outside the selected scope, and stale
   pre-publish metadata are never publish proof.

## Task-Admin Route Consumption Contract

`CreateTask` and `ReviewTask` are adopted route consumers for this workflow.
For those routes, the selected admin publish must prove the task creation or
task review admin state reached `main` before the same document carrier is
kicked off for document refinement.

Required task-admin selected admin inputs:

1. `BUBBLE_ID` must equal the canonical derived document bubble id
   `<task_id>-doc`.
2. `CURRENT_TASK_OR_ROUTE_CONTEXT.route_context` must name `CreateTask` or
   `ReviewTask`.
3. `SELECTED_ADMIN_PATHS` must include the parent plan artifact and every
   created, refined, split, superseding, or directly affected task artifact.
4. Additional selected paths are allowed only when they are directly required
   by the same task-admin route and pass the allowed admin scope.
5. Product/source implementation paths remain forbidden, even if the task body
   names target source files or implementation tests.

Required task-admin named postconditions after publish when the latest task is
approved and document kickoff is intended:

1. refreshed `main` plan metadata has the expected `active_task_id`
2. refreshed `main` tracker row for `<task_id>` has the expected `task_path`
   and `status=approved`
3. refreshed `main` latest task metadata has `task_id=<task_id>`
4. refreshed `main` latest task metadata has `status=approved`
5. refreshed `main` latest task metadata has `doc_bubble_id=<task_id>-doc`
6. `published_main_ref` equals the exact selected-scope `admin_commit`

Required task-admin named postconditions after publish when the delegated task
review returns `split_task`, `route_back_to_plan`, or `block_not_ready`:

1. refreshed `main` plan/task metadata matches the explicit delegated decision
   and selected admin paths
2. any created or superseding task artifacts named by the delegated decision are
   present on refreshed `main`
3. no document kickoff is authorized unless a latest task artifact is approved
   and all approval postconditions above are proven
4. `published_main_ref` equals the exact selected-scope `admin_commit` when a
   publish occurred

Required task-admin refreshed hold evidence after publish when kickoff is
intended:

1. refreshed Pairflow status for `<task_id>-doc` still proves `RUNNING` round
   `0` with `ideation.task_pending=true`

Consumer rules:

1. This workflow returns `kickoff_allowed=true` only as publish proof; it never
   performs the kickoff.
2. `HandleTaskAdminBubble` must reject a success packet whose `bubble_id` does
   not equal `<task_id>-doc`.
3. `HandleTaskAdminBubble` must re-read refreshed `main` plan/task metadata and
   Pairflow hold status after consuming this result; the success packet is not a
   substitute for that local route check.
4. If the delegated task review did not approve the latest task artifact,
   `HandleTaskAdminBubble` must not convert publish success into document
   kickoff.

## Document-Route Consumption Contract

`CreateDocumentBubble` is an adopted route consumer for this
workflow. For that route only, the selected admin publish must prove the
document-bubble linkage/admin state reached `main` before the document task
payload is kicked off.

Required `CreateDocumentBubble` selected admin inputs:

1. `BUBBLE_ID` must equal the canonical derived document bubble id
   `<task_id>-doc`.
2. `CURRENT_TASK_OR_ROUTE_CONTEXT.route_context` must name
   `CreateDocumentBubble`.
3. `SELECTED_ADMIN_PATHS` must include the active task artifact when
   `doc_bubble_id` is being persisted.
4. Additional selected paths are allowed only when they are directly required
   by the same document-route admin task and pass the allowed admin scope.

Required `CreateDocumentBubble` named postconditions after publish:

1. refreshed `main` task metadata has `doc_bubble_id=<task_id>-doc`
2. refreshed `main` task metadata still has `status=approved`
3. `published_main_ref` equals the exact selected-scope `admin_commit`

Required `CreateDocumentBubble` refreshed hold evidence after publish:

1. refreshed Pairflow status for `<task_id>-doc` still proves `RUNNING` round
   `0` with `ideation.task_pending=true`

Consumer rules:

1. This workflow returns `kickoff_allowed=true` only as publish proof; it never
   performs the kickoff.
2. `HandleDocumentBubble` must reject a success packet whose `bubble_id` does
   not equal `<task_id>-doc`.
3. `HandleDocumentBubble` must re-read refreshed `main` task metadata and
   Pairflow hold status after consuming this result; the success packet is not a
   substitute for that local route check.

## Implementation-Route Consumption Contract

`CreateImplementationBubble` is also an adopted route consumer for this
workflow. For that route only, the selected admin publish must prove the
implementation-bubble linkage/admin state reached `main` before the
implementation task payload is kicked off.

Required `CreateImplementationBubble` selected admin inputs:

1. `BUBBLE_ID` must equal the canonical derived implementation bubble id
   `<task_id>-impl`.
2. `CURRENT_TASK_OR_ROUTE_CONTEXT.route_context` must name
   `CreateImplementationBubble`.
3. `SELECTED_ADMIN_PATHS` must include the active task artifact when
   `impl_bubble_id` or `status=in_progress` is being persisted.
4. Additional selected paths are allowed only when they are directly required
   by the same implementation-route admin task and pass the allowed admin
   scope.

Required `CreateImplementationBubble` named postconditions after publish:

1. refreshed `main` task metadata has `impl_bubble_id=<task_id>-impl`
2. refreshed `main` task metadata has `status=in_progress`
3. `published_main_ref` equals the exact selected-scope `admin_commit`

Required `CreateImplementationBubble` refreshed hold evidence after publish:

1. refreshed Pairflow status for `<task_id>-impl` still proves `RUNNING` round
   `0` with `ideation.task_pending=true`

Consumer rules:

1. This workflow returns `kickoff_allowed=true` only as publish proof; it never
   performs the kickoff.
2. `HandleImplementationBubble` must reject a success packet whose `bubble_id`
   does not equal `<task_id>-impl`.
3. `HandleImplementationBubble` must re-read refreshed `main` task metadata and
   Pairflow hold status after consuming this result; the success packet is not a
   substitute for that local route check.
4. Implementation close/review behavior is not changed by this adoption.

## Allowed Admin Scope

Selected admin paths are valid only when every path is explicit, normalized,
repo-relative, and within this allowlist:

1. `plans/**` files directly needed for the selected route
2. `progress/**` files directly needed for the selected route
3. `docs/**` notes directly related to the selected admin route
4. `.claude/skills/ExecutePairflowPlan/**` only when the selected admin task is
   itself a skill/workflow documentation task that changes the
   `ExecutePairflowPlan` orchestration contract

Forbidden selected paths include:

1. `src/**`
2. `scripts/**`
3. `ui/**`
4. `tests/**`
5. runtime or package configuration such as `package.json`, `pnpm-lock.yaml`,
   `tsconfig*.json`, `eslint.config.*`, or build configuration
6. `.pairflow/**`
7. `.claude/skills/UsePairflow/**`
8. any path outside the allowlist above

If a path is ambiguous, treat it as forbidden and return a checkpoint.

## Delegation Gate

Before editing selected bubble-worktree admin artifacts, staging, committing,
publishing, or mutating any main-side admin state, apply
`references/Delegation-Gates.md` by recording a
`PublishPreKickoffAdmin` pre-side-effect authorization record. Because this is a
manual backing workflow rather than a `ResolvePlanState` route surface, the gate
must be answered with the explicit `PublishPreKickoffAdmin` invocation, current
task/route context, and the authorization record below; absence of a returned
`target_workflow_surface` is not by itself a blocker for this manual workflow.

Record the authorization in the operator route ledger or workflow notes for the
current run before any side effect. The authorizing gate result for this workflow
must use this minimum structured shape:

```yaml
workflow: PublishPreKickoffAdmin
record_type: pre_side_effect_authorization
bubble_id: <bubble-id>
worktree_path: <pairflow-status-worktree-path>
selected_admin_paths:
  - <selected-admin-path>
current_task_or_route_context:
  task_artifact: <task-path-or-id>
  route_context: <manual-or-successor-route-context>
changed_path_coverage:
  tracked_or_modified_paths: <all-tracked-changed-paths>
  staged_paths: <all-staged-paths>
  untracked_paths: <all-untracked-paths>
  rejected_paths: []
selected_route_scope_proof:
  task_artifact: <task-path-or-id>
  route_context: <manual-or-successor-route-context>
  path_justification:
    - path: <selected-admin-path>
      reason: <why-this-path-is-required-for-this-task-or-route>
named_postconditions:
  - <postcondition-name-and-refreshed-main-authority>
clean_main_authority:
  repo_path: <repo-path>
  main_base_ref: <main-base-ref>
  status: clean
ideation_hold_proof: <pairflow-round-0-task-pending-proof>
authorized_side_effects:
  - edit_selected_admin_paths
  - stage_selected_admin_paths
  - create_or_reuse_admin_commit
  - publish_admin_commit_to_main
```

If the gate cannot prove those fields, return `ADMIN_AUTHORIZATION_MISSING`
before any selected admin edit, staging, commit, publish, or kickoff. This
pre-side-effect authorization record is not the final workflow result and must
not require the final publish/checkpoint result to already exist. Because this
checkpoint occurs before an authorization record exists, consumers must not
expect a retained recovery context with `authorization_record_ref`,
`admin_commit`, or selected-path publish evidence for this checkpoint.

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: ADMIN_AUTHORIZATION_MISSING
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths: <selected-paths-when-known>
postcondition_evidence:
  authorization_failure: <missing-or-invalid-authorization-fields>
kickoff_allowed: false
```

## Preconditions

All preconditions must pass before committing or publishing:

1. `PAIRFLOW_STATUS` proves the bubble is the requested `BUBBLE_ID`.
2. The bubble is an ideation pending hold:
   - lifecycle state is `RUNNING`
   - active round is `0`
   - ideation metadata proves `task_pending=true`
3. `BUBBLE_WORKTREE_PATH` exists and matches the Pairflow status payload.
4. `REPO_PATH` is on `main`.
5. `REPO_PATH` has a clean worktree.
6. `REPO_PATH` has no merge, rebase, cherry-pick, or revert operation in
   progress.
7. `MAIN_BASE_REF` is captured from clean `main`.
8. `SELECTED_ADMIN_PATHS` is non-empty and passes the allowed admin scope.
9. `BUBBLE_WORKTREE_PATH` has no merge, rebase, cherry-pick, or revert operation
   in progress.
10. The bubble worktree changed-path set, including tracked changes, staged
   changes, and untracked files, contains no path outside `SELECTED_ADMIN_PATHS`.
11. `NAMED_POSTCONDITIONS` is explicit enough to verify after publish against
    refreshed `main` metadata or refreshed selected artifact content.
12. For the new-commit path, `BUBBLE_WORKTREE_PATH` `HEAD` equals
    `MAIN_BASE_REF` before staging. A pre-existing `ADMIN_COMMIT_CANDIDATE` is
    handled only by the candidate reuse rules below.

Side effects forbidden before all preconditions pass:

1. staging bubble-worktree changes
2. committing bubble-worktree changes
3. merging, cherry-picking, or otherwise publishing to `main`
4. mutating plan/task/progress metadata on `main`
5. running `pairflow bubble kickoff`

## Decision Order

Apply the first matching rule in this order.

### 1. Prove ideation round-0 hold

If Pairflow status cannot prove the requested bubble is in ideation round-0
hold, stop before reading the bubble worktree as publishable.

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: PRE_KICKOFF_HOLD_NOT_PROVEN
bubble_id: <bubble-id-when-known>
worktree_path: <worktree-path-when-known>
selected_admin_paths: <selected-paths-when-known>
postcondition_evidence:
  hold_state: <observed-status-summary>
kickoff_allowed: false
```

### 2. Prove clean main

If `main` is dirty or any Git operation is in progress, stop before committing
or publishing admin changes.

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: MAIN_NOT_CLEAN
bubble_id: <bubble-id>
worktree_path: <worktree-path-when-known>
selected_admin_paths: <selected-paths-when-known>
rejected_paths: <dirty-main-path-summary>
postcondition_evidence:
  main_status: <clean-check-summary>
kickoff_allowed: false
```

### 3. Validate selected admin scope

If selected scope is missing, empty, outside the allowlist, or includes a
forbidden path, stop before reading the bubble diff as publishable.

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: ADMIN_SCOPE_INVALID
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths: <selected-paths-when-known>
rejected_paths: <invalid-selected-paths>
kickoff_allowed: false
```

### 4. Compare bubble diff to selected scope

Read the complete bubble worktree changed-path set from tracked changes, staged
changes, and untracked files. If any path from that combined set is outside
`SELECTED_ADMIN_PATHS`, stop before selected admin editing, staging, commit, or
publish.

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: OUT_OF_SCOPE_BUBBLE_CHANGES
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths: <selected-paths>
rejected_paths: <out-of-scope-bubble-paths>
kickoff_allowed: false
```

### 5. Commit selected admin paths in the bubble worktree

Before any commit or publish side effect, verify `NAMED_POSTCONDITIONS` is
present, unambiguous, and tied to the selected admin paths. If this proof is
missing, return `ADMIN_POSTCONDITION_MISSING` before staging, committing,
publishing, or kickoff.

Pre-side-effect result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: ADMIN_POSTCONDITION_MISSING
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths: <selected-paths>
postcondition_evidence:
  missing_or_ambiguous_postconditions: <postcondition-input-summary>
kickoff_allowed: false
```

Before creating a new commit, check whether an `ADMIN_COMMIT_CANDIDATE` already
exists from an earlier workflow attempt. If Git proves that candidate has
exactly one parent, has no unselected path changes, and covers the current
selected admin state in `BUBBLE_WORKTREE_PATH`, reuse it instead of creating a
second admin commit:

1. when refreshed `main` ref already equals the candidate, skip publish and
   continue at refreshed artifact verification only when refreshed `main` ref
   is exactly the candidate
2. when the candidate parent is the current `MAIN_BASE_REF` and refreshed `main`
   ref is not the candidate, use the candidate as `admin_commit` and continue at
   the publish gate

This is the idempotent recovery path for partial previous runs where commit
creation already happened. The already-published recovery branch does not
require the candidate parent to equal the current `MAIN_BASE_REF`, because
current `main` may already be exactly the admin commit.

If the candidate is not already published and its parent is not the current
`MAIN_BASE_REF`, do not reuse it for publication. Return
`MAIN_BASE_REF_CHANGED` with the candidate retained only as diagnostic recovery
data; a later run must re-evaluate the selected admin state against the new
base before creating a replacement admin commit.

Candidate coverage proof:

1. the bubble worktree has no remaining unstaged, staged, or untracked changes
   under `SELECTED_ADMIN_PATHS` that are absent from the candidate commit
2. if selected-path changes remain after comparing the candidate to the current
   bubble worktree, do not reuse the candidate; either create a new selected
   admin commit from the current state when all other guards pass, or return the
   narrow checkpoint for the failed guard

Immediately before staging, re-read the complete bubble worktree changed-path
set after all authorized selected-admin edits have been applied, including
tracked changes, staged changes, and untracked files. If any path from that
refreshed combined set is outside `SELECTED_ADMIN_PATHS`, return
`OUT_OF_SCOPE_BUBBLE_CHANGES` before staging, committing, publishing, or
kickoff. This refreshed coverage proof replaces any earlier pre-edit changed
path read for staging authority.

Immediately before staging, re-read Pairflow status for `BUBBLE_ID` and prove
the bubble is still an ideation pending hold. If the refreshed status cannot
prove that hold, return `PRE_KICKOFF_HOLD_NOT_PROVEN` before staging,
committing, publishing, or kickoff. Then re-check that `BUBBLE_WORKTREE_PATH`
has no merge, rebase, cherry-pick, or revert operation in progress.

Also immediately before staging, re-read `REFRESHED_MAIN_GIT_STATUS`. If
`REPO_PATH` is no longer on `main`, or if `main` is dirty or any Git operation is
now in progress, return `MAIN_NOT_CLEAN` before staging, committing, publishing,
or kickoff. If the refreshed `main` ref no longer equals `MAIN_BASE_REF`, return
`MAIN_BASE_REF_CHANGED` before staging or creating a stale-base admin commit.

For the new-commit path, prove `BUBBLE_WORKTREE_PATH` `HEAD` equals
`MAIN_BASE_REF` before staging. If the bubble worktree is already based on a
different commit, return `ADMIN_COMMIT_FAILED` before staging or creating a
non-publishable commit. This pre-side-effect ancestry guard prevents creating a
commit that can only fail the publish ancestry rule later.

Stage only `SELECTED_ADMIN_PATHS` in `BUBBLE_WORKTREE_PATH`. Verify the staged
file list exactly matches those selected paths, then create one admin commit.

After commit creation, prove the admin commit is a single selected-scope commit
based directly on `MAIN_BASE_REF`:

1. the commit has exactly one parent
2. that parent is `MAIN_BASE_REF`
3. the commit diff contains only `SELECTED_ADMIN_PATHS`

This new-publish ancestry rule prevents publishing earlier bubble-branch
ancestors to `main`. It applies to newly created commits before publish; the
idempotent recovery path above instead proves the already-published candidate is
the refreshed `main` ref and then rechecks postconditions.

If the bubble worktree operation-state check, staging, commit, or ancestry proof
fails, stop without publishing and without kickoff.

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: ADMIN_COMMIT_FAILED
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths: <selected-paths>
postcondition_evidence:
  commit_failure: <command-failure-summary>
kickoff_allowed: false
```

### 6. Publish the admin commit to clean main

Immediately before publishing, re-read Pairflow status for `BUBBLE_ID` and
prove the bubble is still an ideation pending hold. If the refreshed status
cannot prove that hold, return `PRE_KICKOFF_HOLD_NOT_PROVEN` before publishing
or kickoff.

Then re-read `REFRESHED_MAIN_GIT_STATUS`. If `REPO_PATH` is no longer on
`main`, or if `main` is dirty or any Git operation is now in progress, return
`MAIN_NOT_CLEAN` without publishing or kickoff.

If the refreshed `main` ref no longer equals `MAIN_BASE_REF`, stop before
publish with `MAIN_BASE_REF_CHANGED`. A clean but different main ref means the
scoped base changed and the selected admin publish must be re-evaluated instead
of continuing from stale scope proof. This checkpoint occurs before publish and
kickoff; it may occur after a bubble-worktree commit has been created or reused,
so its result must retain `admin_commit` when one exists. Retained unpublished
commits are diagnostic only after base drift unless their parent still equals
the refreshed current `MAIN_BASE_REF`; already-published exact-ref recovery may
still reuse a retained commit when refreshed `main` equals that commit.

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: MAIN_BASE_REF_CHANGED
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths: <selected-paths>
admin_commit: <admin-commit-id-when-created-or-reused>
postcondition_evidence:
  expected_main_base_ref: <main-base-ref>
  actual_main_ref: <refreshed-main-ref>
kickoff_allowed: false
```

Publish the admin commit to `main` using a fast-forward-only operation that
preserves the bubble-branch `admin_commit` identity. The operation is bounded by
the single-commit ancestry rule above; patch-style publication, replay-style
publication, or merge commits are not valid success proof for this workflow.
Keep the publish window short and verify that refreshed `main` is exactly the
`admin_commit`. A later `main` ref that merely contains the admin commit is not
success proof.

If publish conflicts, fails, or leaves an ambiguous state, stop at an operator
checkpoint. Do not attempt automatic conflict recovery in this workflow.

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: ADMIN_PUBLISH_FAILED
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths: <selected-paths>
admin_commit: <admin-commit-id-when-created-or-reused>
postcondition_evidence:
  publish_failure: <conflict-or-command-failure-summary>
kickoff_allowed: false
```

### 7. Re-read refreshed main artifacts

After a publish attempt reports success, or after idempotent recovery proves the
same `admin_commit` is exactly the refreshed `main` ref, re-read
`REFRESHED_MAIN_ARTIFACTS` from `REPO_PATH`. Compare the refreshed values or
content proofs to `NAMED_POSTCONDITIONS`.

If any named postcondition is absent, stale, or mismatched, return a checkpoint
even when the admin commit reached `main`.

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: ADMIN_POSTCONDITION_MISSING
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths: <selected-paths>
admin_commit: <admin-commit-id>
postcondition_evidence:
  refreshed_mismatch: <named-postcondition-mismatch-summary>
kickoff_allowed: false
```

### 8. Return success and stop before kickoff

Before returning success, re-run Pairflow status for `BUBBLE_ID`. Only when the
refreshed status still proves ideation round-0 hold and every prior gate passes,
return success with complete publish proof. This workflow stops after publish
verification; a successor route or explicit operator action owns any later
kickoff.

If the post-publish status read cannot still prove ideation round-0 hold, return
`PRE_KICKOFF_HOLD_NOT_PROVEN` with `kickoff_allowed=false` instead of success.
When the admin commit has already reached `main`, retain `admin_commit`,
`published_main_ref`, and the failed hold evidence in the checkpoint so a rerun
can recover without recreating or republishing the admin commit.

Checkpoint result after publish:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: human_checkpoint
reason_code: PRE_KICKOFF_HOLD_NOT_PROVEN
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths:
  - <selected-admin-path>
admin_commit: <admin-commit-id>
published_main_ref: <refreshed-main-ref-equal-to-admin-commit>
refreshed_hold_evidence:
  hold_state: <observed-post-publish-status-summary>
kickoff_allowed: false
```

Result:

```yaml
workflow: PublishPreKickoffAdmin
publish_result: success
reason_code: ADMIN_PUBLISH_SUCCEEDED
bubble_id: <bubble-id>
worktree_path: <worktree-path>
selected_admin_paths:
  - <selected-admin-path>
authorization_evidence:
  record_ref: <authorization-record-ref>
  current_task_or_route_context:
    task_artifact: <task-path-or-id>
    route_context: <manual-or-successor-route-context>
  changed_path_coverage:
    tracked_or_modified_paths: <all-tracked-changed-paths>
    staged_paths: <all-staged-paths>
    untracked_paths: <all-untracked-paths>
    rejected_paths: []
  selected_route_scope_proof:
    - path: <selected-admin-path>
      reason: <why-this-path-is-required-for-this-task-or-route>
admin_commit: <admin-commit-id>
published_main_ref: <refreshed-main-ref>
postcondition_evidence:
  - name: <postcondition-name>
    expected: <expected-value>
    actual: <refreshed-main-value-or-content-proof>
    status: satisfied
refreshed_hold_evidence:
  hold_state: <post-publish-ideation-round-0-hold-summary>
kickoff_allowed: true
```

Success rules:

1. `kickoff_allowed=true` means only that later kickoff is allowed by this
   publish proof and a post-publish Pairflow hold re-read; this workflow still
   does not run kickoff.
2. `published_main_ref` must be read after publish from `REPO_PATH`.
3. `postcondition_evidence` must name the refreshed metadata values or selected
   artifact content proofs that prove the selected admin state is now present on
   `main`.
4. `authorization_evidence` must carry the authorization record reference,
   current task/route context, changed-path coverage including rejected paths,
   and selected-route scope proof consumed before any later kickoff.

## Reason-Code Anchor Set

This workflow may emit only these reason codes:

1. `PRE_KICKOFF_HOLD_NOT_PROVEN`
2. `MAIN_NOT_CLEAN`
3. `MAIN_BASE_REF_CHANGED`
4. `ADMIN_AUTHORIZATION_MISSING`
5. `ADMIN_SCOPE_INVALID`
6. `OUT_OF_SCOPE_BUBBLE_CHANGES`
7. `ADMIN_COMMIT_FAILED`
8. `ADMIN_PUBLISH_FAILED`
9. `ADMIN_POSTCONDITION_MISSING`
10. `ADMIN_PUBLISH_SUCCEEDED`

## Validation Checklist

Manual review or successor tests must prove:

1. non-hold bubbles return `PRE_KICKOFF_HOLD_NOT_PROVEN`
2. dirty `main` returns `MAIN_NOT_CLEAN` before bubble staging, commit, or
   publish
3. missing or forbidden selected scope returns `ADMIN_SCOPE_INVALID`
4. bubble diffs outside selected scope return `OUT_OF_SCOPE_BUBBLE_CHANGES`
5. missing or invalid pre-side-effect authorization returns
   `ADMIN_AUTHORIZATION_MISSING` without staging, commit, publish, or kickoff
6. commit failure returns `ADMIN_COMMIT_FAILED` without later publish or kickoff;
   pre-staging ancestry failures return before staging
7. publish conflict or failure returns `ADMIN_PUBLISH_FAILED` without kickoff
8. missing refreshed postconditions return `ADMIN_POSTCONDITION_MISSING`
9. success includes selected paths, admin commit id, refreshed main ref,
   authorization evidence, postcondition evidence, and `kickoff_allowed=true`
10. bubble worktree operation state is checked before staging and committing
11. `main` cleanliness and `MAIN_BASE_REF` equality are re-read immediately
    before staging
12. Pairflow ideation hold status is re-read after publish before
    `kickoff_allowed=true`
13. success proves refreshed `main` ref equals the exact `admin_commit`
14. admin publish is fast-forward-only from `MAIN_BASE_REF` and cannot carry
    earlier bubble-branch ancestors
15. a clean but changed `main` ref before staging or publish returns
    `MAIN_BASE_REF_CHANGED` before stale-base staging, publish, or kickoff, and
    retains `admin_commit` when commit creation or reuse already happened
16. reruns can recover an already-published `admin_commit` without creating a
    second admin commit
17. `CreateDocumentBubble` success names `doc_bubble_id=<task_id>-doc`,
    `status=approved`, matching `bubble_id`, and refreshed round-0 hold proof
18. `PublishPreKickoffAdmin` success consumed by `CreateImplementationBubble`
    names `impl_bubble_id=<task_id>-impl`, `status=in_progress`, matching
    `bubble_id`, and refreshed round-0 hold proof before any later kickoff; it
    is publish proof, not final implementation create/kickoff success
19. `.pairflow/**` is rejected unless a successor task explicitly expands the
    parent route contract
20. Pairflow ideation hold status is re-read before staging/commit and again
    before publish
21. the immediate pre-publish Git refresh proves `REPO_PATH` is still on `main`
22. reruns can reuse an unpublished `ADMIN_COMMIT_CANDIDATE` instead of creating
    a second admin commit only while its parent equals the current
    `MAIN_BASE_REF`; after base drift, the retained unpublished candidate is
    diagnostic rather than publishable
23. post-publish hold failure retains `admin_commit`, `published_main_ref`, and
    failed hold evidence for idempotent recovery
24. success returns refreshed hold evidence as part of the structured publish
    proof consumed before later kickoff
25. candidate reuse proves the candidate covers the current selected admin state
    and does not ignore newer selected-path worktree edits
26. missing or ambiguous `NAMED_POSTCONDITIONS` returns
    `ADMIN_POSTCONDITION_MISSING` before staging, commit, publish, or kickoff
27. `PublishPreKickoffAdmin` selected admin editing/staging/commit/publish
    mutation is covered by a pre-side-effect authorization record under
    `references/Delegation-Gates.md`, with an auditable structured shape and
    without requiring the final workflow result before its own side effects
28. allowed `plans/**` and `progress/**` paths are limited to files directly
    needed for the selected route
29. `ADMIN_PUBLISH_FAILED` retains `admin_commit` for both created and reused
    admin commits
30. success requires refreshed `main` ref to equal the exact `admin_commit`,
    not merely contain it
31. bubble scope proof is refreshed after authorized selected-admin edits and
    includes tracked changes, staged paths, and untracked files immediately
    before allowing staging, commit, or publish
32. the new-commit path proves bubble worktree `HEAD` equals `MAIN_BASE_REF`
    before staging, so an ancestry failure cannot be discovered only after
    creating a non-publishable commit

Validation for this documentation workflow should also verify:

1. `CreateDocumentBubble` and `CreateImplementationBubble` both consume this
   workflow's publish success proof before kickoff, with route-specific
   postconditions; final create/kickoff success remains owned by the consuming
   handler
2. no `UsePairflow` files changed
3. no product/source implementation files changed
4. every checkpoint result has `kickoff_allowed=false`
5. this workflow itself does not run `pairflow bubble kickoff`; only the
   consuming document or implementation route may delegate kickoff after success
   and refreshed postcondition proof
