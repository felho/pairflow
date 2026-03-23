# Task: Reviewer Severity Ontology Enforcement (Phase 1)

## Goal

Make the severity ontology effective in real Pairflow review loops, not only documented.

Primary outcome:
1. Stable `P1/P2/P3` interpretation in reviewer behavior.
2. Hard minimum evidence requirement for `P1`.
3. Prompt/runtime guidance aligned with `docs/reviewer-severity-ontology.md`.

## Context

Pairflow now has a canonical policy document:
- `docs/reviewer-severity-ontology.md`

But this policy is not yet fully enforced in the live loop.  
This task introduces Phase 1 enforcement so ontology decisions influence runtime behavior.

This is a prerequisite for safe rollout of "approve with notes".

## Scope Boundaries

### In Scope (Required)

1. **Central ontology snippet in runtime code**
   - Create a single reusable helper that renders the Severity Ontology v1 reminder text.
   - Do not duplicate ontology wording across multiple files.
   - Source-of-truth reference must point to `docs/reviewer-severity-ontology.md`.

2. **Reviewer prompt injection surfaces**
   - Inject ontology reminder into reviewer startup/resume guidance:
     - `src/core/bubble/startBubble.ts`
     - `src/core/runtime/tmuxDelivery.ts` (reviewer handoff action text where relevant)
   - Keep messaging concise but explicit on:
     - `P1` requires concrete evidence
     - cosmetic/comment-only findings are `P3`
     - out-of-scope observations are notes, not mandatory fix findings

3. **P1 evidence gate (hard validation)**
   - Enforce in reviewer PASS handling:
     - if reviewer submits any `P1` finding, then PASS must include at least one `--ref`.
   - If missing refs, reject command with actionable error.
   - Implementer PASS semantics must remain unchanged.

4. **Documentation linkage**
   - Update relevant docs to reflect that ontology is now enforced at runtime (Phase 1 level).
   - `docs/review-loop-optimization.md` tracker should reference this implementation status.

5. **Tests**
   - Add/adjust tests for:
     - reviewer prompt contains ontology reminder
     - reviewer PASS with `P1` and no refs fails
     - reviewer PASS with `P1` and refs succeeds
     - reviewer PASS with only `P2/P3` still works without refs

### In Scope (Optional, if low risk)

1. Add a small helper utility for checking "contains P1 findings" to avoid duplicated logic.

### Out of Scope (Do Not Implement in This Task)

1. `approve with notes` protocol behavior.
2. Severity flip cross-round hard gate.
3. New finding schema fields (for example mandatory per-finding `why_this_severity` / `scope_link` fields).
4. Parallel reviewer agents and orchestrator aggregation.
5. Acceptance-criteria hard contract validation.

## Design Requirements

1. **No silent downgrade**
   - If `P1` evidence requirement is violated, reject with explicit reason.

2. **Backwards compatibility**
   - Existing reviewer workflows for `P2/P3` and `--no-findings` remain valid.

3. **Low-friction UX**
   - Do not require new CLI flags in Phase 1.
   - Reuse existing `--ref` mechanism as the minimum `P1` evidence carrier.

## Suggested Implementation Touchpoints

1. Prompt/runtime guidance:
   - `src/core/bubble/startBubble.ts`
   - `src/core/runtime/tmuxDelivery.ts`
   - optionally shared helper module under `src/core/runtime/` for ontology text

2. PASS enforcement:
   - `src/core/agent/pass.ts`
   - optional validator-side reinforcement in `src/core/protocol/validators.ts` if needed

3. Tests:
   - `tests/core/agent/pass.test.ts`
   - `tests/core/bubble/startBubble.test.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`

## Acceptance Criteria (Binary, Testable)

1. Reviewer startup prompt includes Severity Ontology v1 reminder with explicit `P1` evidence expectation.
2. Reviewer resume prompt includes the same ontology reminder.
3. Reviewer handoff delivery guidance references ontology constraints for severity/scope behavior.
4. Reviewer PASS with at least one `P1` finding and zero refs is rejected with explicit error.
5. Reviewer PASS with at least one `P1` finding and at least one ref is accepted (assuming other invariants pass).
6. Reviewer PASS with only `P2/P3` findings is accepted without refs.
7. Implementer PASS behavior is unchanged by this task.
8. `docs/review-loop-optimization.md` progress tracker reflects that severity ontology enforcement Phase 1 is implemented.

## Test Mapping

1. AC1/AC2 -> startup/resume prompt tests assert ontology reminder text exists.
2. AC3 -> tmux delivery test asserts reviewer guidance message contains ontology constraint snippet.
3. AC4 -> pass command test expects rejection on reviewer `P1` findings with no refs.
4. AC5 -> pass command test expects success on reviewer `P1` findings with refs.
5. AC6 -> pass command test expects success on reviewer `P2/P3` findings without refs.
6. AC7 -> regression tests for implementer PASS remain green.
7. AC8 -> docs test/review step confirms tracker update.

## Deliverables

1. Runtime prompt enforcement aligned with `docs/reviewer-severity-ontology.md`.
2. Hard `P1 -> requires refs` guard in reviewer PASS flow.
3. Updated tests proving enforcement behavior.
4. Tracker/doc updates for rollout visibility.

