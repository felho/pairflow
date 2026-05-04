---
artifact_type: task
artifact_id: task_ui_card_placement_policy_v1
task_family_id: card-placement-policy
sequence_key: "1"
task_id: 1-card-placement-policy
title: "Card Placement Policy"
status: archived
phase: phase1
target_files:
  - "ui/src/lib/canvasLayout.ts"
  - "ui/src/lib/canvasLayout.test.ts"
prd_ref: docs/pairflow-ui-prd.md
plan_ref: plans/ui-card-placement-determinism-plan-v1.md
system_context_ref: docs/pairflow-ui-prd.md
owners:
  - "felho"
doc_bubble_id: 1-card-placement-policy-doc
impl_bubble_id: card-placement-policy-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ui-card-placement-determinism-plan-v1
archive_path: plans/archive/tasks/2026-05-04-ui-card-placement-determinism-plan-v1/1-card-placement-policy.md
closed_at: "2026-05-04T18:26:03+02:00"
---

# Task: Card Placement Policy

## L0 - Policy

### Goal

Define and test the pure viewport-aware bubble card placement policy in
`ui/src/lib/canvasLayout.ts`. This task owns candidate generation, visibility
ranking, collision filtering, fallback classification, and layout-only unit
tests. It does not wire the policy into store/canvas runtime behavior.

### Domain / Control Model Summary

1. Business invariant: a newly discovered bubble without an explicit position
   must receive a deterministic placement that favors useful visible slots.
2. Control model: browser UI layout helpers own placement calculation only;
   Pairflow backend/core owns bubble lifecycle state and must not influence
   placement.
3. Read-path rule: the policy may read only its input positions, expanded state,
   card dimensions, grid constants, and optional viewport rectangle.
4. Forbidden fallback: do not infer placement from backend ordering, transcript
   content, tmux/runtime state, creation timestamps, randomization, or
   append-below behavior.
5. Allowed resolution path: compute deterministic same-authority layout
   candidates; when viewport geometry is missing or unusable, return the
   existing deterministic non-overlapping fallback as a generated display
   default.
6. Missing-data rule: missing viewport geometry must not throw or block layout;
   it produces an explicitly generated fallback result that successor task 2
   can keep distinct from durable user/manual placement authority.
7. Phase boundary:
   - contract closure: owned here for the pure placement result contract.
   - producer closure: owned here only for pure calculation output.
   - internal execution closure: successor.
   - workflow/orchestration closure: N/A.
   - read-model closure: successor.
   - activation closure: successor.
   - cleanup/recovery closure: N/A.

### Plan Linkage

1. Parent plan gap closed: missing viewport-aware deterministic placement
   policy.
2. Depends on: N/A.
3. Unlocks / impacts successors: `2-card-placement-ui-integration` consumes the
   pure policy and owns store/canvas wiring plus persistence-source behavior.
4. Task-list impact: refines `1-card-placement-policy`; no task replacement or
   obsolescence.
5. Inherited validation / exit expectation: focused
   `ui/src/lib/canvasLayout.test.ts` coverage for 2x2 visible slot ranking,
   row-major full visibility, largest-area partial fallback, equal-area
   row-major tie-break, expanded-card blocking, and geometry-unavailable
   fallback classification.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/ui-card-placement-determinism-plan-v1.md`
   - `docs/pairflow-ui-prd.md`
   - `ui/src/lib/canvasLayout.ts`
   - `ui/src/lib/canvasLayout.test.ts`
2. Canonical elements:
   - bubble card placement is browser-local.
   - `defaultPosition(index)` remains the deterministic fallback/default grid
     path.
   - `resolveNonOverlappingPosition(...)` collision behavior remains available
     as fallback behavior.
   - expanded cards use expanded dimensions for occupied footprint.
3. Guard elements:
   - viewport rectangle is a UI geometry guard/input, not durable placement
     authority.
   - occupied rectangles are collision guards, not backend truth.
4. Compat-only elements: existing `columns = 4` index placement remains
   fallback/default behavior only.
5. Forbidden reinterpretations:
   - do not make backend state, transcript order, or bubble creation time
     placement authority.
   - do not treat geometry-unavailable fallback as durable manual/user
     persistence.
   - do not snap manually positioned occupied rectangles to grid for collision
     checks.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `ui/src/lib/canvasLayout.ts`
   - `ui/src/lib/canvasLayout.test.ts`
   - adjacent consumers found by search: `ui/src/state/useBubbleStore.ts`,
     `ui/src/components/canvas/BubbleCanvas.tsx`,
     `ui/src/components/canvas/BubbleExpandedCard.tsx`
2. Actual touched scope: contract/pure policy foundation.
3. Mutation entrypoints in scope: N/A.
4. Hidden scope ruled out: current target files are pure layout helpers/tests;
   store persistence, React measurement, localStorage writes, SSE insertion, and
   user drag commits are successor task 2.
5. Branch inventory note: viewport available vs unavailable; full vs partial
   visibility; occupied vs unoccupied; collapsed vs expanded; equal visible
   area tie; no intersecting candidate fallback.
6. Why the declared task shape matches reality: this task can be completed by
   adding pure helper types/functions and layout unit tests without touching
   store state, React component measurement, localStorage persistence, API, or
   backend code.

### Authority Boundary Map

1. Authority producer: this task produces only a pure placement recommendation
   and source classification.
2. Stored authority: N/A in this task; durable storage remains successor-owned.
3. In-scope consumers: `ui/src/lib/canvasLayout.test.ts` and future caller
   adapters in successor task 2.
4. Explicit out-of-scope consumers: `useBubbleStore`, `BubbleCanvas`,
   `App.tsx`, SSE event handling, and localStorage persistence.
5. Export surfaces closed in this phase: yes for the pure layout helper contract
   in `ui/src/lib/canvasLayout.ts`; no for runtime integration.

### Baseline Preservation

1. Must-preserve behaviors:
   - `defaultPosition(index)` continues to return the existing fixed grid
     fallback.
   - `bubbleDimensions(expanded)` continues to return current collapsed and
     expanded dimensions.
   - existing non-overlap behavior remains available for geometry-unavailable
     fallback.
   - existing `canvasLayout.test.ts` cases remain valid unless explicitly
     replaced by equivalent stronger tests for the same fallback behavior.
2. Allowed resolution paths:
   - viewport-aware candidate selection when viewport geometry is available.
   - deterministic non-overlapping fallback when viewport geometry is missing
     or no candidate intersects the viewport.
3. Forbidden regression interpretations:
   - do not remove fallback just because viewport-aware placement exists.
   - do not make `columns = 4` cap viewport-aware candidate discovery.
   - do not treat generated fallback as a manual/user-persisted position.
4. Replacement proof required if removed: any change to existing
   `resolveNonOverlappingPosition(...)` behavior must prove equivalent fallback
   coverage for current tests and new fallback tests.

### Success / Completion Proof Boundary

N/A. This task does not change a mutable runtime flow or final truth surface.

### Precondition and Side-Effect Boundary

N/A. This task is pure layout policy and tests; it must not introduce side
effects.

### In Scope

1. Add explicit viewport rectangle and placement result/source types in
   `ui/src/lib/canvasLayout.ts`.
2. Add a pure helper that ranks non-colliding grid candidates by the plan's
   visibility policy.
3. Preserve existing fallback/default placement behavior.
4. Add focused layout unit tests for the placement policy contract.

### Out of Scope

1. Wiring the helper into `useBubbleStore`.
2. Measuring viewport bounds in React components.
3. Writing to or migrating `pairflow.ui.canvas.positions.v1`.
4. Changing drag, keyboard movement, expanded-card rendering, SSE, API, or
   backend/core behavior.

### Safety Defaults

1. If viewport geometry is missing, invalid, or yields no intersecting
   candidates, return deterministic fallback behavior with an explicit generated
   fallback source classification.
2. Pure helper output must be deterministic for identical inputs.
3. Unknown or arbitrary occupied positions must be treated as rectangles at
   their actual coordinates.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. This task changes only internal UI layout helper contract/tests. It does not
   change DB, public API, event payload, auth, config/env, or backend contract
   semantics.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
    - canonical identity path: N/A; placement uses bubble positions, not
      identity joins.
    - competing identifiers or fallback identities: N/A.
11. Authority/source-of-truth note:
    - canonical source: browser-local layout inputs.
    - forbidden secondary sources: backend lifecycle state, transcript content,
      tmux/runtime state, creation timestamps, randomization.
12. Closure-budget triage:
    - closure buckets touched: `shared_contract` as internal UI helper
      contract, `read_model_consumers` deferred.
    - intentionally collapsed closures: pure helper contract and unit tests,
      safe because no runtime integration or persistence changes occur here.
    - explicitly deferred closures: store/canvas integration, persistence
      source distinction, last-mile browser proof.
13. Bounded-task-shape decision:
    - primary shape: `contract_or_persisted_authority_foundation`.
    - secondary shape: N/A.
    - why this bounded mix is safe: pure helper contract and tests only.
14. Contract-dense decision:
    - gate triggered: `yes`
    - trigger reasons: shared helper result/source shape changes; fallback
      classification is introduced; successor task 2 inherits interpretation;
      the contract is mirrored across L0, L1, fallback, ownership, and tests.
    - canonical matrix source: L1 `0h) Canonical Contract Matrix`.
    - mirrored surfaces: L0 Domain / Control Model Summary, Authority Boundary
      Map, Safety Defaults, L1 Domain / Control Contract, Ownership and
      Deferred Semantics, Structured Contract Rules, Error and Fallback
      Contract, Call-site Matrix, and Test Matrix.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Missing-position placement must be deterministic and visibility-ranked. | Pure helper must return same output for same inputs and prefer visible useful slots. | P1 | required-now |
| Control model | Browser-local layout helper owns placement calculation only. | No backend/core/runtime data can be used by the helper. | P1 | required-now |
| Read-path rule | Read only function inputs plus layout constants in `canvasLayout.ts`. | Helper must be pure and parameter-driven. | P1 | required-now |
| Forbidden fallback | No backend order, transcript, tmux/runtime state, timestamps, random, or append-below heuristic. | Candidate ranking must be explicit and deterministic. | P1 | required-now |
| Allowed resolution path | Use viewport-aware candidates when geometry exists; otherwise use deterministic non-overlap fallback. | Output must identify whether result came from viewport policy or generated fallback. | P1 | required-now |
| Missing-data rule | Missing/invalid viewport geometry renders fallback only. | Helper must not throw for absent viewport geometry. | P1 | required-now |
| Phase boundary | This task owns pure policy only; task 2 owns store/canvas integration and persistence authority. | Do not edit `useBubbleStore`, `BubbleCanvas`, `App.tsx`, or storage paths in this task. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Browser-local placement | `docs/pairflow-ui-prd.md`, plan | Placement is UI-local preference, not backend state. | Preserve. | P1 | required-now |
| `defaultPosition(index)` | `ui/src/lib/canvasLayout.ts` | Existing fallback/default index grid remains available. | Preserve or wrap without semantic loss. | P1 | required-now |
| `resolveNonOverlappingPosition(...)` | `ui/src/lib/canvasLayout.ts`, tests | Existing collision fallback behavior remains valid. | Preserve unless replaced with equivalent tested fallback. | P1 | required-now |
| `columns = 4` | `ui/src/lib/canvasLayout.ts`, plan | Fallback/default cap only, not viewport-aware candidate cap. | Preserve as fallback semantics. | P2 | required-now |
| Expanded footprint | `bubbleDimensions(expanded)` | Expanded cards occupy expanded dimensions for collision. | Preserve and use in occupied checks. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | `canvasLayout.ts`, `canvasLayout.test.ts`, plus search-confirmed consumers in store/canvas components. | Review should reject store/canvas wiring in this task. | P1 | required-now |
| Actual touched scope | Pure internal UI layout helper contract and tests. | No mutation/persistence integration belongs here. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | No side-effect boundary required. | P1 | required-now |
| Hidden scope ruled out | Store persistence, viewport measurement, and SSE paths are successor-owned. | Target files remain narrow. | P1 | required-now |
| Branch inventory note | viewport available/unavailable, full/partial, occupied/free, collapsed/expanded, equal-area tie. | Tests must cover these branch families. | P1 | required-now |
| Shape proof | Contract foundation only. | A pure helper + unit tests is a bounded task. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Missing viewport-aware deterministic placement policy. | Helper contract must implement the plan's placement policy. | P1 | required-now |
| Depends on | N/A. | This task can start first. | P1 | required-now |
| Unlocks / impacts successors | `2-card-placement-ui-integration`. | Successor consumes helper and result/source classification. | P1 | required-now |
| Task-list impact | Refines `1-card-placement-policy`. | No plan task replacement. | P1 | required-now |
| Inherited validation / exit expectation | Layout unit tests prove ranking and fallback behavior. | `pnpm --dir ui test -- canvasLayout` or equivalent narrow UI test command must pass. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `ui/src/lib/canvasLayout.ts` exports | `useBubbleStore`, `BubbleCanvas`, `BubbleExpandedCard`, tests | additive | Add new helper/types while preserving existing exports. | `2-card-placement-ui-integration` consumes new helper. |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `defaultPosition(index)` fixed grid | Preserve | Existing and new fallback tests pass. | P1 | required-now |
| `resolveNonOverlappingPosition(...)` right-then-down fallback | Preserve or equivalent replace | Existing tests remain green or equivalent stronger tests prove same cases. | P1 | required-now |
| Collision padding by `xGap`/`yGap` | Preserve | Expanded/collapsed blocker tests pass. | P1 | required-now |
| viewport candidate discovery capped by `columns = 4` | Forbid | Test a right-side visible frontier beyond current default cap when relevant. | P2 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| Missing/invalid viewport | Viewport rectangle has finite positive dimensions before viewport ranking. | Any storage write, DOM read, network/API call, backend mutation. | Return generated fallback result. | P1 | required-now |

### 0h) Canonical Contract Matrix

| Contract Row | Input State | Required Helper Output | Owned By This Task | Deferred Interpretation | Forbidden Interpretation | Required Tests |
|---|---|---|---|---|---|---|
| CCM1 | finite positive viewport, at least one non-colliding fully visible candidate | `{ position, source: "viewport" }`, choosing row-major among fully visible candidates | candidate generation, collision filtering, ranking, source value | task 2 decides whether/how to persist this viewport-ranked result | do not read backend/runtime/order/timestamps; do not rewrite existing persisted/manual positions in this task | T1, T2 |
| CCM2 | finite positive viewport, no fully visible candidate, at least one non-colliding partially visible candidate | `{ position, source: "viewport" }`, choosing largest visible area and row-major tie-break | partial visibility area calculation, tie-break, source value | task 2 consumes the same source value for runtime placement flow | do not use append-below or fixed `columns = 4` as viewport candidate cap | T3, T4 |
| CCM3 | finite positive viewport, candidate collides with an occupied rectangle including spacing margin | colliding candidate is discarded; if no visible non-colliding candidate remains, use CCM5 fallback | occupied rectangle calculation using actual coordinates and expanded/collapsed dimensions | task 2 supplies runtime occupied set | do not snap manual positions to grid; do not ignore expanded footprints | T5 |
| CCM4 | viewport absent, null, non-finite, non-positive, or otherwise unusable | `{ position, source: "generated-fallback" }` from deterministic non-overlap fallback | validation and fallback source classification | task 2 keeps generated fallback distinct from durable user/manual authority | do not throw; do not persist generated fallback as manual/user authority in this task | T6 |
| CCM5 | finite positive viewport but no non-colliding candidate intersects viewport | `{ position, source: "generated-fallback" }` from deterministic non-overlap fallback | no-visible-candidate fallback classification | task 2 decides rendering/persistence behavior for generated fallback | do not remove or weaken existing fallback behavior | T6, T7 |

### 0i) Ownership and Deferred Semantics

| Surface / Decision | Owned By This Task | Emits / Records Only | Deferred Owner | Forbidden Interpretation / Fallback | Priority | Timing |
|---|---|---|---|---|---|---|
| Placement source classification | yes | Helper returns whether placement is viewport-ranked or generated fallback. | Task 2 interprets it for persistence. | Do not persist generated fallback as manual/user authority in this task. | P1 | required-now |
| Runtime placement persistence | no | N/A | `2-card-placement-ui-integration` | Do not edit storage or store state here. | P1 | required-now |

### 0j) Structured Contract Rules

| Structured Contract | Required Fields | Optional Fields | Allowed Top-Level Fields / Variants | Unknown / Malformed / Duplicate Behavior | Retention / Drop Rule | Fallback Status / Reason | Priority | Timing |
|---|---|---|---|---|---|---|---|---|
| Viewport rectangle input | `x`, `y`, `width`, `height` finite numbers when provided | N/A | absent/null or finite rectangle | absent/null/non-positive/non-finite viewport uses fallback | N/A | generated fallback | P1 | required-now |
| Placement result | `position`, `source` | N/A | `source: "viewport" \| "generated-fallback"` | N/A | N/A | source identifies fallback | P1 | required-now |

### 0k) Mirrored Surface Checklist

When any row in `0h) Canonical Contract Matrix` changes, update these mirrored
surfaces in the same refinement:

1. L0 `Domain / Control Model Summary`, especially allowed resolution path and
   missing-data rule.
2. L0 `Authority Boundary Map`, especially emitted source classification and
   successor-owned persistence interpretation.
3. L0 `Safety Defaults`.
4. L1 `0) Domain / Control Contract`.
5. L1 `0i) Ownership and Deferred Semantics`.
6. L1 `0j) Structured Contract Rules`.
7. L1 `1) Call-site Matrix`.
8. L1 `4) Error and Fallback Contract`.
9. L1 `6) Test Matrix`.

### 0l) Capability Closure

| Capability Claim | Activation Trigger | Entrypoint | Config Owner | Repo-Provided Parts | External Prerequisites | Success Output | Failure Output | Operator/User/System Path | Last-Mile Proof | Closure Classification |
|---|---|---|---|---|---|---|---|---|---|---|
| Pure placement policy can choose the best candidate for a supplied viewport and occupied set. | Unit test / function call | `ui/src/lib/canvasLayout.ts` helper | repo | helper and tests | N/A | deterministic `position` + `source` | generated fallback result for missing/invalid viewport | internal helper, successor-integrated later | `ui/src/lib/canvasLayout.test.ts` | foundation_only |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `ui/src/lib/canvasLayout.ts` | `resolveViewportAwarePosition(...)` | `(fallbackPosition: BubblePosition, occupied: PositionedBubble[], expanded: boolean, viewport?: ViewportRectangle \| null) -> PlacementResult`, where `PlacementResult` is `{ position: BubblePosition; source: "viewport" \| "generated-fallback" }`. | near existing placement helpers | Computes ranked viewport candidate or generated fallback. | P1 | required-now | unit tests |
| CS2 | `ui/src/lib/canvasLayout.ts` | existing `defaultPosition(index)` | unchanged `(index: number) -> BubblePosition` | existing export | Existing fallback/default grid behavior remains. | P1 | required-now | existing tests |
| CS3 | `ui/src/lib/canvasLayout.ts` | existing `resolveNonOverlappingPosition(...)` | unchanged or compat equivalent | existing export | Existing non-overlap fallback remains callable or equivalently covered. | P1 | required-now | existing tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Input type/schema | `desiredPosition`, `occupied`, `expanded` | Add optional viewport rectangle to a new helper; preserve existing APIs. | desired/fallback position, occupied bubbles, expanded flag | viewport rectangle | additive | P1 | required-now |
| Output type/schema | `BubblePosition` | New helper returns position plus source classification. | `position`, `source` | N/A | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| DB/Event/FS/Network/DOM/localStorage | none | all side effects | Helper must be pure; tests may call helper only. | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| viewport absent/null | viewport input | fallback | deterministic non-overlap fallback | VIEWPORT_UNAVAILABLE | none | P1 | required-now |
| viewport has non-finite or non-positive dimensions | viewport input | fallback | deterministic non-overlap fallback | VIEWPORT_INVALID | none | P1 | required-now |
| no non-colliding candidate intersects viewport | candidate set | fallback | deterministic non-overlap fallback | NO_VISIBLE_CANDIDATE | none | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing layout constants, `bubbleDimensions`, occupied rectangle collision semantics | P1 | required-now |
| must-not-use | DOM APIs, localStorage, backend/API data, randomness, timestamps, React state | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | 2x2 visible empty bottom-right | three occupied cards fill top-left, top-right, bottom-left; viewport fully contains bottom-right | resolving a new collapsed card | returns bottom-right with `source="viewport"` | P1 | required-now | `canvasLayout.test.ts` |
| T2 | row-major full visibility | multiple fully visible non-colliding slots exist | resolving placement | chooses smaller `y`, then smaller `x` | P1 | required-now | `canvasLayout.test.ts` |
| T3 | partial visibility largest area | no fully visible candidate exists; right and lower partial candidates exist with different visible areas | resolving placement | chooses candidate with greatest visible area | P1 | required-now | `canvasLayout.test.ts` |
| T4 | partial equal-area tie | partial candidates have equal visible area | resolving placement | chooses row-major tie: smaller `y`, then smaller `x` | P1 | required-now | `canvasLayout.test.ts` |
| T5 | expanded blocker footprint | occupied expanded card overlaps apparent collapsed slot | resolving placement | blocked slot is discarded using expanded dimensions and spacing margin | P1 | required-now | `canvasLayout.test.ts` |
| T6 | geometry unavailable fallback | viewport is absent/null/invalid | resolving placement | returns deterministic non-overlap fallback with `source="generated-fallback"` | P1 | required-now | `canvasLayout.test.ts` |
| T7 | existing fallback preservation | existing right-then-down non-overlap cases | running current tests | current expected positions still pass or equivalent fallback tests prove same behavior | P1 | required-now | `canvasLayout.test.ts` |

## L2 - Implementation Notes

1. [later-hardening] Consider keeping `resolveNonOverlappingPosition(...)` as a
   compatibility wrapper if the new helper shares internal collision utilities.
2. [later-hardening] Prefer small exported types from `canvasLayout.ts` over
   adding new global UI types for this local helper.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Property-based candidate ranking tests for larger arbitrary grids. | L2 | P3 | later-hardening | task drafting | Defer unless policy regressions recur. |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed
   `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align
   with L1 contract rows.
6. If a shared contract changes, current-consumer inventory and
   additive-vs-breaking classification are mandatory.
7. If an authority fan-out exists, the authority boundary map must stay
   consistent with the bounded task scope.
8. If baseline behavior is removed or replaced, the task must name the exact
   replacement path and the proof expected from validation.
9. If `plan_ref` is non-null, Plan Linkage and inherited validation/exit
   expectation are mandatory and must stay consistent with successor impact
   notes.
10. If a capability claim is in scope, Capability Closure must align with Done
   Definition / acceptance wording and the test matrix. End-to-end claims
   require last-mile proof; hook/foundation/deferred work must not assert fully
   usable automation.
11. If `target_files` are known, Scope Reality / Shape Proof is mandatory and
   the declared task shape must match the inspected touched scope.
12. If the task refines an already-closed authority/shared contract, Canonical
   Contract Anchors and Canonical Contract Preservation are mandatory.
13. New terminology for an existing contract must map back to source anchors
   and field roles explicitly before it can become `required-now`.
14. Contract-Dense Task Gate applies.
    Its canonical source is L1 `0h) Canonical Contract Matrix`; mirrored
    surfaces listed in L1 `0k) Mirrored Surface Checklist` must remain aligned.

## Spec Lock

This task is approved for document-bubble routing based on the same-artifact
`ReviewSpec task-mode` result from subagent `Raman` (`approve_task`). It must
not be marked `implementable` until the ExecutePairflowPlan document-bubble
close workflow owns that transition.
