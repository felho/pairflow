# Application Command Shapes — Survey

Status: draft (descriptive, not prescriptive)
Last updated: 2026-05-10
Owner: architecture/runtime
Scope: factual inventory of `src/v11/application/<lane>/` directories to inform
a future application-command-lane template
([`docs/refactoring/application-command-lane-template.md`](application-command-lane-template.md),
not yet written).

This document **describes what exists**. It does not yet prescribe a template.
Before writing the template, the data here is meant to ensure the template
covers the actual shape distribution rather than codifying a single example.

## Method

1. Listed every direct subdirectory of `src/v11/application/`.
2. For each lane, recorded: top-level `.ts` count, `internal/` presence and
   sub-areas, defaults presence, CLI presence.
3. Read top-level filenames, line counts, and a sample of entry-point files
   (at the time of the original survey these were `emit<X>V11.ts` thin
   wrappers; the wrappers have since been removed in a codebase-wide V11
   sweep, and the canonical entry point is now `<X>CommandApi.ts` —
   or `<X>Bubble.ts` / `emit<X>.ts` for lanes whose entry function name
   matches the lane).
4. Cross-referenced against the lane structural audit
   (`.pairflow/evidence/lane-audit.md`) for consumer scope.
5. Grouped lanes by shape and by current modularization state.

## Lane inventory (28 lanes)

`Top` = top-level `.ts` files. `Int` = has `internal/`. `Sub` = `internal/`
sub-area count. `Score` = lane structural audit score (higher = more
restructuring opportunity).

| Lane | Top | Int | Sub | Defaults | CLI | Score | Status |
|------|----:|:---:|----:|---------:|:---:|------:|--------|
| status | 13 | no | — | yes | yes | 37 | unstructured (mixed CLI + command) |
| watchdog | 12 | no | — | yes | yes | 35 | unstructured (multi-concern) |
| metaReviewGate | 13 | yes | flat+1 | yes | — | 16 | half-done (internal flat) |
| merge | 12 | yes | 1 | yes | yes | 28 | half-done (internal/pipeline only) |
| commit | 11 | yes | 1 | yes | yes | 17 | half-done (internal/pipeline only) |
| actorProtocol | 10 | no | — | yes | — | 26 | misclassified (not a command) |
| restart | 10 | no | — | yes | yes | 21 | unstructured |
| reconcile | 9 | no | — | yes | yes | 18 | unstructured |
| start | 9 | yes | 3 | yes | yes | 4 | structured (Tier 2-ish) |
| metaReview | 7 | yes | 1 | yes | — | 18 | half-done (internal/submit only) |
| reply | 7 | no | — | — | yes | 13 | unstructured |
| attach | 6 | no | — | — | yes | 15 | unstructured |
| delete | 6 | no | — | yes | yes | 11 | unstructured |
| extract | 6 | no | — | yes | yes | 14 | unstructured |
| open | 6 | no | — | yes | yes | 14 | unstructured |
| list | 6 | yes | 1 | yes | yes | 16 | half-done (internal/projection) |
| pass | 4 | yes | 4 | yes | yes | -2 | structured (Tier 2) |
| resume | 4 | no | — | — | yes | 7 | small unstructured |
| stop | 4 | no | — | yes | yes | 4 | small unstructured |
| approval | 3 | yes | 6 | — | — | 1 | structured (Tier 2) |
| kickoff | 3 | yes | 4 | — | — | 8 | structured (Tier 2) |
| askHuman | 2 | yes | 3 | — | yes | -2 | structured (Tier 2) |
| gates | 2 | no | — | — | — | -2 | small unstructured |
| inbox | 2 | no | — | — | — | 2 | small unstructured |
| planWatch | 2 | yes | 3 | yes | — | 0 | structured (Tier 3, empty stub dirs) |
| converged | 1 | yes | 5 | yes | yes | 0 | structured (Tier 2) |
| create | 1 | yes | 4 | yes | yes | 0 | structured (Tier 2) |
| metrics | 1 | no | — | yes | yes | 0 | trivial |

## Common naming conventions

Across the 28 lanes, the following filename patterns appear with consistent
roles. Patterns are written with `<X>` standing for the lane name (e.g.,
`watchdog`, `commit`).

| Filename pattern | Role | Example | Lanes using it |
|------------------|------|---------|----------------|
| `<X>CommandApi.ts` | Main command API implementation; canonical entry for most lanes | `watchdogCommandApi.ts` | commit, status, watchdog, restart, reconcile, reply, start, metaReviewGate (multiple) |
| `<X>Bubble.ts` or `<X>.ts` | Canonical entry when the API function name matches the lane | `attachBubble.ts`, `extractBubble.ts`, `kickoffBubble.ts`, `emitActorProtocol.ts` | attach, extract, kickoff, actorProtocol |
| `<X>CommandContract.ts` | Dependency port + result types | `watchdogCommandContract.ts` | commit, watchdog, restart, reply, reconcile, start, planWatch (as `*LoopContract.ts`) |
| `<X>CommandError.ts` | Error class definitions | `commitCommandError.ts` | commit, watchdog (as `*ErrorNormalization`), reply, restart |
| `<X>CommandErrorNormalization.ts` | Error mapping/coercion | `restartCommandErrorNormalization.ts` | commit, watchdog, restart, reply, reconcile |
| `<X>CommandRuntime.ts` | Runtime composition wiring | `watchdogCommandRuntime.ts` | commit, watchdog, restart, reconcile |
| `<X>CommandOrchestration.ts` | Multi-step orchestration | `restartCommandOrchestration.ts` | start, restart, reconcile, converged |
| `run<X>Flow.ts` | Top-level flow function | `runRestartFlow.ts` | kickoff, restart, reconcile |
| `<X>CommandInputNormalization.ts` | Input parsing/validation | `replyCommandInputNormalization.ts` | restart, reply, reconcile |
| `<X>CommandDependencyResolution.ts` | Dependency resolution helper | `replyCommandDependencyResolution.ts` | restart, reply, reconcile |
| `<X>CommandFinalization.ts` | Cleanup/wrap-up step | `commitCommandFinalization.ts` | commit, delete (as `*BubbleFinalization`) |
| `<X>CliCommand.ts` | CLI integration glue (lane-side) | `restartCliCommand.ts` | kickoff, restart, status, reconcile, delete, attach |

### Historical note: V11 wrapper files (now removed)

At the time of the original survey, eight lanes carried an `emit<X>V11.ts`
file that re-exported `<X>CommandApi.ts` (and contract) symbols under
V11-suffixed aliases. These wrappers were removed in a codebase-wide V11
sweep:

- Group A — pure alias-only wrappers (deleted): watchdog, status, start,
  metaReview.
- Group B — multi-source delegation (deleted): metaReviewGate.
- Group C — wrapper held the implementation (renamed): attach
  (`emitAttachV11.ts` → `attachBubble.ts`), extract
  (`emitExtractV11.ts` → `extractBubble.ts`), kickoff
  (`emitKickoffV11.ts` → `kickoffBubble.ts`), actorProtocol
  (`emitActorProtocolV11.ts` → `emitActorProtocol.ts`).

After the sweep there are no V11-suffixed identifiers and no files with
V11 in the filename. The path-segment `tests/v11/` and `tests/contracts/v11/`
remains as a directory naming convention only.

## Shape categories

Five distinct shapes emerge. The "Tier" labels are tentative; they're a
heuristic for how much modularization the lane needs.

### Tier 0 — Trivial (1–2 top-level, single concern)

Already minimal. No restructuring needed.

- **converged** — 1 top-level (`convergedCommandOrchestration.ts`), already
  has `internal/{finalization,flow,gate,orchestration,validation}/`.
- **create** — 1 top-level, has `internal/{finalization,persistence,preparation,runtime}/`.
- **metrics** — 1 top-level. No internal/ but no need (single small file).
- **planWatch** — 2 top-level (after narrowing) plus 3 lane-internal-but-named
  submodules (`runner/`, `ledger/`, `linkedTriggerIndex/`) plus
  `internal/loop/`. Tier 3 below.

### Tier 1 — Small Command (3–7 top-level, no internal/, one concern)

Self-contained command lanes with all files at the top level. Restructuring
straightforward: `internal/<sub>/` for everything that isn't entry/contract.

- **delete** — 6 top-level, ~1640 LOC total. Files: `deleteBubble*` cluster +
  `deleteCliCommand` + `remoteDeleteExecutionContext`.
- **attach** — 6 top-level. Files: `attachBubble*` cluster +
  `attachCliCommand` (the legacy `emitAttachV11` wrapper has been renamed to
  `attachBubble.ts`).
- **extract**, **open**, **reply**, **resume**, **stop** — similar pattern.
- **gates**, **inbox** — 2 top-level only; below restructuring threshold.

These all have the standard naming (`*CommandApi`, `*CommandContract`,
`*CliCommand` etc.), just no `internal/` boundary yet.

### Tier 2 — Standard Command Pipeline (7+ top-level OR multi-phase internal)

The dominant shape. `internal/` has phase-named sub-areas (validation,
persistence, finalization, orchestration). Top-level holds entry + contract +
error + a few orchestration-adjacent files.

Already-structured Tier 2:

- **start** — top: 9, internal: `prompts/`, `remote/`, `runtime/` (23 files).
- **pass** — top: 4, internal: `autoConverge/`, `normalPass/`, `reviewerDelivery/`,
  `verification/` (38 files). Among the cleanest.
- **kickoff** — top: 3 (`emit`, `cli`, `runFlow`), internal: `eligibility/`,
  `mutation/`, `rollback/`, `validation/` (41 files).
- **askHuman** — top: 2, internal: `delivery/`, `mutation/`, `notification/`
  (28 files).
- **approval** — top: 3, internal: 6 sub-areas.

Half-done (internal/ exists but only 1 sub-area, top-level still bloated):

- **commit** (11 top-level, internal/pipeline)
- **merge** (12 top-level, internal/pipeline)
- **list** (6 top-level, internal/projection)
- **metaReview** (7 top-level, internal/submit)

Unstructured (no internal/ at all):

- **status** (13), **watchdog** (12), **restart** (10), **reconcile** (9),
  **reply** (7).

These follow the standard naming and have the data to slot into the Tier 2
shape; they just need `internal/<sub-areas>/` introduced.

### Tier 3 — Coordinator (lane-internal-but-named submodules)

A lane whose dependents (defaults, CLI, tests) need to import named submodules,
not just opaque internal helpers.

- **planWatch** — top: 2 (`planWatchLoop.ts`, `planWatchLoopContract.ts`).
  Lane-internal-but-named: `runner/` (10 files), `ledger/` (2), `linkedTriggerIndex/`
  (5). Strictly-internal: `internal/loop/` (5 files). The runner module is
  consumed by `defaults/planWatch/` for adapter wiring; the trigger index is
  consumed by linked-bubble discovery; the ledger is consumed by persistence.

So far the **only** Tier 3 lane in `application/`.

### Tier ?? — Misclassified (not a command)

- **actorProtocol** — 10 top-level files, no internal/. File names suggest
  this lane is **not a command**: `actorRuntimeKernel.ts`,
  `actorRuntimeDispatchMatrix.ts`, `actorProtocolEmitters.ts`,
  `roleDescriptorRegistry.ts`, `rolePromptConcerns*.ts`,
  `rolePromptImplementerScope.ts`. This is a runtime/protocol/role-modeling
  layer that happens to live under `application/`. There is also a separate
  `shared/actorProtocol/` (which the audit ranks at score 4). Worth raising as
  a separate architectural question: is `application/actorProtocol/` actually
  in the wrong area?

### Tier 2½ — Half-done with flat internal/

- **metaReviewGate** — 13 top-level, `internal/` exists but is **flat**: 33+
  `.ts` files at `internal/` root, only 1 sub-dir (`currentRun/`). The flat
  files cluster naturally:
  - `metaReviewGateApply*` — 7 files
  - `metaReviewGateAutoRework*` — 5 files
  - `metaReviewGateCleanRerun*` — 6 files
  - `metaReviewGateFindings*` — 2 files
  - `metaReviewGateHumanGate*` — 4 files
  - `metaReviewApprove*` — 3 files
  
  Restructuring metaReviewGate is therefore a two-step move: (a) introduce
  sub-areas inside `internal/`, (b) move the still-top-level intra-only files
  into them. This is a larger task than the standard Tier 2 promotion.

## CLI integration pattern

Two CLI layers exist:

1. **`src/cli/commands/<X>.ts` (or `<X>/`)** — Commander.js-bound CLI entry.
   Thin wrapper that calls into the application lane.
2. **`src/v11/application/<X>/<X>CliCommand.ts`** — application-side CLI
   integration helper. Holds CLI option parsing, runtime composition for the
   CLI scenario, and renderer wiring.

The application-side CLI helper is itself part of the lane. Its role in Tier 2
restructuring: typically stays at root-public (the CLI layer imports it), or
moves to `internal/cli/<X>CliCommand.ts` if the CLI entry becomes the only
external consumer and a deeper `<X>CommandApi` is the use-case interface.

`status` is an outlier: it has 7 `statusCli*` rendering files (ANSI, table,
text, formatters, value-formatters) at top-level. These are clearly CLI
presentation helpers and should move to `internal/cli/` (or even into the
`src/cli/commands/status/` area, if rendering is CLI-area-owned).

## Anomalies and notable findings

1. **planWatch had empty stub directories** (`internal/runner/` and
   `internal/linkedTriggerIndex/`) left behind by the realignment commits
   that moved their contents to top-level `runner/` and
   `linkedTriggerIndex/`. The empty dirs have been removed; planWatch now
   has only `internal/loop/` as its strictly-internal subtree.

   *General lesson:* canonicalization sweeps that move files out of
   `internal/<sub>/` directories should follow up with a `rmdir` of the
   newly-empty subdir. Git does not track empty directories, so the
   cleanup is a working-tree-only hygiene action — but the leftover dirs
   confuse `find` / IDE navigation. This applies to any lane after a
   structural refactor, not just planWatch.

2. **actorProtocol is likely misplaced.** Its file shape suggests a
   runtime/role-domain module, not a command. A separate decision is needed
   on whether to move it to `domain/`, merge with `shared/actorProtocol/`, or
   keep but treat as a non-command application lane.

3. **metaReviewGate's `internal/` is flat.** Half-done structure: the
   boundary exists but the sub-areas don't. Refactoring this lane is a
   two-step move (introduce sub-areas + promote top-level intra-only files).

4. **Half-done Tier 2 lanes share a pattern.** `commit`, `merge`, `metaReview`,
   `list` all have a single internal sub-area (`pipeline/`, `pipeline/`,
   `submit/`, `projection/`). The boundary was introduced for a single
   concern, but other intra-lane concerns stayed top-level. Pattern: "first
   sub-area added, more never followed."

5. **The `emit<X>V11.ts` thin-wrapper was universal — and was removed.**
   At the time of the original survey, all CLI-fronted lanes had a thin
   `emit<X>V11.ts` file that re-exported + V11-renamed the underlying
   `<X>CommandApi.ts`. Since the V11 sweep landed, the wrapper layer is
   gone: Group A/B wrappers were deleted (consumers now reach
   `<X>CommandApi.ts` directly), Group C wrappers were renamed to
   `<X>Bubble.ts` / `emit<X>.ts` (since they held the implementation, not
   just aliases). The canonical root-public entry point is now
   `<X>CommandApi.ts` (or its lane-specific equivalent), consistent with
   planWatch's `planWatchLoop.ts`.

6. **Standard naming covers ~80% of files.** The 14 patterns in the naming
   table classify most files in the surveyed lanes. The remaining ~20% are
   lane-specific logic (like `watchdogPaneActivityMonitoring.ts` or
   `commitStagedFiles.ts`) that don't fit a generic role-name slot.

## Pre-template implications

Without prescribing the template, the survey suggests:

**A. Naming-role catalog is template-ready.** The 14 filename patterns map to
clear roles. The template can list them as "if your lane has this concern,
here is the conventional filename."

**B. Three tiers cover the surveyed shapes:**

- Tier 1: small unstructured (3–7 top-level, no internal/) — promote to
  `internal/<sub>/` with the standard role names.
- Tier 2: pipeline (7+ top-level OR multi-phase) — root-public is entry +
  contract + a few public-by-default files; everything else goes to
  `internal/<phase>/`.
- Tier 3: coordinator (planWatch shape) — when defaults/CLI need named
  submodule access. Add lane-internal-but-named tier.

**C. The split between root-public, lane-internal-but-named, and
strictly-internal** is decision-by-consumer-scope, not prescribed:

- Root-public when consumed across lanes (per import scan).
- Lane-internal-but-named when consumed by defaults/CLI but NOT root-exported.
- Strictly-internal when consumed only intra-lane.

**D. CLI helpers are an axis of variation.** Some lanes own CLI rendering
(`status` has many `statusCli*` files); others delegate to `src/cli/commands/`.
The template should call this out as a per-lane decision, not prescribe one
location.

**E. Half-done lanes (`commit`, `merge`, `metaReview`, `list`, `metaReviewGate`)
are the easiest first targets.** They already have `internal/` precedent;
the work is "promote more files into existing or new sub-areas," not
"introduce a boundary from scratch."

**F. Outliers must be excluded from the template.** `actorProtocol` is not a
command; the template should not try to fit it. Separate decision needed.

## Next step

Before writing `application-command-lane-template.md`, **one decision is open**:
whether the template should be one document with three tiers, or three
sister documents per tier.

A single document is easier to navigate and shows the progression. Three
sister documents allow tier-specific examples (planWatch as Tier 3 reference,
`pass` as Tier 2 reference, etc.) without crowding.

Either way, the template should reference this survey for the data backing
each design decision, so when a future contributor reads "Tier 2 commands
typically have an `internal/finalization/` sub-area," they can verify it
against the actual lane inventory here.
