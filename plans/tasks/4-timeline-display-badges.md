---
artifact_type: task
artifact_id: task_timeline_display_badges_v1
task_family_id: timeline-display-badges
sequence_key: "4"
task_id: 4-timeline-display-badges
title: "Timeline Display Badges"
status: approved
phase: phase3
target_files:
  - ui/src/components/expanded/BubbleTimeline.tsx
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - ui/src/test/fixtures.ts
  - src/contracts/ui/uiReadModel.ts
  - ui/src/lib/contracts/uiReadModel.ts
  - src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - tests/v11/infrastructure/ui/presenters/timelinePresenter.test.ts
target_files_role: badge_display_cutover_and_focused_proofs
target_write_files:
  - ui/src/components/expanded/BubbleTimeline.tsx
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - ui/src/test/fixtures.ts
  - src/contracts/ui/uiReadModel.ts
  - ui/src/lib/contracts/uiReadModel.ts
  - src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - tests/v11/infrastructure/ui/presenters/timelinePresenter.test.ts
target_read_only_anchors:
  - plans/2026-05-05-timeline-display-dto-plan-v1.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/1-timeline-rules-fixtures.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/2-timeline-display-contract.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/3-timeline-display-basics.md
prd_ref: null
plan_ref: plans/2026-05-05-timeline-display-dto-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 4-timeline-display-badges-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-timeline-display-dto-plan-v1
---

# Task: Timeline Display Badges

## L0 - Policy

### Goal

Switch badge rendering in `BubbleTimeline.tsx` from raw protocol payload and
metadata interpretation to the backend-produced `entry.display.badges` DTO.

This task owns only findings severity badges, approval decision badges,
meta-review recommendation badges, and current badge deduplication behavior.
Title, summary, sender, role, row kind, and base tone were cut over by task 3.
Meta-review handoff attempts, clean-run progress, gate-failure display, and
synthetic approval rows remain on the legacy path for task 5.

### Domain / Control Model Summary

1. Business invariant: operator-visible badge labels, tones, and deduplication
   must match the task-1 frozen behavior unless this task explicitly names a
   difference.
2. Control model: `timelineDisplayPresenter.ts` owns badge interpretation from
   protocol envelopes; `UiTimelineEntry.display.badges` is the browser-facing
   display contract; `BubbleTimeline.tsx` renders badges only.
3. Read-path rule: React must render badge UI from `entry.display.badges` for
   the in-scope badge families. It must not read `entry.payload.findings`,
   `entry.payload.decision`, `payload.metadata.latest_recommendation`, or
   `payload.metadata.recommendation` to produce normal badges.
4. Forbidden fallback: do not add UI fallback logic that reconstructs findings,
   decision, recommendation, tone, or badge dedupe from raw payload fields.
5. Allowed resolution path: if a badge is missing or has the wrong tone, fix the
   presenter output, DTO validation, or fixture construction rather than
   recovering in React.
6. Missing-data rule: missing badge data is represented as an empty
   `display.badges` array. React renders no badge instead of reading raw
   payload to recover one.
7. Phase boundary: this task removes only badge-family raw payload reads from
   React. Remaining meta/progress/synthetic raw reads are intentionally deferred
   to task 5, and final broad no-legacy enforcement remains task 6.

### Plan Linkage

1. Parent plan gap closed: badge rendering still depends on protocol findings,
   decision, and recommendation fields in React.
2. Depends on: task 3 archived basic display cutover.
3. Unlocks / impacts successors:
   - task 5 can cut over cross-row meta-review progress and synthetic approval
     behavior after simple badges no longer depend on payload helpers.
   - task 6 can remove remaining dual-shape support and no-legacy fixtures.
4. Task-list impact: creates executable task `4-timeline-display-badges`.
5. Inherited validation / exit expectation: focused `BubbleTimeline` tests and
   presenter tests prove current badge behavior while the React badge read path
   uses only `display.badges`.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts`
   - `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`
   - `ui/src/components/expanded/BubbleTimeline.tsx`
   - `ui/src/components/expanded/BubbleTimeline.test.tsx`
   - archived task 1, task 2, and task 3 artifacts.
2. Canonical elements:
   - `UiTimelineBadge.kind` values remain `finding`, `decision`, and
     `recommendation`.
   - `UiTimelineBadge.label` is the display label React renders.
   - `UiTimelineBadge.tone` is the display tone React maps to existing badge
     styles.
3. Guard elements: legacy `payload` may remain on `UiTimelineEntry` only for
   successor task families not yet cut over.
4. Forbidden reinterpretations: do not claim the timeline is payload-free in
   this task; task 5 and task 6 still own remaining payload removal.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `BubbleTimeline.tsx` still owns `extractFindingTags`,
     `extractDecisionTag`, and `extractMetaRecommendation` for visible badges.
   - `timelineDisplayPresenter.ts` already emits `display.badges` from
     findings, decision, and recommendation payload data.
   - `BubbleTimeline.test.tsx` includes current badge coverage for findings,
     decision/recommendation dedupe, and recommendation variants.
2. Actual touched scope: React badge rendering, deleted or narrowed badge
   helper logic, focused UI tests/fixtures, and focused presenter proof where
   the DTO output is incomplete.
3. Mutation entrypoints in scope: display DTO rendering and tests only. No
   Pairflow lifecycle, transcript storage, backend protocol semantics, or API
   route redesign.
4. Hidden scope ruled out: meta-review clean-run progress, handoff attempts,
   approve-gate validation failure display, synthetic approval rows, and final
   no-legacy guard checks.

### Authority Fan-out Scan

| Bucket | Local Mapping | In Scope? | Notes |
|---|---|---:|---|
| `authority_producer` | `timelineDisplayPresenter.ts` badge interpretation from protocol input | yes | Producer changes are allowed only to preserve current badge semantics in `display.badges`. |
| `persisted_authority` | protocol transcript/envelope payload history | no | Payload storage and protocol meaning are unchanged. |
| `internal_execution_consumers` | Pairflow lifecycle/runtime commands | no | No runtime command behavior changes. |
| `workflow_orchestration_consumers` | Pairflow plan/bubble routing | no | Lifecycle/routing state is unaffected. |
| `read_model_consumers` | `BubbleTimeline.tsx` normal badge rendering | yes | This is the single consumer family being aligned to the existing display DTO. |
| `cleanup_recovery_consumers` | final no-legacy guard and fixture cleanup | deferred | Task 6 owns broad cleanup after all timeline display families are cut over. |

Scan result: this is producer-plus-one-read-model-consumer alignment inside the
already-established timeline display DTO. It does not fan out into lifecycle,
storage, recovery, or multiple UI consumer families.

### Closure-Budget Gate

1. Closure buckets touched:
   - `authority_producer`: badge output in `timelineDisplayPresenter.ts` when
     existing DTO behavior needs focused fixes or tests.
   - `read_model_consumers`: `BubbleTimeline.tsx` badge rendering.
   - `shared_contract`: existing `UiTimelineBadge` type is consumed, but no new
     badge kind, tone, field, schema, or validator contract is introduced.
2. Collapsed closures: producer proof and one React consumer cutover are
   intentionally collapsed because `display.badges` already exists from task 2,
   task 3 has already moved basic row fields to the DTO, and this task has one
   consumer family with focused fixture/test fallout.
3. Deferred closures:
   - meta/progress/synthetic timeline state remains task 5.
   - broad raw-payload removal, obsolete fixture cleanup, and no-legacy guards
     remain task 6.
4. Split decision: keep as one bounded task. The hard-stop pattern
   `authority_producer + shared_contract + two consumer buckets` does not apply
   because shared contract shape is stable and only one read-model consumer is
   changing.

### Bounded-Task-Shape Gate

1. Primary shape: `consumer_family_alignment`.
2. Secondary shape: `authority_producer`, limited to focused presenter badge
   output/test fixes if React cutover exposes missing DTO behavior.
3. Why the mix is safe: both shapes serve the same display DTO invariant, touch
   the same timeline badge family, and do not introduce persistence, lifecycle,
   precondition ordering, rollback, or coordination semantics.

### Complexity Risk Gate

| Axis | Score | Rationale |
|---|---:|---|
| `authority_risk` | 1 | Badge interpretation authority moves out of React, but producer authority already exists. |
| `surface_spread` | 2 | Presenter, UI component, fixtures, and focused tests are touched. |
| `identity_join_risk` | 0 | No new identity matching or lineage join is introduced. |
| `activation_coupling` | 1 | Existing expanded bubble detail path activates the behavior. |
| `prerequisite_risk` | 0 | Task 3 is archived and the display DTO foundation exists. |
| `acceptance_multiplicity` | 1 | Multiple badge variants require focused tests, but one display family owns them. |

Risk score: 5. Split recommendation considered and rejected for this task
because the parent plan already split basics, badges, meta behavior, and final
cleanup; splitting badge variants further would create coordination overhead
without a separate authority boundary.

### Success / Completion Proof Boundary

This task is complete when `BubbleTimeline.tsx` no longer reads raw payload or
payload metadata for findings severity badges, decision badges, recommendation
badges, or badge deduplication. The visible badge behavior remains stable
through focused UI tests, and presenter tests prove `display.badges` carries the
needed badge labels and tones.
No router response validator or badge schema change is in scope; if
implementation discovers that validator changes are required, it must stop and
route back to task refinement rather than expanding scope silently.

### Capability Closure

1. Capability claim: badge rendering for timeline rows uses the
   backend-produced display DTO.
2. Closure classification: `end_to_end` for the badge display slice only.
3. Activation trigger: loading an expanded bubble detail view through the normal
   UI read-model path.
4. Entrypoint: `presentTimeline` / timeline display presenter output consumed
   by `BubbleTimeline.tsx`.
5. Configuration owner: repo default; no feature flag or operator setup is
   introduced.
6. Repo-provided parts: UI contract types, presenter badge output, UI fixture
   construction, and `BubbleTimeline` rendering/tests.
7. External prerequisites: none beyond the existing local app/test runtime.
8. Success output contract: visible findings, decision, and recommendation
   badges render from `display.badges`, including conflicting-payload guard
   cases where `entry.display.badges` wins.
9. Failure output contract: incomplete badge output renders no badge; React
   does not recover from raw protocol payload.
10. Operator/user path: open a bubble detail view and inspect timeline row
    badges; tests exercise the same component/read-model shape.
11. Last-mile proof: focused `BubbleTimeline` tests covering
    display-over-payload badges, dedupe, finding severity tones, decision tones,
    and recommendation variants, plus the validation commands named below.

### Precondition and Side-Effect Boundary

N/A for runtime side effects. This task uses the existing shared UI badge
contract. It may update `src/contracts/ui/uiReadModel.ts` or the mirrored UI
contract only for mechanical import/export alignment if required by the React
cutover, but it must not add, remove, or rename `UiTimelineBadge` fields,
`kind` values, `tone` values, or router validation behavior. It may update
presenter badge output only if needed, plus React rendering, fixtures, and
tests. It must not mutate Pairflow lifecycle state, transcript storage,
persistence state, runtime command behavior, or router read-response validation.

## L1 - Change Contract

### 1) Data / Read Contract

#### Canonical Contract Matrix

| Badge Family | Producer Authority | React Read Rule | Missing / Malformed Rule | Legacy Source Replaced | Successor Boundary |
|---|---|---|---|---|---|
| Finding severity badges | `timelineDisplayPresenter.ts` emits `display.badges[]` with `kind="finding"` | Render labels and tones from `entry.display.badges` only. | Omit malformed or missing finding badges in presenter output; React does not inspect findings. | `entry.payload.findings` and UI-local severity tone mapping. | Task 6 may remove residual protocol-shaped fixtures after all display families move. |
| Approval decision badges | `timelineDisplayPresenter.ts` emits `kind="decision"` for approval decision rows | Render labels and tones from `entry.display.badges` only. | Missing decision badge means no visible decision badge; React does not recover from `payload.decision`. | `entry.payload.decision` and UI-local decision tone mapping. | Task 5 may still read decision for gate/synthetic behavior until its cutover. |
| Meta-review recommendation badges | `timelineDisplayPresenter.ts` emits `kind="recommendation"` | Render labels and tones from `entry.display.badges` only. | Missing recommendation badge means no visible recommendation badge. | `payload.metadata.latest_recommendation` / `payload.metadata.recommendation`. | Task 5 owns progress/gate meaning around recommendations, not visible badge derivation. |
| Badge dedupe | `timelineDisplayPresenter.ts` owns dedupe by `kind` and `label` | React renders the already-deduped array without recomputing raw-payload overlap. | Duplicate DTO badges should be avoided by producer tests; React may key by stable array position plus kind/label but must not dedupe by payload. | UI-local comparison between decision and recommendation tags. | Task 6 can add no-legacy guard coverage after remaining raw reads are gone. |
| Badge tone | `UiTimelineBadge.tone` | React maps `tone` to existing badge class names. | Unknown tone is impossible by type/validator; tests should cover the allowlist. | UI-local severity/recommendation/decision tone inference. | Later tasks must add new tones through the contract, not local CSS heuristics. |

#### Mirrored Surface Checklist

1. L0 policy must keep presenter-owned badge interpretation and React-only
   rendering.
2. L1 data/read contract must use the matrix above as the canonical source for
   badge ownership and fallback behavior.
3. React contract must not introduce a second badge fallback ladder.
4. Test contract must include at least one display-over-conflicting-payload
   assertion for badge rendering.
5. L2 implementation sketch must keep meta/progress/synthetic cutover deferred.
6. Acceptance criteria must claim only badge-family payload-read removal.

### 2) React Contract

1. `BubbleTimeline.tsx` renders badge chips by iterating
   `entry.display.badges`.
2. `BubbleTimeline.tsx` may keep helper functions that map
   `UiTimelineBadge.tone` to CSS classes, but those helpers must not inspect
   `entry.payload`.
3. Remove or narrow the current badge helpers so they no longer read:
   - `entry.payload.findings`
   - `entry.payload.decision`
   - `payload.metadata.latest_recommendation`
   - `payload.metadata.recommendation`
4. Preserve the current visible text casing and tone classes unless a focused
   test documents an intentional difference.
5. Do not change row layout, row ordering, synthetic row behavior, or
   meta-review progress rendering.

### 3) Producer / Contract Contract

1. If `display.badges` already contains the required shape, keep DTO types
   stable and add only missing tests.
2. If presenter output is missing any current badge behavior, implement it in
   `timelineDisplayPresenter.ts`, not in React.
3. Keep `UiTimelineBadge.kind` and `UiTimelineBadge.tone` as existing
   allowlisted structured fields; do not change validator/schema acceptance in
   this task.
4. Keep protocol payload available as backend presenter input and temporary
   legacy data for out-of-scope UI behavior.

### 4) Test Contract

1. Add or update focused `BubbleTimeline` tests proving:
   - findings severity badges render from `display.badges` even when payload
     findings conflict
   - decision and recommendation badges render from `display.badges`
   - duplicate decision/recommendation labels do not produce duplicate visible
     badges when the DTO is deduped
   - missing `display.badges` entries do not trigger raw payload recovery
2. Add or update focused presenter tests proving:
   - findings severity labels map to expected tones
   - decision labels map to expected tones
   - recommendation labels map to expected tones
   - producer-side dedupe preserves the current visible behavior
3. Preserve existing tests for meta-review progress, clean runs, handoff
   attempts, gate validation failures, and synthetic approval rows unless a
   fixture shape must be mechanically updated.

## L2 - Implementation Sketch

1. Inspect `BubbleTimeline.tsx` badge helper call-sites and isolate the helpers
   that exist only for findings, decision, recommendation, and dedupe badges.
2. Replace badge extraction at render time with `entry.display.badges`.
3. Add a small `badgeToneClass(tone)` helper if needed so CSS class ownership is
   still local to React while semantic badge interpretation stays in the DTO.
4. Remove badge-only payload helper reads from React. Keep meta/progress helper
   reads that belong to task 5.
5. Update UI fixtures so normal badge tests provide display-shaped badge data.
   Conflicting payload fixture fields should be used only to prove display
   precedence.
6. Add or update presenter tests for badge output and dedupe when existing
   coverage is insufficient.
7. Run validation:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - `pnpm --dir ui test -- BubbleTimeline`
   - focused presenter tests covering timeline display/presenter badge output
   - broader `pnpm --dir ui test` if shared UI fixtures are changed in a way
     that affects more than `BubbleTimeline`
   - `pnpm test`
   - `pnpm build` because this task changes `src/**`
8. Do not edit `src/v11/infrastructure/ui/routerReadResponseValidation.ts` or
   `tests/core/ui/router.test.ts` in this task. Validator changes require task
   refinement first.

## Acceptance Criteria

1. `BubbleTimeline.tsx` has zero normal badge-rendering reads of
   `entry.payload.findings`, `entry.payload.decision`,
   `latest_recommendation`, or `recommendation`.
2. Visible findings, decision, and recommendation badges render from
   `entry.display.badges`.
3. Badge tones come from `UiTimelineBadge.tone`, with no UI-local protocol
   severity/recommendation/decision inference.
4. Existing badge dedupe behavior is preserved through producer-owned DTO output
   and focused tests.
5. Out-of-scope meta/progress/synthetic raw reads remain explicitly deferred to
   task 5 and are not presented as final cleanup.
6. Validation evidence includes the commands listed in L2, with any skipped
   command justified in the bubble close summary.

## Hardening Backlog

1. `later-hardening`: task 6 should add no-legacy guards that fail if badge
   rendering reintroduces raw payload reads after task 5 also removes remaining
   meta/progress/synthetic reads.
