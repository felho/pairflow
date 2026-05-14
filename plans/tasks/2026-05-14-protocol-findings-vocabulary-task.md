# Task Discussion: Narrow Protocol and Findings Vocabulary

**Source review**: `docs/modularity-review/2026-05-14-modularity-review-full-codebase.md`  
**Issue**: `Protocol and findings vocabulary is still the widest volatile model`  
**Status**: discussion draft — key architectural decisions resolved (see "Resolved Decisions")

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

Apply the same `findings_parity?: FindingsParityMetadata` field only on message kinds (or adjacent event/result contracts) where parity is part of the contract. The carrier list is confirmed by a brief consumer survey before implementation; current candidates are `APPROVAL_REQUEST` and `CONVERGENCE` payloads. All other payload kinds carry no parity field.

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

**A. Low-risk payload tightening (Approach #1).** Applied to the lowest-risk payload kinds: `HUMAN_QUESTION`, `HUMAN_REPLY`, `APPROVAL_DECISION`, and possibly `TASK`. Each loses its `extends ProtocolEnvelopePayloadBase` and is rewritten with only the fields valid for that message kind.

**B. Parity metadata relocation (Approach #2).** `findings_parity` is lifted to a top-level field on the message kinds (or adjacent event/result contracts) that carry parity. The carrier list is confirmed by a brief consumer survey before implementation; current candidates are `APPROVAL_REQUEST` and `CONVERGENCE`. `ProtocolEnvelopeMetadata` becomes a plain `Record<string, unknown>`.

Plus **Approach #4** (fitness): stale exception removed; report-only checks added.

**Important boundary.** Work item B touches the heavier payload kinds (`APPROVAL_REQUEST`, `CONVERGENCE`) **only** to relocate parity to a top-level field. Their full payload tightening — removing `extends ProtocolEnvelopePayloadBase` and tightening field-by-field — is a second-slice activity, not first slice.

Out of scope for the first slice:

- Full payload tightening for `PASS`, `CONVERGENCE`, `APPROVAL_REQUEST`, `COMMIT_RESULT` — second slice.
- Any `Finding` projection — deferred until the empirical study (see Approach #3).

Before starting implementation:

- Run a brief emitter site survey for the four lowest-risk payload kinds. Count how many emitter sites construct each payload and how many readers depend on each field. Use the result to confirm — or reorder — the "lowest risk" ranking.
- Run a brief consumer survey to confirm which message kinds (or adjacent event/result contracts) currently carry `FindingsParityMetadata`. The current candidate list (`APPROVAL_REQUEST`, `CONVERGENCE`) is a starting point, not a definitive list.

Implementation caution:

The `ProtocolEnvelopePayloadByType[TType]` generic only provides per-message-kind type safety when emitter sites use a **concrete** `TType` (e.g. `ProtocolEnvelope<"HUMAN_QUESTION">`) rather than the wide `ProtocolMessageType` union. Tightening payload contracts is necessary but not sufficient: emitter sites that take a generic `ProtocolEnvelope` (with default `TType = ProtocolMessageType`) will still accept any payload shape, because the union of strict payloads is itself permissive through the default parameter.

Audit emitter sites for the touched payload kinds and prefer the concrete `ProtocolEnvelope<"HUMAN_QUESTION">` (etc.) at call sites. Where a site genuinely handles multiple message kinds, narrow with a discriminating switch on `envelope.type` before reading the payload.

Validation during implementation:

- Add type-level tests or compile-time fixtures proving invalid fields are rejected for the tightened payloads.
- Run the normal typecheck / lint / test path for touched behavior.
- Smoke-test transcript loading and affected projections against a recent bubble archive. The change is compile-time only; old transcripts will not "fail to parse" at the JSON level. But runtime validation, transcript readers, or UI projection assumptions may fail if an archived payload contains fields the new strict type does not permit, or relies on parity living under `metadata` rather than at the top level. If such a failure surfaces, decide per case: ad-hoc migration script, or accept loss of that archived bubble (per Resolved Decisions).

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
- **No "translate old to new" shims** kept as permanent code. If a transcript reader needs to handle archived payloads from before the change, that handling is either an explicit one-off migration script or accepted data loss (per Resolved Decisions) — not an ongoing translation layer in the runtime path.
- **No "optional during migration" fields.** A field that emitters always populate becomes `required` in the strict type. The optional-vs-required choice reflects the actual contract, not the migration phase.

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

- the message kinds included in the first slice are confirmed (currently: `HUMAN_QUESTION`, `HUMAN_REPLY`, `APPROVAL_DECISION`, possibly `TASK`);
- the required-vs-optional payload fields for those message kinds are decided based on a brief emitter site survey;
- the list of message kinds that receive a top-level `findings_parity` field is confirmed against the actual consumer list.

Already settled (see Resolved Decisions): compatibility model, parity metadata placement, finding projection deferral.

**Implementation completion** is gated by all End-State Invariants being satisfied for the touched code paths — not just by typecheck and tests passing. The implementer should treat the End-State Invariants section as the final checklist.
