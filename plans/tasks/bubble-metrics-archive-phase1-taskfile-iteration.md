# Task: Iterate and Improve the Phase 1 Task File

## Goal

Refine `plans/tasks/bubble-metrics-archive-phase1.md` so it is clearer, more execution-ready, and less ambiguous for implementer/reviewer loops.

## Primary Target

- `plans/tasks/bubble-metrics-archive-phase1.md`

## What to Improve

1. Tighten scope boundaries:
   - keep Phase 1 focused on capture infrastructure only
   - remove/clarify any wording that could pull in Phase 2/3 work
2. Increase implementation clarity:
   - define concrete deliverables and expected module boundaries
   - make lock/error-handling expectations explicit where currently vague
3. Strengthen testability requirements:
   - ensure acceptance criteria map to concrete tests
   - reduce “interpretation risk” in reviewer feedback cycles
4. Improve acceptance criteria quality:
   - make them measurable and binary where possible
   - avoid criteria that depend on subjective interpretation
5. Add sequencing hints:
   - suggest a practical implementation order minimizing migration risk

## Constraints

1. Keep this as a **task-file quality iteration**, not feature implementation.
2. Do not introduce new product scope beyond Phase 1 intent in:
   - `docs/bubble-metrics-archive-strategy.md`
3. Keep the resulting task file concise and execution-oriented.

## Deliverables

1. Updated `plans/tasks/bubble-metrics-archive-phase1.md`
2. Short changelog section at the end of the task file:
   - what was clarified
   - what ambiguity/risk was removed

## Acceptance Criteria

1. The updated Phase 1 task file clearly separates:
   - in-scope vs out-of-scope
   - required vs optional implementation details
2. Every acceptance criterion in the task file can be mapped to at least one concrete test assertion.
3. The task file no longer contains obvious ambiguity around:
   - identity model (`bubble_instance_id`)
   - logging layout (sharded events path)
   - failure semantics for analytics writes.
