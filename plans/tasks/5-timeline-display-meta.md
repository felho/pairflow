---
artifact_type: task
artifact_id: task_timeline_display_meta_v1
task_family_id: timeline-display-meta
sequence_key: "5"
task_id: 5-timeline-display-meta
title: "Timeline Display Meta"
status: implementable
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
target_files_role: meta_review_display_cutover_and_focused_proofs
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
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/4-timeline-display-badges.md
prd_ref: null
plan_ref: plans/2026-05-05-timeline-display-dto-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 5-timeline-display-meta-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-timeline-display-dto-plan-v1
---

# Task: Timeline Display Meta

## L0 - Policy

### Goal

Switch the remaining meta-review timeline display behavior in
`BubbleTimeline.tsx` from React-side protocol payload reconstruction to
presenter-owned `entry.display` output.

This task owns meta-review handoff attempts, clean-run progress, approve-gate
validation failure display, and synthetic approval display rows. Findings,
decision, and recommendation badge chips were cut over by task 4 and must stay
DTO-driven. Final broad no-legacy guard enforcement remains task 6.

### Domain / Control Model Summary

1. Business invariant: operator-visible meta-review sequencing must keep the
   current meaning of handoff attempts, clean-run progress, gate failures, and
   synthetic approval rows unless this task explicitly names an intentional
   behavior change.
2. Control model: protocol envelopes remain backend input authority;
   `timelineDisplayPresenter.ts` owns meta-review display interpretation;
   `UiTimelineEntry.display` is the browser-facing display contract; React
   renders the contract without reconstructing protocol meaning.
3. Read-path rule: React must not read `entry.payload`, payload metadata keys,
   findings arrays, decisions, recommendations, or handoff ids to derive normal
   meta-review display.
4. Forbidden fallback: do not add React fallback logic that parses
   `meta_review_handoff_id`, `latest_recommendation`, `recommendation`,
   `actor_agent`, `delivery_target_role`, gate metadata, or raw decisions when
   display fields are missing.
5. Allowed resolution path: if the presenter cannot derive a display value, it
   must emit explicit neutral/unknown display data or omit an optional display
   field according to the DTO contract. React must render that absence directly.
6. Missing-data rule: missing meta-review display data renders no derived
   progress/handoff/synthetic row; React does not recover by reading raw
   protocol payload.

### Plan Linkage

1. Parent plan gap closed: meta-review progress and synthetic rows are still
   reconstructed in React.
2. Depends on: task 4 archived badge display cutover.
3. Unlocks / impacts successors: task 6 can remove transitional raw-payload
   support and add no-legacy recurrence guards after this task removes the last
   normal-render meta-review payload reads.
4. Task-list impact: creates executable task `5-timeline-display-meta`.
5. Inherited validation / exit expectation: focused presenter and
   `BubbleTimeline` tests prove meta-review display behavior while React reads
   presenter-owned DTO fields only.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts`
   - `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`
   - `ui/src/components/expanded/BubbleTimeline.tsx`
   - `ui/src/components/expanded/BubbleTimeline.test.tsx`
   - archived task 1 through task 4 artifacts.
2. Canonical elements:
   - `UiTimelineEntry.display` is the only normal React timeline display source.
   - Existing `display.badges` ownership from task 4 must remain unchanged.
   - Meta-review progress, gate-failure, and synthetic approval fields must use
     the existing task-2 display DTO fields: `display.progress`,
     `display.validationFailure`, and `display.syntheticApproval`.
3. Guard elements: raw protocol payload may remain in the contract only as
   temporary data for backend input, debug/archive, or task-6 cleanup context.
4. Forbidden reinterpretations: do not claim full payload removal outside the
   timeline normal render path; task 6 still owns final cleanup and guards.

### Scope Reality / Shape Proof

1. In-scope entrypoints:
   - `BubbleTimeline.tsx` meta-review handoff/progress/gate/synthetic row logic.
   - Presenter display output needed to carry equivalent meta-review display
     data to React.
   - Focused UI and presenter tests plus fixture updates.
2. Out-of-scope entrypoints:
   - Pairflow lifecycle state, transcript persistence, router response
     validation redesign, standalone contract packaging, and non-timeline UI
     read models.
3. Hidden scope ruled out: final broad `rg` guard enforcement and deletion of
   every temporary fixture family remains task 6 unless a file becomes obsolete
   solely because this task removes the last user of it.

### Authority Fan-out Scan

| Bucket | Local Mapping | In Scope? | Notes |
|---|---|---:|---|
| `authority_producer` | `timelineDisplayPresenter.ts` meta-review interpretation from protocol envelopes | yes | Owns handoff, clean-run, gate-failure, and synthetic display output. |
| `shared_contract` | Existing `UiTimelineEntry.display.progress`, `display.validationFailure`, and `display.syntheticApproval` fields | yes | Consume the established DTO shape; add fields only if a blocker forces task refinement. |
| `read_model_consumers` | `BubbleTimeline.tsx` normal timeline rendering | yes | Single React consumer family renders DTO fields only. |
| `cleanup_recovery_consumers` | task 6 no-legacy cleanup and guard checks | deferred | Task 5 must unlock cleanup by removing normal meta-review payload display reads. |
| `persisted_authority` | protocol transcript/envelope payload history | no | Payload storage and protocol meaning remain unchanged. |
| `workflow_orchestration_consumers` | Pairflow lifecycle/runtime routing | no | No lifecycle, state machine, or command behavior changes. |

Scan result: this is one producer, one existing UI contract, and one read-model
consumer family. The deferred cleanup consumer is intentionally not collapsed
into this task.

### Closure-Budget Gate

1. Closure buckets touched:
   - `authority_producer`: presenter emits display-ready meta-review fields.
   - `shared_contract`: existing `UiTimelineEntry.display.progress`,
     `display.validationFailure`, and `display.syntheticApproval` fields are
     consumed without closed-contract drift.
   - `read_model_consumers`: `BubbleTimeline.tsx` consumes those fields.
2. Collapsed closures: producer, contract, and the single timeline read-model
   consumer are collapsed because this is the final meta-review display cutover
   before cleanup and the display behavior cannot be proven end-to-end without
   all three.
3. Why safe: no persistence, lifecycle, routing, command, or multi-consumer
   activation semantics change; the only activation path is the existing
   expanded bubble timeline read path.
4. Deferred closures: task 6 owns broad raw-payload guard checks, obsolete
   fixture removal, and recurrence prevention after task 5 removes normal
   meta-review display reads.

### Bounded-Task-Shape Gate

1. Primary shape: `consumer_family_alignment`.
2. Secondary shape: `authority_producer`, limited to presenter output needed to
   serve the same timeline display consumer.
3. Synthetic approval shape: the established `display.syntheticApproval`
   descriptor stays attached to the trigger entry. React may render the
   corresponding UI row from that descriptor, but it must not construct a
   protocol-shaped payload-backed synthetic entry.
4. Split decision: keep as one task. Splitting handoff/progress/gate/synthetic
   rows would leave React with mixed payload and DTO ownership across the same
   meta-review sequencing state, which would make task 6 cleanup harder rather
   than safer.

### Complexity Risk Gate

| Axis | Score | Rationale |
|---|---:|---|
| `authority_risk` | 2 | Meta-review sequencing authority moves from React to presenter output. |
| `surface_spread` | 2 | Presenter, shared DTO, React component, fixtures, and focused tests are touched. |
| `identity_join_risk` | 1 | Handoff attempts and synthetic rows depend on matching sparse envelope metadata, but no new persistent identity is introduced. |
| `activation_coupling` | 1 | Existing expanded bubble detail activation path only. |
| `prerequisite_risk` | 0 | Tasks 1-4 are archived and badge/basic display foundations exist. |
| `acceptance_multiplicity` | 2 | Four meta-review display families require focused proof. |

Risk score: 8. The task remains bounded because all risk sits inside one
producer-to-one-consumer display contract. If implementation discovers router
validation, persistence, lifecycle, or additional consumer changes are required,
it must route back to task refinement instead of expanding scope.

### Canonical Contract Matrix

| Display Family | DTO Field | Optionality / Shape Rule | Producer Authority | React Read Rule | Missing / Malformed Rule | Legacy Source Replaced | Successor Boundary |
|---|---|---|---|---|---|
| Meta-review handoff attempts | `entry.display.progress` with `kind="meta_review_handoff"` | Required nullable key; non-null progress object carries the presenter-owned handoff label/source fields already defined by task 2 | `timelineDisplayPresenter.ts` derives it from protocol metadata | Render handoff progress from `entry.display.progress` only | `null` means no handoff embellishment; malformed attempts are dropped by the presenter | `payload.metadata.meta_review_handoff_id`, `actor_agent`, `delivery_target_role` parsing in React | Task 6 may remove obsolete raw fixture scaffolding |
| Clean-run progress | `entry.display.progress` with `kind="clean_run"` | Required nullable key; non-null progress object carries clean-run label, count, required count, and source key per existing DTO | Presenter owns clean-run count and reset sequencing | Render clean-run progress from `entry.display.progress` only | `null` means no progress chip/row is derived | UI-local clean-run counters and raw approve/rework recommendation/decision reads | Task 6 adds no-legacy recurrence guards |
| Approve-gate validation failure | `entry.display.validationFailure` | Required nullable key; non-null object carries presenter-owned failure label/tone/details per existing DTO | Presenter emits gate-failure display for frozen cases | Render failure label/tone/details from `entry.display.validationFailure` only | `null` means no gate-failure embellishment | Raw payload/gate metadata inspection in React | Task 6 verifies raw payload render path absence |
| Synthetic approval rows | `entry.display.syntheticApproval` | Required nullable key; non-null descriptor uses existing `kind="meta_review_approval"`, `sourceEntryId`, and `syntheticEntryId`; descriptor stays on the trigger entry | Presenter owns synthetic approval descriptor and duplicate collapse | React may render the existing UI row from this descriptor, without protocol payload construction | `null` means no synthetic approval row | `buildSyntheticMetaApprovalEntry` protocol row construction | Task 6 deletes obsolete synthetic helpers/fixtures |
| Badge interaction | `entry.display.badges` | Existing task-4 field; unchanged | Task 4 presenter badge output remains authoritative | React must not reintroduce payload badge reads while changing meta behavior | Missing badges remain no badge | Findings/decision/recommendation payload fallback | Task 6 broad cleanup |

### Mirrored Surface Checklist

1. L0 policy and L1 contract must keep presenter-owned meta-review display as
   the single source of normal React rendering truth.
2. L1 must name every replaced legacy metadata family explicitly.
3. L2 must preserve task 4 badge DTO ownership while removing meta-review raw
   reads.
4. Tests must include conflicting-payload or missing-display cases proving React
   does not recover from raw protocol data.
5. Acceptance must claim only task-5 display families and leave broad guard
   hardening to task 6.

### Capability Closure

1. Capability claim: meta-review timeline handoff, clean-run, gate-failure, and
   synthetic approval display render from the backend-produced display DTO.
2. Closure classification: `end_to_end` for the meta-review display slice.
3. Activation trigger: loading an expanded bubble detail view through the normal
   UI read-model path.
4. Entrypoint: `presentTimeline` / timeline display presenter output consumed
   by `BubbleTimeline.tsx`.
5. Configuration owner: repo default; no feature flag is introduced.
6. Repo-provided parts: UI contract types, presenter display output, UI
   fixtures, and focused UI/presenter tests.
7. External prerequisites: none beyond the existing local app/test runtime.
8. Last-mile proof: focused `BubbleTimeline` tests and presenter tests cover
   clean runs, handoff attempts, gate-failure display, and synthetic rows.

### Precondition and Side-Effect Boundary

This task may update UI contract fields, presenter output, React rendering,
fixtures, and tests required for the meta-review display DTO. It must not mutate
Pairflow lifecycle state, transcript storage semantics, runtime command
behavior, or router read-response validation unless implementation discovers a
hard blocker and routes back to task refinement first.

## L1 - Change Contract

### 1) Data / Read Contract

1. Use the established display DTO fields named by the Canonical Contract
   Matrix: `entry.display.progress`, `entry.display.validationFailure`, and
   `entry.display.syntheticApproval`.
2. Keep `display.badges` stable from task 4; do not change badge kind/tone
   semantics unless a blocking presenter bug requires task refinement.
3. Presenter output must own sequencing across sparse protocol envelopes,
   including clean-run resets after rework, handoff attempt ordering, and
   synthetic approval descriptor placement.
4. React may map display tone/kind values to CSS classes, but it must not
   inspect payload fields or metadata to decide whether a meta-review display
   element exists.
5. Missing display fields are rendered as absent display, not as a trigger for
   payload fallback.

### 2) React Contract

1. Remove normal-render reads of `entry.payload`, `payload.metadata`,
   `payload.decision`, `payload.findings`, recommendations, handoff ids,
   actor/target metadata, and gate metadata from `BubbleTimeline.tsx`.
2. Replace UI-local clean-run sequencing with presenter-owned display fields.
3. Replace UI-local protocol-shaped synthetic approval row construction with
   rendering from the existing `display.syntheticApproval` descriptor. Do not
   introduce a new synthetic entry or descriptor shape.
4. Preserve existing layout and row ordering unless a focused test documents an
   intentional difference.
5. Keep React responsible only for rendering, CSS class selection from typed
   display tones, and stable display keys.

### 3) Producer / Contract Contract

1. Prefer the existing `UiTimelineEntry.display` fields named in the Canonical
   Contract Matrix. Extend the DTO only if implementation finds a hard blocker
   and routes back to task refinement first.
2. Emit those fields from `timelineDisplayPresenter.ts` or the existing
   presenter layer closest to protocol interpretation.
3. Keep protocol payload available to the backend presenter as input.
4. Do not introduce a second browser-facing protocol mirror under a different
   field name, and do not replace the established `display.syntheticApproval`
   descriptor with a new React-consumed protocol descriptor.
5. If router validation or API response schema changes are unavoidable, stop
   and route back to task refinement before expanding scope.

### 4) Test Contract

1. Add or update focused `BubbleTimeline` tests proving:
   - clean-run progress renders from display data without payload fallback
   - rework/reset behavior follows presenter display data
   - handoff attempt display renders from display data
   - gate-failure display renders from display data
   - synthetic approval rows render from `display.syntheticApproval` and are not
     constructed from raw payload in React
2. Add or update presenter tests proving:
   - clean-run counts and required counts are emitted correctly
   - handoff attempt display data is derived consistently
   - gate-failure display data is emitted for existing frozen cases
   - `display.syntheticApproval` descriptors preserve current behavior
3. Include at least one conflicting-payload test where display data wins over
   stale raw payload fields.
4. Preserve task 4 badge tests.

## L2 - Implementation Sketch

1. Inspect `BubbleTimeline.tsx` for remaining meta-review raw payload readers
   and classify each as handoff, clean-run/progress/reset, gate failure, or
   synthetic row construction.
2. Use the existing display DTO fields named by the Canonical Contract Matrix;
   route back to task refinement before adding new fields.
3. Move interpretation into the presenter and update presenter tests first.
4. Cut React over to display DTO fields and remove the replaced helpers,
   including UI-local protocol-shaped synthetic row construction.
5. Update fixtures so normal UI tests construct display-shaped timeline entries
   for meta-review behavior.
6. Run validation:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - `pnpm --dir ui test -- BubbleTimeline`
   - focused presenter tests covering timeline meta-review display output
   - broader `pnpm --dir ui test` if shared UI fixtures are changed broadly
   - `pnpm test`
   - `pnpm build` because this task changes `src/**`
7. Do not run broad task-6 no-legacy `rg` gates as task-5 acceptance unless the
   implementation has already removed the relevant transitional helpers.
8. Leave task 6 with only cleanup/guard work: after task 5, any remaining raw
   payload access in timeline code must be transitional, debug/archive, or
   task-6 cleanup scope, not normal meta-review display behavior.

## Acceptance Criteria

1. `BubbleTimeline.tsx` no longer uses raw protocol payload or payload metadata
   for meta-review handoff attempts, clean-run progress, approve-gate
   validation failure display, or synthetic approval rows.
2. Meta-review display behavior renders from `entry.display` fields emitted by
   the presenter.
3. Task 4 badge rendering remains DTO-driven and does not regain raw payload
   fallback behavior.
4. Presenter tests prove the new display output for clean-run progress,
   handoff attempts, gate failures, and synthetic rows.
5. Focused UI tests prove display data wins over conflicting payload data and
   missing display data does not trigger raw payload recovery.
6. After task 5, remaining raw-payload render access is limited to
   transitional/broad cleanup scope for task 6 and is not used for normal
   meta-review display behavior.
7. Validation evidence includes the commands listed in L2, with skipped commands
   justified in the bubble close summary.

## Hardening Backlog

1. `later-hardening`: task 6 should remove any remaining transitional
   protocol-shaped fixtures and add broad no-legacy guard checks over normal
   timeline rendering.
