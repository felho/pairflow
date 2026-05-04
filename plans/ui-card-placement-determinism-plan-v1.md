---
artifact_type: plan
artifact_id: plan_ui_card_placement_determinism_v1
plan_id: ui-card-placement-determinism-plan-v1
created_on: "2026-05-04"
title: "UI Card Placement Determinism Plan"
status: approved
plan_status: approved
prd_ref: docs/pairflow-ui-prd.md
owners:
  - "felho"
task_order:
  - 1-card-placement-policy
  - 2-card-placement-ui-integration
active_task_id: 1-card-placement-policy
archive_group: 2026-05-04-ui-card-placement-determinism-plan-v1
task_tracker:
  - task_id: 1-card-placement-policy
    task_path: plans/tasks/1-card-placement-policy.md
    status: approved
  - task_id: 2-card-placement-ui-integration
    task_path: null
    status: not_created
---

# Plan: UI Card Placement Determinism

## Objective

Make new bubble card placement deterministic and viewport-aware so newly
created or newly discovered bubbles appear in the most useful visible empty
slot instead of landing outside the operator's current view or in a surprising
canvas position.

This plan preserves the existing UI model: bubble coordinates remain a local UI
preference, persisted in browser storage, and the backend/core bubble lifecycle
remains the source of truth for bubble existence and state.

## Done Definition

1. New bubbles without a persisted position are assigned to a deterministic grid
   slot derived from card dimensions and configured gaps.
2. Fully visible empty slots in the current canvas viewport are preferred before
   partially visible slots.
3. Fully visible slots are ranked row-major: top to bottom, then left to right.
4. If no fully visible empty slot exists, partially visible slots are ranked by
   visible card area, with row-major order as the deterministic tie-breaker.
5. Occupied-slot detection respects collapsed and expanded card footprints and
   the configured spacing margin.
6. Existing persisted/manual positions are never rewritten merely because a
   better slot becomes available.
7. Geometry-unavailable fallback positions do not become indistinguishable from
   manual/persisted user positions; later viewport-aware placement may replace
   them until the user explicitly commits or moves the card.
8. UI tests cover initial load and realtime-created bubble placement, including
   the 2x2 visible-grid case discussed from the screenshot.

## Capability Closure

| Capability Claim | Closure Classification | Activation Path | Repo-Provided Boundary | External Prerequisites | Last-Mile Proof |
|---|---|---|---|---|---|
| The browser UI places newly discovered bubble cards in the most useful visible empty grid slot. | end_to_end | `pairflow ui` browser canvas, initial `GET /api/bubbles`, and SSE `bubble.updated` events. | `ui/src/lib/canvasLayout.ts`, `ui/src/state/useBubbleStore.ts`, canvas/store tests, and a viewport-measured canvas proof. | Browser viewport measurements are available in the running UI; tests may provide deterministic viewport geometry through the canvas DOM boundary. | Planned in task `2-card-placement-ui-integration`: prove the same browser canvas path with measured/mocked viewport bounds for initial load and realtime-created bubble insertion. |

## Guiding Principles

1. Business invariant: a newly created bubble should be immediately discoverable
   in the operator's current UI context whenever any usable visible slot exists.
2. Control model: the browser UI owns only local card placement preferences;
   Pairflow core owns bubble lifecycle state and must not receive placement
   authority.
3. Read-path rule: placement candidates are computed from current visible
   bubbles, persisted positions, expanded/collapsed UI state, card dimensions,
   configured gaps, and the current canvas viewport rectangle.
4. Forbidden fallback: do not infer placement from backend ordering, transcript
   content, tmux/runtime state, creation timestamps alone, or ad hoc random /
   append-below behavior.
5. Allowed resolution path: when no persisted position exists for a visible
   bubble, compute one same-authority UI placement candidate deterministically;
   once explicitly persisted from a viewport-aware placement or manually moved,
   preserve that position until the bubble is removed or the user changes it.
6. Missing-data rule: if viewport geometry is unavailable, fall back to the
   existing deterministic non-overlapping grid behavior for rendering, but do
   not promote that geometry-unavailable fallback into durable manual/user
   placement authority.
7. Sequencing / boundary note:
   - producer-first rule: define and test the pure placement policy before
     wiring viewport-aware placement into store/UI update paths.
   - downstream consume families that remain separate: pure layout helpers,
     store position filling, canvas viewport measurement, and UI regression
     tests.
   - cleanup/recovery timing: migration of existing localStorage positions is
     out of scope; only newly missing positions are assigned by this policy.

## Placement Policy Contract

1. Grid origin and cell size:
   - candidate positions use the existing canvas grid origin and card spacing:
     `startX`, `startY`, `collapsedCardDimensions`, `expandedCardDimensions`,
     `xGap`, and `yGap`.
   - the candidate slot rectangle uses the new bubble's current rendered
     footprint: collapsed dimensions for collapsed cards and expanded
     dimensions for expanded cards.
2. Candidate domain:
   - compute the current scroll viewport as a rectangle in canvas coordinates.
   - generate row-major grid candidates whose slot rectangle has positive
     intersection with the viewport.
   - include the immediate right and bottom frontier cells when their slot
     rectangle has positive viewport intersection; this is what lets the fifth
     card prefer the more visible right-side partial slot over a less visible
     lower partial slot.
   - if viewport geometry is unavailable or no candidate intersects the
     viewport, use the preserved deterministic non-overlapping fallback based
     on the current `defaultPosition(index)` and collision resolver.
3. Occupancy:
   - persisted/manual positions are treated as occupied rectangles at their
     actual coordinates, not snapped to the grid.
   - expanded cards occupy their expanded footprint.
   - spacing margins count as occupied for collision purposes.
4. Ranking:
   - discard candidates that collide with occupied rectangles.
   - rank fully visible candidates before partially visible candidates.
   - rank fully visible candidates row-major: smaller `y`, then smaller `x`.
   - rank partially visible candidates by descending visible card area.
   - break equal-area partial ties row-major: smaller `y`, then smaller `x`.
5. Persistence boundary:
   - apply this policy only when a visible bubble has no persisted position.
   - never rewrite an existing persisted/manual position merely because the
     viewport changed or a better slot became available.
   - geometry-unavailable fallback positions are generated display defaults,
     not durable user/manual positions.
   - a geometry-unavailable fallback may be replaced once viewport geometry is
     available and the bubble still has no explicit user/manual position.
   - if the user drags, keyboard-moves, or otherwise commits the card position
     before viewport-aware placement runs, that committed position becomes the
     durable persisted position and must not be replaced.
   - implementation may satisfy this by deferring persistence until viewport
     geometry exists, by tracking generated-position source separately from
     manual persistence, or by an equivalent explicit source-of-authority rule.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/pairflow-ui-prd.md`
   - `ui/src/lib/canvasLayout.ts`
   - `ui/src/state/useBubbleStore.ts`
   - `ui/src/components/canvas/BubbleCanvas.tsx`
   - `ui/src/lib/canvasLayout.test.ts`
   - `ui/src/state/useBubbleStore.test.ts`
   - `ui/src/components/canvas/BubbleCanvas.test.tsx`
2. Closed canonical elements / terms:
   - bubble card placement is a browser-local UI preference.
   - `pairflow.ui.canvas.positions.v1` stores explicit card positions.
   - manual/persisted positions take precedence over generated defaults.
   - backend/core bubble state remains independent from UI placement.
3. Explicitly authorized reinterpretation: the generated default placement
   policy may change from fixed index-based append placement to
   viewport-aware slot selection for bubbles that do not yet have persisted
   positions.
4. Downstream task impact: implementation tasks must preserve localStorage
   precedence and may only change missing-position assignment.

## Current Status

### Completed Work

1. The UI already has draggable bubble cards with local position persistence.
2. `ui/src/lib/canvasLayout.ts` centralizes card dimensions, gaps, default grid
   positions, and non-overlap resolution.
3. `ui/src/state/useBubbleStore.ts` already fills missing positions on initial
   load and realtime bubble events.

### Open Work

1. The current default position starts from sorted bubble index, so a newly
   discovered bubble can be assigned a slot that is deterministic but not the
   most visible empty slot.
2. The existing non-overlap resolver prefers rightward slots for collision
   avoidance, but it does not rank all open grid slots by viewport visibility.
3. Store-level placement does not pass explicit viewport geometry into the
   missing-position assignment path.
4. Tests do not yet encode the desired visible-grid ranking rule.

### Deferred / Future Work

1. Automatic rearrangement of already positioned cards is deferred.
2. Cross-browser visual screenshot automation is deferred unless the
   implementation reveals geometry behavior that unit/component tests cannot
   cover reliably.
3. Multi-user or backend-synced card placement remains out of scope for V1.

## Progress / Phase Summary

1. Phase 1: extract a pure viewport-aware placement policy and cover the slot
   ranking rules with focused layout tests.
2. Phase 2: integrate the policy into missing-position assignment for initial
   load and SSE-created bubbles, then cover canvas/store behavior.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-card-placement-policy` | `plans/tasks/1-card-placement-policy.md` | Define the pure placement policy in `ui/src/lib/canvasLayout.ts`: grid candidate generation, occupied footprint filtering, full-visibility preference, visible-area ranking, and row-major tie-breaks. | N/A | Missing viewport-aware deterministic placement policy. | approved |
| `2-card-placement-ui-integration` | `null` | Wire the placement policy into store/canvas missing-position assignment for initial load and realtime-created bubbles without rewriting persisted/manual positions, prevent geometry-unavailable fallback positions from becoming durable manual/user authority, and prove the viewport-measured browser canvas path. | `1-card-placement-policy` | New bubbles still use the old index-first placement path in the running UI, and early generated fallback positions can be persisted before viewport geometry is known. | not_created |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| No explicit visible-slot ranking contract. | `1-card-placement-policy` | The policy task owns row-major and visible-area ranking tests. |
| Existing collision resolver does not evaluate all candidate slots against the viewport. | `1-card-placement-policy` | Expanded and collapsed footprints must both be tested. |
| Store/canvas does not provide viewport geometry to missing-position placement. | `2-card-placement-ui-integration` | Integration must keep server/core state out of placement authority. |
| Geometry-unavailable fallback positions can be persisted before viewport geometry is known. | `2-card-placement-ui-integration` | Integration must distinguish generated fallback display defaults from durable manual/user placement authority. |
| New bubble placement can regress in initial load vs realtime paths. | `2-card-placement-ui-integration` | Tests must cover both data arrival paths. |

## Dependencies and Order

1. `1-card-placement-policy` must land before UI integration so the ranking
   contract can be tested without React/store timing concerns.
2. `2-card-placement-ui-integration` may adjust `BubbleCanvas` and
   `useBubbleStore` interfaces only as needed to pass viewport bounds into the
   missing-position assignment path.
3. Neither task may migrate or rewrite existing `pairflow.ui.canvas.positions.v1`
   entries; old positions are user preference data.

## Risks and Assumptions

1. Viewport measurement may be unavailable during first render or in jsdom
   tests; implementation must retain the deterministic non-overlapping
   fallback defined in the placement policy contract without allowing that
   fallback to permanently block later viewport-aware placement.
2. The current fixed `columns = 4` model is preserved only for fallback/default
   index placement. Viewport-aware candidate discovery is derived from the
   measured viewport rectangle and the immediate visible frontier, not from a
   hard four-column cap.
3. Expanded cards occupy larger footprints, so a visually empty collapsed slot
   may still be blocked by an expanded neighbor; tests must encode this rather
   than relying on screenshot intuition.
4. Existing manually arranged canvases may contain arbitrary coordinates; the
   placement policy must treat those as occupied rectangles, not snap them back
   to grid.

## Validation Strategy

1. Add focused `ui/src/lib/canvasLayout.test.ts` cases for:
   - 2x2 visible viewport with one empty bottom-right slot.
   - row-major choice among multiple fully visible empty slots.
   - partial visibility fallback choosing the largest visible area.
   - deterministic row-major tie-break for equal visible area.
   - expanded-card blocking.
2. Add `ui/src/state/useBubbleStore.test.ts` coverage for initial load and
   realtime `bubble.updated` insertion using the new placement behavior.
3. Add a viewport-measured canvas proof for the real browser UI path, either in
   `ui/src/components/canvas/BubbleCanvas.test.tsx` with deterministic canvas
   bounds or an equivalent UI test that exercises the same measured viewport
   boundary used by the running canvas.
4. Add coverage for first-render geometry-unavailable behavior: initial data
   may render with deterministic fallback, but once viewport bounds become
   available the bubble must receive viewport-aware placement unless the user
   explicitly moved or committed its position first.
5. Run `pnpm --dir ui test` and `pnpm --dir ui build` for implementation
   completion. If shared TypeScript contracts are touched, also run root
   `pnpm typecheck`.
