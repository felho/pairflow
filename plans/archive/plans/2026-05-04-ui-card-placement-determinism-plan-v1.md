---
artifact_type: plan
artifact_id: plan_ui_card_placement_determinism_v1
plan_id: ui-card-placement-determinism-plan-v1
created_on: "2026-05-04"
title: "UI Card Placement Determinism Plan"
status: approved
plan_status: done
prd_ref: docs/pairflow-ui-prd.md
owners:
  - "felho"
task_order:
  - 1-card-placement-policy
  - 2-card-placement-ui-integration
active_task_id: null
archive_group: 2026-05-04-ui-card-placement-determinism-plan-v1
task_tracker:
  - task_id: 1-card-placement-policy
    task_path: plans/archive/tasks/2026-05-04-ui-card-placement-determinism-plan-v1/1-card-placement-policy.md
    status: archived
  - task_id: 2-card-placement-ui-integration
    task_path: plans/archive/tasks/2026-05-04-ui-card-placement-determinism-plan-v1/2-card-placement-ui-integration.md
    status: archived
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
   slot derived from expanded-card dimensions and configured gaps.
2. Fully visible empty slots in the current canvas viewport are preferred before
   partially visible slots.
3. Fully visible slots are ranked row-major: top to bottom, then left to right.
4. If no fully visible empty slot exists, partially visible slots that are
   horizontally fully visible are preferred before horizontally clipped
   right-side slots; remaining horizontal-clipped partial ties are ranked by
   visible card area and row-major order.
5. Candidate generation uses one expanded-card grid for both collapsed and
   expanded render modes, while occupied-slot detection still respects each
   card's rendered footprint and the configured spacing margin.
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
| The browser UI places newly discovered bubble cards in the most useful visible empty grid slot. | end_to_end | `pairflow ui` browser canvas, initial `GET /api/bubbles`, and SSE `bubble.updated` events. | `ui/src/lib/canvasLayout.ts`, `ui/src/state/useBubbleStore.ts`, canvas/store tests, and a viewport-measured canvas proof. | Browser viewport measurements are available in the running UI; tests may provide deterministic viewport geometry through the canvas DOM boundary. | Completed by archived task `2-card-placement-ui-integration`: store/canvas tests prove measured viewport bounds for initial load, realtime insertion, fallback replacement, and persisted/manual precedence. |

## Guiding Principles

1. Business invariant: a newly created bubble should be immediately discoverable
   in the operator's current UI context whenever any usable visible slot exists.
2. Control model: the browser UI owns only local card placement preferences;
   Pairflow core owns bubble lifecycle state and must not receive placement
   authority.
3. Read-path rule: placement candidates are computed from current visible
   bubbles, persisted positions, expanded/collapsed UI state, the shared
   expanded-card grid, configured gaps, and the current canvas viewport
   rectangle.
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
   - cleanup/recovery timing: legacy localStorage position authority is
     invalidated by a storage-key version bump when the expanded-grid contract
     changes; newly missing positions are assigned by this policy.

## Placement Policy Contract

1. Grid origin and cell size:
   - candidate positions use the existing canvas grid origin and an expanded
     card-sized cell: `startX`, `startY`, `expandedCardDimensions`, `xGap`, and
     `yGap`.
   - collapsed cards render on that same expanded-card grid; there is no
     separate denser collapsed-card grid.
   - visibility and collision checks still use the bubble's current rendered
     footprint, so collapsed cards have collapsed rectangles and expanded cards
     have expanded rectangles.
2. Candidate domain:
   - compute the current scroll viewport as a rectangle in canvas coordinates.
   - generate row-major grid candidates whose slot rectangle has positive
     intersection with the viewport.
   - include the immediate right and bottom frontier cells when their slot
     rectangle has positive viewport intersection, but frontier cells that are
     only partially visible are eligible only after all fully visible free
     slots have been exhausted.
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
   - for partially visible candidates, prefer candidates whose full width is
     visible in the viewport before horizontally clipped right-side candidates.
   - rank width-visible partial candidates row-major.
   - rank remaining horizontally clipped partial candidates by descending
     visible card area, then row-major.
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
   - `pairflow.ui.canvas.positions.v2` stores explicit card positions under
     the expanded-grid placement contract.
   - legacy `pairflow.ui.canvas.positions.v1` entries are intentionally ignored
     by the expanded-grid implementation to avoid stale pre-contract manual
     coordinates reserving visually empty slots.
   - manual/persisted positions take precedence over generated defaults.
   - backend/core bubble state remains independent from UI placement.
3. Explicitly authorized reinterpretation: the generated default placement
   policy may change from fixed index-based append placement to
   viewport-aware slot selection for bubbles that do not yet have persisted
   positions.
4. Downstream task impact: implementation tasks must preserve current
   localStorage precedence and may only change missing-position assignment;
   legacy pre-contract position storage may be bypassed by versioning.

## Current Status

### Completed Work

1. The UI already has draggable bubble cards with local position persistence.
2. `ui/src/lib/canvasLayout.ts` centralizes card dimensions, gaps, expanded-grid
   default positions, and non-overlap resolution.
3. `ui/src/state/useBubbleStore.ts` already fills missing positions on initial
   load and realtime bubble events.
4. `ui/src/lib/canvasLayout.ts` now ranks viewport-intersecting candidates in
   two passes: fully visible free slots first in row-major order, then partial
   slots by horizontal visibility first, then visible area with row-major
   tie-breaks.
5. `ui/src/state/useBubbleStore.ts` now passes measured viewport geometry into
   missing-position assignment while preserving explicit user/manual positions.
6. `ui/src/components/canvas/BubbleCanvas.tsx` now reports measured scroll
   viewport bounds through the same canvas boundary used by the running UI.

### Open Work

None for V1.

### Deferred / Future Work

1. Automatic rearrangement of already positioned cards is deferred.
2. Cross-browser visual screenshot automation is deferred unless the
   implementation reveals geometry behavior that unit/component tests cannot
   cover reliably.
3. Multi-user or backend-synced card placement remains out of scope for V1.

## Progress / Phase Summary

1. Phase 1: extracted a pure viewport-aware placement policy and covered the
   slot ranking rules with focused layout tests.
2. Phase 2: integrated the policy into missing-position assignment for initial
   load and SSE-created bubbles, then covered canvas/store behavior.

## Open Task List

| Task ID | Task Path | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|---|
| `1-card-placement-policy` | `plans/archive/tasks/2026-05-04-ui-card-placement-determinism-plan-v1/1-card-placement-policy.md` | Define the pure placement policy in `ui/src/lib/canvasLayout.ts`: grid candidate generation, occupied footprint filtering, full-visibility preference, visible-area ranking, and row-major tie-breaks. | N/A | Missing viewport-aware deterministic placement policy. | archived |
| `2-card-placement-ui-integration` | `plans/archive/tasks/2026-05-04-ui-card-placement-determinism-plan-v1/2-card-placement-ui-integration.md` | Wire the placement policy into store/canvas missing-position assignment for initial load and realtime-created bubbles without rewriting persisted/manual positions, prevent geometry-unavailable fallback positions from becoming durable manual/user authority, and prove the viewport-measured browser canvas path. | `1-card-placement-policy` | New bubbles still use the old index-first placement path in the running UI, and early generated fallback positions can be persisted before viewport geometry is known. | archived |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| No explicit visible-slot ranking contract. | `1-card-placement-policy` | The policy task owns row-major and visible-area ranking tests. |
| Existing collision resolver does not evaluate all candidate slots against the viewport. | `1-card-placement-policy` | The shared expanded-card grid and rendered occupied footprints must both be tested. |
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
   entries in place; the expanded-grid implementation may ignore them by
   reading/writing `pairflow.ui.canvas.positions.v2` instead.

## Risks and Assumptions

1. Viewport measurement may be unavailable during first render or in jsdom
   tests; implementation must retain the deterministic non-overlapping
   fallback defined in the placement policy contract without allowing that
   fallback to permanently block later viewport-aware placement.
2. The current fixed `columns = 4` model is preserved only for fallback/default
   index placement on the shared expanded-card grid. Viewport-aware candidate
   discovery is derived from the measured viewport rectangle and the immediate
   visible frontier, not from a hard four-column cap.
3. Collapsed cards intentionally sit on the same expanded-card grid used by
   expanded cards. This sacrifices dense collapsed-only packing because the
   operator workflow primarily uses expanded cards and needs predictable
   expanded-card placement.
4. Existing manually arranged canvases may contain arbitrary coordinates; the
   placement policy must treat those as occupied rectangles, not snap them back
   to grid.

## Validation Strategy

1. Add focused `ui/src/lib/canvasLayout.test.ts` cases for:
   - 2x2 visible viewport with one empty bottom-right slot.
   - row-major choice among multiple fully visible empty slots.
   - partial visibility fallback choosing vertically clipped lower-left slots
     before horizontally clipped right-side slots.
   - fully visible lower-row slots outranking partially visible right-side
     frontier slots.
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
