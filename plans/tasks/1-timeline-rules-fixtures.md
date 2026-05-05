---
artifact_type: task
artifact_id: task_timeline_rules_fixtures_v1
task_family_id: timeline-rules-fixtures
sequence_key: "1"
task_id: 1-timeline-rules-fixtures
title: "Timeline Rules and Fixtures"
status: in_progress
phase: phase1
target_files:
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - ui/src/test/fixtures.ts
target_files_role: write_targets_only
target_write_files:
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - ui/src/test/fixtures.ts
target_read_only_anchors:
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - src/contracts/ui/uiReadModel.ts
  - ui/src/components/expanded/BubbleTimeline.tsx
prd_ref: null
plan_ref: plans/2026-05-05-timeline-display-dto-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 1-timeline-rules-fixtures-doc
impl_bubble_id: 1-timeline-rules-fixtures-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-05-timeline-display-dto-plan-v1
---

# Task: Timeline Rules and Fixtures

## L0 - Policy

### Goal

Freeze the current UI timeline display behavior before the DTO migration starts.
This task must make the protocol-derived rendering rules explicit and add or
adjust focused tests/fixtures so later tasks can move ownership into the backend
presenter without accidental visual or semantic drift.

### Domain / Control Model Summary

1. Business invariant: the operator timeline must continue to show the same
   currently supported rows, labels, badges, clean-run progress, approval-gate
   failures, and synthetic approval rows until a later task explicitly changes
   them.
2. Control model: current browser rendering remains the baseline behavior source
   only for this freeze task; the parent plan still makes the backend presenter
   the target display interpretation authority in successor tasks.
3. Read-path rule: tests may construct protocol-shaped `UiTimelineEntry`
   payloads to capture current behavior; production rendering remains on the
   existing `BubbleTimeline.tsx` read path for this task.
4. Forbidden fallback: do not add a new UI fallback, alternate presenter output,
   compatibility branch, or DTO-shaped render path in this task.
5. Allowed resolution path: deterministic same-authority characterization of
   existing React helper behavior in tests or fixture builders is allowed only
   when it does not require production/source changes.
6. Missing-data rule: preserve current neutral output for missing summaries,
   metadata, findings, decisions, and refs; if a current behavior is ambiguous,
   document it in the test name or fixture note instead of inventing a new rule.
7. Phase boundary:
   - contract closure: successor task 2 owns the display DTO contract.
   - producer closure: successor task 2 owns presenter output.
   - internal execution closure: this task owns only current-rule inventory and
     fixture/test preservation.
   - workflow/orchestration closure: N/A.
   - read-model closure: successor tasks 3-6 own the cutover.
   - activation closure: N/A.
   - cleanup/recovery closure: successor task 6 owns final legacy removal.

### Plan Linkage

1. Parent plan gap closed: current timeline display behavior is implicit inside
   React helpers and can regress during migration.
2. Depends on: N/A.
3. Unlocks / impacts successors: tasks 2-6 must use this task's frozen behavior
   as the migration baseline unless their task explicitly authorizes a change.
4. Task-list impact: refines `1-timeline-rules-fixtures` from planned to
   executable task.
5. Inherited validation / exit expectation: focused UI tests and fixture changes
   must prove current rules for basics, badges, meta-review handoff progress,
   approve-gate validation failure display, and synthetic rows.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/modularity-review/2026-05-05-modularity-review.md`
   - `docs/architecture/ui-contract-governance.md`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`
   - `ui/src/components/expanded/BubbleTimeline.tsx`
   - `ui/src/components/expanded/BubbleTimeline.test.tsx`
2. Canonical elements:
   - `ProtocolEnvelope` remains backend protocol/transcript input authority.
   - `UiTimelineEntry` is the existing browser-facing timeline read model.
   - Current `BubbleTimeline.tsx` helper behavior is the baseline to preserve
     during this freeze task only.
3. Guard elements: fixture/test helpers may assert current payload-derived
   behavior but must not become new production authority.
4. Compat-only elements: protocol-shaped UI fixtures are allowed in this task as
   migration-baseline inputs only.
5. Forbidden reinterpretations: do not recast raw protocol payload as the
   intended long-term UI contract; do not weaken the parent plan's no-legacy
   cleanup requirement.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `timelinePresenter.ts` currently passes envelope payload through to
     `UiTimelineEntry`.
   - `uiReadModel.ts` still types `UiTimelineEntry.payload` as
     `ProtocolEnvelopePayload`.
   - `BubbleTimeline.tsx` currently derives summaries, roles, findings,
     recommendations, meta-review clean-run progress, gate failures, and
     synthetic rows from payload/metadata.
   - `BubbleTimeline.test.tsx` already covers some high-risk rows with
     protocol-shaped fixtures.
2. Actual touched scope: consumer-family fixture/test freeze; production code
   changes are out of scope for task 1.
3. Mutation entrypoints in scope: N/A.
4. Hidden scope ruled out: no API shape, presenter DTO, lifecycle, persistence,
   or command mutation is required to freeze current UI behavior.
5. Branch inventory note: cover present/missing summary inputs, finding severity
   dedupe, recommendation variants, meta-review handoff attempts, clean-run
   counters, approve-gate validation failure, and synthetic approval row
   insertion.
6. Why the declared task shape matches reality: the task records and tests the
   existing consumer behavior before producer or contract migration begins.

### Authority Boundary Map

1. Authority producer: current protocol transcript/presenter pass-through before
   this task; tests may construct equivalent `UiTimelineEntry` inputs.
2. Stored authority: existing transcript envelopes and current UI read-model
   shape.
3. In-scope consumers: `BubbleTimeline.tsx` tests and directly related timeline
   fixture helpers.
4. Explicit out-of-scope consumers: backend presenter contract changes, API
   client contract changes, non-timeline UI read models, and final cleanup
   guards.
5. Export surfaces closed in this phase: no; this task freezes behavior only.

### Baseline Preservation

1. Must-preserve behaviors:
   - summary fallback order: summary, question, message, decision fallback, then
     neutral missing-summary text.
   - sender/role labels for meta-reviewer, implementer pass-to-meta, reviewer
     fix requests, and orchestrator/system rows.
   - findings severity tags with dedupe and default styling for unknown
     severities.
   - meta-review recommendation tags for approve, rework, and inconclusive.
   - clean-run progress rows from rerun handoff attempts and explicit clean-run
     metadata.
   - approve-gate validation failure display plus synthetic meta-review approval
     row.
2. Allowed resolution paths: tests may normalize repeated fixture setup into
   named helpers if the rendered assertions remain behavior-focused.
3. Forbidden regression interpretations: do not remove rows because they are
   "synthetic"; do not hide current raw-payload reads behind a new production
   abstraction in this task.
4. Replacement proof required if removed: N/A; replacements belong to successor
   migration tasks.

### Success / Completion Proof Boundary

N/A. This task does not change runtime success or lifecycle completion semantics.

### Precondition and Side-Effect Boundary

N/A. This task does not modify mutation flows or coordination primitives.

### In Scope

1. Add a concise inventory of current timeline display rules in focused tests,
   test names, fixture names, or fixture comments within the declared
   `target_write_files` only.
2. Add or adjust focused `BubbleTimeline` tests for current behavior gaps named
   by the parent plan.
3. Add or adjust UI fixture helpers only as needed to make current protocol-
   shaped inputs explicit and reusable.
4. Keep production behavior unchanged by not modifying production/source files.

### Out of Scope

1. Introducing the display DTO contract.
2. Changing `UiTimelineEntry.payload` away from `ProtocolEnvelopePayload`.
3. Moving interpretation into `timelinePresenter.ts`.
4. Deleting UI payload helper logic.
5. Adding no-legacy guards.
6. Redesigning timeline layout or styling.
7. Product/runtime/source implementation.
8. Modifying `BubbleTimeline.tsx`, `timelinePresenter.ts`, `uiReadModel.ts`, or
   any other production/source file; these files are read-only anchors for
   observed current behavior in this task.

### Safety Defaults

1. If a current rule is not understood well enough to freeze, add the narrowest
   characterization test around the observed behavior instead of generalizing it.
2. Prefer test names and fixtures that describe user-visible output, not internal
   helper names.
3. Keep assertions stable across harmless markup changes by targeting visible
   text and roles already used in existing tests.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: UI read-model/display behavior contract is being frozen
   for later migration; no external API or runtime payload shape changes are
   allowed in this task.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `3`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
   - canonical identity path: `UiTimelineEntry.id` and visible rendered row text.
   - competing identifiers or fallback identities: raw protocol metadata keys
     used only as current baseline input.
11. Authority/source-of-truth note:
   - canonical source: current React timeline behavior for this freeze slice.
   - forbidden secondary sources: newly invented DTO or presenter behavior.
12. Closure-budget triage:
   - closure buckets touched: consumer-family fixture/test preservation.
   - intentionally collapsed closures: N/A.
   - explicitly deferred closures: contract, producer, read-model cutover,
     cleanup guards.
13. Bounded-task-shape decision:
   - primary shape: consumer_family_alignment.
   - secondary shape: N/A.
   - why this bounded mix is safe: no production contract or producer behavior
     changes are allowed.
14. Contract-dense decision:
   - gate triggered: `yes`
   - trigger reasons: fallback/precedence, split ownership, downstream
     consumers, mirrored surfaces.
   - canonical matrix source: L1 section `0h`.
   - mirrored surfaces: L0 baseline preservation, L1 domain/control, test
     matrix, acceptance criteria.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Current operator-visible timeline behavior is migration baseline. | Add tests that would fail if later DTO migration changes current output accidentally. | P1 | required-now |
| Control model | Current `BubbleTimeline.tsx` behavior is baseline only for this freeze task. | Do not introduce producer-owned DTO semantics yet. | P1 | required-now |
| Read-path rule | Tests may use protocol-shaped `UiTimelineEntry` fixtures. | Keep fixtures explicit about raw payload baseline. | P1 | required-now |
| Forbidden fallback | No new production fallback or dual render path. | Production render code should remain behaviorally unchanged. | P1 | required-now |
| Allowed resolution path | Test-only fixture/helper extraction may name existing rules. | Shared fixture helpers must not become production interpretation code and must not require production/source edits. | P2 | required-now |
| Missing-data rule | Preserve existing neutral/missing display output. | Add a missing-summary characterization when coverage is absent. | P2 | required-now |
| Phase boundary | Freeze only; successor tasks own DTO, producer, cutover, cleanup. | Do not pull migration work into task 1. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `ProtocolEnvelope` | `src/types/protocol.ts` | Backend protocol input, not target UI display contract. | Use only as current fixture baseline. | P1 | required-now |
| `UiTimelineEntry.payload` | `src/contracts/ui/uiReadModel.ts` | Existing protocol-shaped UI payload until successor contract task. | Preserve shape; test it. | P1 | required-now |
| Timeline display helpers | `BubbleTimeline.tsx` | Current behavior to freeze, not final authority. | Read only; characterize with tests. | P1 | required-now |
| No-legacy target | parent plan | Final cleanup still removes raw-payload normal rendering. | Do not weaken or pre-implement cleanup. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | `timelinePresenter.ts`, `uiReadModel.ts`, `BubbleTimeline.tsx`, existing tests. | Scope is current display behavior capture. | P1 | required-now |
| Actual touched scope | Consumer-family fixture/test freeze. | Avoid all production/source changes. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | No side-effect semantics. | P1 | required-now |
| Hidden scope ruled out | Existing presenter is pass-through; UI component owns current interpretation. | Do not change backend presenter yet. | P1 | required-now |
| Branch inventory note | Cover fallback, role, badge, meta-review, gate-failure, synthetic-row branches. | Tests should map to these branches. | P1 | required-now |
| Shape proof | A behavior-freeze task can be completed with tests/fixtures only. | If rendered behavior cannot be characterized without production changes, route back to the plan. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Current behavior is implicit and risky to move. | Name and test current rules. | P1 | required-now |
| Depends on | N/A. | First task in plan. | P1 | required-now |
| Unlocks / impacts successors | Tasks 2-6 inherit frozen behavior. | Later tasks must preserve or explicitly change frozen rules. | P1 | required-now |
| Task-list impact | Refines planned task `1-timeline-rules-fixtures`. | Parent plan tracker updates to this file after approval. | P1 | required-now |
| Inherited validation / exit expectation | UI tests prove baseline behavior. | Run focused UI test for `BubbleTimeline`. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `UiTimelineEntry` | UI timeline component/tests | N/A | Preserve current shape. | Task 2 changes/extends contract. |
| Protocol-shaped timeline fixtures | UI tests | additive | Add focused fixtures/tests only. | Task 6 removes obsolete protocol-shaped render fixtures. |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Summary fallback order | preserve | Missing/fallback text assertions. | P1 | required-now |
| Role labels | preserve | Existing plus any missing role tests. | P1 | required-now |
| Finding severity badges | preserve | Dedupe/default severity assertions. | P1 | required-now |
| Recommendation badges | preserve | approve/rework/inconclusive assertions. | P1 | required-now |
| Meta-review clean progress | preserve | handoff attempt and explicit clean-run assertions. | P1 | required-now |
| Approve-gate failure and synthetic approval row | preserve | paired synthetic/failure row assertions. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

N/A.

### 0g) Precondition and Side-Effect Boundary

N/A.

### 0h) Canonical Contract Matrix

| ID | Condition / Input | Owner | Output / Status | Reason / Error Code | Retained / Dropped Data | Side Effects | Required Test |
|---|---|---|---|---|---|---|---|
| CCM1 | payload has summary/question/message/decision/missing variants | current task | existing visible row summary | N/A | retain current fallback order | none | T1 |
| CCM2 | sender/recipient/metadata role combinations | current task | existing actor label | N/A | retain current role derivation | none | T2 |
| CCM3 | findings with repeated severities or unknown severity | current task | deduped severity tags and default style | N/A | retain current finding tags | none | T3 |
| CCM4 | meta-review recommendation metadata | current task | recommendation badge | N/A | retain current metadata interpretation | none | T4 |
| CCM5 | meta-review handoff attempts and clean-run requirement | current task | clean-run progress rows | N/A | retain current handoff attempt parsing | none | T5 |
| CCM6 | approve recommendation followed by approve-gate validation failure | current task | synthetic approval row plus failure row | N/A | retain current synthetic row behavior | none | T6 |

### 0i) Ownership and Deferred Semantics

| Surface / Decision | Owned By This Task | Emits / Records Only | Deferred Owner | Forbidden Interpretation / Fallback | Priority | Timing |
|---|---|---|---|---|---|---|
| Display DTO shape | no | records baseline behavior | Task 2 | Do not create DTO here. | P1 | required-now |
| React payload helper deletion | no | records behavior to preserve before deletion | Tasks 3-6 | Do not delete helpers here. | P1 | required-now |
| Legacy fixture cleanup | no | may add migration-baseline fixtures | Task 6 | Do not treat added protocol fixtures as permanent. | P1 | required-now |

### 0j) Structured Contract Rules

| Structured Contract | Required Fields | Optional Fields | Allowed Top-Level Fields / Variants | Unknown / Malformed / Duplicate Behavior | Retention / Drop Rule | Fallback Status / Reason | Priority | Timing |
|---|---|---|---|---|---|---|---|---|
| `UiTimelineEntry` fixture | `id`, `ts`, `round`, `type`, `sender`, `recipient`, `payload`, `refs` | payload fields and metadata | current fixture variants only | preserve current component behavior | retain current inputs in tests | neutral display when currently neutral | P1 | required-now |

### 0k) Mirrored Surface Checklist

| Canonical Matrix Row | Mirrored Surfaces | Required Alignment Rule | Summary-Only Surface? | Verification |
|---|---|---|---|---|
| CCM1-CCM6 | L0 baseline preservation, L1 test matrix, acceptance criteria | Names must describe the same current behavior branch. | yes | ReviewSpec task-mode plus focused UI tests. |

### 1) Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `ui/src/components/expanded/BubbleTimeline.test.tsx` | test cases | Freeze current display rules with focused assertions. | P1 | required-now | T1-T6 |
| CS2 | `ui/src/test/fixtures.ts` | `timelineEntry` helper | Support explicit protocol-shaped baseline fixtures without hiding fields. | P2 | required-now | T1-T6 |
| CS3 | `ui/src/components/expanded/BubbleTimeline.tsx` | display helpers | Read-only anchor for observed behavior; do not modify in this task. | P1 | required-now | focused UI test |
| CS4 | `src/v11/infrastructure/ui/presenters/timelinePresenter.ts` | `presentTimeline` | Read-only anchor; no DTO output changes in this task. | P1 | required-now | no presenter contract diff |
| CS5 | `src/contracts/ui/uiReadModel.ts` | `UiTimelineEntry` | No payload type change in this task. | P1 | required-now | no contract diff |

### 2) Data and Interface Contract

1. No production data contract changes are allowed.
2. Test fixtures must continue to represent the current `UiTimelineEntry` shape.
3. Any added fixture helper must make raw payload/metadata usage explicit in its
   name or local test context.
4. The task may add a behavior inventory comment or local test grouping, but it
   must not add a production interface for the future DTO.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| UI tests | add/adjust focused behavior tests | broad snapshot-only assertions | Prefer visible output assertions. | P1 | required-now |
| UI fixtures | add explicit helper data | hiding current raw payload dependence | Fixtures are temporary migration baseline. | P2 | required-now |
| Production UI | no changes | DTO cutover, helper deletion, fallback redesign, test-only extraction into production files | Production files are read-only anchors in task 1. | P1 | required-now |
| Backend presenter/contracts | no changes | DTO contract or payload type change | Successor task owns this. | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback Action | Reason Code | Priority | Timing |
|---|---|---|---|---|---|
| Missing summary/question/message/decision | preserve current neutral text | no new fallback source | N/A | P2 | required-now |
| Missing or malformed metadata | preserve current omission behavior | no regex/heuristic beyond current behavior | N/A | P1 | required-now |
| Unknown finding severity | preserve current default badge style | no new taxonomy | N/A | P2 | required-now |
| Ambiguous current behavior | characterize with narrow test or note | do not invent future DTO behavior | N/A | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing `BubbleTimeline` tests and `timelineEntry` fixture | P1 | required-now |
| must-use | parent plan's no-backward-compat sequencing | P1 | required-now |
| must-not-use | new DTO display fields | P1 | required-now |
| must-not-use | backend presenter as display authority before task 2 | P1 | required-now |
| must-not-use | product/source implementation outside tests/fixtures | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | summary fallback | entries with summary, question, message, decision, and missing payload text | render timeline | visible text follows current fallback order and neutral missing text | P1 | required-now |
| T2 | role labels | meta-reviewer, implementer-to-meta, reviewer-fix-request, and orchestrator rows | render timeline | actor labels match current role derivation | P1 | required-now |
| T3 | finding severity tags | duplicate severities and unknown severity | render timeline | severities dedupe and unknown severity uses current fallback tag behavior | P1 | required-now |
| T4 | recommendation tags | approve, rework, and inconclusive metadata | render timeline | recommendation badges render as today | P1 | required-now |
| T5 | meta-review clean-run progress | rerun handoff attempts and clean-run requirement | render timeline | clean progress rows match current attempt/count behavior | P1 | required-now |
| T6 | approve-gate validation failure | approve recommendation with approve-gate validation failure rework decision | render timeline | synthetic approval row and failure row both render as today | P1 | required-now |

## L2 - Implementation Notes

1. Start with `ui/src/components/expanded/BubbleTimeline.test.tsx`; add named
   tests before adjusting fixture helpers.
2. Prefer existing `timelineEntry` fixture and local arrays over a new fixture
   system unless duplication becomes confusing.
3. Run the focused UI test first:
   `pnpm --dir ui test -- BubbleTimeline.test.tsx`.
4. Do not touch production/source files to expose behavior for tests. If current
   behavior cannot be characterized from rendered output and fixture inputs,
   route back to the plan instead of widening task 1.
5. If the implementation would require changing `presentTimeline`,
   `UiTimelineEntry`, API client typing, or any other production/source file,
   stop this task and route back to the plan; do not make that change inside
   task 1.

## Acceptance Criteria

1. AC1: Current summary fallback behavior is explicitly covered by focused UI
   tests or an equivalent behavior inventory plus assertions in the declared
   `target_write_files`.
2. AC2: Current role/sender behavior for meta-reviewer, implementer, reviewer,
   and orchestrator/system-like rows is covered.
3. AC3: Current findings, decision, and meta-review recommendation badge
   behavior is covered.
4. AC4: Current meta-review handoff, clean-run progress, approve-gate failure,
   and synthetic approval-row behavior is covered.
5. AC5: `BubbleTimeline.tsx`, `timelinePresenter.ts`, `uiReadModel.ts`, and all
   other production/source files are unchanged in this task; they are read-only
   anchors for observed behavior.
6. AC6: `timelinePresenter.ts` and `UiTimelineEntry` production contract are not
   changed to the future DTO in this task.
7. AC7: No production fallback, dual render path, or legacy cleanup is added.
8. AC8: Focused UI validation for `BubbleTimeline` is run and its result is
   recorded in the bubble handoff evidence.

## Review Control

1. ReviewSpec should approve this task only if the freeze scope remains
   test/fixture centered and does not start task 2 DTO work.
2. If ReviewSpec finds the task cannot freeze enough behavior without touching
   presenter or contract shape, route back to the plan instead of widening this
   task.

## Assumptions

1. Existing tests already cover part of the meta-review behavior; this task may
   strengthen or reorganize them without replacing the final migration plan.
2. The UI fixture layer can represent current protocol-shaped entries without
   changing runtime contracts.

## Open Questions

1. None blocking. Any uncertain current behavior should be characterized by a
   narrow test during implementation.
