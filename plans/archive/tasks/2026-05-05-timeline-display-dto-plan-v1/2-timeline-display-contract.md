---
artifact_type: task
artifact_id: task_timeline_display_contract_v1
task_family_id: timeline-display-contract
sequence_key: "2"
task_id: 2-timeline-display-contract
title: "Timeline Display Contract"
status: archived
phase: phase2
target_files:
  - src/contracts/ui/uiReadModel.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.test.ts
  - ui/src/components/expanded/BubbleTimeline.test.tsx
target_files_role: write_targets_and_focused_tests
target_write_files:
  - src/contracts/ui/uiReadModel.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.ts
  - src/v11/infrastructure/ui/presenters/timelinePresenter.test.ts
  - ui/src/components/expanded/BubbleTimeline.test.tsx
target_read_only_anchors:
  - docs/modularity-review/2026-05-05-modularity-review.md
  - docs/architecture/ui-contract-governance.md
  - plans/2026-05-05-timeline-display-dto-plan-v1.md
  - plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/1-timeline-rules-fixtures.md
  - ui/src/components/expanded/BubbleTimeline.tsx
prd_ref: null
plan_ref: plans/2026-05-05-timeline-display-dto-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 2-timeline-display-contract-doc
impl_bubble_id: 2-timeline-display-contract-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-05-timeline-display-dto-plan-v1
---

# Task: Timeline Display Contract

## L0 - Policy

### Goal

Introduce the explicit backend-produced timeline display DTO contract and make
the backend timeline presenter emit that display shape in parallel with the
current legacy payload-backed UI entry. React rendering remains on the existing
legacy path in this task; successor tasks consume the new fields and delete the
legacy helpers in focused slices.

### Domain / Control Model Summary

1. Business invariant: timeline rows shown to the operator must keep their
   frozen task-1 behavior while display interpretation moves toward backend
   ownership.
2. Control model: `ProtocolEnvelope` remains protocol/transcript input
   authority; `timelinePresenter.ts` becomes the display interpretation
   producer; `src/contracts/ui/**` owns the browser-safe DTO; React remains a
   legacy consumer until tasks 3-5 cut over.
3. Read-path rule: this task may add display-ready fields to the UI read model
   and presenter output, but `BubbleTimeline.tsx` must not be switched to those
   fields yet.
4. Forbidden fallback: do not add a new React fallback to raw payload, do not
   add a second UI render path, and do not make the display DTO optional in a
   way that successor tasks must heuristically recover from.
5. Allowed resolution path: the presenter may deterministically derive display
   fields from the same protocol payload and metadata that current React tests
   froze in task 1.
6. Missing-data rule: when a display value cannot be derived, the presenter must
   follow the DTO presence contract exactly: required non-null display fields
   emit explicit neutral/unknown values, required nullable fields such as
   `progress`, `validationFailure`, and `syntheticApproval` emit `null` when
   their display family does not apply. This task must not add any new React
   raw-payload fallback or require successors to recover missing display data
   from raw payload; the existing legacy `BubbleTimeline.tsx` payload reads
   remain unchanged until the cutover tasks.
7. Phase boundary:
   - contract closure: this task owns the DTO type shape under
     `src/contracts/ui/**`.
   - producer closure: this task owns initial presenter output for basics,
     badges, meta-review handoff data, clean-run progress, gate-failure display,
     and synthetic approval descriptor data.
   - internal execution closure: presenter derivation and tests only.
   - workflow/orchestration closure: N/A.
   - read-model closure: successor tasks 3-5 own React cutover.
   - activation closure: N/A.
   - cleanup/recovery closure: successor task 6 owns final legacy removal.

### Plan Linkage

1. Parent plan gap closed: there is currently no explicit display-ready
   timeline contract.
2. Depends on: `1-timeline-rules-fixtures` archived baseline.
3. Unlocks / impacts successors:
   - task 3 consumes basic display fields for title, sender, role, and base row
     state.
   - task 4 consumes badge display fields.
   - task 5 consumes meta-review progress, gate-failure, and synthetic approval
     descriptor fields.
   - task 6 removes transitional legacy compatibility.
4. Task-list impact: refines `2-timeline-display-contract` from planned to
   executable.
5. Inherited validation / exit expectation: focused presenter and UI contract
   tests prove the new DTO can represent task-1 frozen behavior without
   changing React rendering yet.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/modularity-review/2026-05-05-modularity-review.md`
   - `docs/architecture/ui-contract-governance.md`
   - `src/contracts/ui/uiReadModel.ts`
   - `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`
   - `ui/src/components/expanded/BubbleTimeline.tsx`
   - `plans/archive/tasks/2026-05-05-timeline-display-dto-plan-v1/1-timeline-rules-fixtures.md`
2. Canonical elements:
   - `ProtocolEnvelope` is backend protocol/history input.
   - `UiTimelineEntry` is the browser-facing timeline row contract.
   - New display fields under `UiTimelineEntry` are the future normal render
     contract.
3. Guard elements: legacy `payload` on `UiTimelineEntry` remains only as a
   temporary migration input for current React rendering.
4. Compat elements: parallel presenter output may carry both `payload` and
   `display` during this task; no successor may treat that as a permanent
   fallback policy.
5. Forbidden reinterpretations: do not change protocol history semantics; do
   not claim that React has stopped reading payload in this task.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `uiReadModel.ts` types the browser timeline contract.
   - `timelinePresenter.ts` already maps protocol envelopes to UI timeline
     entries and is the narrowest correct producer.
   - `BubbleTimeline.tsx` remains legacy consumer and must be read-only except
     for focused tests that assert unchanged behavior.
2. Actual touched scope: UI contract type, backend presenter output, focused
   presenter tests, and optional UI test assertions that prove no visible
   regression.
3. Mutation entrypoints in scope: no persistence or lifecycle mutation.
4. Hidden scope ruled out: React cutover, API route redesign, non-timeline read
   models, and final cleanup guards.
5. Branch inventory note: cover title/summary fallback, sender/role labels,
   findings/recommendation/decision badges, clean-run progress, meta-review
   handoff attempts, approve-gate failure display, and synthetic approval
   descriptor representation.
6. Why the declared task shape matches reality: the presenter is the one
   backend-owned place that can derive display DTO fields before the browser
   consumes them.

### Authority Boundary Map

1. Authority producer: `timelinePresenter.ts`.
2. Stored authority: protocol envelopes and transcript history remain unchanged.
3. In-scope consumers: future React timeline rendering and presenter tests.
4. Explicit out-of-scope consumers: non-timeline UI contracts and product
   runtime lifecycle.
5. Export surfaces closed in this phase: `src/contracts/ui/uiReadModel.ts`
   exposes the new display DTO shape.

### Baseline Preservation

1. Must-preserve behaviors from task 1:
   - summary fallback order.
   - sender/role labels for meta-reviewer, implementer, reviewer, human,
     orchestrator, and system rows.
   - findings severity tags with dedupe and unknown-severity default.
   - recommendation and decision tags.
   - clean-run progress and meta-review handoff attempt display data.
   - approve-gate validation failure and synthetic approval descriptor data.
2. Allowed resolution paths: deterministic presenter derivation from existing
   payload/metadata.
3. Forbidden regression interpretations: no visible React behavior change; no
   deletion of legacy helpers yet.
4. Replacement proof required if removed: any removed producer helper must have
   equivalent presenter test coverage in this task; UI helper deletion belongs
   to successor tasks.

### Success / Completion Proof Boundary

This task is complete when the contract and presenter emit a display-ready DTO
for the frozen behavior families, focused tests prove representative output,
and existing UI timeline tests still pass without React consuming the new DTO.

### Precondition and Side-Effect Boundary

N/A. This task changes read-model/presenter output only and does not mutate
Pairflow lifecycle, transcript storage, or persistence state.

### In Scope

1. Add explicit timeline display DTO types under `src/contracts/ui/uiReadModel.ts`.
2. Extend `timelinePresenter.ts` so each `UiTimelineEntry` includes display-ready
   fields in parallel with the current legacy payload.
3. Add presenter tests for the display DTO using task-1 frozen scenarios.
4. Adjust focused UI tests only when needed to assert current visible behavior
   is unchanged.

### Out of Scope

1. Switching `BubbleTimeline.tsx` to render the display DTO.
2. Removing `UiTimelineEntry.payload` or UI raw-payload helper logic.
3. Adding no-legacy fitness guards.
4. Redesigning timeline layout or styling.
5. Changing protocol envelope semantics or transcript storage.

### Safety Defaults

1. If a display field cannot be specified cleanly, emit an explicit neutral
   value in the DTO rather than leaving React to infer it from payload.
2. Prefer additive presenter output and focused tests over broad UI changes.
3. Keep naming display-oriented and browser-safe; do not expose protocol-only
   field names as the long-term render contract.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: browser-safe UI read model and backend presenter output.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `8`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A; React cutover is already split into successor
   tasks.
10. Identity/join note: timeline row identity remains `UiTimelineEntry.id`;
    `display.syntheticApproval.sourceEntryId` must preserve the triggering row
    identity that successor task 5 will use for synthetic approval rendering.
11. Authority/source-of-truth note: presenter output is authoritative for new
    display fields, but legacy React rendering remains unchanged until cutover.
12. Closure-budget triage:
    - closure buckets touched: contract, producer, focused tests.
    - intentionally collapsed closures: none.
    - explicitly deferred closures: React consumption and legacy cleanup.
13. Bounded-task-shape decision:
    - primary shape: producer_contract_foundation.
    - secondary shape: read_model_contract_addition.
    - why this bounded mix is safe: the output is additive and React cutover is
      deferred.
14. Contract-dense decision:
    - gate triggered: `yes`
    - trigger reasons: new DTO shape, fallback/precedence, multi-consumer
      inheritance, mirrored display semantics.
    - canonical matrix source: L1 section `0h`.
    - mirrored surfaces: L0 control model, L1 data contract, branch inventory,
      acceptance criteria, L2 tests.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | The operator-visible timeline behavior remains the task-1 baseline. | Presenter DTO tests must encode equivalent display output. | P1 | required-now |
| Control model | Presenter owns display interpretation; React cutover is later. | Add `display` output without changing `BubbleTimeline.tsx` rendering. | P1 | required-now |
| Read path | New fields are browser-safe display DTO fields. | Do not expose raw protocol payload semantics as the display contract. | P1 | required-now |
| Forbidden fallback | React must not gain a new payload fallback or DTO fallback branch. | Keep UI production code unchanged unless a test-only adjustment is required. | P1 | required-now |
| Missing data | Presenter emits neutral/unknown display values and required nullable keys set to `null` when their display family does not apply. | Define value domains and presence rules for missing title, role, badges, progress, validation failure, and synthetic approval metadata. | P1 | required-now |
| Temporary compatibility | Legacy `payload` can remain in parallel only for migration. | Mark it as transitional in types/tests where appropriate. | P2 | required-now |

### 0h) Canonical Contract Matrix

| Display Field Family | Producer Authority | Required DTO Fields / Value Domains | Presence / Missing Data Rule | Unknown / Malformed / Duplicate Rule | Legacy Source Preserved | Successor Owner |
|---|---|---|---|---|---|---|
| Row summary/title | `timelinePresenter.ts` | `title: string`; `summaryText: string`; `summarySource: "summary" \| "question" \| "message" \| "decision" \| "neutral"` | none; missing input emits neutral text and `summarySource="neutral"` | malformed non-string source values are ignored in fallback order | payload summary/question/message/decision | task 3 |
| Sender/role | `timelinePresenter.ts` | `senderLabel: string`; `role: "implementer" \| "reviewer" \| "meta_reviewer" \| "human" \| "system" \| "unknown"` | none; missing sender emits `senderLabel="Unknown"` and `role="unknown"` | malformed explicit role metadata maps to `unknown`; unrecognized non-empty sender strings preserve current visible fallback as `role="implementer"` with the original sender label; orchestrator sender values must render as `role="system"` with `senderLabel="orchestrator"` | payload sender/metadata/current helper rules | task 3 |
| Base state | `timelinePresenter.ts` | `rowKind: "normal" \| "handoff" \| "approval" \| "gate_failure"`; `tone: "neutral" \| "success" \| "warning" \| "danger" \| "info"` | none; missing state emits `normal`/`neutral` | malformed status/type fields do not create new enum values | payload status/type heuristics | task 3 |
| Findings badges | `timelinePresenter.ts` | `badges: UiTimelineBadge[]`; badge `kind="finding"` and `tone` from allowlisted severity mapping | empty array when no findings exist | duplicate severities are deduped by rendered label; unknown severities use neutral/default tone and sanitized label | payload findings | task 4 |
| Decision/recommendation badges | `timelinePresenter.ts` | required `badges: UiTimelineBadge[]`; badge items use `kind="decision" \| "recommendation"` with allowlisted label/tone | keep `badges` present; omit only the individual decision/recommendation badge item when no decision/recommendation is derivable | unrecognized values use neutral tone with sanitized display label; duplicates collapse by `kind+label` | payload decision/recommendation metadata | task 4 |
| Handoff/clean-run progress | `timelinePresenter.ts` | `progress: UiTimelineProgress \| null`; progress `kind="meta_review_handoff" \| "clean_run"` | required nullable key; emit `null` when no progress display applies | malformed counters/attempts are dropped rather than inferred in React; duplicate progress markers for the same logical progress source collapse to the latest presenter-owned descriptor | payload metadata handoff and clean-run keys | task 5 |
| Gate failure display | `timelinePresenter.ts` | `validationFailure: UiTimelineValidationFailure \| null` | required nullable key; emit `null` when no approve-gate failure applies | malformed failure payload emits a neutral failure summary only when current React behavior shows one; otherwise `null` | payload validation failure markers | task 5 |
| Synthetic approval data | `timelinePresenter.ts` | `syntheticApproval: UiTimelineSyntheticApproval \| null`; synthetic approval `kind="meta_review_approval"` | required nullable key; emit `null` when no synthetic approval display applies; this task does not emit additional timeline rows | duplicate markers for the same logical approve-gate failure collapse to one presenter-owned descriptor attached to the latest marker by timeline order; separate approve-gate failure entries each keep their own descriptor to preserve task-1 visible behavior | React synthetic reconstruction | task 5 |

DTO allowlist:

1. `UiTimelineEntryDisplay` is the sole display contract added in this task.
2. Required non-null keys: `title`, `summaryText`, `summarySource`,
   `senderLabel`, `role`, `rowKind`, `tone`, and `badges`.
3. Required nullable keys: `progress` and `validationFailure`; both must be
   present on every `display` object and set to `null` when their display
   family does not apply.
4. Required nullable synthetic metadata key: `syntheticApproval` must be
   present on every `display` object and set to `null` when no synthetic
   approval display applies. Future display fields may be added only when
   explicitly added to this matrix with their presence rule.
5. Unknown protocol payload or metadata keys are not forwarded into `display`.
6. Partial or malformed protocol data is normalized by the presenter into the
   allowlisted values above or dropped according to the matching matrix row.
7. The same `display` contract applies to normal `presentTimeline(...)` rows,
   normalized transcript rows, lenient fallback rows, and remote fallback rows.
   No presenter output path may emit a
   `UiTimelineEntry` without `display`.

Mirrored Surface Checklist:

1. L0 control model must keep `timelinePresenter.ts` as display producer.
2. L1 data contract must keep the same required and nullable field names and
   value domains as the matrix.
3. L1 presenter contract must state that every presenter output path emits
   `display`.
4. L1 test contract must cover at least one example for each matrix family.
5. L2 implementation sketch must preserve React cutover deferral.
6. Acceptance criteria must not claim legacy payload removal before task 6.

### 1) Data Contract

1. Add `display: UiTimelineEntryDisplay` to `UiTimelineEntry`.
2. Define supporting DTO types with only the allowlisted fields and value
   domains in L1 section `0h`.
3. The display DTO must use explicit browser-safe names for:
   - row title or summary text,
   - sender label and role,
   - row kind/base state,
   - badge descriptors,
   - nullable progress or validation descriptors,
   - synthetic approval descriptor identity where needed.
4. Badge descriptors must be stable enough for React to render without reading
   `payload.findings`, `payload.decision`, or recommendation metadata.
5. Row-family display fields must follow the matrix presence rule exactly:
   always-present nullable fields use `null` when their display family does not
   apply, and no field may require React to reconstruct meaning from protocol
   metadata.
6. Keep legacy `payload` temporarily in this task with a migration comment or
   type naming that makes final cleanup ownership clear.
7. Minimum descriptor shape:
   - `UiTimelineBadge` must include
     `kind: "finding" | "decision" | "recommendation"`,
     `label: string`, and
     `tone: "neutral" | "success" | "warning" | "danger" | "info"`.
   - `UiTimelineProgress` must be a discriminated union with
     `kind: "meta_review_handoff"` carrying `label: string` and
     `handoffAttempt: number`, or `kind: "clean_run"` carrying
     `label: string`, `cleanRunCount: number`, and
     `cleanRunsRequired: number | null`.
   - `UiTimelineValidationFailure` must include `summaryText: string` and
     `tone: "neutral" | "warning" | "danger"`; it must not expose raw
     validation payload objects.
   - `UiTimelineSyntheticApproval` must include
     `kind: "meta_review_approval"`, `sourceEntryId: string`,
     `syntheticEntryId: string`, `label: string`, and `tone: "success"`.
   - The task may add narrower typed fields to these descriptors only when a
     presenter test proves which current UI behavior consumes them.

### 2) Presenter Contract

1. `timelinePresenter.ts` must populate the new display DTO for every emitted
   timeline row, including normal `presentTimeline(...)` output, normalized
   transcript rows, lenient fallback rows, and remote fallback rows.
2. Presenter derivation may read protocol payload and metadata because it is the
   backend interpretation authority.
3. Presenter output must preserve task-1 behavior for representative rows.
4. Synthetic approval data must be emitted in this task as presenter-owned
   `display.syntheticApproval` metadata on the triggering entry, not as an
   additional `UiTimelineEntry`. This preserves unchanged React legacy
   reconstruction in this task and gives task 5 a typed contract to replace the
   React synthetic row builder without inventing another shape.
5. The presenter must not require browser code to parse metadata keys such as
   handoff ids, clean-run counters, or validation markers.
6. `display.syntheticApproval.sourceEntryId` must preserve the triggering row
   identity used by the current React helper, and
   `display.syntheticApproval.syntheticEntryId` must equal
   `${sourceEntryId}:meta-review-approve` to preserve the stable rendered-row
   id/key that successor task 5 will use for final synthetic approval rendering.
7. If `src/v11/infrastructure/ui/presenters/timelinePresenter.test.ts` does not
   exist yet, create it as the focused presenter test file rather than moving
   these assertions into broad UI tests.

### 3) Test Contract

1. Add or extend presenter tests for the new DTO shape.
2. Cover representative examples for basics, badges, meta-review handoff
   progress, clean-run progress, approve-gate failure, synthetic approval
   descriptor data, and every presenter output path: normal
   `presentTimeline(...)` rows, normalized transcript rows, lenient fallback
   rows, and remote fallback rows.
3. Add negative presence assertions proving that normal rows and each fallback
   or read-path row family named above include `display.progress === null`,
   `display.validationFailure === null`, and
   `display.syntheticApproval === null` when those display families do not
   apply.
   Basic sender/role assertions must include an unrecognized non-empty sender
   string proving the current implementer-style visible fallback is preserved,
   and a separate malformed explicit role metadata case proving `role="unknown"`.
4. Add applicable-row nullable assertions proving that progress rows carry a
   non-null `display.progress` object and still include
   `display.validationFailure === null` and
   `display.syntheticApproval === null`, while gate-failure rows carry a
   non-null `display.validationFailure` object and still include
   `display.progress === null` and `display.syntheticApproval === null`.
   Progress assertions must cover both `kind="meta_review_handoff"` and
   `kind="clean_run"`.
   Add a duplicate progress-marker assertion proving repeated markers for the
   same logical progress source collapse to the latest presenter-owned
   descriptor.
5. Add a synthetic approval assertion proving that the triggering entry includes
   `display.syntheticApproval.kind === "meta_review_approval"`,
   `display.syntheticApproval.sourceEntryId === entry.id`,
   `display.syntheticApproval.syntheticEntryId === "<entry-id>:meta-review-approve"`,
   and
   non-applicable nullable keys such as `display.progress` and
   `display.validationFailure` remain present as `null`.
6. Add a duplicate synthetic approval assertion proving repeated or duplicate
   markers for the same logical approve-gate failure collapse to one
   `display.syntheticApproval` descriptor on the latest marker by timeline
   order, while separate approve-gate failure entries each keep their own
   descriptor to preserve task-1 visible behavior.
7. Keep existing `BubbleTimeline` tests passing to prove no visible React
   behavior changed.
8. Prefer assertions on DTO values and visible text over snapshots.

### 4) Out-of-Scope Guard

1. Do not edit `BubbleTimeline.tsx` production rendering to consume `display`.
2. Do not delete payload helpers or legacy fixtures.
3. Do not add a recurrence fitness guard yet.
4. Do not broaden the task into API routing or storage changes unless the
   existing presenter/export path forces a narrow typed boundary update.

## L2 - Implementation Sketch

1. Inspect `UiTimelineEntry` and `presentTimeline` output shape.
2. Define `UiTimelineEntryDisplay` and supporting descriptor types in
   `src/contracts/ui/uiReadModel.ts` using the L1 `0h` required and nullable
   field allowlist.
3. Add presenter helper functions only when they keep derivation readable and
   local to `timelinePresenter.ts`.
4. Populate `entry.display` for existing presenter output while retaining
   `entry.payload`.
5. Verify every presenter output path emits `display`: normal
   `presentTimeline(...)` rows, normalized transcript rows, lenient fallback
   rows, and remote fallback rows.
6. Add focused presenter tests for display DTO fields and negative presence
   rules using task-1 baseline cases.
7. Run:
   - `pnpm typecheck`
   - `pnpm lint`
   - focused presenter/UI tests
   - broader affected tests if contract changes expose drift
   - `pnpm build` if Pairflow runtime source or contract build artifacts are
     affected by the implementation bubble.

## Acceptance Criteria

1. `UiTimelineEntry` exposes a display-ready DTO shape sufficient for successor
   React cutover tasks, with required and nullable fields plus value domains
   matching L1 section `0h`.
2. `timelinePresenter.ts` emits display DTO values for every existing timeline
   entry across normal `presentTimeline(...)` rows, normalized transcript rows,
   lenient fallback rows, and remote fallback rows.
3. Presenter tests prove representative display output for basics, badges,
   meta-review handoff progress, clean-run progress, gate failure, synthetic
   approval descriptor data, and each fallback or read-path row family named in
   L1.
4. Presenter tests prove the negative and applicable-row presence rules:
   nullable display fields are present as `null` on non-applicable normal,
   normalized transcript, lenient fallback, and remote fallback rows; progress
   rows include a non-null
   `display.progress` object plus `display.validationFailure === null`;
   both `kind="meta_review_handoff"` and `kind="clean_run"` progress rows are
   covered, and duplicate progress markers for the same logical progress source
   collapse to the latest presenter-owned descriptor;
   gate-failure rows include a non-null `display.validationFailure` object plus
   `display.progress === null`; progress and gate-failure rows both include
   `display.syntheticApproval === null`; synthetic approval trigger rows
   include a non-null `display.syntheticApproval` descriptor while non-trigger
   rows carry `display.syntheticApproval === null`; synthetic approval trigger
   descriptors include stable `sourceEntryId` and `syntheticEntryId` values; and
   duplicate markers for the same logical approve-gate failure collapse to one
   descriptor on the latest marker by timeline order, while separate
   approve-gate failure entries each keep their own descriptor to preserve
   task-1 visible behavior.
   Sender/role tests prove unrecognized non-empty sender strings preserve the
   implementer-style visible fallback, while malformed explicit role metadata
   maps to `role="unknown"`.
5. `BubbleTimeline.tsx` production rendering remains on the legacy path in this
   task.
6. Existing UI timeline behavior remains unchanged.
7. The implementation leaves no ambiguity that `payload` is transitional and
   final cleanup belongs to task 6.
