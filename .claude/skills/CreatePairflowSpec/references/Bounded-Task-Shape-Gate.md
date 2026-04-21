# Bounded-Task-Shape Gate

Use this gate before drafting an implementation-oriented Plan or Task for mutable/runtime flows.

The purpose is to stop a common planning mistake:
- the scope sounds like one feature or one entrypoint,
- but the bounded slice is actually mixing multiple correctness closures,
- so review becomes delayed scope correction instead of validation.

## Core Rule

Do not classify a bounded slice primarily by command name, feature label, or file proximity.

Classify it by the primary correctness closure it is trying to close.

## Primary Task Shapes

Choose one primary shape:

1. `contract_or_persisted_authority_foundation`
   - shared contract/schema/config/artifact foundation
   - no downstream activation in the same bounded slice

2. `authority_producer`
   - the slice writes or produces canonical authority
   - example: create-time persistence, config write-path, canonical state producer

3. `consumer_family_alignment`
   - existing authority is consumed by one family
   - example: workflow routing, internal execution consume, one read-model consume family

4. `fail_closed_hardening`
   - rollback, retry, cleanup, namespace removal, partial-write handling, shared-state preservation

5. `coordination_concurrency_hardening`
   - lock/mutex/lease/idempotency/serialization/race-prevention behavior

6. `activation_or_read_model`
   - status/list/detail/read-model/UI/API surfacing or runtime activation

## Adjacency Rule

A bounded slice may own one secondary adjacent shape only when all are true:
1. the same bounded code path closes both,
2. they preserve the same invariants,
3. they do not introduce separate recovery, coordination, or side-effect-ordering risk,
4. the artifact states why the merge is safe.

If that proof is weak, implicit, or speculative, split now.

## Split Triggers

Split by default when any of these are true:

1. `authority_producer` is mixed with `fail_closed_hardening`
2. `authority_producer` is mixed with `coordination_concurrency_hardening`
3. a slice changes precondition ordering relative to side effects and also changes producer or shared-contract behavior
4. rollback/retry/shared-state-preservation is being added to "finish" a producer task
5. locking/serialization is being added to "stabilize" a producer task
6. the slice changes where success/completion is proven and also changes cleanup/recovery or final result/status/event semantics
7. the slice keeps one compat surface but its fields would now be populated from different proof phases without an explicit truth-surface mapping

These are not minor implementation details. They are separate correctness closures.

## Precondition-before-Side-Effect Rule

When a task modifies an existing mutation flow, record:
1. which validations must pass before any side effect,
2. which early side effects are forbidden,
3. what invalid/precondition-failure means:
   - zero side effects,
   - or explicitly bounded side effects.

If this rule changes in the same slice as producer or shared-contract work, split by default.

## Success/Completion Proof Boundary Rule

When a task changes an existing mutable flow, record:
1. what currently proves success/completion,
2. what will prove success/completion after this task,
3. which final result/status/event surfaces reflect that proof,
4. whether any surface is canonical truth, guard-only, or compat-only.

If the task changes the proof boundary and also changes cleanup/recovery behavior or final surface semantics, split by default unless the artifact proves the same bounded code path closes all of it without mixed-truth ambiguity.

## Output Expectations

For affected Plan/Task artifacts, record:
1. primary task shape
2. secondary shape, if any
3. why the mix is safe when present
4. whether invalid/precondition-failure must be zero-side-effect
5. whether coordination primitives are in scope
6. whether fail-closed hardening is in scope or deferred
