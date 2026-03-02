# Task: Fix Relative Transcript Ref Delivery Regression (Phase 1)

## Context

In active bubbles, agent delivery messages currently include refs like:

- `ref=transcript.ndjson#msg_...`

This is ambiguous and often wrong from agent runtime perspective, because agents run in bubble worktrees while transcript lives under:

- `<repo>/.pairflow/bubbles/<bubble-id>/transcript.ndjson`

Observed failure mode:
1. Reviewer receives a HUMAN_REPLY/PASS delivery message.
2. Reviewer tries to open `transcript.ndjson` relative to worktree.
3. File is missing in worktree.
4. Reviewer blocks asking for context instead of continuing review protocol.
5. Watchdog escalates bubble to `WAITING_HUMAN`.

This is now reproduced in multiple repositories, so it is not a one-off issue.

## Goal

Ensure delivery refs are deterministic and directly resolvable by agents from their execution context, so reviewers do not stall on missing transcript paths.

## Scope

In scope:
- Delivery `messageRef` construction for tmux notifications.
- Any fallback path that currently emits `transcript.ndjson#...`.
- Tests covering delivery message content and ref semantics.

Out of scope:
- Large protocol redesign.
- Changing transcript storage layout.

## Proposed Behavior

1. Delivery refs must be absolute or canonical within repo context.
2. For transcript fallback refs, emit full absolute path:
   - `/abs/repo/.pairflow/bubbles/<bubble-id>/transcript.ndjson#<msg-id>`
3. Never emit bare relative `transcript.ndjson#...` in delivery messages.
4. Human reply and pass delivery paths must use the same ref semantics.

## Implementation Notes

Potential touchpoints:
- `src/core/runtime/tmuxDelivery.ts`
- `src/core/agent/pass.ts`
- `src/core/human/reply.ts`
- Any helper that builds `messageRef` defaults

Prefer centralizing fallback-ref generation in one utility to avoid drift between call sites.

## Acceptance Criteria (Binary)

1. PASS delivery message contains a resolvable transcript ref path (not relative-only fallback).
2. HUMAN_REPLY delivery message contains a resolvable transcript ref path (not relative-only fallback).
3. No delivery path emits `ref=transcript.ndjson#...` without path prefix.
4. Existing behavior with explicit envelope refs remains unchanged.
5. Targeted tests assert new ref format and pass.

## Test Plan

1. Update/add tests in:
   - `tests/core/runtime/tmuxDelivery.test.ts`
   - `tests/core/agent/pass.test.ts` (if needed for messageRef plumb-through)
   - `tests/core/human/reply.test.ts` (if delivery ref assertion exists/needed)
2. Run targeted tests for changed suites.
3. Run typecheck and build.

## Risks

1. Hardcoding absolute paths in display text could increase message size.
2. Mixed separators on non-macOS platforms if path normalization is inconsistent.

Mitigation:
- Use Node path utilities consistently.
- Keep formatting stable and machine-searchable.

## Deliverables

1. Code changes for delivery ref fallback semantics.
2. Updated/added regression tests.
3. Done package notes summarizing before/after ref examples.
