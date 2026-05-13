# Application Command Lane Template

Status: draft
Last updated: 2026-05-11
Owner: architecture/runtime
Scope: `src/v11/application/<command>/` — the application layer of CLI-driven
command lanes (commit, watchdog, planWatch, etc.).

This document is a sister of:
- [`docs/architecture/refactoring-guidance.md`](../architecture/refactoring-guidance.md)
  — depth, classification, Module Depth Check.
- [`docs/refactoring/public-surface-cleanup-patterns.md`](public-surface-cleanup-patterns.md)
  — file-level cleanup patterns (camouflage warning class).
- [`docs/refactoring/application-command-shapes-survey.md`](application-command-shapes-survey.md)
  — the factual inventory of `application/` lane shapes that backs this
  template.

## Guiding principle

> Top-level files must be intentional interfaces. `internal/` files are
> implementation. A command lane is healthy when a caller can understand what
> to call without seeing the command's internal phase structure.

This template defines, for an `application/<command>/` lane, which interfaces
to expose, where to draw the public/internal boundary, and which tier of
structure fits the lane's size and dependency shape.

The template applies the Module Depth Check principle from
`refactoring-guidance.md`: a lane refactor is complete only when callers know
less, not when files are moved.

## Out of scope

**Bubble-lifecycle commands are this template's scope.** It covers
CLI-driven bubble-lifecycle command implementations: a runtime entry
point + dependency port contract + composition root, optionally with
multi-phase pipelines or coordinator submodules.

`application/actorProtocol/` is a CLI-driven command, but it is the
**agent-emit dispatcher** (`pairflow agent emit --kind ...`), not a
bubble-lifecycle command. Its 4-file shape (entry + dispatcher +
4 cross-lane adapters + route matrix) is structurally distinct from
the bubble-command Tier 1/2/3 lanes, so this template does not try
to fit it directly. Phase 2 (whether to introduce an `internal/`
structure for the dispatcher, or rename the lane to reflect its
real purpose) is a separate later decision.

**Cluster B extraction precedent (2026-05-11).** Before the
2026-05-11 split, `application/actorProtocol/` mixed the dispatcher
(Cluster A) with a role/topology/prompt registry consumed primarily
by `application/start/` and `application/metaReviewGate/`
(Cluster B). The role/topology/prompt cluster had no command-lane
semantics — it was statically-configured prompt-building data
plus helper functions. The split-by-cluster extraction moved
Cluster B (six files) plus two collateral start prompt-line
helpers to `shared/role/{registry,prompts}/`, leaving Cluster A
at `application/actorProtocol/`. **Lesson:** when a single
`application/<lane>/` directory mixes a command-shape cluster
with a non-command registry/data cluster, the non-command
cluster can be extracted to `shared/<concern>/` independently
of any later restructuring of the command cluster. The
architecture-fitness `dependency` check forbids
`shared/* → application/*` imports, so cascading dependency
moves may be required when the extracted cluster imports
helpers from a sibling application lane (in the reply-precedent
case, two pure-utility files moved alongside; if the cascade
is larger, re-evaluate the cluster's shared-eligibility before
proceeding).

## Common naming roles

Across surveyed command lanes, these filename patterns map to consistent roles.
When introducing a new file, prefer the convention; when reading an existing
lane, use the table to identify roles. `<X>` stands for the lane's command name
(`commit`, `watchdog`, etc.).

| Pattern | Role | Default visibility |
|---------|------|--------------------|
| `<X>CommandApi.ts` | Main command API implementation (canonical entry point for most lanes) | root-public |
| `<X>Bubble.ts` or `<X>.ts` | Canonical entry point when the API function name matches the lane (`attach`, `extract`, `kickoff`); equivalent to `<X>CommandApi.ts` | root-public |
| `<X>CommandContract.ts` | Dependency port + result types | root-public |
| `<X>CliCommand.ts` | Application-side CLI integration glue | root-public (when consumed by `src/cli/`) |
| `<X>CommandError.ts` | Error class definitions | root-public when cross-lane; internal when single-lane |
| `<X>CommandErrorNormalization.ts` | Error mapping/coercion | typically internal |
| `<X>CommandRuntime.ts` | Runtime composition wiring | typically internal |
| `<X>CommandOrchestration.ts` | Multi-step orchestration | internal |
| `run<X>Flow.ts` | Top-level flow function | internal (called from `*CommandApi`) |
| `<X>CommandInputNormalization.ts` | Input parsing/validation | internal |
| `<X>CommandDependencyResolution.ts` | Dependency resolution helper | internal |
| `<X>CommandFinalization.ts` | Cleanup/wrap-up step | internal (or `internal/finalization/`) |

Historically a thin `emit<X>V11.ts` wrapper added a V11 suffix on top of
`<X>CommandApi.ts`. That layer was removed in a codebase-wide V11 sweep —
consumers now import canonical names directly from `<X>CommandApi.ts` (or
`<X>Bubble.ts` / `emit<X>.ts` for Group C lanes where the wrapper had been
the implementation). New lanes should not reintroduce a V11-suffixed entry
point.

The "Default visibility" column is a starting point. Override based on the
import scan: a file consumed by `≥ 2` **production** lanes is root-public
regardless of default; a file consumed only intra-lane (in production) is
internal regardless of default. Test consumers are excluded from this
count — they are a verification signal, not a public-surface signal.

**Exception (effective contract via signature reference):** a type
referenced by a root-public function's signature — dependency interfaces,
input types, result types — is *effectively* part of the public contract
even with zero direct external imports. External callers must know the
shape to call the function (whether they import the type by name or
construct objects structurally). Keep such types root-public regardless
of the import-scan count. Concrete example from the `list` lane:
`ListReadModelDependencies` (in `listReadModelDependencies.ts`) has zero
direct external imports but appears in
`listBubbles(..., dependencies: ListReadModelDependencies)` — it stays
root-public.

**Exception (shared-resident error class):** when the lane's error
class has cross-area throw-callers — i.e. `infrastructure/<X>/...` or
`domain/<X>/...` constructs and throws it, not only the application
lane — keep the class itself in `shared/<lane>/` instead of moving it
into `application/<lane>/internal/error/`. Demoting the class would
force the cross-area caller to import from
`application/<lane>/internal/`, a Module Depth Check violation. The
lane's `internal/error/` then holds only the composition (re-export
of the shared class, thrower, normalization). Concrete example from
the `watchdog` lane: `BubbleWatchdogError` lives in
`shared/watchdog/watchdogCommandError.ts` because
`infrastructure/artifact/watchdog/watchdogPaneActivityStore.ts`
throws it via `createBubbleWatchdogError`. The
`*CommandError.ts` row default ("root-public when cross-lane;
internal when single-lane") is the within-application choice; this
exception governs the cross-area case that sits outside that axis.

The survey doc lists which lanes use each pattern.

## Visibility tiers

A command lane has up to three visibility levels for its files. The third
level is rare and reserved for true coordinators.

### Root-public

Files directly under `application/<command>/`. The canonical interface a
caller uses to reach the command. Re-exported from the project root
`src/index.ts` when the command is part of the public API surface.

Selection rule: a file is root-public when **production** consumers
genuinely demand it.

- **Production external consumer** (another lane, `defaults/`, `src/cli/`)
  → root-public signal (or lane-internal-but-named if the consumer is
  intra-area composition only; see next tier).
- **Test consumer via the public path** → verification signal, not a
  public-surface signal on its own. Tests follow whatever the lane
  exposes; if the lane changes its public path, tests update with it.
  Tests therefore confirm that the public surface works, but they don't
  demand it.

The naming-role table is a starting heuristic; the import scan is
authoritative.

### Lane-internal-but-named

A submodule directory directly under the lane root (e.g.,
`application/planWatch/runner/`) that is **not** re-exported from the project
root but **is** imported by lane co-tenants — primarily `defaults/`, the
lane's CLI integration, or another application lane that needs the named
submodule — using its named path. Tests can follow the same path, but a
test-only consumer is not enough to justify this tier; a production
composition consumer must exist.

Use this tier only when both conditions hold:

1. The submodule has multiple files that form a coherent named concern (e.g.,
   `runner/` covers agent runner bridging across multiple files).
2. Defaults or CLI in another area need to compose with the submodule by name
   (e.g., `defaults/<command>/` wires up the runner adapter).

If neither condition holds, the submodule belongs in `internal/`. Most
command lanes don't need this tier.

### Strictly-internal

Files under `application/<command>/internal/<sub-area>/`. Implementation that
no consumer outside the lane references. Sub-areas reflect the command's
phase structure or concern boundaries (e.g., `validation/`, `persistence/`,
`finalization/`).

## Tier selection

```text
Is the lane a CLI-driven command?
├─ NO → Out of scope. This template doesn't apply.
└─ YES
   │
   ├─ Top-level file count + structure?
   │
   ├─ 1–2 top-level, single concern, no internal/ needed → Tier 0 (trivial)
   │
   ├─ 3–7 top-level, one concern, no internal/ yet → Tier 1 (Small Command)
   │
   ├─ 7+ top-level OR multi-phase logic → Tier 2 (Pipeline Command)
   │
   └─ Defaults/CLI consume named submodules of the lane → Tier 3 (Coordinator)
```

Independently, ask: **does the lane already have `internal/<one-sub-area>/`
but the rest is still top-level?** If yes, follow the half-done procedure
below before applying a tier — half-done lanes already have a structural
precedent that informs the next sub-areas.

## Tier 0 — Trivial

**When:** 1–2 top-level files, single concern, no observable benefit from
further structuring.

**Structure:** files stay at lane root. No `internal/`. Stop here.

**Examples:** `metrics`, single-file lanes that orchestrate by delegating to
shared helpers.

## Tier 1 — Small Command

**When:** 3–7 top-level files, one or two concerns, no `internal/` yet, all
files are either entry/contract/CLI OR implementation helpers used only
intra-lane.

**Structure:**

```text
application/<command>/
├── <command>CommandApi.ts        ← root-public: main API (canonical entry)
├── <command>CommandContract.ts   ← root-public: dependency port
├── <command>CommandError.ts      ← root-public if exported by API/contract
│                                   (the error class is part of the
│                                   throw-catch contract); internal only when
│                                   neither the API nor the contract exposes it
│                                   AND the file has no cross-lane consumer
├── <command>CliCommand.ts        ← root-public: CLI integration (if CLI exists)
└── internal/
    ├── runtime/<command>CommandRuntime.ts    ← composition wiring
    ├── error/<command>CommandErrorNormalization.ts ← mapping/coercion only
    ├── input/<command>CommandInputNormalization.ts (if applicable)
    └── ...                                   ← other implementation helpers
```

For lanes whose entry function name matches the lane (`attach`, `extract`,
`kickoff`), the entry file is named `<command>Bubble.ts` or `<command>.ts`
instead of `<command>CommandApi.ts`. The role is the same.

The `internal/` sub-area names mirror role names from the naming table. A
small lane often only needs one or two sub-areas (`runtime/`, `error/`).

**Reference lane:** `application/delete/` before its 2026-05-13 refactor had
6 top-level files and no `internal/`. The implementation details have since
been moved under `internal/{dependencies,finalization,remote,result,route,types}/`;
root now contains only `deleteBubble.ts` (API), `deleteBubbleContract.ts`
(dependency contract), and `deleteCliCommand.ts` (CLI integration). This is the
target shape for Tier 1 lanes that outgrow a flat layout.

## Tier 2 — Pipeline Command

**When:** 7+ top-level files, OR the command has multi-phase logic (validation
→ action → finalization), OR multiple distinct concerns coexist (rendering +
command logic; persistence + routing; etc.).

**Structure:**

```text
application/<command>/
├── <command>CommandApi.ts        ← root-public: canonical entry
├── <command>CommandContract.ts   ← root-public
├── <command>CliCommand.ts        ← root-public (if CLI exists)
└── internal/
    ├── <phase-1>/                ← e.g., validation/
    ├── <phase-2>/                ← e.g., persistence/
    ├── <phase-3>/                ← e.g., finalization/
    ├── runtime/                  ← composition wiring
    ├── error/                    ← error mapping
    └── orchestration/            ← <command>CommandOrchestration.ts, run<X>Flow.ts
```

Sub-area names should reflect the command's *real* phases, not invented
abstract layers. Pick names from observed concerns: `validation`, `persistence`,
`routing`, `finalization`, `mutation`, `delivery`, `prompts`, `remote`,
`runtime`. New names are fine when the concern is genuinely lane-specific.

**Exception (mutation submodule pinned at lane root):** when a lane
contains a *side-effect mutation executor* — a file that writes
transcript or state directly through the canonical
`appendProtocolEnvelope` and `writeStateSnapshot` ports — the
executor and its intra-only sub-Contract belong under
`application/<command>/mutation/` as a *lane-root submodule*, NOT
under `internal/mutation/`. The fitness `boundary` check pins
legitimate mutation executors to this canonical location; placing
them under `internal/mutation/` requires a typed `mutation_executor`
exception in `tools/fitness/policy.json`, which exists for
deliberate non-conventional placements rather than for aesthetic
uniformity. The lane-root `mutation/` submodule coexists with the
lane's `internal/` directory; the goal-state is then
`Api + Contract + mutation/ + internal/<other-sub-areas>/` rather
than `Api + Contract + internal/<all-sub-areas>/`. Concrete example
from the `reply` lane: `mutation/replyMutationExecution.ts` writes
state and transcript directly, and its sub-Contract
`mutation/replyMutationExecutionContract.ts` sibling-joins it at
the same lane-root path. See the `application/reply/` worked
example for the discovery sequence and the revert that established
this rule.

**Reference lane:** `application/pass/`. Top-level: 4 files. Internal:
`autoConverge/`, `normalPass/`, `reviewerDelivery/`, `verification/` (38 files
total). Each internal sub-area corresponds to a real protocol phase, not an
abstract layer.

## Tier 3 — Coordinator

**When:** the lane has multiple submodules that defaults, CLI, or another
production lane need to compose by name; tests may follow that path. The
submodules are themselves named concerns (not just phase folders inside
`internal/`), and they're stable enough to be public within the lane.

**Structure:**

```text
application/<command>/
├── <command>Loop.ts              ← root-public: use case entry
├── <command>LoopContract.ts      ← root-public: dependency port
├── <submodule-a>/                ← lane-internal-but-named (e.g., runner/)
│   ├── <a-contract>.ts
│   ├── <a-impl>.ts
│   └── ...
├── <submodule-b>/                ← lane-internal-but-named (e.g., ledger/)
└── internal/
    └── <core>/                   ← strictly-internal core (e.g., loop/)
```

The lane-internal-but-named submodules are NOT re-exported from the project
root `index.ts`. Defaults imports them with explicit named paths
(`application/<command>/<submodule-a>/<file>.js`). The strictly-internal core
is not imported outside the lane.

**Reference lane:** `application/planWatch/`. Top-level: 2 files
(`planWatchLoop.ts`, `planWatchLoopContract.ts`). Lane-internal-but-named:
`runner/` (10 files), `ledger/` (2), `linkedTriggerIndex/` (5).
Strictly-internal: `internal/loop/` (5 files). The runner is composed by
`defaults/planWatch/`; the trigger index is consumed by linked-bubble
discovery in another lane; the ledger is consumed by persistence.

**Promotion criterion:** start at Tier 2. Promote to Tier 3 only when a
specific submodule's external composition need crosses the import-scan
threshold (defaults explicitly imports a named submodule, multiple sibling
files within the submodule are consumed together). Don't promote
speculatively.

## Applying the Template to Half-Done Lanes

A "half-done" lane has `internal/<one-sub-area>/` but the rest of the lane is
still top-level. The boundary was introduced for one concern, then never
extended. This is the most common case across `application/` and the
recommended starting point for template adoption.

Half-done lanes today (per the survey): none. `list`, `commit`, `merge`,
`metaReview`, and `metaReviewGate` were previously half-done and have
been refactored using this procedure; see "Worked examples" below. The
`metaReviewGate` case also validates the two-step variant that handles
flat-internal cases (introduce sub-areas, then demote remaining
intra-only top-level files). `restart` was the first **from-scratch**
refactor (no `internal/` directory at all at the start) and is also
documented in "Worked examples" below; it shows what the procedure
collapses to when no naming-role exception fires.

### Procedure

1. **Manifest, not action.** Before any move, build a per-file manifest of
   the lane's top-level files. For each file, record:
   - exported symbols
   - production consumers grouped by area (`application/<other>`,
     `domain/<X>`, `infrastructure/<X>`, `shared/<X>`, `defaults/<X>`,
     `src/cli/`, `ports/<X>`)
   - test consumers
   - classification: `external` / `intra-only` / `test-only` / `unused`
   - proposed visibility: root-public / `internal/<sub>/`

2. **Don't introduce new public surface.** If `internal/` exists, the
   public surface is already (mostly) decided. The half-done procedure
   demotes intra-only top-level files into existing or new `internal/`
   sub-areas; it does not add new root-public files.

3. **Sub-areas come from existing concerns, not abstract design.** If the
   lane already has `internal/pipeline/`, ask: do the remaining intra-only
   top-level files belong in `pipeline/`, or do they form another
   coherent concern that earns its own sub-area? Don't invent layers; group
   by what's actually there.

4. **One lane, one refactor sequence.** Half-done lanes are per-lane work.
   Do not batch multiple half-done lanes into a single commit or sequence —
   the sub-area decisions are lane-specific and don't share a template at the
   move level.

5. **Goal state for top-level.** After the work, top-level should contain
   only:
   - `<X>CommandApi.ts` (canonical API entry point) — or `<X>Bubble.ts` /
     `<X>.ts` for lanes whose entry function name matches the lane
   - `<X>CommandContract.ts` (dependency port)
   - `<X>CliCommand.ts` (only if a real `src/cli/` consumer exists)
   - any other genuinely external-consumed file backed by import-scan
     evidence

   Everything else moves to `internal/<sub-area>/`.

6. **Per-commit discipline.** A half-done lane refactor is typically 2–4
   commits:
   - (a) move intra-only top-level files into the appropriate sub-area
     directory (one sub-area per commit when the moves are large); the
     sub-area directory is created as a side effect of the moves, no
     placeholder file needed,
   - (b) update intra-lane imports to the new paths,
   - (c) clean up any empty sub-area directories that result from
     reshuffling (git does not track them, but `rmdir` keeps the working
     tree clean).

   Each commit should keep the lane in a typecheck-green state.

7. **Closeout: leftover hunt.** After the lane refactor lands, run the
   three-check leftover hunt described in
   [`public-surface-cleanup-patterns.md` → Post-Refactor Leftover Hunt](public-surface-cleanup-patterns.md#post-refactor-leftover-hunt):
   empty directories, pure pass-through files, orphaned files. Lane
   refactors commonly leave behind one or two of each.

### Worked examples

Ten lane refactors have applied this procedure end-to-end. Five
started from a half-done state and ended at structured Tier 2; five
(`restart`, `reconcile`, `watchdog`, `status`, `reply`) started from
fully flat (or near-flat) lanes and validated the from-scratch
procedure variant. The first five worked examples each document one
or more naming-role exceptions (signature-reference type, cross-lane
split-extraction, type-relocation, phantom cross-lane consumer,
contract-test path-pin); the `restart` worked example is the
canonical "no exception fired" reference for from-scratch lanes; the
`reconcile` worked example is the first case showing that
from-scratch lanes can *still* fire a naming-role exception
(specifically the merge-style type-relocation), so the from-scratch
variant is not a synonym for "no pre-cleanup needed"; the `watchdog`
worked example introduces three new exception variants on a single
from-scratch lane (shared-resident error class, type-relocation via
`typeof` on an implementation function, and a goal-state without an
application-side `*CliCommand.ts`), generalizing the from-scratch
path to: introduce the public/internal boundary fresh, project
sub-areas from naming clusters, fire any of the catalogued exception
precedents as needed, then run the per-sub-area moves. The `status`
worked example is the first from-scratch case where no new
*exception* variant was introduced — the eight-variant catalog from
watchdog covered the surface end-to-end — but two new findings
landed on the **non-exception axis**: *mixed-role barrel-and-impl
placement* (when a `*Internals.ts`-style file is both a re-export
aggregator and a focused implementation file, place by primary
content concern without splitting the file in the lane refactor)
and *pure-barrel kept as Module-Depth-protective CLI surface* (when
the lane root holds a small `*CliCommand.ts` that is **only** a
re-export of sister CLI files, keep the barrel root-public rather
than dropping it — the barrel is what prevents `src/cli/` consumers
from reaching into `internal/cli/`). The `reply` worked example is
the first from-scratch case where the lane's goal-state retained a
lane-root submodule rather than closing at a pure
`Api + Contract + internal/` shape, and the first to stress the
fitness-boundary axis directly: the lane began with a pre-existing
one-file `mutation/` subdir at the lane root (plus the
sub-Contract sitting as a sibling at the lane root), the initial
hypothesis was to demote `mutation/` to `internal/mutation/`
alongside the other intra-only sub-areas, and the fitness
`boundary` check rejected the demotion because legitimate mutation
executors (files that write transcript and state directly through
the canonical ports) are pinned to
`src/v11/application/<command>/mutation/**` as the canonical
location. The revert preserved the Q1 sibling decision for the
sub-Contract (sibling-joining the executor at the fitness-pinned
location rather than at `internal/mutation/`), and three new
findings landed on the placement-rule axis: *mutation submodule
fitness-pinned at `<command>/mutation/`* (the new placement rule
itself), *inline defaults composition in DepRes* (reply is the
first refactored lane with no `defaults/<lane>/` directory; the
defaults bundle lives inline in DepRes and recomposes
cross-application-lane defaults through preserved relative-path
imports — preserved-existing composition, not a recommended new
pattern), and *cross-lane Contract signature-reference pin* (the
`list` lane's intra-lane signature-reference exception re-fired in
its cross-lane variant: another application lane's Contract pins
the target Contract's types through real signature parameters,
requiring no new template language).

#### `application/list/` (refactored 2026-05-10, commit `da12ed98`)

Before: 6 top-level files, `internal/projection/` (4 files). The
import-scan manifest showed four top-level files with no production
external consumers (`listReadModelEntryBuilder.ts`,
`listRemotePaneActivityRead.ts`, `listReadModelContext.ts`,
`listReadModelErrors.ts`); only `listReadModelApi.ts` (canonical entry)
and `listReadModelDependencies.ts` (effective contract via signature
reference: `ListReadModelDependencies` appears in the `listBubbles`
parameter list) had cross-lane consumers.

After: 2 top-level files, `internal/{context,error,projection}/`.
`listReadModelEntryBuilder.ts` and `listRemotePaneActivityRead.ts`
joined `internal/projection/`; `listReadModelContext.ts` moved into
`internal/context/`; `listReadModelErrors.ts` moved into
`internal/error/` (the `BubbleListError` class remains publicly
reachable through a re-export from `listReadModelApi.ts`).

Single commit (move + import path updates). Manageable because the
four moves all targeted intra-lane consumers and no public-surface
extraction was required.

The list refactor also triggered the
[signature-reference exception](#common-naming-roles) wording in this
template: `ListReadModelDependencies` had zero direct external imports
but is part of the public function signature, so it stayed root-public
regardless of the import-scan count.

#### `application/commit/` (refactored 2026-05-11, commits `8d603cff` → `2115f606`)

Before: 11 top-level files, `internal/pipeline/` (1 file). Larger and
more interleaved than `list`: one top-level file
(`commitCommandFinalization.ts`) exported four functions, but only one
(`syncRemoteCommitContinuityArtifacts`) had a cross-lane production
consumer (the `merge` lane). The other three were intra-lane only.

After: 4 top-level files, `internal/{error,finalization,git,pipeline,remote}/`.
Top-level: `commitCommandApi.ts`, `commitCommandApiContract.ts`,
`commitCommandContract.ts`, and `remoteCommitContinuitySync.ts` (the
extracted cross-lane helper).

Four-commit sequence:

1. **Extract `syncRemoteCommitContinuityArtifacts` to a new root-public
   helper** (`remoteCommitContinuitySync.ts`). The merge-lane import was
   re-targeted at the new file. This isolated the cross-lane surface so
   the rest of `commitCommandFinalization.ts` could be demoted to
   `internal/finalization/` in a later commit without breaking the merge
   lane.
2. **Move git + remote helpers** (`commitCommandGitStep.ts`,
   `commitStagedFiles.ts` → `internal/git/`;
   `remoteCommitExecutionContext.ts` → `internal/remote/`).
3. **Move the error boundary** (`commitCommandError.ts`,
   `commitCommandErrorNormalization.ts`, `commitCommandRuntime.ts` →
   `internal/error/`). The `BubbleCommitError` class remained publicly
   reachable via the existing re-export chain through
   `commitCommandApi.ts`.
4. **Move the remaining finalization helpers** (`commitCommandFinalization.ts`,
   `commitCommandFinalizationMutation.ts` → `internal/finalization/`).

Two findings worth carrying forward to future half-done refactors:

- **Cross-lane split-extraction when one symbol stands out.** When a
  multi-export file at the lane root has exactly one cross-lane consumer
  for one of its symbols, extract that symbol to its own root-public file
  rather than holding the rest of the file at the root just for that one
  symbol. The remaining intra-only exports can then move into a focused
  `internal/<sub-area>/`. (Commit 1 above is the precedent.)
- **Sub-area names reflect content, not file-name conventions.**
  `commitCommandRuntime.ts` was named "Runtime" but its actual content
  was the lane's error boundary (re-export of `BubbleCommitError` plus
  `throwAsBubbleCommitError` driving error normalization). It went into
  `internal/error/` alongside the Error/ErrorNormalization files, not
  into a separate `internal/runtime/`. The naming-role table is a
  *starting* heuristic for visibility default; the sub-area placement
  follows the file's real concern as revealed by reading it.

#### `application/merge/` (refactored 2026-05-12, commits `ea7f4970` → `dff96fcf`)

Before: 12 top-level files, `internal/pipeline/` (4 files). Unlike
`commit`, no cross-lane split-extraction was required (every top-level
file other than `mergeCommandOrchestration.ts` and
`mergeCommandContract.ts` had zero external production consumers). Unlike
`list`, however, the lane had a type-dependency wrinkle:
`mergeCommandContract.ts` (root-public) imported
`NormalizedMergeBubbleInput` from `mergeCommandInputNormalization.ts` so
that it could declare `RunMergeCommandPipelineInput extends
NormalizedMergeBubbleInput`. The pipeline-input type had **zero**
external production consumers, so it was accidentally exposed from a
public file. Moving `InputNormalization` into `internal/preparation/`
without first relocating that type would have created a transient
public-to-internal import on the contract side.

After: 2 top-level files,
`internal/{error,flow,pipeline,preparation,remote}/`. Top-level:
`mergeCommandOrchestration.ts` (canonical entry — note this lane uses
the `*CommandOrchestration.ts` filename for its public entry instead of
`*CommandApi.ts`; the import scan, not the naming-role default, settled
the visibility) and `mergeCommandContract.ts`.

Five-commit sequence:

1. **Move merge error boundary** (`mergeCommandErrorRuntime.ts`,
   `mergeCommandErrorNormalization.ts`,
   `mergeCommandErrorClassification.ts` → `internal/error/`). Mirrors
   the commit lane: the three error-composition files share one
   sub-area named for their concern (error boundary), not for the
   `*Runtime.ts` file-name convention. `BubbleMergeError` remains
   publicly reachable through the orchestration's re-export.
2. **Move merge remote context**
   (`remoteMergeExecutionContext.ts` → `internal/remote/`).
3. **Move merge flow helpers** (`mergeFlowContext.ts`,
   `mergeFlowFinalization.ts`, `mergeRoutingEligibility.ts`,
   `mergeResultMapping.ts` → `internal/flow/`). One sub-area for the
   whole flow lifecycle (routing eligibility → execution context →
   finalization → result mapping). No 1-file sub-areas were created;
   `mergeResultMapping.ts` joined `flow/` rather than getting its own
   `result/` because the result shape co-varies with the flow output.
4. **Relocate `RunMergeCommandPipelineInput` out of public contract**
   (intra-file type move from `mergeCommandContract.ts` to
   `mergeCommandInputNormalization.ts`, both still at lane root). No
   file moves; seven consumers updated to import the type from
   `InputNormalization` instead of `contract`. After this commit, the
   contract no longer depends on InputNormalization.
5. **Move merge preparation helpers**
   (`mergeCommandInputNormalization.ts`,
   `mergeCommandDependencyResolution.ts` → `internal/preparation/`).
   With the type-dependency severed in commit 4, this move introduces
   no public-to-internal import.

One additional finding worth carrying forward:

- **Type-relocation before file move when public files leak intra-lane
  types.** If a root-public file imports a type from an
  intra-lane-only file (and the imported type itself has no external
  production consumer), do not move the intra-lane file into
  `internal/` first — that would create a transient public-to-internal
  import. Instead, in a preceding commit, relocate the type into the
  intra-lane file it conceptually belongs to (so the public file no
  longer needs to import it), then do the file move. The two-commit
  split also makes the type-location decision reviewable in isolation
  from the mechanical file move.

#### `application/metaReview/` (refactored 2026-05-13, commits `0f5a708a` → `c6cfcfef`)

Before: 7 top-level files, `internal/submit/` (9 files). Smaller than
the prior three worked examples, but the manifest exposed a wrinkle
absent from `commit` and `merge`: `metaReviewCommandErrorMapping.ts`
appeared to have a cross-lane consumer (`defaults/metaReview/metaReviewApi.ts`
imported and re-exported `toMetaReviewError`), which would have pinned
the file at the lane root. The defaults re-export was unused
downstream — a *phantom* cross-lane signal, not a real one. Promoting
the file would have been blocked by the appearance of an external
consumer that didn't actually exist.

After: 3 top-level files, `internal/{error,submit}/`. Top-level:
`metaReviewCommandSubmitRuntime.ts` (canonical submit entry —
consumed by `defaults/metaReview` and `application/actorProtocol`),
`metaReviewCliOptionValueReader.ts` (CLI input glue — consumed by
`src/cli/commands/agent/emit.ts`), and `metaReviewSubmitRenderers.ts`
(CLI output glue — consumed by `src/cli/index.ts`).

Three-commit sequence:

1. **Drop the phantom cross-lane consumer**
   (`export { toMetaReviewError };` and its companion import block in
   `defaults/metaReview/metaReviewApi.ts`). No production caller read
   the re-export; removing it reclassified
   `metaReviewCommandErrorMapping.ts` as intra-lane-only on the
   import scan, clearing the path to demote it.
2. **Move meta-review error mapping**
   (`metaReviewCommandErrorMapping.ts` → `internal/error/`). The
   accompanying test moved alongside the source (from
   `tests/.../internal/submit/` to `tests/.../internal/error/`) to keep
   tests mirroring src layout — an internal-test convention that the
   merge precedent did not exercise because its error tests already
   lived at `tests/v11/application/merge/`, not under a sub-area
   directory.
3. **Move meta-review submit internals**
   (`metaReviewCliValueParsers.ts`,
   `metaReviewSubmitRenderersHelpers.ts`,
   `metaReviewRuntimeParity.ts` → `internal/submit/`). The three
   helpers collapsed into the existing `submit/` sub-area in a single
   commit rather than fragmenting into `cli/`, `rendering/`, and
   `parity/` 1-file enclaves. Since the lane is a single-command
   lane (submit), nearly all intra-only helpers are submit-adjacent;
   keeping them in one sub-area honors the merge precedent's
   "no 1-file sub-areas" rule.

Two findings worth carrying forward:

- **Phantom cross-lane consumer via dead re-export.** Before treating a
  defaults-side import as a real cross-lane signal, follow the chain:
  if defaults imports a symbol *only* to re-export it under the same
  name (no defaults-side caller, no downstream import of the
  re-export), the cross-lane signal is phantom. Eliminate the dead
  re-export in a preceding commit; the manifest then reclassifies the
  underlying file as intra-only and the demotion becomes mechanical.
  This is the inverse of the `commit` lane's cross-lane
  split-extraction pattern (where one symbol genuinely needed to stay
  cross-lane), so the same import-scan question lands two opposite
  decisions depending on whether downstream consumers actually use the
  exposed surface.
- **Single-command lanes collapse internals under one sub-area.** When
  a lane has only one command (here: submit), the cleanest internal
  layout keeps the existing phase sub-area (`internal/submit/`) and
  promotes nearly all intra-only helpers into it. Standalone
  sub-areas like `internal/cli/` or `internal/rendering/` would have
  produced 1-file enclaves without independent concern boundaries.
  The `internal/error/` sub-area remains a separate concern,
  consistent with the commit/merge precedents; everything else fits
  inside `submit/`. Goal: sub-area names should reflect *concerns*
  (`error/`, `pipeline/`, `flow/`), not file roles (`cli/`,
  `rendering/`), unless multiple files share the role.

#### `application/metaReviewGate/` (refactored 2026-05-11, commits `fc3b96de` → `d2aa84d4`)

Structurally different from the prior four worked examples. The lane
is a **multi-public-surface** case (eight root-public files, not the
usual two or three), its `internal/` was **flat with ~30 files at the
root** (one existing sub-dir, `currentRun/`) rather than the
single-sub-area half-done shape, and the refactor was a **two-step
move**: introduce new sub-areas inside `internal/`, then demote the
few remaining intra-only top-level files into them. This worked
example is intentionally laid out differently from the prior four to
reflect those differences.

Before: 12 top-level files, `internal/` with 32 flat `.ts` files + 1
existing sub-dir (`currentRun/`, 6 files). The lane covers a routing
decision point at convergence time (apply gate → finalize current
run → auxiliary findings/threshold/reviewer-snapshot queries), so
the public surface is wider than a single-command lane.

After: 8 top-level root-public files + `internal/{apply,approve,autoRework,cleanRerun,currentRun,findings,humanGate,prompts,state}/`
(nine sub-areas). The nine sub-areas mirror the lane's real concerns:
`apply/` (convergence-time gate application), `approve/` (approve-path
validation), `autoRework/` (auto-rework dispatch), `cleanRerun/`
(clean-rerun route), `currentRun/` (post-convergence finalization
pipeline — the pre-existing sub-area), `findings/` (findings metadata +
validation + parity), `humanGate/` (human-gate route persistence +
approval-envelope helpers), `prompts/` (1-file prompt-text builder),
`state/` (state-machine helpers + cross-cluster gate-operation
preconditions).

Ten-commit sequence:

1. **Test-relocation pre-cleanup** (`fc3b96de`). Six tests under
   `tests/v11/shared/metaReviewGate/` covered behavior implemented in
   `application/metaReviewGate/`, so the mirror root was wrong. Move
   them under `tests/v11/application/metaReviewGate/[/internal/]/`
   before any src moves to keep later src-move commits focused on
   production layout rather than mixing in cross-root test relocations.
2. **`findings/`** (`7188e934`). Two existing flat
   `metaReviewGateFindingsValidation*` files + three demoted intra-only
   top-level files (`metaReviewGateFindingsArtifactReadRetry`,
   `metaReviewGateFindingsMetadata`, `metaReviewGateFindingsParityHelpers`)
   merge into one sub-area. `metaReviewGateFindingsParityApi` stays
   root-public because the contract test pins it (see finding below).
3. **`apply/`** (`2bb0bde4`). Seven `metaReviewGateApply*` files. Apex
   `metaReviewGateApply.ts` is consumed by the root-public
   `metaReviewGateCommandApi`.
4. **`autoRework/`** (`0b97bf26`). Five `metaReviewGateAutoRework*`
   files; apex consumed by `currentRun/finalizationPipeline` and
   `currentRun/approveRouting`.
5. **`cleanRerun/`** (`ce47bc42`). Six `metaReviewGateCleanRerun*`
   files, composed by `currentRun/cleanRerun.ts` (five of six imported
   across the cluster boundary).
6. **`humanGate/`** (`0cfe689b`). Four `metaReviewGateHumanGate*` files
   plus two approval-envelope helpers (`approvalRequestEnvelope.ts`,
   `metaReviewGateApprovalReviewerConsistency.ts`) that the persistence
   chain pulls in. Six files, one sub-area.
7. **`approve/`** (`c9822f1a`). Three `metaReviewApproveValidation*`
   files; apex consumed only by `currentRun/approveRouting`.
8. **`state/`** (`eab14434`). Two state-machine helpers
   (`metaReviewGateStateHelpers`, `metaReviewGateStateStaging`) plus
   the cross-cluster `metaReviewGateShared` (precondition + lock-path
   helpers) — see "Cross-cluster shared util" finding below.
9. **`prompts/`** (`d2aa84d4`). One file (`metaReviewGatePrompt.ts`)
   demoted from lane root; a deliberate 1-file sub-area. See
   "Deliberate 1-file sub-area" finding below.
10. **Closeout (this commit)**. Survey + template doc-sync,
    leftover-hunt confirmation (no empty directories, no orphan
    references).

Findings worth carrying forward:

- **Contract-test-asserted root-public boundary.** Of the eight
  root-public top-level files, five are pinned by
  `tests/contracts/v11/metaReviewGatePublicApiBoundary.test.ts`. The
  test imports symbols by exact path from `metaReviewGateCommandApi`,
  `metaReviewGateCurrentRunApi`, `metaReviewGateFindingsParityApi`,
  `metaReviewGateReviewerSnapshotApi`, and
  `metaReviewGateThresholdAuthorityApi`, and asserts that the
  shared barrel (`shared/metaReviewGate/index.ts`) does *not*
  re-export them. The test path itself is the public-API contract;
  demoting any of these files would break the boundary test even if
  no production consumer existed. This is a **distinct pattern**
  from the `list` lane's "signature-reference exception" (where a
  type is part of a function signature) — here a boundary contract
  test directly defines what the public surface is. The remaining
  three root-public files (`Notify`, `PaneBinding`,
  `RuntimeCapabilityResolution`) stay root-public on standard
  production-consumer grounds (`defaults/` and `src/cli/`).
- **Two-step move because `internal/` was flat.** Unlike the prior
  four half-done lanes, `metaReviewGate`'s `internal/` already had
  ~30 files at its root with one sub-dir (`currentRun/`). The
  refactor introduces *new* sub-areas inside `internal/` *and*
  demotes intra-only top-level files into them. The flat-internal
  hypothesis (six naming clusters from the survey: `Apply*`,
  `AutoRework*`, `CleanRerun*`, `Findings*`, `HumanGate*`,
  `Approve*`) survived import-scan validation with two additions: the
  two approval-envelope helpers fold into `humanGate/` (their sole
  consumer chain), and the three state-related files plus
  `metaReviewGateShared.ts` fold into `state/`.
- **Cross-cluster shared util has a home.** `metaReviewGateShared.ts`
  has four consumers across three sibling sub-areas plus
  `currentRun/`. A 1-file `internal/support/` would have been a
  generic enclave; bundling it with the state-machine helpers
  (`StateHelpers` + `StateStaging`) into `state/` keeps the
  sub-area count contained. The placement is borderline
  (`buildGateLockPath` is path-related, not state-related), but the
  trade-off favours fewer named sub-areas over more, and both
  Shared helpers express gate-operation preconditions.
- **Deliberate 1-file sub-area when nothing else fits.** `prompts/`
  has exactly one file (`metaReviewGatePrompt.ts`). The
  merge/metaReview precedents warn against 1-file enclaves, but
  those warnings are context-specific — they apply when a natural
  larger host exists. Here, the prompt-text composition concern
  doesn't fit any of the other eight sub-areas, and
  `metaReviewGatePrompt` doesn't itself form a natural pair with
  anything else. A `prompts/` 1-file sub-area is the honest
  single-concern home; the merge/metaReview "no 1-file" rule
  remains correct as a heuristic against fragmentation, not as an
  absolute prohibition.
- **Cross-mirror-root test pre-cleanup.** Six tests under
  `tests/v11/shared/metaReviewGate/` actually covered
  application-side behavior. They were moved to
  `tests/v11/application/metaReviewGate/[/internal/]/` in a
  dedicated pre-cleanup commit before any src moves, so the later
  src moves don't mix two orthogonal concerns (test mirror
  correction vs production layout). This is heavier than the
  `metaReview` precedent's same-sub-area test move because it
  crosses the `shared/ → application/` mirror root, not just a
  sister sub-area boundary.
- **Tangential test-consumer discovery.** A non-mirror test
  (`tests/core/bubble/approvalRequestEnvelope.test.ts`) imported
  `approvalRequestEnvelope.ts` by its old `internal/` path; the
  `humanGate/` move broke typecheck because the original
  consumer-scan filter excluded `*.test.ts` filenames from the
  result, masking this dependency. Lesson: when a sub-area move
  re-targets a file, scan `tests/` without filename-based exclusion
  to surface non-mirror test consumers — tests outside the lane's
  own mirror tree can still import lane internals directly.

#### `application/restart/` (refactored 2026-05-11, commits `cc83c803` → `69bf1cb2`)

**This is the first from-scratch Tier 2 case.** Unlike the prior five
worked examples, the lane began with **no `internal/` directory at
all** — ten top-level files flat at the lane root, with no pre-existing
boundary to extend. The half-done procedure above does not directly
cover this case; restart validates that with a clean role-naming
pattern, the sub-area introduction can be projected mechanically from
filename clusters and confirmed by the import scan, with no
pre-cleanup commit and no naming-role exception.

Worked-example structure note: this entry is intentionally laid out
differently from the five half-done cases. It opens with a
**goal-state introduction** (the part the half-done procedure skips,
because half-done lanes inherit the public/internal boundary
decision) and treats the per-sub-area moves as a mechanical
postscript.

Before: 10 top-level files, no `internal/`. The lane uses every
standard naming role from the table in
[Common naming roles](#common-naming-roles): `*CommandApi`,
`*CommandContract`, `*CliCommand`, `*CommandCliOptions`,
`*CommandRuntime`, `*CommandErrorNormalization`, `*CommandOrchestration`,
`*CommandInputNormalization`, `*CommandDependencyResolution`,
`run<X>Flow`. Every file maps to a row in the table.

After: 3 top-level root-public files plus
`internal/{cli,error,orchestration,preparation}/` (four sub-areas,
seven internal files). Top-level: `restartCommandApi.ts` (canonical
entry), `restartCommandContract.ts` (dependency port +
`RestartBubble{Input,Result,Dependencies}` types),
`restartCliCommand.ts` (CLI integration, consumed by
`src/cli/commands/bubble/restart.ts`).

**Goal-state introduction (the from-scratch step the half-done
procedure skips):**

- **Public surface decision.** With no pre-existing `internal/`,
  the public/internal boundary is decided fresh. The naming-role
  table defaults plus the import scan agreed on three root-public
  files (`Api`, `Contract`, `CliCommand`). No naming-role exception
  fired: no signature-reference type stuck at root (cf. `list`),
  no cross-lane split-extraction (cf. `commit`), no contract-test
  path-pin (cf. `metaReviewGate`), no phantom cross-lane consumer
  (cf. `metaReview`), no type-relocation pre-cleanup (cf. `merge`).
  The agreement of default-and-scan is the from-scratch signal that
  the lane is a textbook Tier 2 — when the two diverge, you have
  one of the five documented exceptions and need a precedent-driven
  decision plus a pre-cleanup commit.
- **Sub-area projection from naming clusters.** The seven intra-only
  files clustered cleanly by filename: `Runtime` + `ErrorNormalization`
  → `error/`; `Orchestration` + `runRestartFlow` → `orchestration/`;
  `InputNormalization` + `DependencyResolution` → `preparation/`
  (merge precedent reuses this exact name for the same Input/Dependency
  pair); `CliOptions` → `cli/` (deliberate one-file sub-area). No
  file content surprised the cluster mapping — but content was still
  read first (`*Runtime.ts` is error-composition by content, as the
  commit/merge precedents already documented; restart matched).

Four-sub-area move sequence (one commit per sub-area), then doc-sync:

1. **`internal/error/`** (`cc83c803`). Two files
   (`restartCommandRuntime.ts`, `restartCommandErrorNormalization.ts`).
   Runtime holds the `RestartBubbleError` class plus
   `createRestartBubbleError` and `throwAsRestartBubbleError`;
   consistent with commit/merge, `*Runtime.ts` is the lane's error
   boundary by content. `RestartBubbleError` remains publicly
   reachable via re-export from `restartCommandApi.ts`. Cross-lane
   `errorBoundaryContextSchema.test.ts` got a path-only update
   (no test relocation; it covers multiple lanes' error classes).
2. **`internal/orchestration/`** (`ea2d34a9`). Two files
   (`restartCommandOrchestration.ts`, `runRestartFlow.ts`). The
   API re-export chain stays intact; only the import path inside
   `restartCommandApi.ts` changed.
3. **`internal/preparation/`** (`8fd01058`). Two files
   (`restartCommandInputNormalization.ts`,
   `restartCommandDependencyResolution.ts`). Sub-area name follows
   the merge precedent.
4. **`internal/cli/`** (`69bf1cb2`). One file
   (`restartCommandCliOptions.ts`). The sole production consumer is
   `restartCliCommand.ts` (re-exports the parser and help-text
   functions). A deliberate one-file sub-area following the
   metaReviewGate `prompts/` precedent: the parser concern is
   distinct from input normalization (parses argv into command
   options vs. validates the command's `RestartBubbleInput`
   contract) and from CLI integration glue.
5. **Closeout (this commit).** Survey + template doc-sync; leftover
   hunt confirmed (no empty directories, no orphan references).

Findings worth carrying forward:

- **From-scratch is not a blocker; clean role-naming is the
  prerequisite.** The half-done procedure exists because the
  public/internal boundary was already decided at the start.
  From-scratch lanes need that boundary introduced first, but when
  the role-naming pattern is consistent (every file matches a row
  in the naming-role table) and the import scan agrees with the
  default visibility column, the introduction is mechanical.
  Restart hit zero exceptions, so the procedure collapsed into a
  per-sub-area move sequence with no pre-cleanup commit.
- **Default-and-scan agreement as from-scratch signal.** When the
  naming-role table's default visibility column and the import
  scan agree on every top-level file, the lane is a textbook
  Tier 2 case and the prior five worked examples' exceptions do
  not need to be invoked. When they disagree, you need one of the
  documented precedent decisions and a pre-cleanup commit. Restart
  is the canonical "no exception fired" reference; the prior five
  worked examples cover each exception type.
- **`*Runtime.ts` content rule generalizes beyond half-done.** The
  commit/merge precedent that `*Runtime.ts` is error-composition by
  content (and belongs in `internal/error/`, not `internal/runtime/`)
  reproduced exactly in restart — the file-name convention misleads
  in the same way regardless of whether the lane was half-done or
  from-scratch. Read the file first; honor the content over the
  name. Renaming `*Runtime.ts` → something error-named is a
  separate convention-cleanup decision, not part of the lane
  refactor.
- **Single-command lane vs. multi-command lane: from-scratch
  doesn't change the sub-area count.** Restart is a single-command
  lane (like metaReview), but unlike metaReview's collapse into the
  existing `submit/` sub-area, restart's sub-areas (`cli/`, `error/`,
  `orchestration/`, `preparation/`) all stand on their own naming
  clusters. The metaReview precedent ("collapse intra-only helpers
  under the existing phase sub-area when no other concern boundary
  exists") did not apply because restart's clusters are mutually
  exclusive by content (CLI parsing vs. domain-input normalization
  vs. dependency wiring vs. orchestration), so each cluster is its
  own honest sub-area concern.

#### `application/reconcile/` (refactored 2026-05-11, commits `a4729dc1` → this commit)

**This is the second from-scratch Tier 2 case** — and the first
where a from-scratch path fired a naming-role exception. The lane
shape at the start matched restart's almost exactly (every top-level
file mapped to a role-table row), but unlike restart the import scan
diverged from the naming-role default on one file: the
`defaults/reconcile` layer pinned
`ReconcileRuntimeSessionsDefaultDependencies` (a type defined inside
the otherwise intra-only `reconcileCommandDependencyResolution.ts`)
as a `satisfies` constraint over its default bundle. Demoting DepRes
into `internal/preparation/` without addressing the type first would
have made `defaults/reconcile` import from an internal path. The
merge precedent's type-relocation pre-cleanup applied verbatim.

Worked-example structure note: this entry follows the restart layout
(goal-state introduction up front, per-sub-area moves as a mechanical
postscript) and explicitly contrasts with restart at the exception
step, so the two from-scratch references read as a pair rather than
as two independent cases.

Before: 9 top-level files, no `internal/`. Naming-role coverage:
`*CommandApi`, `*CommandContract`, `*CliCommand`, `*CommandRuntime`
(error class by content, despite the filename), `*CommandErrorNormalization`,
`*CommandOrchestration`, `run<X>Flow`, `*CommandInputNormalization`,
`*CommandDependencyResolution`. Every file mapped to a row in
[Common naming roles](#common-naming-roles); no `*CommandCliOptions`
file exists, so no separate `cli/` cluster materializes (the parser
is inline in `reconcileCliCommand.ts` via `parseArgs`).

After: 3 top-level root-public files plus
`internal/{error,orchestration,preparation}/` (three sub-areas, six
internal files). Top-level: `reconcileCommandApi.ts` (canonical
entry), `reconcileCommandContract.ts` (dependency port + result
types + the hoisted `ReconcileRuntimeSessionsDefaultDependencies`),
`reconcileCliCommand.ts` (CLI integration, consumed by
`src/cli/commands/bubble/reconcile.ts`).

**Goal-state introduction (the from-scratch step the half-done
procedure skips, with exception handling):**

- **Public surface decision.** With no pre-existing `internal/`,
  the public/internal boundary is decided fresh. The naming-role
  table defaults proposed three root-public files (`Api`, `Contract`,
  `CliCommand`) and six intra-only candidates; the import scan
  confirmed the three root-public choices and the six intra-only
  classifications. **One exception fired** on the intra-only side:
  `reconcileCommandDependencyResolution.ts` exports a public-side
  type (`ReconcileRuntimeSessionsDefaultDependencies`) that
  `defaults/reconcile` pins. The merge precedent's type-relocation
  applied — hoist the type into the Contract before the file move
  so the public defaults stay against the public Contract.
  This is the first from-scratch refactor where a naming-role
  exception fired; restart's "default-and-scan agreement on every
  file" was a sufficient condition for the textbook from-scratch
  collapse, not a necessary feature of from-scratch lanes.
- **Sub-area projection from naming clusters.** The six intra-only
  files clustered cleanly: `Runtime` + `ErrorNormalization` →
  `error/` (commit/merge/restart `*Runtime.ts` content rule —
  StartupReconcilerError class lives in `Runtime.ts`);
  `Orchestration` + `runReconcileFlow` → `orchestration/` (same
  pair as restart); `InputNormalization` + `DependencyResolution` →
  `preparation/` (same pair name as merge and restart). No `cli/`
  sub-area appears because the `*CommandCliOptions.ts` filename
  that restart had does not exist in reconcile (the parseArgs
  parser is inline in `reconcileCliCommand.ts`). The from-scratch
  variant therefore yields three or four sub-areas depending on
  whether the CLI parser was extracted from `*CliCommand.ts`,
  not a fixed pattern.

Five-commit sequence (one pre-cleanup + three sub-area moves +
doc-sync):

1. **Type-relocation pre-cleanup** (`a4729dc1`).
   `ReconcileRuntimeSessionsDefaultDependencies` hoisted from
   `reconcileCommandDependencyResolution.ts` into
   `reconcileCommandContract.ts`. Consumers updated: Api, DepRes
   (now imports the type from Contract instead of owning it),
   `defaults/reconcile/reconcileCommandDefaults.ts`, and the
   DepRes mirror test. Single canonical public definition lives
   on Contract; DepRes no longer carries the duplicate. Same
   merge-precedent split: the type-location decision is
   reviewable in isolation from the mechanical sub-area moves.
2. **`internal/error/`** (`e0e18ff9`). Two files
   (`reconcileCommandRuntime.ts` owning `StartupReconcilerError` +
   creator + thrower, `reconcileCommandErrorNormalization.ts`).
   Same `*Runtime.ts`-is-actually-error-composition content rule
   as commit, merge, and restart. The error-normalization test
   mirrors the move; the cross-lane
   `errorBoundaryContextSchema.test.ts` (which asserts the error
   class shape alongside the five other command-error classes) gets
   a path-only update — not relocated, since it spans multiple
   lanes' error families.
3. **`internal/orchestration/`** (`558a4eec`). Two files
   (`reconcileCommandOrchestration.ts`, `runReconcileFlow.ts`).
   `runReconcileFlow.test.ts` mirrors the move.
4. **`internal/preparation/`** (`4db0df10`). Two files
   (`reconcileCommandInputNormalization.ts`,
   `reconcileCommandDependencyResolution.ts`). Two mirror tests
   follow. Because the DefaultDependencies type was hoisted in
   commit 1, this move introduces no public-to-internal import.
   A stale path in the already-moved
   `runReconcileFlow.test.ts` (the
   `ResolvedReconcileRuntimeSessionsDependencies` import that
   was still pointing at the lane-root DepRes location) updates
   here — the path could only be corrected once DepRes itself
   moved.
5. **Closeout (this commit).** Survey + template doc-sync;
   leftover-hunt confirmed (no empty directories, no orphan
   references).

Findings worth carrying forward:

- **From-scratch can fire exceptions too.** Restart's
  "default-and-scan agreement on every file" is a sufficient
  condition for textbook collapse, not a necessary property of
  from-scratch lanes. Reconcile demonstrates the merge-style
  type-relocation exception firing on a from-scratch path: the
  defaults layer pinned an intra-only file's exported type as a
  `satisfies` constraint, so the type had to hoist to the
  Contract before the file move. The from-scratch *procedure
  variant* still applies (introduce the boundary fresh, project
  sub-areas from naming clusters, validate against the import
  scan); it just may need a pre-cleanup step when the scan
  diverges from the role-table default. Past framings of
  from-scratch as "no exception fired" describe restart's
  textbook case, not a constraint of the from-scratch variant
  itself.
- **`internal/cli/` is not a fixed feature of the from-scratch
  shape.** Restart had a separate `*CommandCliOptions.ts` parser
  file, so a one-file `internal/cli/` sub-area materialized
  (following the metaReviewGate `prompts/` precedent for
  deliberate 1-file sub-areas). Reconcile keeps the parser
  inline in `reconcileCliCommand.ts`, so no `internal/cli/`
  appears. The presence of an extracted CLI-options parser
  cluster (not the CLI integration itself) is what triggers the
  `cli/` sub-area on a from-scratch path; lanes whose CLI option
  parsing stays inline in `*CliCommand.ts` end with three
  sub-areas rather than four.
- **Sample size 2 generalizes the from-scratch path.** Two
  from-scratch refactors landed; both validate the per-sub-area
  move sequence projected from naming clusters. They diverge on
  exception firing (restart 0, reconcile 1) and on sub-area
  count (restart 4, reconcile 3). The path now generalizes as:
  *introduce the public/internal boundary fresh, run the import
  scan, fire any of the five documented exception precedents
  (signature-reference type, cross-lane split-extraction,
  type-relocation, phantom cross-lane consumer, contract-test
  path-pin) as needed, then run the per-sub-area moves.* No new
  exception types appeared in reconcile; the existing exception
  catalog is sufficient through 7 refactored lanes.

#### `application/watchdog/` (refactored 2026-05-11, commits `c4faf095` → this commit)

**This is the third from-scratch Tier 2 case** — and the first
where a from-scratch path fired three new exception variants in
one sequence, two of which are exception *types* not previously
documented (the third is a known-type re-fire). The lane began
with eleven top-level files flat at the lane root and no
`internal/` directory at all. Unlike restart (textbook
default-and-scan agreement) or reconcile (single merge-style
type-relocation), watchdog's import scan diverged from the
naming-role defaults on three independent axes: the error class
had cross-area throw-callers in `infrastructure/`, the Contract's
optional dependency override pinned an intra-only Sampler via a
`typeof` reference, and there was no application-side
`*CliCommand.ts` at all. The from-scratch procedure absorbs all
three; the new findings extend the exception catalog rather than
revising the procedure itself.

Worked-example structure note: this entry follows the
restart/reconcile layout (goal-state introduction up front,
per-sub-area moves as a mechanical postscript) and lists the
three new exception variants together so the watchdog reference
reads as the canonical "rich-exception from-scratch" case.

Before: 11 top-level files, no `internal/`. Naming-role coverage:
`*CommandApi`, `*CommandContract`, `*CommandRuntime` (composition
only — the error class itself lives in `shared/watchdog/`),
`*CommandErrorNormalization`, plus six non-role files whose names
encode lane-specific concerns (`*CommandFlow`, `*CommandRouting`,
`*MetaReviewRouting`, `*PaneActivityMonitoring`,
`*PaneActivitySampler`, `*PendingReworkIntent`,
`*PendingReworkPersistence`). No `*CliCommand` file exists at the
lane root.

After: 2 top-level root-public files plus
`internal/{error,flow,paneActivity,pendingRework}/` (four
sub-areas, nine internal files). Top-level: `watchdogCommandApi.ts`
(canonical entry, re-exports `BubbleWatchdogError`),
`watchdogCommandContract.ts` (dependency port + result types +
the hoisted `PaneActivitySampleResult` union and
`SampleWatchdogPaneActivityFn` function type). The lane closes
without a `*CliCommand.ts` root-public file because the CLI
integration is entirely owned by `src/cli/commands/bubble/watchdog.ts`
(parser via `parseArgs`, renderer, and runner all inline).

**Goal-state introduction (the from-scratch step the half-done
procedure skips, with three new exception variants):**

- **Public surface decision.** With no pre-existing `internal/`,
  the public/internal boundary is decided fresh. The naming-role
  table defaults proposed three potential root-public files
  (`Api`, `Contract`, `CliCommand`), but the import scan retired
  the third because no `watchdogCliCommand.ts` exists — the
  CLI-integration role is fulfilled outside the application lane
  in `src/cli/commands/bubble/watchdog.ts`. Goal-state closes at
  two root-public files. This is a new from-scratch shape: prior
  worked examples (restart, reconcile) ended with three
  root-public files because their `*CliCommand.ts` cluster was
  present at the lane root. The relevant marker is the presence
  or absence of `*CliCommand.ts` at the lane root, not the
  presence of CLI integration in general — watchdog has CLI
  integration, it just lives elsewhere.
- **Sub-area projection from naming clusters.** The nine
  intra-only files clustered cleanly: `Runtime` +
  `ErrorNormalization` → `error/` (commit/merge/restart/reconcile
  `*Runtime.ts` content rule applies); `Flow` + `Routing` +
  `MetaReviewRouting` → `flow/` (merge precedent for "one
  sub-area for the whole flow lifecycle"); `PaneActivityMonitoring`
  + `PaneActivitySampler` → `paneActivity/`;
  `PendingReworkIntent` + `PendingReworkPersistence` →
  `pendingRework/`. The `flow/` bundle is heavier than merge's
  (three intra files vs. four in merge, but watchdog's Routing
  *is* the lifecycle dispatcher rather than a small eligibility
  check), reinforcing that the merge precedent generalizes when
  routing logic and flow primitives co-vary.

**Three new exception variants fired (and one prior exception
re-fired):**

- **Shared-resident error class (new exception type).**
  `BubbleWatchdogError` is constructed and thrown by
  `infrastructure/artifact/watchdog/watchdogPaneActivityStore.ts`
  (via `createBubbleWatchdogError`), not only by the application
  lane. Demoting the class into
  `application/watchdog/internal/error/` would have created an
  `infrastructure/ → application/<lane>/internal/` import — a
  Module Depth Check violation. The class therefore stays in
  `shared/watchdog/watchdogCommandError.ts`, and the application
  lane's `internal/error/` holds only the composition
  (`watchdogCommandRuntime.ts` re-exports the class and supplies
  `throwAsBubbleWatchdogError`, plus
  `watchdogCommandErrorNormalization.ts`). This is the inverse
  of the commit/merge/restart/reconcile pattern (where the error
  class moved into `internal/error/`). Captured as the
  shared-resident error-class exception at the table level
  (above), because it directly amends the
  `*CommandError.ts` row's "root-public when cross-lane;
  internal when single-lane" default.
- **Type-relocation via `typeof` reference (new exception
  variant).** Watchdog's Contract typed its optional dependency
  override as `sampleWatchdogPaneActivity?: typeof
  sampleWatchdogPaneActivity`, with the implementation function
  imported from `./watchdogPaneActivitySampler.js`. The
  root-public Contract therefore pinned the Sampler's location:
  moving Sampler under `internal/paneActivity/` would have made
  the public Contract import from `internal/`. The merge
  precedent's type-relocation applied with the *inverse
  direction*: instead of moving the offending type *out of*
  Contract (as merge did with `RunMergeCommandPipelineInput`),
  watchdog hoisted `PaneActivitySampleResult` *into* Contract
  and introduced a named `SampleWatchdogPaneActivityFn` function
  type. The reason for the inverse: the function shape is part
  of the dependency port API (the dependency
  `sampleWatchdogPaneActivity?` lives in `BubbleWatchdogDependencies`,
  which is the public contract), so Contract is the conceptually
  correct home for the type alias. Same precedent, opposite
  direction — both eliminate a public-to-internal import before
  the file move. New finding worth carrying forward: **when a
  Contract types an optional dependency using
  `typeof <implementation-function>`, the Contract is pinning
  the implementation file. Pre-cleanup is to define a named
  function-type alias in Contract and to relocate the function's
  return type (and any other dependent types) INTO Contract.**
- **Missing `*CliCommand.ts` (new goal-state shape).** Watchdog
  has CLI integration via `src/cli/commands/bubble/watchdog.ts`,
  but no application-side `watchdogCliCommand.ts` file exists at
  the lane root. The parser, renderer, and runner are all inline
  in the CLI-area-owned file. Goal-state closes at two
  root-public files (Api + Contract) rather than three. This
  deepens reconcile's `internal/cli/` finding: reconcile observed
  that `internal/cli/` is not a fixed feature of the from-scratch
  shape (it appears only when a separate `*CommandCliOptions.ts`
  parser file exists); watchdog observes the *next step* — when
  the application-side `*CliCommand.ts` integration helper also
  doesn't exist, the lane's top-level closes at 2 root-public
  files (Api + Contract). New finding worth carrying forward:
  **the presence of `*CliCommand.ts` at the lane root, not the
  presence of CLI integration in general, is what triggers the
  3-root-public from-scratch shape. Lanes whose CLI parser,
  renderer, and runner all live inline in
  `src/cli/commands/<lane>.ts` close at 2 root-public files
  (Api + Contract).**
- **Cross-mirror-root test pre-cleanup (metaReviewGate precedent
  re-fired).** `tests/v11/shared/watchdog/watchdogPaneActivitySampler.test.ts`
  imported `sampleWatchdogPaneActivity` from
  `src/v11/application/watchdog/watchdogPaneActivitySampler` — the
  test's primary surface is application-side, so the
  `tests/v11/shared/...` mirror root was wrong. Same metaReviewGate
  precedent: move the test under
  `tests/v11/application/watchdog/internal/paneActivity/` in a
  dedicated pre-cleanup commit before the src moves, so the later
  commits stay focused on production layout. The
  metaReviewGate finding (commit `fc3b96de`) generalized
  cleanly — no new template language needed, just the re-fire
  reference. The other test still under
  `tests/v11/shared/watchdog/` (`watchdogPaneActivityStore.test.ts`)
  covers infrastructure-side behavior and is out of scope for the
  application-lane refactor; its mirror-root is a separate
  question for the infrastructure-side test layout.

Seven-commit sequence (two pre-cleanup + four sub-area moves +
doc-sync):

1. **Type-relocation pre-cleanup** (`c4faf095`).
   `PaneActivitySampleResult` hoisted from
   `watchdogPaneActivitySampler.ts` into
   `watchdogCommandContract.ts`; new
   `SampleWatchdogPaneActivityFn` function-type introduced in
   Contract. `BubbleWatchdogDependencies.sampleWatchdogPaneActivity?`
   switched from `typeof sampleWatchdogPaneActivity` to
   `SampleWatchdogPaneActivityFn`. Intra-lane consumers of
   `PaneActivitySampleResult` (`watchdogCommandRouting.ts`,
   `watchdogPaneActivityMonitoring.ts`, and the same-lane Api
   test) re-targeted to import from Contract. Sampler now imports
   its own return type from Contract. The runtime sampler value
   and the `WATCHDOG_PANE_*` timing constants stay in
   `watchdogPaneActivitySampler.ts`. Single canonical public
   definition lives on Contract; Sampler no longer carries the
   duplicate.
2. **Cross-mirror-root test relocation** (`d4038596`).
   `tests/v11/shared/watchdog/watchdogPaneActivitySampler.test.ts`
   → `tests/v11/application/watchdog/internal/paneActivity/`.
   Import paths within the test deepen by two segments
   (`../../../../` → `../../../../../../`) to reach `src/` from
   the new mirror location.
3. **`internal/error/`** (`349ebe02`). Two files
   (`watchdogCommandRuntime.ts` re-exporting `BubbleWatchdogError`
   from `shared/watchdog/` plus `throwAsBubbleWatchdogError`,
   `watchdogCommandErrorNormalization.ts`). The error class
   itself stays shared-resident (see exception above). Mirror
   test `watchdogCommandErrorNormalization.test.ts` moves
   alongside.
4. **`internal/flow/`** (`3000eca4`). Three files
   (`watchdogCommandFlow.ts`, `watchdogCommandRouting.ts`,
   `watchdogMetaReviewRouting.ts`). Bundled under one sub-area
   per the merge precedent. No mirror tests for these three
   files individually (covered through the Api test).
5. **`internal/paneActivity/`** (`533b4f6c`). Two files
   (`watchdogPaneActivityMonitoring.ts`,
   `watchdogPaneActivitySampler.ts`). The relocated sampler test
   from commit 2 deepens its sampler import path to the new
   location.
6. **`internal/pendingRework/`** (`25289153`). Two files
   (`watchdogPendingReworkIntent.ts`,
   `watchdogPendingReworkPersistence.ts`). Last sub-area move.
7. **Closeout (this commit).** Survey + template doc-sync;
   leftover-hunt confirmed (no empty directories, no orphan
   references). The watchdog lane is the third from-scratch
   case in the inventory.

Findings worth carrying forward (in addition to the three new
exception variants and the precedent re-fire above):

- **Sample size 3 stabilizes the from-scratch path.** Three
  from-scratch refactors have now landed (restart, reconcile,
  watchdog). They diverge on exception firing (0, 1, 3+1 re-fire)
  and on sub-area count (4, 3, 4), confirming that the
  from-scratch procedure variant is robust to wide variation in
  exception load. Restart's "no exception fired" textbook case
  remains the simplest reference; reconcile demonstrates a single
  exception fire; watchdog demonstrates a multi-exception fire
  with new exception types. The procedure (introduce the
  public/internal boundary fresh, project sub-areas from naming
  clusters, fire any catalogued exception precedents as needed,
  run the per-sub-area moves) absorbs all three patterns. The
  exception catalog now totals **eight** documented variants
  (signature-reference type, cross-lane split-extraction,
  type-relocation [out-of-Contract], type-relocation via `typeof`
  [into-Contract], phantom cross-lane consumer, contract-test
  path-pin, shared-resident error class, missing `*CliCommand.ts`
  goal-state shape).
- **`flow/` can bundle routing + flow primitives when routing
  IS the dispatcher.** Watchdog's `internal/flow/` holds the
  central lifecycle dispatcher (`watchdogCommandRouting.ts`'s
  `resolveWatchdogLifecycleRoute`) alongside the supporting
  primitives (`watchdogCommandFlow.ts`,
  `watchdogMetaReviewRouting.ts`). Splitting `routing/` off
  would have created an artificial boundary between the
  dispatcher and the steps it dispatches. The merge precedent's
  "one sub-area for the whole flow lifecycle" generalizes to
  cases where routing is the central orchestration, not only to
  cases where routing is a small eligibility check.

#### `application/status/` (refactored 2026-05-12, commits `5f509262` → this commit)

**This is the fourth from-scratch Tier 2 case** — and the first
where the lane closed with a pure re-export barrel at the lane root
as its CLI surface (rather than a `*CliCommand.ts` that holds parser
or runner logic) and the first where no *new* exception variant
fired. The eight-variant exception catalog from watchdog covered the
status surface end-to-end; instead, two findings landed on the
**non-exception axis**: how to place a mixed-role barrel-and-impl
file, and why a tiny `*CliCommand.ts` that contains only re-exports
is still root-public load-bearing.

Worked-example structure note: this entry follows the
restart/reconcile/watchdog layout (goal-state introduction up front,
per-sub-area moves as a mechanical postscript). The "Findings" block
below documents the two non-exception findings; the
goal-state-and-move story is closer to restart's textbook collapse
than to watchdog's multi-exception case, despite the larger sister
file count, because the CLI cluster's seven sister files all
classify lane-internal-already on the import scan.

Before: 12 top-level files, no `internal/`. Naming-role coverage:
`*CommandApi`, `*CliCommand` (pure re-export barrel of four sister
symbols, 450 bytes), six `statusCli*` rendering/parser/runner files
(`statusCliOptions`, `statusCliRunner`, `statusCliAnsi`,
`statusCliTableRenderer`, `statusCliTextRenderer`,
`statusCliValueFormatters`), plus four `statusCommand*` files
encoding the computation/view pipeline (`statusCommandViewBuilder`,
`statusCommandGateState`, `statusCommandInternals`,
`statusCommandPathView`). No `*CommandContract.ts` file at the lane
root before the refactor — `BubbleStatusInput` and
`BubbleStatusDependencies` lived inline in the 13.6kB
`statusCommandApi.ts`.

After: 3 top-level root-public files plus
`internal/{cli,computation,view}/` (three sub-areas, ten internal
files). Top-level: `statusCommandApi.ts` (canonical entry,
re-exports `BubbleStatusView` from the moved ViewBuilder, holds
`BubbleStatusError` and `asBubbleStatusError` inline),
`statusCommandContract.ts` (new file — `BubbleStatusInput` and
`BubbleStatusDependencies`), `statusCliCommand.ts` (the 450-byte
pure re-export barrel, retargeted at `./internal/cli/` paths).

**Goal-state introduction (the from-scratch step the half-done
procedure skips):**

- **Public surface decision.** With no pre-existing `internal/`,
  the public/internal boundary is decided fresh. The naming-role
  table defaults proposed three potential root-public files (`Api`,
  `Contract`, `CliCommand`). The import scan agreed on all three
  with one note: `statusCommandContract.ts` did not yet exist at
  the start (the dependency port types lived inline in
  `statusCommandApi.ts`). Goal-state therefore *introduces* a
  Contract file via the reconcile-style minimal hoist (see commit 1
  below) rather than promoting an existing file. The seven CLI
  sister files and four computation/view sister files all
  classified intra-only on the import scan: every renderer's only
  intra-lane import was the public `BubbleStatusView` result type
  (re-exported from `statusCommandApi.ts`), and no cross-area
  production caller reached any sister directly — the sole
  external CLI consumer (`src/cli/commands/bubble/status.ts`)
  reached the lane through the barrel.
- **Sub-area projection from naming clusters.** The ten intra-only
  files clustered by content: the six `statusCli*` rendering and
  parser/runner files → `cli/`; the two view-assembly files
  (`statusCommandViewBuilder` defining `BubbleStatusView`,
  `statusCommandPathView` projecting the command path) → `view/`;
  the two read-and-resolve files (`statusCommandInternals` reading
  transcript + inbox, `statusCommandGateState` resolving doc gate
  state) → `computation/`. The `view/` vs `computation/` split
  reflects the natural read→assemble pipeline: computation reads
  state and resolves gates; view assembles the public
  `BubbleStatusView` from the read results. Bundling all four under
  a single `projection/` was considered and rejected — the
  read-vs-assemble concern boundary is real, and merging would have
  produced one wide sub-area mixing four concerns (transcript
  reading, gate resolution, view assembly, path-view projection)
  for no honest gain.

**No new exception variant fired** (the eight-variant catalog from
watchdog covers the surface), **but two non-exception axis findings
landed**:

- **Mixed-role barrel-and-impl file placement (new finding).**
  `statusCommandInternals.ts` is structurally two files glued
  together: half a re-export barrel (re-exports the GateState
  module's four symbols, the PathView module's `toStatusCommandPathView`
  function, and three shared type passthroughs from
  `shared/status/statusCommandTypes.ts`) and half a focused
  implementation file (defines `StatusTranscriptDataDependencies`,
  exports `countPendingHumanQuestions`,
  `resolvePendingApprovalCount`, and the primary
  `readStatusTranscriptData` reader). The merge precedent's
  "sub-area names reflect content, not file-name conventions" rule
  generalizes here: the file's *primary* concern is transcript +
  inbox reading and pending-question counting, so it placed under
  `internal/computation/` alongside `statusCommandGateState.ts`.
  The barrel re-exports were left intact during the move and
  retargeted at the new sibling/cross-sub-area paths; splitting the
  barrel half from the impl half is a separate cleanup, not part of
  the lane refactor, because (a) the refactor scope is file-level
  not function-level, and (b) the barrel re-exports keep existing
  call sites stable while the lane structure stabilizes. **Lesson
  for future refactors:** when a `*Internals.ts`-style file mixes a
  barrel-aggregator role with a focused-impl role, classify by the
  primary impl concern at the file level, accept the barrel
  re-exports as incidental during the move, and treat any later
  barrel-split as a downstream cleanup that the lane refactor does
  not block on.
- **Pure-barrel kept as Module-Depth-protective CLI surface (new
  finding).** `statusCliCommand.ts` is a 450-byte pure re-export
  barrel: it contains only four `export { ... } from "./statusCli<X>.js"`
  lines plus one `export type { ... }` block. The barrel has no
  logic of its own. The natural question on the from-scratch path
  is whether to *drop* the barrel and have
  `src/cli/commands/bubble/status.ts` import the four sister
  symbols directly. Two competing approaches were considered and
  rejected:
  - Drop the barrel and keep sisters root-public — would have
    promoted four single-purpose files to root-public on
    sister-by-sister grounds, with no production consumer demanding
    each one individually (the CLI entry's import is the only
    consumer, and it currently imports them as a bundle through the
    barrel).
  - Drop the barrel and move sisters to `internal/cli/`, with the
    CLI entry importing directly from `internal/` — would have
    created a Module Depth Check violation: external code
    (`src/cli/`) would reach into the lane's `internal/cli/`,
    which the visibility tier definition explicitly forbids.

  Keeping the barrel root-public preserves the Module Depth invariant
  ("`internal/` is consumed only intra-lane") while still demoting
  the six sister files into `internal/cli/`. The barrel becomes the
  canonical CLI surface the external consumer reaches, exactly as
  the naming-role table's `*CliCommand.ts` row intends — even though
  its *content* is now structurally different from
  restart/reconcile-style `*CliCommand.ts` files that hold runtime
  composition or parser-help-text logic. **Lesson for future
  refactors:** a `*CliCommand.ts` whose content is purely re-exports
  is still root-public load-bearing when it is the only path
  through which a `src/cli/` consumer composes the lane's CLI
  surface; the visibility decision is "is this how external CLI
  reaches the lane?", not "does the file contain logic?". The
  pure-barrel pattern is the inverse complement of watchdog's
  "missing `*CliCommand.ts`" finding: where watchdog observed that
  the lane root closes at two root-public files when no
  application-side `*CliCommand.ts` exists at all (CLI parser +
  runner inline in `src/cli/commands/bubble/<lane>.ts`), status
  observes that the lane root closes at three root-public files
  even when the `*CliCommand.ts` is a 450-byte content-free
  re-export barrel — what counts is the *presence* of the file as a
  Module-Depth-protective surface.

Five-commit sequence (one pre-cleanup + three sub-area moves +
doc-sync):

1. **Contract hoist pre-cleanup** (`5f509262`).
   `BubbleStatusInput` and `BubbleStatusDependencies` hoisted from
   `statusCommandApi.ts` into a new `statusCommandContract.ts`,
   following the reconcile-precedent minimal-hoist pattern.
   Intra-lane consumer `statusCliRunner.ts` updated; cross-area
   consumers `src/cli/commands/bubble/status.ts` (`BubbleStatusDependencies`
   type import) and `src/index.ts` (`BubbleStatusInput` re-export)
   retargeted at Contract; the application-side test consumer
   `tests/core/bubble/statusBubble.test.ts` updated its type-import
   helper to match. The `BubbleStatusError` class and
   `asBubbleStatusError` thrower stayed inline in Api because the
   class is small (4 lines), single-area, and tightly coupled to
   the thrower — the four-sub-area extension (commit/merge/restart/
   reconcile precedent of a separate `internal/error/`) would have
   produced an honest 1-file sub-area without independent concern
   value, and the merge precedent's "no 1-file sub-areas unless
   nothing else fits" rule applies.
2. **`internal/computation/`** (`7fb3d381`). Two files
   (`statusCommandInternals.ts`, `statusCommandGateState.ts`). The
   read-and-resolve cluster moves first because the view assembly
   in commit 3 depends on its types; ordering computation before
   view also keeps the temporary barrel re-export of
   `toStatusCommandPathView` (which Internals re-exports from a
   PathView still at root) on a single transient path
   `../../statusCommandPathView.js` until commit 3 shortens it to
   the sibling sub-area `../view/statusCommandPathView.js`.
3. **`internal/view/`** (`ad4c0c43`). Two files
   (`statusCommandViewBuilder.ts`, `statusCommandPathView.ts`). The
   view-assembly cluster moves second; `statusCommandApi.ts`
   retargets its ViewBuilder import + re-export at the new path,
   and the Internals barrel re-export of `toStatusCommandPathView`
   shortens to `../view/statusCommandPathView.js` (cross-sub-area
   sibling). After this commit the lane root holds only Api +
   Contract + the seven CLI sister files yet to move.
4. **`internal/cli/`** (`0e204705`). Six sister CLI files
   (`statusCliOptions.ts`, `statusCliRunner.ts`, `statusCliAnsi.ts`,
   `statusCliTableRenderer.ts`, `statusCliTextRenderer.ts`,
   `statusCliValueFormatters.ts`) move in a single commit; the
   single application-side test mirror
   (`tests/v11/application/status/statusCliValueFormatters.test.ts`)
   relocates alongside its source under
   `tests/v11/application/status/internal/cli/`. The root-public
   `statusCliCommand.ts` barrel retargets its four re-export paths
   at `./internal/cli/`. Cross-sibling renderer imports of
   `BubbleStatusView` from Api shorten to the sibling-of-parent
   path `../../statusCommandApi.js`; `statusCliRunner.ts`
   re-targets its dependency port type via
   `../../statusCommandContract.js`; `statusCliAnsi.ts` and
   `statusCliOptions.ts` have no intra-lane imports so they
   relocate unchanged.
5. **Closeout (this commit).** Survey + template doc-sync;
   leftover-hunt confirmed (no empty directories, no orphan
   references). The status lane is the fourth from-scratch case in
   the inventory.

Findings worth carrying forward (in addition to the two
non-exception findings above):

- **Sample size 4 hardens the from-scratch path.** Four
  from-scratch refactors have now landed (restart, reconcile,
  watchdog, status). Exception firing across the sample: 0, 1, 3+1
  re-fire, 0 new (existing precedents applied). Sub-area counts:
  4, 3, 4, 3. The procedure (introduce the public/internal
  boundary fresh, project sub-areas from naming clusters, fire
  any catalogued exception precedents as needed, run the
  per-sub-area moves) absorbs all four patterns. The eight-variant
  exception catalog from watchdog
  (signature-reference type, cross-lane split-extraction,
  type-relocation [out-of-Contract], type-relocation via `typeof`
  [into-Contract], phantom cross-lane consumer, contract-test
  path-pin, shared-resident error class, missing `*CliCommand.ts`
  goal-state shape) covered the status surface without requiring a
  new ninth variant — the first from-scratch case where the
  catalog held without extension. Status instead extended the
  template on the orthogonal **non-exception** axis (placement
  rules for mixed-role files and load-bearing pure-barrel
  surfaces), suggesting that the exception catalog is approaching
  saturation while the placement-rule axis remains an active area
  of accretion.
- **Contract hoist scope rule generalizes from reconcile.**
  Reconcile hoisted a single defaults-pinned type
  (`ReconcileRuntimeSessionsDefaultDependencies`) into Contract to
  unblock a file move; status hoisted the entire dependency port
  (`BubbleStatusInput` + `BubbleStatusDependencies`) preemptively
  because the host Api file was 13.6kB and 423 lines and the
  port-type cluster was substantial. Both are reconcile-precedent
  *minimal* Contract hoists in the sense that only the types
  needing public-surface stability move; in reconcile that was one
  type, in status it was two interface definitions. The error
  class and thrower stayed inline in Api (status) because the
  class is small and single-area; reconcile's `StartupReconcilerError`
  moved to `internal/error/` because its containing Runtime file
  had two siblings (`Orchestration`, `ErrorNormalization`) earning
  their own sub-area. **Rule:** Contract hoist scope is governed
  by what the import scan demands and what the host Api's size
  warrants, not by a fixed type-by-type recipe; small classes that
  are tightly coupled to a public thrower can stay inline in Api
  rather than forming a 1-file `internal/error/` sub-area.
- **Sub-area count is governed by content boundaries, not by
  sister file count.** Status has the largest sister file count
  among the four from-scratch cases (ten intra-only files
  post-Contract-hoist), yet closed at three sub-areas — fewer than
  restart's four or watchdog's four. The cluster boundary is
  content-driven (`cli/` for six files that share the CLI
  concern; `computation/` for two files that share the
  read-and-resolve concern; `view/` for two files that share the
  view-assembly concern), not file-count-driven. Splitting
  `cli/` into `cli/rendering/` + `cli/integration/` was
  considered and rejected — the merge precedent's "one sub-area
  for the whole lifecycle" generalizes to the CLI concern when
  rendering, parsing, and runner integration co-vary (they all
  consume the same `BubbleStatusView` and share the same external
  reach surface through the barrel). **Rule:** sub-area count
  reflects the number of distinct concerns, not the number of
  files; lanes with many intra-only files clustered around few
  concerns close with fewer sub-areas than the file count would
  suggest.

#### `application/reply/` (refactored 2026-05-11, commits `f9eac48e` → this commit)

**This is the fifth from-scratch Tier 2 case** — and the first
where the lane's goal-state retained a *lane-root submodule*
(`mutation/`) rather than closing at a pure
`Api + Contract + internal/` shape. The lane began with seven
top-level `.ts` files plus a pre-existing one-file `mutation/`
subdir at the lane root and no `internal/` directory at all. The
initial goal-state hypothesis was to demote `mutation/` under
`internal/mutation/` alongside the other intra-only sub-areas
(`error/`, `preparation/`) — the "Pre-existing named submodule at
lane root demotes to internal/<name>/" intuition. The hypothesis
broke against the fitness `boundary` check, which pins legitimate
mutation executors (files that call `appendProtocolEnvelope` and
`writeStateSnapshot` directly) to
`src/v11/application/<command>/mutation/**` as the canonical
location. The mutation cluster reverted to the fitness-pinned
lane-root path, and the sub-Contract sibling-joined the executor
there. Three new findings landed on the **placement-rule axis**
(the same non-exception axis status opened): the mutation
submodule pin itself, the inline-defaults-composition shape in
DepRes with no `defaults/<lane>/` directory, and a cross-lane
variant of the `list` lane's signature-reference exception. No
new exception variant in the watchdog catalog fired.

Worked-example structure note: this entry follows the
restart/reconcile/watchdog/status layout (goal-state introduction
up front, per-sub-area moves as a mechanical postscript), with one
additional sub-section calling out the **mid-refactor goal-state
revision** triggered by the fitness check. The revert is documented
explicitly because it is the canonical lesson — the fitness rule is
the source of truth on mutation executor placement, not the
file-tree-uniformity intuition; future refactors should consult the
boundary check before assuming a lane-root submodule can demote.

Before: 7 top-level `.ts` files + 1 lane-root submodule
(`mutation/`, one file), no `internal/`. Naming-role coverage:
`*CommandApi`, `*CommandContract`, `*CommandError` (separate Error
class file at lane root), `*CommandErrorNormalization`,
`*CommandInputNormalization`, `*CommandDependencyResolution`, plus
a `replyMutationExecutionContract.ts` sub-Contract at lane root
(intra-only, pairing the `mutation/replyMutationExecution.ts` file
inside the subdir). No `*CliCommand.ts` file at the lane root —
the CLI parser, help, and runner live entirely inline in
`src/cli/commands/bubble/reply.ts`. No `defaults/reply/` directory
— the defaults bundle lives inline in
`replyCommandDependencyResolution.ts` and recomposes two
cross-application-lane defaults files
(`application/start/startCommandDependencyDefaults.js`,
`application/pass/reviewerDeliveryDefaults.js`).

After: 2 top-level root-public `.ts` files + 1 lane-root
submodule (`mutation/`, two files: executor + sub-Contract) +
`internal/{error,preparation}/` (two sub-areas, four internal
files). Top-level: `replyCommandApi.ts` (canonical entry,
re-exports `HumanReplyCommandError` from the moved Error file plus
the Contract types) and `replyCommandContract.ts` (dependency port
+ `EmitHumanReply{Input,Result,Dependencies}` types; pinned by
`application/resume/resumeCommandContract.ts` as cross-lane
signature reference). Lane-root submodule:
`mutation/replyMutationExecution.ts` (the executor — writes
transcript via `appendProtocolEnvelope` and state via
`writeStateSnapshot`) and `mutation/replyMutationExecutionContract.ts`
(intra-only sub-Contract, sibling-joins the executor at the
fitness-pinned location). The lane closes without a
`*CliCommand.ts` at the lane root, re-firing the watchdog
missing-CliCommand finding (CLI parser + help + runner inline in
`src/cli/commands/bubble/reply.ts`).

**Goal-state introduction (the from-scratch step the half-done
procedure skips):**

- **Public surface decision.** With no pre-existing `internal/`,
  the public/internal boundary is decided fresh. The naming-role
  table defaults proposed two potential root-public files (`Api`,
  `Contract`) given the absence of `*CliCommand.ts` at the lane
  root (re-fire of the watchdog precedent for missing-CliCommand
  goal-state shape). The import scan confirmed both: six
  cross-area production consumers reach the lane through `Api`
  (`src/index.ts` two re-export blocks,
  `src/cli/commands/bubble/reply.ts`,
  `src/v11/defaults/ui/routerDefaults.ts`,
  `application/resume/resumeCommandOrchestration.ts`,
  `application/resume/resumeCommandRuntime.ts`) and `Contract`
  (`defaults/ui/routerDefaults.ts`,
  `application/resume/resumeCommandContract.ts` as cross-lane
  signature reference). The Error file, ErrorNormalization,
  InputNormalization, and DependencyResolution all classified
  intra-only; the existing `mutation/replyMutationExecution.ts`
  and its sibling sub-Contract also classified intra-only.
- **Sub-area projection from naming clusters.** The four
  remaining intra-only `.ts` files clustered cleanly: `Error` +
  `ErrorNormalization` → `internal/error/` (commit/merge/restart/
  reconcile/status precedent for the error-boundary sub-area);
  `InputNormalization` + `DependencyResolution` →
  `internal/preparation/` (same pair name as merge, restart,
  reconcile). No `*CommandRuntime.ts` file exists in reply
  (separate Error class file at the lane root predates the
  `*Runtime.ts`-is-actually-error-composition pattern), so no
  `*Runtime.ts` content-rule re-fire was needed. The mutation
  cluster was initially projected as a third sub-area
  (`internal/mutation/`) on the "pre-existing named submodule
  demotes" intuition; the fitness check rejected this and the
  cluster reverted to the lane-root `mutation/` subdir — see the
  next section.

**Mid-refactor goal-state revision (the mutation-pin discovery):**

After commits 1 and 2 (the `internal/error/` and
`internal/preparation/` moves) landed cleanly, commit 3 attempted
to move the mutation cluster to `internal/mutation/`: the
executor from `mutation/replyMutationExecution.ts` to
`internal/mutation/replyMutationExecution.ts`, and the
sub-Contract from the lane root
(`replyMutationExecutionContract.ts`) to a sibling location at
`internal/mutation/replyMutationExecutionContract.ts`. Typecheck
passed; the broader affected suite passed; lint passed. The
fitness `boundary` check failed with two direct-write violations:

```
src/v11/application/reply/internal/mutation/replyMutationExecution.ts:22
  direct transcript write -> const appended = await input.dependencies.appendProtocolEnvelope({
src/v11/application/reply/internal/mutation/replyMutationExecution.ts:51
  direct state write -> const written = await input.dependencies.writeStateSnapshot(
Legitimate mutation executors should live under
src/v11/application/<command>/mutation/** or be registered with a
mutation_executor exception.
```

The boundary check (`tools/fitness/checks/boundary.ts`, asserted by
`tests/tools/fitness/boundary.test.ts`'s "allows application
mutation execution directory boundaries" case) treats
`<command>/mutation/**` as the canonical location for files that
write transcript and state directly through the canonical ports.
The typed `mutation_executor` exception mechanism exists for
*deliberate non-conventional placements* — when a lane's mutation
executor must live outside the canonical path for a domain-specific
reason. Adding an exception to allow `internal/mutation/` placement
purely for file-tree uniformity would fight the active convention
and set a poor precedent for subsequent lane refactors.

The revert kept the Q1 sibling decision (sub-Contract joins the
executor) intact at the fitness-pinned location: the executor
returned to `application/reply/mutation/replyMutationExecution.ts`,
and the sub-Contract joined it at
`application/reply/mutation/replyMutationExecutionContract.ts`
(rather than at `internal/mutation/`). Relative-path adjustments
inside both files shrank by one level (`mutation/` is one level
deeper than the lane root, but two levels shallower than
`internal/mutation/`). The Api file's import path also reverted:
`./internal/mutation/replyMutationExecution.js` →
`./mutation/replyMutationExecution.js`. After the revert, all
checks passed (typecheck + lint + fitness + affected suite). Commit
3 therefore landed as "Colocate reply mutation sub-Contract with
its executor" — the sub-Contract sibling-joining the executor at
the fitness-pinned location, not a `mutation/` → `internal/mutation/`
demotion.

Four-commit sequence (no pre-cleanup, no exception-driven detour):

1. **`internal/error/`** (`f9eac48e`). Two files
   (`replyCommandError.ts` owning `HumanReplyCommandError` class +
   creator + thrower, `replyCommandErrorNormalization.ts`). Same
   error-boundary cluster as commit/merge/restart/reconcile/status.
   `HumanReplyCommandError` remains publicly reachable via the
   re-export from `replyCommandApi.ts`. Two mirror tests
   (`replyCommandError.test.ts`,
   `replyCommandErrorNormalization.test.ts`) relocated alongside
   the source under `tests/v11/application/reply/internal/error/`.
2. **`internal/preparation/`** (`c35cf4c5`). Two files
   (`replyCommandInputNormalization.ts`,
   `replyCommandDependencyResolution.ts`). One mirror test
   (`replyCommandInputNormalization.test.ts`) relocated alongside
   the source under
   `tests/v11/application/reply/internal/preparation/`. The
   DepRes file keeps its inline defaults composition; the two
   cross-application-lane defaults imports
   (`application/start/startCommandDependencyDefaults.js` and
   `application/pass/reviewerDeliveryDefaults.js`) gain one extra
   `../` of relative depth and pass the
   `application-defaults-boundary` check (whose scope is
   `application/* → defaults/*`, not `application/* →
   application/*`). No `defaults/reply/` directory is introduced.
   The lane-root `replyDeliveryInvariant.test.ts` stays at
   `tests/v11/application/reply/` rather than moving to
   `internal/preparation/`, because it is an Api-level cross-sub-area
   invariant test (asserts HUMAN_REPLY persistence + RUNNING resume +
   exactly-one delivery), not a sub-impl mirror.
3. **Colocate mutation sub-Contract with its executor** (`83fb4108`).
   `replyMutationExecutionContract.ts` moves from the lane root into
   the existing `mutation/` submodule alongside
   `replyMutationExecution.ts`; the executor's import of the
   sub-Contract shortens from a parent reference
   (`../replyMutationExecutionContract.js`) to a sibling
   (`./replyMutationExecutionContract.js`). The `mutation/` submodule
   stays at the lane root, not under `internal/`, per the
   fitness-pin rule established in the mid-refactor revert above. The
   commit message documents the revert lesson so future refactor
   readers find it in `git log` without having to consult this
   worked example. The `mutation/` submodule retains the same
   semantics as before the refactor — the lane's side-effect
   mutation cluster owned at the fitness-pinned path — but now
   houses the sub-Contract as a sibling rather than at the lane
   root.
4. **Closeout (this commit).** Survey + template doc-sync;
   leftover-hunt confirmed (no empty directories, no orphan
   references). The reply lane is the fifth from-scratch case in
   the inventory.

Findings worth carrying forward:

- **Mutation submodule fitness-pinned at `<command>/mutation/` (new
  placement-rule finding).** Lanes whose mutation executor writes
  transcript or state directly through `appendProtocolEnvelope` and
  `writeStateSnapshot` keep the executor under
  `application/<command>/mutation/` as a *lane-root submodule*, NOT
  under `internal/mutation/`. The fitness `boundary` check pins
  this location; the typed `mutation_executor` exception
  mechanism in `tools/fitness/policy.json` exists for *deliberate
  non-conventional placements*, not for file-tree uniformity. Two
  sibling rules follow from this finding: (a) intra-only
  sub-Contracts for the mutation submodule sibling-join the
  executor at the fitness-pinned `mutation/` path (Q1 sibling
  decision preserved, just at the fitness-pinned location rather
  than at `internal/mutation/`); (b) the goal-state for such
  lanes is `Api + Contract + mutation/ + internal/<other-sub-areas>/`
  rather than `Api + Contract + internal/<all-sub-areas>/`. Recorded
  separately in the "Common naming roles" section as an exception
  at the placement axis (the third such exception, after the
  signature-reference and shared-resident-error-class visibility
  exceptions). Operational lesson: future from-scratch refactors
  with a pre-existing `mutation/` submodule should consult the
  fitness `boundary` check before applying the
  "pre-existing-named-submodule demotes" intuition. The intuition
  applies to other named submodules (e.g., subdir-of-concern
  patterns without side-effect mutation), but mutation executors
  with direct port writes are the explicit counter-example.
- **Inline defaults composition in DepRes (new placement-rule
  finding).** Reply is the first refactored lane with no
  `defaults/<lane>/` directory at all. The defaults bundle
  (`replyCommandDependencyDefaults`) is composed inline in
  `replyCommandDependencyResolution.ts` and recomposes two
  cross-application-lane defaults files
  (`application/start/startCommandDependencyDefaults.js`,
  `application/pass/reviewerDeliveryDefaults.js`) through
  preserved relative-path imports. This is
  *preserved-existing composition*, not a recommended new pattern
  — the existence of `defaults/<lane>/` for other lanes
  (`restart`, `reconcile`, etc.) reflects the cleaner
  composition-ownership boundary; reply's inline composition is
  acceptable through the refactor because changing it is a
  separate composition-ownership question, not a lane-internal
  refactor concern. The `application-defaults-boundary` fitness
  check is unaffected because its scope is forbidding
  `application/* → defaults/*` imports, not
  `application/* → application/*`. **Rule:** when an existing
  lane has its defaults bundle inline in DepRes with cross-lane
  application-to-application imports, the lane refactor preserves
  the pattern unchanged (paths deepen by the relative-depth delta
  of the DepRes move); introducing a new `defaults/<lane>/`
  directory is out of scope for the lane refactor.
- **Cross-lane Contract signature-reference pin (re-fire of the
  `list` lane's intra-lane exception, cross-lane variant).** The
  `list` lane's "signature-reference exception" rule
  (a type referenced by a root-public function's signature stays
  root-public regardless of import-scan count) re-fired in its
  cross-lane variant: `application/resume/resumeCommandContract.ts`
  imports `EmitHumanReplyInput` and `EmitHumanReplyResult` from
  `replyCommandContract.ts` as *real signature parameters* —
  `ResumeBubbleResult = EmitHumanReplyResult`,
  `emitHumanReply(input: EmitHumanReplyInput) => Promise<EmitHumanReplyResult>`
  in `ResumeBubbleDependencies`. The reply Contract is already
  root-public on standard production-consumer grounds, so this
  cross-lane pin requires no new template language — the rule
  generalizes from intra-lane to cross-lane without modification.
  Worth documenting because it is the first observed case of one
  application lane's Contract pinning another application lane's
  Contract through real signature parameters; previous
  signature-reference cases (`list`) were intra-lane.
- **Sample size 5 saturates the from-scratch exception catalog.**
  Five from-scratch refactors have now landed (restart, reconcile,
  watchdog, status, reply). Exception firing across the sample:
  0 new (restart), 1 new (reconcile), 3 new + 1 re-fire
  (watchdog), 0 new (status — eight-variant catalog held), 0 new
  + 1 cross-lane re-fire (reply — eight-variant catalog held
  again, list's signature-reference re-fired cross-lane). The
  eight-variant exception catalog from watchdog
  (signature-reference type, cross-lane split-extraction,
  type-relocation [out-of-Contract], type-relocation via `typeof`
  [into-Contract], phantom cross-lane consumer, contract-test
  path-pin, shared-resident error class, missing `*CliCommand.ts`
  goal-state shape) has held across two consecutive from-scratch
  cases without extension. **The active growth area is the
  placement-rule axis**, not the exception catalog: status
  introduced two placement rules (mixed-role barrel-and-impl,
  pure-barrel as Module-Depth-protective surface), reply added
  three more (mutation submodule pinned at lane root, inline
  defaults composition in DepRes, cross-lane Contract
  signature-reference re-fire). The exception catalog appears
  saturated at eight; the placement-rule catalog continues to
  accrete.
- **Mid-refactor revert as a legitimate procedure step.** Reply's
  commit 3 is the first documented case where a worked-example
  procedure had to revert a structural move mid-sequence based on
  a fitness check failure. The lesson is procedural, not
  structural: when the fitness check is the source of truth on a
  placement convention, the right response to a failure is to
  revert the move and re-target the cluster at the fitness-pinned
  location, NOT to add a typed exception for aesthetic reasons.
  The typed-exception mechanism is for cases where the canonical
  path genuinely does not fit the lane (e.g., domain-specific
  routing of side-effect writes); adopting it for file-tree
  uniformity sets a precedent that erodes the convention itself.
  Future refactors should treat fitness-check failures as
  *signals to revise the goal-state*, not as obstacles to bypass
  with exception entries.

## Module Depth Check applies

Each tier is a Boundary/Architecture refactor in the classification of
`refactoring-guidance.md`. Run the Module Depth Check questions before
treating a lane refactor as complete:

1. What does the deletion test say?
2. What caller knowledge is removed by this work?
3. Which public interface becomes smaller or more stable?
4. Which ordering, policy, or invariant moves behind the lane?
5. Do tests cross the same seam as production callers?
6. Which existing top-level files are demoted, deleted, or justified as
   root-public?

If callers know the same things through different files after the refactor,
the structure deepened on disk but not at the interface — go further.

## Maintenance

This template is written from the planWatch + half-done evidence backed by
the lane survey. After 5 lane refactors land using this template, the
`architecture/runtime` owner should review:

- whether the three tiers still cover the observed lane shapes,
- whether any new naming-role pattern has emerged that belongs in the table,
- whether the half-done procedure produced consistent results across the
  applied lanes,
- whether `actorProtocol` has been further restructured (Phase 2 of
  the 2026-05-11 split — internal/ introduction or lane rename) or
  whether another non-command lane has emerged and should be
  cross-referenced.

The survey doc (`application-command-shapes-survey.md`) is the empirical
companion to this template; update it alongside major template revisions.
