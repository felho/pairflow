# v11 Defaults Governance

Status: active
Owner: architecture/runtime
Scope: composition catalog under `src/v11/defaults/**`

## Purpose

This document defines the `defaults` model for `src/v11/**`.

The goal is to provide a single, named home for the choice of which
concrete `infrastructure/**` adapter implements each `shared/ports/**`
contract, plus the choice of how those adapters compose into the
dependency objects accepted by `application/**` commands.

`defaults/**` is the **catalog layer**. It is consulted by composition
roots (`src/cli/**`, contract tests) and never by `application/**` or
`shared/**`.

`defaults/**` is allowed to know the application command contract it is
assembling for. It must not become a place where command orchestration or
business rules live.

## Why Defaults Exists

Without an explicit defaults layer, every composition root would
assemble adapter→port mappings independently. That produces:

1. duplicated import paths across CLI files,
2. test harnesses re-deriving the same mapping,
3. adapter selection logic ("if remote, use SSH, else local")
   scattered across entry points,
4. invisible drift between production wiring and test wiring.

A named defaults catalog gives:

- one place per port (or per command) to change the canonical adapter,
- reusable bundles consumed by CLI, contract tests, and any future
  composition root,
- reviewable choice records — a defaults edit is a visible commit
  with a clear meaning ("we changed the canonical state-store adapter").

## Placement

Default home:

- `src/v11/defaults/<concept>/<concept>Defaults.ts`

Conventions:

- one file per concept (state, transcript, processSpawn, merge, ...)
- file name suffix `Defaults.ts`
- export shape: a `const` object that satisfies one or more
  `shared/ports/**` types, OR a typed dependency aggregator named
  `<command>BubbleDependencyDefaults` / `<command>CommandDependencyDefaults`.

## Layer Relationship

### `defaults/**` may import from

- `infrastructure/**` — the only producer of runtime adapters.
- `shared/ports/**` — port type signatures.
- Other `defaults/**` files — transitive aggregation is permitted.
- `domain/**` and `shared/**` (non-ports) — for pure helpers used during
  composition (path joiners, normalizers). Use sparingly.
- `application/**` **only for command API contracts or composition
  registration surfaces**:
  - type imports for dependency object shapes,
  - command API functions exposed through a defaulted convenience wrapper,
  - explicit `configure*Defaults(...)` hooks used to register catalog values
    for legacy/direct application callers.

These application imports are transitional or surface-level coupling.
They are allowed because they do not let `application/**` read
`defaults/**`, but they should stay narrow and visible.

### `defaults/**` must not import from

- application command internals in order to reuse orchestration logic,
  mutation sequencing, validation flow, or business policy. That would
  move command ownership into the catalog.

### `defaults/**` is read by

- `src/cli/**` — the primary composition root.
- `tests/contracts/**` — contract test composition.
- Other `defaults/**` files — transitive aggregation.

### `defaults/**` is NOT read by

- `application/**` — would re-introduce the boundary violation that
  the dynamic-shim pattern hid.
- `shared/**` — shared is policy-neutral and at high distance; it
  cannot consume composition without breaking the balance rule.
- `domain/**` — domain holds rules, not wiring.

## What Belongs In Defaults

Good content:

- single port forwarder (the simplest shape)
- cohesive port-slice catalog (e.g., reviewer artifact reads + writes
  re-exported together)
- composition aggregator that bundles several adapters into a
  `*CommandDependencies`-shaped object for one command
- adapter selection logic ("if `BubbleRemotePointer` is present, return
  the SSH adapter; else return the local adapter")
- defaulted surface wrappers that expose an application command with the
  catalog's canonical dependencies for legacy callers or peer runtimes.

Typical examples:

- `src/v11/defaults/state/stateStoreDefaults.ts` (port wrap)
- `src/v11/defaults/reviewer/reviewVerificationArtifactDefaults.ts`
  (port-slice catalog)
- `src/v11/defaults/merge/mergeCommandDefaults.ts` (composition
  aggregator)

## What Does Not Belong In Defaults

- **Pure command logic** — mutation execution, validation flow,
  command policy. Discriminator: if a `defaults/<X>/...Defaults.ts`
  file imports neither `infrastructure/**` nor any sibling `defaults/**`
  file and is not an explicit defaulted surface wrapper, it is misplaced.
  Such logic belongs under `application/<command>/`.
- **Helper modules that happen to be canonical** — those belong
  under `shared/**` or `domain/**`.
- **UI-facing or contract-facing types** — those belong under
  `shared/ports/**` or `src/contracts/**`.

## Defaults Shape

Allowed shapes:

```ts
// Single-port forwarder
export const readStateSnapshot: ReadStateSnapshotPort = async (path) =>
  readStateSnapshotCanonical(path);
```

```ts
// Port-slice catalog (cohesive cluster, re-export)
export {
  readReviewVerificationArtifactStatus,
  resolveReviewVerificationInputFromRefs,
  writeReviewVerificationArtifactAtomic
} from "../../infrastructure/artifact/reviewer/reviewVerificationArtifacts.js";
```

```ts
// Composition aggregator for one command
export const mergeBubbleDependencyDefaults: MergeBubbleDependencies = {
  resolveBubbleById,
  readStateSnapshot,
  writeStateSnapshot,
  // ... assembled from infrastructure + sibling defaults
};
```

Avoid:

- application command logic taking IO via `dependencies` parameters
  (move to `application/<command>/`),
- configuration loaders without adapter selection (those belong with
  `src/config/`),
- re-export wrappers that hide direct infrastructure access from
  `application/**` via dynamic import (the legacy shim pattern).

## Anti-Circumvention Rule

The following are not valid uses of the defaults layer:

1. an `application/**` file that dynamic-imports from `defaults/**`
   to simulate a static port resolution (re-introduces the boundary
   violation through a different channel),
2. a `shared/**` file that consumes a defaults aggregator,
3. a defaults file that imports command internals from `application/**`
   instead of only contracts, command API entrypoints, or explicit
   composition-registration hooks,
4. a defaults file with **no** `infrastructure/**` and **no** sibling
   `defaults/**` imports and no explicit surface-wrapper role — that is
   misplaced application logic.

## When To Introduce A New Defaults File

Introduce a defaults file when all are true:

1. A port (or a coherent port slice, or a command's dependency object)
   needs to be assembled from concrete infrastructure adapters.
2. The assembly is process-canonical — the same composition is reused
   by CLI and contract tests.
3. The result is a value (an exported object) or a thin defaulted
   surface wrapper — its job is to expose adapters, not to own command
   flows.

Do NOT introduce a defaults file when:

- the "default" is one infrastructure call routed through one port —
  use the existing port type from `shared/ports/**` directly and let
  the composition root import the adapter inline,
- the content is command logic that takes IO via `dependencies`
  parameters — that belongs in `application/<command>/`.

## Reference

- [v11-architecture-overview.md](./v11-architecture-overview.md) —
  top-level layer model and dependency-direction diagram.
- [v11-ports-governance.md](./v11-ports-governance.md) — port contracts
  that defaults wires.
- [v11-composition-root.md](./v11-composition-root.md) — the consumer
  of this catalog.
- [architecture-fitness-checks.md](./architecture-fitness-checks.md) —
  `application_defaults_boundary` and `shared_defaults_boundary`
  fitness checks enforce the downstream "application/shared must not read
  defaults" rules above. Reviewer governance covers the narrower
  `defaults/** -> application/**` contract/API-wrapper allowance.
