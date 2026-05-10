# Refactoring Guidance Gate

Use this gate for implementation-oriented Task drafting and `ReviewSpec`
`task-mode` review when the requested work is a refactor or when the actual
target-file reality reveals refactor behavior.

Durable architecture source of truth:
`docs/architecture/refactoring-guidance.md`.

## Purpose

Classify refactors before finalizing task shape.

Mechanical and local cleanup refactors should stay lightweight. Boundary or
architecture refactors must prove that callers need to know less after the
change, not only that files moved.

This gate composes with existing gates such as Target-File Reality Check,
Bounded-Task-Shape, and Capability Closure. It does not replace them; multiple
gates may fire on the same refactor task.

## Refactor Classification

Choose one class:

1. `mechanical`
   - renames,
   - import path updates,
   - formatter-only changes,
   - dead code deletion,
   - file moves that preserve the same public interface.
2. `local_cleanup`
   - local helper extraction,
   - duplication reduction inside one file or one small module,
   - readability improvements that do not broaden the caller interface.
3. `boundary_architecture`
   - module boundary changes,
   - public interface narrowing or reshaping,
   - behavior moving across layers,
   - command orchestration or pipeline ownership changes,
   - shared public surface cleanup,
   - broad helper orchestration moving behind a smaller interface.

`preparatory` is a modifier, not a separate class. If preparatory work is
claimed, the task must name the follow-up artifact or tracked ID, what is
deferred, and how the follow-up will reduce caller knowledge.

## Boundary/Architecture Triggers

Classify the task as `boundary_architecture` when any of these are true:

1. touches `internal/**` paths,
2. adds, removes, renames, or reshapes public exports,
3. adds a new module root or public entrypoint,
4. moves code across `shared`, `domain`, `application`, `infrastructure`, or
   `contracts`,
5. changes command orchestration, pipeline sequencing, state transition
   ordering, persistence ordering, authority checks, validation flow, or
   canonicalization order,
6. replaces multiple caller-side helper calls with a pipeline or facade,
7. changes which tests import public surface versus internal helpers.

The task may still conclude that the work is intentionally mechanical only when
the trigger review records why no caller-knowledge reduction is expected and no
new public helper surface is introduced.

## Module Depth Check

For `boundary_architecture` tasks, record answers to all questions:

1. Deletion test: If deleting the new module would not increase what callers
   must know about ordering, validation, policy, or invariants, why is the
   module not pass-through ceremony? If deleting it would force callers to
   reimplement that knowledge, what knowledge moved behind the module?
2. What caller knowledge is removed by this task?
3. Which public interface becomes smaller or more stable?
4. Which ordering, policy, validation, canonicalization, persistence rule, or
   invariant moves behind the module?
5. Do tests exercise the same interface as production callers, or do they still
   reconstruct internal sequencing through helper imports?
6. Which existing public helpers or wrappers are deleted, demoted, or justified?

## Output Expectations

For affected Task artifacts, record:

1. refactor classification,
2. trigger reasons or fast-path rationale,
3. preparatory modifier status,
4. Module Depth Check answers when classification is `boundary_architecture`,
5. test-shape expectation,
6. public helper/wrapper deletion, demotion, or justification.

## Blocking Conditions

Do not finalize an implementation-ready Task when:

1. a Boundary/Architecture trigger fires but the task does not classify the
   refactor,
2. classification is `boundary_architecture` but Module Depth Check answers are
   missing or only restate the implementation plan,
3. a new public helper surface is introduced while the task claims
   `mechanical` or `local_cleanup`,
4. tests are expected to reconstruct production order through internal helper
   imports without a deliberate independent-policy justification,
5. preparatory work introduces public surface that the follow-up is expected to
   delete again.
