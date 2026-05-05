# v11 Internal Module Boundaries

Status: active  
Owner: architecture/runtime  
Scope: explicit module privacy boundaries inside `src/v11/**`

## Purpose

This document defines the repository convention for marking a module's public
surface and internal implementation.

The goal is to make module boundaries visible in the file tree and enforceable
by a general fitness rule, without adding per-module architecture policy every
time a new bounded module is identified.

This is not a replacement for placement governance. A file can still be in the
wrong layer even if it is correctly hidden behind an `internal/` boundary.
Placement answers where code belongs; this document answers which parts of a
module are public versus private.

## Rule

If a file path contains `/internal/`, it is private to the nearest module root.

The module root is the directory immediately above `internal/`.

Example:

```txt
src/v11/shared/metaReviewGate/internal/metaReviewGateThresholdAuthority.ts
```

The module root is:

```txt
src/v11/shared/metaReviewGate
```

Only files under `src/v11/shared/metaReviewGate/**` may import that internal
file. Files outside that root must use the module's public surface.

## Public Surface

A module with an `internal/` directory must expose a deliberate public surface.

Preferred public files:

- `index.ts` for the module-level entrypoint,
- `*Contract.ts` for stable input/output contracts,
- `*Types.ts` only when the types are genuinely part of the shared language,
- narrow command/API files when a single broad barrel would hide ownership.

Do not make an internal implementation public only because a caller currently
needs it. If a temporary export is necessary during migration, mark it as
transitional in the public file and remove it as callers move to a higher-level
API.

## What Counts As A Module

Do not add `internal/` to every directory. Use it only for a real module boundary.

A directory is a good module candidate when most of these are true:

- it has an independent business or runtime identity,
- it can change on a different cadence than neighboring code,
- it can be named in project language, such as `meta-review gate`,
  `timeline read model`, or `converged flow`,
- it has enough size or complexity that a public/private distinction helps,
- it has external consumers that should not depend on implementation details.

A directory is usually not a module when it is only:

- a small pure helper collection,
- a pure type collection,
- two or three neighboring files that only collaborate with each other,
- a temporary extraction with no stable owner yet.

When the module judgment is unclear, prefer a short architecture review or a
report-only fitness candidate over adding ceremony.

## Relationship To Placement

The `internal/` convention protects encapsulation. It does not decide final
layer placement.

Use the placement policy in
[v11-placement-and-extraction-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-placement-and-extraction-governance.md)
to decide whether behavior belongs in `application`, `domain`, `shared`, or
`infrastructure`.

Pragmatic migration rule:

- move directly to `domain/**` when the code is pure policy or deterministic
  derivation and its dependencies support that placement,
- move directly to `application/**` when the code is orchestration, command
  flow, routing, or state-transition coordination,
- use `internal/` when the final placement is not obvious, the file is mixed, or
  the immediate need is to stop external deep imports before further slicing,
- keep only stable multi-lane contracts and published language in `shared/**`.

This avoids paying for two moves when a file's final owner is already clear,
while still giving mixed modules a safe stabilization path.

## Fitness Enforcement

The intended fitness rule is generic:

```txt
If an import target path contains /internal/, the importing file must be under
the same module root.
```

This rule should not need per-module configuration. A module opts into the
guardrail by creating an `internal/` directory.

Examples:

Allowed:

```txt
src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts
  -> src/v11/shared/metaReviewGate/internal/metaReviewGateCurrentRunFinalization.ts

src/v11/shared/metaReviewGate/internal/foo.ts
  -> src/v11/shared/metaReviewGate/internal/bar.ts
```

Forbidden:

```txt
src/v11/application/converged/convergedFlow.ts
  -> src/v11/shared/metaReviewGate/internal/metaReviewGateThresholdAuthority.ts
```

The check can be hard-fail for explicit `internal/` violations because the
directory name is an intentional privacy declaration.

Separately, report-only radar checks may identify large or widely imported
directories that look like bounded-context candidates but do not yet have an
explicit public/internal boundary.

## First Application

`src/v11/shared/metaReviewGate/**` is the first expected application of this
convention because it has a clear business identity, high volatility, many
internal policy/orchestration files, and multiple external consumers.

This does not mean every current `metaReviewGate` file should remain under
`shared`. The first goal is to make the public surface explicit and prevent new
deep imports. During that work, files whose nature and dependencies already
prove a better owner should move directly to `domain/metaReviewGate/**` or
`application/metaReviewGate/**` instead of passing through `shared/.../internal`.

## Review Checklist

When introducing an `internal/` boundary, verify:

1. The directory is a real module, not a small helper folder.
2. The public surface is explicit and narrow.
3. External call sites use the public surface.
4. Internal files do not leak through unmarked re-export camouflage.
5. Any transitional exports are named or commented as temporary.
6. Placement is still reviewed separately from encapsulation.
