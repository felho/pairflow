# Task: Protocol Vocabulary Drift Fitness Check

**Source task**: `plans/tasks/2026-05-14-protocol-findings-vocabulary-task.md`  
**Status**: implemented  
**Work type**: architecture fitness guardrail

## Goal

Prevent the recently closed protocol vocabulary refactor from drifting back toward wide protocol payloads or structured facts hidden under `payload.metadata`.

This is a prevention task, not a continuation of the original implementation fix. The baseline is already clean; the fitness check makes that baseline mechanically visible in future changes.

## Scope

Add repository fitness coverage for protocol vocabulary drift:

| Pattern | Mode | Rule |
|---|---|---|
| `payload.metadata.findings_*`, `payload.metadata.findings_parity`, or `payload: { metadata: { findings_* } }` | hard-fail | Findings parity/count facts must use explicit payload fields, not the metadata bag. |
| `payload.metadata.advisory_findings_open_total` or `payload: { metadata: { advisory_findings_open_total } }` | hard-fail | Convergence advisory count must stay top-level on `CONVERGENCE`. |
| `payload.metadata.commit_sha`, `payload.metadata.commit_message`, `payload.metadata.staged_files`, or equivalent `payload: { metadata: { ... } }` | hard-fail | Commit result facts must stay top-level on `COMMIT_RESULT`. |
| `ProtocolEnvelopePayloadBase` references in runtime source | hard-fail | The permissive payload base is retired. |
| `ProtocolEnvelopeReadablePayload`, `ReadablePayload`, `WidePayload`, or equivalent protocol payload alias in protocol contracts | hard-fail | No wide/readable replacement for the old base. |
| `ProtocolEnvelopeMetadata extends ...` or `ProtocolEnvelopeMetadata & { ... }` | hard-fail | Metadata remains an unstructured bag, not a typed protocol extension surface. |
| `as ProtocolEnvelope<"...">` casts | report-only | Inventory suspicious cast sites first; legitimate runtime validation or TypeScript reconstruction boundaries may remain. |

## Non-Goals

- Do not block generic domain metadata such as `input.metadata.findings_parity_status` when it is not protocol payload metadata.
- Do not block lifecycle/event metrics metadata. This task targets protocol payload metadata drift only.
- Do not make `as ProtocolEnvelope<"...">` hard-fail yet; first collect a report-only inventory.
- Do not consolidate advisory finding aliases in this task.

## Done State

- `pnpm fitness:check:ci` includes the new hard-fail protocol vocabulary drift check.
- The `as ProtocolEnvelope<"...">` inventory appears as report-only and does not block CI.
- Focused fitness tests cover each hard-fail family and the report-only cast inventory.
- The current repository passes the hard-fail check without exceptions.

## Implementation Notes

- `protocol_vocabulary_drift` is hard-fail and scans `src/v11/**/*.ts`.
- `protocol_envelope_cast_inventory` is report-only and scans `src/v11/**/*.ts` plus `tests/**/*.ts`.
- The cast inventory currently reports known `ProtocolEnvelope<TType>` reconstruction casts, including the accepted `convergedGateDelivery.ts` TypeScript spread boundary and test fixture builders. These remain visible for later promotion decisions but do not block CI.
