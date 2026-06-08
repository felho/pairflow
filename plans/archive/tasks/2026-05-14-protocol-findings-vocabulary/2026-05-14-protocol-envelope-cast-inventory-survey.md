# Task: ProtocolEnvelope Cast Inventory Survey

**Source guardrail**: `protocol_envelope_cast_inventory` fitness check
**Status**: archived
**Work type**: architecture inventory

## Goal

Classify the `as ProtocolEnvelope<TType>` sites reported by the new report-only fitness check so future changes can distinguish accepted reconstruction boundaries from suspicious caller-side casts.

## Current Inventory

| Site | Classification | Reason |
|---|---|---|
| `src/v11/application/converged/internal/gate/convergedGateDelivery.ts` | accepted production boundary | Generic object-spread reconstruction adds delivery metadata while preserving the same `<TType>` in the function signature. This is the known TypeScript limitation boundary from the protocol cleanup. |
| `tests/core/bubble/approvalRequestEnvelope.test.ts` | accepted test fixture boundary | Generic append stub reconstructs an envelope by adding `id` and `ts` to the draft. It does not recover a concrete caller-side type from an append result. |
| `tests/v11/application/kickoff/kickoffMutationExecution.test.ts` | accepted test fixture boundary | Generic append stub reconstructs an envelope by adding `id` and `ts`. |
| `tests/v11/application/kickoff/kickoffMutationPipeline.test.ts` | accepted test fixture boundary | Generic append stub reconstructs an envelope by adding `id` and `ts`. |
| `tests/v11/application/metaReviewGate/internal/currentRun/metaReviewGateCurrentRunFinalization.test.ts:217` | accepted test fixture boundary | Generic append stub reconstructs an envelope by adding `id` and `ts`. |
| `tests/v11/application/metaReviewGate/internal/currentRun/metaReviewGateCurrentRunFinalization.test.ts:1855` | accepted test fixture boundary | Retry-path generic append stub reconstructs an envelope by adding `id` and `ts`. |
| `tests/v11/application/metaReviewGate/internal/humanGate/metaReviewGateHumanGatePersistence.test.ts:68` | accepted test fixture boundary | Inline generic append stub reconstructs an envelope by adding `id` and `ts`. |
| `tests/v11/application/metaReviewGate/internal/humanGate/metaReviewGateHumanGatePersistence.test.ts:107` | accepted test fixture boundary | Inline generic append stub reconstructs an envelope by adding `id` and `ts`. |
| `tests/v11/application/watchdog/watchdogCommandApi.test.ts` | accepted test fixture boundary | Generic append stub reconstructs an envelope by adding `id` and `ts`. |

## Findings

- No inventory item is a caller-side cast from an appended result back to a concrete protocol message kind.
- The only production cast is the already-known generic object-spread reconstruction boundary.
- The remaining casts are test stubs that emulate append infrastructure by adding envelope identity fields.
- No cleanup is required before the report-only check can remain in CI.

## Future Promotion Rule

Promote `protocol_envelope_cast_inventory` from report-only toward hard-fail only after one of these is true:

- the accepted production boundary is replaced by a typed helper that does not need a cast; or
- the fitness check learns explicit allowlisted boundary categories and hard-fails only new non-allowlisted casts.

Until then, the report-only inventory is the right mode: it keeps new casts visible without creating false-positive friction around accepted TypeScript/test-fixture boundaries.
