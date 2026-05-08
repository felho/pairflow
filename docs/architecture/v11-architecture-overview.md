# v11 Architecture Overview

Status: active
Owner: architecture/runtime
Scope: top-level layer model and orientation for `src/v11/**` and `src/cli/**`

## Purpose

This document is the entry point for understanding the Pairflow v11
architecture. It sketches the layer model, the dependency rules, and
the runtime flow of a typical command. Detailed rules per layer live
in the specialized governance docs linked at the bottom.

If you are new to this codebase, read this first. The full ruleset for
any one layer is in its own governance doc; this document is the map.

## The Layer Model

Seven concepts in v11. Six layers under `src/v11/`, plus the
composition root one level up at `src/cli/`.

```
   ┌──────────────────────────────────────────────────────────┐
   │ src/cli/**                                               │
   │   composition root — parses input, assembles deps,       │
   │   invokes application commands                           │
   └──────────────────────────────────────────────────────────┘
   ┌──────────────────────────────┐ ┌─────────────────────────┐
   │ src/v11/defaults/**          │ │ src/v11/application/**  │
   │   adapter catalog —          │ │   command orchestration │
   │   port → infrastructure      │ │   (no direct IO)        │
   │   selection                  │ │                         │
   └──────────────────────────────┘ └─────────────────────────┘
   ┌──────────────────────────────┐ ┌─────────────────────────┐
   │ src/v11/ports/**             │ │ src/v11/shared/**       │
   │   capability contracts       │ │   helpers, meaning,     │
   │   (types only)               │ │   normalizers           │
   └──────────────────────────────┘ │   (policy-neutral)      │
                                    └────────────┬────────────┘
   ┌──────────────────────────────┐              │
   │ src/v11/infrastructure/**    │              │
   │   concrete IO adapters       │              ▼
   │   (filesystem, git, tmux,    │ ┌─────────────────────────┐
   │   ssh, network)              │ │ src/v11/domain/**       │
   └──────────────────────────────┘ │   pure rules &          │
                                    │   invariants (no IO)    │
                                    └─────────────────────────┘
```

Roles in one sentence each:

- **`domain/`** — pure rules and invariants. No IO, no side effects.
  *Example*: state-machine transitions, convergence policies.
- **`shared/`** (non-ports) — common meanings, normalizers, helpers.
  Policy-neutral; reachable from many places.
  *Example*: `bubblePaths`, `errors/namedError`, `metaReview/snapshot`.
- **`ports/`** — capability contracts. Types only, no runtime
  values. The seam between application and infrastructure.
  *Example*: `ReadStateSnapshotPort`, `ProcessSpawnPort`.
- **`application/`** — command orchestration. Decides; does not
  directly do IO. Receives ports as parameters.
  *Example*: `emitPassFromWorkspace`, `listBubbles`.
- **`infrastructure/`** — concrete adapters. The only layer that
  performs IO.
  *Example*: `infrastructure/state/stateStore.ts` (file write),
  `infrastructure/channel/tmux/tmuxManager.ts` (tmux process).
- **`defaults/`** — catalog. Per port (or per command), names the
  canonical infrastructure adapter and assembles command-dependency
  bundles.
  *Example*: `defaults/state/stateStoreDefaults.ts`,
  `defaults/merge/mergeCommandDefaults.ts`.
- **`src/cli/`** — composition root. Parses CLI input, imports
  adapters from `defaults/`, builds the dependency object, invokes
  the application command, formats the result.
  *Example*: `src/cli/commands/bubble/list.ts`.

## Dependency Direction

The architecture's central rule is **who may import whom**. Read this
list as the contract; the fitness checks under
[architecture-fitness-checks.md](./architecture-fitness-checks.md)
enforce the most important forbidden edges. Some advisory rules below
are reviewer-governed unless a dedicated fitness check is listed.

```
ALLOWED IMPORT EDGES

  src/cli/         ──→  application/, defaults/, infrastructure/,
                        ports/, shared/, src/contracts/

  defaults/        ──→  infrastructure/, ports/, shared/,
                        domain/, defaults/ (sibling, transitive),
                        application/ (contracts, API wrappers, explicit
                        defaults-registration hooks only)

  application/     ──→  ports/, shared/, domain/

  infrastructure/  ──→  ports/, shared/, domain/,
                        infrastructure/ (sibling)

  shared/          ──→  domain/, ports/

  ports/           ──→  (types only — pulls types from domain/ or
                        the standard lib)

  domain/          ──→  (nothing outside domain/)
```

```
FORBIDDEN EDGES (the load-bearing rules)

  application/  ✗→  defaults/         composition leaks into orchestration
  application/  ✗→  infrastructure/   must go through ports
  shared/       ✗→  defaults/         composition leaks into shared
  shared/       ✗→  application/      helpers cannot depend on commands
  defaults/     ✗→  application internals
                                         catalog must not own command logic
  domain/       ✗→  anything else     domain is pure
```

The two forbidden edges that are easiest to break by accident are
`application/ → defaults/` and `shared/ → defaults/`. Both have
historically been hidden behind dynamic-import shims; the
`application_defaults_boundary` and `shared_defaults_boundary` fitness
checks now detect both static and dynamic forms.

## Runtime Flow

How a single CLI invocation traverses the layers. Concrete example:
`pairflow bubble list --json`.

```
  USER
    │
    │  pairflow bubble list --json
    ▼
  ┌─────────────────────────────────────────────────────┐
  │ src/cli/commands/bubble/list.ts                     │
  │   parseArgs(argv) ─────────► BubbleListInput        │
  │   import listCommandDefaults                        │
  │     (from src/v11/defaults/list/listCommandDefaults)│
  │   call listBubbles(input, listCommandDefaults)      │
  └────────────┬────────────────────────────────────────┘
               │  input + dependencies
               ▼
  ┌─────────────────────────────────────────────────────┐
  │ src/v11/application/list/listReadModelApi.ts        │
  │   orchestrates: workspace resolution, runtime       │
  │     lookup, remote refresh, projection              │
  │   calls dependencies.<adapter>(...) for each IO     │
  │   applies rules from src/v11/domain/...             │
  └────────────┬────────────────────────────────────────┘
               │  port-typed calls (no IO knowledge)
               ▼
  ┌─────────────────────────────────────────────────────┐
  │ dependencies (assembled from defaults/list/)        │
  │   wraps adapters from:                              │
  │     - infrastructure/executor/workspace/...         │
  │     - infrastructure/executor/sessionRuntime/...    │
  │     - infrastructure/artifact/bubble/...            │
  └────────────┬────────────────────────────────────────┘
               │  concrete IO calls
               ▼
  ┌─────────────────────────────────────────────────────┐
  │ filesystem, git, ssh, ...                           │
  └────────────┬────────────────────────────────────────┘
               │
               │  results bubble back up
               ▼
  ┌─────────────────────────────────────────────────────┐
  │ application returns BubbleListView                  │
  └────────────┬────────────────────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────────────────────────┐
  │ CLI formats output (JSON or text), writes stdout,   │
  │ exits with status code                              │
  └─────────────────────────────────────────────────────┘
```

The `application/` layer never imports `infrastructure/`, never
imports `defaults/`. It receives a `dependencies` object whose
fields are typed by `ports/**`. Composition roots and the
`defaults/**` catalog are the places that know which concrete adapter is
behind each port; application does not.

## Anti-Patterns at a Glance

Patterns the layer model rejects, with where each is described in
detail:

- **`application/ → defaults/` import** (static or dynamic). Hides
  the composition direction. See
  [v11-defaults-governance.md](./v11-defaults-governance.md).
- **`shared/ → defaults/` import**. Same pattern, worse seam. Shared
  is high-distance and policy-neutral; pulling composition from there
  imbalances the strength × distance rule. See
  [v11-defaults-governance.md](./v11-defaults-governance.md).
- **`defaults/<X>/...Defaults.ts` containing pure command logic**.
  If the file imports neither `infrastructure/` nor a sibling
  `defaults/` file and has no explicit surface-wrapper role, it is
  misplaced. See
  [v11-defaults-governance.md](./v11-defaults-governance.md).
- **`src/cli/<cmd>.ts` as a re-export back into `application/`**. The
  CLI surface is nominally in place but the code lives in the wrong
  layer. See
  [v11-composition-root.md](./v11-composition-root.md).
- **A `ports/<X>.ts` that re-exports an infrastructure
  function** (1:1 wrap). Not a port — a fake seam. See
  [v11-ports-governance.md](./v11-ports-governance.md).
- **Direct `writeStateSnapshot(...)` or `appendProtocolEnvelope(...)`
  in an orchestrator-shaped `application/` file**. Caught by the
  `boundary` fitness check; legitimate mutation belongs in a
  mutation-marked location. See
  [architecture-fitness-checks.md](./architecture-fitness-checks.md).

## Governance Map

The detailed rules per layer:

- [v11-ports-governance.md](./v11-ports-governance.md) — what counts
  as a port, what does not, port shape.
- [v11-defaults-governance.md](./v11-defaults-governance.md) — the
  catalog layer: what belongs, what does not, anti-circumvention.
- [v11-composition-root.md](./v11-composition-root.md) — `src/cli/`
  responsibilities, multiple composition roots.
- [v11-internal-module-boundaries.md](./v11-internal-module-boundaries.md) —
  privacy boundaries within a single module (`internal/` convention).
- [v11-placement-and-extraction-governance.md](./v11-placement-and-extraction-governance.md) —
  decision rules for where new code should live.
- [v11-boundary-decisions.md](./v11-boundary-decisions.md) — retained
  decisions log from the v1.1 → v11 boundary work.
- [architecture-fitness-checks.md](./architecture-fitness-checks.md) —
  the automated rule enforcement: which check guards which boundary,
  what a violation looks like, how exceptions are recorded.

Topical:

- [ui-contract-governance.md](./ui-contract-governance.md) — the
  `src/contracts/ui/**` boundary between backend and browser-safe UI.
- [sandbox-compatibility-gate.md](./sandbox-compatibility-gate.md) —
  runtime sandbox compatibility.

## How To Use This Document

- **Onboarding**: read this overview, then the governance doc for the
  layer you are about to modify.
- **Reviewing a PR**: check whether the change crosses a forbidden
  edge in the "Dependency Direction" diagram. If yes, the matching
  governance doc explains the right shape.
- **Adding a new layer concept**: don't, without a governance doc.
  The seven layers above are the architecture; new layers need their
  own document and their own fitness rule.
- **Resolving a fitness-check failure**: the fail message names the
  check; the matching governance doc explains the underlying rule
  and the legitimate resolution shape.
