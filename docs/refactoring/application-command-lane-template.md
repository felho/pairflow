# Application Command Lane Template

Status: draft
Last updated: 2026-05-13
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

**Non-command application lanes are out of scope.** This template covers
CLI-driven command implementations: a runtime entry point + dependency port
contract + composition root, optionally with multi-phase pipelines or
coordinator submodules.

`actorProtocol` is a runtime/protocol/role-modeling layer that lives under
`application/` for historical reasons. Its placement is tracked as a separate
architectural decision and is not a target of this template.

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

**Reference lane:** `application/delete/` (currently 6 top-level, no
`internal/`). The current top-level files (`deleteBubble.ts`,
`deleteBubbleFinalization.ts`, `deleteBubbleSupport.ts`,
`remoteDeleteExecutionContext.ts`, `deleteCliCommand.ts`,
`deleteBubbleRemoteMissingTargetFallback.ts`) represent: API + finalization +
support + remote context + CLI + fallback. After Tier 1 application, the
expected layout is: `deleteBubble.ts` (API) and `deleteCliCommand.ts` at root,
the rest moved to `internal/finalization/`, `internal/remote/`,
`internal/support/`.

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

Half-done lanes today (per the survey): `metaReviewGate` (with caveats —
its `internal/` is flat, so the refactor is a two-step move).
`list`, `commit`, `merge`, and `metaReview` were previously half-done
and have been refactored using this procedure; see "Worked examples"
below.

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

Four lane refactors have applied this procedure end-to-end. All started
from a half-done state and ended at structured Tier 2.

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
- whether `actorProtocol` (or another non-command lane) has been resolved by
  a separate decision and should be cross-referenced.

The survey doc (`application-command-shapes-survey.md`) is the empirical
companion to this template; update it alongside major template revisions.
