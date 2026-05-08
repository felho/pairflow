# v11 Ports Governance

Status: active  
Owner: architecture/runtime  
Scope: explicit capability boundaries under `src/v11/shared/ports/**`

## Purpose

This document defines the `ports` model for `src/v11/**`.

The goal is to make it possible for `application` code to depend on explicit
capability contracts without importing concrete infrastructure adapters.

This is not only a fitness-check concept. It is an architectural boundary in
the codebase.

## Why Ports Exist

Without explicit ports, `application` code often falls into one of two bad
states:

1. direct `application -> infrastructure` imports,
2. fake `shared` wrappers that only hide infrastructure ownership.

Ports are the intended boundary between those two extremes:

- `application` depends on a capability contract,
- `infrastructure` owns the implementation,
- composition/wiring connects them.

## Placement

Default home:

- `src/v11/shared/ports/**`

Rationale:

- ports are shared boundary contracts,
- they are not pure domain policy,
- they are not infrastructure implementations,
- they should be visible and reviewable as first-class dependency surfaces.

Do not create top-level `src/v11/ports/**` by default.

## Layer Relationship

### `application`

May depend on:

- `application`
- `domain`
- `shared`
- `shared/ports`

Must not depend directly on:

- `infrastructure`

### `shared/ports`

May contain:

- interface/type contracts for capabilities,
- function-type ports,
- dependency bundle types,
- small adapter-neutral request/response contracts,
- explicit error boundary types when they are part of the capability contract.

Must not contain:

- FS/git/tmux/process/storage implementation,
- direct persistence/runtime logic,
- pass-through wrappers whose only job is to forward to `infrastructure`,
- hidden technology ownership disguised as `shared`.

### `infrastructure`

Owns:

- concrete adapter implementations,
- persistence/runtime integrations,
- low-level technology details,
- side-effecting implementations behind ports.

## Ports vs Shared

`shared` and `shared/ports` are not the same thing.

Use plain `shared` for:

- shared meaning,
- shared canonicalization,
- shared helper logic,
- shared neutral contracts that are not dependency boundaries.

Use `shared/ports` for:

- capability boundaries that `application` depends on instead of importing
  infrastructure directly.

Rule of thumb:

- if the module answers “what does this mean?”, it is usually `shared`,
- if the module answers “what capability does this use-case require?”, it is
  usually `shared/ports`.

## What Belongs In Ports

Good candidates:

- transcript append capability,
- state snapshot store capability,
- repo registry capability,
- git repository inspection capability,
- runtime sessions lookup capability,
- tmux delivery emission capability,
- bubble lookup capability when used as an application-facing dependency.

Typical examples:

- `src/v11/shared/ports/transcript.ts`
- `src/v11/shared/ports/stateStore.ts`
- `src/v11/shared/ports/repoRegistry.ts`
- `src/v11/shared/ports/gitRepository.ts`
- `src/v11/shared/ports/runtimeSessions.ts`

## What Does Not Belong In Ports

Do not create ports for:

- pure path derivation,
- pure ID generation,
- normalization helpers,
- deterministic policy/derivation,
- command-local helper logic,
- modules that were only misplaced under `infrastructure` but are not actually
  infrastructure concerns.

Those should move to `domain`, `shared`, or command-local `application`
depending on ownership.

## Port Shape

Allowed shapes:

- interface-based contract,
- function-type contract,
- explicit dependency object type,
- narrow request/response types.

Examples:

```ts
export interface TranscriptAppenderPort {
  append(input: AppendProtocolEnvelopeInput): Promise<AppendProtocolEnvelopeResult>;
}
```

```ts
export type RegisterRepoPort = (
  input: RegisterRepoInput
) => Promise<RegisterRepoResult>;
```

Avoid:

- barrel files that only re-export infrastructure functions,
- ports that expose infrastructure-only data types without an application-facing
  reason,
- broad “capability bags” with unrelated methods.

For UI router ports, leaf modules must consume direct capability slices such as
list, timeline, detail-loading, conflict-enrichment, or action-dispatch
dependencies. A full `UiRouterDependencies` aggregate may exist only as a
composition/wiring contract and must be assembled from the direct slices rather
than used as the source for leaf-facing aliases.

## Anti-Circumvention Rule

The following are not valid ports:

1. a direct re-export of an infrastructure function,
2. a 1:1 forwarding wrapper with no boundary meaning,
3. a module placed under `shared/ports` whose real owner is still clearly
   infrastructure,
4. a “port” that imports and calls infrastructure inline instead of describing a
   dependency contract.

If a module is only hiding infrastructure from the fitness check, it is not a
port.

## When To Introduce A Port

Introduce a port when all are true:

1. `application` needs a capability,
2. the capability is implemented via concrete infrastructure,
3. moving the implementation into `shared` would be semantically wrong,
4. the dependency should remain explicit and typed.

If these are not true, do not introduce a port by reflex.

## Source Of Truth

Ports own the dependency contract.

Infrastructure owns the implementation.

Application owns orchestration and wiring decisions at the use-case level, but
must not silently redefine the capability contract ad hoc.

## Fitness Implications

If the ports model is adopted, fitness should enforce all of the following:

1. `application -> infrastructure` remains forbidden,
2. `application -> shared/ports` is allowed,
3. `shared/ports -> infrastructure` is forbidden,
4. `shared/ports` must not be pass-through adapter camouflage,
5. infrastructure implementations may depend on `shared/ports` contracts.

This means ports are a codebase concept first, and a fitness-policy concept
second.

## Review Checklist

When reviewing a proposed port:

1. Is this a real capability boundary, not a helper?
2. Would moving the implementation into `shared` be semantically wrong?
3. Is the port narrow and typed?
4. Does it avoid direct infrastructure forwarding?
5. Is the implementation still clearly owned by `infrastructure`?
6. Does the `application` layer now depend on the contract instead of the
   adapter?

## Rollout Guidance

Recommended adoption order:

1. define the ports policy,
2. update fitness so it understands ports and rejects fake wrappers,
3. migrate the highest-value dependency clusters incrementally,
4. keep port surfaces narrow and capability-specific.

Do not perform a repo-wide “convert everything to ports” sweep without cluster
review.

## Reference

- [v11-architecture-overview.md](./v11-architecture-overview.md) —
  top-level layer model and dependency-direction diagram.
- [v11-defaults-governance.md](./v11-defaults-governance.md) — the
  catalog that wires concrete `infrastructure/**` adapters behind these
  ports.
- [v11-composition-root.md](./v11-composition-root.md) — the layer
  authorized to assemble adapters into the dependency objects that
  `application/**` commands accept.
- [architecture-fitness-checks.md](./architecture-fitness-checks.md) —
  fitness checks that enforce the port direction and reject fake
  wrappers.
