# Dynamic Defaults Shim Elimination — Inventory

Status: draft (iteration v7)
Scope: the 45 dynamic-defaults import warnings emitted today by
`application_defaults_boundary` and `shared_defaults_boundary` fitness checks
(`tools/fitness/checks/application-defaults-boundary.ts`,
`tools/fitness/checks/shared-defaults-boundary.ts`).
Source list: `pnpm fitness:check:ci` output, 2026-05-07.
Created: 2026-05-07

This file categorizes every flagged site and proposes a resolution action
per site. As of v7, **categorization is settled** for all 45 sites; what
remains are execution-shape decisions (e.g. CLI assembly location) called
out in the closing section. The `?` markers used during v1-v3 verification
are kept in the legend for historical context only.

---

## Goal

Reach a state in which:

1. No `application/**` or `shared/**` file imports `defaults/**`, statically or
   dynamically.
2. The fitness check is hard-fail in both static and dynamic modes; the
   dynamic detection introduced in commit `6d0b1c91` is kept.
3. Composition wiring (which infrastructure adapter goes behind which port) is
   owned exclusively by `src/cli/**` (the composition root) and the
   `defaults/**` catalog files it pulls from.

The reviewer feedback across iterations v0 → v1 → v2 → v3 → v4 → v5 → v6
→ v7 (2026-05-07) is incorporated. **Note on row IDs**: across iterations several entries
moved between categories during verification. Row IDs (A1, B2, B8, etc.)
are kept stable for traceability against the fitness output and earlier
discussion; **the leading letter is historical, not a current
classification claim**. The "Cat" column reflects the current
classification.

- Capability typing avoids over-engineering. Where a single port is enough,
  the existing port type is used directly (`ProcessSpawnPort`,
  `ResolveBubbleByIdPort`, ...) — no `*Capability` wrapper. Slices are
  introduced **only** when 2+ ports cohesively move together, e.g.
  `StateCapabilities` (read/write/inspect) or `TranscriptCapabilities`
  (append/read).
- File-by-file classification for command-scoped defaults — whether they
  belong in `defaults/` (composition decision) or under `application/<command>/`
  (command-local logic) is decided per file, not en masse.
- File-by-file classification for `*CliCommand.ts` files — whether they are
  CLI shells (move to `src/cli/`) or application runners (DI fix in place) is
  decided per file, not by the filename suffix.
- Sequencing is **kötelező**: the shared/A cleanup must complete before the
  B aggregator passes, because B-targets currently transit through shared
  shims. The full v4/v5 step order (D, C, S5/S7, shared+A, B, fitness flip)
  is in D3.

---

## Cross-Cutting Decisions (settle before site work)

These are end-state shape decisions. They gate the site-by-site moves because
changing them mid-migration would re-touch many sites.

### D1. Capability typing — no needless wrappers

**Decision**: use existing single-port types directly; introduce a slice type
under `shared/ports/**` **only** when 2+ ports cohesively move together.

Likely real slices:

- `StateCapabilities` (read + write + inspect)
- `TranscriptCapabilities` (append + read)
- possibly a `BubbleEvents` slice if ≥2 emitter ports cluster

Single-port deps stay on the existing port type. For example
`ProcessSpawnPort`, `ResolveBubbleByIdPort`, `RegisterRepoPort`, etc. — no
`ProcessSpawnCapability` wrapper is created.

### D2. `*CliCommand.ts` files — move with ownership inversion (decided in v4)

**Decision (v4)**: all three flagged `*CliCommand.ts` files are CLI shells
(args parsing, help text, render, delegate). They move to
`src/cli/commands/bubble/<cmd>.ts`. The move is **not** a re-export
addition — current `src/cli/commands/bubble/{commit,create,extract}.ts` are
already thin re-exports back to `application/`, which is the camouflage
pattern itself. The fix **inverts the ownership**:

- The actual parsing/help/render/runner code moves into
  `src/cli/commands/bubble/<cmd>.ts`.
- The `application/<cmd>/*CliCommand.ts` file deletes (its CLI parts move
  to the CLI; its non-CLI orchestration parts, if any, stay or fold into
  the existing application command API).
- The CLI file imports the defaults statically (allowed; CLI is the
  composition root) and passes them as the command's `dependencies`
  argument.

Sites: `commitCliCommand.ts`, `createCliCommand.ts`, `extractCliCommand.ts`.
All three: confirmed move with inversion.

### D3. Sequencing — D and C first, then S5/S7 refactor, then shared/A and B

The migration is a single focused push (the user's call, 2026-05-07). No
allowlist/baseline machinery. The 45 entries go to zero, the fitness check
flips from warn to hard-fail in the closing PR.

The sequence is **kötelező**, not preferential, because category B targets
currently import from shared shims (e.g. `defaults/merge/mergeCommandDefaults.ts`
imports from `shared/state/stateStoreDefaults.js`,
`shared/transcript/transcriptDependencyDefaults.js`,
`shared/bubbleLookup/bubbleLookupDefaults.js`,
`shared/status/statusCommandDependencyDefaults.js` — i.e. through S2, S6, S7-S9,
S10). If B is started before shared cleanup, every B-PR has to also touch the
shared shims it transits.

Order (revised v4):

1. **D1-D3** — CLI ownership inversion. Small blast radius, well-bounded,
   cleans the CLI/application boundary. See D-section.
2. **C1 (reply)** — atomic file move. See C-section.
3. **S5/S7 larger refactor** — move `shared/read-model/list/`,
   `shared/status/` (excluding pure DTO files), and `shared/bubbleInbox/`
   under `application/`. See "S5/S7 Refactor Scope" section. The two
   shims inside these directories disappear as part of the move.
4. **Simple shared shims (S1, S2, S3, S4, S6, S10) + application A
   entries + A-reclassifications (B2, B8, B13, B14).** Mechanical port-DI.
   Each delete is one PR. The shared shims must be done **before** step 5
   because B-targets transit through several of them. Note: S7, S8, S9 are
   not listed here — they live in the same shim file
   (`statusCommandDependencyDefaults.ts`) which closes in step 3.
5. **B-category aggregator passes.** CLI imports the composition aggregator
   and passes the result.
6. **Flip warn → hard-fail.** Keep the dynamic-detection logic itself as
   the regression bound.

Why D and C lead, not shared: D1-D3 and C1 are the most isolated and most
high-leverage moves. D1-D3 also removes the misleading re-export pattern
in `src/cli/commands/bubble/{commit,create,extract}.ts` that camouflages
the current direction. Doing them first reduces noise during the bigger
shared refactor in step 3.

---

## Resolution Category Legend

- **A — Port DI.** A port already exists in `shared/ports/**`. The CLI imports
  the port adapter from `defaults/` and passes it to the command — directly
  as the existing port type if it stands alone, or bundled into a slice
  (`StateCapabilities`, `TranscriptCapabilities`) when 2+ related ports
  cohesively cluster. The application shim file is deleted; callers take the
  port (or slice) as a parameter.
- **B — Composition default (CLI invokes directly).** The `defaults/**` file
  is a real composition aggregator that imports from `infrastructure/` (often
  many adapters). It stays in `defaults/`. The CLI imports it and passes the
  result as the command's `Dependencies` argument. The application shim file
  is deleted.
- **C — Move to `application/<command>/`.** The `defaults/**` content is pure
  command-local logic with no `infrastructure/` import. It is misplaced as
  "defaults"; move the file into the command directory and replace the
  dynamic shim with a static import. (Reply is currently in this category.)
- **D — File-by-file decision** (CLI shell vs application runner). If CLI
  shell → move to `src/cli/`. If application runner → DI/wiring fix in place
  (effectively reclassify as A or B). All 3 currently flagged `*CliCommand.ts`
  files start here.
- **?** — *Historical discriminator used during v1-v3 classification.* All
  45 sites are now classified; the rule below is kept for reference only.
  The discriminator was **structural, not import-path**:
  - **B** — file aggregates 2+ concrete adapters, whether imported directly
    from `infrastructure/` or transitively through sibling `defaults/<X>/...`
    modules. It owns composition. (Example: `defaults/stop/stopCommandDefaults.ts`
    has no direct `infrastructure/` import, but aggregates 5 other defaults
    files + a mutation — still B, because it composes.)
  - **C** — file is pure command-local logic. It takes IO as `dependencies`
    parameters and imports only from `domain/`, `shared/` (non-defaults),
    `application/` contracts, and node built-ins. **Zero `infrastructure/`
    AND zero `defaults/` imports.**
  - **A** — file forwards exactly one port adapter (or 2-3 cohesive ports
    that genuinely cluster, like state read/write/inspect). The wrap is
    thin: no logic, no further composition.

---

## Site Inventory

### Shared layer (10 sites — mostly A, with a deeper modelling signal at S5/S7)

The shared layer must not contain composition. Most entries below are clean
port-DI candidates. **S5 and S7 are different in kind**: their target
(`defaults/list/listCommandDefaults.ts`) is a composition aggregator, not a
port wrap, so the shim isn't merely shaped wrong — the shared layer is
**pulling a composition aggregator from defaults**. See the note below the
table.

| # | Site (shim) | Defaults target | Cat | Action |
|---|-------------|-----------------|-----|--------|
| S1 | `shared/actorProtocol/actorEmitContext.ts:46` | `defaults/workspace/workspaceResolutionDefaults.ts` | A | Completed in Batch 8: shared actor context now takes explicit resolution dependencies; default wiring moved to `defaults/actorProtocol/actorEmitContextDefaults.ts`. |
| S2 | `shared/bubbleLookup/bubbleLookupDefaults.ts:18` | `defaults/bubbleLookup/bubbleLookupDefaults.ts` | A | Completed in Batch 8: defaults callers import `defaults/bubbleLookup` directly; the shared facade was deleted. |
| S3 | `shared/metaReview/metaReviewDependencyDefaults.ts:22` | `defaults/runtimeSessions/runtimeSessionsDefaults.ts` | A | Completed in Batch 6: the shared shim had no live caller after the application-local `metaReviewDependencyDefaults.ts` copy became authoritative, so the shared file was deleted. |
| S4 | `shared/metrics/bubbleEvents.ts:62` | `defaults/metrics/bubbleEventsDefaults.ts` | A | Completed in Batch 9: shared metrics now exports only the bubble-event contract types; runtime implementation moved to `defaults/metrics/bubbleEvents.ts`. |
| S5 | `shared/read-model/list/listReadModelDefaults.ts:73` | `defaults/list/listCommandDefaults.ts` | B + modelling | Target is verified composition (direct `infrastructure/` imports, see B16). Resolution path picked (v4): **refactor caller out of `shared/`**. The shim file deletes as part of the S5/S7 refactor; the moved application API takes deps as a parameter, CLI injects from `defaults/list/`. See "S5/S7 Refactor Scope". |
| S6 | `shared/state/stateStoreDefaults.ts:28` | `defaults/state/stateStoreDefaults.ts` | A | Completed in Batch 8: defaults callers import `defaults/state` directly; shared actor context receives `readStateSnapshot` through explicit dependencies; the shared facade was deleted. |
| S7 | `shared/status/statusCommandDependencyDefaults.ts:116` | `defaults/list/listCommandDefaults.ts` | B + modelling | Same target as S5. Same resolution path: refactor caller out of `shared/`; the shim file (which holds S7, S8, S9 together) deletes as part of the S5/S7 refactor. |
| S8 | `shared/status/statusCommandDependencyDefaults.ts:124` | `defaults/gates/docContractGateArtifactDefaults.ts` | A | Caller takes the existing doc-contract artifact port directly (no wrapper). |
| S9 | `shared/status/statusCommandDependencyDefaults.ts:132` | `defaults/reviewer/reviewVerificationArtifactDefaults.ts` | A | Caller takes the existing review-verification artifact port directly. |
| S10 | `shared/transcript/transcriptDependencyDefaults.ts:25` | `defaults/transcript/transcriptDependencyDefaults.ts` | A | Completed in Batch 7: defaults-layer callers now import `defaults/transcript/transcriptDependencyDefaults.ts` directly, and the shared facade was deleted. |

**Note on S5/S7 (modelling signal).** These two entries reveal a
seam-classification problem that simple shim removal does not fix: the
shared layer currently depends on a composition aggregator
(`defaults/list/listCommandDefaults.ts` — verified, imports many
`infrastructure/` adapters directly). Even after the dynamic shim is
removed, "shared takes composition" remains wrong by `v11-ports-governance.md`.

**Balanced-coupling framing**: this is not a bad-import-technique problem,
it is a **strength × distance imbalance**. `shared/` is a high-distance
layer (general-purpose, neutral helpers reachable from many places). A
composition aggregator carries high integration strength (it owns runtime
adapter selection, talks to many infrastructure modules). High strength at
high distance is the imbalanced quadrant: a small change in a list adapter
ripples through `shared/` callers that have no business knowing list
exists. The shim-removal grammar of A/B/C does not address this — it just
moves where the import line lives. The seam itself has to change.

Path picked (v4): **refactor caller out of `shared/`**.

Verification: reading `shared/read-model/list/listReadModelEntryProjection.ts`
and `shared/bubbleInbox/bubbleInboxReadModel.ts` confirms these are not
neutral helpers. `listReadModelEntryProjection.ts` imports
`metaReviewExecutionContext`, `metaReviewSnapshot`, `reviewPolicyRuntime`,
`watchdogStatus`, `bubbleAttention` — it applies review policy, projects
meta-review runtime delivery, and computes watchdog status as part of one
list-entry build. `bubbleInboxReadModel.ts` imports
`statusCommandDependencyDefaults` (the shim) on its first line and assembles
a "pending inbox" view from runtime state. These are command/UI read-model
workflows, not policy-neutral shared helpers.

A `ListCapability` port-slice would mask the modelling problem rather than
fix it: a "shared file that pulls a runtime port to project review policy
and watchdog state" is no more shared-shaped than the current shim version.
The strength stays where it is and the distance does not actually drop.

The proper fix is structural: move the workflow files to `application/`,
where high-strength runtime composition belongs. Concrete file list and
target locations are in the new "S5/S7 Refactor Scope" section below.

Note: S7-S9 are three entries in the same `statusCommandDependencyDefaults.ts`
file. S8 and S9 are clean A; S7 needs the S5/S7 decision above. The file
deletes once all three callers take their dependency directly.

---

### Application — Category A (port DI; ~15 current A-classified rows)

Each currently-A entry forwards a port (or small slice) that already has a
port type in `shared/ports/**`. The shim file deletes; callers receive the
port (or slice) as a parameter from the CLI.

Slice notes are honest about which entries actually justify a slice. Most
do not.

**Row ID note**: A1 was reclassified to B during verification but kept here
for traceability. Other rows that started as `B?` and reclassified to A
(B2, B8, B13, B14) remain in the B-table below for the same reason — the
row ID prefix is historical, the "Cat" column is authoritative.

| # | Site (shim) | Defaults target | Cat | Action |
|---|-------------|-----------------|-----|--------|
| A1 | `application/askHuman/askHumanFinalizationDependencyDefaults.ts:37` | `defaults/askHuman/askHumanFinalizationDefaults.ts` | **B** (reclassified) | Verified: target imports 2 infrastructure adapters (`emitBubbleNotification`, `emitDeliveryNotificationAck`). Two-adapter aggregation = composition. CLI passes the aggregator. (Optional alternative: a 2-port `Notification` slice as A; lean B because the existing aggregator already has the right shape.) |
| A2 | `application/bubbleIdentity/bubbleIdentityDependencyDefaults.ts:18` | `defaults/bubbleIdentity/bubbleIdentityDefaults.ts` | A | Completed in Batch 20: bubble identity mutation port now flows through the existing start context defaults aggregate; standalone application bubble-identity shim was deleted. |
| A3 | `application/bubbleLookup/bubbleLookupDependencyDefaults.ts:18` | `defaults/bubbleLookup/bubbleLookupDefaults.ts` | A | Completed in Batch 21: bubble lookup port now flows through the existing start context defaults aggregate; standalone application bubble-lookup shim was deleted. |
| A4 | `application/gates/docContractGateArtifactDependencyDefaults.ts:24` | `defaults/gates/docContractGateArtifactDefaults.ts` | A | Completed in Batch 15: doc-contract gate artifact ports are now supplied through create, pass-validation, and start defaults aggregates; the standalone application shim was deleted. |
| A5 | `application/metaReview/metaReviewDependencyDefaults.ts:20` | `defaults/runtimeSessions/runtimeSessionsDefaults.ts` | A | Completed in Batch 11: V11/default wrapper injects the runtime-sessions read port through `defaults/metaReview`; the application shim was deleted. |
| A6 | `application/process/processSpawnDependencyDefaults.ts:8` | `defaults/process/processSpawnDefaults.ts` | A | Completed in Batch 18: open, attach, and start command paths now receive `ProcessSpawnPort` from the CLI/defaults composition side; standalone application process-spawn shim was deleted. |
| A7 | `application/repoRegistry/repoRegistryDependencyDefaults.ts:18` | `defaults/repoRegistry/repoRegistryDefaults.ts` | A | Completed in Batch 10: start CLI now consumes `defaults/start/startCliDefaults.ts` from the CLI layer; the application repo-registry shim was deleted. |
| A8 | `application/state/stateStoreDependencyDefaults.ts:25` | `defaults/state/stateStoreDefaults.ts` | A | Completed in Batch 22: state read/write/inspect ports now flow through the existing start context defaults aggregate; standalone application state-store shim was deleted. |
| A9 | `application/status/statusCommandDefaults.ts:26` | `defaults/watchdog/watchdogPaneActivityDefaults.ts` | A | Verified: caller only uses `readWatchdogPaneActivity` (read-only). Single-port DI; use the existing read port directly, no slice. The defaults file exports read/write/remove, but this consumer needs only read. |
| A10 | `application/tmux/tmuxRunnerDependencyDefaults.ts:18` | `defaults/tmux/tmuxRunnerDefaults.ts` | A | Completed in Batch 16: the `runTmux` port is now supplied through the existing start defaults aggregate; the standalone application tmux shim was deleted. |
| A11 | `application/transcript/transcriptDependencyDefaults.ts:23` | `defaults/transcript/transcriptDependencyDefaults.ts` | A | Completed in Batch 23: transcript append/read ports now flow through the existing start context defaults aggregate; standalone application transcript shim was deleted. |
| A12 | `application/workspace/workspaceResolutionDependencyDefaults.ts:18` | `defaults/workspace/workspaceResolutionDefaults.ts` | A | Completed in Batch 19: workspace resolution now flows through the existing start context defaults aggregate; standalone application workspace-resolution shim was deleted. |

---

### Application — Category B (composition aggregator; ~15-19 sites)

Each entry's `defaults/<X>/...Defaults.ts` file is a real composition
aggregator: it imports directly from `infrastructure/`, often many adapters,
and composes them into a `*CommandDependencies`-shaped object. These files
**stay in `defaults/`**. The application shim file deletes; the CLI imports
the defaults aggregator directly and passes the resulting object as the
command's `dependencies` argument.

**Important sequencing constraint**: B-work must wait until the S5/S7 refactor
and the simple shared-shim cleanup are done. Several B-targets transit shared shims today
(`defaults/merge/mergeCommandDefaults.ts` alone reaches S2, S6, S7-S9, S10).
Touching B before shared cleanup means every B-PR touches shared shims
twice.

**Verification status**:

- **Verified composition** (B): all current B-rows in the table below are
  verified. The list includes:
  `create/createBubbleDefaults.ts`,
  `delete/deleteBubbleDefaults.ts`,
  `merge/mergeCommandDefaults.ts`,
  `metaReview/metaReviewDefaults.ts` (3 infra adapters),
  `metaReviewGate/metaReviewGateCommandDefaults.ts`,
  `pass/passValidationCommandDefaults.ts`,
  `pass/reviewerDeliveryDefaults.ts`,
  `reconcile/reconcileCommandDefaults.ts` (infra + tmuxRunner + probe logic),
  `restart/restartCommandDefaults.ts`,
  `start/startBubbleDefaults.ts`,
  `converged/convergedDependencyDefaults.ts`,
  `list/listCommandDefaults.ts` (direct infra imports),
  `stop/stopCommandDefaults.ts` (transitive aggregation),
  `askHuman/askHumanFinalizationDefaults.ts` (2 infra adapters),
  `watchdog/watchdogCommandDefaults.ts`,
  `watchdog/watchdogPendingReworkDefaults.ts` (2 adapters).
- **Reclassified during verification** (out of B): B2, B8, B13, B14 — see
  their rows in the table below. All four turned out to be port forwarders
  or port-slice catalogs, not composition aggregators; they moved to A.
  These rows remain in the B-table for traceability — **the row ID prefix
  is historical**, the "Cat" column is authoritative.
- **No `B?` entries remain.** All structural reads are done.

| # | Site (shim) | Defaults target | Cat | Action |
|---|-------------|-----------------|-----|--------|
| B1 | `application/converged/convergedDependencyDefaults.ts:69` | `defaults/converged/convergedDependencyDefaults.ts` | B | CLI imports aggregator; passes to `emitConverged*`. Shim deletes. |
| B2 | `application/converged/summaryVerifierConsistencyGateArtifactDefaults.ts:19` | `defaults/reviewer/summaryVerifierConsistencyGateDefaults.ts` | **A** (reclassified) | Completed in Batch 12: the write port is now part of `convergedDependencyDefaults.validation`; the standalone application artifact shim was deleted. |
| B3 | `application/create/createBubbleDefaults.ts:28` | `defaults/create/createBubbleDefaults.ts` | B | Verified: target aggregates infrastructure adapters plus shared shims. Composition. |
| B4 | `application/delete/deleteBubbleDependencyDefaults.ts:133` | `defaults/delete/deleteBubbleDefaults.ts` | B | Verified: heavy composition (multiple `infrastructure/` adapters + sibling `defaults/` + shared shims). Mirrors merge in shape. |
| B5 | `application/merge/mergeCommandDefaults.ts:54` | `defaults/merge/mergeCommandDefaults.ts` | B | Verified. CLI passes to `emitMerge`. |
| B6 | `application/metaReview/emitMetaReviewV11.ts:49` | `defaults/metaReview/metaReviewDefaults.ts` | B | Verified: target aggregates 3 infrastructure adapters. Composition. |
| B7 | `application/metaReviewGate/metaReviewGateCommandDefaults.ts:79` | `defaults/metaReviewGate/metaReviewGateCommandDefaults.ts` | B | Verified. CLI passes the aggregator. |
| B8 | `application/pass/passReviewVerificationDefaults.ts:24` | `defaults/reviewer/reviewVerificationArtifactDefaults.ts` | **A** (reclassified) | Completed in Batch 17: pass review-verification resolve/write ports are now supplied through the existing pass-validation defaults aggregate; the standalone application shim was deleted. |
| B9 | `application/pass/passValidationCommandDefaults.ts:121` | `defaults/pass/passValidationCommandDefaults.ts` | B | Verified. CLI passes the aggregator. |
| B10 | `application/pass/reviewerDeliveryDefaults.ts:33` | `defaults/reviewer/reviewerDeliveryDefaults.ts` | B | Verified. |
| B11 | `application/reconcile/reconcileCommandDefaults.ts:25` | `defaults/reconcile/reconcileCommandDefaults.ts` | B | Completed in Batch 24: CLI now statically imports the reconcile defaults aggregate plus the state read port and passes them into the application reconcile command; the standalone application shim was deleted. |
| B12 | `application/restart/restartCommandDefaults.ts:29` | `defaults/restart/restartCommandDefaults.ts` | B | Completed in Batch 25: CLI and UI composition now pass `restartBubbleDependencyDefaults` explicitly; the application restart API no longer loads defaults dynamically and the standalone application shim was deleted. |
| B13 | `application/reviewer/reviewerArtifactDefaults.ts:22` | `defaults/reviewer/reviewerArtifactDefaults.ts` | **A** (reclassified) | Completed in Batch 13: reviewer brief/focus artifact readers are now supplied through the existing start and reviewer-delivery defaults aggregates; the standalone application shim was deleted. |
| B14 | `application/reviewer/reviewerTestEvidenceDefaults.ts:30` | `defaults/reviewer/reviewerTestEvidenceDefaults.ts` | **A** (reclassified) | Completed in Batch 14: reviewer test-evidence ports are now supplied through start, converged, and reviewer-delivery defaults aggregates; the standalone application shim was deleted. |
| B15 | `application/start/startBubbleDependencyDefaults.ts:63` | `defaults/start/startBubbleDefaults.ts` | B | Verified. |
| B16 | `application/status/statusCommandDependencyDefaults.ts:26` | `defaults/list/listCommandDefaults.ts` | B | Verified: target imports many infrastructure adapters directly (config loader, remote artifact reads/writes, SSH bubble status, repo resolution, list bubble workspace, ...). Same target as S7; resolution-strategy for the *shared* side is the S5/S7 modelling call. CLI passes the aggregator on the application side. |
| B17 | `application/stop/stopCommandDefaults.ts:29` | `defaults/stop/stopCommandDefaults.ts` | B | Verified: target has no direct `infrastructure/` imports, but aggregates 5 sibling defaults (`bubbleLookup`, `runtimeSessions`, `state`, `tmuxSession`) plus `stopCancellationMutation`. Composition by transitive aggregation. |
| B18 | `application/watchdog/watchdogDependencyDefaults.ts:77` | `defaults/watchdog/watchdogCommandDefaults.ts` | B | Verified. |
| B19 | `application/watchdog/watchdogDependencyDefaults.ts:87` | `defaults/watchdog/watchdogPendingReworkDefaults.ts` | B | Verified: target aggregates 2 concrete adapters (`ensureBubbleInstanceIdForMutation` from sibling defaults, `resolveDeliveryMessageRef` from infrastructure tmuxDelivery). Composition. |

For B-category entries the application shim file becomes redundant and is
deleted. The CLI gains an import from the corresponding `defaults/` file and
passes the result.

---

### Application — Category D (`*CliCommand.ts` — move with ownership inversion, 3 sites)

All three files are CLI shells (verified v4). Resolution: **move the
content to `src/cli/commands/bubble/<cmd>.ts` with ownership inversion**.

Important context: `src/cli/commands/bubble/{commit,create,extract}.ts`
already exist, but each is a one-line re-export back to the application
file (`export * from "../../../v11/application/<cmd>/<cmd>CliCommand.js"`).
This re-export is itself the camouflage — the CLI surface is nominally in
the right place but the code is not. The fix replaces these re-export
files with the actual content.

After the move per file:

- `src/cli/commands/bubble/<cmd>.ts` contains the parsing, help text,
  rendering, and runner-delegation code, plus a static import from the
  appropriate `defaults/` module.
- `src/v11/application/<cmd>/*CliCommand.ts` deletes. Any non-CLI
  orchestration logic that was tangled into it folds into the existing
  application command API (or its own application file).

| # | Site | Defaults target | Cat | Action |
|---|------|-----------------|-----|--------|
| D1 | `application/commit/commitCliCommand.ts:32` | `defaults/commit/commitCommandDefaults.ts` | D | Move content to `src/cli/commands/bubble/commit.ts`; static import of `commitCommandDefaults`; delete `application/commit/commitCliCommand.ts`; replace the existing one-line re-export at `src/cli/commands/bubble/commit.ts`. |
| D2 | `application/create/createCliCommand.ts:38` | `defaults/repoRegistry/repoRegistryDefaults.ts` | D | Move content to `src/cli/commands/bubble/create.ts`; static import of `repoRegistryDefaults` (port adapter); delete `application/create/createCliCommand.ts`; replace the existing one-line re-export. |
| D3 | `application/extract/extractCliCommand.ts:31` | `defaults/extract/extractCommandDefaults.ts` | D | Move content to `src/cli/commands/bubble/extract.ts`; static import of `extractCommandDefaults`; delete `application/extract/extractCliCommand.ts`; replace the existing one-line re-export. |

---

### Application — Category C (misplaced command-local logic; 1 site)

This category is for `defaults/<X>/...` files that contain **pure
command-local logic with no `infrastructure/` import**. They are misplaced
as "defaults"; they belong under `application/<command>/`. Resolution: move
the file, replace dynamic shim with static import.

| # | Site | Defaults target | Cat | Action |
|---|------|-----------------|-----|--------|
| C1 | `application/reply/replyCommandApi.ts:36` | `defaults/reply/replyMutationExecution.ts` | C | Move `defaults/reply/replyMutationExecution.ts` → `application/reply/mutation/replyMutationExecution.ts`. Replace the dynamic shim in `replyCommandApi.ts` with a static import. The mutation function already takes its IO ports as `input.dependencies.*`; no contract change needed. |

Verified by reading `defaults/reply/replyMutationExecution.ts`: imports are
`node:path`, `shared/state/executionContext.js`, `domain/state/machine.js`,
`domain/reply/replyEnvelopeDraft.js`, `domain/reply/postAppendStateWriteFailure.js`,
and an `application/reply/replyMutationExecutionContract.ts` type. The
implementation should live under `application/reply/mutation/` so the boundary
fitness rule treats it as an explicit mutation executor, not as an
orchestrator. **Zero
`infrastructure/` AND zero `defaults/` imports.** It takes its IO ports as
`input.dependencies.*` parameters. This is pure application-layer logic;
the "defaults" location was a misplacement.

Discriminator note for the `B?` review pass: a `defaults/<X>` file with no
`infrastructure/` import but pulls sibling `defaults/` files (e.g.
`defaults/stop/stopCommandDefaults.ts`) is **still B** — it owns
composition transitively. C requires zero `infrastructure/` AND zero
`defaults/` imports.

---

## S5/S7 Refactor Scope

S5 and S7 resolution path (decided v4): **refactor caller out of
`shared/`**. Three shared subdirectories are misplaced and move to
`application/`. The shims inside them disappear as part of the move.

This is the only entry in the inventory whose blast radius extends
beyond the 45 flagged sites — about ~15 file moves, none of them
mechanical port-DI. It is a self-contained refactor PR (or sequence of
PRs) that the inventory references but does not fully detail. The list
below is the scope envelope.

### Files moving to `application/`

**`shared/read-model/list/` → `application/list/` (or `application/list/read-model/`):**

- `listReadModelApi.ts`
- `listReadModelContext.ts`
- `listReadModelEntryBuilder.ts`
- `listReadModelEntryProjection.ts` (the policy-heavy file: review policy,
  meta-review delivery, watchdog status, runtime alignment)
- `listReadModelErrors.ts`
- `listRemotePaneActivityRead.ts`
- `listReadModelDefaults.ts` — the shim itself; **does not become a static
  `application/ → defaults/` import after the move** (that would just
  re-introduce the same boundary violation in non-dynamic form). Instead
  the moved application API takes its dependencies as an explicit
  parameter; the CLI (composition root) builds them from
  `defaults/list/listCommandDefaults.ts` and injects. The shim file
  deletes outright; its responsibility is absorbed by the new API
  signature plus CLI wiring.

**`shared/status/` → `application/status/` (selective):**

- `statusCommandApi.ts`
- `statusCommandGateState.ts`
- `statusCommandInternals.ts`
- `statusCommandPathView.ts`
- `statusCommandViewBuilder.ts`
- `statusCommandDependencyDefaults.ts` — the shim; same rule as
  `listReadModelDefaults.ts` above. **Does not become a static
  `application/ → defaults/` import.** The moved status API takes
  dependencies as a parameter; the CLI (composition root) injects from
  `defaults/` modules. The shim file deletes; this resolves S7, S8, and S9
  together since they are three entries in the same shim file.

**Stays in `shared/` (verified v5)**:

- `bubbleAttention.ts` — has a non-application caller
  (`infrastructure/ui/presenters/bubblePresenter.ts`). Not blindly moved
  with the rest of the cluster. Either stays in `shared/status/` as a
  policy-light projection helper that the UI presenter and the moved
  application code both reference, or carved out as a separate
  UI-presenter helper boundary in a follow-up. Not part of the S5/S7
  mechanical move.

**`shared/bubbleInbox/` → `application/bubbleInbox/`** (or
`application/status/inbox/`, depending on whether it has its own
command/API surface):

- `bubbleInboxReadModel.ts`

### Files staying in `shared/`

Pure DTO/contract types that are legitimately shared across application,
infrastructure, and UI boundaries (verified v5):

- `shared/read-model/list/listReadModelContract.ts` — **stays**. Verified
  non-application callers: `src/v11/infrastructure/ui/eventsFingerprint.ts`,
  `src/v11/infrastructure/ui/eventsScan.ts`,
  `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`,
  `src/contracts/ui/uiReadModel.ts`, plus the UI app
  (`ui/src/lib/types.ts`, `ui/src/lib/contracts/uiReadModel.ts`).
- `shared/status/remoteBubbleStatusContract.ts` — SSH boundary contract.
- `shared/status/statusCommandTypes.ts` — pure DTO/type aliases composed
  from port types.
- `shared/status/statusCommandViewProjection.ts` — pure projection DTO/helper
  shared by the moved application status view builder and SSH status payload
  normalization. Keeping it in `shared/` avoids an
  `infrastructure → application` dependency edge.
- `shared/status/bubbleAttention.ts` — UI presenter consumes it; see note
  in the previous subsection.

### Effect on the inventory

The S5/S7 refactor closes:

- S5 (`shared/read-model/list/listReadModelDefaults.ts:73`) — file moves
  to application, shim disappears.
- S7 (`shared/status/statusCommandDependencyDefaults.ts:116`) — file moves
  to application, shim disappears (along with S8 and S9 since they are
  three entries in the same file).
- The `defaults/list/listCommandDefaults.ts` aggregator (target of S5,
  S7, B16) stays in `defaults/`; the CLI imports the aggregator and
  passes its dependencies into the moved application API. The application
  code itself does not import `defaults/list/` — same B-pattern as
  elsewhere.

S8 and S9 are technically not S5/S7 (different defaults targets), but
they live in the same shim file (`statusCommandDependencyDefaults.ts`)
and disappear together when the file moves.

---

## Per-File Move Summary

After all 45 entries are resolved, the following file changes occur. **All
counts are approximate** and will reconcile during execution; the inventory
table is the source of truth, this section is a back-of-envelope orientation.

- **Deleted (application shim files)**: ~15-17 files (approx). Every
  `*DependencyDefaults.ts` in `application/` whose only role was to
  dynamic-load from defaults.
- **Deleted (shared shim files)**: ~6-8 files (approx). The shared shims
  that are pure A-pattern forwarders go away cleanly. Two entries (S1
  `actorEmitContext`, S5/S7 `statusCommandDependencyDefaults` /
  `listReadModelDefaults`) may resolve via caller refactor instead of file
  delete; those are not stable count entries.
- **Moved (D-category)**: 3 files from `application/<cmd>/*CliCommand.ts`
  to `src/cli/commands/bubble/<cmd>.ts` with ownership inversion (the
  existing one-line re-export files at the destination are replaced with
  actual content; the application-side files delete).
- **Moved (C-category)**: 1 file (`replyMutationExecution.ts` from
  `defaults/reply/` → `application/reply/`). All `B?` entries are now
  classified; no further C reclassifications expected.
- **Moved (S5/S7 refactor)**: ~12-14 files from `shared/read-model/list/`,
  `shared/status/`, and `shared/bubbleInbox/` to `application/`. See
  "S5/S7 Refactor Scope" for the file list and the stays-in-shared
  exceptions (`listReadModelContract.ts`, `remoteBubbleStatusContract.ts`,
  `statusCommandTypes.ts`, `bubbleAttention.ts`).
- **Modified (CLI)**: ~12-15 CLI entry files (approx, one per command)
  gain a defaults import and a `dependencies` argument on the corresponding
  application call.
- **Unchanged (`defaults/**`)**: all confirmed B-category files remain in
  place. They are the catalog. The CLI is now their only consumer.
- **New types under `shared/ports/`**: only the genuine slice types where
  2+ ports cluster — currently `stateCapabilities.ts` and
  `transcriptCapabilities.ts`. The reviewer-artifact triple (B8/B13/B14
  reclassified to A) likely produces three further slice files under
  `shared/ports/reviewer/` (`reviewVerificationArtifactCapabilities.ts`,
  `reviewerBriefArtifactCapabilities.ts`,
  `reviewerTestEvidenceCapabilities.ts`), one per cohesive cluster. **All
  other A-entries reuse existing single-port types**, no new wrapper files.
- **No new port slice for list.** S5/S7 path picked (v4) is "refactor
  caller out of `shared/`", not "extract list port". The list composition
  aggregator stays in `defaults/list/` and the moved application code
  takes its dependencies as a parameter, injected by the CLI.

---

## Settled Decisions and Remaining Choice

### Settled

- **All B-classifications** (v2 + v3). Verification log:
  - v2: B2 → A, B8 → A, B13 → A, B14 → A (port forwarders, not
    composition); B16 → B (direct infra), B17 → B (transitive
    aggregation), B19 → B (2 adapters).
  - v3: B3, B4, B6, B11 → all confirmed B (composition aggregators of
    varied shape).
- **S5/S7 path** (v4): refactor caller out of `shared/`. Concrete file
  list in "S5/S7 Refactor Scope".
  - `bubbleAttention.ts` **stays in `shared/`** — non-application caller
    verified (`infrastructure/ui/presenters/bubblePresenter.ts`).
  - `listReadModelContract.ts` **stays in `shared/`** — UI/infra/UI-app
    callers verified.
- **D-classification** (v4): all three `*CliCommand.ts` files are CLI
  shells. Move with ownership inversion.
- **Post-move dependency wiring** (v5): moved `application/` files
  resolve their `defaults/` dependencies via explicit `dependencies`
  parameter injected by the CLI, **not** via static `application/ →
  defaults/` imports.

### Remaining choice

- **CLI assembly location**: per-command inline in each
  `src/cli/commands/bubble/<cmd>.ts`, or via a shared
  `src/cli/runtime/buildCapabilities.ts` factory? (Lean: per-command
  inline for the migration; revisit only if duplication becomes painful.
  Either choice is reversible without re-touching the application or
  defaults sides.)

---

## Fitness Closing Step

In the closing PR:

1. Remove `severity: "warn"` branch from
   `tools/fitness/checks/application-defaults-boundary.ts` and
   `tools/fitness/checks/shared-defaults-boundary.ts`. Every dynamic detection
   becomes hard-fail.
2. Keep the dynamic-detection logic itself (the static-string-binding
   resolution, the no-arg path-helper resolution, the `[...].join("/")`
   resolution). It is the regression bound that prevents the pattern from
   re-emerging.
3. Run `pnpm fitness:check:ci`; it must report zero violations.
4. Add a regression test that constructs a synthetic dynamic-import shim and
   asserts `application_defaults_boundary` fails on it.

---

## Execution Log

### 2026-05-07 — Batch 1: D1-D3 CLI ownership inversion

- Moved `commit`, `create`, and `extract` CLI command ownership from
  `src/v11/application/**` into `src/cli/commands/bubble/**`.
- Removed the three application-layer dynamic defaults shims:
  `commitCliCommand.ts`, `createCliCommand.ts`, and `extractCliCommand.ts`.
- Replaced those shims with static CLI-side defaults imports, making the CLI
  command modules the composition boundary for these three commands.
- Moved the create CLI parser/help/runner helper cluster into the CLI layer,
  leaving the application create API and flow implementation in place.
- Added `createCommandErrors.ts` so application reviewer-focus parsing no
  longer depends on a CLI validation helper.
- Updated the CLI entrypoint boundary guard to classify the migrated commands
  as real CLI modules and the create helper files as explicit CLI helpers.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 35 to 32; shared dynamic defaults warnings remain 10.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=32`, `shared_defaults_boundary=10`).
  - `pnpm exec vitest run tests/cli/bubbleCommitCommand.test.ts tests/cli/bubbleExtractCommand.test.ts tests/cli/createCommand.test.ts tests/cli/createCliRunner.test.ts tests/cli/createCliRunHelpers.test.ts`
    passed.
  - `pnpm exec vitest run tests/contracts/v11/cli-entrypoint-boundary-guard.test.ts`
    passed after updating the guard.
  - `pnpm test` rerun reached only one unrelated flaky
    `tests/core/util/fileLock.test.ts` timeout; rerunning that file passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 2: C1 reply mutation move

- Moved reply mutation implementation out of `src/v11/defaults/reply/` and
  into `src/v11/application/reply/mutation/replyMutationExecution.ts`.
- Replaced the dynamic import in `replyCommandApi.ts` with a static
  application-local import.
- Refined the boundary fitness rule to match its declared scope:
  orchestrators may not write state/transcript directly, while explicit
  `src/v11/application/<command>/mutation/**` mutation executors are allowed
  and still checked by the mutation fitness rule for transcript-first ordering.
- Added typed `mutation_executor` policy-exception support for non-standard
  mutation executor paths; the reply move uses the directory convention, not a
  policy exception.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 32 to 31; shared dynamic defaults warnings remain 10.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with
    `mutation_execution_convention_files=1` and the expected remaining
    warnings (`application_defaults_boundary=31`,
    `shared_defaults_boundary=10`).
  - `pnpm exec vitest run tests/tools/fitness/boundary.test.ts tests/core/human/reply.test.ts tests/v11/application/reply/replyDeliveryInvariant.test.ts tests/cli/bubbleReplyCommand.test.ts tests/contracts/v11/reply.contract.test.ts`
    passed.
  - `pnpm build` passed.
  - `pnpm test` rerun reached only two unrelated
    `tests/v11/application/planWatch/agentRunnerBridge.test.ts` timeout/exit
    race failures; rerunning that file passed.

### 2026-05-07 — Batch 3: S5 list read-model move

- Moved the list read-model workflow out of
  `src/v11/shared/read-model/list/**` and into
  `src/v11/application/list/**`.
- Kept `shared/read-model/list/listReadModelContract.ts` in shared as the
  cross-boundary DTO contract.
- Deleted `shared/read-model/list/listReadModelDefaults.ts` instead of
  replacing it with a static application-to-defaults import.
- Added `ListReadModelDependencies`; `listBubbles` now takes explicit
  dependencies and no longer resolves default runtime wiring inside the
  read-model workflow.
- Moved the `list` CLI command implementation from the application layer into
  `src/cli/commands/bubble/list.ts`, where the CLI statically injects
  `defaults/list/listCommandDefaults.ts`.
- Updated UI defaults/events composition so infrastructure receives a
  `listBubbles` port instead of importing application read-model code.
- Updated contract guards and tests to reflect that `list` is now a real CLI
  module, not a direct application CLI shim.
- Fitness result after the batch: application dynamic defaults warnings remain
  31; shared dynamic defaults warnings are down from 10 to 9. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=31`, `shared_defaults_boundary=9`).
  - `pnpm exec vitest run tests/core/bubble/listBubbles.test.ts tests/v11/application/list/listCommandApi.test.ts tests/v11/application/list/listCommandApiError.test.ts tests/core/bubble/parallelBubblesSmoke.test.ts tests/core/bubble/parallelBubblesSoak.test.ts tests/core/ui/eventsScan.test.ts tests/core/ui/events.test.ts tests/core/ui/router.test.ts tests/core/ui/server.integration.test.ts`
    passed.
  - `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts tests/contracts/v11/cli-entrypoint-boundary-guard.test.ts`
    passed after updating the guards.
  - `pnpm test` passed (`433` root test files, `3719` root tests; `18` UI
    test files, `229` UI tests).
  - `pnpm build` passed.

### 2026-05-07 — Batch 4: inbox read-model move

- Moved `bubbleInboxReadModel.ts` from `src/v11/shared/bubbleInbox/` to
  `src/v11/application/inbox/`.
- Updated `emitInboxV11` and UI router wiring to use the application-owned
  inbox read model.
- Moved the inbox read-model unit test from `tests/v11/shared/**` to
  `tests/v11/application/**`.
- Kept UI infrastructure from importing application code directly:
  `defaults/ui/routerDefaults.ts` owns the default `getBubbleInbox` binding,
  while `routerDependencies.ts` receives it through the existing UI defaults
  loader.
- Replaced the inbox workflow's dependency on the status-defaults aggregate
  with the existing application-local bubble lookup, state, and transcript
  port shims. This keeps the move structural without adding a new direct
  `application -> defaults` static import.
- Fitness result after the batch: dynamic warning counts are unchanged
  (`application_defaults_boundary=31`, `shared_defaults_boundary=9`) because
  this workflow was a structural shared-layer move rather than one of the
  dynamic warning sites. Hard-fail fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings.
  - `pnpm exec vitest run tests/v11/application/inbox/bubbleInboxReadModel.test.ts tests/core/bubble/inboxBubble.test.ts tests/core/ui/router.test.ts tests/contracts/uiContractTransitSource.test.ts`
    passed.
  - `pnpm test` passed (`433` root test files, `3719` root tests; `18` UI
    test files, `229` UI tests).
  - `pnpm build` passed.

### 2026-05-07 — Batch 5: status read-model move

- Moved the status workflow implementation out of `src/v11/shared/status/`
  into `src/v11/application/status/`:
  `statusCommandApi.ts`, `statusCommandGateState.ts`,
  `statusCommandInternals.ts`, `statusCommandPathView.ts`, and
  `statusCommandViewBuilder.ts`.
- Kept pure shared status contracts/projections in `src/v11/shared/status/`:
  `remoteBubbleStatusContract.ts`, `statusCommandTypes.ts`,
  `statusCommandViewProjection.ts`, and `bubbleAttention.ts`.
  `statusCommandViewProjection.ts` stays shared because SSH status payload
  normalization also consumes those projection types; moving it to
  application would create an `infrastructure -> application` edge.
- Deleted the shared status defaults shim and moved full runtime wiring to
  `src/v11/defaults/status/statusCommandDependencyDefaults.ts`.
- Changed the application status API to receive explicit dependencies for
  bubble lookup, state inspection, transcript reads, review/doc gate artifact
  reads, watchdog pane activity, and remote status ports.
- Left the existing narrower `application/status/statusCommandDependencyDefaults.ts`
  in place for the separate approval/attach remote-status path; that remains
  the already-inventoried B16 application-side warning and is not part of the
  shared S7-S9 removal.
- Updated commit/merge/delete/UI defaults and status tests to consume the new
  `defaults/status` aggregate instead of the deleted shared shim.
- Fitness result after the batch: application dynamic defaults warnings remain
  31; shared dynamic defaults warnings are down from 9 to 6. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=31`, `shared_defaults_boundary=6`).
  - `pnpm exec vitest run tests/core/bubble/statusBubble.test.ts tests/cli/bubbleStatusCommand.test.ts tests/v11/application/status/statusCliValueFormatters.test.ts tests/core/ui/router.test.ts tests/contracts/uiContractTransitSource.test.ts tests/tools/fitness/sharedDefaultsBoundary.test.ts tests/tools/fitness/dependency.test.ts`
    passed.
  - `pnpm test` passed (`433` root test files, `3719` root tests; `18` UI
    test files, `229` UI tests).
  - `pnpm build` passed.

### 2026-05-07 — Batch 6: remove unused shared meta-review defaults shim

- Deleted `src/v11/shared/metaReview/metaReviewDependencyDefaults.ts`.
- Verified the live meta-review submit preparation already imports the
  application-local `src/v11/application/metaReview/metaReviewDependencyDefaults.ts`;
  there were no remaining source/test callers of the shared shim.
- Fitness result after the batch: application dynamic defaults warnings remain
  31; shared dynamic defaults warnings are down from 6 to 5. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=31`, `shared_defaults_boundary=5`).
  - `pnpm exec vitest run tests/v11/application/metaReview/metaReviewGateEmit.test.ts tests/contracts/v11/metaReviewSubmitCoverage.test.ts tests/tools/fitness/sharedDefaultsBoundary.test.ts`
    passed.
  - `pnpm test` skipped for this deletion-only unused-shim batch; the previous
    Batch 5 full-suite run passed immediately before this change, and the
    targeted meta-review/fitness coverage above exercises the affected import
    surface.
  - `pnpm build` passed.

### 2026-05-07 — Batch 7: remove shared transcript defaults facade

- Replaced defaults-layer imports of
  `src/v11/shared/transcript/transcriptDependencyDefaults.ts` with direct
  imports from `src/v11/defaults/transcript/transcriptDependencyDefaults.ts`.
- Deleted the shared transcript defaults facade.
- Kept application-local transcript shims unchanged; those are separately
  inventoried application warnings and remain part of the later A-category
  migration.
- Fitness result after the batch: application dynamic defaults warnings remain
  31; shared dynamic defaults warnings are down from 5 to 4. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=31`, `shared_defaults_boundary=4`).
  - `pnpm exec vitest run tests/core/bubble/commitBubble.test.ts tests/core/agent/converged.test.ts tests/core/bubble/createBubble.test.ts tests/core/bubble/watchdogBubble.test.ts tests/contracts/v11/metaReviewSubmitCoverage.test.ts tests/tools/fitness/sharedDefaultsBoundary.test.ts`
    passed.
  - `pnpm test` skipped for this defaults-import rewiring batch; Batch 5 had
    just completed the full suite, and this batch ran targeted coverage over
    every changed defaults consumer family.
  - `pnpm build` passed.

### 2026-05-07 — Batch 8: actor context dependency injection and state/bubble lookup facade removal

- Changed `src/v11/shared/actorProtocol/actorEmitContext.ts` so actor context
  resolution receives explicit dependencies for workspace resolution, bubble
  lookup, and state reads.
- Added `src/v11/defaults/actorProtocol/actorEmitContextDefaults.ts` as the
  default runtime wiring wrapper used by the CLI and convenience tests.
- Updated defaults-layer commit/merge/delete/extract/watchdog/meta-review-gate
  wiring to import `defaults/bubbleLookup` and `defaults/state` directly
  instead of going through shared facades.
- Deleted `src/v11/shared/bubbleLookup/bubbleLookupDefaults.ts` and
  `src/v11/shared/state/stateStoreDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings remain
  31; shared dynamic defaults warnings are down from 4 to 1. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=31`, `shared_defaults_boundary=1`).
  - `pnpm exec vitest run tests/cli/agentEmitCommand.test.ts tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts tests/v11/application/converged/emitConvergedV11.test.ts tests/core/bubble/commitBubble.test.ts tests/core/bubble/mergeBubble.test.ts tests/core/bubble/deleteBubble.test.ts tests/core/bubble/watchdogBubble.test.ts tests/contracts/v11/metaReviewSubmitCoverage.test.ts tests/tools/fitness/sharedDefaultsBoundary.test.ts`
    passed.
  - `pnpm test` skipped for this focused shared-facade removal batch; Batch 5
    had already completed the full suite, and this batch ran targeted coverage
    across actor emit plus every changed defaults consumer family.
  - `pnpm build` passed.

### 2026-05-07 — Batch 9: move bubble event defaults out of shared

- Changed `src/v11/shared/metrics/bubbleEvents.ts` into a contract-only
  module that exports the lifecycle-event input and emitter port types.
- Moved the default lifecycle-event implementation to
  `src/v11/defaults/metrics/bubbleEvents.ts`, next to the metrics defaults
  catalog it composes.
- Added `src/v11/application/metrics/bubbleEvents.ts` as a temporary
  application-local dynamic shim for existing application callers. This keeps
  `application -> defaults` static imports out of the dependency graph while
  the later application A/B migration removes the remaining application shims.
- Updated application/defaults/infrastructure callers and metrics tests to
  import from the correct layer-specific module.
- Fitness result after the batch: shared dynamic defaults warnings are down
  from 1 to 0 and `shared_defaults_boundary` now passes. Application dynamic
  defaults warnings are 32 because the temporary application metrics shim is
  now counted with the remaining application-side shim inventory.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with
    `shared_defaults_boundary=0` and the expected remaining application
    warnings (`application_defaults_boundary=32`).
  - `pnpm exec vitest run tests/v11/shared/metrics/bubbleEvents.test.ts tests/v11/application/askHuman/askHumanFinalizationDependencyResolution.test.ts tests/v11/application/askHuman/askHumanFinalizationDependencyBuilder.test.ts tests/core/bubble/bubbleInstanceId.test.ts tests/core/bubble/commitBubble.test.ts tests/core/bubble/mergeBubble.test.ts tests/core/bubble/deleteBubble.test.ts tests/core/bubble/startBubble.test.ts tests/core/agent/pass.test.ts tests/core/agent/converged.test.ts tests/core/bubble/watchdogBubble.test.ts tests/tools/fitness/sharedDefaultsBoundary.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`13` files, `369` tests).
  - `pnpm test` skipped for this focused shared-facade removal batch; Batch 5
    had completed the full suite earlier in the same migration, and this batch
    ran targeted coverage across metrics, lifecycle callers, and the relevant
    fitness checks.
  - `pnpm build` passed.

### 2026-05-07 — Batch 10: remove repo-registry application shim from start CLI wiring

- Moved the start CLI runner/options surface from
  `src/v11/application/start/startCli*.ts` into
  `src/cli/commands/bubble/start*.ts`, replacing the previous CLI re-export
  with real CLI-owned code.
- Changed the start CLI runner to use
  `src/v11/defaults/start/startCliDefaults.ts` directly from the CLI layer
  for bubble lookup and repository registration.
- Removed the now-unused `startCliDependencyDefaults` export from
  `src/v11/application/start/startCommandDependencyDefaults.ts`.
- Deleted `src/v11/application/repoRegistry/repoRegistryDependencyDefaults.ts`;
  repository registration default wiring is now only consumed from the CLI
  composition side.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 32 to 31; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=31`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/cli/bubbleStartCommand.test.ts tests/contracts/v11/start.contract.test.ts tests/contracts/v11/start.contract.runner.ts tests/tools/fitness/dependency.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`4` files, `46` tests).
  - `pnpm test` skipped for this focused CLI/default-shim ownership batch;
    the targeted CLI, start-contract, dependency-fitness, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm build` passed.

### 2026-05-07 — Batch 11: inject meta-review runtime sessions from defaults wrapper

- Added `readRuntimeSessionsRegistry` to
  `src/v11/defaults/metaReview/metaReviewDefaults.ts` so the existing
  meta-review defaults aggregate owns this runtime-session port binding.
- Changed `submitMetaReviewResultV11` default resolution to inject
  `readRuntimeSessionsRegistry` through `withMetaReviewDefaults`.
- Removed the runtime-sessions fallback from the application submit
  preparation path; direct `submitMetaReviewResult` now remains an explicit
  dependency API for runtime-session reads.
- Deleted `src/v11/application/metaReview/metaReviewDependencyDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 31 to 30; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=30`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/contracts/v11/metaReviewSubmitCoverage.test.ts tests/core/human/approval.test.ts tests/core/bubble/commitBubble.test.ts tests/core/runtime/restartRecovery.test.ts tests/v11/shared/metaReview/metaReviewCommandSubmitValidation.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`6` files, `70` tests).
  - `pnpm test` skipped for this focused meta-review runtime-session wiring
    batch; the targeted meta-review submit, approval, commit, restart recovery,
    and application-defaults-fitness tests cover the changed behavior.
  - `pnpm build` passed.

### 2026-05-07 — Batch 12: fold summary-verifier artifact writer into converged defaults

- Added `writeSummaryVerifierConsistencyGateArtifact` to
  `src/v11/defaults/converged/convergedDependencyDefaults.ts` under the
  existing `validation` dependency group.
- Updated the application-side converged defaults contract and validation
  preparation fallback to read the writer from
  `convergedDependencyDefaults.validation`.
- Deleted
  `src/v11/application/converged/summaryVerifierConsistencyGateArtifactDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 30 to 29; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=29`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/v11/application/converged/convergedValidationPreparation.test.ts tests/core/agent/converged.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`3` files, `41` tests).
  - `pnpm test` skipped for this focused converged validation dependency
    rewiring batch; the targeted converged validation, converged flow, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm build` passed.

### 2026-05-07 — Batch 13: route reviewer artifact readers through command defaults

- Added reviewer brief/focus artifact readers to
  `src/v11/defaults/start/startBubbleDefaults.ts` and its application-side
  dynamic contract so start resume context receives them from the start
  defaults aggregate.
- Added reviewer brief/focus artifact readers to
  `src/v11/defaults/reviewer/reviewerDeliveryDefaults.ts` and exposed them
  through the existing application reviewer-delivery defaults wrapper.
- Updated start dependency resolution and pass reviewer delivery fallback to
  use those command-owned defaults instead of importing a standalone
  application reviewer artifact shim.
- Deleted `src/v11/application/reviewer/reviewerArtifactDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 29 to 28; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=28`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/v11/application/pass/reviewerDelivery.test.ts tests/v11/application/start/startCommandOrchestration.test.ts tests/core/bubble/startBubble.test.ts tests/core/agent/pass.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`5` files, `215` tests).
  - `pnpm test` skipped for this focused reviewer-artifact defaults rewiring
    batch; the targeted start, pass, reviewer-delivery, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm build` passed.

### 2026-05-07 — Batch 14: route reviewer test-evidence ports through command defaults

- Added reviewer test-evidence directive resolution to
  `src/v11/defaults/start/startBubbleDefaults.ts` and the application-side
  start defaults contract.
- Added reviewer test-evidence directive resolution to
  `src/v11/defaults/converged/convergedDependencyDefaults.ts` under the
  existing `validation` group.
- Added reviewer test-evidence verification, artifact write, and
  directive-from-artifact ports to `src/v11/defaults/reviewer/reviewerDeliveryDefaults.ts`
  and exposed them through the existing application reviewer-delivery defaults
  wrapper.
- Updated start dependency resolution, converged validation preparation, and
  pass reviewer-test directive resolution to consume those command-owned
  defaults.
- Deleted `src/v11/application/reviewer/reviewerTestEvidenceDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 28 to 27; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=27`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/v11/application/pass/reviewerTestDirectiveResolver.test.ts tests/v11/application/converged/convergedValidationPreparation.test.ts tests/v11/application/start/startCommandOrchestration.test.ts tests/core/bubble/startBubble.test.ts tests/core/agent/pass.test.ts tests/core/agent/converged.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`7` files, `252` tests).
  - `pnpm test` skipped for this focused reviewer test-evidence defaults
    rewiring batch; the targeted pass, converged, start, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm build` passed.

### 2026-05-07 — Batch 15: route doc-contract gate artifact ports through command defaults

- Added doc-contract gate artifact path/write ports to create dependencies and
  `src/v11/defaults/create/createBubbleDefaults.ts`; create persistence now
  consumes them from injected create dependencies.
- Added doc-contract gate artifact read/path/write ports to
  `src/v11/defaults/pass/passValidationCommandDefaults.ts` and exposed them
  through the existing application pass-validation defaults wrapper; pass flow
  wiring now calls the reviewer doc-gate updater with those ports explicitly.
- Added the doc-contract gate artifact path resolver to start defaults and
  threaded it into remote-start control-file preparation.
- Updated the doc-gate fail-open create test to use an injected failing write
  port instead of mocking the deleted application shim.
- Deleted `src/v11/application/gates/docContractGateArtifactDependencyDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 27 to 26; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm lint` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=26`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/core/bubble/createBubble.docContractGatesFailOpen.test.ts tests/core/bubble/createBubble.test.ts tests/core/agent/pass.test.ts tests/v11/application/start/startCommandRemoteExecution.test.ts tests/v11/application/pass/reviewerDocGateArtifactUpdater.test.ts tests/v11/application/pass/passFlowDependencyWiring.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`7` files, `220` tests).
  - `pnpm test` skipped for this focused doc-contract gate artifact defaults
    rewiring batch; the targeted create, pass, start remote execution, updater,
    wiring, and application-defaults-fitness tests cover the changed surface.
  - `pnpm build` passed.

### 2026-05-07 — Batch 16: route start tmux runner through start defaults

- Added `runTmux` to `src/v11/defaults/start/startBubbleDefaults.ts` and the
  application-side start defaults contract.
- Updated `src/v11/application/start/startCommandDependencyDefaults.ts` to
  resolve `runTmux` through the existing start defaults aggregate instead of
  the standalone tmux application shim.
- Removed the command-contract import edge from
  `src/v11/application/start/startBubbleDependencyDefaults.ts` by declaring the
  wrapper's structural port types locally; this prevents the new start defaults
  route from introducing a cycle.
- Deleted `src/v11/application/tmux/tmuxRunnerDependencyDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 26 to 25; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=25`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/v11/application/start/startCommandOrchestration.test.ts tests/core/bubble/startBubble.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`3` files, `85` tests).
  - `pnpm test` skipped for this focused tmux-runner defaults rewiring batch;
    the targeted start orchestration, start flow, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 17: route pass review-verification ports through pass-validation defaults

- Added review-verification input resolution and atomic artifact write ports to
  `src/v11/defaults/pass/passValidationCommandDefaults.ts` and exposed them
  through the existing application pass-validation defaults wrapper.
- Updated reviewer verification resolution, post-append review-verification
  artifact writing, and auto-converge preparation to use those pass-validation
  defaults instead of the standalone application review-verification shim.
- Deleted `src/v11/application/pass/passReviewVerificationDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 25 to 24; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=24`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/v11/application/pass/reviewerVerificationResolver.test.ts tests/v11/application/pass/postAppendReviewVerificationWriter.test.ts tests/v11/application/pass/autoConvergePreparation.test.ts tests/core/agent/pass.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`5` files, `138` tests).
  - `pnpm test` skipped for this focused review-verification defaults rewiring
    batch; the targeted resolver, post-append writer, auto-converge, pass flow,
    and application-defaults-fitness tests cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 18: remove process-spawn defaults shim

- Deleted `src/v11/application/process/processSpawnDependencyDefaults.ts`.
- Updated open and attach CLI wrappers to inject `processSpawnDefault` from the
  CLI/defaults composition side; the application command APIs now accept
  `ProcessSpawnPort` as an explicit dependency for default command execution.
- Updated start bootstrap execution so the CLI passes `ProcessSpawnPort` to the
  real default `startBubble` implementation, while preserving the one-argument
  contract for test/custom `startBubble` runners.
- Converted the start bootstrap default into a `ProcessSpawnPort`-backed
  factory; no `node:child_process` import remains in application command code.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 24 to 23; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=23`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/core/bubble/openBubble.test.ts tests/cli/bubbleOpenCommand.test.ts tests/core/bubble/attachBubble.test.ts tests/cli/bubbleAttachCommand.test.ts tests/v11/application/attach/attachBubbleV11.test.ts tests/core/bubble/startBubble.test.ts tests/cli/bubbleStartCommand.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`8` files, `184` tests).
  - `pnpm test` skipped for this focused process-spawn defaults rewiring batch;
    the targeted open, attach, start, CLI wrapper, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 19: remove workspace-resolution defaults shim

- Added `resolveBubbleFromWorkspaceCwd` to
  `src/v11/defaults/start/startBubbleDefaults.ts` and the application-side
  start defaults contract.
- Exposed the workspace-resolution port through
  `startCommandContextDefaults`, reusing the existing start defaults aggregate
  instead of adding another application-to-defaults route.
- Updated approval, ask-human routing preparation, and pass workspace context
  defaults to consume the workspace-resolution port from the start context
  defaults aggregate.
- Deleted `src/v11/application/workspace/workspaceResolutionDependencyDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 23 to 22; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=22`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/v11/application/askHuman/askHumanRoutingPreparationDependencyResolution.test.ts tests/v11/application/askHuman/askHumanRoutingPreparation.test.ts tests/v11/application/pass/passWorkspaceContextPreparation.test.ts tests/v11/application/approval/approvalCommandDependencyResolution.test.ts tests/v11/application/approval/runApprovalFlow.test.ts tests/core/bubble/workspaceResolution.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`7` files, `55` tests).
  - `pnpm test` skipped for this focused workspace-resolution defaults
    rewiring batch; the targeted approval, ask-human, pass, workspace, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 20: remove bubble-identity defaults shim

- Added `ensureBubbleInstanceIdForMutation` to
  `src/v11/defaults/start/startBubbleDefaults.ts` and the application-side
  start defaults contract.
- Exposed the bubble-identity mutation port through
  `startCommandContextDefaults`, reusing the same context aggregate as start,
  approval, reply, pass, and ask-human routing preparation.
- Updated pass workspace context and ask-human routing preparation defaults to
  consume `ensureBubbleInstanceIdForMutation` from the start context defaults
  aggregate.
- Deleted `src/v11/application/bubbleIdentity/bubbleIdentityDependencyDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 22 to 21; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=21`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/v11/application/askHuman/askHumanRoutingPreparationDependencyResolution.test.ts tests/v11/application/askHuman/askHumanRoutingPreparation.test.ts tests/v11/application/pass/passWorkspaceContextPreparation.test.ts tests/v11/application/approval/approvalCommandDependencyResolution.test.ts tests/v11/application/approval/runApprovalFlow.test.ts tests/core/bubble/bubbleInstanceId.test.ts tests/core/bubble/startBubble.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`8` files, `126` tests).
  - `pnpm test` skipped for this focused bubble-identity defaults rewiring
    batch; the targeted approval, ask-human, pass, bubble identity, start, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 21: remove bubble-lookup defaults shim

- Added `resolveBubbleById` to `src/v11/defaults/start/startBubbleDefaults.ts`
  and the application-side start defaults contract.
- Exposed the bubble lookup port through `startCommandContextDefaults`, keeping
  context-level command lookups on the same aggregate as state, identity, and
  workspace resolution.
- Updated open, attach, inbox, kickoff, meta-review submit preparation, and
  start context defaults to consume `resolveBubbleById` from the start context
  defaults aggregate.
- Deleted `src/v11/application/bubbleLookup/bubbleLookupDependencyDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 21 to 20; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=20`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/core/bubble/openBubble.test.ts tests/cli/bubbleOpenCommand.test.ts tests/core/bubble/attachBubble.test.ts tests/cli/bubbleAttachCommand.test.ts tests/core/bubble/kickoffBubble.test.ts tests/core/bubble/startBubble.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`7` files, `168` tests).
  - `pnpm exec vitest run tests/v11/application/inbox/bubbleInboxReadModel.test.ts tests/cli/bubbleInboxCommand.test.ts tests/contracts/v11/metaReviewSubmitCoverage.test.ts tests/core/runtime/metaReviewSubmitGuidance.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`5` files, `22` tests).
  - `pnpm test` skipped for this focused bubble-lookup defaults rewiring batch;
    the targeted open, attach, inbox, kickoff, meta-review submit, start, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 22: remove state-store defaults shim

- Added `readStateSnapshot`, `writeStateSnapshot`, and `inspectStateSnapshot`
  to `src/v11/defaults/start/startBubbleDefaults.ts` and the application-side
  start defaults contract.
- Exposed the state ports through `startCommandContextDefaults`, keeping state,
  identity, lookup, and workspace context capabilities on one existing aggregate.
- Updated approval, ask-human, inbox, kickoff, meta-review submit, pass,
  reconcile, reply, and start default paths to consume state ports from the
  start context defaults aggregate.
- Kept the `writeStateSnapshot` export as a port capability wrapper without a
  direct write-call shape in application code, so boundary/mutation/transition
  fitness checks continue to distinguish port wiring from mutation execution.
- Deleted `src/v11/application/state/stateStoreDependencyDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 20 to 19; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=19`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/core/bubble/kickoffBubble.test.ts tests/v11/application/pass/passWorkspaceContextPreparation.test.ts tests/v11/application/pass/postAppendStateWriter.test.ts tests/v11/application/pass/autoConvergePreparation.test.ts tests/v11/application/approval/runApprovalFlow.test.ts tests/v11/application/reply/replyCommandDependencyResolution.test.ts tests/v11/application/askHuman/askHumanRoutingPreparation.test.ts tests/v11/application/inbox/bubbleInboxReadModel.test.ts tests/contracts/v11/metaReviewSubmitCoverage.test.ts tests/core/bubble/startBubble.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`10` files, `150` tests).
  - `pnpm test` skipped for this focused state-store defaults rewiring batch;
    the targeted approval, ask-human, inbox, kickoff, meta-review submit, pass,
    reconcile-adjacent, reply, start, and application-defaults-fitness tests
    cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 23: remove transcript defaults shim

- Added `appendProtocolEnvelope` and `readTranscriptEnvelopes` to
  `src/v11/defaults/start/startBubbleDefaults.ts` and the application-side
  start defaults contract.
- Exposed transcript append/read ports through `startCommandContextDefaults`,
  alongside the state and context ports added in the preceding batches.
- Updated approval, ask-human, inbox, kickoff, meta-review submit,
  meta-review gate approval-request helpers, pass transcript defaults, reply,
  and start resume summary paths to consume transcript ports from the start
  context defaults aggregate.
- Kept the `appendProtocolEnvelope` export as a port capability wrapper without
  a direct append-call shape in application code, so boundary/mutation fitness
  checks continue to distinguish wiring from mutation execution.
- Deleted `src/v11/application/transcript/transcriptDependencyDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 19 to 18; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=18`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/core/bubble/kickoffBubble.test.ts tests/v11/application/pass/passRoutingPreparation.test.ts tests/v11/application/pass/normalPassAppendExecution.test.ts tests/v11/application/approval/runApprovalFlow.test.ts tests/v11/application/inbox/bubbleInboxReadModel.test.ts tests/contracts/v11/metaReviewSubmitCoverage.test.ts tests/core/bubble/startBubble.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`8` files, `125` tests).
  - `pnpm test` skipped for this focused transcript defaults rewiring batch;
    the targeted approval, ask-human-adjacent defaults, inbox, kickoff,
    meta-review submit, pass, reply-adjacent defaults, start, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 24: route reconcile defaults through CLI composition

- Replaced the CLI bubble reconcile re-export with a real CLI wrapper that
  statically imports `defaults/reconcile/reconcileCommandDefaults.ts` and the
  state read default, then passes the composed dependency set to the
  application reconcile command.
- Changed `reconcileRuntimeSessions` so the application API requires its
  default dependency set through explicit dependencies instead of loading the
  defaults module dynamically.
- Updated reconcile runtime and contract tests to provide an explicit
  test-local dependency aggregate, keeping the application API free of hidden
  default wiring.
- Deleted `src/v11/application/reconcile/reconcileCommandDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 18 to 17; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=17`, `shared_defaults_boundary=0`) and no
    error-context warnings.
  - `pnpm exec vitest run tests/cli/bubbleReconcileCommand.test.ts tests/v11/application/reconcile/reconcileCommandDependencyResolution.test.ts tests/v11/application/reconcile/runReconcileFlow.test.ts tests/core/runtime/startupReconciler.test.ts tests/core/runtime/restartRecovery.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`6` files, `25` tests).
  - `pnpm test` skipped for this focused reconcile defaults rewiring batch; the
    targeted CLI, reconcile dependency resolution, reconcile flow,
    startup/restart recovery, contract runner typecheck coverage, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

### 2026-05-07 — Batch 25: route restart defaults through composition

- Replaced the CLI bubble restart re-export with a real CLI wrapper that
  statically imports `defaults/restart/restartCommandDefaults.ts` and passes
  the composed defaults into the application restart command.
- Updated UI router defaults to pass `restartBubbleDependencyDefaults`
  explicitly when wiring the restart command for UI actions.
- Changed the application restart API to use only caller-provided dependencies;
  dependency completeness remains enforced by the existing restart dependency
  resolver.
- Updated restart unit and contract tests to provide explicit default or
  test-local dependency aggregates.
- Deleted `src/v11/application/restart/restartCommandDefaults.ts`.
- Fitness result after the batch: application dynamic defaults warnings are
  down from 17 to 16; shared dynamic defaults warnings remain 0. Hard-fail
  fitness checks pass.
- Validation:
  - `pnpm typecheck` passed.
  - `pnpm fitness:check:ci` passed with the expected remaining warnings
    (`application_defaults_boundary=16`, `shared_defaults_boundary=0`).
  - `pnpm exec vitest run tests/cli/bubbleRestartCommand.test.ts tests/core/bubble/restartBubble.test.ts tests/contracts/v11/restart.contract.test.ts tests/core/ui/router.test.ts tests/tools/fitness/applicationDefaultsBoundary.test.ts`
    passed (`5` files, `92` tests).
  - `pnpm test` skipped for this focused restart defaults rewiring batch; the
    targeted CLI, restart core, restart contract, UI router, and
    application-defaults-fitness tests cover the changed surface.
  - `pnpm lint` passed.
  - `pnpm build` passed.

---

## Notes

- Source list captured from `pnpm fitness:check:ci`, 2026-05-07. If the count
  drifts before work begins, re-run and reconcile against this inventory.
- Order within categories is not load-bearing; pick the smallest blast radius
  first within each category.
- All B-entries verified across v2 + v3. No remaining `B?` entries.
