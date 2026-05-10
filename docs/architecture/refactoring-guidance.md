# Refactoring Guidance

Status: draft
Last updated: 2026-05-10
Owner: architecture/runtime
Scope: refactoring work across `src/**`, `ui/**`, `tools/**`, docs-driven
task specs, and Pairflow skill guidance

Test fixtures and build configuration are out of scope unless they affect
runtime ordering, public contracts, authority, validation, or canonicalization
flow.

## Purpose

Refactoring work does not all need the same level of architecture scrutiny.
This document classifies refactors first, then applies the right standard.

Mechanical and local cleanup refactors should stay lightweight. Boundary and
architecture refactors must move toward deeper modules: callers should know less
after the change, and important behavior should gain locality behind a smaller
interface.

Core principle:

```txt
A refactor is not complete when files are moved.
A refactor is complete when callers need to know less.
```

## Vocabulary

Use these terms consistently:

- **Module**: anything with an interface and an implementation: function, class,
  package, lane, workflow, command pipeline, or slice.
- **Interface**: everything a caller must know to use the module correctly:
  types, invariants, ordering, error modes, config, side effects, and
  performance expectations.
- **Implementation**: the code inside a module.
- **Depth**: leverage at the interface. A deep module hides substantial behavior
  behind a small interface. A shallow module exposes an interface nearly as
  complex as its implementation.
- **Seam**: where an interface lives; a place behavior can be altered without
  editing in place.
- **Adapter**: a concrete thing satisfying an interface at a seam. An adapter is
  meaningful when the same seam can have multiple concrete implementations;
  otherwise it may just be ordinary implementation code.
- **Leverage**: the amount of behavior obtained per unit of interface knowledge
  required.
- **Locality**: what maintainers get from depth: change, bugs, knowledge, and
  verification concentrated in one place.

## Classification Trigger

The category must not be self-declared by taste. A task is automatically a
Boundary/Architecture Refactor when any of these are true:

- it touches any `internal/**` path,
- it adds, removes, renames, or reshapes a public export,
- it adds a new module root or public entrypoint,
- it moves code across `shared`, `domain`, `application`, `infrastructure`, or
  `contracts`,
- it changes command orchestration, pipeline sequencing, state transition
  ordering, persistence ordering, authority checks, validation flow, or
  canonicalization order,
- it replaces multiple caller-side helper calls with a pipeline or facade,
- it changes which tests import public surface versus internal helpers.

When a trigger fires, run the Boundary/Architecture section of this guidance,
including the Module Depth Check. The task can still conclude that the change is
intentionally mechanical, but that conclusion must be explicit and reviewed.

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
- public files over `internal/**` add behavior, constraints, or stable contract
  meaning instead of only re-exporting implementation helpers,
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
   - If deleting the new module would not increase what callers must know about
     ordering, validation, policy, or invariants, why is the module not
     pass-through ceremony?
   - If deleting it would force multiple callers to reimplement ordering,
     validation, policy, or invariants, what knowledge moved behind the module?
2. What caller knowledge is removed by this task?
3. Which public interface becomes smaller or more stable?
4. Which ordering, policy, validation, canonicalization, persistence rule, or
   invariant moves behind the module?
5. Do tests exercise the same interface as production callers, or do they still
   reconstruct internal sequencing through helper imports?
6. Which existing public helpers or wrappers are deleted, demoted, or justified?

Record the answers in the task's Architecture, Design, or Module Depth Check
section. `ReviewSpec` task-mode review verifies them for Boundary/Architecture
refactor tasks.

Test shape is a canary. If tests still need to import the same internal helpers
after the refactor, the module probably did not get deeper. Helper-level tests
are still valid when they protect independent policy, but they should not be the
only coverage for production call order.

Suggested acceptance criterion for Boundary/Architecture refactor tasks:

```md
AC: The refactor must reduce caller knowledge, not only move files. If no caller
knowledge is reduced, stop and return for task refinement.
```

If review re-classifies the task as Mechanical or Local Cleanup, this acceptance
criterion no longer applies, but the re-classification and trigger review must
be recorded.

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

## Public Surface Cleanup Patterns

When a Shallow Module Detector fires on top-level re-exports of `internal/**`,
the matching cleanup operation depends on the camouflage shape: dead public
surface, 1:1 pass-through with cross-lane consumers, 1:1 pass-through with
single-lane consumers only, deliberate aggregation barrel sitting one level too
deep, or stable shape located in the wrong namespace. The catalog of named
patterns, diagnostic signals, operations, and decision tree lives in
[`docs/refactoring/public-surface-cleanup-patterns.md`](../refactoring/public-surface-cleanup-patterns.md).

The catalog is a growing playbook, not a closed taxonomy. When a
Boundary/Architecture refactor encounters a camouflage shape that fits none of
the listed patterns, extend the catalog with the new shape's diagnostic signal,
operation, and introducing commit, rather than force-fitting an existing label.

## Agent Trigger

Root agent guidance should stay short and point here instead of duplicating this
document:

This block is the canonical source; root `AGENTS.md` mirrors it verbatim.

```md
## Refactoring Guidance

For refactors, first classify the change.

Fast-path mechanical/local cleanup is allowed only when the change does not
touch:
- `internal/**` paths,
- public exports or new module entrypoints,
- cross-layer placement (shared/domain/application/infrastructure/contracts),
- command orchestration or state/persistence ordering,
- authority, validation, or canonicalization flow.

If any of those apply, consult `docs/architecture/refactoring-guidance.md` and
run the Boundary/Architecture checks.
```

## Worked Example

Synthetic shape example:

```ts
// Shallow: callers reconstruct order and invariants.
const prepared = prepareSubmit(input);
const persisted = persistSubmit(prepared);
const finalized = finalizeSubmit(persisted);
const result = canonicalRunResult(finalized);

// Deeper: ordering and invariants move behind the interface.
const result = runSubmitPipeline(input);
```

The meta-review submit pipeline is the first intended repository-specific
worked example:

- `plans/tasks/meta-review-submit-command-local-pipeline.md`

The repository-specific example should be added after implementation lands,
using the final file layout and import-scan evidence to show that caller
knowledge was reduced.

## Maintenance

The `architecture/runtime` owner re-reviews this guidance after 5
Boundary/Architecture refactor tasks land, or when `CreatePairflowSpec` /
`ReviewSpec` enforcement changes.

Changes to classification triggers, Module Depth Check requirements, or the
agent trigger should be reviewed by `architecture/runtime`.
