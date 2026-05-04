---
artifact_type: task
artifact_id: task_prep_admin_publish_v1
task_family_id: prep-admin-publish
sequence_key: "2"
task_id: 2-prep-admin-publish
title: "Pre-Kickoff Admin Publish Workflow"
status: approved
phase: phase2
target_files:
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md
prd_ref: null
plan_ref: plans/pre-kickoff-admin-phase-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/pre-kickoff-admin-phase-plan-v1.md
  - plans/tasks/1-prep-admin-contract.md
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/CreateBubble.md
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md
  - .claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md
owners:
  - "felho"
doc_bubble_id: 2-prep-admin-publish-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-pre-kickoff-admin-phase-plan-v1
---

# Task: Pre-Kickoff Admin Publish Workflow

## L0 - Policy

### Goal

Add a manual `ExecutePairflowPlan` workflow that lets an operator publish
bounded pre-kickoff admin changes from an ideation bubble worktree back to
`main`, verify refreshed postconditions, and stop before kickoff when publish
proof is missing or ambiguous.

This task makes the manual operator path usable independently. It must not make
document-bubble or implementation-bubble creation depend on the new workflow
yet; route integration remains owned by successor tasks.

### Domain / Control Model Summary

1. Business invariant: lifecycle-relevant admin state must be visible on clean
   `main` before any route that requires pre-kickoff admin may kickoff the
   bubble task payload.
2. Control model: Pairflow owns bubble lifecycle and worktree identity;
   `ExecutePairflowPlan` owns the selected admin publish workflow; task/plan
   metadata owns linkage/status postconditions; Git merge/commit evidence owns
   whether the bounded admin changes reached `main`.
3. Read-path rule: publish decisions may read only Pairflow bubble status,
   bubble metadata, bubble worktree Git status/diff, clean `main` Git status,
   the selected admin scope, and refreshed `main` plan/task metadata after the
   publish attempt.
4. Forbidden fallback: do not infer publish success from transcript prose,
   operator memory, an unmerged bubble-worktree commit, stale pre-publish
   metadata, raw changed-file globs outside the selected admin scope, or a
   best-effort merge that cannot prove postconditions.
5. Allowed resolution path: create or use an ideation bubble in round-0 hold,
   apply bounded admin changes in the bubble worktree, commit only selected
   admin paths on the bubble branch, merge/publish that commit to clean `main`,
   re-read refreshed `main` metadata, then return a structured publish result.
6. Missing-data rule: if bubble id, worktree path, selected admin scope, clean
   status, commit id, publish result, or refreshed postconditions cannot be
   proven, return a human checkpoint and do not kickoff.
7. Phase boundary:
   - contract closure: owned here for the manual publish workflow
   - producer closure: owned here for structured publish result wording
   - internal execution closure: owned here only for manual publish steps
   - workflow/orchestration closure: successor task 3/4 route integrations
   - read-model closure: N/A
   - activation closure: owned here for the manual operator workflow
   - cleanup/recovery closure: fail-closed checkpoint only; automatic conflict
     recovery remains out of scope

### Plan Linkage

1. Parent plan gap closed: operators cannot run the pre-kickoff admin pattern
   through a first-class workflow.
2. Depends on: `1-prep-admin-contract`, which documented the optional
   admin-container route contract and allowed scope.
3. Unlocks / impacts successors:
   - `3-doc-bubble-start-integration` may route document-bubble creation
     through the manual publish workflow.
   - `4-impl-bubble-start-integration` may reuse the same workflow after the
     document path is proven.
4. Task-list impact: creates planned task `2-prep-admin-publish`; it does not
   supersede existing tasks.
5. Inherited validation / exit expectation: prove manual publish can succeed
   for bounded admin scope and fails closed without kickoff for dirty-main,
   out-of-scope changes, publish conflict, or missing postcondition cases.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`
   - `.claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
   - `.claude/skills/UsePairflow/SKILL.md`
   - `.claude/skills/UsePairflow/Workflows/CreateBubble.md`
2. Canonical elements:
   - `--ideation` / round-0 hold remains a `UsePairflow` lifecycle primitive.
   - selected admin scope is bounded to plan/task/progress metadata and directly
     related docs/admin notes.
   - publish proof must come from a committed admin change published to `main`
     and refreshed metadata postconditions.
   - failed or ambiguous publish must not kickoff.
3. Guard elements:
   - clean main status, selected-scope diff check, and postcondition verification
     are guards for returning publish success.
4. Compat-only elements:
   - existing document and implementation create routes remain valid until
     successor route tasks explicitly adopt the workflow.
5. Forbidden reinterpretations:
   - do not rename ideation mode or move lifecycle ownership into
     `ExecutePairflowPlan`.
   - do not edit `UsePairflow` unless implementation proves existing primitives
     are insufficient.
   - do not allow product/source implementation during pre-kickoff admin.
   - do not make the manual workflow mandatory for current routes.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `ExecutePairflowPlan/SKILL.md` optional pre-kickoff admin route contract.
   - `HandleDocumentBubble.md` and `HandleImplementationBubble.md` future route
     notes.
   - `UsePairflow` create/start/round-0 hold/kickoff baseline.
2. Actual touched scope: activation/workflow contract plus fail-closed
   lifecycle guard documentation.
3. Mutation entrypoints in scope:
   - new repo-local workflow file
     `.claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md`
   - `ExecutePairflowPlan/SKILL.md` route-surface inventory or handoff wording
     if needed
   - document/implementation handler notes only when required to keep successor
     handoff wording aligned
4. Hidden scope ruled out: direct TypeScript runtime command implementation,
   `UsePairflow` lifecycle changes, document/implementation route integration,
   automatic conflict recovery, product/source edits, and kickoff execution.
5. Branch inventory note: success publish, dirty-main fail, out-of-scope fail,
   commit failure, merge conflict, missing refreshed postcondition, and
   no-kickoff failure branches must be represented.
6. Why the declared task shape matches reality: the task adds an operator
   workflow and structured proof contract, while successor tasks own route
   adoption and normal bubble create/start integration.

### Authority Boundary Map

1. Authority producer: the manual publish workflow produces a structured
   pre-kickoff admin publish result.
2. Stored authority: Git commit/merge state plus refreshed `main` plan/task
   metadata after publish.
3. In-scope consumers: manual operator use and successor `ExecutePairflowPlan`
   route tasks that will later consume the workflow contract.
4. Explicit out-of-scope consumers: `UsePairflow` lifecycle semantics,
   document-bubble create/start route integration, implementation-bubble
   create/start route integration, close aftermath verifier, UI/read models.
5. Export surfaces closed in this phase: yes, the manual workflow output
   contract and fail-closed result taxonomy.

### Baseline Preservation

1. Must-preserve behaviors:
   - existing document and implementation bubble routes remain usable without
     this workflow
   - ideation bubbles can remain in round-0 hold until explicit kickoff
   - normal Pairflow lifecycle commands remain owned by `UsePairflow`
2. Allowed resolution paths:
   - manual publish may use bounded Git operations described by the workflow
     after clean-status and selected-scope gates pass
   - deterministic refreshed metadata verification may reconcile only the named
     selected admin postconditions
3. Forbidden regression interpretations:
   - do not treat workflow documentation as automatic route activation
   - do not relax selected admin scope to all files changed in the bubble
   - do not kickoff after a failed publish
4. Replacement proof required if removed: any replacement must still prove
   clean main, selected scope, committed admin change, published main state, and
   refreshed metadata postconditions before kickoff.

### Success / Completion Proof Boundary

1. Current canonical success proof source: no first-class manual publish
   workflow exists.
2. Target canonical success proof source: structured workflow result with
   `publish_result=success`, selected admin paths, admin commit id, published
   main commit/ref, and refreshed postcondition evidence.
3. Current canonical completion proof source: N/A.
4. Target canonical completion proof source: the manual workflow stops after
   verified publish and before kickoff; kickoff remains a separate lifecycle
   action.
5. Reused proof contract: clean main status and Pairflow round-0 hold state
   from existing `UsePairflow` baseline.
6. Proof-parity rule: narrowed_here_with_proof.
7. Final truth surfaces affected: workflow result fields only; no runtime
   lifecycle state taxonomy changes.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: activation_or_read_model.
2. Secondary shape: fail_closed_hardening, because failure paths must stop
   before kickoff.
3. Preconditions that must pass before side effects:
   - linked ideation bubble exists and is in round-0 hold
   - main worktree is clean
   - selected admin scope is explicit and bounded
   - bubble worktree diff contains no out-of-scope files
4. Side effects forbidden before preconditions pass:
   - committing bubble-worktree changes
   - merging or publishing to `main`
   - mutating task/plan status on `main`
   - running `bubble kickoff`
5. Invalid/precondition-failure behavior: zero kickoff side effects; return
   human checkpoint with the narrow reason.
6. Coordination primitives in scope: no locks or leases; clean worktree and
   selected-scope checks are the coordination guards.

### In Scope

1. Add a repo-local `ExecutePairflowPlan` workflow for manual pre-kickoff admin
   publish.
2. Define the workflow input, preconditions, selected admin scope, commit/publish
   steps, postcondition verification, output shape, and fail-closed result
   taxonomy.
3. Update `ExecutePairflowPlan/SKILL.md` only enough to list or reference the
   new manual workflow as a backing workflow, not as a route surface returned by
   `ResolvePlanState`.
4. Add handoff notes in document/implementation handlers only if needed to
   preserve successor-task alignment.
5. Add targeted validation guidance for manual success and fail-closed cases.

### Out of Scope

1. Changing `CreateDocumentBubble` or `CreateImplementationBubble` routing to
   use the manual workflow.
2. Adding a new TypeScript CLI command.
3. Editing `UsePairflow` docs or workflow files unless a concrete blocker proves
   existing primitives are insufficient.
4. Product/source implementation during the pre-kickoff admin phase.
5. Automatic conflict resolution.
6. Remote publish support.
7. Running kickoff as part of the publish workflow.

### Safety Defaults

1. If any publish proof is missing, stop before kickoff.
2. If any out-of-scope path is present in the bubble worktree diff, stop before
   commit or publish.
3. If `main` is dirty, stop before reading the bubble worktree as publishable.
4. If the publish merge conflicts, stop at an operator checkpoint.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: yes.
2. Impacted contracts: internal workflow result/status contract for
   `ExecutePairflowPlan` manual pre-kickoff admin publish.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `2`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `10`
8. `single-task allowed`: yes
9. If `no`, required split: N/A
10. Identity/join note:
   - canonical identity path: `bubble_id` from Pairflow status plus selected
     admin paths and parent task/plan metadata
   - competing identifiers or fallback identities: transcript prose,
     branch-name guesses, unmerged commit ids, and stale pre-publish metadata
11. Authority/source-of-truth note:
   - canonical source: Pairflow status, Git commit/merge state, refreshed main
     metadata
   - forbidden secondary sources: operator memory, chat transcript, raw globs,
     stale metadata, unmerged worktree state
12. Closure-budget triage:
   - closure buckets touched: activation, workflow orchestration, fail-closed
     handling
   - intentionally collapsed closures: manual workflow contract and fail-closed
     result taxonomy, because they are one operator path
   - explicitly deferred closures: document route integration, implementation
     route integration, close aftermath verifier
13. Bounded-task-shape decision:
   - primary shape: activation/manual workflow
   - secondary shape: fail-closed hardening
   - why this bounded mix is safe: failure behavior is inseparable from the
     manual publish path and does not activate route integration
14. Contract-dense decision:
   - gate triggered: yes
   - trigger reasons: status taxonomy, fallback/precedence, split ownership,
     downstream consumers, mirrored surfaces
   - canonical matrix source: L1 Canonical Contract Matrix
   - mirrored surfaces: L0 policy, L1 domain contract, L1 structured output,
     L2 validation

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Manual workflow only | The new workflow is callable by an operator but is not automatically used by bubble create routes yet. | Do not modify route selection or kickoff behavior in this task. | P1 | required-now |
| Selected admin scope | Publish scope is explicit and limited to plan/task/progress metadata plus directly related docs/admin notes. | Reject product/source code and unrelated files before commit/publish. | P1 | required-now |
| Clean main | Main must be clean and free of merge/rebase/cherry-pick state before publish. | Dirty main returns checkpoint before bubble commit or merge. | P1 | required-now |
| Publish proof | Success requires admin commit id, publish result on `main`, and refreshed postcondition evidence. | Do not return success from an unmerged bubble commit. | P1 | required-now |
| No kickoff on failure | Any failed or ambiguous publish stops before kickoff. | The workflow output must never invoke or imply kickoff on failure. | P1 | required-now |
| Lifecycle ownership | `UsePairflow` remains owner of ideation create/start/kickoff. | This workflow uses existing round-0 hold semantics only. | P1 | required-now |

### 0a) Canonical Contract Matrix

| ID | Condition / Input | Owner | Output / Status | Reason / Error Code | Retained / Dropped Data | Side Effects | Required Test |
|---|---|---|---|---|---|---|---|
| PCM1 | Bubble is not ideation round-0 hold | Publish workflow | `human_checkpoint` | `PRE_KICKOFF_HOLD_NOT_PROVEN` | retain diagnostics | no commit, no publish, no kickoff | T1 |
| PCM2 | Main worktree is dirty or has operation in progress | Publish workflow | `human_checkpoint` | `MAIN_NOT_CLEAN` | retain dirty file summary | no commit, no publish, no kickoff | T2 |
| PCM3 | Selected admin scope is missing or includes forbidden paths | Publish workflow | `human_checkpoint` | `ADMIN_SCOPE_INVALID` | retain rejected path list | no commit, no publish, no kickoff | T3 |
| PCM4 | Bubble worktree has out-of-scope changes | Publish workflow | `human_checkpoint` | `OUT_OF_SCOPE_BUBBLE_CHANGES` | retain selected and rejected paths | no commit, no publish, no kickoff | T4 |
| PCM5 | Commit of selected admin paths fails | Publish workflow | `human_checkpoint` | `ADMIN_COMMIT_FAILED` | retain command failure summary | no publish, no kickoff | T5 |
| PCM6 | Publish/merge to main conflicts or fails | Publish workflow | `human_checkpoint` | `ADMIN_PUBLISH_FAILED` | retain admin commit id and failure summary | no kickoff | T6 |
| PCM7 | Refreshed main metadata does not prove named postconditions | Publish workflow | `human_checkpoint` | `ADMIN_POSTCONDITION_MISSING` | retain refreshed mismatch summary | no kickoff | T7 |
| PCM8 | All gates pass | Publish workflow | `publish_result=success` | `ADMIN_PUBLISH_SUCCEEDED` | return selected paths, admin commit id, published main ref, postconditions | publish to main only; no kickoff | T8 |

### 0b) Ownership and Deferred Semantics

| Surface / Decision | Owned By This Task | Emits / Records Only | Deferred Owner | Forbidden Interpretation / Fallback | Priority | Timing |
|---|---|---|---|---|---|---|
| Manual publish workflow | yes | structured publish result | N/A | success cannot be inferred from bubble worktree alone | P1 | required-now |
| Document route adoption | no | workflow is available for later use | `3-doc-bubble-start-integration` | do not make doc create depend on this task yet | P1 | required-now |
| Implementation route adoption | no | workflow is available for later use | `4-impl-bubble-start-integration` | do not change `status=in_progress` routing here | P1 | required-now |
| Kickoff | no | publish result may be consumed later | `UsePairflow` plus successor route integration | never kickoff from failed publish | P1 | required-now |
| Conflict recovery | no | checkpoint reason only | operator/future workflow | no automatic merge-conflict resolution | P2 | required-now |

### 0c) Structured Output Contract

| Field | Required On Success | Required On Checkpoint | Rule |
|---|---:|---:|---|
| `workflow` | yes | yes | fixed value `PublishPreKickoffAdmin` |
| `publish_result` | yes | yes | `success` or `human_checkpoint` |
| `reason_code` | yes | yes | one of the matrix reason codes |
| `bubble_id` | yes | when known | Pairflow bubble id |
| `worktree_path` | yes | when known | Pairflow status worktree path |
| `selected_admin_paths` | yes | when known | normalized explicit selected paths |
| `rejected_paths` | no | when applicable | paths that blocked publish |
| `admin_commit` | yes | when created | bubble-branch admin commit id |
| `published_main_ref` | yes | no | refreshed main ref after publish |
| `postcondition_evidence` | yes | when mismatch known | named postcondition checks and refreshed values |
| `kickoff_allowed` | yes | yes | `true` only when `publish_result=success`; otherwise `false` |

### 0d) Validation Matrix

| ID | Validates | Required Evidence | Priority |
|---|---|---|---|
| T1 | non-hold bubble blocks publish | workflow text has explicit `PRE_KICKOFF_HOLD_NOT_PROVEN` branch | P1 |
| T2 | dirty main blocks publish | workflow text requires clean main before bubble commit/publish | P1 |
| T3 | invalid scope blocks publish | allowed/forbidden path allowlist exists and rejects forbidden paths | P1 |
| T4 | out-of-scope bubble changes block publish | workflow compares bubble diff to selected admin paths | P1 |
| T5 | commit failure blocks publish | workflow returns checkpoint without publish or kickoff | P1 |
| T6 | publish conflict blocks kickoff | workflow returns `ADMIN_PUBLISH_FAILED` and no kickoff | P1 |
| T7 | missing postcondition blocks kickoff | workflow re-reads main metadata after publish and fails closed | P1 |
| T8 | success result is complete | output includes selected paths, commit id, published main ref, postconditions, and `kickoff_allowed=true` | P1 |

## L2 - Implementation Notes

1. Add `.claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md`
   with purpose, inputs, preconditions, decision order, output contract, and
   report shape.
2. Add a backing-workflow reference in
   `.claude/skills/ExecutePairflowPlan/SKILL.md`; do not add it as a
   `target_workflow_surface` returned by `ResolvePlanState`.
3. If handler docs mention future admin publish postconditions, align wording to
   point at the new manual workflow while preserving that adoption is deferred.
4. Keep all edits repo-local under `.claude/skills/ExecutePairflowPlan/**`.
   After the repo-local skill commit lands, run the repository skill sync
   workflow to `~/.claude/skills` and commit the synced global skill changes
   separately.
5. Validation should be docs/workflow-contract focused:
   - inspect changed workflow text for every matrix branch
   - verify no `UsePairflow` files changed unless a concrete blocker is recorded
   - run `git diff --check`
   - run `pnpm build` before any later bubble lifecycle command if source or
     CLI/runtime-affecting files changed directly in the checkout

## Review Handoff

ReviewSpec task-mode should check the canonical matrix first. Approve only if
the task keeps route integration deferred, preserves `UsePairflow` lifecycle
ownership, forbids product/source implementation during admin publish, and makes
failed or ambiguous publish a no-kickoff checkpoint.
