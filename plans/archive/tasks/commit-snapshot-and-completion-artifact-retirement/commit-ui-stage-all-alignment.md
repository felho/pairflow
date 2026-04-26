---
artifact_type: task
artifact_id: task_commit_ui_stage_all_alignment_v1
title: "Commit UI Stage-All Alignment"
status: implementable
phase: phase3b
target_files:
  - "src/v11/infrastructure/ui/routerHttpBody.ts"
  - "src/v11/infrastructure/ui/routerActionDispatch.ts"
  - "src/v11/shared/ports/uiRouter.ts"
  - "ui/src/lib/types.ts"
  - "ui/src/lib/api.ts"
  - "ui/src/state/useBubbleStore.ts"
  - "ui/src/components/actions/ActionBar.tsx"
  - "ui/src/components/actions/CommitForm.tsx"
  - "tests/core/ui/router.test.ts"
  - "tests/core/ui/server.integration.test.ts"
  - "ui/src/lib/api.test.ts"
  - "ui/src/state/useBubbleStore.test.ts"
  - "ui/src/components/actions/ActionBar.test.tsx"
  - "ui/src/components/actions/CommitForm.test.tsx"
prd_ref: null
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Commit UI Stage-All Alignment

## Revision Log

1. `2026-04-25` (initial task): created from `commit-cli-stage-all-cutover` route-back review. This task owns Phase 3B UI-router/frontend consumer-family alignment after Phase 3A introduces CLI/application `stageAll`.
2. `2026-04-25` (task review refinement): tightened the Phase 3A prerequisite gate, made legacy HTTP `auto` rejection independent from `stageAll` presence including dual-field ambiguity, added call-site reality notes for current UI store/form/router producers, added the read-only CS3a prerequisite probe, and expanded explicit UI submission/default test coverage.
3. `2026-04-25` (docs-only implementer refinement): recorded target-file reality for the missing direct `CommitForm.test.tsx` test file, clarified the in-scope vs out-of-scope `auto` rule, tightened CS8/T7/T8 to require direct `CommitForm` test coverage, and gave the refs placeholder a positive replacement contract.

## L0 - Policy

### Goal

Move the first-party UI-router HTTP/action path and UI frontend request producers from temporary `auto` staging input to `stageAll`.

The behavior remains the same UI staging behavior: when the UI submits stage-all enabled, Pairflow stages all current worktree changes before committing. The rename must not alter commit authority, transcript payload shape, remote transport behavior, or done-package continuity.

### Domain / Control Model Summary

1. Business invariant: UI commit controls staging only; commit completion authority remains the git commit facts and transcript/state transition owned by earlier phases.
2. Control model: `stageAll` is the UI/router request field that controls `git add -A` before commit.
3. Read-path rule: first-party UI labels, client payloads, store actions, and HTTP router input use stage-all language.
4. Forbidden fallback: public UI-router HTTP `auto` must not silently map to `stageAll`.
5. Allowed resolution path: UI-router rejects legacy `auto` clearly; UI frontend sends `stageAll`.
6. Missing-data rule: if the HTTP boundary requires an explicit boolean, missing `stageAll` is an input error. If a store/form default is applied before HTTP submission, the default must be explicit and tested.
7. Phase boundary:
   - `consumer_family_alignment`: UI-router and UI frontend only.
   - `shared_contract`: UI/router port and HTTP body contract.
   - `internal_execution`: existing application commit call remains unchanged except it receives `stageAll`.
   - `remote_transport`: out of scope.
   - `event_payload`: out of scope.

### Plan Linkage

1. Parent plan gap closed: Phase 3B, `commit-ui-stage-all-alignment`.
2. Depends on Phase 3A `commit-cli-stage-all-cutover`, which introduces application `stageAll`.
3. Unlocks Phase 4 by removing UI/router dependence on temporary application `auto` compatibility.

### Canonical Contract Anchors

1. Source anchors:
   - `src/v11/infrastructure/ui/routerHttpBody.ts`: HTTP commit body parser.
   - `src/v11/infrastructure/ui/routerActionDispatch.ts`: UI action dispatch to `commitBubble`.
   - `src/v11/shared/ports/uiRouter.ts`: UI-router commit input port.
   - `ui/src/lib/types.ts`, `ui/src/lib/api.ts`, `ui/src/state/useBubbleStore.ts`, `ui/src/components/actions/ActionBar.tsx`, `ui/src/components/actions/CommitForm.tsx`: UI request producers.
2. Canonical elements:
   - `stageAll`: UI/router request field meaning "stage all current worktree changes before commit".
3. Compat elements:
   - application-level `auto` may still exist after Phase 3A for remote compatibility, but UI/router must stop using it.
4. Forbidden reinterpretations:
   - do not make `stageAll` mean done-package generation;
   - do not preserve HTTP `auto` as an alias;
   - do not alter remote command construction or remote result parsing;
   - do not change local commit finalization authority.

### Scope Reality / Shape Proof

1. Inspected entrypoints:
   - `parseCommitBody` currently requires boolean `auto`.
   - UI action dispatch forwards `auto`.
   - `UiCommitBubbleInput.auto` carries the router port field.
   - UI client/store/action/form currently use `auto`, including store default behavior.
   - `CommitForm` owns the visible checkbox state and label and currently submits `auto`.
   - `ActionBar` maps the `CommitForm` submit payload into `RunBubbleActionInput` and currently forwards `auto`.
   - `useBubbleStore` currently applies the default before calling the API client with `auto: input.auto ?? true`.
   - `ui/src/components/actions/CommitForm.test.tsx` is not present in the current tree; because it is listed in `target_files`, this task must create it for direct `CommitForm` coverage.
   - In-scope `auto` symbols/identifiers/strings are only those reachable from CS1-CS8 and referring to the UI commit staging request field. Out-of-scope `auto` terms include unrelated UI/repo/runtime concepts such as repo auto-registration, attach auto-restart hints, meta auto-rework controls, and CSS utility text like `mt-auto`.
   - Remote/application temporary `auto` compatibility internals are separately out of scope by the Phase 4 remote boundary, the `CommitBubbleInput` compat note, and HB1.
2. Actual touched scope: UI/router request field rename plus direct UI producer tests.
3. Mutation boundary: UI dispatch still calls the same commit mutation after request validation; no transcript, state, git commit, or remote behavior changes are introduced here.
4. Hidden scope ruled out:
   - CLI parser/help,
   - application local commit staging semantics,
   - remote SSH command construction,
   - remote marker parsing/sync-back,
   - lifecycle/event metadata cleanup,
   - prompt/docs cleanup.
5. Bounded-task shape: primary `consumer_family_alignment`; secondary `activation_or_read_model` for UI labels/forms. This is safe because all in-scope paths are UI/router request producers/validators for the same field.

### Authority Boundary Map

1. `authority_producer`: out of scope; commit producer remains Phase 2.
2. `persisted_authority`: unchanged.
3. `internal_execution_consumers`: only the UI-router call into existing application commit.
4. `workflow_orchestration_consumers`: UI action dispatch/store path in scope.
5. `read_model_consumers`: UI form/label wording in scope.
6. `cleanup_recovery_consumers`: out of scope.

### Baseline Preservation

1. Must preserve:
   - UI commit action still submits the same bubble id, message, refs, and stage-all intent.
   - UI default staging behavior remains equivalent to the previous `auto` default unless explicitly changed with product justification.
   - HTTP invalid request handling remains fail-closed before mutation.
   - application commit result shape remains Phase 2 technical facts without `donePackagePath`.
2. Intentionally replaced:
   - `UiCommitBubbleInput.auto`;
   - HTTP commit body `auto`;
   - UI client/store/action/form `auto` payload and labels.
3. Forbidden regressions:
   - no hidden HTTP `auto` alias;
   - no acceptance of dual-field HTTP bodies containing both `stageAll` and legacy `auto`;
   - no mutation call after invalid legacy body;
   - no remote transport change.

### Precondition and Side-Effect Boundary

1. Preconditions before UI-router mutation dispatch:
   - body parses successfully;
   - `stageAll` is a valid boolean according to the parser contract;
   - legacy `auto` is absent.
2. Side effects forbidden before validation:
   - no `commitBubble` call;
   - no state transition;
   - no git operation.
3. Side effects unchanged after validation:
   - dispatch calls existing `commitBubble` with `stageAll`.

### In Scope

1. Replace `UiCommitBubbleInput.auto` with `stageAll`.
2. Replace HTTP commit body parsing from `auto` to `stageAll`.
3. Reject legacy HTTP `auto` clearly.
4. Update UI router dispatch to forward `stageAll`.
5. Update UI client request body to send `stageAll`.
6. Update UI store action input/defaults to use `stageAll`.
7. Update `ActionBar` and `CommitForm` submitted payload and visible label text to stage-all language.
8. Replace the live `CommitForm` refs placeholder/example away from `artifacts/done-package.md` to `artifacts/commit-evidence.md` because the form wording surface is already in scope for this UI read-model alignment.
9. Update router/server/UI API/store/action tests, including store default behavior.

### Out of Scope

1. CLI `--stage-all` parser/help.
2. Application local commit staging semantics except receiving `stageAll`.
3. Remote SSH command construction.
4. Remote result parsing/sync-back.
5. Protocol `DONE_PACKAGE` hard removal.
6. Lifecycle/event metadata key cleanup.
7. Broad docs/prompt cleanup.
8. Editing application commit contracts or behavior for the CS3a prerequisite probe; Phase 3B may inspect `CommitBubbleInput` but must not patch application-layer files.

### Safety Defaults

1. Legacy HTTP `auto` fails clearly and does not dispatch mutation.
2. Legacy HTTP `auto` must be rejected whenever present, including bodies that also include valid `stageAll`; this prevents ambiguous dual-field requests from being silently accepted.
3. Missing/non-boolean `stageAll` follows the parser's explicit validation rule.
4. If implementation discovers application `stageAll` is not available on `CommitBubbleInput`, stop and route back to Phase 3A instead of reintroducing router-level `auto` compatibility.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: `yes, because this task is limited to one consumer family: UI-router and UI frontend request producers.`
9. Closure buckets touched:
   - `shared_contract`,
   - `workflow_orchestration_consumers`,
   - `read_model_consumers`.
10. Explicitly deferred closures:
   - CLI/application foundation,
   - remote transport/result alignment,
   - event payload cleanup,
   - cleanup/recovery.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Request rule | UI/router sends `stageAll`. | Replace UI/router `auto` request fields. | P1 | required-now |
| Forbidden fallback | HTTP `auto` is not accepted, including dual-field bodies that also contain `stageAll`. | Add rejection tests before mutation dispatch. | P1 | required-now |
| Default rule | UI default staging behavior is explicit. | Preserve previous default as `stageAll` or document intentional change. | P1 | required-now |
| Prerequisite gate | Application `CommitBubbleInput.stageAll` must exist before UI/router migration begins. | Verify Phase 3A contract first; route back if only `auto` exists. | P1 | required-now |
| Remote boundary | Remote is Phase 4. | Do not touch SSH executor/parser/sync-back. | P1 | required-now |

### 1) Call-Site Matrix

| ID | File | Function / Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/infrastructure/ui/routerHttpBody.ts` | `parseCommitBody` | parse required/explicit `stageAll`; reject legacy `auto` clearly | P1 | required-now | router tests |
| CS2 | `src/v11/infrastructure/ui/routerActionDispatch.ts` | commit action dispatch | forward `stageAll` into `commitBubble` | P1 | required-now | router tests |
| CS3 | `src/v11/shared/ports/uiRouter.ts` | `UiCommitBubbleInput` | rename `auto` to `stageAll` | P1 | required-now | typecheck |
| CS3a | `src/v11/application/commit/commitCommandContract.ts` | `CommitBubbleInput` prerequisite probe | confirm Phase 3A already exposes `stageAll`; do not edit this file in Phase 3B | P1 | required-now | typecheck/preflight inspection |
| CS4 | `ui/src/lib/types.ts` | `CommitActionInput` | rename `auto` to `stageAll` | P1 | required-now | UI typecheck |
| CS5 | `ui/src/lib/api.ts` | `commitBubble` request body | send `stageAll`, not `auto` | P1 | required-now | API test |
| CS6 | `ui/src/state/useBubbleStore.ts` | `RunBubbleActionInput` and commit action case | rename store action input field from `auto` to `stageAll`; preserve current `input.auto ?? true` behavior as `input.stageAll ?? true` | P1 | required-now | store test |
| CS7 | `ui/src/components/actions/ActionBar.tsx` | submit path | forward `stageAll` from `CommitForm` into `RunBubbleActionInput` | P1 | required-now | ActionBar test |
| CS8 | `ui/src/components/actions/CommitForm.tsx` | control state/label | rename local state to `stageAll`, keep default checked, submit `stageAll`, use visible stage-all wording without `auto=true`, and replace the live refs placeholder/example with `artifacts/commit-evidence.md` | P1 | required-now | component/typecheck plus direct component test coverage in newly created `ui/src/components/actions/CommitForm.test.tsx` |

### 2) Data And Interface Contract

| Contract | Current | Target In This Task | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| UI HTTP body | `auto: boolean` | `stageAll: boolean` | breaking; legacy `auto` rejected | P1 | required-now |
| UI-router port | `auto?: boolean` | `stageAll?: boolean` | breaking internal UI-router contract | P1 | required-now |
| UI frontend payload | `auto` | `stageAll` | breaking first-party UI payload | P1 | required-now |
| Application input | supports `stageAll` after Phase 3A | unchanged except called with `stageAll` | compatibility handled by Phase 3A/4 | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| HTTP parse | accept valid `stageAll` | accept legacy `auto` as alias | fail before mutation | P1 | required-now |
| HTTP ambiguity | reject any body containing `auto`, even with `stageAll` | silently prefer one field | keeps public boundary breaking and unambiguous | P1 | required-now |
| UI dispatch | call existing `commitBubble` with `stageAll` | mutate before valid body | unchanged mutation boundary | P1 | required-now |
| UI default | preserve previous stage-all default under new name | accidental default flip | store test required | P1 | required-now |
| Remote | none | command construction/parser/sync-back changes | Phase 4 owns remote | P1 | required-now |

### 4) Test Matrix

| ID | Scenario | Setup | Expected Result | Priority | Timing |
|---|---|---|---|---|---|
| T1 | UI HTTP accepts `stageAll`. | commit action body `{ stageAll: true }`. | dispatch calls `commitBubble` with `stageAll: true`. Cover in router unit tests and server integration where commit body validation is already exercised. | P1 | required-now |
| T2 | UI HTTP rejects legacy `auto`. | commit action body `{ auto: true }`. | clear 400/error; no mutation call. Cover in router unit tests and server integration. | P1 | required-now |
| T3 | UI HTTP rejects ambiguous dual-field body. | commit action body `{ stageAll: true, auto: true }`. | clear 400/error naming legacy `auto`; no mutation call. Cover in router unit tests and server integration. | P1 | required-now |
| T4 | UI client sends `stageAll`. | `client.commitBubble(..., { stageAll: true })`. | request body contains `stageAll`, not `auto`. | P1 | required-now |
| T5 | Store preserves default. | commit action from store without explicit override. | payload uses tested `stageAll` default equivalent to prior `auto` default. | P1 | required-now |
| T6 | UI HTTP rejects invalid/missing `stageAll` according to parser policy. | invalid body. | clear validation error; no mutation call. Cover in router unit tests and server integration. | P1 | required-now |
| T7 | ActionBar/CommitForm submit `stageAll`. | user submits commit form with default checkbox state. | submitted payload has `stageAll: true`; no `auto` key is emitted; visible checkbox label is `Stage all changes`; visible label does not say `auto` or `auto=true`; live refs placeholder/example is `artifacts/commit-evidence.md` and does not name `done-package.md`. | P1 | required-now |
| T8 | ActionBar/CommitForm submit disabled stage-all. | user clears the checkbox and submits. | submitted payload has `stageAll: false`; no `auto` key is emitted; the T7 visible-label and refs-placeholder invariants still hold. | P1 | required-now |

Test placement rule: T7/T8 require direct `CommitForm` coverage in newly created `ui/src/components/actions/CommitForm.test.tsx` plus `ActionBar` integration forwarding coverage in `ui/src/components/actions/ActionBar.test.tsx`.

### 5) Shared Contract Compatibility

| Shared Contract | Current Consumers | Additive vs Breaking | Required Alignment | Out-of-Scope Consumers |
|---|---|---|---|---|
| `UiCommitBubbleInput` | router dispatch and UI frontend | breaking | align all UI/router consumers here | non-UI callers |
| HTTP commit body | UI frontend and router tests | breaking | reject legacy `auto` and accept `stageAll` | external clients not separately supported |
| `CommitBubbleInput` | application commit API | already prepared by Phase 3A | call with `stageAll` | remote Phase 4 |

### 6) Closure-Budget Summary

| Item | Value |
|---|---|
| Closure buckets touched | `shared_contract`, `workflow_orchestration_consumers`, `read_model_consumers` |
| Intentionally collapsed closures | UI-router request validation and UI frontend request production |
| Prerequisite-only surface | CS3a is read-only preflight evidence for the Phase 3A application contract; it does not expand Phase 3B edit scope or closure buckets. |
| Explicitly deferred closures | CLI/application foundation, remote transport/result alignment, protocol hard removal, docs/prompt cleanup |
| Safe bounded proof | all touched paths are one consumer family for the same request field. No producer authority, persisted transcript, git mutation ordering, or remote transport behavior changes. |

## L2 - Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Remove any remaining application `auto` compatibility after remote cutover. | L2 | P1 | successor | parent plan | Phase 4 should close remote dependency. |
| HB2 | Update broader docs/release notes for UI wording if needed. | L2 | P3 | later-docs | task drafting | Defer to Phase 5 unless direct UI tests require local text. |

## Preconditions And Assumptions

1. Phase 3A has introduced application `stageAll`; this is a prerequisite gate, not an editable Phase 3B deliverable.
2. The UI's previous default staging behavior should remain functionally equivalent unless product evidence says otherwise.
3. External HTTP clients are not separately supported for backward-compatible `auto` aliasing.
4. The implementation should verify the current `CommitBubbleInput` application contract before editing UI/router consumers; this is anchored by L1 `Prerequisite gate` and `CS3a`. If only `auto` exists in the implementation base, this task is not implementable yet and must route back to Phase 3A.

## Spec Lock

Task state is `IMPLEMENTABLE` only when the CS3a prerequisite probe confirms application `stageAll`, because:

1. The parent plan defines Phase 3B as UI-router/frontend consumer-family alignment.
2. The target files are limited to UI-router and UI frontend request producers/validators.
3. The test matrix covers accepted `stageAll`, rejected legacy `auto`, rejected dual-field ambiguity, default preservation, enabled and disabled UI stage-all submissions, and no mutation on invalid body.
4. Remote transport and commit producer behavior remain successor/predecessor-owned.

This task must be downgraded to `draft` if implementation requires changing CLI parser/help, application `CommitBubbleInput` to add `stageAll`, remote SSH command construction, remote result parsing, protocol validation, lifecycle/event metadata keys, or commit producer authority. A CS3a preflight result showing only application `auto` and no `stageAll` is a prerequisite-unmet route-back trigger, not permission to patch application code in this Phase 3B task.

## Open Questions

No blocking open questions.
