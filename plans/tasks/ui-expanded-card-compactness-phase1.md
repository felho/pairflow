# Task: Compact Expanded Bubble Card (Phase 1)

## Context

The expanded bubble card currently has a fixed footprint of `500x520`.

- Source: `ui/src/lib/canvasLayout.ts` (`expandedCardDimensions`)
- Renderer: `ui/src/components/canvas/BubbleExpandedCard.tsx`

In practice, this size is often too dominant on the canvas and reduces scanability when multiple bubbles are active.
The goal of this task is to make the expanded card **meaningfully more compact** while preserving the core workflow.

## Goal

Reduce the expanded card visual footprint (width + height) and increase information density, without losing key actions or critical state context.

## Non-goals

- No redesign of the whole canvas system.
- No changes to bubble lifecycle behavior.
- No backend/API changes.
- No mobile-specific redesign in this phase.

## Baseline (Current)

- Expanded dimensions: `500x520`
- Fixed-height expanded card: yes
- Main vertical sections inside card:
  1. Header (ID, repo tag, round, state, close)
  2. Optional question banner
  3. Action bar
  4. Timeline area
  5. Optional approval package banner

Observed issue: expanded cards are readable but heavy; they consume too much horizontal and vertical canvas real estate.

## Visual Before/After (ASCII)

### Before (today)

```text
+----------------------------------------------------+ 500
| bubble-id | repo-tag | Rn | state | x             |
|----------------------------------------------------|
| [Question banner - multiline]                      |
|----------------------------------------------------|
| [Action buttons row(s)]                            |
|----------------------------------------------------|
| [Timeline list]                                    |
| [entry]                                            |
| [entry]                                            |
| [entry]                                            |
|----------------------------------------------------|
| [Approval package banner]                          |
+----------------------------------------------------+
                        520
```

### After (target direction)

```text
+----------------------------------------------+ 430-450
| bubble-id  repo-tag  Rn  state          x    |
| [optional question strip, single-line]       |
| [actions compact row]                         |
|----------------------------------------------|
| [timeline - denser rows, still readable]      |
| [entry]                                       |
| [entry]                                       |
| [entry]                                       |
| [entry]                                       |
|----------------------------------------------|
| [optional approval strip, single-line]        |
+----------------------------------------------+
                    400-440
```

## Option Set

### Option A: Density pass + smaller fixed dimensions (recommended)

Keep architecture unchanged. Make the same expanded card smaller and denser.

Proposed target:
- Width: `500 -> 440` (or `450` max)
- Height: `520 -> 420` (or `440` max)

Changes:
1. Reduce expanded dimensions in `canvasLayout.ts`.
2. Tighten header spacing and typography in `BubbleExpandedCard.tsx`:
   - smaller paddings
   - tighter gaps
   - slightly smaller repo tag max width
3. Compress optional banners (question/approval) into one-line strips by default.
4. Reduce ActionBar vertical footprint:
   - smaller button paddings and font
   - ensure no unnecessary vertical gaps
5. Increase effective timeline viewport by reducing row paddings and metadata density.

Pros:
- Lowest implementation risk.
- No major interaction changes.
- Immediate footprint win.

Cons:
- Still a single expanded mode (no secondary detail mode).

### Option B: Two-level expanded states (compact + full)

Introduce `expanded-compact` as default and optional `expanded-full` for deep inspection.

Pros:
- Best flexibility.

Cons:
- More state complexity.
- More UI logic and tests.
- Not needed for phase 1 if we only want compactness quickly.

### Option C: Move secondary blocks to overlay/panel

Keep expanded card small; move commit/merge/details to modal or side panel.

Pros:
- Strong compactness.

Cons:
- Interaction model change; larger scope.
- Higher regression risk.

## Recommended Plan (Phase 1)

Implement **Option A** only.

### Proposed concrete spec

1. `expandedCardDimensions` set to:
   - width: `440`
   - height: `430`
2. Header compaction:
   - reduce top/header paddings
   - reduce horizontal gaps in metadata cluster
   - keep current semantics (same data fields)
3. Banner compaction:
   - question/approval blocks use single-line summary first
   - keep full text in tooltip/title or expandable interaction (only if trivial)
4. Timeline density:
   - reduce row vertical padding
   - keep role/status indicators
   - keep compact mode default
5. Action bar density:
   - slightly smaller button paddings
   - keep all current actions visible/available by state

## Implementation Touchpoints

- `ui/src/lib/canvasLayout.ts`
- `ui/src/components/canvas/BubbleExpandedCard.tsx`
- `ui/src/components/expanded/BubbleTimeline.tsx`
- `ui/src/components/actions/ActionBar.tsx`

Potential supporting updates:
- `ui/src/styles/index.css` (if utility overrides are needed)

## Test Impact

Likely test updates required:

- `ui/src/components/canvas/BubbleExpandedCard.test.tsx`
  - style width/height assertions
- `ui/src/lib/canvasLayout.test.ts`
  - overlap expectations if expanded footprint changes candidate selection
- `ui/src/components/canvas/BubbleCanvas.test.tsx`
  - min canvas bounds if affected by expanded dimensions

Add/adjust tests for:
- compact header rendering still includes key metadata
- optional banner compact rendering does not hide critical state cues
- action buttons remain reachable and functional in compact layout

## Acceptance Criteria (Binary)

1. Expanded card rendered dimensions are reduced from `500x520` to a smaller fixed footprint.
2. No overlap regression in placement behavior when expanded cards are present.
3. Header still shows: bubble ID, repo tag, round, state, close control.
4. Action bar remains fully functional for the same state/action matrix.
5. Timeline remains readable and scrollable in the reduced card.
6. WAITING_HUMAN and READY_FOR_APPROVAL contextual signals remain visible.
7. Updated UI tests pass.

## Manual Validation Checklist

1. Open several expanded cards and verify they occupy visibly less area.
2. Verify new bubble placement still avoids overlap with expanded cards.
3. In `WAITING_HUMAN`, verify question cue is visible and reply action accessible.
4. In `READY_FOR_APPROVAL`, verify approval context cue is visible and approve/rework actions accessible.
5. Confirm drag behavior unchanged.

## Deliverables

1. Compact expanded-card layout implementation (phase 1 scope).
2. Updated tests for dimensions/layout behavior.
3. Short before/after screenshot pair (optional but recommended for review).
