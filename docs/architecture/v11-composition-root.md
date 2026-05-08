# v11 Composition Root

Status: active
Owner: architecture/runtime
Scope: composition responsibilities of `src/cli/**` and any peer composition root

## Purpose

This document defines the composition-root role in the v11 architecture.

The composition root is the single layer authorized to assemble runtime
adapters from `defaults/**` (or directly from `infrastructure/**`) into
the dependency shape that `application/**` commands accept.

In the current codebase, `src/cli/**` is the primary composition root.
Contract tests under `tests/contracts/**` are a peer composition root.
Future runtimes (HTTP host, UI host) may add further peers; each gets
the same privileges and the same responsibilities.

## Why A Composition Root Exists

`application/**` and `shared/**` depend on port contracts, not on
concrete adapters. Without a designated composition root, adapter
selection drifts:

1. into `application/**` — hides infrastructure ownership behind
   orchestration,
2. into `shared/**` — breaks the strength × distance balance rule
   (shared is high-distance, neutral; composition is high-strength),
3. into ad-hoc helpers across multiple entry points — production and
   test wiring drift apart silently.

A designated composition root concentrates all adapter selection in one
authorized location, where the choice is visible, reviewable, and
swappable in one place.

## Placement

`src/cli/**` is **outside `src/v11/**` deliberately**:

- it is not part of the layered v11 model; it sits *above* it,
- it is outside the fitness-check scopes that govern v11 internal
  boundaries (`application_defaults_boundary`, `shared_defaults_boundary`,
  etc.) — those scopes are `src/v11/**` only,
- its role is connection, not orchestration.

Sub-structure:

- `src/cli/commands/<group>/<command>.ts` — one file per CLI command
  (e.g. `src/cli/commands/bubble/list.ts`, `src/cli/commands/agent/pass.ts`)
- `src/cli/runtime/**` — optional shared helpers if multiple commands
  need the same composition assembly. Introduce only when duplication
  becomes painful; per-command inline is the default.

## Composition Root Responsibilities

A composition root file does:

1. **Parse input.** CLI argv, HTTP request, test scenario — whatever
   the surface accepts.
2. **Import concrete adapters.** From `defaults/**` (the catalog) or
   directly from `infrastructure/**` when an adapter has no ambient
   default.
3. **Assemble the dependency value.** Build the `dependencies`
   parameter (or capability slice bundle) that the application command
   API expects.
4. **Invoke the application command.** Pass parsed input + assembled
   dependencies.
5. **Format the result for the surface.** Text, JSON output, exit
   code, HTTP response.

A composition root file does NOT:

- implement command logic (no orchestration, no domain rules),
- mutate state or transcripts directly (those go through application
  → ports → infrastructure),
- hold business invariants,
- expose runtime values to layers below (only the application command
  reads what the composition root passes).

## Layer Relationship

### Composition root may import from

- `src/v11/application/**` — the orchestrator API for each command.
- `src/v11/defaults/**` — the composition catalog.
- `src/v11/infrastructure/**` — when bypassing the catalog for a
  one-off adapter; rare, justify in the file.
- `src/v11/shared/ports/**` — port type signatures, if needed for
  type assertions during assembly.
- `src/contracts/**` — surface contracts (CLI ↔ UI, JSON output schema).

### Composition root may NOT import from

- `src/v11/domain/**` directly. CLI is composition; domain is rule.
  Cross domain only via the application command API.

### Composition root is read by

- the CLI binary entry point (`pairflow` command),
- end-to-end tests that exercise the CLI surface.

## What Composition Root Looks Like

A canonical composition root file (`src/cli/commands/bubble/list.ts`):

```ts
import { parseArgs } from "node:util";

import {
  asBubbleListError,
  listBubbles
} from "../../../v11/application/list/listReadModelApi.js";
import { listCommandDefaults } from "../../../v11/defaults/list/listCommandDefaults.js";
import type { BubbleListView } from "../../../v11/shared/read-model/list/listReadModelContract.js";

export async function runBubbleListCommand(argv: string[]): Promise<number> {
  const options = parseBubbleListCommandOptions(argv);
  if (options.help) {
    process.stdout.write(getBubbleListHelpText() + "\n");
    return 0;
  }
  const view: BubbleListView = await listBubbles(
    { repoPath: options.repo, refresh: options.refresh },
    listCommandDefaults
  );
  process.stdout.write(formatBubbleListView(view, options.json) + "\n");
  return 0;
}
```

The file: parses, imports defaults, calls the application API with the
defaults bundle, formats output. Nothing more.

Avoid (anti-pattern — re-export camouflage):

```ts
// src/cli/commands/bubble/<cmd>.ts — anti-pattern
export * from "../../../v11/application/<cmd>/<cmd>CliCommand.js";
```

This shape places the CLI surface nominally in the right directory, but
the actual parsing/assembly/invocation lives back in `application/**`.
The file is a wrapper that hides the composition direction. The fix is
to invert the ownership: the parsing/assembly/invocation moves into the
CLI file, and the application-side `*CliCommand.ts` deletes (its
non-CLI parts, if any, fold into the application command API).

## Anti-Circumvention Rule

The following are not valid uses of the composition root:

1. a `src/cli/**` file whose only content is a re-export back to
   `src/v11/application/**` — the composition root must own the
   parsing/assembly/invocation, not just expose it,
2. an `application/**` or `shared/**` file that performs the assembly
   step (importing defaults and building dependencies) — that role
   belongs to the composition root,
3. a `src/cli/**` file that contains command logic (orchestration,
   domain calls, mutation sequencing) — that logic belongs in
   `application/**` and is invoked from the CLI, not authored there.

## Multiple Composition Roots

`src/cli/**` is the primary composition root. Peer composition roots
exist or may exist:

- **Contract tests** under `tests/contracts/**` — assemble real
  adapters for end-to-end contract verification.
- **(Future) HTTP / UI host runtimes** — if a long-running server
  surface is added, that surface becomes a peer composition root.

Each composition root has the same privilege (may import from
`defaults/**` and, when justified, `infrastructure/**`) and the same
responsibility (own the adapter→port assembly for its surface). They
share the catalog (`defaults/**`) without crossing into each other.

A `src/cli/**` file does not import from `tests/**`, and vice versa.
If a piece of composition logic is genuinely shared across roots, it
belongs in the catalog (`defaults/**`), not in either root.

## Reference

- [v11-architecture-overview.md](./v11-architecture-overview.md) —
  top-level layer model and dependency-direction diagram.
- [v11-ports-governance.md](./v11-ports-governance.md) — port contracts
  that the composition root assembles.
- [v11-defaults-governance.md](./v11-defaults-governance.md) — the
  catalog consumed by the composition root.
- [architecture-fitness-checks.md](./architecture-fitness-checks.md) —
  `src/cli/**` is outside the v11 fitness scopes by design; the
  composition root is what makes that exclusion safe.
