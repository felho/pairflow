# Task Discussion: Narrow Protocol and Findings Vocabulary

**Source review**: `docs/modularity-review/2026-05-14-modularity-review-full-codebase.md`  
**Issue**: `Protocol and findings vocabulary is still the widest volatile model`  
**Status**: discussion draft

## Problem

The protocol and findings vocabulary is still the broadest shared model in the repository. This is not because separate payload types are missing. The code already has `ProtocolEnvelopePayloadByType` and message-specific payload interfaces.

The problem is that the message-specific payloads are still too permissive. Most of them inherit from a shared base that includes fields such as `summary`, `question`, `message`, `decision`, `pass_intent`, `findings_claim_state`, `findings_claim_source`, `findings`, and `metadata`. That means a payload can be type-specific in name while still accepting fields that are invalid for its message kind.

The metadata boundary is also too broad. `ProtocolEnvelopeMetadata` extends `FindingsParityMetadata` and also permits arbitrary keys, which makes meta-review findings parity look like generic envelope metadata. Consumers can start depending on metadata semantics that are not explicit by message kind.

The `Finding` vocabulary is now owned by `src/contracts/kernel/findings.ts`, which is better than the old `src/types` facade. However, the same model still crosses reviewer pass, convergence, meta-review artifacts, approval routing, UI projection, CLI, and tests. That keeps a volatile workflow concept coupled across high-distance modules.

## Goal

Reduce shared model coupling while preserving one canonical protocol language where the workflow genuinely needs it.

The desired end state is not many competing protocol dialects. It is a smaller set of explicit contracts:

- each protocol message kind exposes only the payload fields valid for that kind;
- meta-review parity metadata appears only where meta-review parity is part of the event contract;
- kernel finding values stay canonical, while workflow-specific finding projections can narrow what each workflow surface accepts or emits.

## Non-Goals

- Do not remove the shared protocol envelope concept.
- Do not introduce separate, divergent severity or priority meanings.
- Do not rewrite transcript persistence as part of the first pass.
- Do not make the UI interpret raw protocol payloads again.
- Do not turn this into a large architecture rewrite before agreeing on the target boundaries.

## Candidate Approach

### 1. Tighten payload contracts

Start with `src/v11/shared/protocol/protocolEnvelopeContract.ts`.

Remove invalid shared fields from message-specific payloads. For example, `HUMAN_QUESTION` should not accept `decision`, `pass_intent`, or `findings`; `APPROVAL_DECISION` should not accept `question` or findings claim fields unless there is a real protocol reason.

Potential direction:

```ts
export interface HumanQuestionProtocolEnvelopePayload {
  question: string;
  metadata?: ProtocolEnvelopeMetadata;
}

export interface ApprovalDecisionProtocolEnvelopePayload {
  decision: ApprovalDecision;
  message?: string;
  metadata?: ProtocolEnvelopeMetadata;
}

export interface PassProtocolEnvelopePayload {
  summary: string;
  pass_intent?: PassIntent;
  findings_claim_state?: FindingsClaimState;
  findings_claim_source?: FindingsClaimSource;
  findings?: ReviewerPassFinding[];
  metadata?: ProtocolEnvelopeMetadata;
}
```

The exact required-vs-optional fields should be decided from current emitters and transcript compatibility needs.

### 2. Split generic metadata from meta-review parity metadata

Stop making every envelope metadata object extend `FindingsParityMetadata`.

Candidate direction:

```ts
export interface ProtocolEnvelopeMetadata {
  [key: string]: unknown;
}

export interface ApprovalRequestProtocolEnvelopePayload {
  summary: string;
  findings?: ApprovalRequestFinding[];
  findings_parity?: FindingsParityMetadata;
  metadata?: ProtocolEnvelopeMetadata;
}
```

Alternative: keep parity under `metadata`, but type it only on the message kinds that can carry it. The key point is that parity should not be part of the generic envelope metadata contract.

### 3. Introduce workflow-specific finding projections

Keep `src/contracts/kernel/findings.ts` as the canonical value vocabulary for `P0`/`P1`/`P2`/`P3`, timing, layer, and common guards.

Add narrower projections where workflow semantics differ:

- `ReviewerPassFinding`
- `ConvergenceFinding`
- `MetaReviewArtifactFinding`
- `ApprovalRequestFinding`

These projections can reuse kernel values but differ in required fields, accepted aliases, evidence requirements, or display-only fields. This avoids one `Finding` shape silently becoming the contract for every workflow surface.

### 4. Add report-only architecture visibility

Update the stale fitness exception that still names deleted `src/types/protocol.ts`.

Consider report-only checks for:

- fan-out of `shared/protocol/protocolEnvelopeContract`;
- fan-out of `contracts/kernel/findings` and `contracts/kernel/protocol`;
- generic envelope metadata with open key semantics;
- `FindingsParityMetadata` leaking into generic protocol payloads.

These should start as warnings/report-only signals, not hard gates.

## Suggested First Slice

Use a small compatibility-preserving slice:

1. Tighten the lowest-risk payloads first:
   - `HUMAN_QUESTION`
   - `HUMAN_REPLY`
   - `APPROVAL_DECISION`
   - possibly `TASK`
2. Leave `PASS`, `CONVERGENCE`, `APPROVAL_REQUEST`, and `COMMIT_RESULT` for a second slice because they carry more workflow meaning.
3. Add type-level tests or compile-time fixtures proving invalid fields are rejected for the tightened payloads.
4. Run the normal typecheck/lint/test path for touched behavior.

This creates evidence for the direction without forcing the whole protocol model to change at once.

## Discussion Questions

1. Should old transcript payloads remain structurally accepted even if new emitters become stricter?
2. Which payload fields are intentionally optional for compatibility, and which are optional only because of the current broad base type?
3. Should parity metadata move to a top-level `findings_parity` payload field, or stay under `metadata` but only for specific message kinds?
4. Is `Finding` intended to be a stable kernel contract for all workflow surfaces, or should it become a value vocabulary used by narrower workflow projections?
5. Which surfaces should be migrated first: protocol emitters, transcript readers, UI presenters, or tests?

## Acceptance Shape

This discussion is ready to become implementation work when the team agrees on:

- the message kinds included in the first slice;
- the required-vs-optional payload fields for those message kinds;
- the compatibility rule for existing transcript data;
- the ownership rule for meta-review parity metadata;
- whether workflow-specific finding projections are in scope for the first implementation task or deferred.
