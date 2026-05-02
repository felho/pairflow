---
artifact_type: plan
artifact_id: plan_meta_review_approve_validation_gate_v1
plan_id: meta-review-approve-validation-gate-plan-v1
created_on: "2026-05-02"
title: "Meta-Review Approve Validation Gate Plan V1"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-meta-approve-validation-gate
active_task_id: 1-meta-approve-validation-gate
archive_group: 2026-05-02-meta-review-approve-validation-gate-plan-v1
task_tracker:
  - task_id: 1-meta-approve-validation-gate
    task_path: plans/tasks/1-meta-approve-validation-gate.md
    status: in_progress
    notes: "Separate PASS-loop validation from full-test validation required before meta-review approve can route to human approval."
---

# Plan: Meta-Review Approve Validation Gate

## Objective

Allow repositories to configure different validation requirements for the fast implementation PASS loop and the final meta-review approve gate.

For the Pairflow repository itself, the intended policy is:

1. implementer feedback and PASS validation use `lint`, `typecheck`, `fitness`, and targeted tests;
2. full `pnpm test` is not required on every implementation PASS;
3. full `pnpm test` is required before a meta-review `recommendation=approve` can route to `human_gate_approve`.

## Done Definition

1. Repo config can express both PASS-required commands and meta-review-approve-required commands.
2. New bubble configs persist both resolved command policies so runtime does not re-read repo defaults.
3. Code-scope PASS validation runs only `commands.validation_required`.
4. Meta-review approve finalization runs `commands.meta_review_approve_required` before `human_gate_approve`.
5. Failure in the meta-review approve validation gate prevents `human_gate_approve` and records actionable diagnostics.
6. The Pairflow repo `pairflow.toml` uses the new split policy.

## Guiding Principles

1. Business invariant: validation policy must preserve fast feedback during implementation while keeping full-suite confidence at the final approval boundary.
2. Control model: repo-root `pairflow.toml` is create-time default authority; created bubble `bubble.toml` is runtime validation authority.
3. Read-path rule: lifecycle commands read validation policy from the created bubble config.
4. Forbidden fallback: runtime must not re-read repo config or infer missing approve-gate commands from prompt prose.
5. Allowed resolution path: bubble create resolves repo defaults into `bubble.toml`; later PASS and meta-review gate consume that persisted policy.
6. Missing-data rule: absent approve-gate policy preserves current behavior; invalid or unresolved configured command ids fail fast.
7. Sequencing / boundary note:
   - producer-first rule: config schema and bubble materialization must land before runtime gate consumption.
   - downstream consume families that remain separate: UI read-model surfacing can be deferred unless existing status output breaks.
   - cleanup/recovery timing: no new cleanup semantics are required in this plan.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/archive/plans/2026-04-29-repo-level-validation-profile-plan-v2.md`
   - `pairflow.toml`
   - `src/config/repoConfig.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/application/create/repoValidationProfileResolver.ts`
   - `src/v11/application/pass/passValidationGate.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `docs/reviewer-evidence-governance.md`
2. Closed canonical elements / terms:
   - `validation.required` remains the create-time source for PASS-required command ids.
   - `commands.validation_required` remains the runtime source for PASS validation.
   - `bubble.toml` remains runtime validation authority.
3. Explicitly authorized reinterpretation: add a separate create-time and runtime policy for meta-review approve validation without changing PASS policy semantics.
4. Downstream task impact: `1-meta-approve-validation-gate` owns the first implementation slice.

## Current Status

### Completed Work

1. Repo-level validation profiles already support custom command ids such as `fitness`.
2. PASS validation already executes configured `commands.validation_required` for code bubbles.
3. Meta-review gate already owns the `human_gate_approve` routing boundary.

### Open Work

1. Add a separate approve-gate validation policy.
2. Materialize that policy into new bubble configs.
3. Execute the policy at the meta-review approve boundary.
4. Update Pairflow repo validation defaults.

### Deferred / Future Work

1. UI display of approve-gate validation status.
2. Evidence reuse between PASS validation and approve-gate validation.
3. Per-target approve-gate policies beyond the first persisted command-id list.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-meta-approve-validation-gate` | `plans/tasks/1-meta-approve-validation-gate.md` | Add and consume separate meta-review approve validation policy. | Repo-level validation profile V2 baseline | PASS-loop vs full-test approval split | approved |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Separate config contract | `1-meta-approve-validation-gate` | Adds repo and bubble config fields. |
| Runtime approve-gate execution | `1-meta-approve-validation-gate` | Runs before `human_gate_approve`. |
| Pairflow repo policy update | `1-meta-approve-validation-gate` | Moves full `pnpm test` out of PASS required list. |

## Dependencies and Order

1. Implement as one bounded contract-and-consumer slice because the runtime consumer cannot be correct without the persisted bubble config field.
2. Preserve current behavior when the new approve-gate policy is absent.

## Risks and Assumptions

1. Risk: running the full test after appending or partially persisting meta-review state would create mixed-truth recovery ambiguity. The task must place validation before the `human_gate_approve` side effect.
2. Risk: naming the new field too generically could blur PASS validation and approve validation. The task must keep both policies distinct.
3. Assumption: `fitness` remains in the PASS-loop policy for Pairflow because it is fast and provides architecture feedback.

## Validation Strategy

1. Config parser and renderer tests for the new policy.
2. Create-time resolver tests for repo config materialization.
3. Meta-review gate tests for approve success, approve validation failure, non-approve skip, and clean-rerun-threshold skip.
4. PASS validation tests proving approve-only commands are not run by the PASS loop.
5. Narrow runtime tests before broad suite; full `pnpm test` remains final implementation validation evidence at the approval boundary, not part of the normal PASS loop after the split policy lands.
