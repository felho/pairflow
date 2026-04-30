---
artifact_type: task
artifact_id: task_meta_review_consecutive_clean_runs_read_model_ui_v1
task_family_id: clean-runs-read-model-ui
sequence_key: "3"
task_id: 3-clean-runs-read-model-ui
title: "Meta-Review Consecutive Clean Runs Read-Model and UI"
status: in_progress
phase: phase3
target_files:
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/status/statusCommandViewProjection.ts
  - src/v11/shared/status/remoteBubbleStatusContract.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts
  - src/v11/shared/list/listCommandEntryProjection.ts
  - src/v11/shared/list/listCommandContract.ts
  - src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts
  - src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts
  - src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.ts
  - src/v11/infrastructure/executor/ssh/sshBubbleStatusPayloadSupport.ts
  - src/v11/infrastructure/ui/presenters/bubblePresenter.ts
  - src/v11/infrastructure/ui/routerActionErrorMapping.ts
  - src/v11/infrastructure/ui/routerActionDispatch.ts
  - src/v11/infrastructure/ui/routerActions.ts
  - src/v11/infrastructure/ui/routerHttp.ts
  - src/v11/shared/ports/uiRouter.ts
  - src/types/bubble.ts
  - src/types/ui.ts
  - ui/src/lib/types.ts
  - ui/src/lib/api.ts
  - ui/src/state/useBubbleStore.ts
  - ui/src/components/actions/ActionBar.tsx
  - ui/src/components/actions/ActionBar.test.tsx
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
  - ui/src/state/useBubbleStore.test.ts
  - ui/src/lib/api.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/ui/updateBubbleReviewPolicyForUi.test.ts
  - tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts
  - tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts
prd_ref: null
plan_ref: plans/meta-review-consecutive-clean-runs-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: clean-runs-read-model-ui-doc
impl_bubble_id: clean-runs-read-model-ui-impl
supersedes: []
superseded_by: null
archive_group: 2026-04-27-meta-review-consecutive-clean-runs-plan-v1
---

# Task: Meta-Review Consecutive Clean Runs Read-Model and UI

## L0 - Policy

### Goal

Expose the configured meta-review clean-run requirement and current clean-run streak through operator read models and the UI, and replace the plain meta-review severity control with an exact compact quality preset mapping.

This task consumes the policy/state foundation from Task 1 and the gate-routing behavior from Task 2. It must not change clean-run routing semantics, auto-rework budget semantics, or state schema shape.

### Domain / Control Model Summary

1. Business invariant: operators must be able to see why a meta-review gate is still rerunning or why human approval is unlocked by comparing the configured required clean-run count with the current streak.
2. Control model: `review_policy.meta_review_consecutive_clean_runs_required` is the configured requirement, `meta_review.consecutive_clean_runs` is the persisted current streak, and `review_policy.meta_review_auto_rework_min_severity` remains the threshold part of the quality preset.
3. Read-path rule: status/list/remote/UI projections must read requirement through normalized review-policy runtime state and current streak through normalized meta-review snapshot/state views. They must not reconstruct streak from transcript prose, recommendation wording, previous human-gate state, runtime pane text, UI labels, or `auto_rework_count`.
4. UI write-path rule: the compact UI control writes exact supported backend pairs only:
   - `P1` -> `(meta_review_auto_rework_min_severity=P1, meta_review_consecutive_clean_runs_required=1)`
   - `P2` -> `(P2, 1)`
   - `P3` -> `(P3, 1)`
   - `P3+2` -> `(P3, 2)`
5. Missing-data rule: missing requirement normalizes to `1`; missing streak normalizes to `0`; unsupported backend pairs such as `(P2, 2)` must project to a non-misleading custom/unsupported UI state, not to one of the supported preset labels.
6. Phase boundary:
   - contract closure: completed by Task 1
   - internal execution closure: completed by Task 2
   - read-model closure: this task owns status/list/remote/UI projection and UI mutation mapping
   - docs/final validation closure: successor Task 4

### Plan Linkage

1. Parent plan gaps closed:
   - operator visibility into clean-run requirement vs current streak
   - compact single-dropdown UI encoding for supported quality presets
   - UI naming/copy that reflects threshold-plus-streak quality semantics
2. Depends on:
   - archived `1-clean-runs-policy-state.md`
   - archived `2-clean-runs-gate-routing.md`
3. Unlocks / impacts successors:
   - Task 4 can document final behavior and close the validation matrix after read-model/UI behavior exists.
4. Task-list impact: creates `3-clean-runs-read-model-ui`.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - `src/v11/shared/metaReview/metaReviewSnapshot.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts`
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
   - `src/v11/shared/status/remoteBubbleStatusContract.ts`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts`
   - `src/v11/defaults/ui/updateBubbleReviewPolicyForUi.ts`
   - `src/v11/infrastructure/ui/routerActionErrorMapping.ts`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/types/ui.ts`
   - `ui/src/state/useBubbleStore.ts`
   - `ui/src/components/actions/ActionBar.tsx`
2. Canonical elements:
   - requirement: `meta_review_consecutive_clean_runs_required`
   - current streak: `consecutive_clean_runs`
   - threshold: `meta_review_auto_rework_min_severity`
   - reviewer blocking severity remains separate from the meta-review quality preset unless an existing UI write path explicitly keeps them aligned.
3. Guard elements:
   - runtime-aligned review-policy diagnostics must still hide or guard policy detail when live runtime authority is closed or invalid according to existing status rules.
   - remote status payload validation must fail closed on invalid new fields instead of silently accepting malformed read-model truth.
4. Compat elements:
   - existing configurations without stored `meta_review_consecutive_clean_runs_required` still project requirement `1`.
   - existing states without stored `consecutive_clean_runs` still project streak `0`.
5. Forbidden reinterpretations:
   - do not treat `auto_rework_count` as clean streak.
   - do not display unsupported backend pairs as `P1`, `P2`, `P3`, or `P3+2`.
   - do not make the UI preset label the backend authority.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `statusCommandViewBuilder` currently projects `reviewPolicy` and `metaReview` separately.
   - `listCommandEntryProjection` currently projects normalized review policy and meta-review runtime delivery into list entries.
   - `reviewPolicyRuntime` owns normalized runtime policy view.
   - `updateBubbleReviewPolicy` already accepts `meta_review_consecutive_clean_runs_required` in patches.
   - `buildSharedUiReviewPolicyPatch` is the current shared UI helper for review-policy updates and intentionally maps the existing single severity control to both reviewer-blocking and meta-review auto-rework severities; this task must either preserve that alignment explicitly or replace it with a typed quality-preset input that still writes an exact backend pair.
   - `updateBubbleReviewPolicyForUi`, `routerActionErrorMapping`, `ports/uiRouter`, and `src/types/ui.ts` carry review-policy update inputs/results and conflict payloads back to the UI.
   - `ui/src/state/useBubbleStore.ts` normalizes `reviewPolicy` but currently omits requirement/preset semantics.
   - `ActionBar` owns the operator review-policy control surface.
2. Actual touched scope: read-model projection and UI mutation/normalization only.
3. Hidden scope ruled out:
   - no config parser/schema additions
   - no gate finalization/rerun routing changes
   - no docs completion beyond this task artifact
4. Why this bounded task matches reality: the backend authority and routing already exist; the remaining gap is consumer-family alignment across status/list/remote/UI and exact UI write mapping.

### Authority Boundary Map

1. Authority producer: Task 1 review-policy/state normalization and Task 2 meta-review finalization.
2. Persisted authority: `bubble.toml` review policy and `state.json` meta-review snapshot.
3. Internal execution consumers: out of scope except preserving existing mutation eligibility and update helpers.
4. Workflow orchestration consumers: status/list payloads must expose enough truth for operators without changing lifecycle routes.
5. Read-model consumers: CLI status/list, UI API payloads, UI store, and action components.
6. Cleanup/recovery consumers: remote status/cache compatibility only where read-model payloads cross process boundaries.

### Baseline Preservation

1. Must-preserve behaviors:
   - existing status behavior that omits `reviewPolicy` in closed runtime states.
   - existing guarded/enabled support status semantics.
   - existing review-loop mode behavior.
   - existing reviewer-blocking threshold semantics.
   - existing conflict handling for review-policy updates.
2. Allowed replacement:
   - the UI-facing meta-review threshold control may be renamed/reframed as a quality preset control when it writes exact supported backend pairs.
3. Forbidden regression interpretations:
   - unsupported pairs must not be collapsed to the nearest supported preset.
   - status/list must not hide current streak when meta-review authority is active and state is otherwise valid.
   - closed status detail states must not drop `metaReview.consecutive_clean_runs` just because live `reviewPolicy` remains omitted.
   - updating `P3+2` must not update only severity while leaving requirement at `1`.

### Success / Completion Proof Boundary

1. Current proof source: normalized backend fields exist, but read-model/UI consumers cannot observe or write the combined requirement/streak contract.
2. Target proof source: status/list/remote/UI payloads expose requirement and streak, and UI update paths write exact preset pairs.
3. Final truth surfaces affected:
   - local status JSON/text/table as applicable
   - local list JSON/UI payload projection
   - remote status payload validation/cache projection
   - UI store/API/action controls
4. Mixed-truth surfaces allowed: none; UI labels must derive from exact backend pairs.

### Precondition and Side-Effect Boundary

1. Preconditions before UI write:
   - selected preset is one of the supported exact values.
   - mutation eligibility and conflict checks still pass.
2. Side effects:
   - write `meta_review_auto_rework_min_severity`
   - write `meta_review_consecutive_clean_runs_required`
   - preserve or intentionally update reviewer blocking severity only according to the existing UI policy contract.
3. Invalid/precondition-failure behavior:
   - invalid preset is rejected client-side or by shared validation.
   - unsupported backend pair projects as custom/unsupported read-only state, not as a supported preset.

### In Scope

1. Ensure review-policy runtime/read-model types expose `meta_review_consecutive_clean_runs_required` through every status/list/UI presenter boundary that carries `reviewPolicy`.
2. Extend meta-review status/list/UI summaries to include current `consecutive_clean_runs`.
3. Extend remote status payload parsing/validation for the new read-model fields.
4. Add an exact quality preset model for `P1`, `P2`, `P3`, and `P3+2`.
5. Update UI controls, labels, tooltips, and mutation payloads to use quality preset semantics.
6. Add fallback/custom projection for unsupported backend pairs.
7. Add tests for status/list/read-model/UI mapping and update behavior.

### Out of Scope

1. Config parser/default/schema changes already completed by Task 1.
2. Meta-review gate routing changes already completed by Task 2.
3. Documentation/spec finalization belongs to Task 4.
4. New preset values beyond `P1`, `P2`, `P3`, and `P3+2`.
5. Remote execution behavior changes beyond read-model payload compatibility.

### Safety Defaults

1. Requirement defaults to `1`.
2. Current streak defaults to `0`.
3. Unsupported pair projection is explicit and non-misleading.
4. Existing mutation conflict handling remains fail-closed.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - review-policy runtime payload shape
   - meta-review status/list summary payload shape
   - UI list/detail read-model payload shape
   - UI review-policy mutation shape
   - remote status payload validation/cache shape

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `8`
8. `single-task allowed`: `yes, because producer/routing closure is already archived and this task owns one consumer-family alignment slice`
9. If `no`, required split: `N/A`
10. Identity/join note:
    - exact preset identity is the backend pair `(meta_review_auto_rework_min_severity, meta_review_consecutive_clean_runs_required)`.
11. Authority/source-of-truth note:
    - backend normalized policy/state remain authority; UI preset labels are projection only.
12. Closure-budget triage:
    - closure buckets touched: read_model_consumers, shared UI mutation contract, remote payload compatibility.
    - explicitly deferred closures: docs/final validation.
13. Bounded-task-shape decision:
    - primary shape: activation_or_read_model
    - secondary shape: consumer_family_alignment
    - why this bounded mix is safe: all changes consume already-established authority and do not reopen producer or routing logic.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Requirement visibility | Operators can see required clean runs | include `meta_review_consecutive_clean_runs_required` in normalized review-policy read models | P1 | required-now |
| Streak visibility | Operators can see current streak | include `consecutive_clean_runs` in meta-review status/list/UI summaries | P1 | required-now |
| Exact preset identity | Preset equals backend pair | derive selected preset only from exact pair match | P1 | required-now |
| Unsupported fallback | Unsupported pair is not mislabeled | project custom/unsupported UI state | P1 | required-now |
| UI write pair | Preset writes threshold and requirement together | update shared patch builder/API payload | P1 | required-now |
| Baseline preservation | Existing guarded/closed-runtime behavior remains | do not force policy projection into closed states | P1 | required-now |

### 1) Required Behavior

| Scenario | Required Result | Priority |
| --- | --- | --- |
| Status/list for active meta-review authority with requirement `2`, streak `1` | payload exposes requirement `2` and streak `1` | P1 |
| Legacy config/state missing fields | requirement `1`, streak `0` | P1 |
| UI reads `(P1,1)` | preset `P1` | P1 |
| UI reads `(P2,1)` | preset `P2` | P1 |
| UI reads `(P3,1)` | preset `P3` | P1 |
| UI reads `(P3,2)` | preset `P3+2` | P1 |
| UI reads `(P2,2)` | custom/unsupported, not `P2` | P1 |
| UI reads unsupported backend pair `(P2,2)` | custom/unsupported state displays raw threshold `P2` and required clean runs `2` | P1 |
| UI writes `P3+2` | patch writes `meta_review_auto_rework_min_severity=P3` and `meta_review_consecutive_clean_runs_required=2` | P1 |
| Conflict response includes new field | UI normalizes and displays the current backend truth | P1 |
| UI write receives unknown preset | client/router/shared validation rejects before mutation | P1 |
| Remote status payload includes new fields | parser validates and projects them | P1 |

### 2) Implementation Constraints

1. Reuse `normalizeBubbleReviewPolicy` for requirement defaults on backend/server read-model and presenter paths; UI store code consumes those normalized outputs and validates conflict payload shape but must not own an independent defaulting rule.
2. Reuse normalized meta-review snapshot helpers for streak defaults.
3. Keep review-policy mutation eligibility unchanged.
4. Keep `reviewer_blocking_min_severity` behavior explicit:
   - default decision for this task: preserve the existing shared-control behavior unless the implementation adds a dedicated reviewer-blocking control in the same change.
   - under the default shared-control path, `P1`/`P2`/`P3` write reviewer blocking severity and meta-review severity to the same selected severity, and `P3+2` writes reviewer blocking severity `P3`, meta-review threshold `P3`, and requirement `2`.
   - split-control is allowed only if a dedicated reviewer-blocking control exists in the final UI; then selecting `P3+2` must leave reviewer blocking severity unchanged and tests must prove the split is intentional.
   - in both paths, the clean-run count must never be interpreted as reviewer-blocking policy.
5. Do not introduce string parsing from UI labels to backend values outside a typed preset map.
6. Do not add documentation-only completion here; leave final docs to Task 4.

### 3) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `BubbleReviewPolicyRuntimeView` | status/list/UI/API tests | additive | preserve/project existing requirement field through every consumer boundary | docs in Task 4 |
| meta-review status/list summary | status/list/UI state | additive | add current streak field | docs in Task 4 |
| UI review-policy patch | UI action/API/router | additive/behavioral | add quality preset exact mapping | none |
| remote status payload | SSH status/cache parser | additive | validate/project new fields | docs in Task 4 |

### 4) Acceptance Criteria

1. Status/list/UI summaries expose configured clean-run requirement and current streak for local list entries, remote-cache list entries, active runtime status detail, and UI list/detail payloads; closed status detail states still omit live `reviewPolicy` exactly as before while preserving `metaReview.consecutive_clean_runs`.
2. Legacy missing fields normalize to requirement `1` and streak `0` in backend status/list/read-model outputs, and UI store normalization preserves those backend-normalized values without inventing a second UI-only default.
3. UI preset mapping is exact for `P1`, `P2`, `P3`, and `P3+2`.
4. Unsupported backend pairs project to an explicit custom/unsupported UI state and keep their raw threshold/requirement visible enough that an operator is not shown a false supported preset.
5. UI update path writes both `meta_review_auto_rework_min_severity` and `meta_review_consecutive_clean_runs_required` for selected presets.
6. Remote status payload validation covers the new fields and rejects malformed requirement/streak values instead of silently dropping them.
7. Existing guarded/closed-runtime review-policy projection tests continue to pass.
8. Conflict responses from review-policy mutation preserve the new requirement/preset truth when the backend returns current policy state after a conflict.
9. Unknown preset values are rejected before any review-policy mutation is dispatched.

## L2 - Implementation Plan

1. Backend read-model contracts:
   - Confirm `BubbleReviewPolicyRuntimeView` already includes `meta_review_consecutive_clean_runs_required`; if it does, do not rework the runtime authority, only preserve it through status/list/UI presenter types.
   - Add `consecutive_clean_runs: number` to `StatusMetaReviewView` in `statusCommandViewProjection.ts` and to `BubbleListEntry["metaReview"]` in `listCommandContract.ts`.
   - Keep `statusCommandTypes.ts` limited to status-state/input typing unless implementation needs a narrow supporting type; do not move `StatusMetaReviewView` there.
   - Build the streak value from `metaReviewSnapshot.ts`, `metaReviewGateSnapshotHelpers.ts`, or equivalent canonical state normalization, with missing field -> `0`.
   - Add an explicit regression assertion that status/list/read-model projection never derives `consecutive_clean_runs` from `auto_rework_count`.
2. Status/list projection:
   - Extend `buildStatusMetaReviewView` to include current streak.
   - Extend local list entries to include current streak.
   - Extend created/cached remote list entries so they either project cache truth or the safe default `0` without fabricating active authority.
   - Keep `reviewPolicy` omitted in status detail states that already suppress live runtime policy.
   - Preserve `metaReview.consecutive_clean_runs` in closed status detail projections even when live `reviewPolicy` is omitted, so AC #1 does not depend on policy visibility.
   - Add a positive active-authority status/list test where requirement `2` and streak `1` are both visible while meta-review authority is active, covering the forbidden regression that active streak visibility must not disappear.
3. Remote status payload:
   - Extend `RemoteBubbleStatusSnapshot` compatibility and `sshBubbleStatusPayload` parsing for the additive review-policy requirement and meta-review streak fields.
   - Validate requirement as integer `>= 1` and streak as integer `>= 0`.
   - Treat malformed remote payloads as invalid payload errors; do not normalize bad values to defaults.
4. UI data contracts and store normalization:
   - Add requirement and current streak to `src/types/ui.ts` and `ui/src/lib/types.ts` in the same UI objects that currently carry review-policy and meta-review summaries.
   - Update `bubblePresenter.ts` list/detail presenter output so backend-normalized requirement and streak are present in the UI read-model payload before `useBubbleStore` sees it.
   - Update `useBubbleStore` normalization for list payloads, detail payloads, and 409 conflict payloads so UI list/detail propagation in AC #1 is explicit.
   - Single-owner boundary for 409 review-policy conflicts: `routerActionErrorMapping.ts` owns canonical conflict-detail construction and must populate both `details.bubble.reviewPolicy` and `details.reviewPolicyConflict.reviewPolicy` from the same current backend review-policy truth, including requirement and exact/custom preset projection.
   - `useBubbleStore` consumes, validates, and preserves the router-provided conflict detail; it may reject or warn on malformed payloads, but it must not repair divergence between `details.bubble.reviewPolicy` and `details.reviewPolicyConflict.reviewPolicy` with a second source of truth.
   - Preserve unsupported backend pairs as explicit unsupported/custom state instead of coercing them to a supported preset, and keep raw threshold/requirement values in store state for component rendering and tests.
   - Treat backend-normalized missing-field defaults as authoritative input; UI store code may validate shape but must not create a separate hidden defaulting rule that masks backend projection failures.
5. UI quality preset model:
   - Add a typed preset union for `P1`, `P2`, `P3`, `P3+2`, plus an explicit unsupported/custom projection state.
   - Centralize the exact map:
     - `P1` -> `(meta_review_auto_rework_min_severity=P1, meta_review_consecutive_clean_runs_required=1)`
     - `P2` -> `(P2, 1)`
     - `P3` -> `(P3, 1)`
     - `P3+2` -> `(P3, 2)`
   - Derive selected preset only from exact backend pair equality.
6. UI mutation route:
   - Extend `SharedUiReviewPolicyPatchInput`, `UiUpdateBubbleReviewPolicyInput`, UI action input, API client body, router body parser, router dispatch, local update path, and remote review-policy command input so quality preset writes both backend fields.
   - Add a typed `metaReviewConsecutiveCleanRunsRequired` or quality-preset-derived equivalent to the shared UI patch path; `P3+2` must reach `updateBubbleReviewPolicy` as `meta_review_auto_rework_min_severity=P3` and `meta_review_consecutive_clean_runs_required=2`.
   - Preserve the existing reviewer-blocking/meta-review severity alignment by default. If the implementation introduces a dedicated reviewer-blocking control, switch to the split-control path and make that control the trigger for leaving reviewer blocking severity unchanged.
   - Under the default shared-control path, `P3+2` writes reviewer blocking severity `P3` while clean-run requirement remains meta-review-only authority.
   - Under the allowed split-control path, `P3+2` leaves reviewer blocking severity unchanged; document this in code/test names as an intentional baseline-preservation decision.
   - Reject unknown preset values before dispatch and before shared patch construction; tests must assert no update call is made for an unknown preset.
7. `ActionBar` UI:
   - Replace the plain "Meta auto-rework severity" select with quality-preset language.
   - Include `P3+2` as a selectable value.
   - Show unsupported/custom backend pairs as non-misleading disabled/custom state rather than selecting `P1`, `P2`, `P3`, or `P3+2`.
   - For unsupported/custom backend pairs, display the raw threshold and required clean-run count near the control, for example threshold `P2` plus required clean runs `2`, so AC #4 is satisfied by visible operator truth rather than only an internal enum.
   - Surface current streak/requirement compactly where the control already appears, without adding a separate broad configuration panel.
   - Update `BubbleExpandedCard` to display the same current streak/requirement summary or unsupported/custom pair detail when the expanded card renders review-policy/meta-review status outside the action row.
8. Tests:
   - Status/list tests cover requirement `2`, streak `1`, active-authority streak visibility, missing-field defaults, and closed-state policy omission with streak preservation.
   - Status/list tests include a named `does not derive clean-run streak from auto_rework_count` regression case.
   - Remote status tests cover valid additive fields plus malformed requirement/streak rejection.
   - Shared update-policy tests cover requirement patch validation, exact pair writes, unknown preset rejection before mutation, default shared-control `P3+2` reviewer-blocking severity `P3`, and split-control reviewer-blocking preservation only if a dedicated reviewer-blocking control is implemented.
   - Router/API/store tests cover request body, `updateBubbleReviewPolicyForUi` and `routerActionErrorMapping` conflict payload normalization, including an equality assertion that `details.bubble.reviewPolicy` and `details.reviewPolicyConflict.reviewPolicy` carry identical current backend review-policy truth after router construction; store tests then assert the UI preserves that truth without inventing a second owner, plus unsupported pair preservation and raw threshold/requirement retention in store state.
   - `tests/core/ui/bubblePresenter.test.ts` covers presenter list/detail output carrying backend-normalized requirement/streak truth for UI consumers.
   - `ActionBar` tests cover supported preset rendering, `P3+2` write payload, unsupported pair display with raw threshold/requirement values, disabled/no-revision behavior, unknown preset rejection, and unchanged loop-mode behavior.
   - `BubbleExpandedCard` tests cover streak/requirement display and unsupported/custom pair detail when the expanded card renders review-policy/meta-review status.
9. Run after implementation:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test tests/core/bubble/statusBubble.test.ts tests/core/bubble/listBubbles.test.ts tests/core/ui/updateBubbleReviewPolicyForUi.test.ts tests/core/ui/bubblePresenter.test.ts tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts ui/src/state/useBubbleStore.test.ts ui/src/components/actions/ActionBar.test.tsx ui/src/components/canvas/BubbleExpandedCard.test.tsx ui/src/lib/api.test.ts`
   - `pnpm build`

### L2 Target Mapping

| Target / Boundary | Covered By L2 Step | Required Test Signal |
| --- | --- | --- |
| `statusCommandViewProjection.ts`, `statusCommandViewBuilder.ts` | Steps 1-2 | status tests assert active-authority streak visibility and streak remains in `metaReview` while closed states omit live `reviewPolicy` |
| `metaReviewSnapshot.ts`, `metaReviewGateSnapshotHelpers.ts` | Steps 1-2 | status/list tests prove streak comes from normalized meta-review snapshot helpers, not `auto_rework_count` |
| `reviewPolicyRuntime.ts`, `src/types/bubble.ts` | Steps 1, 4, and 8 | status/list/UI tests prove the existing requirement field is preserved through runtime review-policy views and shared bubble types without changing runtime authority |
| `remoteBubbleStatusContract.ts`, `sshBubbleStatusPayload.ts`, `sshBubbleStatusPayloadSupport.ts` | Step 3 | remote status tests assert valid additive fields and malformed requirement/streak rejection |
| `listCommandContract.ts`, `listCommandEntryProjection.ts` | Steps 1-2 | list tests assert requirement/streak defaults and active values |
| `bubblePresenter.ts` | Step 4 | `tests/core/ui/bubblePresenter.test.ts` asserts presenter output includes backend-normalized requirement/streak truth for list/detail consumers before UI store normalization |
| `src/types/ui.ts`, `ui/src/lib/types.ts`, `useBubbleStore.ts` | Step 4 | UI/store tests assert list/detail propagation, 409 conflict normalization, unsupported pair preservation, and raw threshold/requirement retention |
| `updateBubbleReviewPolicy.ts`, `updateBubbleReviewPolicyForUi.ts`, `ports/uiRouter.ts`, `routerHttp.ts`, `routerActionDispatch.ts`, `routerActions.ts`, `ui/src/lib/api.ts` | Step 6 | router/API/shared update tests assert quality preset request propagation and exact patch pairs |
| `routerActionErrorMapping.ts` | Steps 4 and 8 | router conflict tests assert this file is the single construction owner for `details.bubble.reviewPolicy` and `details.reviewPolicyConflict.reviewPolicy`, and that both fields are emitted as identical current policy truth including requirement, threshold, and exact/custom preset projection |
| `ActionBar.tsx` | Step 7 | UI component tests assert quality-preset rendering, raw unsupported pair visibility, unknown preset rejection, and streak/requirement display |
| `BubbleExpandedCard.tsx` | Step 7 | UI component tests assert expanded-card streak/requirement display and unsupported/custom pair detail |
| `ActionBar.test.tsx`, `BubbleExpandedCard.test.tsx`, `useBubbleStore.test.ts`, `ui/src/lib/api.test.ts`, `tests/core/ui/bubblePresenter.test.ts`, `tests/core/bubble/statusBubble.test.ts`, `tests/core/bubble/listBubbles.test.ts`, `tests/core/ui/updateBubbleReviewPolicyForUi.test.ts`, `tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts`, `tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts` | Steps 1-8 | each listed test file carries the corresponding required signal above; remove a test file from target_files only if its signal is intentionally moved to another listed test |

## Review Notes

1. Verify that the task does not reopen Task 2 gate routing.
2. Verify exact unsupported-pair behavior; nearest-match projection is a blocker.
3. Verify `P3+2` writes requirement `2`, not only severity `P3`.
4. Verify closed-state status behavior still omits live review policy where existing rules require omission.
5. Verify status/list/read-model projection does not reintroduce `auto_rework_count` as a streak source.
6. Verify remote/cache code treats invalid remote streak/requirement values as payload-invalid rather than lossy compatibility.

## Review Approval

CreatePairflowSpec `ReviewSpec` task-mode approval recorded during `ExecutePairflowPlan` orchestration:

1. Execution metadata gate passed for task identity, filename, parent plan tracker, lineage, and bubble linkage fields.
2. Target-file reality check supports the bounded read-model/UI consumer-alignment shape: status/list/remote/UI projections and the UI review-policy mutation surface are the relevant consumers.
3. Control-model, closed-contract drift, authority fan-out, closure-budget, and bounded-task-shape checks are satisfied because Task 1 owns authority production and Task 2 owns gate routing; this task consumes those closed contracts without reopening them.
4. Remaining downstream Task 4 remains viable as docs/final validation after read-model/UI behavior lands.
