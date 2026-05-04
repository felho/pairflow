---
artifact_type: task
artifact_id: task_ui_card_placement_ui_integration_v1
task_family_id: card-placement-ui-integration
sequence_key: "2"
task_id: 2-card-placement-ui-integration
title: "Card Placement UI Integration"
status: approved
phase: phase2
target_files:
  - "ui/src/state/useBubbleStore.ts"
  - "ui/src/state/useBubbleStore.test.ts"
  - "ui/src/components/canvas/BubbleCanvas.tsx"
  - "ui/src/components/canvas/BubbleCanvas.test.tsx"
prd_ref: docs/pairflow-ui-prd.md
plan_ref: plans/ui-card-placement-determinism-plan-v1.md
system_context_ref: docs/pairflow-ui-prd.md
owners:
  - "felho"
doc_bubble_id: 2-card-placement-ui-integration-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ui-card-placement-determinism-plan-v1
---

# Task: Card Placement UI Integration

## L0 - Policy

### Goal

Wire the pure viewport-aware placement policy into the running browser UI so
newly discovered bubble cards without explicit persisted/manual positions are
placed into the best visible empty fixed-grid slot on initial load and realtime
`bubble.updated` insertion.

This task consumes the helper produced by `1-card-placement-policy`; it owns
store/canvas integration, viewport measurement handoff, generated-fallback
source handling, and UI/store tests. It must not move placement authority into
Pairflow core or rewrite existing explicit user positions.

### Domain / Control Model Summary

1. Business invariant: a newly discovered bubble should be immediately
   discoverable in the operator's current UI context whenever a usable visible
   slot exists.
2. Control model: browser UI owns local card placement preferences; Pairflow
   backend/core owns bubble lifecycle truth only.
3. Grid model: the grid is fixed in canvas coordinates. The viewport is only a
   window over that fixed grid, not a new viewport-relative grid origin.
4. Read-path rule: missing-position placement may read current visible bubbles,
   explicit stored positions, expanded/collapsed state, the pure layout helper,
   and the measured canvas viewport rectangle.
5. Forbidden fallback: do not infer placement from backend ordering, transcript
   content, tmux/runtime state, creation timestamps, randomness, or ad hoc
   append-below behavior.
6. Allowed resolution path: when viewport geometry exists, call
   `resolveViewportAwarePosition(...)`; when geometry is unavailable, render a
   generated fallback that remains replaceable until the user explicitly commits
   or moves the card.
7. Missing-data rule: geometry-unavailable fallback positions must not become
   indistinguishable from durable manual/user positions.
8. Phase boundary:
   - contract closure: predecessor task.
   - producer closure: this task wires the store/canvas producer path.
   - internal execution closure: this task.
   - workflow/orchestration closure: N/A.
   - read-model closure: this task for browser-local placement state only.
   - activation closure: this task proves the browser canvas path.
   - cleanup/recovery closure: localStorage migration remains out of scope.

### Plan Linkage

1. Parent plan gap closed: store/canvas does not provide viewport geometry to
   missing-position placement.
2. Depends on: `1-card-placement-policy` archived.
3. Unlocks / impacts successors: completes the V1 plan when implementation,
   document review, and archive aftermath settle.
4. Task-list impact: creates planned task `2-card-placement-ui-integration`.
5. Inherited validation / exit expectation: UI tests must prove initial load,
   realtime insertion, geometry-unavailable fallback replacement, and persisted
   position preservation.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/ui-card-placement-determinism-plan-v1.md`
   - `docs/pairflow-ui-prd.md`
   - `ui/src/lib/canvasLayout.ts`
   - `ui/src/state/useBubbleStore.ts`
   - `ui/src/components/canvas/BubbleCanvas.tsx`
   - `ui/src/state/useBubbleStore.test.ts`
   - `ui/src/components/canvas/BubbleCanvas.test.tsx`
2. Canonical elements:
   - bubble card placement is browser-local.
   - `pairflow.ui.canvas.positions.v1` stores explicit user/manual positions.
   - generated fallback placement is display/default authority only.
   - manual/persisted positions outrank generated defaults.
   - backend/core bubble state remains independent from UI placement.
3. Guard elements:
   - viewport geometry is a browser measurement guard/input.
   - generated fallback source classification guards against premature
     persistence.
4. Compat-only elements:
   - existing index-based `defaultPosition(index)` remains the no-geometry
     fallback path only.
5. Forbidden reinterpretations:
   - do not turn fallback-generated positions into durable manual positions.
   - do not make the grid viewport-relative.
   - do not rearrange existing explicit positions.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `ui/src/state/useBubbleStore.ts`
   - `ui/src/components/canvas/BubbleCanvas.tsx`
   - `ui/src/lib/canvasLayout.ts`
2. Actual touched scope: browser-local store/canvas placement integration and
   tests.
3. Mutation entrypoints in scope: local UI position persistence only.
4. Hidden scope ruled out: API payloads, backend state, bubble lifecycle,
   task/core runtime, and localStorage migration of existing entries.
5. Branch inventory note: initial load vs realtime event; viewport available vs
   unavailable; explicit persisted position vs missing position; generated
   fallback before viewport measurement vs explicit user move.
6. Why the declared task shape matches reality: all needed behavior can be
   implemented by passing measured viewport geometry into the missing-position
   assignment path and preserving explicit-position precedence.

### Authority Boundary Map

1. Authority producer: browser UI store/canvas placement path.
2. Stored authority: `pairflow.ui.canvas.positions.v1` for explicit
   user/manual positions only.
3. In-scope consumers: canvas render path and store tests.
4. Explicit out-of-scope consumers: Pairflow API, core lifecycle state,
   transcript/runtime state, and multi-user placement sync.
5. Export surfaces closed in this phase: store/canvas integration of the
   existing layout helper.

### Baseline Preservation

1. Must-preserve behaviors:
   - existing persisted/manual positions are not rewritten.
   - drag/keyboard/manual position commits remain durable user authority.
   - `defaultPosition(index)` and non-overlap fallback remain available when
     viewport geometry is missing.
   - backend API and SSE payload contracts are unchanged.
2. Allowed resolution paths:
   - viewport-aware missing-position assignment for unpositioned bubbles.
   - generated fallback display/default placement when geometry is unavailable.
   - later replacement of generated fallback while no explicit user/manual
     position exists.
3. Forbidden regression interpretations:
   - do not reposition all cards on viewport changes.
   - do not store generated fallback as explicit user placement before geometry
     exists.
   - do not block rendering while waiting for viewport geometry.
4. Replacement proof required if removed: any change to storage write timing
   must prove manual position preservation and fallback replacement behavior.

### Success / Completion Proof Boundary

The task is complete only when the running browser canvas path can consume
viewport bounds and place newly discovered missing-position bubbles through the
same policy that unit tests exercise.

### Precondition and Side-Effect Boundary

1. Before writing explicit position storage for an automatically placed bubble,
   prove the placement source is viewport-aware or that a user action committed
   the generated fallback.
2. Do not write backend/core state for placement.
3. If viewport geometry is missing, render with generated fallback and keep the
   bubble eligible for viewport-aware placement later.

### In Scope

1. Pass measured canvas viewport bounds into missing-position placement.
2. Integrate `resolveViewportAwarePosition(...)` into initial load and realtime
   `bubble.updated` insertion for bubbles without explicit positions.
3. Track enough source-of-authority state to distinguish generated fallback
   from explicit user/manual positions.
4. Preserve existing persisted positions and manual movement behavior.
5. Add focused store/canvas tests for initial load, realtime insertion,
   fallback replacement, and persisted/manual precedence.

### Out of Scope

1. Migrating existing `pairflow.ui.canvas.positions.v1` entries.
2. Rearranging already positioned cards.
3. Backend/core API, SSE payload, task runtime, or lifecycle changes.
4. Cross-browser visual screenshot automation unless unit/component tests cannot
   prove the measured canvas boundary.

### Safety Defaults

1. Rendering must continue when viewport geometry is unavailable.
2. Generated fallback must remain replaceable until explicit user/manual commit.
3. Unknown stored positions must be treated as explicit occupied rectangles.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | New missing-position bubbles prefer useful visible fixed-grid slots. | Store/canvas must call viewport-aware helper when geometry exists. | P1 | required-now |
| Control model | Browser-local UI owns placement; backend owns lifecycle only. | Do not change API/SSE/core contracts. | P1 | required-now |
| Grid model | Grid is fixed in canvas coordinates; viewport is a window over it. | Candidate positions must use canvas grid coordinates, not viewport-relative origin. | P1 | required-now |
| Read-path rule | Read explicit positions, expanded state, visible bubbles, and viewport bounds. | Store/canvas interface must provide these inputs deterministically. | P1 | required-now |
| Persistence boundary | Generated fallback is not manual/user authority. | Store must retain source distinction or defer storage until viewport placement/user commit. | P1 | required-now |
| Missing-data rule | Missing viewport renders fallback and remains replaceable. | First render must not block or permanently pin fallback. | P1 | required-now |

### 0a) Canonical Contract Matrix

| Contract Row | Input State | Required Output / State | Owned By This Task | Forbidden Interpretation | Required Tests |
|---|---|---|---|---|---|
| CCM1 | initial load, viewport measured, bubble lacks explicit position | position chosen by `resolveViewportAwarePosition(...).source="viewport"` | store/canvas integration | do not use sorted index as primary placement | T1 |
| CCM2 | realtime `bubble.updated`, viewport measured, new bubble lacks explicit position | new card placed in best visible empty fixed-grid slot | SSE consume path in store | do not infer from creation timestamp/backend order beyond bubble existence | T2 |
| CCM3 | bubble has persisted/manual position | existing position preserved and treated as occupied | explicit-position precedence | do not rewrite because a better visible slot exists | T3 |
| CCM4 | viewport unavailable on first render | generated fallback rendered without durable manual persistence | fallback display path | do not make fallback indistinguishable from user placement | T4 |
| CCM5 | viewport becomes available after generated fallback and user has not moved card | fallback may be replaced by viewport-aware placement | fallback replacement path | do not keep stale fallback as durable authority | T5 |
| CCM6 | user moves/commits before viewport-aware replacement | user/manual position becomes durable and is preserved | manual commit path | do not replace explicit user action later | T6 |

### 1) Call-Site Matrix

| ID | File | Function / Entry | Expected Behavior | Priority | Evidence |
|---|---|---|---|---|---|
| CS1 | `ui/src/state/useBubbleStore.ts` | missing-position assignment on load/update | uses viewport-aware result when bounds exist and preserves source semantics | P1 | store tests |
| CS2 | `ui/src/components/canvas/BubbleCanvas.tsx` | canvas viewport measurement handoff | supplies canvas-coordinate viewport rectangle to the store path | P1 | component tests |
| CS3 | `ui/src/state/useBubbleStore.ts` | manual position updates | commits explicit user/manual authority and prevents generated replacement | P1 | store tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority |
|---|---|---|---|---|
| Missing position assignment input | bubble list + stored positions + expanded state | add optional viewport rectangle / placement source handling | additive internal UI contract | P1 |
| Stored positions | explicit `BubblePosition` map | preserve explicit map; add internal/generated distinction only if needed | no migration required | P1 |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Priority |
|---|---|---|---|
| localStorage/UI store | write explicit user/manual positions and viewport-aware auto positions when source semantics are safe | backend/core writes, API/SSE payload changes, migration of existing entries | P1 |

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback Value / Action | Priority |
|---|---|---|---|
| viewport missing/invalid | render generated fallback | deterministic non-overlap fallback, replaceable later | P1 |
| no visible non-colliding candidate | render generated fallback | deterministic fallback with generated source | P1 |
| manual position exists | preserve explicit position | no auto-replacement | P1 |

### 5) Dependency Constraints

| Type | Items | Priority |
|---|---|---|
| must-use | `resolveViewportAwarePosition`, existing store/canvas state patterns, existing localStorage key | P1 |
| must-not-use | backend/core ordering as placement authority, timestamps, randomness, transcript/runtime state | P1 |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|---|
| T1 | initial load viewport-aware placement | existing cards occupy 2x2 except bottom-right | initial bubbles load with viewport bounds | new missing-position card uses bottom-right viewport slot | P1 |
| T2 | realtime insertion viewport-aware placement | visible slot exists and no persisted position for created bubble | `bubble.updated` event adds bubble | new card uses best visible empty slot | P1 |
| T3 | persisted/manual preservation | card has stored explicit position | viewport changes or better slot exists | position is preserved | P1 |
| T4 | geometry-unavailable fallback | viewport missing on first render | bubbles render | generated fallback appears without durable manual authority | P1 |
| T5 | fallback replacement | generated fallback exists, viewport later becomes available, no user move | viewport update runs placement | card receives viewport-aware position | P1 |
| T6 | user move wins | user moves card before viewport replacement | viewport update runs placement | user position remains unchanged | P1 |

## L2 - Implementation Notes

1. Prefer a small internal source marker over changing public stored position
   shape if the store can keep generated fallback out of durable persistence.
2. Keep viewport bounds in canvas coordinates so helper inputs match fixed-grid
   candidate coordinates.
3. If component tests mock geometry, mock the same boundary the running canvas
   uses rather than a separate test-only placement path.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Browser screenshot proof for pan/scroll edge cases. | L2 | P3 | later-hardening | plan deferred work | Add only if jsdom/component tests cannot prove measured geometry. |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed
   `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. Contract-Dense Task Gate applies; L1 `0a) Canonical Contract Matrix` is the
   canonical source for source/persistence semantics.

## Spec Lock

This task is approved for document-bubble routing based on the same-artifact
`ReviewSpec task-mode` result from the local distinct review step in this
ExecutePairflowPlan invocation (`decision=approve_task`). It must not be marked
`implementable` until the ExecutePairflowPlan document-bubble close workflow
owns that transition.
