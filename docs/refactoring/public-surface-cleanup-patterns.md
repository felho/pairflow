# Public Surface Cleanup Patterns

Status: draft
Last updated: 2026-05-10
Owner: architecture/runtime
Scope: Boundary/Architecture refactor work that targets shallow module
detectors in `src/v11/**` (and equivalent layered structures), specifically
the camouflage warning class around top-level files that re-export `internal/**`
implementation.

This document is a sister of
[`docs/architecture/refactoring-guidance.md`](../architecture/refactoring-guidance.md).
The guidance document defines depth, classification, and the Module Depth Check.
This document operationalizes the Shallow Module Detectors into named cleanup
patterns with concrete diagnostic signals and operations.

## Purpose

When a Shallow Module Detector fires (most commonly: "top-level files only
re-export `internal/**` implementation files"), the cleanup operation that
reduces caller knowledge is not always the same. Different shapes of camouflage
warrant different operations. This document classifies the camouflage shapes
and prescribes the matching operation.

The list is a **growing playbook**, not a closed taxonomy. When a new shape
appears that does not fit any pattern, add it here rather than force-fitting an
existing label.

## When to consult

Use this document when:

- a classification trigger from `refactoring-guidance.md` fires on a public
  surface change,
- the Module Depth Check identifies that the public file is shallow camouflage,
- a Shallow Module Detector fires on top-level re-exports of `internal/**`,
- a lane has accumulated multiple top-level public files whose actual consumer
  shape is unclear.

Each pattern below is a **Boundary/Architecture refactor** in the classification
of `refactoring-guidance.md`. The Module Depth Check applies; the operations
below are how caller knowledge is reduced in each shape.

## Vocabulary

In addition to the vocabulary defined in `refactoring-guidance.md`, this
document uses:

- **Camouflage**: a top-level public file whose body is a 1:1 re-export from an
  `internal/**` implementation file, giving the appearance of a public contract
  without contributing one.
- **Lane**: a top-level area such as `application/<feature>/`,
  `shared/<area>/`, `domain/<concept>/`, `infrastructure/<adapter>/`. A lane
  has its own `internal/` subtree.
- **Cross-lane fogyasztás**: import paths that cross lane boundaries, e.g.
  `application/foo/` importing from `shared/bar/`.
- **Lane-internal-but-named**: a submodule directly under a lane root (e.g.
  `application/planWatch/runner/`) that is *not* re-exported from the project
  root `index.ts` but *is* imported by lane co-tenants (defaults, tests,
  command pipelines) using its named path. A third visibility tier between
  root-public and strictly-internal.
- **Earned shared**: a file in `shared/` whose actual consumer set spans more
  than one lane today. "Earned" is determined by import scan, not by intent.

## Pattern Index

The patterns split into one **lane-level** structural pattern and five
**file-level** public-surface patterns.

| # | Name                                              | Level       |
|---|---------------------------------------------------|-------------|
| 1 | Public Surface Narrowing + Package-Private Submodules | lane-level  |
| 2 | Pass-Through Canonicalization (Cross-Lane)        | file-level  |
| 3 | Pass-Through Demotion (Single-Lane Scope)         | file-level  |
| 4 | Dead Public Surface Removal                       | file-level  |
| 5 | Aggregation Barrel Consolidation                  | file-level  |
| 6 | Lane Ownership Relocation                         | file-level  |

A single lane often requires multiple file-level patterns applied together
across separate commits. One commit per pattern keeps the reason for each
change auditable.

## #1 Public Surface Narrowing + Package-Private Submodules

**Level:** lane-level architectural realignment.

**Diagnostic signal:** The lane's top-level layer exposes "every part" of its
implementation (10+ files, most of them re-exports). Lane co-tenants such as
defaults, CLI, and tests are forced to import from `internal/**` because the
public surface is implementation-toolbox-shaped, not use-case-shaped. The root
`index.ts` re-exports broadly because there is no smaller, intentional public
contract to re-export instead.

**Operation:** Introduce a three-tier visibility within the lane.

1. **Root-public** — only the use case entry point, the dependency port
   contracts, and the composition-root defaults. Concretely: the function the
   runtime calls, the types its dependencies must satisfy, and the default
   wiring exported from `defaults/`.
2. **Lane-internal-but-named** — submodules directly under the lane root
   (e.g. `runner/`, `ledger/`, `linkedTriggerIndex/`). Defaults, CLI, and tests
   import these by name. They are *not* re-exported from the project root
   `index.ts`. A consumer that already lives inside the lane reaches them
   without crossing the strict-internal boundary.
3. **Strictly-internal** — `internal/<sub>/` for files that only the lane core
   consumes (validators, mapping, execution helpers).

**Caller-knowledge reduction:** External callers depend on use-case +
contract types. Lane co-tenants depend on named submodules instead of
`internal/**`. The strictly-internal core changes without rippling to the
project root.

**Repository example:**

- `852cd5c5` — Narrow planWatch root public surface
- `14ed041c` — Realign planWatch internal ownership
- See `src/v11/application/planWatch/` for the resulting three-tier layout
  (`planWatchLoop.ts`, `planWatchLoopContract.ts` at root; `runner/`,
  `ledger/`, `linkedTriggerIndex/` as lane-internal-but-named;
  `internal/loop/` and `linkedTriggerIndex/internal/` as strictly-internal).

## #2 Pass-Through Canonicalization (Cross-Lane)

**Level:** file-level.

**Diagnostic signal:** A top-level public file is a single line
`export * from "./internal/<sub>/<name>.js"` (or an equivalent 1:1 named
re-export), AND import scan shows the symbol is consumed from **two or more
lanes** outside the owning lane.

**Operation:** Move the actual definition up to the canonical public location.
Delete the `internal/` duplicate. Update intra-lane consumers (validators,
schema modules) to import from the public contract.

**Canonical location selection:** Choose the canonical location from the import
scan, not from intent.

- If a symbol has multiple current consumers, keep a dedicated public file and
  move the definition into that file.
- If a symbol has exactly one current consumer and that consumer is itself a
  public contract, absorb the symbol into that contract instead of preserving a
  one-symbol public file.
- Do not make another lane import a command contract just to reach a port type;
  cross-lane port types earn their own public file.

**Caller-knowledge reduction:** The "where is the real definition?" question
collapses; the dependency direction inverts so that intra-lane logic depends on
the public contract instead of the public file forwarding to a private one.

**Repository example:**

- `76cb5b72` — Canonicalize shared state data contracts
- `848f10b1` — Canonicalize doc contract gate config type
- `10b3c346` — Absorb meta-review delivery capability types
- `7c979810` — Canonicalize meta-review artifact IO port
- Resulting files: `src/v11/domain/state/execution/executionContextTypes.ts`,
  `src/v11/domain/state/rework/reworkIntentTypes.ts`,
  `src/v11/domain/state/snapshot/roundRoleHistory.ts`,
  `src/v11/shared/gates/docContractGateConfigTypes.ts`,
  `src/v11/shared/metaReview/metaReviewCommandContract.ts`,
  `src/v11/shared/metaReview/metaReviewArtifactIo.ts`.
  (The state-related types were originally under `src/v11/shared/state/`
  at the time of commit `76cb5b72`; the Step 4 domain-state refactor
  relocated them under `src/v11/domain/state/<subarea>/`.)

## #3 Pass-Through Demotion (Single-Lane Scope)

**Level:** file-level.

**Diagnostic signal:** Same shape as #2 (1:1 pass-through), BUT import scan
shows the symbol is consumed only **inside the owning lane** (intra-package
plus tests). Public visibility is not justified by any cross-lane consumer.

**Operation:** Delete the public pass-through file. The definition stays in
`internal/`. Tests, which are part of the lane, import directly from the
`internal/` location.

**Caller-knowledge reduction:** The public surface no longer claims a
contract that no external caller consumes. Encapsulation tightens; future
callers cannot accidentally couple to a non-contract symbol.

**Repository example:**

- `76cb5b72` — Canonicalize shared state data contracts (same commit applies
  this pattern to the meta-review schema validators after import scan showed
  intra-lane scope only).
- Resulting state: `stateSchemaMetaReview.ts` and
  `stateSchemaMetaReviewRuntime.ts` live only under
  `src/v11/domain/state/metaReview/` after the Step 4 domain-state
  refactor (originally `shared/state/internal/` at the time of
  commit `76cb5b72`).

## #4 Dead Public Surface Removal

**Level:** file-level.

**Diagnostic signal:** The public file has **zero** external imports — neither
from `src/`, nor from `tests/`, nor as a re-export from the project root
`index.ts`. Verifiable deterministically with import scan.

**Operation:** Delete the file, or move it to `internal/` if anything intra-lane
still references it. No deprecation window is required because no consumer
contract exists.

**Caller-knowledge reduction:** The public surface stops claiming contracts
that have no consumers; the camouflage warning count drops without any caller
needing to migrate.

**Repository example:**

- `9d766efc` — Drop unused shared gates wrappers (eight files removed at once
  after import scan confirmed zero external usage).

**Verification before applying:** Before treating an import count of zero as
authoritative, also grep for `import("…")` (dynamic import), `require(…)`, and
barrel re-exports (`export * from "…"`, `export { … } from "…"`). A file used
exclusively through a barrel will not appear in a naive `from "<path>"` scan.

## #5 Aggregation Barrel Consolidation

**Level:** file-level.

**Diagnostic signal:** Two-layer facade — a top-level pass-through
(`export * from "./internal/<sub>/<name>.js"`) over an `internal/` aggregator
that deliberately bundles symbols from multiple sub-modules into one public
import surface. The aggregator is **not** a 1:1 pass-through; it is a real
public-API barrel that lives one level too deep.

**Operation:** Move the barrel content up to the top-level file as explicit
named re-exports (`export { foo } from "./internal/<sub>/…"`). Delete the
`internal/` aggregator layer. The atomic `internal/` modules remain.

**Caller-knowledge reduction:** The public surface becomes auditable in a
single file: one read shows what the lane exposes. The duplicate facade layer
that contributed nothing beyond indirection is gone.

**Repository example:**

- `3f258c72` — Move doc contract gates barrel to public module
- Resulting file: `src/v11/shared/gates/docContractGates.ts` now contains the
  explicit re-export bundle directly; the previous
  `internal/evaluation/docContractGates.ts` aggregator has been removed.

**Why not Canonicalize (#2)?** Canonicalization assumes a single internal
source. A barrel has multiple sources; the pattern is consolidation of the
barrel itself, not promotion of one definition.

## #6 Lane Ownership Relocation

**Level:** file-level.

**Diagnostic signal:** A file lives in `shared/<area>/` (or another
cross-cutting namespace), but its actual consumer set is confined to a single
lane (production consumer + tests). The "shared" placement is justified by
*hypothetical* cross-lane future use, not by current import scan.

Count lanes, not importing files. Multiple production consumers inside the same
lane are still single-lane usage; that can justify a lane-private helper, but
not `shared/` placement.

**Operation:** Move the file to the owning lane (`defaults/<area>/`,
`cli/<command>/`, `application/<feature>/<sub>/`, etc.). The `shared/` location
is reserved for files whose import scan demonstrates earned shared status.

**Caller-knowledge reduction:** Callers no longer believe a lane-private helper
is part of a shared contract. Ownership is co-located with the consumer, so
future changes do not require coordinating across lanes that do not actually
depend on the helper.

**Repository example:**

- `0f44c04a` — Demote doc contract gate artifact path resolver
- Resulting state: `resolveDocContractGateArtifactPath` now lives in
  `src/v11/defaults/gates/` (or equivalent owning lane location), not under
  `shared/gates/`.
- `59fec4de` — Move meta-review command error mapping to submit owner
- Resulting state: `metaReviewCommandErrorMapping` now lives under
  `src/v11/application/metaReview/internal/submit/`; its multiple production
  consumers are all within the `application/metaReview` lane.

**Reverse direction (when to undo a demotion):** If a second lane appears that
needs the helper, promote it back to `shared/`. Promotion is cheap when the
single-lane home is well-known; demotion under cross-lane usage is expensive.
Optimize for the cheap direction.

## Decision Tree (file-level)

Apply after the lane-level question of #1 is settled. If the lane-level
structure is wrong (top-level toolbox, defaults forced into `internal/**`),
resolve #1 first; the file-level patterns then apply within the new structure.

```text
Public file with camouflage warning
│
├─ External imports == 0?
│  └─ YES ──────────────────────────────────────────► #4 Dead Public Surface Removal
│
└─ NO
   │
   ├─ Pass-through (1:1 export *) or aggregator?
   │  │
   │  ├─ Aggregator (multi-source bundle) ─────────► #5 Aggregation Barrel Consolidation
   │  │
   │  └─ Pass-through (1:1)
   │     │
   │     ├─ Cross-lane consumers (≥ 2 lanes)? ────► #2 Pass-Through Canonicalization
   │     │
   │     └─ Single-lane consumers
   │        │
   │        ├─ Implementation detail (validator,
   │        │  schema, internal helper) ──────────► #3 Pass-Through Demotion
   │        │
   │        └─ Stable contract / shape, but ──────► #6 Lane Ownership Relocation
   │           located in wrong namespace
```

## Pattern Selection Notes

- The patterns are **orthogonal**, not mutually exclusive within a lane. The
  `shared/gates` cleanup applied #4 + #5 + #6 + (a #2 instance for
  `docContractGateConfigTypes`) across separate commits.
- One commit per pattern. Mixing patterns in a single commit destroys the
  diff-as-explanation property (the reviewer cannot tell whether a deletion is
  #4 or part of a #5 consolidation without re-running the analysis).
- Prefer the cheapest pattern first within a lane (#4 has zero migration cost;
  #1 is the most expensive). Cheap moves shrink the residual surface that the
  expensive move must reason about.

## Post-Refactor Leftover Hunt

After any sweep that applies one or more of the patterns above, run a
leftover hunt to catch artifacts that the main sweep can miss. Three
checks cover the common cases:

1. **Empty directories.** Sub-area dirs left behind when a canonicalization
   moved files out:

   ```bash
   find src -type d -empty
   ```

   Git does not track empty dirs (only files), so they don't show in
   `git status` — but they linger in the working tree and confuse
   `find` / IDE navigation. `rmdir` them as a working-tree hygiene step;
   no commit is generated.

2. **Pure pass-through files** that re-export without value-add. Symptoms:
   total non-comment lines ≤ re-export lines + a few; no `export function`
   / `export const` / `export class` of its own. These are usually
   Pattern #2 or #4 candidates that an earlier refactor missed:

   ```bash
   # crude but effective: list small .ts files where the body is
   # essentially "export ... from ...":
   find src -name "*.ts" -type f -exec sh -c \
     'lines=$(wc -l < "$1"); reexports=$(grep -c "from \"" "$1"); \
      [ $lines -le $((reexports * 2 + 3)) ] && echo "$lines $1"' _ {} \;
   ```

3. **Orphaned files** with zero consumers. The lane structural audit
   already flags these as `unused` (see `tools/lane-audit/run.ts` and
   `.pairflow/evidence/lane-audit.md`); cross-reference its output.

Each check should produce 0–2 hits in a healthy codebase post-sweep. If
you find more, classify each by pattern (#2 / #4 / etc.) and apply the
operation in a separate commit per the standard discipline.

A specific gotcha worth flagging: when a sweep targets a naming pattern
(e.g., V11 suffix), grep tends to anchor on the most-obvious occurrence
(filenames, top-level function names). It can miss the same suffix in:

- import aliases (`import { foo as fooV11 } from "..."`),
- private function names that happen to share the suffix,
- comments and docstrings,
- string literals (test fixture paths, error messages).

A final `grep -rn "<suffix>"` across `src/` + `tests/` (excluding
known-acceptable directory-name path-segments) should be part of the
sweep's closeout.

## Maintenance

This document is intended to grow. When a Boundary/Architecture refactor
encounters a camouflage shape that fits none of the listed patterns:

1. record the new shape's diagnostic signal and operation in the same format,
2. add an entry to the Pattern Index table,
3. update the decision tree if the new shape sits within an existing branch,
4. cross-reference the introducing commit and the resulting file layout.

The `architecture/runtime` owner reviews this document together with
`refactoring-guidance.md` after the same maintenance cadence (every 5
Boundary/Architecture refactor tasks land, or when classification triggers
change).
