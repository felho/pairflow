# v11 Placement And Extraction Governance

Status: active  
Owner: architecture/runtime  
Scope: retained code that is moved into `src/v11/**`

## Purpose

This document defines how new or migrated code should be placed inside `src/v11/**`.

The goal is not only to move code out of `src/core/**`, but to ensure that retained code lands in a clear, reviewable, quality-enforced boundary with explicit ownership.

This is a positive placement policy:

- fitness checks define what `v11` code must not do,
- this document defines how `v11` code should be structured when it is introduced or extracted.

## Scope

This policy applies when:

- logic is migrated from `src/core/**` into `src/v11/**`,
- new helper modules are introduced under `src/v11/**`,
- an existing `v11` lane is refactored into smaller submodules,
- a command is claimed to be migrated or `v11` source-of-truth.

This policy does not require every low-level retained kernel helper to move immediately. It governs the structure of code that does move into `v11`.

## Layer Meanings

### `src/v11/application/**`

Use for:

- command/use-case orchestration,
- call order,
- command-local branching,
- dependency wiring,
- boundary-level error mapping.

Do not use for:

- pure domain policy,
- generic helper dumping,
- low-level FS/tmux/git/process implementation details,
- canonical contracts whose meaning is broader than the specific use-case boundary.

### `src/v11/domain/**`

Use for:

- pure policy,
- deterministic derivation,
- invariant checks,
- reusable decision logic with minimal or no I/O.

Do not use for:

- command orchestration,
- dependency wiring,
- direct runtime adapter calls.

### `src/v11/shared/**`

Use for:

- truly multi-lane contracts,
- boundary-neutral shared helper modules,
- shared adapters or helper seams used by more than one command path.

Do not use for:

- command-specific helpers that only happen to be called "helper",
- temporary parking for code with unclear ownership,
- hidden domain ownership that should live in `domain` or a command-local boundary.

### `src/v11/infrastructure/**`

Use for:

- low-level adapters and persistence/runtime primitives,
- FS/git/tmux/process/storage integration,
- technology-facing helpers that should not be treated as domain or command policy.

If a retained low-level capability is moved into `v11`, infrastructure is the default home unless it is clearly command-local.

## Default Placement Rule

When extracting code into `v11`, place it in the narrowest correct scope first.

Default order:

1. command-local `application/<command>/...`
2. `domain/...` if the logic is pure policy or derivation
3. `shared/...` only with explicit multi-lane justification
4. `infrastructure/...` for retained technical adapters

Do not move code directly into `shared` only because:

- it is called a helper,
- it might be reused later,
- the correct owner is not yet clear.

## Shared Promotion Rule

A module may be placed in `src/v11/shared/**` only if all are true:

1. it is already used, or is immediately required, by more than one command or lane,
2. its semantics are genuinely shared rather than command-specific,
3. it does not hide domain ownership that belongs in `domain` or command-local `application`,
4. its name can be understood without command-local context.

If these conditions are not met, keep the code local.

## Contract Rule

Every non-trivial `v11` extract must have an explicit boundary.

At minimum, its meaning must be clear from types and module boundaries:

- input contract,
- output contract.

For important use-case seams, the boundary should also make clear:

- error boundary,
- dependency surface.

This can be expressed either as:

- a dedicated `*Contract.ts` file,
- or a clearly typed module boundary with named exported input/output types.

Implicit boundaries are not acceptable. Reviewers should not need to reconstruct the meaning of a module by reading multiple call sites and internal implementation details.

## Source-of-Truth Rule

Each retained canonical concern must have one explicit owner inside `v11`.

Examples:

- command result model,
- normalization contract,
- recovery snapshot contract,
- policy decision model.

Do not split ownership across multiple layers in a way that makes the real source of truth ambiguous.

Examples of bad states:

- canonical type remains in `core`, but `v11` claims source-of-truth,
- normalization meaning is split between `shared`, `application`, and legacy `core`,
- command migration is declared complete while the authoritative contract still lives elsewhere.

## Temporary Adapter Rule

Temporary bridges are allowed during strangler-style migration, but they must be explicit.

Every temporary adapter should make clear:

- why it is temporary,
- what the intended long-term owner is,
- what condition allows its removal.

Temporary bridges must not silently become permanent architecture.

## Migration Completion Rule

A lane should be considered truly migrated only when all are true:

1. retained logic for that lane lives under `src/v11/**`,
2. any remaining `src/core/**` entry is only a thin shim or explicit temporary bridge,
3. the canonical contract for the lane is owned by `v11`,
4. parity tests are green,
5. the new `v11` boundary also has direct tests of its own behavior.

Parity alone is not enough. The new placement must also be testable as a first-class boundary.

## Review Checklist

When reviewing a `v11` extract, confirm:

1. Is this code in the narrowest correct layer?
2. If it is under `shared`, is the multi-lane justification real and explicit?
3. Is the input contract explicit?
4. Is the output contract explicit?
5. Is the canonical owner of the concern obvious?
6. Is any temporary bridge labeled as temporary?
7. Do tests cover both parity and the new boundary itself?

## Operational Guidance

When in doubt:

- keep the extract command-local first,
- promote later only when shared ownership is real,
- prefer explicit named types over inferred ambient meanings,
- do not declare migration complete until `v11` is the real owner.
