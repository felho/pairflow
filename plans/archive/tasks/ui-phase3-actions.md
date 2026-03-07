# Task: UI Phase 3 - Expanded Views + Actions

## Goal

Add expanded bubble views and complete operator action flows: timeline, state-gated action buttons, message modals, commit/merge UX, and clipboard-based attach command copy.

## PRD References (Source of Truth)

- `docs/pairflow-ui-prd.md` -> `Action availability matrix`
- `docs/pairflow-ui-prd.md` -> `API/Backend Contract (thin layer over existing core)`
- `docs/pairflow-ui-prd.md` -> `UX Design` (`Layout`, expanded card expectations)
- `docs/pairflow-ui-prd.md` -> `Edge cases to explicitly handle`
- `docs/pairflow-ui-prd.md` -> `Mockup requirements check`

## Scope Boundary

### In Scope

1. Implement expanded bubble panel with:
   - timeline view from `/api/bubbles/:id/timeline`
   - inbox highlights and latest state details.
2. Implement state-gated action button rendering strictly per PRD action availability matrix.
3. Implement message-required modal flows:
   - `request-rework` (required message)
   - `reply` (required message).
4. Implement action flows for:
   - `start`, `approve`, `resume`, `commit`, `merge`, `open`, `stop`.
5. Implement commit form defaults and options per API contract (`auto`, optional `message`, optional `refs`).
6. Implement merge panel with explicit text: `"Merge includes runtime/worktree cleanup."`
7. Implement attach action as clipboard copy of `tmux attach -t pf-<bubble-id>`.
   - Attach button is enabled only when bubble has runtime-capable state (`RUNNING`, `WAITING_HUMAN`, `READY_FOR_APPROVAL`, `APPROVED_FOR_COMMIT`, `COMMITTED`) and runtime session presence is true.
   - Attach is hidden or disabled in `CREATED`, `PREPARING_WORKSPACE`, `DONE`, `FAILED`, `CANCELLED`.
   - If state is runtime-capable but runtime session is missing/stale, show disabled Attach with session-unavailable hint.
8. Handle concurrent CLI/UI updates by refetching state after `409` and prompting retry.
9. Surface merge/open runtime failures clearly in expanded view.

### Out of Scope

1. New backend endpoints or state machine changes.
2. In-browser terminal embedding or auto terminal launch for attach.
3. New orchestration commands not in V1 scope.
4. Mobile-specific interaction redesign.

## Dependencies

1. Depends on Phase 1 API/action endpoints and SSE behavior.
2. Depends on Phase 2 app shell, compact cards, data/state layer, and event plumbing.
3. Must preserve existing core behavior equivalence with CLI.

## Acceptance Criteria

1. Expanded view opens for a bubble and loads timeline/inbox details from backend.
2. Action buttons are enabled/disabled exactly as defined in PRD action availability matrix.
3. Action-bar tests verify both positive and negative cases for every lifecycle state, including that disallowed actions are absent/disabled in `COMMITTED`, `DONE`, `FAILED`, and `CANCELLED`.
4. `request-rework` and `reply` cannot be submitted without message text and show validation feedback.
5. Action submissions call correct endpoints and update UI state on success.
6. On `409` action conflict, UI refetches current state and shows retry guidance.
7. Commit flow sends payload shape compatible with API contract and supports default `auto` path.
8. Merge flow exposes `push` and `deleteRemote` options and includes required cleanup copy text.
9. Merge/open failures are surfaced with actionable error details from API.
10. Attach control copies exact command format `tmux attach -t pf-<bubble-id>` to clipboard when enabled.
11. Attach control remains hidden/disabled outside runtime-capable states or when runtime session is absent/stale.
12. Timeline rendering remains stable with partial trailing transcript line tolerance from backend.
13. Expanded view reflects watchdog/escalation transitions while open (for example `RUNNING -> WAITING_HUMAN`).

## Key Files To Create/Modify

1. `ui/src/components/expanded/BubbleExpandedPanel.tsx` (new)
2. `ui/src/components/expanded/BubbleTimeline.tsx` (new)
3. `ui/src/components/actions/ActionBar.tsx` (new)
4. `ui/src/components/actions/MessageModal.tsx` (new)
5. `ui/src/components/actions/CommitForm.tsx` (new)
6. `ui/src/components/actions/MergePanel.tsx` (new)
7. `ui/src/lib/actionAvailability.ts` (new)
8. `ui/src/lib/attachAvailability.ts` (new)
9. `ui/src/lib/clipboard.ts` (new)
10. `ui/src/state/useBubbleStore.ts` (modify)
11. `ui/src/lib/api.ts` (modify)
12. `tests/ui/actions/*.test.tsx` (new)
13. `tests/ui/expanded/*.test.tsx` (new)

## Quality Requirements

1. TypeScript strict mode must pass; no `any` in new code.
2. Every new frontend action/view module must include unit tests.
3. Integration-style tests must cover action API calls and state refresh behavior after failures.
4. All failure paths in PRD edge cases relevant to actions/expanded views must be handled explicitly.
5. UI action gating must be table-driven and tested against the full state matrix to prevent regression.
