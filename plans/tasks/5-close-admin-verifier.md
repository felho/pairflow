---
artifact_type: task
artifact_id: task_close_admin_verifier_v1
task_family_id: close-admin-verifier
sequence_key: "5"
task_id: 5-close-admin-verifier
title: "Close Aftermath Verifier-First Admin Reconciliation"
status: approved
phase: phase5
target_files:
  - .claude/skills/ExecutePairflowPlan/Workflows/UpdateProgress.md
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md
prd_ref: null
plan_ref: plans/pre-kickoff-admin-phase-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/pre-kickoff-admin-phase-plan-v1.md
  - plans/archive/tasks/2026-05-04-pre-kickoff-admin-phase-plan-v1/2-prep-admin-publish.md
  - plans/archive/tasks/2026-05-04-pre-kickoff-admin-phase-plan-v1/3-doc-bubble-start-integration.md
  - plans/archive/tasks/2026-05-04-pre-kickoff-admin-phase-plan-v1/4-impl-bubble-start-integration.md
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/UpdateProgress.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md
  - .claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md
  - .claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md
owners:
  - "felho"
doc_bubble_id: 5-close-admin-verifier-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-pre-kickoff-admin-phase-plan-v1
---

# Task: Close Aftermath Verifier-First Admin Reconciliation

## L0 - Policy

### Goal

Make `ExecutePairflowPlan` close aftermath verifier-first: after a settled
implementation close, `UpdateProgress` must first accept scoped admin that is
already present in refreshed `main`, and edit on `main` only for deterministic
reconciliation that is missing but recoverable. Ambiguous refreshed state must
stop at a human checkpoint.

### Domain / Control Model Summary

1. Business invariant: post-close work on `main` should be a short verification
   and deterministic reconciliation window, not a second attempt to recreate
   admin that the bubble branch already carried.
2. Control model: `CloseImplementationBubble` owns lifecycle close/merge proof,
   `UpdateProgress` owns post-close plan/task/archive reconciliation,
   plan metadata owns sequencing/tracker truth, task metadata owns task-local
   terminal/archive truth, and Pairflow remains lifecycle authority only.
3. Read-path rule: aftermath decisions must read refreshed plan/task artifacts
   after close/merge and compare them to the metadata contract before deciding
   whether any edit is still required.
4. Forbidden fallback: do not infer settled aftermath from transcript prose,
   operator memory, stale pre-close metadata, raw bubble status, unmerged
   worktree files, or "merge happened" without refreshed artifact proof.
5. Allowed resolution path: accept already-satisfied refreshed postconditions;
   otherwise perform only deterministic same-authority reconciliation such as
   canonical task archive placement, archived task status, plan tracker path,
   and next active task when uniquely derivable.
6. Missing-data rule: if close proof, refreshed artifacts, task identity,
   canonical archive target, or authority precedence is missing or ambiguous,
   stop at `HumanCheckpoint` and do not synthesize a next route.
7. Phase boundary:
   - contract closure: preserve the Task 1 metadata authority split
   - producer closure: consume settled close proof from the implementation close
     route; do not reinterpret raw lifecycle state
   - internal execution closure: update `UpdateProgress` verifier-first rules
   - workflow/orchestration closure: hand back to `ResolvePlanState`,
     `PlanComplete`, or `HumanCheckpoint` only through the aftermath result
   - read-model closure: N/A
   - activation closure: local workflow docs/tests only
   - cleanup/recovery closure: canonical archive reconciliation or fail-closed
     checkpoint

### Plan Linkage

1. Parent plan gap closed: close aftermath can still duplicate admin on `main`
   even when the bubble branch already carried the scoped admin changes.
2. Depends on: `4-impl-bubble-start-integration`, which proved the
   implementation start route can keep admin bounded and proof-gated.
3. Unlocks / impacts successors: this is the final planned task for the
   pre-kickoff admin phase; after it lands, the plan may be completed only when
   all task/archive metadata is settled.
4. Task-list impact: creates planned task `5-close-admin-verifier`; it does not
   supersede existing tasks.
5. Inherited validation / exit expectation: prove verifier-first no-edit
   behavior for already-satisfied post-close admin, deterministic reconciliation
   when recoverable, and fail-closed behavior for ambiguous state.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/UpdateProgress.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md`
   - `.claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
2. Canonical elements: settled `CloseImplementationBubble` result,
   refreshed plan metadata, refreshed task metadata, canonical task archive path
   `plans/archive/tasks/<archive_group>/<task_id>.md`,
   `status=archived`, plan tracker `status=archived`, and the next
   `active_task_id` derived from `task_order`.
3. Guard elements: complete close result shape, matching
   `reentry_identity_key`, trusted `created_on`, valid `archive_group`, clean
   refreshed artifact reads, and no cross-authority contradiction.
4. Compat-only elements: a task may already be at the canonical archive path
   after the bubble branch merged; this is accepted as already-satisfied
   admin, not treated as a reason to rewrite it.
5. Forbidden reinterpretations: do not widen task status values, do not treat
   `done` at a live path as plan-complete settlement, do not mark supersession
   from normal completion, and do not make `UpdateProgress` read raw Pairflow
   lifecycle truth to prove close success.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `UpdateProgress`, top-level
   `ExecutePairflowPlan` route inventory, implementation close handler output,
   delegation gates, and the plan/task metadata contract.
2. Actual touched scope: consumer-family alignment plus fail-closed hardening
   for post-close aftermath behavior.
3. Mutation entrypoints in scope: `UpdateProgress` rules that decide whether
   to accept refreshed postconditions, reconcile canonical archive metadata, or
   stop at `HumanCheckpoint`.
4. Hidden scope ruled out: product/source code, `UsePairflow` lifecycle
   changes, implementation handler close proof production, pre-kickoff
   start-route changes, remote support, automatic conflict resolution, and new
   metadata fields.
5. Branch inventory note: already-canonical admin, deterministic non-canonical
   archive reconciliation, stale plan tracker summary, missing refreshed
   artifact, ambiguous archive mapping, and completed-plan archive settlement
   must be represented.
6. Why the declared task shape matches reality: the task closes only the
   post-close aftermath gap and leaves lifecycle close itself to the existing
   close route.

### Authority Boundary Map

1. Authority producer: `CloseImplementationBubble` produces settled close/merge
   proof; refreshed plan/task reads produce admin aftermath truth.
2. Stored authority: Git `main` plus plan/task frontmatter after close/merge.
3. In-scope consumers: `UpdateProgress` and the top-level route ledger result
   that decides the next owner.
4. Explicit out-of-scope consumers: document/implementation bubble start
   routes, Pairflow lifecycle handlers, UI/read models, remote execution, and
   product/runtime code.
5. Export surfaces closed in this phase: yes, the aftermath result contract
   must distinguish `already_canonical`, `reconciled_to_canonical`, and
   `checkpoint_required`.

### Baseline Preservation

1. Must-preserve behaviors: mandatory close-before-aftermath entry condition,
   plan/task authority split, canonical archive target derivation, and
   fail-closed handling when deterministic reconciliation is unavailable.
2. Allowed resolution paths: accept refreshed already-canonical artifacts;
   reconcile missing canonical task/archive/tracker state when the metadata
   contract determines one unique result; otherwise stop.
3. Forbidden regression interpretations: do not require a second main-side edit
   when bubble-contained admin already satisfies the contract, and do not skip
   archive settlement just because a task is `done`.
4. Replacement proof required if removed: any replacement must still prove the
   same refreshed plan/task/archive state before handing control to
   `ResolvePlanState` or `PlanComplete`.

### Success / Completion Proof Boundary

1. Current canonical success proof source: `UpdateProgress` can reconcile
   archive/progress aftermath after close but may still presume main-side work
   needs to be performed.
2. Target canonical success proof source: refreshed artifacts after close prove
   whether admin is already settled or whether deterministic reconciliation is
   required.
3. Current canonical completion proof source: successful close result plus
   resulting task/archive reconciliation.
4. Target canonical completion proof source: aftermath result explicitly
   reports `archive_resolution=already_canonical` when bubble-contained admin
   already satisfied the canonical path, or `reconciled_to_canonical` only when
   it made a deterministic edit.
5. Reused proof contract: `SETTLED_IMPLEMENTATION_CLOSE_RESULT` and the Task 1
   metadata authority contract.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: `UpdateProgress` output contract and
   orchestration handoff boundary.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `consumer_family_alignment`.
2. Secondary shape: `fail_closed_hardening`, because ambiguous refreshed
   aftermath state must stop instead of synthesizing a next route.
3. Preconditions that must pass before side effects: settled close result,
   refreshed plan/task metadata, deterministic task identity, valid
   `archive_group`, and unique canonical archive path.
4. Side effects forbidden before preconditions pass: archive moves, plan
   tracker edits, `active_task_id` changes, plan archive moves, or emitting
   `PlanComplete`.
5. Invalid/precondition-failure behavior: emit `HumanCheckpoint` with the
   narrowest anchored reason code.
6. Coordination primitives in scope: no new locks; refreshed authoritative
   artifact reads and deterministic path derivation are the coordination guard.

### In Scope

1. Refine `UpdateProgress` so already-satisfied post-close admin is verified
   and accepted before any edit is attempted.
2. Preserve deterministic reconciliation for missing canonical task archive
   placement, `status=archived`, plan tracker path/status, and next active task
   when uniquely derivable.
3. Define fail-closed handling for ambiguous refreshed post-close state.
4. Keep top-level `ExecutePairflowPlan` route inventory aligned if the
   aftermath contract wording changes.
5. Add targeted validation for already-satisfied, deterministic-reconcile, and
   ambiguous-state paths.

### Out of Scope

1. Product/source implementation.
2. `UsePairflow` lifecycle changes.
3. New Pairflow commands or remote support.
4. Pre-kickoff start-route behavior.
5. Automatic merge/conflict resolution.
6. New persisted metadata fields unless a blocker proves the current contract
   cannot express verifier-first aftermath.

### Safety Defaults

1. If refreshed authority state is ambiguous, stop at `HumanCheckpoint`.
2. If the bubble branch already carried scoped admin and refreshed `main`
   satisfies the canonical contract, do not rewrite it.
3. If deterministic reconciliation edits are made, keep them limited to the
   current task's canonical aftermath and plan tracker sequencing.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: yes.
2. Impacted contracts: internal `ExecutePairflowPlan` aftermath result
   semantics and post-close admin reconciliation rules.

### Capability Closure

1. Capability claim: post-close administration can be verified instead of always
   recreated on `main`.
2. Closure classification: `end_to_end` for the local `ExecutePairflowPlan`
   aftermath path only; remote and lifecycle-close behavior remain out of
   scope.
3. Activation trigger: a successful `CloseImplementationBubble` result with
   `cleanup_postcondition=bubble_deleted` or a safe retained-bubble reason,
   followed by `UpdateProgress`.
4. Repo-provided boundary: refreshed plan/task artifacts on `main`, the existing
   `UpdateProgress` output contract, and targeted tests or fixtures for
   already-canonical, deterministic-reconcile, and checkpoint-required paths.
5. External prerequisites: none beyond an already-settled close result; operator
   judgment is required only when the refreshed state is ambiguous.
6. Last-mile proof: validation shows that already-canonical admin causes no
   duplicate edit, deterministic missing admin is reconciled, and ambiguous
   state returns `HumanCheckpoint`.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: yes
9. If `no`, required split: N/A
10. Identity/join note:
    - canonical identity path: settled close result `closed_task_id` -> task
      metadata `task_id` -> canonical archive path -> plan tracker row
    - competing identifiers or fallback identities: transcript prose, stale
      task paths, raw bubble state, branch names, and current-date archive
      guesses
11. Authority/source-of-truth note:
    - canonical source: refreshed plan/task metadata and settled close result
    - forbidden secondary sources: operator memory, stale pre-close reads,
      unmerged worktree state, generic "merged means done" inference
12. Closure-budget triage:
    - closure buckets touched: consumer-family alignment, fail-closed
      hardening, task/archive authority reconciliation
    - intentionally collapsed closures: verify and deterministic reconcile,
      because both are the same post-close aftermath boundary
    - explicitly deferred closures: none inside this plan
13. Bounded-task-shape decision:
    - primary shape: consumer-family alignment
    - secondary shape: fail-closed hardening
    - why this bounded mix is safe: no lifecycle close proof producer changes;
      only the post-close aftermath consumer is refined and unsafe ambiguity is
      made explicit.
14. Contract-dense decision:
    - gate triggered: yes
    - trigger reasons: result taxonomy, fallback/precedence,
      identity/archive mapping, downstream route ownership
    - canonical matrix source: L1 Canonical Contract Matrix
    - mirrored surfaces: L0 policy, L1 result contract, L2 branch inventory,
      L2 validation matrix

## L1 - Change Contract

### Canonical Contract Matrix

| Contract Element | Current Meaning | Task-5 Meaning | Producer | Consumer | Failure Rule |
|---|---|---|---|---|---|
| Settled close result | proof close/merge succeeded before aftermath | required entry proof; never reconstructed from raw lifecycle state | `CloseImplementationBubble` | `UpdateProgress` | absent or inconsistent result -> `HumanCheckpoint` |
| Refreshed plan/task metadata | aftermath authority after close | first source checked before any edit | Git `main` artifacts | `UpdateProgress` | absent or contradictory metadata -> `HumanCheckpoint` |
| `already_canonical` | task already at canonical archive path | accepted no-edit success when refreshed artifacts satisfy the contract | bubble branch merge or prior admin | orchestration handoff | mismatch with canonical path -> evaluate deterministic reconcile or checkpoint |
| `reconciled_to_canonical` | deterministic archive/admin normalization | only emitted after `UpdateProgress` performs uniquely derivable reconciliation | `UpdateProgress` | orchestration handoff | ambiguous derivation -> `HumanCheckpoint` |
| `checkpoint_required` | unsafe to continue automatically | required for missing/ambiguous refreshed state | `UpdateProgress` | top-level operator boundary | no fallback route may be synthesized |
| Plan tracker next task | high-level sequencing summary | update only when deterministic from `task_order` and archived current task | plan metadata | `ResolvePlanState` | disagreement crossing authority split -> `HumanCheckpoint` |

### Aftermath Result Contract

Successful verifier-first aftermath must return one of the existing
`UpdateProgress` output shapes with these meanings:

```yaml
archive_resolution: <already_canonical|reconciled_to_canonical>
task_terminal_status: archived
next_owner: <ResolvePlanState|PlanComplete>
handoff_boundary_note: <states whether refreshed admin was already accepted or deterministic reconciliation was applied>
pilot_evidence_note: <short local proof note naming the refreshed artifact set>
```

Ambiguous aftermath must return:

```yaml
aftermath_action: human_checkpoint
next_owner: HumanCheckpoint
continuation_mode: stop_at_human_checkpoint
archive_resolution: checkpoint_required
plan_archive_resolution: checkpoint_required
reason_code: <CROSS_AUTHORITY_METADATA_CONFLICT|NON_DETERMINISTIC_TASK_IDENTITY|NO_TRUSTWORTHY_ROUTE|PLAN_COMPLETE_STATE_STALE>
handoff_boundary_note: <states which refreshed authority set failed>
```

### Ownership and Deferred Semantics

1. `UpdateProgress` owns verifier-first aftermath acceptance and deterministic
   reconciliation.
2. `CloseImplementationBubble` owns approval, commit, merge, and bubble cleanup
   before aftermath starts.
3. `ResolvePlanState` owns the next route after aftermath; `UpdateProgress`
   must not synthesize a new bubble route from its own output.
4. `HandleNormalizedReplan` remains the owner for supersession or
   identity-changing replanning; this task must not move that behavior into
   normal close aftermath.

### Mirrored Surface Checklist

1. L0 Domain / Control Model Summary
2. L0 Success / Completion Proof Boundary
3. L1 Canonical Contract Matrix
4. L1 Aftermath Result Contract
5. L2 Branch Inventory
6. L2 Validation Matrix

## L2 - Implementation Notes

### Expected Implementation Shape

1. Update `UpdateProgress` decision order so it first classifies refreshed
   post-close plan/task/archive state before attempting any edit.
2. Add explicit already-satisfied handling: if the just-closed task is already
   at `plans/archive/tasks/<archive_group>/<task_id>.md` with
   `status=archived` and the plan tracker points to that path, return
   `archive_resolution=already_canonical`.
3. Preserve deterministic reconciliation: if the task is complete but not yet
   canonical, derive the single canonical archive target, move/update only that
   aftermath state, then return `archive_resolution=reconciled_to_canonical`.
4. Ensure plan tracker and `active_task_id` updates are derived only from
   refreshed `task_order`, current task settlement, and remaining non-terminal
   tracker rows.
5. Keep completed-plan archive reconciliation separate and only after all task
   archive settlement is proven.
6. Add or update targeted tests/fixtures for no-edit already-canonical,
   deterministic reconcile, and fail-closed ambiguous branches.
7. Update `SKILL.md` or delegation gates only if the route/authorization text
   needs to name verifier-first aftermath explicitly.

### Branch Inventory

| Branch | Expected Behavior |
|---|---|
| Bubble branch already archived task canonically | accept refreshed state; no duplicate main-side archive edit |
| Task complete at live path with deterministic archive target | move to canonical archive path, set task `status=archived`, update tracker |
| Plan tracker stale but task-local archive truth is canonical | reconcile tracker summary under authority precedence |
| Active task archived and successor exists | set `active_task_id` to the next non-terminal task and rerun `ResolvePlanState` |
| Active task archived and no successor remains | only enter plan-completion archive gate when all tracker rows are settled |
| Missing refreshed task artifact | stop at `HumanCheckpoint` |
| Archive group or task id ambiguous | stop at `HumanCheckpoint` |
| Cross-authority contradiction | stop at `HumanCheckpoint` |
| Plan claims done while live task/admin state remains unsettled | stop or reconcile only if deterministic; never emit stale `PlanComplete` |

### Validation Matrix

| Validation | Purpose |
|---|---|
| Targeted `UpdateProgress` verifier-first test or fixture for already-canonical state | prove no-edit acceptance of bubble-contained admin |
| Targeted deterministic reconciliation test | prove canonical archive/status/tracker update when recoverable |
| Targeted ambiguous-state/fail-closed test | prove human checkpoint instead of heuristic continuation |
| Narrow docs/contract review for `SKILL.md` and delegation gates if touched | prove route inventory and mutation authorization wording stays aligned |
| `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, relevant tests, `pnpm test`, and `pnpm build` when source/runtime files change | repo-required direct source validation |

### Acceptance Criteria

1. `UpdateProgress` verifies refreshed post-close admin state before editing on
   `main`.
2. Already-canonical task/archive/tracker state is accepted as settled
   aftermath without duplicate writes.
3. Missing but uniquely derivable task/archive/tracker aftermath is reconciled
   deterministically and reported as `reconciled_to_canonical`.
4. Missing, inconsistent, or ambiguous refreshed state stops at
   `HumanCheckpoint` with an anchored reason code.
5. The task does not change product/source code, `UsePairflow` lifecycle
   behavior, or pre-kickoff start-route behavior.
6. Validation evidence covers already-satisfied, deterministic-reconcile, and
   ambiguous-state paths, or records an explicit blocker for any local pilot
   that cannot be run.
