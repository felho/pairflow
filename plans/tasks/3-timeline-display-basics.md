---
artifact_type: task
artifact_id: task_timeline_display_basics_v1
task_family_id: timeline-display-basics
sequence_key: "3"
task_id: 3-timeline-display-basics
title: "Timeline Display Basics"
status: approved
phase: phase3
target_files:
  - ui/src/components/expanded/BubbleTimeline.tsx
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - src/contracts/ui/uiReadModel.ts
  - src/v11/infrastructure/ui/routerReadResponseValidation.ts
  - src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - ui/src/test/fixtures.ts
  - ui/src/lib/contracts/uiReadModel.ts
target_files_role: ui_cutover_slice_and_focused_tests
target_write_files:
  - src/contracts/ui/uiReadModel.ts
  - src/v11/infrastructure/ui/routerReadResponseValidation.ts
  - ui/src/components/expanded/BubbleTimeline.tsx
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - ui/src/test/fixtures.ts
  - ui/src/lib/contracts/uiReadModel.ts
  - src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts
target_read_only_anchors:
  - plans/2026-05-05-timeline-display-dto-plan-v1.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/1-timeline-rules-fixtures.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/2-timeline-display-contract.md
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
prd_ref: null
plan_ref: plans/2026-05-05-timeline-display-dto-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 3-timeline-display-basics-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-05-timeline-display-dto-plan-v1
---

# Task: Timeline Display Basics

## L0 - Policy

### Goal

Switch the basic timeline row rendering in `BubbleTimeline.tsx` from raw
protocol payload interpretation to the backend-produced display DTO fields added
by task 2.

This task owns only title/summary, sender label, role, row kind, and base tone
rendering. Findings, decision/recommendation badges, meta-review progress,
gate-failure display, and synthetic approval rows remain on the existing legacy
path for later tasks.

### Domain / Control Model Summary

1. Business invariant: the operator-visible basic row text and base row state
   must match the task-1 frozen behavior unless this task explicitly names a
   difference.
2. Control model: `timelinePresenter.ts` remains the producer for display
   interpretation; `BubbleTimeline.tsx` consumes only `entry.display` for the
   basic field families in this task.
3. Read-path rule: for the in-scope families, React must read
   `entry.display.title`, `summaryText`, `summarySource`, `senderLabel`,
   `role`, `rowKind`, and `tone`.
4. Forbidden fallback: do not add a React fallback that reads `entry.payload`,
   `payload.metadata`, `payload.question`, `payload.message`, or
   `payload.decision` for the in-scope basic rendering families.
5. Allowed resolution path: if a basic display field appears incomplete, fix
   the backend presenter/contract output or test fixture construction rather
   than reconstructing protocol meaning in React.
6. Missing-data rule: React renders the neutral/unknown display values emitted
   by the DTO; it does not recover missing title, sender, role, row kind, or
   tone from raw payload.
7. Phase boundary:
   - contract closure: already introduced by task 2.
   - producer closure: task 2 owns the display DTO producer baseline; this task
     may make narrow producer/test adjustments only when needed to keep basic
     fields complete.
   - read-model closure: this task cuts over the basic React read path.
   - cleanup/recovery closure: delete only the React helpers replaced by this
     basic cutover; final broad no-legacy cleanup remains task 6.

### Plan Linkage

1. Parent plan gap closed: basic row rendering still reads protocol payload and
   sender metadata in React.
2. Depends on: `2-timeline-display-contract` archived display DTO producer
   foundation.
3. Unlocks / impacts successors:
   - task 4 can cut over badge rendering after basic display fields are stable.
   - task 5 can cut over cross-row meta-review/synthetic behavior after simple
     fields no longer depend on payload helpers.
   - task 6 removes remaining transitional compatibility.
4. Task-list impact: creates executable task `3-timeline-display-basics`.
5. Inherited validation / exit expectation: focused UI tests prove current
   title, sender, role, and base row state behavior remains stable while the
   in-scope React reads come from `display`.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`
   - `ui/src/components/expanded/BubbleTimeline.tsx`
   - `ui/src/components/expanded/BubbleTimeline.test.tsx`
   - archived task 2 display contract.
2. Canonical elements:
   - `UiTimelineEntry.display` is the normal browser-facing display contract
     for in-scope basic rendering.
   - `ProtocolEnvelopePayload` remains backend input and temporary legacy input
     only for out-of-scope badge/meta/synthetic rendering.
3. Guard elements: legacy `payload` may remain on `UiTimelineEntry` only for
   successor task families not yet cut over.
4. Forbidden reinterpretations: do not claim the full timeline is payload-free
   in this task; only the basic families are cut over.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `BubbleTimeline.tsx` owns row text, labels, role/tone class selection, and
     still owns legacy badge/meta helpers.
   - `BubbleTimeline.test.tsx` and UI fixtures are the focused proof surface for
     current visible behavior.
   - task 2 presenter output provides the required display fields.
2. Actual touched scope: React basic display reads, deleted/reduced basic
   payload helper logic, focused UI tests and fixtures, and narrow contract
   import/type updates if needed.
3. Mutation entrypoints in scope: no Pairflow lifecycle, transcript storage,
   backend protocol semantics, or API route redesign.
4. Hidden scope ruled out: badge cutover, meta-review progress/synthetic rows,
   final payload removal, and layout redesign.

### Success / Completion Proof Boundary

This task is complete when `BubbleTimeline.tsx` no longer reads raw payload or
payload metadata for title/summary, sender label, role, row kind, or base tone;
the replaced basic helpers are removed or narrowed; and focused UI tests prove
the frozen behavior for those families still passes.

### Capability Closure

1. Capability claim: basic operator-visible timeline row display uses the
   backend-produced display DTO for title/summary, sender label, role, row kind,
   blocked state, and base tone.
2. Closure classification: `end_to_end` for this basic display slice only.
3. Activation trigger: loading an expanded bubble detail view through the normal
   UI read-model path.
4. Entrypoint: `presentTimeline` / timeline presenter output consumed by
   `BubbleTimeline.tsx` through the existing UI read model.
5. Configuration owner: repo default; no new feature flag, deployment setting,
   credential, or operator setup is introduced.
6. Repo-provided parts: UI contract types, response validation allowlist,
   timeline display presenter output, UI fixture construction, and
   `BubbleTimeline` rendering/tests.
7. External prerequisites: none beyond the existing local app/test runtime.
8. Success output contract: visible timeline rows render the producer-emitted
   basic display fields, including conflicting-payload guard cases where
   `entry.display` wins.
9. Failure output contract: incomplete basic fields render the explicit
   producer-emitted neutral/unknown display values; React does not recover by
   reading raw payload.
10. Operator/user path: open a bubble detail view and inspect the timeline rows;
    tests exercise the same component/read-model shape instead of an internal
    helper-only seam.
11. Last-mile proof: focused `BubbleTimeline` tests covering display-over-payload
    and blocked-state conflicts, plus typecheck/lint/fitness/root and UI build
    validation named in the validation contract.

### Precondition and Side-Effect Boundary

N/A for runtime side effects. This task changes shared UI contract typing,
presenter display output, React rendering, fixtures, and tests only. It must not
mutate Pairflow lifecycle state, transcript storage, persistence state, or
runtime command behavior.

## L1 - Change Contract

### 1) Data / Read Contract

#### Canonical Contract Matrix

| Basic Display Field | Producer Authority | React Read Rule | Missing / Malformed Rule | Legacy Source Replaced | Successor Boundary |
|---|---|---|---|---|---|
| `display.title` | `timelineDisplayPresenter.ts`, reached through `timelinePresenter.ts` output | Use as the row heading/title source for in-scope rows. | Render the producer-emitted neutral title; do not inspect payload for recovery. | `payload.summary`, `payload.question`, `payload.message`, `payload.decision` title fallback helpers. | Badge/meta/synthetic tasks must not redefine row title fallback. |
| `display.summaryText` | `timelineDisplayPresenter.ts` | Use as the basic body/summary text for normal row summary display. | Render the producer-emitted neutral summary text. | UI-local summary/question/message/decision fallback chain. | Later tasks may render badges/progress around this text but not reconstruct it. |
| `display.summarySource` | `timelineDisplayPresenter.ts` | Use only for display/test semantics and any existing source-specific basic styling that remains in scope. | Unknown source must already be normalized by producer to an allowlisted value. | UI-local checks for which payload field supplied the summary. | Later tasks inherit the source taxonomy from task 2. |
| `display.senderLabel` | `timelineDisplayPresenter.ts` | Use as the visible sender label. | Render the producer-emitted `Unknown` or equivalent neutral label. | Sender/author metadata and protocol sender label helpers. | Badge/meta tasks may not derive sender labels from payload metadata. |
| `display.role` | `timelineDisplayPresenter.ts` | Use for role class/icon/basic label decisions. | Render the producer-emitted `unknown` role behavior. | React role inference from sender, actor metadata, or payload metadata. | Later tasks can add role-specific badges only from display DTO extensions. |
| `display.rowKind` | `timelineDisplayPresenter.ts` plus `UiTimelineRowKind` contract | Use for basic row family/state branching in this task. Human-question blocked rows must render from `rowKind=\"blocked\"` rather than `entry.type`. | Render the producer-emitted `normal`/neutral behavior for unknown non-blocked rows; blocked rows require the producer-emitted `blocked` value. | Protocol type/status checks used for basic row state, including `entry.type === \"HUMAN_QUESTION\"`. | Task 5 owns deeper gate/meta/synthetic row behavior. |
| `display.tone` | `timelineDisplayPresenter.ts` | Use for base tone/class selection in this task. | Render the producer-emitted neutral tone. | UI-local severity/status/tone inference for basic row state. | Task 4 owns badge tones; task 5 owns progress/gate tones. |
| Blocked basic state | `timelineDisplayPresenter.ts` plus `UiTimelineRowKind` contract | Blocked rendering is explicitly represented as `display.rowKind=\"blocked\"` and `display.tone=\"warning\"`; React renders the existing blocked label/state from those display fields and `display.senderLabel`. | If a row is not producer-classified as `blocked`, React must not recover blocked state from protocol type. | `isBlockedEntry(entry)` / `entry.type === \"HUMAN_QUESTION\"` in React. | This is the only task-3 DTO contract adjustment; successor tasks must not use it for gate-failure or meta-review state. |

Mirrored Surface Checklist:

1. L0 policy must keep `timelineDisplayPresenter.ts`/`timelinePresenter.ts` as
   the producer authority and `BubbleTimeline.tsx` as a display consumer.
2. L1 data/read contract must use the matrix above as the canonical source for
   basic field presence, read rules, and fallback ownership.
3. L1 React contract must not introduce a second fallback ladder for these
   fields.
4. L1 test contract must include at least one display-over-conflicting-payload
   assertion for a basic field.
5. L2 implementation sketch must keep badge/meta/synthetic cutover deferred.
6. Acceptance criteria must claim only basic-family payload-read removal, not
   full timeline payload removal.

1. In-scope React rendering reads from `entry.display` only:
   - `title`
   - `summaryText`
   - `summarySource`
   - `senderLabel`
   - `role`
   - `rowKind`
   - `tone`
2. Out-of-scope React rendering may temporarily continue to read legacy payload
   for badges, meta-review progress, gate failures, and synthetic approvals.
3. Do not make `display` optional in UI fixtures or component code.
4. If fixture overrides mutate basic row source fields, fixture helpers must
   derive or require matching `display` values instead of producing stale
   type-valid rows.
5. `src/contracts/ui/uiReadModel.ts` and
   `src/v11/infrastructure/ui/routerReadResponseValidation.ts` are writable
   only for the narrow `UiTimelineRowKind` extension that adds `blocked` and
   validates it. `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`
   remains a read-only anchor unless it needs a mechanical import/export update
   caused by that contract adjustment.
6. `timelineDisplayPresenter.ts` must emit `rowKind="blocked"` and
   `tone="warning"` for the existing human-question blocked row family.

### 2) React Contract

1. Replace basic title/summary fallback helpers with display DTO consumption.
2. Replace sender/role label derivation with display DTO consumption.
3. Replace base row kind/tone decisions with display DTO consumption,
   including blocked label/state rendering from `display.rowKind` and
   `display.tone`.
4. Delete or narrow helper functions only for the replaced basic fields.
5. Preserve keyboard, expansion, row ordering, badge rendering, and meta-review
   behavior unless directly required by the basic cutover.

### 3) Test Contract

1. Keep or add focused UI tests for:
   - summary fallback/title display,
   - sender and role labels,
   - unknown/neutral sender and row state,
   - blocked human-question row state from display fields,
   - current visible behavior for existing baseline rows.
2. Add at least one guard assertion that an in-scope basic display value wins
   over conflicting raw payload text, so the React basic path is proven to use
   `display`.
3. Add a blocked-state guard where `entry.type` and `display.rowKind` conflict,
   proving React follows the display DTO for the basic blocked state.
4. Existing badge/meta tests should continue to pass without requiring their
   cutover in this task.

### 4) Validation Contract

Run the narrowest useful checks during implementation, then run:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fitness:check:ci`
4. focused UI tests for `BubbleTimeline`
5. broader affected UI test suite when needed
6. `pnpm test`
7. `pnpm build`
8. `pnpm --dir ui build`

If a check is skipped, the implementation bubble must explain why with the
exact replacement evidence.

### 5) Authority Fan-out Scan

1. Authority producer: `timelineDisplayPresenter.ts`, reached through
   `timelinePresenter.ts`.
2. Shared contract surface: `UiTimelineRowKind` gains only the narrow
   `blocked` value required to preserve the parent-plan blocked/basic row
   state without React reading protocol type.
3. Consumer families touched now:
   - `BubbleTimeline.tsx` basic row rendering,
   - UI fixtures and UI contract mirrors,
   - response validation for the row-kind allowlist.
4. Consumer families deferred:
   - badge rendering remains task 4,
   - meta-review progress/gate/synthetic rows remain task 5,
   - final no-legacy recurrence guards remain task 6.
5. Fan-out risk is acceptable because the shared-contract change is additive,
   allowlisted, and tied to one existing visible row family.

### 6) Closure-Budget Gate

1. Closures intentionally collapsed in this task:
   - narrow shared-contract adjustment: `UiTimelineRowKind += "blocked"`,
   - narrow producer adjustment: `timelineDisplayPresenter` emits
     `rowKind="blocked"` and `tone="warning"` for human-question blocked rows,
   - React read-model consumer cutover for basic fields,
   - focused fixtures/tests.
2. Why this collapse is safe: React cannot stop reading protocol type for the
   parent-plan blocked/basic state unless the display DTO has an explicit
   blocked value. The producer and validator changes are therefore prerequisite
   edges of the same basic read-model cutover, not separate product behavior.
3. Explicitly deferred closures: badges, decision/recommendation rendering,
   meta-review progress, gate-failure semantics, synthetic approval rows,
   full payload removal, and fitness recurrence guards.

### 7) Bounded-Task-Shape Gate

1. Primary bounded shape: `activation_or_read_model` consumer cutover.
2. Adjacent shape: narrow `shared_contract` plus producer adjustment needed to
   expose the existing blocked basic row state through the DTO.
3. Not a pure UI-only task: the task updates the DTO row-kind allowlist and
   presenter output because the parent plan requires blocked/basic state
   rendering to stop reading raw protocol fields in React.
4. The task remains bounded because it does not alter protocol history,
   persistence, lifecycle commands, badge interpretation, or meta-review
   cross-row reconstruction.

### 8) Complexity Risk Gate

1. `authority_risk`: `2` because display authority moves from React helpers to
   presenter-owned DTO fields for basic row families.
2. `surface_spread`: `2` because the slice touches contract, presenter, React,
   fixtures, and focused tests.
3. `identity_join_risk`: `0`; no task/bubble/runtime identity join changes.
4. `activation_coupling`: `1`; the UI consumes the normal read model, but no
   new runtime trigger is added.
5. `prerequisite_risk`: `1`; depends on archived task 2 display DTO foundation.
6. `acceptance_multiplicity`: `2`; basic field cutover plus blocked state guard.
7. `risk_score`: `8`.
8. Foundation sequencing decision: no new foundation task is required because
   task 2 already introduced the display DTO producer foundation; this task is
   the next consumer-family cutover on top of that archived foundation, with
   only the additive `blocked` row-kind extension needed to preserve an
   existing basic row state.
9. Single-task decision: allowed despite `risk_score=8` because the mandatory
   refactor-first/foundation step is already complete in archived task 2, and
   this task does not introduce a new canonical source-of-truth while activating
   a broad feature. It consumes the existing foundation, makes one narrow
   additive contract adjustment, and defers badge/meta/cleanup closures.

### 9) Remaining Task Viability

1. Task 4 `timeline-display-badges`: `valid_as_is`.
2. Task 5 `timeline-display-meta`: `valid_as_is`.
3. Task 6 `timeline-legacy-cleanup`: `valid_as_is`.
4. Downstream impact: `unchanged`; successors inherit display DTO authority and
   keep their existing ownership split.

## L2 - Implementation Sketch

1. Read current `BubbleTimeline.tsx` helpers and map only basic helper outputs
   to the task-2 display fields.
2. Extend `UiTimelineRowKind` and validation to include `blocked`, then make the
   display presenter emit `blocked`/`warning` for human-question rows.
3. Replace basic render call sites with display reads.
4. Remove or shrink obsolete basic payload helper logic after the call sites no
   longer need it.
5. Update UI fixtures/tests so display is the expected source for basic fields.
6. Run focused UI tests early, then the validation contract before convergence.

## Acceptance Criteria

1. `BubbleTimeline.tsx` does not read `entry.payload.*` or
   `payload.metadata.*` for the in-scope basic rendering families.
2. React basic title/summary, sender label, role, row kind, blocked state, and
   tone rendering come from `entry.display`.
3. Existing visible behavior for the basic families is preserved by tests.
4. Badge/meta/synthetic legacy reads are not expanded and remain explicitly
   deferred to successor tasks.
5. No product/runtime behavior outside timeline rendering is changed.

## Hardening Backlog

1. `later-hardening`: add a dedicated no-legacy fitness guard for all timeline
   payload reads after tasks 4 and 5 finish their badge/meta cutovers. This
   remains task 6 scope because payload is still intentionally allowed for
   successor-owned legacy families during task 3.
2. `later-hardening`: remove obsolete protocol-shaped UI fixtures once the
   final cleanup task can prove every normal render path uses display DTO
   fields. Keeping both fixture families before then would obscure which
   successor task owns each remaining legacy read.
3. `later-hardening`: consider extracting shared display-fixture builders if
   task 4 or task 5 duplicates task-3 fixture setup. Do not add that abstraction
   in task 3 unless the implementation shows real duplication across the
   touched tests.
