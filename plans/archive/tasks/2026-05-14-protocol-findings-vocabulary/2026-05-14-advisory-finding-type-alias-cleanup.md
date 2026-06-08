# Task: Advisory Finding Type Alias Cleanup

**Source task**: `plans/archive/tasks/2026-05-14-protocol-findings-vocabulary/2026-05-14-protocol-findings-vocabulary-task.md`
**Status**: archived
**Work type**: naming/contract cleanup

**Archived note**: implemented by `07538787` (`Alias advisory finding projection types`).

## Goal

Reduce naming noise around the advisory finding projection introduced during the protocol vocabulary cleanup.

The code currently has three names for the same field shape:

| Type | Shape | Owner |
|---|---|---|
| `ProtocolAdvisoryFinding` | `severity: "P2" \| "P3"; title: string; refs?: string[]` | protocol payload contract |
| `ConvergedStructuredFinding` | `severity: "P2" \| "P3"; title: string; refs?: string[]` | converged command input |
| `MetaReviewGateAdvisoryFinding` | `severity: "P2" \| "P3"; title: string; refs?: string[]` | meta-review gate projection |

## Decision

Keep the contextual public names where they are useful for caller readability, but make them aliases of `ProtocolAdvisoryFinding` so there is one canonical advisory projection shape.

This is not a behavior change. Validation and normalization stay owned by their current modules.

## Non-Goals

- Do not rename command-facing `ConvergedStructuredFinding` call sites.
- Do not move converged CLI severity validation into protocol validation.
- Do not change meta-review artifact parsing or finding split behavior.
- Do not change `PASS` or auto-rework `APPROVAL_DECISION`, which intentionally keep the richer kernel `Finding` contract.

## Done State

- `ConvergedStructuredFinding` aliases `ProtocolAdvisoryFinding`.
- `MetaReviewGateAdvisoryFinding` aliases `ProtocolAdvisoryFinding`.
- Existing command/domain public names remain available.
- Typecheck, lint, dependency fitness, focused tests, and full validation pass.
