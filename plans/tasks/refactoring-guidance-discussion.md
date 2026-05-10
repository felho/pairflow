# Refactoring Guidance Discussion

Status: discussion draft
Date: 2026-05-10

## Problem

Recent refactors showed two related risks:

1. treating all refactors as if they require the same architecture scrutiny,
2. treating boundary or architecture refactors as complete when files moved but
   callers still need the same knowledge about internal order, policy, and
   helper details.

The goal of this note is to classify refactors first, then apply the right
standard. Mechanical and local cleanup refactors should stay lightweight.
Boundary and architecture refactors must move toward deeper modules.

Core principle:

```txt
A refactor is not complete when files are moved.
A refactor is complete when callers need to know less.
```

## Classification Trigger

The category must not be self-declared by taste. A task is automatically a
Boundary/Architecture Refactor when any of these are true:

- it touches any `internal/**` path,
- it adds, removes, renames, or reshapes a public export,
- it adds a new module root or public entrypoint,
- it moves code across `shared`, `domain`, `application`, `infrastructure`, or
  `contracts`,
- it changes command orchestration, pipeline sequencing, state transition
  ordering, persistence ordering, authority checks, or canonicalization order,
- it replaces multiple caller-side helper calls with a pipeline or facade,
- it changes which tests import public surface versus internal helpers.

When a trigger fires, the task must run the Boundary/Architecture section of
this guidance, including the Module Depth Check. It can still conclude that the
change is intentionally mechanical, but that conclusion must be explicit and
reviewed.

## Refactor Classes

### 1. Mechanical Refactor

Examples:

- renames,
- import path updates,
- formatter-only changes,
- moving files while preserving the same public interface,
- dead code deletion.

Module depth is not the main goal here unless a classification trigger fires.

Expected standard:

- behavior remains unchanged,
- blast radius stays narrow,
- typecheck/tests remain green,
- no new public helper surface is introduced,
- if a trigger fired, explain why no caller-knowledge reduction is expected.

### 2. Local Cleanup

Examples:

- splitting a long function into local helpers,
- reducing duplication inside one file or one small module,
- improving readability without changing ownership.

Module depth is a light consideration only unless a classification trigger
fires.

Expected standard:

- the code is easier to read or verify,
- helper extraction does not leak into public surface,
- caller interface does not become broader,
- tests remain focused on observable behavior unless helper-level policy is
  genuinely independent,
- if new helpers need external imports, reclassify as Boundary/Architecture.

### 3. Boundary/Architecture Refactor

Examples:

- introducing or changing an `internal/` boundary,
- narrowing or reshaping a public interface,
- moving behavior between `shared`, `domain`, `application`, `infrastructure`,
  or `contracts`,
- splitting command orchestration from policy,
- consolidating command pipelines,
- cleaning up shared public surfaces,
- converting broad helper orchestration into one runtime-facing interface.

Module depth is mandatory here. The intensity can vary:

- local boundary refactor: one module root,
- command/module boundary refactor: one command or bounded workflow,
- cross-layer architecture refactor: multiple layers or shared contracts.

The refactor must prove that callers know less after the change. If the answer
is "callers know the same things through different files", the refactor is not
deep enough.

Expected standard:

- the runtime or external caller delegates to a small interface,
- internal sequencing is not reconstructed at the call site,
- public helper wrappers do not remain as camouflage over `internal/**`,
- tests shift toward the same interface production callers use,
- helper tests remain only for independent policy,
- any retained shared policy surface is deliberate, stable, typed, and
  non-wrapper.

## Preparatory Modifier

Preparatory is not a separate refactor class. It is a modifier that can apply to
Mechanical, Local Cleanup, or Boundary/Architecture work.

Preparatory work is useful but easy to misuse as a label for shallow structure.
If `preparatory: yes`, require:

- a concrete follow-up artifact such as a PRD, plan, task file, or tracked issue
  with an ID,
- no broad public surface for hypothetical callers,
- no speculative seam unless there are at least two real consumers or a
  near-term committed consumer,
- an explicit statement of what is intentionally deferred,
- an explicit statement of how the follow-up will reduce caller knowledge,
- a review window or checkpoint; if the follow-up does not land in that window,
  the preparatory surface becomes tracked architecture debt.

Preparatory work must not introduce public surface that the follow-up is
expected to delete again.

## Module Depth Policy

Module depth is the standard for Boundary/Architecture refactors. It is not the
standard for every refactor.

When introducing or refactoring a module, optimize for depth: leverage at the
interface and locality in the implementation. A deep module hides substantial
behavior behind a small interface; a shallow module exposes an interface nearly
as complex as its implementation.

The interface is the test surface: tests should cross the same seam callers
cross. Helper-level tests are useful only when the helper owns independent
policy.

Do not introduce a seam unless something really varies across it. One adapter is
a hypothetical seam; two adapters make it real.

## Module Depth Check

For Boundary/Architecture refactors, and for any task where a classification
trigger fires, answer these in order:

1. What does the deletion test say?
   - If deleting the new module makes complexity disappear, it was likely
     pass-through ceremony.
   - If deleting it would force multiple callers to reimplement ordering,
     validation, policy, or invariants, it is earning its keep.
2. What caller knowledge is removed by this task?
3. Which public interface becomes smaller or more stable?
4. Which ordering, policy, validation, canonicalization, persistence rule, or
   invariant moves behind the module?
5. Do tests exercise the same interface as production callers, or do they still
   reconstruct internal sequencing through helper imports?
6. Which existing public helpers or wrappers are deleted, demoted, or justified?

Test shape is a canary. If tests still need to import the same internal helpers
after the refactor, the module probably did not get deeper. Helper-level tests
are still valid when they protect independent policy, but they should not be
the only coverage for production call order.

Suggested acceptance criterion:

```md
AC: The refactor must reduce caller knowledge, not only move files. If no caller
knowledge is reduced, stop and return for task refinement unless the task is
explicitly classified as mechanical or preparatory and passes the classification
trigger review.
```

## Shallow Module Detectors

Treat these as review warnings:

- the public interface exposes nearly every internal helper,
- callers must know internal call order to use the module correctly,
- top-level files only re-export `internal/**` implementation files,
- the refactor mostly moves files without reducing caller knowledge,
- tests continue to import low-level helpers to reconstruct the production
  workflow,
- a new facade returns a broad bag of fields that the caller still interprets
  step by step,
- a public wrapper is retained only because callers have not moved to a deeper
  interface.

## Worked Example

The submit pipeline task is the current canonical example of the intended shape:

- `plans/tasks/meta-review-submit-command-local-pipeline.md`

The key pattern to preserve:

- runtime-facing caller delegates to one command-local pipeline,
- preparation, persistence, canonical run-result construction, artifact parity,
  route recovery, and finalization sequencing move behind that pipeline,
- public `shared/metaReview/metaReviewCommandSubmit*.ts` wrappers are removed
  instead of retained as transitional camouflage,
- tests must cover the pipeline or deliberate non-wrapper shared policy; they
  must not replace wrappers with direct imports into `shared/.../internal/**`.

This example should be updated after implementation with the final file layout
and the import-scan evidence that proved caller knowledge was reduced.

## Proposed Agent Guidance

Top-level agent guidance should act as a trigger, not as the full policy. The
goal is to make the agent load this document whenever refactoring is in scope.
The detailed depth model belongs here, in architecture docs, and in task/review
guidance.

Suggested `AGENTS.md` trigger:

```md
## Refactoring Guidance

When planning, implementing, or reviewing a refactor, apply the Refactoring
Guidance in `plans/tasks/refactoring-guidance-discussion.md`.

Use it to classify the refactor first. Apply the Module Depth Check when the
guidance classifies the work as Boundary/Architecture.
```

## Guidance Placement

Use layered placement rather than copying the full policy everywhere:

- `AGENTS.md`: short refactoring trigger that points agents to this guidance.
- Architecture documentation: full refactor taxonomy, Module Depth Policy,
  Module Depth Check, fitness radar, worked examples, and known shallow-module
  debt.
- `CreatePairflowSpec` skill: inject the Module Depth Check when the
  classification trigger marks a task as Boundary/Architecture.
- Review and meta-review guidance: verify the deletion test, test shape, wrapper
  camouflage, and caller-knowledge reduction.

## Possible Fitness Radar

Start with checklist enforcement in tasks and reviews. Add radar checks only
after a few successful module-depth tasks establish the expected shape.

Strong mechanical signals:

- external import into a `**/internal/**` path,
- public file that only re-exports from `internal/**`,
- `export * from "./internal/..."` from public surface,
- diff-level pattern: same change adds `internal/foo.ts` plus public `foo.ts`,
  and the public file only exports/imports from the internal file.

Suggested escalation:

1. task/review checklist first,
2. report-only radar for the mechanical signals above,
3. stricter warning for newly changed files,
4. hard-fail only for direct external `/internal/` imports and explicit
   camouflage patterns once the legacy surface is cleaned up.

Keep taste-heavy signals out of hard automation:

- large public sibling lists,
- no deliberate entrypoint,
- public surface that "feels too broad".

Those can remain architecture-review prompts or report-only dashboards, but
should not become hard gates without human review.

## Known Shallow Modules

The policy should not imply that all legacy shallow modules must be fixed
immediately. Track known debt explicitly so new guidance can be strict on new
work without pretending the legacy state is already clean.

Initial candidates to evaluate:

- `src/v11/shared/metaReview/**`,
- `src/v11/shared/reviewer/**`,
- `src/v11/shared/gates/**`,
- `src/v11/shared/state/**`,
- application command directories that still expose many sibling helpers as
  public surface.

Each tracked item should eventually record:

- current public surface,
- suspected shallow pattern,
- importer/test-shape evidence,
- desired deeper interface,
- whether it is active work, deferred, or accepted for now.

## Open Questions

1. What exact short policy should be copied into root `AGENTS.md`?
2. Should the first implementation change land in `CreatePairflowSpec`, review
   guidance, or architecture docs?
3. What review window should preparatory work use before becoming tracked
   architecture debt?
4. Which post-refactor modules should become positive examples beside
   meta-review submit?
