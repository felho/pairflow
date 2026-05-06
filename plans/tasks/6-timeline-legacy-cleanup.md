---
artifact_type: task
artifact_id: task_timeline_legacy_cleanup_v1
task_family_id: timeline-legacy-cleanup
sequence_key: "6"
task_id: 6-timeline-legacy-cleanup
title: "Timeline Legacy Cleanup"
status: approved
phase: phase4
target_files:
  - ui/src/components/expanded/BubbleTimeline.tsx
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - ui/src/test/fixtures.ts
  - src/contracts/ui/uiReadModel.ts
  - ui/src/lib/contracts/uiReadModel.ts
  - src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - tests/v11/infrastructure/ui/presenters/timelinePresenter.test.ts
  - tests/tools/fitness/uiContractBoundary.test.ts
target_files_role: final_timeline_display_dto_cleanup_and_no_legacy_guards
target_write_files:
  - ui/src/components/expanded/BubbleTimeline.tsx
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - ui/src/test/fixtures.ts
  - src/contracts/ui/uiReadModel.ts
  - ui/src/lib/contracts/uiReadModel.ts
  - src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - tests/v11/infrastructure/ui/presenters/timelinePresenter.test.ts
  - tests/tools/fitness/uiContractBoundary.test.ts
target_read_only_anchors:
  - plans/2026-05-05-timeline-display-dto-plan-v1.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/1-timeline-rules-fixtures.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/2-timeline-display-contract.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/3-timeline-display-basics.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/4-timeline-display-badges.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/5-timeline-display-meta.md
prd_ref: null
plan_ref: plans/2026-05-05-timeline-display-dto-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 6-timeline-legacy-cleanup-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-timeline-display-dto-plan-v1
---

# Task: Timeline Legacy Cleanup

## L0 - Policy

### Goal

Remove the remaining transitional timeline display compatibility paths after
tasks 1 through 5 moved normal rendering to presenter-owned display DTO fields.
This task closes the plan by deleting obsolete raw-payload normal-render access,
obsolete helper code, and stale protocol-shaped UI fixtures, then adding guards
that make recurrence visible in fitness or focused tests.

### Domain / Control Model Summary

1. Business invariant: the expanded bubble timeline must keep rendering the
   task-1 frozen behavior through backend-produced display DTO fields, while
   refusing to keep raw protocol payload semantics as a normal browser render
   fallback.
2. Control model: protocol envelopes and `ProtocolEnvelopePayload` remain
   backend input authority; `timelineDisplayPresenter.ts` and
   `timelinePresenter.ts` own display interpretation; `UiTimelineEntry.display`
   is the browser-facing display contract; `BubbleTimeline.tsx` owns layout and
   interaction only.
3. Read-path rule: `BubbleTimeline.tsx` must render normal timeline content from
   `entry.display` fields only. It must not read `entry.payload`,
   `payload.metadata`, `payload.findings`, `payload.decision`, raw
   recommendation keys, raw actor metadata, or gate metadata for normal display.
4. Forbidden fallback: no dual-shape render path, no "if display missing then
   inspect payload" behavior, no React-side protocol synthetic row
   construction, no regex/key parsing of protocol metadata in React, and no
   protocol-shaped UI fixture as the preferred normal-render test source.
5. Allowed resolution path: presenter code may continue to interpret
   `ProtocolEnvelope` input and produce explicit display values. Missing or
   malformed source data must be represented by neutral/unknown display output
   or omitted optional display fields according to the DTO contract.
6. Missing-data rule: missing display data renders as missing or neutral UI;
   React must not recover by looking back into raw payload.

### Plan Linkage

1. Parent plan gap closed: transitional compatibility code and raw-payload
   render access can allow the coupling to return after the DTO migration.
2. Depends on: tasks 1 through 5 archived, especially task 5's meta-review DTO
   cutover.
3. Unlocks / impacts successors: this is the final task in the plan. Successful
   close should allow task and plan archive aftermath.
4. Task-list impact: creates executable task `6-timeline-legacy-cleanup`.
5. Inherited validation / exit expectation: focused UI/presenter tests plus a
   recurrence guard prove no normal React render path depends on
   `ProtocolEnvelopePayload`.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/modularity-review/2026-05-05-modularity-review.md`
   - `docs/architecture/ui-contract-governance.md`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts`
   - `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`
   - `ui/src/components/expanded/BubbleTimeline.tsx`
   - archived tasks 1 through 5 under
     `plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/`.
2. Canonical elements:
   - `UiTimelineEntry.display` is the only normal React timeline display source.
   - Presenter output owns title, sender, role, row state, badges, progress,
     validation failure, and synthetic approval descriptors.
   - Raw payload may remain as backend input or explicit debug/archive data, not
     as browser normal-render display authority.
3. Guard elements: tests and fitness checks may inspect code text to prevent
   reintroducing payload reads in `BubbleTimeline.tsx`.
4. Forbidden reinterpretations: do not remove protocol payload from backend
   transcript/history authority, and do not redesign timeline layout or protocol
   event semantics under this cleanup label.

### Scope Reality / Shape Proof

1. In-scope entrypoints:
   - `BubbleTimeline.tsx` imports, props, helpers, and normal-render branches.
   - UI timeline fixtures and focused tests that still encode raw payload as the
     normal render contract.
   - UI contract mirror files if payload typing or display DTO shape requires a
     final cleanup.
   - Presenter tests or fixtures needed to keep current display behavior covered
     after UI fixture cleanup.
   - Fitness or architecture guard tests that prevent React timeline payload
     reads from returning.
2. Out-of-scope entrypoints:
   - Pairflow lifecycle state, transcript persistence, protocol envelope
     schema, non-timeline UI read models, standalone package publishing, and
     visual redesign.
3. Hidden scope ruled out: if cleanup exposes a behavior that still requires a
   new display field or presenter semantic not covered by tasks 2 through 5,
   route back to task refinement instead of recreating React fallback logic.

### Authority Fan-out Scan

| Bucket | Local Mapping | In Scope? | Notes |
|---|---|---:|---|
| `authority_producer` | timeline presenter/display presenter protocol-to-DTO mapping | yes | Only to remove now-obsolete compatibility outputs or keep tests aligned. |
| `shared_contract` | `UiTimelineEntry` and UI contract mirror | yes | Final DTO shape should no longer advertise raw payload as normal display input. |
| `read_model_consumers` | `BubbleTimeline.tsx` | yes | Primary cleanup target: no protocol payload display reads. |
| `guard_consumers` | focused UI tests and fitness checks | yes | Must catch recurrence of raw-payload rendering. |
| `persisted_authority` | protocol transcript/envelope history | no | Must remain backend input authority. |
| `workflow_orchestration_consumers` | Pairflow runtime/lifecycle | no | No lifecycle or command behavior changes. |

Scan result: one migrated producer-contract-consumer chain plus guard coverage.
No persistence, lifecycle, or multi-route runtime behavior is in scope.

### Closure-Budget Gate

1. Closure buckets touched:
   - `read_model_consumers`: remove remaining raw-payload render access.
   - `shared_contract`: narrow browser-facing DTO exposure if needed.
   - `guard_consumers`: add recurrence checks.
   - `authority_producer`: keep presenter tests as the source of behavior proof.
2. Collapsed closures: consumer cleanup and guard coverage are collapsed because
   cleanup without a guard leaves the plan's Done Definition unenforced.
3. Why safe: the task removes compatibility residue from an already-migrated
   timeline path; it does not change lifecycle, persistence, routing, or command
   semantics.
4. Deferred closures: none inside this plan. New non-timeline cleanup discovered
   during implementation must be left out or routed to a separate plan.

### Bounded-Task-Shape Gate

1. Primary shape: `fail_closed_hardening`.
2. Secondary shape: `activation_or_read_model`.
3. Why the mix is safe: the hardening and read-model cleanup operate on the
   same bounded expanded-timeline render path. The task removes obsolete
   fallback behavior and then guards that same consumer path; it does not add a
   separate producer, recovery, coordination, or side-effect-ordering closure.
4. Invalid/precondition-failure behavior: missing display fields must have zero
   payload fallback side effects in React.
5. Coordination primitives: not in scope.
6. Fail-closed hardening: in scope only for no-legacy timeline render guards.
7. Split decision: split if implementation requires protocol schema changes,
   router/API changes, or non-timeline UI cleanup.

### Complexity Risk Gate

| Axis | Score | Rationale |
|---|---:|---|
| `authority_risk` | 1 | Authority should already be moved; this task removes compatibility residue. |
| `surface_spread` | 2 | React, fixtures/tests, contract mirrors, presenter tests, and fitness may change. |
| `identity_join_risk` | 0 | No new identifiers or lifecycle joins. |
| `activation_coupling` | 1 | Existing expanded bubble timeline only. |
| `prerequisite_risk` | 1 | Depends on task-5 cutover being complete and not partially reverted. |
| `acceptance_multiplicity` | 2 | Needs deletion proof, behavior proof, and recurrence guard proof. |

Risk score: 7. The task is bounded because it removes one obsolete authority
path and adds guard coverage around the same path.

## L1 - Contract

### Canonical Contract Matrix

This table is the L1 source of truth for the cleanup contract. Other sections
may summarize it, but must not introduce an independent rule.

| Contract Row | Owner | Required Behavior | Forbidden Behavior | Retained Fields / References | Required Proof |
|---|---|---|---|---|---|
| React read path | `BubbleTimeline.tsx` | Render title, sender, role, row state, badges, progress, validation failure, and synthetic rows from `entry.display` | Reading `entry.payload` or protocol metadata to recover normal display fields | None in normal render code | Focused UI tests and recurrence guard |
| UI fixtures | UI test layer | Normal timeline render fixtures use display DTO data as the primary shape | Protocol-shaped payload fixtures as the normal render source after cleanup | Protocol-shaped setup is allowed only in presenter tests or explicit backend-input tests | Fixture/test diff and UI tests |
| Presenter behavior | `timelineDisplayPresenter.ts` / `timelinePresenter.ts` | Presenter tests remain the place where protocol payload interpretation is verified | Moving interpretation back into React helpers | `ProtocolEnvelope` / payload references retained as backend input authority | Presenter tests and code guard |
| Contract typing | `src/contracts/ui/**` and UI mirror | Browser-facing timeline DTO does not require `ProtocolEnvelopePayload` for normal rendering | UI consumer needing protocol payload type to compile normal rendering | Payload typing may remain only when explicitly debug/archive or backend-input facing | Typecheck and import guard |
| Synthetic rows | Presenter emits descriptor; React renders descriptor | React may render presenter-provided synthetic descriptors only | React constructing protocol-shaped synthetic timeline entries | `display.syntheticApproval` descriptor | Focused synthetic approval test |
| Missing data | Presenter and React display contract | Missing display fields render neutral/missing UI directly | Missing display fields trigger payload fallback | Optional display fields may be null/omitted by contract | Missing-display or conflicting-payload regression test |
| Targeted no-legacy checks | Task implementation evidence | Run the parent-plan `rg` checks and classify any retained matches by owner | Treating retained matches as acceptable without backend/debug/test ownership proof | Retained matches only outside normal React rendering | Exact `rg` command output or zero-match proof |

### Ownership and Deferred Semantics

1. This task owns final cleanup of normal expanded-timeline rendering after the
   DTO migration: React payload-read removal, obsolete helper deletion,
   display-first UI fixtures, and recurrence guards.
2. This task may retain or adjust backend presenter protocol interpretation
   because presenter code is the allowed authority for converting protocol
   payload input into display DTO output.
3. This task records guard evidence for retained payload references, but it does
   not reinterpret transcript history, protocol persistence, Pairflow lifecycle
   state, or non-timeline read models.
4. There are no successor tasks inside this plan. Any non-timeline cleanup,
   protocol schema change, router/API contract change, or UI redesign must be
   deferred to a separate plan/task instead of being absorbed here.
5. Forbidden inference: a retained payload reference in tests, backend
   presenter code, debug/archive code, or contract text never authorizes
   `BubbleTimeline.tsx` to consume payload data for normal display.

### Structured Contract Rules

1. Required display input for React: the existing `UiTimelineEntry.display`
   fields needed by the row being rendered.
2. Optional display input for React: nullable or omitted display fields already
   defined by the DTO, such as optional badges, progress, validation failure,
   or synthetic approval descriptors.
3. Allowed top-level render source variants: display DTO fields only for normal
   rendering. Raw `payload` is not an accepted normal-render variant.
4. Unknown-field behavior: React ignores unknown DTO fields and must not inspect
   unknown protocol payload or metadata fields.
5. Malformed, partial, duplicate, or multi-candidate behavior: presenter tests
   own derivation behavior; React renders the resulting display DTO without
   recovery from payload.
6. Retention/drop behavior: invalid or unsupported protocol display source data
   may be dropped or normalized by the presenter according to existing task-2
   through task-5 DTO rules; React does not re-derive it.
7. Fallback status: missing display data produces missing/neutral UI, not a
   payload fallback. Required proof is a missing-display or conflicting-payload
   regression test plus the targeted `rg` checks.

### Mirrored Surface Checklist

1. L0 Domain / Control Model Summary mirrors rows: React read path, missing
   data, presenter behavior.
2. L0 Scope Reality / Shape Proof mirrors rows: UI fixtures, presenter
   behavior, targeted no-legacy checks.
3. L0 Bounded-Task-Shape Gate mirrors rows: React read path and guard checks.
4. L1 Acceptance Criteria mirrors every row in the Canonical Contract Matrix.
5. L1 Validation mirrors targeted no-legacy checks and the focused/broader test
   proof rows.
6. L2 Implementation Plan mirrors retained-reference classification and guard
   evidence. If implementation changes any matrix row, these mirrored surfaces
   must be updated in the same bubble.

### Acceptance Criteria

1. `BubbleTimeline.tsx` has no normal-render read of `entry.payload`,
   `payload.metadata`, `payload.findings`, `payload.decision`, raw
   recommendation fields, raw actor metadata, gate metadata, or protocol-shaped
   synthetic entry construction.
2. Obsolete React helpers that only exist to interpret protocol payload display
   meaning are deleted.
3. UI tests and fixtures no longer encode raw `ProtocolEnvelopePayload` as the
   preferred normal-render contract.
4. Presenter tests still cover the protocol-to-display behavior that React no
   longer owns.
5. At least one guard fails if `BubbleTimeline.tsx` reintroduces normal
   payload-driven rendering.
6. The full plan Done Definition remains true: raw protocol payload may remain
   only as backend input or explicit debug/archive data outside normal render.
7. The final task evidence includes the targeted no-legacy checks:

   ```bash
   rg "entry\\.payload|payloadSummary|extractMetaReviewHandoffAttempt|buildSyntheticMetaApprovalEntry|buildDisplayTimelineItems" ui/src/components/expanded
   rg "ProtocolEnvelopePayload" ui/src src/contracts/ui
   rg "latest_recommendation|meta_review_handoff_id|delivery_target_role|actor_agent" ui/src/components/expanded
   ```

   Expected normal-render result is zero matches. Any retained match must be
   classified as backend presenter, debug/archive, non-render test assertion, or
   contract text, with proof that `BubbleTimeline.tsx` does not consume it.

### Validation

Run the narrowest relevant checks first, then broader checks required by repo
policy for UI/source changes:

1. Focused presenter tests for timeline display presenter behavior.
2. Focused `BubbleTimeline` tests.
3. Targeted no-legacy `rg` checks:

   ```bash
   rg "entry\\.payload|payloadSummary|extractMetaReviewHandoffAttempt|buildSyntheticMetaApprovalEntry|buildDisplayTimelineItems" ui/src/components/expanded
   rg "ProtocolEnvelopePayload" ui/src src/contracts/ui
   rg "latest_recommendation|meta_review_handoff_id|delivery_target_role|actor_agent" ui/src/components/expanded
   ```

4. The guard or fitness test that prevents raw-payload timeline rendering.
5. `pnpm typecheck`.
6. `pnpm lint`.
7. `pnpm fitness:check:ci`.
8. `pnpm --dir ui test`.
9. `pnpm test`.
10. `pnpm build`.
11. `pnpm --dir ui build`.

If any check is skipped or fails for unrelated reasons, record the exact command
and reason in the bubble evidence.

## L2 - Implementation Plan

1. Inspect the post-task-5 state of `BubbleTimeline.tsx`, UI fixtures, presenter
   tests, and contract types to inventory remaining payload references.
2. Classify each remaining payload reference:
   - backend/protocol input authority,
   - debug/archive data,
   - test setup helper that should be converted,
   - or forbidden normal-render fallback.
3. Delete or convert forbidden normal-render references in `BubbleTimeline.tsx`
   and remove the now-unused helpers/imports.
4. Convert UI fixtures/tests to display DTO-first shapes while preserving
   presenter tests for protocol interpretation behavior.
5. Add or update the recurrence guard so a future raw-payload normal-render read
   in `BubbleTimeline.tsx` fails a checked test or fitness rule.
6. Run focused tests, then the required repo verification sequence for UI and
   source changes.
7. Update task evidence with changed files, verification commands, and any
   intentionally retained payload references with their backend/debug/archive
   role.

## Non-Goals

1. Do not redesign timeline visuals or copy.
2. Do not change protocol envelope persistence or transcript semantics.
3. Do not change Pairflow lifecycle, bubble state machine, or command behavior.
4. Do not clean up non-timeline UI read models.
5. Do not introduce a new public package boundary.

## Open Questions

None known. If implementation finds a missing display field that React needs for
current behavior, stop and route back to task refinement rather than adding a
payload fallback.
