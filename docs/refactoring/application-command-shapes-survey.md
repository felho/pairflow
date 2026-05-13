# Application Command Shapes — Survey

Status: descriptive (factual inventory; companion to the template)
Last updated: 2026-05-13
Owner: architecture/runtime
Scope: factual inventory of `src/v11/application/<lane>/` directories that
backs the application-command-lane template
([`docs/refactoring/application-command-lane-template.md`](application-command-lane-template.md)).

This document **describes what exists**. The template prescribes; this
survey records the shape distribution that the template was written against.
When a lane refactor lands, update the corresponding inventory row here so
the data backing the template stays current.

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
| status | 3 | yes | 3 | yes | yes | — | structured (Tier 2; refactored 2026-05-12) |
| watchdog | 2 | yes | 4 | yes | yes | — | structured (Tier 2; refactored 2026-05-11) |
| metaReviewGate | 8 | yes | 9 | yes | — | — | structured (Tier 2; refactored 2026-05-11) |
| merge | 2 | yes | 5 | yes | yes | — | structured (Tier 2; refactored 2026-05-12) |
| commit | 4 | yes | 5 | yes | yes | — | structured (Tier 2; refactored 2026-05-11) |
| actorProtocol | 1 | yes | 3 | yes | — | — | structured non-bubble command (agent-emit dispatcher; Cluster B extracted 2026-05-11, Phase 2 internalized 2026-05-13) |
| restart | 3 | yes | 4 | yes | yes | — | structured (Tier 2; refactored 2026-05-11) |
| reconcile | 3 | yes | 3 | yes | yes | — | structured (Tier 2; refactored 2026-05-11) |
| start | 9 | yes | 3 | yes | yes | 4 | structured (Tier 2-ish) |
| metaReview | 3 | yes | 2 | yes | — | — | structured (Tier 2; refactored 2026-05-13) |
| reply | 2 | yes | 2 | no | yes | — | structured (Tier 2; refactored 2026-05-11) |
| attach | 6 | no | — | — | yes | 15 | unstructured |
| delete | 3 | yes | 6 | yes | yes | — | structured (Tier 2; refactored 2026-05-13) |
| extract | 2 | yes | 4 | yes | yes | — | structured (Tier 2; refactored 2026-05-13) |
| open | 6 | no | — | yes | yes | 14 | unstructured |
| list | 2 | yes | 3 | yes | yes | — | structured (Tier 2; refactored 2026-05-11) |
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

- **attach** — 6 top-level. Files: `attachBubble*` cluster +
  `attachCliCommand` (the legacy `emitAttachV11` wrapper has been renamed to
  `attachBubble.ts`).
- **open**, **resume**, **stop** — similar pattern.
- **gates**, **inbox** — 2 top-level only; below restructuring threshold.

These all have the standard naming (`*CommandApi`, `*CommandContract`,
`*CliCommand` etc.), just no `internal/` boundary yet.

`delete` was removed from this bucket on 2026-05-13. The lane now keeps only
`deleteBubble.ts`, `deleteBubbleContract.ts`, and `deleteCliCommand.ts` at root;
route resolution, dependency resolution, result construction, finalization,
remote support, and internal types live under `internal/`.

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

- (none — all five half-done lanes have been refactored; see below.)

Refactored from half-done to structured (Tier 2):

- **commit** (was 11 top-level + internal/pipeline; now 4 top-level + 5
  sub-areas — `error/`, `finalization/`, `git/`, `pipeline/`, `remote/`
  — plus a split-out cross-lane helper `remoteCommitContinuitySync.ts`
  at root).
- **list** (was 6 top-level + internal/projection; now 2 top-level + 3
  sub-areas — `context/`, `error/`, `projection/`).
- **merge** (was 12 top-level + internal/pipeline; now 2 top-level + 5
  sub-areas — `error/`, `flow/`, `pipeline/`, `preparation/`,
  `remote/`).
- **metaReview** (was 7 top-level + internal/submit; now 3 top-level + 2
  sub-areas — `error/`, `submit/`). The lane resolved into a single
  command (submit), so most intra-only helpers consolidated into the
  existing `internal/submit/` rather than fragmenting into new 1-file
  sub-areas; only error-boundary earned its own `internal/error/`
  following the commit/merge precedent.
- **metaReviewGate** (was 12 top-level + 32 flat internal/ files + 1
  existing sub-dir `currentRun/`; now 8 top-level + 9 sub-areas —
  `apply/`, `approve/`, `autoRework/`, `cleanRerun/`, `currentRun/`,
  `findings/`, `humanGate/`, `prompts/`, `state/`). The lane is the
  only multi-public-surface refactored case so far: five of the eight
  root-public files are pinned by a contract test
  (`metaReviewGatePublicApiBoundary.test.ts`) rather than by direct
  production consumers, and the refactor was a two-step move because
  the existing `internal/` was flat (~30 files at root) rather than
  the single-sub-area shape the prior four shared.

Refactored from unstructured (no `internal/`) to structured (Tier 2) — the
from-scratch cases:

- **restart** (was 10 top-level + no internal/; now 3 top-level + 4
  sub-areas — `cli/`, `error/`, `orchestration/`, `preparation/`).
  The first lane refactored from a fully flat starting state
  (no pre-existing `internal/` boundary). The naming-role table's
  defaults agreed with the import scan on every file, so no
  pre-cleanup commit was needed and the introduction collapsed
  into a per-sub-area move sequence. See the template's
  `application/restart/` worked example for the from-scratch
  procedure variant.
- **reconcile** (was 9 top-level + no internal/; now 3 top-level + 3
  sub-areas — `error/`, `orchestration/`, `preparation/`). The
  second from-scratch case; the first where a naming-role exception
  fired on a from-scratch path. The defaults/reconcile layer pinned
  `ReconcileRuntimeSessionsDefaultDependencies` (a type defined on the
  otherwise intra-only `reconcileCommandDependencyResolution.ts`),
  which would have leaked public → internal once DepRes moved under
  `internal/preparation/`. The merge precedent's type-relocation
  pre-cleanup applied — the type hoisted to the Contract before the
  sub-area introductions. No `internal/cli/` sub-area because
  reconcile's CLI options parser is inline in `reconcileCliCommand.ts`
  (no separate `*CommandCliOptions.ts` cluster like restart had).
  See the template's `application/reconcile/` worked example.
- **extract** (was 6 top-level + no internal/; now 2 top-level + 4
  sub-areas — `preparation/`, `selection/`, `transfer/`, `commit/`).
  Root-public files are the command entry (`extractBubble.ts`) and dependency
  contract (`extractCommandContract.ts`); the pipeline phases moved under
  `internal/` without behavior changes. This is the smallest from-scratch
  Tier 1-to-Tier 2 case: no production consumer imported the moved helpers,
  while one CLI test followed the precondition helper to its internal path.
- **watchdog** (was 11 top-level + no internal/; now 2 top-level + 4
  sub-areas — `error/`, `flow/`, `paneActivity/`, `pendingRework/`).
  The original survey row recorded 12 top-level files; the actual count
  at refactor time was 11, with no `watchdogCliCommand.ts` ever
  present in the lane. The third from-scratch case and the richest in
  exceptions to date: the lane fired four findings against the
  textbook from-scratch shape. (1) The `BubbleWatchdogError` class
  stayed in `shared/watchdog/` rather than moving into
  `internal/error/`, because the infrastructure
  `watchdogPaneActivityStore.ts` throws it via
  `createBubbleWatchdogError` — demoting the class to
  `application/watchdog/internal/error/` would have created an
  infrastructure → application/internal import (Module Depth Check
  violation). `internal/error/` therefore holds only the composition
  (`watchdogCommandRuntime.ts` re-export + thrower, plus
  normalization). (2) The Contract's optional dependency override
  was typed `sampleWatchdogPaneActivity?: typeof sampleWatchdogPaneActivity`,
  which pinned the root-public Contract to the implementation file
  through `import type`. The merge precedent's type-relocation
  pre-cleanup applied with the inverse direction (into the Contract,
  not out of it): `PaneActivitySampleResult` hoisted to Contract +
  named `SampleWatchdogPaneActivityFn` introduced + intra-lane
  consumers re-targeted. (3) No `watchdogCliCommand.ts` exists — the
  parser, renderer, and runner are inline in
  `src/cli/commands/bubble/watchdog.ts` — so the top-level closed at
  2 root-public files rather than the 3-file shape that restart and
  reconcile produced. (4) The cross-mirror-root test pre-cleanup from
  the metaReviewGate precedent re-fired:
  `tests/v11/shared/watchdog/watchdogPaneActivitySampler.test.ts`
  covered application-side behavior and moved to
  `tests/v11/application/watchdog/internal/paneActivity/...` in a
  dedicated commit before the source moves. The `flow/` sub-area
  bundles three files (`watchdogCommandFlow.ts`,
  `watchdogCommandRouting.ts`, `watchdogMetaReviewRouting.ts`)
  following the merge precedent ("one sub-area for the whole flow
  lifecycle: routing + flow primitives + meta-review specialization").
  See the template's `application/watchdog/` worked example.
- **status** (was 12 top-level + no internal/; now 3 top-level + 3
  sub-areas — `cli/`, `computation/`, `view/`). The fourth from-scratch
  case and the first where the lane closed with a pure re-export barrel
  at the lane root rather than a `*CliCommand.ts` that holds CLI parser
  or runner logic. Two pre-existing patterns extended cleanly: the
  reconcile-style minimal Contract hoist (`BubbleStatusInput` and
  `BubbleStatusDependencies` lifted out of `statusCommandApi.ts` into a
  new `statusCommandContract.ts`, with the `BubbleStatusError` class
  staying inline in Api because it is tiny, single-area, and tightly
  coupled to `asBubbleStatusError`); the merge-precedent rule "sub-area
  names reflect content, not file-name conventions" generalized to the
  mixed-role `statusCommandInternals.ts` (a barrel + transcript/inbox
  reader that placed under `internal/computation/` by primary content
  without splitting the file). Two new findings landed:
  *mixed-role barrel-and-impl placement* (when a `*Internals.ts`-style
  file is both a re-export aggregator and a focused implementation file,
  content-classify by the primary impl concern and accept the barrel
  re-exports as incidental; splitting the file is a separate cleanup,
  not part of the lane refactor); and *pure-barrel kept as
  Module-Depth-protective CLI surface* (when the lane root holds a
  small `*CliCommand.ts` that is **only** a re-export of sister CLI
  files, keep the barrel root-public rather than dropping it — the
  barrel is what prevents `src/cli/` consumers from reaching directly
  into `internal/cli/`, so it has structural protection value even when
  its content is purely re-exports). No new exception variant
  introduced; the eight-variant exception catalog from watchdog covers
  the status surface end-to-end. See the template's
  `application/status/` worked example.
- **reply** (was 7 top-level + `mutation/` lane-root submodule + no
  `internal/`; now 2 top-level + `mutation/` lane-root submodule
  retained + 2 sub-areas — `error/`, `preparation/`). The fifth
  from-scratch case and the first where the lane *did not* close at a
  pure `Api + Contract + internal/` shape: the pre-existing
  `mutation/` subdir at lane root stayed at lane root because the
  fitness `boundary` check pins legitimate mutation executors (files
  that write transcript or state directly) to
  `src/v11/application/<command>/mutation/**` as the canonical
  location. Demoting `mutation/` under `internal/mutation/` was
  attempted and fired the boundary check; the revert restored the
  fitness-pinned location and the intra-only sub-Contract
  (`replyMutationExecutionContract.ts`) sibling-joined the executor
  at `application/reply/mutation/` rather than at `internal/mutation/`.
  Two additional new findings landed alongside the mutation-pin
  discovery: *inline defaults composition in DepRes* — reply is the
  first lane refactored with no `defaults/reply/` directory; the
  defaults bundle lives inline in
  `replyCommandDependencyResolution.ts` and recomposes two
  cross-application-lane defaults files
  (`application/start/startCommandDependencyDefaults.js`,
  `application/pass/reviewerDeliveryDefaults.js`) through preserved
  relative-path imports rather than through a lane-local defaults
  directory; this is preserved-existing composition, not a
  recommended pattern for new lanes — and *cross-lane Contract
  signature-reference pin* — `application/resume/resumeCommandContract.ts`
  imports `EmitHumanReplyInput` and `EmitHumanReplyResult` from
  `replyCommandContract.ts` as real signature parameters
  (`ResumeBubbleResult = EmitHumanReplyResult`, plus
  `emitHumanReply` typed in `ResumeBubbleDependencies`), the
  cross-lane variant of the `list` lane's intra-lane
  signature-reference exception. The existing
  signature-reference rule covered the case without new template
  language; this is a re-fire across lane boundaries rather than a
  new exception type. See the template's `application/reply/` worked
  example.

Unstructured (no internal/ at all):

- (none — all formerly unstructured Tier 1 lanes are listed under their
  current refactored shape; the remaining 3–7-top-level lanes without
  `internal/` are `attach`, `delete`, and `open`, which are
  listed in their Tier 1 inventory rows above.)

### Tier 3 — Coordinator (lane-internal-but-named submodules)

A lane whose dependents (defaults, CLI, tests) need to import named submodules,
not just opaque internal helpers.

- **planWatch** — top: 2 (`planWatchLoop.ts`, `planWatchLoopContract.ts`).
  Lane-internal-but-named: `runner/` (10 files), `ledger/` (2), `linkedTriggerIndex/`
  (5). Strictly-internal: `internal/loop/` (5 files). The runner module is
  consumed by `defaults/planWatch/` for adapter wiring; the trigger index is
  consumed by linked-bubble discovery; the ledger is consumed by persistence.

So far the **only** Tier 3 lane in `application/`.

### Tier ?? — Non-bubble command

- **actorProtocol** — 1 top-level entry plus 3 internal sub-areas
  (post-2026-05-13 Phase 2). It remains a thematically coherent
  **agent-emit dispatcher**: `emitActorProtocol.ts` is the public
  entry (CLI-driven via `pairflow agent emit`), `internal/kernel/`
  executes dispatch plans, `internal/adapters/` holds the 4 cross-lane
  adapters that call into `pass`/`askHuman`/`converged`/`metaReview`
  command APIs, and `internal/dispatch/` owns the route matrix + policy
  check catalog.
  It is a CLI-driven command, but not a bubble-lifecycle command — the
  Tier 1/2/3 template's bubble-command-oriented procedure doesn't fit
  directly; left as Tier ?? until either the template generalizes to
  cover the agent-emit shape. A separate
  `shared/actorProtocol/` directory holds the canonical actor-emit
  framework types/policies (`ActorEmitContextSnapshot`,
  `assertActorEmitContextMatches`, etc.); it is shared-layer
  infrastructure consumed by the dispatcher and by `pass`/`converged`/
  `askHuman` lanes, and is not affected by this extraction.

  **What was extracted in the 2026-05-11 Cluster B move:** the lane
  originally held 10 files mixing two orthogonal clusters. Six files
  were a role/topology/prompt registry consumed primarily by
  `application/start/internal/prompts/` (the prompt-builder cluster)
  and by `application/metaReviewGate/metaReviewGatePaneBinding.ts` (a
  topology-slot lookup); they had no command-lane semantics. The
  extraction relocated those six files plus two collateral start
  helpers (pure prompt-line string-builders that the cluster depended
  on) to `shared/role/{registry,prompts}/`. The remaining four files
  are the Cluster A dispatcher above.

### Tier 2½ — Half-done with flat internal/ (no current cases)

This tier described `metaReviewGate` before its 2026-05-11 refactor:
13 top-level files with an `internal/` directory that was flat (32 `.ts`
files at `internal/` root and one existing sub-dir, `currentRun/`).
The post-refactor shape is recorded under "Refactored from half-done
to structured (Tier 2)" above. The two-step procedure that handles
flat-internal cases (introduce sub-areas, then demote intra-only
top-level files) is captured in the template's
[`metaReviewGate` worked example](application-command-lane-template.md#applicationmetareviewgate-refactored-2026-05-11-commits-fc3b96de--d2aa84d4).

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

`status` had been an outlier — seven `statusCli*` files (ANSI, table,
text, formatters, value-formatters) flat at top-level — and resolved
under the lane-private branch of this choice: the renderers and
related CLI sister files moved into `application/status/internal/cli/`
as part of the 2026-05-12 from-scratch Tier 2 refactor, with the
small `statusCliCommand.ts` pure re-export barrel kept root-public as
the canonical CLI surface (Module Depth Check protection — the
`src/cli/` consumer reaches the lane through the barrel, not into
`internal/cli/`). The alternative branch — moving CLI rendering into
`src/cli/commands/status/` as CLI-area-owned code — was considered
and deferred as a separate downstream concern; no production consumer
demanded it, since every renderer's only intra-lane import was the
public `BubbleStatusView` result type re-exported from
`statusCommandApi.ts`, and the renderers were already lane-internal
in production. The general lesson stands: the CLI rendering placement
axis is per-lane judgment between *lane-private CLI cluster* (status
took this branch) and *CLI-area-owned cluster*; the template should
not prescribe one location.

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

2. **actorProtocol was a mixed-cluster lane — resolved in two
   phases (2026-05-11, 2026-05-13).** The original ten-file directory bundled two
   unrelated concerns: a CLI-driven agent-emit dispatcher (the
   "Cluster A" entry + dispatcher + cross-lane adapters + route
   matrix) and a role/topology/prompt registry consumed by
   `application/start/` and `application/metaReviewGate/` (the
   "Cluster B"). The split-by-cluster extraction moved Cluster B
   (6 files) plus two collateral start prompt-line helpers
   (`startCommandWorkspacePromptLines.ts`,
   `startCommandResumePromptShared.ts`) to
   `shared/role/{registry,prompts}/`. Cluster A then stayed at
   `application/actorProtocol/` as a non-bubble command lane until
   Phase 2 moved its implementation under
   `internal/{adapters,dispatch,kernel}/`, leaving only
   `emitActorProtocol.ts` at the root. **New finding worth carrying
   forward:** *split-by-cluster extraction* — when a single
   `application/<lane>/` directory mixes a command-shape cluster
   with a non-command registry/data cluster, the non-command
   cluster can be extracted to `shared/<concern>/` independently
   of any later restructuring of the command cluster. Cascading
   dependency: if the extracted cluster imports utility helpers
   from a sibling application lane, those helpers may have to
   move alongside (the architecture-fitness `dependency` check
   forbids `shared/* → application/*` imports). The cascade
   ended at two pure-utility files in the reply case; it can be
   larger if the cluster depends on lane-specific logic, in
   which case re-evaluating the cluster's shared-eligibility is
   the right response.

3. **metaReviewGate's `internal/` was flat — and is no longer.** Before
   the 2026-05-11 refactor, `internal/` held 32 files at its root with
   only one sub-dir (`currentRun/`). The two-step refactor (introduce
   sub-areas, then demote intra-only top-level files into them) is
   documented as a worked example in the template.

   Closely related: **restart was the first from-scratch refactor.**
   The lane started with no `internal/` directory at all, and the
   role-naming pattern was clean enough that the four sub-areas
   (`cli/`, `error/`, `orchestration/`, `preparation/`) projected
   mechanically from the filename clusters and the import scan
   confirmed the projection without any naming-role exception
   firing. The from-scratch worked example is the canonical
   "no exception fired" reference; the prior five worked examples
   document each exception type.

   **reconcile was the second from-scratch refactor — and the
   first where a from-scratch path fired a naming-role exception.**
   The lane shape matched restart's almost exactly (every top-level
   file mapped to a role-table row), but the defaults/reconcile layer
   imported `ReconcileRuntimeSessionsDefaultDependencies` as a
   `satisfies` constraint from an otherwise intra-only DepRes file.
   The merge precedent's type-relocation pre-cleanup applied
   verbatim — the type hoisted to the Contract first, then the
   three sub-area introductions followed mechanically. This refutes
   the early reading of restart that "from-scratch means no
   exceptions"; the better generalization is "from-scratch means
   the public/internal boundary is decided fresh, and exceptions
   can still fire on the import-scan agreement step."
   reconcile also reinforced that `internal/cli/` is not mandatory
   in the from-scratch path: restart had a separate
   `restartCommandCliOptions.ts` parser file (one-file sub-area);
   reconcile keeps the parser inline in `reconcileCliCommand.ts`, so
   no `internal/cli/` exists.

   **watchdog was the third from-scratch refactor — and the
   richest in exceptions to date.** Four findings landed in one
   sequence: a *shared-resident error class* (the
   `BubbleWatchdogError` class stays in `shared/watchdog/` because
   infrastructure throws it via `createBubbleWatchdogError`, so
   `internal/error/` holds only the composition — a new exception
   type that inverts the commit/merge/restart/reconcile pattern),
   a *type-relocation via `typeof`* (the Contract's
   `sampleWatchdogPaneActivity?: typeof sampleWatchdogPaneActivity`
   override pinned the public Contract to an intra-only Sampler;
   the merge type-relocation precedent applied with the inverse
   direction — types hoisted *into* the Contract because the
   function-shape is part of the dependency port API), a *missing
   `*CliCommand.ts`* (no application-side CLI integration helper
   exists; the parser/renderer/runner are inline in
   `src/cli/commands/bubble/watchdog.ts`, so the top-level closes
   at 2 root-public files rather than the 3-file restart/reconcile
   shape — deepening the reconcile finding that
   `internal/cli/` is not fixed: nor is the root-public
   `*CliCommand.ts`), and a *cross-mirror-root test pre-cleanup
   re-fire* (the metaReviewGate precedent applied to one sampler
   test mis-mirrored under `tests/v11/shared/watchdog/`).
   The watchdog refactor also validated that `flow/` can host the
   merge-style bundle of routing + flow primitives + meta-review
   specialization (three files) when no separate orchestration
   file exists at top-level.

   **status was the fourth from-scratch refactor — and the first
   where the lane root closed with a pure re-export barrel as its
   CLI surface rather than a `*CliCommand.ts` holding parser or
   runner logic.** The lane started at twelve top-level files
   (computation/view cluster of five `statusCommand*` files plus a
   CLI cluster of seven `statusCli*` files) and no `internal/`. The
   import scan flagged two pre-existing patterns to apply rather
   than introduce as new exception types:
   (1) the reconcile-style minimal Contract hoist —
   `BubbleStatusInput` and `BubbleStatusDependencies` lifted out of
   the 13.6kB `statusCommandApi.ts` into a new
   `statusCommandContract.ts`, with consumers (intra-lane runner,
   `src/cli/commands/bubble/status.ts`, `src/index.ts` re-export,
   and the application-side `statusBubble.test.ts` type-import
   helper) retargeted at the Contract; the `BubbleStatusError`
   class and `asBubbleStatusError` thrower stayed inline in Api
   because the class is small, single-area, and tightly coupled to
   the thrower, so the four-sub-area extension (commit/merge/
   restart/reconcile pattern of a separate `internal/error/`) would
   have produced an honest 1-file sub-area without independent
   concern value;
   (2) the merge precedent's content-over-naming rule — the
   `statusCommandInternals.ts` file is half re-export barrel
   (gateState + pathView re-exports plus shared/status type
   passthrough) and half implementation (the transcript + inbox
   reader plus pending-question counter), so it placed under
   `internal/computation/` by its primary impl concern; splitting
   the barrel half from the impl half was deferred as a separate
   cleanup. **Two new findings** landed:
   *mixed-role barrel-and-impl placement* (the generalization of
   the `*Internals.ts` content rule: place by primary concern, do
   not split mixed-role files during the lane refactor); and
   *pure-barrel kept as Module-Depth-protective CLI surface* (the
   450-byte `statusCliCommand.ts` re-exports the four sister CLI
   symbols and contains no logic of its own — keeping it
   root-public is what prevents the `src/cli/` consumer from
   reaching into `internal/cli/`; dropping the barrel would have
   forced either path B (CLI-area extraction) or root-public sister
   files, both more invasive than warranted). Sub-area outcome:
   three sub-areas — `cli/` (six files: Options, Runner, Ansi,
   TableRenderer, TextRenderer, ValueFormatters), `computation/`
   (two files: Internals + GateState), `view/` (two files:
   ViewBuilder + PathView). No new exception type introduced; the
   eight-variant catalog from watchdog (signature-reference type,
   cross-lane split-extraction, type-relocation [out-of-Contract],
   type-relocation via `typeof` [into-Contract], phantom cross-lane
   consumer, contract-test path-pin, shared-resident error class,
   missing `*CliCommand.ts` goal-state shape) covers the status
   surface end-to-end. See the template's `application/status/`
   worked example.

   **reply was the fifth from-scratch refactor — and the first
   where the lane goal-state retained a lane-root submodule
   (`mutation/`) rather than closing at a pure `Api + Contract +
   internal/` shape.** The lane started at seven top-level `.ts`
   files plus a pre-existing one-file `mutation/` subdir at lane
   root (`mutation/replyMutationExecution.ts`), with the
   submodule's sub-Contract (`replyMutationExecutionContract.ts`)
   sitting as a sibling at the lane root. The initial goal-state
   hypothesis was to demote `mutation/` into `internal/mutation/`
   alongside the other intra-only sub-areas — following the
   half-done-style "everything intra-only collapses under
   `internal/`" intuition. The hypothesis broke against the
   fitness `boundary` check, which pins legitimate mutation
   executors (files that call `appendProtocolEnvelope` and
   `writeStateSnapshot` directly) to
   `src/v11/application/<command>/mutation/**` as the canonical
   location; the typed `mutation_executor` exception mechanism
   exists for non-conventional placements, not for aesthetic
   uniformity. The mutation cluster reverted to the lane-root
   `mutation/` subdir, and the sub-Contract sibling-joined the
   executor there (rather than at `internal/mutation/`), preserving
   the Q1 sibling decision at the fitness-pinned location. **One
   new finding** landed on the placement-rule axis (the same
   non-exception axis that status opened):
   *mutation submodule is fitness-pinned at `<command>/mutation/`*
   (when a lane contains a side-effect mutation executor — a file
   that writes transcript or state through the canonical ports —
   the executor and its intra-only sub-Contract stay under
   `application/<command>/mutation/` as a lane-root submodule;
   `internal/mutation/` is not the canonical location for such
   executors, and a typed `mutation_executor` exception is needed
   to support it elsewhere). **Two additional findings on existing
   axes** also landed: *inline defaults composition in DepRes*
   (reply is the first refactored lane with no `defaults/<lane>/`
   directory; the defaults bundle lives inline in
   `replyCommandDependencyResolution.ts` and recomposes
   cross-application-lane defaults from `application/start/` and
   `application/pass/` through preserved relative-path imports —
   this is preserved-existing composition, not a recommended
   pattern for new lanes; the application-defaults boundary check
   is unaffected because its scope is `application/* → defaults/*`,
   not `application/* → application/*`), and *cross-lane Contract
   signature-reference pin* (`application/resume/resumeCommandContract.ts`
   imports `EmitHumanReplyInput` and `EmitHumanReplyResult` from
   `replyCommandContract.ts` as real signature parameters: the
   cross-lane variant of the `list` lane's intra-lane
   signature-reference exception, requiring no new template
   language). Sub-area outcome: two sub-areas under `internal/`
   (`error/`, `preparation/`) plus the retained lane-root
   `mutation/` submodule housing the executor and its
   sub-Contract. No `*CliCommand.ts` at the lane root (re-fire of
   watchdog's missing-CliCommand finding); the CLI parser, help,
   and runner live entirely in `src/cli/commands/bubble/reply.ts`.
   See the template's `application/reply/` worked example.

4. **Half-done Tier 2 lanes shared a pattern.** At the time of the original
   survey, `commit`, `merge`, `metaReview`, and `list` all had a single
   internal sub-area (`pipeline/`, `pipeline/`, `submit/`, `projection/`).
   The boundary was introduced for a single concern, but other intra-lane
   concerns stayed top-level. Pattern: "first sub-area added, more never
   followed." All four — plus `metaReviewGate` with its flat-internal
   variant — have since been refactored to structured Tier 2 (see the
   inventory).

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

**E. Half-done lanes are the easiest first targets.** They already have
`internal/` precedent; the work is "promote more files into existing or
new sub-areas," not "introduce a boundary from scratch." `commit`,
`list`, `merge`, `metaReview`, and `metaReviewGate` validated this
assumption (now all structured). The `metaReviewGate` case also validated
the two-step variant that handles flat-internal cases (introduce
sub-areas, then demote remaining intra-only top-level files). The
`restart` case validated the from-scratch path separately: when the
role-naming pattern is consistent end-to-end and no exception fires
on the import scan (no signature-reference type, no cross-lane
split-extraction, no contract-test path-pin, no phantom cross-lane
consumer, no type-relocation), the from-scratch introduction
collapses to a per-sub-area move sequence with no pre-cleanup commit.

**F. Outliers must be excluded from the template.** `actorProtocol` is
not a bubble-lifecycle command; the Tier 1/2/3 template doesn't fit
directly. The 2026-05-11 Cluster B extraction (see anomaly #2)
removed the non-command parts of the lane, leaving a coherent
agent-emit dispatcher at `application/actorProtocol/`. The 2026-05-13
Phase 2 internalized that dispatcher behind
`internal/{adapters,dispatch,kernel}/`. It remains outside this
template's bubble-command procedure, but no longer has a flat
top-level implementation surface.

## Template status

The template landed as a single document with three tiers:
[`application-command-lane-template.md`](application-command-lane-template.md).
It references this survey for the data backing each design decision, so a
future contributor reading "Tier 2 commands typically have an
`internal/finalization/` sub-area" can verify the claim against the actual
lane inventory above.

Ten lane refactors have validated the template. Five followed the
half-done procedure; five (`restart`, `reconcile`, `watchdog`,
`status`, `reply`) validated the from-scratch procedure variant. In sequence:
`list` (commit `da12ed98`, single-commit move), `commit` (commits
`8d603cff`, `9b2b9755`, `2b5c6c71`, `2115f606`, four-commit sequence with
a public-surface split for `remoteCommitContinuitySync.ts`), `merge`
(commits `ea7f4970`, `01c0c61a`, `1d6c786d`, `c4aa58fd`, `dff96fcf`,
five-commit sequence with a type-relocation step that decoupled
`mergeCommandContract.ts` from `mergeCommandInputNormalization.ts` before
the file move), `metaReview` (commits `0f5a708a`, `72d51825`,
`c6cfcfef`, three-commit sequence preceded by a defaults-side dead
re-export cleanup that flipped a phantom cross-lane consumer into an
intra-lane file), `metaReviewGate` (commits `fc3b96de` →
`d2aa84d4`, nine-commit sequence covering a test-mirror pre-cleanup,
seven sub-area introductions (`findings/`, `apply/`, `autoRework/`,
`cleanRerun/`, `humanGate/`, `approve/`, `state/`) inside a previously
flat `internal/`, and a final 1-file `prompts/` sub-area demotion from
the lane root), `restart` (commits `cc83c803` → `69bf1cb2`,
four-sub-area introduction from a fully flat starting state with no
pre-cleanup commit because the naming-role defaults agreed with the
import scan on every top-level file), `reconcile` (commits
`a4729dc1` → `4c5a3325`, three-sub-area introduction from a fully
flat starting state with a merge-style type-relocation pre-cleanup
because the defaults layer pinned an intra-only DepRes type — the
first from-scratch refactor where a naming-role exception fired),
`watchdog` (commits `c4faf095` → `596f98f0`, four-sub-area
introduction from a fully flat starting state with two pre-cleanup
commits — a typeof-direction type-relocation into the Contract and a
cross-mirror-root sampler test relocation — and three new exception
findings: shared-resident error class, type-relocation via `typeof`
on an implementation function, and a goal-state without an
application-side `*CliCommand.ts`), `status` (commits
`5f509262` → `3b53cb52`, three-sub-area introduction
— `cli/`, `computation/`, `view/` — from a fully flat starting
state with one pre-cleanup commit applying the reconcile-style
minimal Contract hoist and no new exception variant; two new
template findings on the non-exception axis: mixed-role
barrel-and-impl placement and pure-barrel kept as
Module-Depth-protective CLI surface), and `reply` (commits
`f9eac48e` → this commit, two-sub-area introduction
— `error/`, `preparation/` — from a starting state of seven
top-level `.ts` files plus a pre-existing one-file `mutation/`
subdir at lane root; the goal-state retained the `mutation/`
submodule at lane root rather than demoting to
`internal/mutation/` because the fitness `boundary` check pins
side-effect mutation executors to
`application/<command>/mutation/**`; no pre-cleanup commit and no
new exception variant fired; three new template findings on the
placement-rule axis: mutation submodule fitness-pinned at
`<command>/mutation/`, inline defaults composition in DepRes with
no `defaults/<lane>/` directory, and cross-lane Contract
signature-reference pin as a re-fire of the `list` lane's
intra-lane signature-reference exception). The template's "Worked
examples" section captures the lessons learned; the inventory rows
above record the post-refactor state.
