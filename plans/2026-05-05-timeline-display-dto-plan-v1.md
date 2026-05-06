---
artifact_type: plan
artifact_id: plan_timeline_display_dto_v1
plan_id: timeline-display-dto-plan-v1
created_on: "2026-05-05"
title: "Timeline Display DTO Plan"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-timeline-rules-fixtures
  - 2-timeline-display-contract
  - 3-timeline-display-basics
  - 4-timeline-display-badges
  - 5-timeline-display-meta
  - 6-timeline-legacy-cleanup
active_task_id: 4-timeline-display-badges
last_completed_task_id: 3-timeline-display-basics
archive_group: 2026-05-05-timeline-display-dto-plan-v1
task_tracker:
  - task_id: 1-timeline-rules-fixtures
    task_path: plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/1-timeline-rules-fixtures.md
    status: archived
    notes: "Freeze current timeline display behavior and document the existing protocol-derived rendering rules before contract migration."
  - task_id: 2-timeline-display-contract
    task_path: plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/2-timeline-display-contract.md
    status: archived
    notes: "Introduce the backend-produced display DTO contract and presenter output without changing React rendering yet."
  - task_id: 3-timeline-display-basics
    task_path: plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/3-timeline-display-basics.md
    status: archived
    notes: "Move title, sender, role, and base row state rendering to the display DTO and delete the replaced UI payload readers."
  - task_id: 4-timeline-display-badges
    task_path: plans/tasks/4-timeline-display-badges.md
    status: implementable
    notes: "Move findings, decision, and recommendation badge rendering to the display DTO and delete the replaced UI payload readers."
  - task_id: 5-timeline-display-meta
    task_path: null
    status: not_created
    notes: "Move meta-review handoff, clean-run, gate-failure, and synthetic-row behavior to the presenter and delete the replaced UI state reconstruction."
  - task_id: 6-timeline-legacy-cleanup
    task_path: null
    status: not_created
    notes: "Remove transitional dual-shape support, raw payload render access, obsolete helpers, obsolete fixtures, and guard against recurrence."
---

# Plan: Timeline Display DTO

## Objective

Close the modularity-review finding that the UI timeline still renders from raw
`ProtocolEnvelopePayload` knowledge by moving display interpretation into the
backend timeline presenter and making `BubbleTimeline.tsx` render a stable
UI-specific display DTO.

This plan also fixes the related visual instability risk: the browser timeline
currently reconstructs protocol meaning, meta-review progress, synthetic rows,
roles, badges, and fallback text during render. The target design is:

`ProtocolEnvelope[]` -> backend `timelinePresenter` -> UI display DTO ->
React render only.

## Done Definition

1. `BubbleTimeline.tsx` no longer reads `entry.payload.*`,
   `payload.metadata.*`, `payload.findings`, or `payload.decision` for normal
   rendering.
2. Timeline display behavior is preserved or intentionally changed only when
   called out by a task; accidental visual regressions are caught by focused UI
   and presenter tests.
3. The backend presenter owns timeline display interpretation for title,
   sender, role, base state, badges, meta-review handoff attempts, clean-run
   progress, approve-gate validation failure display, and synthetic display
   rows.
4. The normal UI read-model contract exposes display-ready timeline entries
   instead of requiring the browser to understand `ProtocolEnvelopePayload`.
5. No backward-compatibility or legacy fallback path remains after the final
   cleanup task: no dual render path, no "if display missing then read payload",
   no obsolete payload helper, and no stale protocol-shaped timeline fixture
   used by UI rendering tests.
6. Raw protocol payload may remain only as backend input or explicit debug/archive
   data outside the normal render path; it must not be imported or read by
   `BubbleTimeline.tsx`.
7. Fitness/tests prevent the raw-payload timeline render path from returning.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| Timeline rows render from a stable UI display DTO rather than protocol payload semantics. | end_to_end | UI timeline API/read path through `presentTimeline` and `BubbleTimeline.tsx`. | `src/contracts/ui/**`, `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`, `ui/src/components/expanded/BubbleTimeline.tsx`, tests/fitness. | None. | Planned across tasks 2-6, with task 6 owning final no-legacy proof. |

## Guiding Principles

1. Business invariant: the timeline shown to the operator must reflect the
   backend-owned protocol history consistently, but display interpretation must
   be owned once by the backend UI presenter rather than reconstructed in the
   browser.
2. Control model: `ProtocolEnvelope` and `ProtocolEnvelopePayload` remain
   protocol/history input authority; `timelinePresenter.ts` becomes display
   interpretation authority; `src/contracts/ui/**` owns the browser-safe DTO
   shape; `BubbleTimeline.tsx` owns rendering and interaction only.
3. Read-path rule: the browser may read timeline display fields from the
   UI-specific DTO only. It must not read protocol payload fields or metadata
   keys for normal rendering.
4. Forbidden fallback: no UI-local heuristic fallback to `entry.payload`, no
   regex parsing of `meta_review_handoff_id` in React, no synthetic display row
   construction in React, no comment-driven "keep in sync" protocol mirrors, and
   no transitional dual render path after cleanup.
5. Allowed resolution path: protocol envelopes may be normalized or interpreted
   by backend presenter code, including deterministic same-authority
   reconstruction of existing behavior from payload metadata. The output must
   be explicit display DTO fields that React renders directly.
6. Missing-data rule: when the presenter cannot derive a display field, it must
   emit an explicit neutral/unknown display value or omit an optional display
   field according to the DTO contract. React must not recover missing display
   data by reading raw protocol payload.
7. Sequencing / boundary note:
   - producer-first rule: freeze behavior and add presenter display output
     before React cutover.
   - downstream consume families that remain separate: backend transcript
     reading, backend timeline presentation, browser API client typing, React
     timeline rendering, and UI/contract drift tests.
   - cleanup/recovery timing: cleanup is included in this plan as a required
     final task, not deferred technical debt.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/modularity-review/2026-05-05-modularity-review.md`
   - `docs/architecture/ui-contract-governance.md`
   - `plans/archive/plans/2026-05-02-ui-contract-boundary-plan-v1.md`
   - `plans/archive/plans/2026-05-04-ui-contract-boundary-hardening-plan-v1.md`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`
   - `ui/src/components/expanded/BubbleTimeline.tsx`
   - `ui/src/components/expanded/BubbleTimeline.test.tsx`
2. Closed canonical elements / terms:
   - `src/contracts/ui/**` is the canonical browser-safe UI contract surface.
   - `ProtocolEnvelope` is backend protocol/transcript input, not a browser
     display contract.
   - `BubbleTimeline.tsx` must be a display component, not a protocol
     interpretation layer.
3. Explicitly authorized reinterpretation: none. This plan narrows the
   timeline read model without changing protocol history semantics.
4. Downstream task impact: every task must preserve or explicitly account for
   the current timeline behavior while moving ownership from React helpers to
   backend presenter rules. Successor tasks inherit the no-backward-compat
   cleanup requirement.

## Current Status

### Completed Work

1. The archived UI contract boundary plans created and hardened
   `src/contracts/ui/**` plus the `@pairflow/ui-contracts` browser-facing
   import path.
2. `UiTimelineEntry` already lives under `src/contracts/ui/uiReadModel.ts`, so
   the contract ownership seam exists.
3. `timelinePresenter.ts` already normalizes selected protocol payload fields
   before sending timeline entries to the UI.
4. `BubbleTimeline.test.tsx` already covers several high-risk timeline display
   cases, including meta-review recommendations, clean runs, handoff attempts,
   gate validation failure, and findings badges.

### Open Work

1. `UiTimelineEntry.payload` is still typed as `ProtocolEnvelopePayload`.
2. `BubbleTimeline.tsx` reads protocol payload fields and metadata directly for
   title, question/message/decision fallback, findings severity tags,
   recommendation tags, sender/role resolution, meta-review handoff attempts,
   clean-run progress, gate-failure detection, and synthetic approval rows.
3. UI tests still construct protocol-shaped payloads as normal rendering
   fixtures, reinforcing the raw-payload contract.
4. There is no hard guard that prevents reintroducing payload-driven timeline
   rendering after the migration.

### Deferred / Future Work

1. Broader visual redesign of the timeline is deferred. This plan may fix
   display stability bugs caused by contract ownership, but it is not a layout
   redesign plan.
2. Standalone packaging of UI contracts remains out of scope; the existing
   `@pairflow/ui-contracts` in-repo entrypoint remains the target import path.
3. Non-timeline UI read-model cleanup remains out of scope.

## Progress / Phase Summary

1. Phase 1: freeze current display behavior and document the implicit rules.
2. Phase 2: add backend-produced display DTO output without React cutover.
3. Phase 3: cut over React in small slices: basics, badges, then meta-review
   sequencing/synthetic rows.
4. Phase 4: remove every transitional/legacy/raw-payload render path and add
   recurrence guards.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-timeline-rules-fixtures` | `plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/1-timeline-rules-fixtures.md` | Inventory the current timeline display rules and add/adjust golden fixtures so the existing behavior is testable before migration. Production/source files are read-only anchors; write scope is limited to focused UI tests and fixture helpers. | N/A | The current behavior is implicit inside React helpers and can regress during migration. | archived |
| `2-timeline-display-contract` | `plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/2-timeline-display-contract.md` | Introduce a UI-specific display DTO under `src/contracts/ui/**` and make `timelinePresenter.ts` emit it in parallel, with presenter tests. React render remains legacy in this task. | `1-timeline-rules-fixtures` | There is no explicit display-ready timeline contract. | archived |
| `3-timeline-display-basics` | `plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/3-timeline-display-basics.md` | Switch React title, sender label, role, base row state, and blocked/neutral state rendering to the display DTO, then delete the replaced UI payload helpers. | `2-timeline-display-contract` | Basic rendering still reads raw protocol payload and sender metadata. | archived |
| `4-timeline-display-badges` | `plans/tasks/4-timeline-display-badges.md` | Switch findings severity, decision, recommendation, and dedupe badge rendering to the display DTO, then delete the replaced UI payload helpers and fixtures. | `3-timeline-display-basics` | Badge rendering still depends on protocol findings/decision/recommendation fields in React. | implementable |
| `5-timeline-display-meta` | `null` | Switch meta-review handoff attempt, clean-run progress, approve-gate validation failure, and synthetic display rows to presenter-owned output, then delete the replaced React state reconstruction. | `4-timeline-display-badges` | The most fragile meta-review timeline behavior is still reconstructed in React. | not_created |
| `6-timeline-legacy-cleanup` | `null` | Remove transitional dual-shape support, raw payload normal-render access, obsolete helpers, obsolete tests/fixtures, and add no-legacy guards. | `5-timeline-display-meta` | Migration residue could leave permanent compatibility code and allow the coupling to return. | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| Current timeline behavior is implicit and risky to move. | `1-timeline-rules-fixtures` | This task should name each current rule before implementation tasks move it. |
| No display-ready timeline DTO exists. | `2-timeline-display-contract` | Presenter output is introduced before UI cutover to keep the slice small. |
| Basic row rendering reads protocol payload/metadata. | `3-timeline-display-basics` | Must delete the replaced UI helpers in the same task. |
| Badge rendering reads findings, decisions, and recommendation metadata. | `4-timeline-display-badges` | Must delete the replaced UI helpers in the same task. |
| Meta-review progress and synthetic rows are reconstructed in React. | `5-timeline-display-meta` | Kept separate because this is the highest regression-risk behavior. |
| Transitional compatibility code could remain. | `6-timeline-legacy-cleanup` | This is mandatory, not optional follow-up hardening. |

## Dependencies and Order

1. `1-timeline-rules-fixtures` must run first because the current behavior is
   the migration source of truth.
2. `2-timeline-display-contract` must run before any React cutover because the
   display DTO is the new producer contract.
3. `3-timeline-display-basics`, `4-timeline-display-badges`, and
   `5-timeline-display-meta` intentionally split React migration by rendering
   concern so no bubble has to change the full component, presenter, contract,
   and test surface at once.
4. `5-timeline-display-meta` is after badges because it owns cross-row state
   and synthetic rows; it should start from already DTO-driven simple fields.
5. `6-timeline-legacy-cleanup` is the final gate and cannot be skipped. It must
   remove temporary compatibility and prove the normal render path has zero raw
   protocol payload reads.

## Required No-Backward-Compatibility Policy

1. This is not a compatibility-preserving migration. Temporary dual-shape
   support is allowed only as a bounded migration tactic before the final
   cleanup task.
2. Each UI cutover task must delete the legacy helpers it replaces in the same
   task. Do not leave old helpers "for safety" once their display DTO
   replacement is active.
3. The final cleanup task must remove obsolete tests and fixtures rather than
   keeping both protocol-shaped and display-shaped fixture families for the same
   render behavior.
4. Acceptance for task 6 must include targeted `rg` checks. The exact patterns
   may be refined by the task, but the intent is:

   ```bash
   rg "entry\\.payload|payloadSummary|extractMetaReviewHandoffAttempt|buildSyntheticMetaApprovalEntry|buildDisplayTimelineItems" ui/src/components/expanded
   rg "ProtocolEnvelopePayload" ui/src src/contracts/ui
   rg "latest_recommendation|meta_review_handoff_id|delivery_target_role|actor_agent" ui/src/components/expanded
   ```

   Expected result for normal render code: zero matches. If a term remains in a
   backend presenter, debug-only contract, or non-render test assertion, the task
   must justify the ownership explicitly and prove `BubbleTimeline.tsx` does not
   consume it.

## Risks and Assumptions

1. The current React helper behavior may contain display bugs. The first task
   should freeze current behavior only where it is intentional or currently
   relied on; obvious bugs may be documented as intentional changes for a later
   task rather than preserved blindly.
2. The meta-review clean-run/synthetic-row logic is the highest-risk slice
   because it derives cross-row display state from sparse protocol metadata.
3. Adding a display DTO in parallel is acceptable only as a short migration
   step. The plan is incomplete until the raw payload render path is removed.
4. Raw protocol payload may still be necessary for transcript archive/debug
   needs, but that must not leak into normal UI rendering.
5. The plan assumes the existing `@pairflow/ui-contracts` entrypoint remains
   available and does not need another packaging task.

## Validation Strategy

1. Plan/task document review should first verify that the task split remains
   small enough for bubble convergence and that cleanup is not deferred.
2. Contract/presenter tasks should run:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - targeted presenter and contract tests for timeline DTO output
3. UI cutover tasks should run:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm fitness:check:ci`
   - `pnpm --dir ui test -- BubbleTimeline`
   - broader `pnpm --dir ui test` when the changed slice affects shared UI
     test utilities or API types
4. Final cleanup must additionally run targeted `rg` no-legacy checks for raw
   payload rendering, obsolete helper names, and protocol metadata keys inside
   `BubbleTimeline.tsx`.
5. If a task directly changes `src/**`, `scripts/**`, or runtime-affecting
   config, run `pnpm build` before lifecycle commands according to the repo
   Build Freshness Policy.
