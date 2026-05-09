# Module Depth Guidance Discussion

Status: discussion draft
Date: 2026-05-09

## Problem

Recent refactors showed a recurring risk: a change can introduce `internal/`
directories, more files, or cleaner-looking placement while leaving callers with
the same amount of knowledge about internal order, policy, and helper details.

That kind of refactor can be structurally neat but architecturally shallow. The
goal of this note is to capture guidance for future agent work so new code and
boundary refactors move toward deeper modules without over-applying the rule to
every small cleanup.

Core principle:

```txt
A refactor is not complete when files are moved.
A refactor is complete when callers need to know less.
```

## Refactor Categories

### 1. Mechanical Refactor

Examples:

- renames,
- import path updates,
- formatter-only changes,
- moving files while preserving the same public interface,
- dead code deletion.

Module depth is not the main goal here.

Expected standard:

- behavior remains unchanged,
- blast radius stays narrow,
- typecheck/tests remain green,
- no new public helper surface is introduced.

### 2. Local Cleanup

Examples:

- splitting a long function into local helpers,
- reducing duplication inside one file or one small module,
- improving readability without changing ownership.

Module depth is a light consideration only.

Expected standard:

- the code is easier to read or verify,
- helper extraction does not leak into public surface,
- caller interface does not become broader,
- tests remain focused on observable behavior unless helper-level policy is
  genuinely independent.

### 3. Boundary Or Module Refactor

Examples:

- introducing `internal/`,
- narrowing or reshaping a public interface,
- moving behavior between `shared`, `domain`, `application`, or
  `infrastructure`,
- splitting command orchestration from policy,
- replacing many helper calls with a command-local pipeline.

Module depth is mandatory here.

The refactor must answer:

1. What caller knowledge is removed?
2. Which public interface becomes smaller or more stable?
3. Which ordering, policy, validation, or invariant moves behind the module?
4. Which public wrappers or helper exports are deleted, demoted, or justified?
5. Which tests now cross the same interface callers use?
6. What does the deletion test say about the new module?

If the answer is "callers know the same things through different files", the
refactor is not deep enough.

### 4. Behavior-Preserving Architecture Refactor

Examples:

- command pipeline consolidation,
- shared public surface cleanup,
- meta-review gate ownership cleanup,
- converting broad helper orchestration into one runtime-facing interface.

This is the strongest module-depth case.

Expected standard:

- the runtime or external caller delegates to a small interface,
- internal sequencing is not reconstructed at the call site,
- public helper wrappers do not remain as camouflage over `internal/**`,
- tests shift from many low-level helper expectations toward the module
  interface, while retaining helper tests only for independent policy,
- any retained shared policy surface is deliberate and non-wrapper.

### 5. Preparatory Refactor

Examples:

- setting up a future dry-run or preview use case,
- extracting code for a later caller,
- creating an internal structure before a larger planned move.

This category is useful but risky.

Expected standard:

- the preparatory value is tied to a concrete follow-up task or plan,
- no broad public surface is introduced for hypothetical callers,
- no speculative seam is added unless there are at least two real consumers or
  a near-term committed consumer,
- the task explicitly says what is intentionally deferred,
- if the preparation does not reduce caller knowledge now, it must say why that
  is acceptable and how the next step will close the loop.

## Proposed Agent Guidance

Add guidance along these lines to the relevant agent instructions:

```md
## Module Depth Policy

Module depth is mandatory for boundary and architecture refactors, not for every
mechanical cleanup.

When introducing or refactoring a module, optimize for caller knowledge
reduction, not file count.

A module is shallow if:
- its public interface exposes nearly every internal helper,
- callers must know the internal call order to use it correctly,
- top-level files only re-export `internal/**` implementation files,
- the refactor mostly moves files without reducing caller knowledge.

Before declaring a boundary refactor complete, apply the deletion test:
- If deleting the new module makes complexity disappear, it was likely
  pass-through ceremony.
- If deleting it would force multiple callers to reimplement ordering,
  validation, policy, or invariants, it is earning its keep.

Prefer:
- one small caller-facing interface hiding substantial behavior,
- explicit typed contracts at the public surface,
- internal helpers that are not externally imported or re-exported as
  camouflage,
- tests through the same interface callers use.

Avoid:
- broad public barrels over `internal/**`,
- wrapper files that only rename or re-export implementation helpers,
- extracting helpers only to satisfy file-size pressure while preserving caller
  complexity.

For mechanical or local refactors, preserve the existing public interface and
avoid adding new public helper surfaces.

For boundary or architecture refactors, prove that callers know less after the
change, or explicitly justify why the task is only mechanical or preparatory.
```

## Proposed Task/Review Prompt

For architecture or boundary refactor tasks, include a short module-depth check:

```md
## Module Depth Check

1. What caller knowledge is removed by this task?
2. Which public interface becomes smaller or more stable?
3. Which internal ordering, policy, validation, or invariant moves behind the
   module?
4. Which existing public helpers or wrappers are deleted, demoted, or justified?
5. Which tests move from helper-level coverage to interface-level coverage?
6. What would the deletion test say about the new module?
```

Suggested acceptance criterion:

```md
AC: The refactor must reduce caller knowledge, not only move files. If no caller
knowledge is reduced, stop and return for task refinement unless the task is
explicitly classified as mechanical or preparatory.
```

## Possible Fitness Radar

Start report-only before hard-failing legacy code.

Candidate checks:

- public files that only re-export from `internal/**`,
- module roots with `internal/**` plus near 1:1 public wrappers,
- `export * from "./internal/..."` from public files,
- external imports into `/internal/` paths,
- large public sibling lists with no deliberate public entrypoint,
- changed files that add a public wrapper without local logic or contract
  definition.

Suggested escalation:

1. report-only across the whole repository,
2. stricter warning for newly changed files,
3. hard-fail only for direct external `/internal/` imports and explicit
   camouflage patterns once the legacy surface is cleaned up.

## Open Questions

1. Where should this guidance live: root `AGENTS.md`, Pairflow skills, an
   architecture document, or all three?
2. Should the first enforcement be a docs/task review checklist or a report-only
   fitness check?
3. Which current modules should be used as examples of good depth after cleanup?
4. Which legacy shallow modules should be tracked separately so new guidance does
   not imply they must all be fixed immediately?
