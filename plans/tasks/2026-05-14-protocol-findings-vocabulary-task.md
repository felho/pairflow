# Task Discussion: Narrow Protocol and Findings Vocabulary

**Source review**: `docs/modularity-review/2026-05-14-modularity-review-full-codebase.md`  
**Issue**: `Protocol and findings vocabulary is still the widest volatile model`  
**Status**: resolved in code through `f47b05ec` (`Narrow advisory protocol findings`)

## Implementation Progress

- `9cbfd971` (`Tighten protocol payload contracts`) completed the first low-risk payload slice.
- `225a3d1e` (`Tighten PASS protocol payload`) removed the inherited base from `PASS` and kept only its explicit contract fields.
- `3b8e1efb` (`Tighten CONVERGENCE protocol payload`) removed the inherited base from `CONVERGENCE` and made `advisory_findings_open_total` a required top-level protocol field.
- `9e1ff844` (`Tighten APPROVAL_REQUEST protocol payload`) removed the inherited base from `APPROVAL_REQUEST` while keeping `findings_parity` top-level.
- `24861376` (`Lift COMMIT_RESULT commit facts`) moved `commit_sha`, `commit_message`, and `staged_files` to required top-level `COMMIT_RESULT` payload fields and rejected commit facts under `payload.metadata`.
- `9fcf9104` (`Read convergence advisory count from payload`) removed the remaining stale reader of `metadata.advisory_findings_open_total` and aligned the finalization fixture with the real emitter shape.
- `f47b05ec` (`Narrow advisory protocol findings`) introduced the shared `ProtocolAdvisoryFinding` projection for `CONVERGENCE` and `APPROVAL_REQUEST`, keeping reviewer `PASS` and auto-rework `APPROVAL_DECISION` on the richer kernel `Finding` contract.
- Follow-up check: `rg` confirms no `ProtocolEnvelopePayloadBase` references remain in `src/` or `tests/`. Remaining mentions are this task document's historical plan and end-state notes.

## Closure Check

The original modularity review issue is resolved for the scoped protocol/finding vocabulary work:

- `ProtocolEnvelopePayloadBase` is deleted from runtime and tests; no payload interface extends a permissive shared base.
- `ProtocolEnvelope` defaults to the strict discriminated union of per-message payload contracts; no wide/readable payload alias remains.
- `ProtocolEnvelopeMetadata` is only an unstructured extension bag. Structured, load-bearing protocol facts moved to top-level fields: `findings_parity`, `advisory_findings_open_total`, and `COMMIT_RESULT` commit facts.
- Append infrastructure preserves the concrete `TType` from draft to result, avoiding caller-side casts from appended envelopes back to concrete protocol message types.
- `CONVERGENCE.findings` and `APPROVAL_REQUEST.findings` use the narrow `ProtocolAdvisoryFinding` projection; reviewer `PASS` and auto-rework `APPROVAL_DECISION` intentionally keep the richer kernel `Finding` contract.
- Runtime validators reject parity, advisory count, commit facts, and advisory-only finding fields in the wrong payload locations.
- Completion validation passed on the implementation commits: `pnpm typecheck`, focused protocol/converged/meta-review/approval tests, `pnpm lint`, `pnpm fitness:check:ci`, `pnpm test`, and `pnpm build`.

No mandatory implementation follow-up remains for this task. Future cleanup, if desired, should be tracked separately; for example, aliasing existing advisory projection names such as `ConvergedStructuredFinding` or `MetaReviewGateAdvisoryFinding` to `ProtocolAdvisoryFinding` where import direction and naming make that clearer.

## Problem

The protocol and findings vocabulary is still the broadest shared model in the repository. This is not because separate payload types are missing. The code already has `ProtocolEnvelopePayloadByType` and message-specific payload interfaces.

The problem is that the message-specific payloads are still too permissive. Most of them inherit from a shared base that includes fields such as `summary`, `question`, `message`, `decision`, `pass_intent`, `findings_claim_state`, `findings_claim_source`, `findings`, and `metadata`. That means a payload can be type-specific in name while still accepting fields that are invalid for its message kind.

The metadata boundary is also too broad. `ProtocolEnvelopeMetadata` extends `FindingsParityMetadata` and also permits arbitrary keys, which makes meta-review findings parity look like generic envelope metadata. Consumers can start depending on metadata semantics that are not explicit by message kind.

The `Finding` vocabulary is now owned by `src/contracts/kernel/findings.ts`, which is better than the old `src/types` facade. However, the same model still crosses reviewer pass, convergence, meta-review artifacts, approval routing, UI projection, CLI, and tests. That keeps a volatile workflow concept coupled across high-distance modules.

## Goal

Reduce shared model coupling while preserving one canonical protocol language where the workflow genuinely needs it.

The desired end state is not many competing protocol dialects. It is a smaller set of explicit contracts:

- each protocol message kind exposes only the payload fields valid for that kind;
- meta-review parity metadata appears as a first-class, named field on message kinds that carry it — not hidden inside generic metadata;
- kernel finding values stay canonical; workflow-specific finding projections may be added later if empirical evidence shows the contexts diverge.

## Resolved Decisions

These decisions narrow scope before implementation begins. They are recorded here so the candidate approaches stay aligned with the chosen direction.

### Compatibility model: unified strictness

New strict types apply everywhere. There is no two-tier "stored shape vs emitted shape" abstraction.

**Rationale.** Pairflow is currently used by one person plus a few experimenters. The only historical data is the bubble archive, which is not business-critical and is reproducible. A dual-shape compatibility layer would impose a permanent maintenance cost that is not justified by the actual usage profile.

**Worst-case mitigation.** If a tightened type rejects an existing archived payload, write a small ad-hoc migration script — or, if the archive is old enough, accept losing it. Both are one-time costs, evaluated when (and only when) the situation arises.

### Parity metadata placement: dedicated top-level field

`FindingsParityMetadata` becomes a top-level, named payload field (`findings_parity?: FindingsParityMetadata`) on message kinds that carry parity. The generic `metadata` bag returns to its role as an unstructured extension point only.

**Rationale.** Parity is structured, typed, load-bearing data — not loose metadata. Putting it in a `metadata` bag obscures intent ("metadata that is not really metadata") and forces every reader to drill into a nested shape to find a first-class concept. Top-level placement makes the contract self-documenting and keeps the boundary between "named protocol field" and "ad-hoc extension" clean.

### Finding projections: deferred to second slice

`ReviewerPassFinding`, `ConvergenceFinding`, `MetaReviewArtifactFinding`, `ApprovalRequestFinding` (and similar) are **not** introduced in the first slice. The first slice ships with the existing `Finding` type.

**Rationale.** It is not yet established empirically that the four contexts have meaningfully different field requirements. Creating four named types without that evidence risks producing maintenance overhead with no real strictness gain. The empirical step (field-requirement matrix) runs after the first slice lands.

## Non-Goals

- Do not remove the shared protocol envelope concept.
- Do not introduce separate, divergent severity or priority meanings.
- Do not rewrite transcript persistence as part of the first pass.
- Do not make the UI interpret raw protocol payloads again.
- Do not turn this into a large architecture rewrite before agreeing on the target boundaries.
- Do not introduce a two-tier "stored vs emitted" type abstraction (see Resolved Decisions).
- Do not preemptively introduce per-workflow `Finding` projections in the first slice (see Resolved Decisions).

## Candidate Approach

### 1. Tighten payload contracts

Start with `src/v11/shared/protocol/protocolEnvelopeContract.ts`.

Remove invalid shared fields from message-specific payloads. For example, `HUMAN_QUESTION` should not accept `decision`, `pass_intent`, or `findings`; `APPROVAL_DECISION` should not accept `question` or findings claim fields.

First-slice illustration (lowest-risk payload kinds, no extension of a permissive base):

```ts
export interface HumanQuestionProtocolEnvelopePayload {
  question: string;
  metadata?: ProtocolEnvelopeMetadata;
}

export interface HumanReplyProtocolEnvelopePayload {
  message: string;
  metadata?: ProtocolEnvelopeMetadata;
}

export interface ApprovalDecisionProtocolEnvelopePayload {
  decision: ApprovalDecision;
  message?: string;
  findings?: Finding[];
  findings_parity?: FindingsParityMetadata;
  metadata?: ProtocolEnvelopeMetadata;
}

export interface TaskProtocolEnvelopePayload {
  summary: string;
  metadata?: ProtocolEnvelopeMetadata;
}
```

Notes:

- These interfaces no longer `extends ProtocolEnvelopePayloadBase`. Each declares only the fields valid for its message kind.
- The exact required-vs-optional choice (e.g. `question: string` vs `question?: string`) is determined per payload from current emitter behavior. Default: required unless emitters demonstrably leave it absent on purpose.
- `APPROVAL_DECISION` is not just a human decision payload: the auto-rework path can attach structured findings and parity metadata. Those fields are valid only because that runtime path uses them; they must not be generalized through the shared base.

Heavier payload kinds (`PASS`, `CONVERGENCE`, `APPROVAL_REQUEST`, `COMMIT_RESULT`) follow in a second slice using the same pattern.

### 2. Lift parity metadata to a first-class payload field

Stop making every envelope metadata object extend `FindingsParityMetadata`.

```ts
export interface ProtocolEnvelopeMetadata {
  [key: string]: unknown;
}

export interface ApprovalRequestProtocolEnvelopePayload {
  summary: string;
  findings?: Finding[];
  findings_parity?: FindingsParityMetadata;
  metadata?: ProtocolEnvelopeMetadata;
}
```

Apply the same `findings_parity?: FindingsParityMetadata` field only on message kinds (or adjacent event/result contracts) where parity is part of the contract. The implementation survey confirmed the first-slice carriers as `APPROVAL_REQUEST` and auto-rework `APPROVAL_DECISION`. `CONVERGENCE` is not a first-slice parity carrier: it currently carries reviewer advisory counts through `metadata.advisory_findings_open_total`, not the `FindingsParityMetadata` contract. All other payload kinds carry no parity field.

Note that `meta_review_result` is currently an agent emit kind / awaited output, not a kernel `ProtocolMessageType`. The consumer survey should identify the actual owners of parity metadata in the codebase; this approach does not introduce a new protocol message kind.

This makes parity:

- self-documenting (the field name reveals intent);
- discoverable at the top level rather than nested in a metadata shape;
- structurally separated from the generic `metadata` extension bag.

### 3. (Deferred to second slice) Workflow-specific finding projections

Not part of the first slice.

Before any projection is introduced, run a short empirical study against the actual code:

1. **Emitter survey.** For each context (reviewer PASS, convergence, meta-review artifact, approval request), record which `Finding` fields are always set, sometimes set, never set.
2. **Reader survey.** For each consumer, record which fields are read and which are ignored.
3. **Silent-failure survey.** Identify whether a missing field (e.g. `priority`) silently degrades behavior or surfaces an error.

The resulting matrix decides the scope:

| Observation | Decision |
|---|---|
| All contexts have effectively identical field usage | No projection. Keep one `Finding`. |
| One context is meaningfully stricter | One projection for that context only. |
| Two or three contexts diverge | Two or three projections; the rest stay on `Finding`. |
| All four diverge | Four projections (unlikely outcome). |

Lightweight alternative considered before introducing new named types: boundary validators (`asReviewerPassFinding(f: Finding): ReviewerPassFinding`) where `ReviewerPassFinding` is a `Required<Pick<Finding, ...>>` utility. This gives call-site enforcement without expanding the type hierarchy.

`src/contracts/kernel/findings.ts` remains the canonical value vocabulary for `P0`/`P1`/`P2`/`P3`, timing, layer, and common guards in either outcome.

### 4. Add report-only architecture visibility

Update the stale fitness exception that still names deleted `src/types/protocol.ts`.

Consider report-only checks for:

- fan-out of `shared/protocol/protocolEnvelopeContract`;
- fan-out of `contracts/kernel/findings` and `contracts/kernel/protocol`;
- generic envelope metadata with open key semantics;
- `FindingsParityMetadata` leaking back into generic protocol payloads.

These start as warnings / report-only signals, not hard gates.

## Suggested First Slice

The first slice contains two distinct kinds of work:

**A. Low-risk payload tightening (Approach #1).** Applied to the lowest-risk payload kinds: `HUMAN_QUESTION`, `HUMAN_REPLY`, `APPROVAL_DECISION`, and `TASK`. Each loses its `extends ProtocolEnvelopePayloadBase` and is rewritten with only the fields valid for that message kind.

**B. Parity metadata relocation (Approach #2).** `findings_parity` is lifted to a top-level field on the message kinds (or adjacent event/result contracts) that carry parity. The implementation survey confirmed the first-slice carriers as `APPROVAL_REQUEST` and auto-rework `APPROVAL_DECISION`; `CONVERGENCE` is not a first-slice `FindingsParityMetadata` carrier. `ProtocolEnvelopeMetadata` becomes a plain unstructured metadata bag.

Plus **Approach #4** (fitness): stale exception removed; report-only checks considered before final closure.

**Important boundary.** Work item B touches `APPROVAL_REQUEST` **only** to relocate parity to a top-level field. Full payload tightening for heavier payloads — removing `extends ProtocolEnvelopePayloadBase` and tightening field-by-field — is a second-slice activity, not first slice.

Out of scope for the first slice:

- Full payload tightening for `PASS`, `CONVERGENCE`, `APPROVAL_REQUEST`, `COMMIT_RESULT` — second slice.
- Any `Finding` projection — deferred until the empirical study (see Approach #3).

Survey checkpoint:

- `TASK` is included in the first slice. Runtime emitters construct `summary` plus optional source / routing metadata.
- `HUMAN_QUESTION` carries required `question` plus optional metadata only where a specific emitter needs it.
- `HUMAN_REPLY` carries required `message` plus delivery-target metadata.
- `APPROVAL_DECISION` carries required `decision`, optional `message`, and can carry `findings` / `findings_parity` on the meta-review auto-rework path.
- Confirmed top-level `findings_parity` carriers for the first slice: `APPROVAL_REQUEST` and `APPROVAL_DECISION` auto-rework. `CONVERGENCE` currently carries reviewer advisory counts through `metadata.advisory_findings_open_total`; it is not a `FindingsParityMetadata` carrier in this slice.

Implementation progress checkpoint:

- First-slice runtime contract edits are implemented in `src/v11/shared/protocol/protocolEnvelopeContract.ts`.
- `HUMAN_QUESTION`, `HUMAN_REPLY`, `APPROVAL_DECISION`, and `TASK` were tightened in place, without parallel `Strict*` payload types.
- `ProtocolEnvelopeMetadata` has been detached from `FindingsParityMetadata`.
- Runtime emitters/readers have been migrated to top-level `payload.findings_parity` for the confirmed carriers.
- The old flatten-to-`payload.metadata` parity helper was removed rather than kept as a compatibility shim.
- Validator coverage now rejects parity fields under `payload.metadata` and validates them under `payload.findings_parity`.
- Current validation evidence from first-slice commit `9cbfd971`: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, focused parity/protocol suites, full `pnpm test`, and `pnpm build` all passed.
- Remaining follow-up before calling the whole task closed: decide whether to add new report-only architecture visibility checks now or leave them as a later implementation slice, and run the archive smoke test called out below.

## Second-Slice Survey

The first slice intentionally left the heavier protocol payload kinds for a separate pass. A quick source survey after `9cbfd971` shows the remaining wide model is now concentrated in four places:

| Payload kind | Current contract shape | Observed emitter/read path | Second-slice direction |
|---|---|---|---|
| `PASS` | Still `extends ProtocolEnvelopePayloadBase`; redeclares `summary`, `pass_intent`, `findings_claim_state`, `findings_claim_source`, `findings`. | Main emitter is `buildPassEnvelopeDraft(...)`. Reviewer PASS emits `findings` plus claim fields; implementer PASS emits no claim fields. Readers include convergence policy, repeat-clean autoconverge, resume summary, UI projections, metrics/test-evidence paths. | Tighten in place first. It has the clearest emitter and the most downstream value because convergence policy depends on its findings/claim consistency. |
| `CONVERGENCE` | Still `extends ProtocolEnvelopePayloadBase`; currently needs `summary`, optional `findings`, optional `metadata`. | Main emitter is converged flow append. Readers include meta-review reviewer snapshot, lifecycle events, resume summary, UI/tmux projections. `metadata.advisory_findings_open_total` is a convergence-specific typed value, not `FindingsParityMetadata`. | Tighten after `PASS`. Decide whether `advisory_findings_open_total` should become a top-level payload field; do not leave it in metadata as an undocumented exception. Do not add `findings_parity` unless a separate survey proves it is a real carrier. |
| `APPROVAL_REQUEST` | Still `extends ProtocolEnvelopePayloadBase`; currently needs `summary`, optional `findings`, optional `findings_parity`, optional `metadata`. | Main emitter is `appendHumanApprovalRequestEnvelope(...)`. Readers include approval transcript context, human approval routing, inbox/context projections, UI projections. | Tighten after convergence or in the same second slice if scope remains small. It already has top-level `findings_parity`; the remaining work is deleting inherited invalid fields. |
| `COMMIT_RESULT` | Does not extend the base, but still manually carries base-like optional fields (`summary`, `question`, `message`, `decision`, `pass_intent`, `findings_claim_state`, `findings_claim_source`, `findings`) and stores required commit facts under `metadata`. | Main emitter is commit finalization. Remote commit import validates `metadata.commit_sha`, `metadata.commit_message`, and `metadata.staged_files`. Validators already reject non-metadata payload fields. | Lift required commit facts to top-level payload fields: `commit_sha`, `commit_message`, `staged_files`, plus optional unstructured `metadata`. This applies the same rule used for parity: structured, typed, load-bearing data is not generic metadata. |

### Structured Metadata Rule

The second slice should apply one consistent rule across the remaining payloads:

- **Top-level payload field:** structured, typed data that is part of the protocol contract, is required by workflow correctness, or is read by downstream routing/display/import code.
- **`metadata` bag:** optional producer-local annotations, telemetry, diagnostics, or extension data that are not required to understand the message kind.

This rule means `COMMIT_RESULT` commit facts (`commit_sha`, `commit_message`, `staged_files`) should move to top-level payload fields. It also means `CONVERGENCE` must explicitly decide the fate of `advisory_findings_open_total`; keeping it in metadata is allowed only if the survey shows it is telemetry rather than a reader-owned protocol field, and that exception must be documented.

### Second-Slice Recommended Order

1. **`PASS` strict contract.** Remove the inherited base and keep only required `summary`, optional `pass_intent`, optional `findings_claim_state`, optional `findings_claim_source`, optional `findings`, and optional `metadata`. `summary` is required because the runtime validator already enforces a non-empty `PASS` summary.
2. **`CONVERGENCE` strict contract.** Remove the inherited base and keep required `summary`, optional `findings`, optional `metadata`, plus a documented decision on `advisory_findings_open_total`. `summary` is required because the runtime validator already enforces a non-empty `CONVERGENCE` summary.
3. **`APPROVAL_REQUEST` strict contract.** Remove the inherited base and keep required `summary`, optional `findings`, optional `findings_parity`, and optional `metadata`. Keep parity top-level only.
4. **`COMMIT_RESULT` contract cleanup.** Move `commit_sha`, `commit_message`, and `staged_files` out of `metadata` into required top-level payload fields; keep `metadata?` only for true unstructured extension data; remove all base-like optional payload fields. The current `metadata: ProtocolEnvelopeMetadata & { commit_sha, commit_message, staged_files }` intersection type form is removed entirely rather than rewritten with a different structured metadata intersection.
5. **Validator and reader migration.**
   - Update runtime validation to require top-level commit fields and reject commit facts under `payload.metadata`, mirroring the parity-leak guard.
   - Update commit finalization to emit top-level commit fields.
   - Update remote commit import and continuity checks to read top-level commit fields.
   - Update UI/resume projections and any CLI response projection that reads commit facts.
   - Update tests and fixtures to use the new `COMMIT_RESULT` payload shape.
6. **Delete `ProtocolEnvelopePayloadBase`.** This is the second-slice end-state check. Do not leave it as an empty symmetry interface.

### Second-Slice Finding Projection Decision

Do not introduce `ReviewerPassFinding`, `ConvergenceFinding`, or `ApprovalRequestFinding` as part of the payload-base cleanup by default. The survey shows current readers still operate on the shared kernel `Finding` vocabulary, and the first useful strictness gain is deleting invalid payload fields. Projection types remain a separate decision after the payload contracts are closed.

If projection work is considered later, start from a field-requirement matrix:

- reviewer `PASS`: which fields are required for convergence policy and blocker/advisory decisions;
- `CONVERGENCE`: which fields are persisted vs only displayed;
- `APPROVAL_REQUEST`: which advisory finding fields are actually shown or used by approval routing;
- meta-review artifacts: whether artifact-only fields diverge from protocol payload fields.

### Finding Projection Survey

The post-payload cleanup survey shows one real split, not four independent finding vocabularies.

| Context | Emitter shape | Reader requirements | Silent-failure risk | Decision |
|---|---|---|---|---|
| Reviewer `PASS` | Normalized from CLI/API reviewer input into kernel `Finding`: required `title` plus `priority` or `severity`; optional `detail`, `code`, `refs`, `timing`, `layer`, `evidence`, `effective_priority`. | Reviewer decision, doc-gate evaluation, finding counts, metrics, and repeat-clean policy read priority/severity; doc-gate reads timing/layer/evidence/refs/effective priority. | Missing priority/title fails validation; missing timing/layer/evidence can change blocker classification in document scope. | Keep kernel `Finding`. This is the canonical rich reviewer finding contract. |
| `CONVERGENCE` payload | `ConvergedStructuredFinding`: `severity: P2|P3`, `title`, optional `refs`. | Runtime only needs advisory count, title/severity for display/contract checks, and optional refs. | A broad `Finding` type would allow impossible blocker fields (`P0/P1`, timing/layer/evidence) that readers ignore. | Use a narrow advisory projection. |
| `APPROVAL_REQUEST` payload | `ApprovalAdvisoryFinding`: `severity: P2|P3`, `title`, optional `refs`, derived from same-round reviewer snapshot or meta-review artifact split. | Approval routing/display only uses advisory count consistency and displayable advisory entries. | Broad `Finding` would imply approval routing reads blocker/detail/timing fields, but it does not. | Use the same narrow advisory projection as `CONVERGENCE`. |
| Auto-rework `APPROVAL_DECISION` payload | Projected from meta-review artifact through `projectDisplayableFindingsFromArtifact(...)`, preserving `detail`, `code`, `timing`, `layer`, `evidence`, and `effective_priority` when present. | Implementer-facing rework payload benefits from rich display/context fields; parity metadata carries counts. | Narrowing this to advisory-only would lose useful artifact context. | Keep kernel `Finding` for now. |
| Meta-review artifact JSON | External/runtime artifact, not a protocol payload. Split logic reads `priority`/`severity`; display projection preserves optional rich fields. | Artifact validation and parity compare counts/digest/status; payload projection is derived, not the source of truth. | Treating artifact shape as a protocol payload would over-couple artifact evolution to transcript contracts. | Keep artifact parsing separate; project into protocol-specific shapes at boundaries. |

Implementation follow-up: introduce one shared advisory finding projection for `CONVERGENCE.findings` and `APPROVAL_REQUEST.findings`. Do **not** introduce `ReviewerPassFinding` or a broad set of per-workflow projections yet.

### Second-Slice Done State

The second slice is not done until:

- no payload interface extends `ProtocolEnvelopePayloadBase`;
- `ProtocolEnvelopePayloadBase` is deleted;
- `COMMIT_RESULT` TypeScript contract and runtime validation expose `commit_sha`, `commit_message`, and `staged_files` as required top-level payload fields;
- `payload.metadata` remains an unstructured extension bag and does not carry `FindingsParityMetadata` or required `COMMIT_RESULT` commit facts;
- `CONVERGENCE` has an explicit documented decision for `advisory_findings_open_total`: top-level field if it is protocol-owned, or a documented metadata exception if it is telemetry-only;
- readers still narrow by `envelope.type` before accessing payload-specific fields;
- no new wide/readable payload alias, compatibility shim, or caller-side append-result cast is introduced;
- `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, focused protocol/pass/converged/approval/commit tests, `pnpm test`, and `pnpm build` pass.

Before starting implementation:

- Run a brief emitter site survey for the four first-slice payload kinds. Count how many emitter sites construct each payload and how many readers depend on each field. Use the result to confirm — or reorder — the implementation order.
- Run a brief consumer survey to confirm which message kinds (or adjacent event/result contracts) currently carry `FindingsParityMetadata`. Re-check this if new meta-review gate code lands before implementation.

Implementation caution:

The `ProtocolEnvelopePayloadByType[TType]` generic only provides per-message-kind type safety when emitter sites use a **concrete** `TType` (e.g. `ProtocolEnvelope<"HUMAN_QUESTION">`) rather than the wide `ProtocolMessageType` union. Tightening payload contracts is necessary but not sufficient: emitter sites that take a generic `ProtocolEnvelope` (with default `TType = ProtocolMessageType`) will still accept any payload shape, because the union of strict payloads is itself permissive through the default parameter.

Audit emitter sites for the touched payload kinds and prefer the concrete `ProtocolEnvelope<"HUMAN_QUESTION">` (etc.) at call sites. Where a site genuinely handles multiple message kinds, narrow with a discriminating switch on `envelope.type` before reading the payload.

Validation during implementation:

- Add type-level tests or compile-time fixtures proving invalid fields are rejected for the tightened payloads.
- Run the normal typecheck / lint / test path for touched behavior.
- Smoke-test transcript loading and affected projections against a recent bubble archive. The change is compile-time only; old transcripts will not "fail to parse" at the JSON level. But runtime validation, transcript readers, or UI projection assumptions may fail if an archived payload contains fields the new strict type does not permit, or relies on parity living under `metadata` rather than at the top level. If such a failure surfaces, decide per case: ad-hoc migration script, or accept loss of that archived bubble (per Resolved Decisions).

## Implementation Kickoff Plan

Start with a short survey and scope lock before editing runtime contracts. This prevents accidental compatibility shims and keeps the first slice aligned with the End-State Invariants.

### Feedback checkpoint: strict default envelope

A first implementation pass exposed an important end-state clarification: a renamed wide payload type such as `ProtocolEnvelopeReadablePayload` is still an interim solution if it becomes the default for `ProtocolEnvelope`. The default `ProtocolEnvelope` must remain the discriminated union of strict payloads (`ProtocolEnvelopePayloadByType[ProtocolMessageType]`), so reader code is forced to narrow on `envelope.type` before reading type-specific payload fields such as `findings_parity`, `findings`, `question`, or `message`.

Completion therefore requires:

- no `ProtocolEnvelopeReadablePayload` or equivalent wide/readable payload alias;
- no default `ProtocolEnvelope` payload shape where every known payload field is optional;
- reader and projection sites updated to narrow by `envelope.type` instead of relying on a permissive payload view;
- tests updated with concrete envelope fixtures or type guards, not `as any` casts.

### Feedback checkpoint: generic append boundary

Once `ProtocolEnvelope` defaults to a strict discriminated union, append infrastructure must preserve the concrete `TType` from draft to result. Otherwise callers that append a `ProtocolEnvelopeDraft<"PASS">` receive only `ProtocolEnvelope` back, and application code is pushed into `as ProtocolEnvelope<"PASS">` casts at the emit boundary.

Completion therefore requires:

- `AppendProtocolEnvelopeInput`, `AppendProtocolEnvelopeResult`, and `AppendProtocolEnvelopePort` generic in `TType extends ProtocolMessageType`;
- mutation-boundary append helpers preserving the same `TType` between input draft and returned envelope;
- application callers not casting appended results back to concrete envelope types;
- any remaining casts confined to true runtime/TypeScript boundaries, such as validated unstructured input or generic object-spread reconstruction, with no caller-side type assertion needed.

1. **Emitter and reader survey.**
   - For `HUMAN_QUESTION`, `HUMAN_REPLY`, `APPROVAL_DECISION`, and `TASK`, list emitter sites, observed payload fields, and readers/projections that consume those fields.
   - Separately list all `FindingsParityMetadata` carriers and consumers, especially places that flatten or read parity through `metadata`.
2. **First-slice scope lock.**
   - Decide whether `TASK` is included.
   - Decide required-vs-optional fields for each first-slice payload kind.
   - Confirm the exact carrier list for top-level `findings_parity`.
3. **Runtime contract edits.**
   - Update `src/v11/shared/protocol/protocolEnvelopeContract.ts`.
   - Tighten only first-slice payload kinds.
   - Detach `ProtocolEnvelopeMetadata` from `FindingsParityMetadata`.
   - Add `findings_parity` only to confirmed carrier contracts.
4. **Call-site migration.**
   - Update emitters to use concrete `ProtocolEnvelope<"...">` / draft generics where useful.
   - Update readers/projections to consume top-level parity instead of generic metadata.
   - Remove or rewrite flattening helpers so they cannot remain as canonical parity paths.
5. **Architecture visibility.**
   - Remove the stale `src/types/protocol.ts` fitness exception.
   - Add report-only checks for broad protocol/finding fan-out and parity leakage back into generic metadata.
6. **Validation.**
   - Run `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, focused tests, `pnpm test`, and `pnpm build`.
   - Smoke-test transcript loading and affected projections against a recent bubble archive.
   - Before declaring the slice complete, check the End-State Invariants explicitly.

## End-State Invariants

The first slice is "done" only when the invariants below hold across the touched code paths. There must be no transitional aliases, deprecated re-exports, parallel old/new types, translation wrappers, or "until migration completes" comments left behind. The unified strictness decision (see Resolved Decisions) applies to the code structure itself, not just to the runtime data shapes.

### Type contract invariants

- **No `extends ProtocolEnvelopePayloadBase`** on the first-slice payload kinds (`HUMAN_QUESTION`, `HUMAN_REPLY`, `APPROVAL_DECISION`, and `TASK` if included). Each interface lists only its own valid fields.
- **`ProtocolEnvelopePayloadBase` itself is not weakened to an empty or near-empty interface as a workaround.** If still imported by yet-untightened payload kinds (`PASS`, `CONVERGENCE`, `APPROVAL_REQUEST`, `COMMIT_RESULT` — second slice), it stays as-is until those kinds migrate. If no consumers remain after the first slice, it is **deleted**, not retained "for symmetry."
- **`ProtocolEnvelopeMetadata` remains only an unstructured metadata bag** — implemented as `Record<string, unknown>` or an equivalent string-indexed interface. It must not extend `FindingsParityMetadata`, include typed parity fields, or use intersection types.
- **`findings_parity` lives only at the top level** on carrier message kinds. There is no parallel `metadata.findings_parity` path retained "for compatibility" or "until consumers migrate."
- **No `@deprecated` markers** on the touched shapes. A touched payload kind either has its strict shape directly, or it does not exist; there is no deprecated old name pointing to the new one.
- **No parallel `StrictHumanQuestionProtocolEnvelopePayload` (or similar) types** alongside the existing names. The migration happens **in place** on the existing names — the existing interface is rewritten, not duplicated.

### Code-path invariants

- **No `as any` casts in tests** for the touched payload kinds. If a test needs to verify that an invalid envelope is rejected, it constructs that case through discriminated union narrowing or an explicit fixture, not through type erasure.
- **No wrapper helpers that accept loose payload objects and produce typed envelopes** for the touched kinds. Emitter sites use `ProtocolEnvelope<"HUMAN_QUESTION">` (etc.) directly, without an intermediate `buildEnvelope(type, partialPayload)`-style escape hatch.
- **No caller-side casts from appended results back to a concrete envelope type.** Append infrastructure preserves `TType` end to end, so application code does not need `appended.envelope as ProtocolEnvelope<"...">` to recover the type it just emitted.
- **No "translate old to new" shims** kept as permanent code. If a transcript reader needs to handle archived payloads from before the change, that handling is either an explicit one-off migration script or accepted data loss (per Resolved Decisions) — not an ongoing translation layer in the runtime path.
- **No "optional during migration" fields.** A field that emitters always populate becomes `required` in the strict type. The optional-vs-required choice reflects the actual contract, not the migration phase.
- **No test fixture mirrors a pre-migration field location.** Fixtures for touched payload kinds must use the same payload shape the real emitter produces; otherwise a stale reader and stale fixture can pass together while production telemetry or projections silently drift.

### Comment / TODO invariants

- **No `// TODO: remove after migration` comments** referencing the touched payload kinds. The migration completed in this slice; there is nothing left to defer for them.
- **No prose comments describing the old shape** as a "previous version," "legacy structure," or "to be cleaned up later" in the touched code paths.

### Second-slice handoff invariants

If `ProtocolEnvelopePayloadBase` survives the first slice because the untouched payload kinds (`PASS`, `CONVERGENCE`, `APPROVAL_REQUEST`, `COMMIT_RESULT`) still extend it, this is **not** permanent transitional code — it is uncompleted work explicitly scheduled for the second slice. The second-slice plan must include deleting `ProtocolEnvelopePayloadBase` once its last consumer migrates. First-slice end-state does not require this deletion; second-slice end-state does.

## Discussion Questions

Open implementation-time questions (architecture-level questions are settled in Resolved Decisions):

1. For each first-slice payload kind, which fields should be required vs optional? Default rule: required unless emitter behavior shows it intentionally absent.
2. Which order of files makes the cleanest migration: protocol emitters → transcript readers → UI presenters → tests, or some other sequence?

## Acceptance Shape

This discussion is ready to become implementation work when:

- the message kinds included in the first slice are confirmed (`HUMAN_QUESTION`, `HUMAN_REPLY`, `APPROVAL_DECISION`, and `TASK`);
- the required-vs-optional payload fields for those message kinds are decided based on a brief emitter site survey;
- the list of message kinds that receive a top-level `findings_parity` field is confirmed against the actual consumer list.

Already settled (see Resolved Decisions): compatibility model, parity metadata placement, finding projection deferral.

**Implementation completion** is gated by all End-State Invariants being satisfied for the touched code paths — not just by typecheck and tests passing. The implementer should treat the End-State Invariants section as the final checklist.
