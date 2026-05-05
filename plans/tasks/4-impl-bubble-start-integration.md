---
artifact_type: task
artifact_id: task_impl_bubble_start_integration_v1
task_family_id: impl-bubble-start-integration
sequence_key: "4"
task_id: 4-impl-bubble-start-integration
title: "Implementation Bubble Start Admin Publish Integration"
status: approved
phase: phase4
target_files:
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md
  - .claude/skills/ExecutePairflowPlan/Workflows/ResolvePlanState.md
  - .claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md
prd_ref: null
plan_ref: plans/pre-kickoff-admin-phase-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/pre-kickoff-admin-phase-plan-v1.md
  - plans/archive/tasks/2026-05-04-pre-kickoff-admin-phase-plan-v1/2-prep-admin-publish.md
  - plans/archive/tasks/2026-05-04-pre-kickoff-admin-phase-plan-v1/3-doc-bubble-start-integration.md
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/CreateBubble.md
  - .claude/skills/ExecutePairflowPlan/SKILL.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md
  - .claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md
  - .claude/skills/ExecutePairflowPlan/references/Delegation-Gates.md
  - .claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-pre-kickoff-admin-phase-plan-v1
---

# Task: Implementation Bubble Start Admin Publish Integration

## L0 - Policy

### Goal

Integrate only the `CreateImplementationBubble` route with the pre-kickoff
admin publish pattern so implementation-bubble start uses an ideation carrier,
publishes bounded route-admin changes to clean `main`, verifies refreshed
postconditions, and kickoffs only after that proof is present.

### Domain / Control Model Summary

1. Business invariant: `main` must contain implementation-bubble linkage and
   task-status administration before an implementation task payload is kicked
   off when this route adopts the pre-kickoff admin pattern.
2. Control model: `ExecutePairflowPlan` selects the implementation route
   pattern, `UsePairflow` owns ideation create/start/kickoff lifecycle, Git owns
   publish proof, and task metadata owns `impl_bubble_id` linkage plus
   `status=in_progress`.
3. Read-path rule: kickoff decisions may read only the structured
   `PublishPreKickoffAdmin` success result plus refreshed `main` task/plan
   metadata and Pairflow ideation hold status.
4. Forbidden fallback: do not infer publish success from bubble worktree files,
   transcript prose, operator memory, stale pre-publish metadata, an unmerged
   admin commit, or `status=implementable` alone after admin was prepared only
   in a bubble worktree.
5. Allowed resolution path: create/start an ideation implementation bubble,
   persist bounded admin in its worktree, publish selected admin paths through
   `PublishPreKickoffAdmin`, re-read `main`, then kickoff that same bubble.
6. Missing-data rule: missing bubble id, worktree, admin commit, publish
   result, refreshed metadata postcondition, or ideation hold proof stops before
   kickoff.
7. Canonical identity rule: the intended implementation bubble id is the
   metadata-contract derived id `<task_id>-impl`; do not introduce a separate
   recovery-key field or alternate Pairflow lookup surface.
8. Phase boundary:
   - contract closure: already established by tasks 1-3; this task applies it
     to the implementation route only
   - producer closure: consume the existing `PublishPreKickoffAdmin` success
     result for implementation-route postconditions
   - internal execution closure: owned here only for implementation-bubble
     create/start integration
   - workflow/orchestration closure: owned here for `CreateImplementationBubble`
   - read-model closure: N/A
   - activation closure: owned here for local implementation route execution
   - cleanup/recovery closure: fail-closed checkpoint only

### Plan Linkage

1. Parent plan gap closed: implementation-bubble start still uses old admin
   timing.
2. Depends on: `3-doc-bubble-start-integration`, which proved the document
   route can use pre-kickoff admin publish before kickoff.
3. Unlocks / impacts successors: enables `5-close-admin-verifier` to focus on
   post-close verifier-first aftermath without changing start-route behavior.
4. Task-list impact: creates planned task `4-impl-bubble-start-integration`;
   it does not supersede existing tasks.
5. Inherited validation / exit expectation: prove that the implementation
   bubble route can publish `impl_bubble_id` and `status=in_progress` admin
   before kickoff while preserving the existing lifecycle authority split.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `.claude/skills/UsePairflow/SKILL.md`
   - `.claude/skills/UsePairflow/Workflows/CreateBubble.md`
   - `.claude/skills/ExecutePairflowPlan/SKILL.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleImplementationBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/HandleDocumentBubble.md`
   - `.claude/skills/ExecutePairflowPlan/Workflows/PublishPreKickoffAdmin.md`
   - `.claude/skills/ExecutePairflowPlan/references/Plan-Task-Metadata-Contract.md`
2. Canonical elements: canonical derived implementation bubble id
   `<task_id>-impl`, `--ideation`, `ideation.task_pending=true`,
   `impl_bubble_id` as linkage only, `status=implementable` as the required
   entry proof, and `status=in_progress` only after implementation-bubble
   create/start admin is published and kickoff begins.
3. Guard elements: clean main, selected admin scope, admin commit id,
   refreshed metadata postconditions, and refreshed ideation hold proof.
4. Compat-only elements: pre-contract bubble ids may be persisted as concrete
   linkage values when already present; this task should use the planned
   implementation bubble id for fresh starts.
5. Forbidden reinterpretations: do not move lifecycle ownership into
   `ExecutePairflowPlan`, do not modify `UsePairflow`, do not change
   document-bubble routing, and do not change close-after-implementation
   aftermath semantics.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: `HandleImplementationBubble`,
   `PublishPreKickoffAdmin`, `ExecutePairflowPlan/SKILL.md`,
   `ResolvePlanState`, and delegation gate docs.
2. Actual touched scope: workflow/orchestration integration plus fail-closed
   pre-kickoff guard consumption for implementation-bubble create/start.
3. Mutation entrypoints in scope: implementation-route task metadata linkage
   persistence for `impl_bubble_id`, task status transition to `in_progress`,
   bounded admin staging/publish via the existing manual workflow, and kickoff
   after publish proof.
4. Hidden scope ruled out: document-bubble route changes, close aftermath
   verifier-first behavior, `UsePairflow` lifecycle changes, product/source
   implementation during pre-kickoff admin, remote support, and automatic
   conflict recovery.
5. Branch inventory note: ideation create/start success, admin publish success,
   dirty-main/admin-scope/publish/postcondition failures, kickoff success, and
   kickoff-not-run fail-closed cases must be represented.
6. Why the declared task shape matches reality: the task applies the proven
   route-admin pattern to the second start route and leaves close aftermath to
   the next planned task.

### Authority Boundary Map

1. Authority producer: `PublishPreKickoffAdmin` produces structured publish
   proof; Pairflow produces lifecycle status.
2. Stored authority: Git main ref plus refreshed task metadata with
   `impl_bubble_id` and `status=in_progress`.
3. In-scope consumers: `HandleImplementationBubble` create/start flow and
   top-level `CreateImplementationBubble` route reporting.
4. Explicit out-of-scope consumers: document-bubble route, close aftermath,
   UI/read models, remote execution, and generic `UsePairflow`.
5. Export surfaces closed in this phase: yes, implementation create/start
   becomes proof-gated by the pre-kickoff admin publish result.

### Baseline Preservation

1. Must-preserve behaviors: existing document route handling, existing
   implementation review/close handling, `UsePairflow` ideation semantics, and
   the `status=implementable` entry gate.
2. Allowed resolution paths: fail closed before kickoff when publish proof is
   missing; reuse only a safe same-id ideation hold; otherwise create the
   canonical derived implementation bubble.
3. Forbidden regression interpretations: do not treat implementation readiness
   as proven by `doc_bubble_id`, do not kickoff from unmerged worktree state,
   and do not make close aftermath depend on task-4-only behavior.
4. Replacement proof required if removed: any replacement must prove the same
   clean-main, selected-scope, admin-commit, publish, refreshed-metadata, and
   ideation-hold properties before kickoff.

### Success / Completion Proof Boundary

1. Current canonical success proof source: implementation bubble create/start
   can persist `impl_bubble_id` and set `status=in_progress` around the main
   route without a pre-kickoff admin publish proof.
2. Target canonical success proof source: `PublishPreKickoffAdmin` success plus
   refreshed `main` metadata proving the selected implementation-route
   postconditions.
3. Current canonical completion proof source: kickoff/start status plus
   persisted linkage/status.
4. Target canonical completion proof source: kickoff of the same ideation
   bubble only after publish proof, refreshed `impl_bubble_id`, and refreshed
   `status=in_progress` are present.
5. Reused proof contract: `PublishPreKickoffAdmin` structured success result.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: implementation handler local action result
   and task metadata linkage/status.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `activation_or_read_model`.
2. Secondary shape: `fail_closed_hardening`, because kickoff must stop when
   publish proof is absent.
3. Preconditions that must pass before side effects: task `status=implementable`,
   no existing `impl_bubble_id`, ideation bubble hold, explicit selected admin
   scope, clean main, admin publish success, refreshed `impl_bubble_id`, and
   refreshed `status=in_progress`.
4. Side effects forbidden before preconditions pass: kickoff, reporting a
   settled implementation-create boundary, or persisting final linkage/status
   from stale state.
5. Invalid/precondition-failure behavior: stop at human checkpoint or settled
   hold with no kickoff.
6. Coordination primitives in scope: no new locks; clean main and selected-scope
   checks remain the coordination guards.

### In Scope

1. Update implementation-bubble create/start handling to call or require
   `PublishPreKickoffAdmin` before kickoff.
2. Define the implementation-route postconditions consumed from the publish
   result: `impl_bubble_id=<task_id>-impl` and `status=in_progress`.
3. Preserve implementation review and implementation close behavior.
4. Preserve document route behavior as already integrated.
5. Add targeted validation guidance for implementation-route success and
   fail-closed no-kickoff cases.

### Out of Scope

1. Document-bubble route adoption changes.
2. Close aftermath verifier-first behavior.
3. `UsePairflow` lifecycle changes.
4. Product/source implementation during pre-kickoff admin.
5. Remote publish support or automatic conflict recovery.

### Safety Defaults

1. If publish proof or refreshed postcondition evidence is missing, stop before
   kickoff and do not report the implementation-bubble create route as settled.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: yes.
2. Impacted contracts: internal workflow route/result semantics for
   `CreateImplementationBubble` under `ExecutePairflowPlan`.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `10`
8. `single-task allowed`: yes
9. If `no`, required split: N/A
10. Identity/join note:
    - canonical identity path: active task id -> derived `impl_bubble_id` ->
      Pairflow status bubble id -> publish result bubble id
    - competing identifiers or fallback identities: branch names, transcript
      prose, stale task metadata, unmerged worktree commits, and document
      bubble linkage
11. Authority/source-of-truth note:
    - canonical source: Pairflow status, publish result, Git main ref,
      refreshed task metadata
    - forbidden secondary sources: operator memory, stale pre-publish reads,
      raw globs, transcript prose
12. Closure-budget triage:
    - closure buckets touched: authority producer consumption, workflow
      orchestration consumer, activation, fail-closed handling
    - intentionally collapsed closures: implementation route proof consumption
      and kickoff activation, because they are one bounded route path
    - explicitly deferred closures: close aftermath verifier-first behavior
13. Bounded-task-shape decision:
    - primary shape: activation/read-model
    - secondary shape: fail-closed hardening
    - why this bounded mix is safe: the same implementation route owns both
      kickoff activation and no-kickoff failure behavior.
14. Contract-dense decision:
    - gate triggered: yes
    - trigger reasons: status/result taxonomy, structured publish proof,
      fallback/precedence, split ownership, downstream successor inheritance
    - canonical matrix source: L1 Canonical Contract Matrix
    - mirrored surfaces: L0 policy, L1 domain contract, L1 structured rules,
      L1 test matrix

## L1 - Change Contract

### Canonical Contract Matrix

| Contract Element | Current Meaning | Task-4 Meaning | Producer | Consumer | Failure Rule |
|---|---|---|---|---|---|
| `status=implementable` | durable proof doc refinement closed | required entry proof for implementation create | task metadata from doc close | `HandleImplementationBubble` | absent status blocks implementation route |
| `<task_id>-impl` | canonical derived implementation bubble id | only fresh implementation bubble id and recovery key | task metadata contract | implementation handler / Pairflow | invalid or unsafe existing id stops route |
| `impl_bubble_id` | linkage only | published admin postcondition before kickoff | implementation handler admin change | task metadata / route reporting | missing refreshed value stops before kickoff |
| `status=in_progress` | implementation work linked or started | published admin postcondition before kickoff | implementation handler admin change | task metadata / route reporting | missing refreshed value stops before kickoff |
| `PublishPreKickoffAdmin` success | structured proof that admin reached `main` | required proof before implementation kickoff | publish workflow | implementation handler | failed or partial publish stops with no kickoff |
| ideation hold | `RUNNING` round 0 with task pending | reusable pre-kickoff carrier only for same derived id | Pairflow | implementation handler | non-hold or ambiguous state stops route |

### Route Result Contract

Successful implementation create/start must return a handler-local action result:

```yaml
action_surface: CreateImplementationBubble
continuation_mode: stop_at_settled_checkpoint
source_owner: bubble_routing_layer
scope: implementation
reason_code: IMPL_BUBBLE_CREATE_REQUIRED
delegated_use_pairflow_surface: CreateBubble
metadata_postcondition: impl_bubble_id_persisted_and_status_in_progress
publish_postcondition: admin_publish_success
handoff_boundary_note: Start the implementation bubble through UsePairflow ideation, publish impl linkage/status admin to main, kickoff the same bubble, and stop at the settled bubble-started boundary.
```

Failure must return a human checkpoint or settled hold that explicitly says
kickoff did not run.

### Ownership and Deferred Semantics

1. `HandleImplementationBubble` owns the route integration and publish proof
   consumption.
2. `PublishPreKickoffAdmin` owns structured publish proof and refreshed
   postcondition reporting.
3. `UsePairflow` owns ideation create/start/kickoff lifecycle; this task must
   not redefine lifecycle states.
4. `UpdateProgress` and task 5 own post-close aftermath; this task must not add
   verifier-first close behavior.

### Mirrored Surface Checklist

1. L0 Domain / Control Model Summary
2. L0 Success / Completion Proof Boundary
3. L1 Canonical Contract Matrix
4. L1 Route Result Contract
5. L2 Branch Inventory
6. L2 Validation Matrix

## L2 - Implementation Notes

### Expected Implementation Shape

1. In `HandleImplementationBubble`, replace the old direct create/start path
   for fresh implementation bubbles with the same pre-kickoff admin pattern
   proven by document route task 3.
2. Derive `<task_id>-impl` before create and read existing Pairflow status for
   that exact id.
3. Reuse only a safe same-id ideation hold; otherwise create/start the derived
   id in ideation mode.
4. Apply bounded admin in the bubble worktree:
   - set `impl_bubble_id` to the derived id
   - set task `status` to `in_progress`
   - update any required plan tracker summary for the same task
5. Delegate publish to `PublishPreKickoffAdmin` with selected admin paths and
   postconditions for implementation linkage/status.
6. Re-read `main` task metadata and Pairflow hold proof.
7. Kickoff the same bubble only after publish proof and refreshed postconditions
   are present.
8. Stop at a settled create boundary after kickoff/start evidence is present.

### Branch Inventory

| Branch | Expected Behavior |
|---|---|
| Fresh derived id absent | create/start ideation bubble, publish admin, kickoff same id |
| Derived id already safe ideation hold | reuse hold, publish missing admin, kickoff same id |
| Derived id unsafe state | stop at human checkpoint, no alternate id |
| Main dirty before publish | stop before publish/kickoff |
| Bubble admin changes include out-of-scope files | stop before publish/kickoff |
| Publish conflict or partial publish | stop before kickoff |
| Refreshed `impl_bubble_id` missing | stop before kickoff |
| Refreshed `status=in_progress` missing | stop before kickoff |
| Kickoff fails after publish | report explicit lifecycle blocker; do not invent settled create |

### Validation Matrix

| Validation | Purpose |
|---|---|
| Targeted unit/docs tests for handler route text or parser helpers if present | prove route result/postcondition contract |
| Manual/local pilot for implementation create route | prove publish-before-kickoff path |
| Fail-closed dirty-main or missing-postcondition scenario | prove no kickoff on ambiguous admin |
| Existing document route smoke/path review | prove task 4 did not regress task 3 route |
| `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, relevant tests, `pnpm test`, and `pnpm build` when source/runtime files change | repo-required direct source validation |

### Acceptance Criteria

1. `CreateImplementationBubble` uses an ideation pre-kickoff admin carrier for
   fresh implementation starts.
2. The route publishes `impl_bubble_id` and `status=in_progress` admin to clean
   `main` before kickoff.
3. Kickoff uses the same derived implementation bubble id after refreshed proof.
4. Missing or ambiguous publish/postcondition proof stops before kickoff.
5. Document route, implementation review/close, and close aftermath ownership
   remain unchanged.
6. Validation evidence includes at least one success path and one no-kickoff
   fail-closed path, or an explicit blocker explaining why the local pilot could
   not be run.
