# Task: UI Phase 2 - Frontend Canvas

## Goal

Implement the frontend foundation in `ui/` with React + Vite + Tailwind, then deliver the compact bubble canvas with drag positioning, real-time updates, and header status controls.

## PRD References (Source of Truth)

- `docs/pairflow-ui-prd.md` -> `Retained implementation decisions`
- `docs/pairflow-ui-prd.md` -> `UX Design` (`Layout`, `Visual mapping`)
- `docs/pairflow-ui-prd.md` -> `Real-time model`
- `docs/pairflow-ui-prd.md` -> `Edge cases to explicitly handle`

## Scope Boundary

### In Scope

1. Create `ui/` package using React + Vite + Tailwind + shadcn/ui baseline.
2. Configure strict TypeScript for frontend package.
3. Implement app shell:
   - header with global state counts
   - repo filter pills
   - reconnect/SSE health indicator.
4. Implement canvas with compact draggable bubble cards.
5. Persist bubble card position in browser `localStorage`.
6. Implement data layer against Phase 1 APIs:
   - initial fetch for repos/bubbles
   - SSE subscribe to `/api/events`
   - polling fallback every 2-5 seconds when SSE disconnected.
7. Render compact card visuals aligned with PRD visual mapping table (state-to-color/indicator mapping).
8. Ensure UI handles deleted/moved bubbles and stale session indicators without crashing.
9. Thread runtime session presence (`runtimeSession`/`hasRuntimeSession`) through frontend state for Phase 3 attach gating.

### Out of Scope

1. Expanded bubble timeline panel and action controls.
2. Message-required modal flows (`reply`, `request-rework`).
3. Commit/merge interaction flows and attach clipboard action.
4. New backend endpoints or server behavior beyond Phase 1.

## Dependencies

1. Depends on Phase 1 backend endpoints and SSE stream contract.
2. Requires static asset serving path from Phase 1 to host Vite build artifacts.
3. Must preserve architecture constraints in `docs/pairflow-initial-design.md`.

## Acceptance Criteria

1. `ui/` builds with `pnpm` scripts and outputs static bundle consumable by server.
2. Initial load displays bubbles for selected repos from backend API.
3. Header state counts match fetched bubble state distribution.
4. Repo filter pills update canvas content deterministically without full-page reload.
5. Bubble cards are draggable and retain positions across refresh via `localStorage`.
6. SSE-connected state updates card status in near-real-time.
7. When SSE is disconnected, polling fallback activates (2-5s cadence) and refreshes state.
8. Reconnect indicator reflects SSE connected/disconnected/fallback status.
9. Visual mapping for all lifecycle states matches PRD table semantics.
10. UI safely handles bubble removal/move between updates (card disappears or remaps without error).
11. Stale runtime/session condition is visually surfaced on compact card.
12. Frontend state model stores runtime session presence from API responses for each bubble.

## Key Files To Create/Modify

1. `ui/package.json` (new)
2. `ui/tsconfig.json` (new)
3. `ui/vite.config.ts` (new)
4. `ui/tailwind.config.ts` (new)
5. `ui/src/main.tsx` (new)
6. `ui/src/App.tsx` (new)
7. `ui/src/lib/api.ts` (new)
8. `ui/src/lib/events.ts` (new)
9. `ui/src/state/useBubbleStore.ts` (new)
10. `ui/src/components/header/*.tsx` (new)
11. `ui/src/components/canvas/*.tsx` (new)
12. `ui/src/styles/*.css` (new)
13. `tests/ui/*.test.tsx` (new)

## Quality Requirements

1. TypeScript strict mode must pass; no `any` in new code.
2. Every new frontend module/component must include unit tests.
3. Integration-style tests must cover API/SSE client behavior at boundaries.
4. Frontend must handle PRD edge cases relevant to streaming, stale state, and missing/deleted bubbles.
5. Keep API usage aligned with PRD contract; do not duplicate backend business logic client-side.
