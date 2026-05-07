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
| S1 | `shared/actorProtocol/actorEmitContext.ts:46` | `defaults/workspace/workspaceResolutionDefaults.ts` | A | `actorEmitContext` takes the existing workspace-resolution port as a parameter; remove dynamic load. |
| S2 | `shared/bubbleLookup/bubbleLookupDefaults.ts:18` | `defaults/bubbleLookup/bubbleLookupDefaults.ts` | A | Delete file; callers take `ResolveBubbleByIdPort` directly. |
| S3 | `shared/metaReview/metaReviewDependencyDefaults.ts:22` | `defaults/runtimeSessions/runtimeSessionsDefaults.ts` | A | Caller takes the existing runtime-sessions port directly. |
| S4 | `shared/metrics/bubbleEvents.ts:62` | `defaults/metrics/bubbleEventsDefaults.ts` | A | bubbleEvents receives a `BubbleEventEmitter` port (single port, no wrapper). |
| S5 | `shared/read-model/list/listReadModelDefaults.ts:73` | `defaults/list/listCommandDefaults.ts` | B + modelling | Target is verified composition (direct `infrastructure/` imports, see B16). Resolution path picked (v4): **refactor caller out of `shared/`**. The shim file deletes as part of the S5/S7 refactor; the moved application API takes deps as a parameter, CLI injects from `defaults/list/`. See "S5/S7 Refactor Scope". |
| S6 | `shared/state/stateStoreDefaults.ts:28` | `defaults/state/stateStoreDefaults.ts` | A | Delete file; callers take `StateCapabilities` slice (read/write/inspect). The shared layer must not own state-store wiring. |
| S7 | `shared/status/statusCommandDependencyDefaults.ts:116` | `defaults/list/listCommandDefaults.ts` | B + modelling | Same target as S5. Same resolution path: refactor caller out of `shared/`; the shim file (which holds S7, S8, S9 together) deletes as part of the S5/S7 refactor. |
| S8 | `shared/status/statusCommandDependencyDefaults.ts:124` | `defaults/gates/docContractGateArtifactDefaults.ts` | A | Caller takes the existing doc-contract artifact port directly (no wrapper). |
| S9 | `shared/status/statusCommandDependencyDefaults.ts:132` | `defaults/reviewer/reviewVerificationArtifactDefaults.ts` | A | Caller takes the existing review-verification artifact port directly. |
| S10 | `shared/transcript/transcriptDependencyDefaults.ts:25` | `defaults/transcript/transcriptDependencyDefaults.ts` | A | Delete file; callers take `TranscriptCapabilities` slice (append/read). |

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
| A2 | `application/bubbleIdentity/bubbleIdentityDependencyDefaults.ts:18` | `defaults/bubbleIdentity/bubbleIdentityDefaults.ts` | A | Single port (`EnsureBubbleInstanceIdForMutation`). Use the existing port type directly. |
| A3 | `application/bubbleLookup/bubbleLookupDependencyDefaults.ts:18` | `defaults/bubbleLookup/bubbleLookupDefaults.ts` | A | Single port (`ResolveBubbleByIdPort`). Same target as S2. |
| A4 | `application/gates/docContractGateArtifactDependencyDefaults.ts:24` | `defaults/gates/docContractGateArtifactDefaults.ts` | A | Existing artifact port directly. |
| A5 | `application/metaReview/metaReviewDependencyDefaults.ts:20` | `defaults/runtimeSessions/runtimeSessionsDefaults.ts` | A | Existing runtime-sessions port directly. |
| A6 | `application/process/processSpawnDependencyDefaults.ts:8` | `defaults/process/processSpawnDefaults.ts` | A | `ProcessSpawnPort` directly (port exists in `shared/ports/processSpawn.ts`). No wrapper. |
| A7 | `application/repoRegistry/repoRegistryDependencyDefaults.ts:18` | `defaults/repoRegistry/repoRegistryDefaults.ts` | A | Existing `RegisterRepoPort` (and siblings) directly. |
| A8 | `application/state/stateStoreDependencyDefaults.ts:25` | `defaults/state/stateStoreDefaults.ts` | A | **`StateCapabilities` slice** (read + write + inspect). One of the few real slice cases. |
| A9 | `application/status/statusCommandDefaults.ts:26` | `defaults/watchdog/watchdogPaneActivityDefaults.ts` | A | Verified: caller only uses `readWatchdogPaneActivity` (read-only). Single-port DI; use the existing read port directly, no slice. The defaults file exports read/write/remove, but this consumer needs only read. |
| A10 | `application/tmux/tmuxRunnerDependencyDefaults.ts:18` | `defaults/tmux/tmuxRunnerDefaults.ts` | A | Single port (`runTmux`). Use directly. |
| A11 | `application/transcript/transcriptDependencyDefaults.ts:23` | `defaults/transcript/transcriptDependencyDefaults.ts` | A | **`TranscriptCapabilities` slice** (append + read). Real slice case. |
| A12 | `application/workspace/workspaceResolutionDependencyDefaults.ts:18` | `defaults/workspace/workspaceResolutionDefaults.ts` | A | Existing workspace-resolution port directly. |

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
| B2 | `application/converged/summaryVerifierConsistencyGateArtifactDefaults.ts:19` | `defaults/reviewer/summaryVerifierConsistencyGateDefaults.ts` | **A** (reclassified) | Verified: target forwards exactly one port (`WriteSummaryVerifierConsistencyGateArtifactPort`) from infrastructure. Single-port DI; caller takes the port directly. |
| B3 | `application/create/createBubbleDefaults.ts:28` | `defaults/create/createBubbleDefaults.ts` | B | Verified: target aggregates infrastructure adapters plus shared shims. Composition. |
| B4 | `application/delete/deleteBubbleDependencyDefaults.ts:133` | `defaults/delete/deleteBubbleDefaults.ts` | B | Verified: heavy composition (multiple `infrastructure/` adapters + sibling `defaults/` + shared shims). Mirrors merge in shape. |
| B5 | `application/merge/mergeCommandDefaults.ts:54` | `defaults/merge/mergeCommandDefaults.ts` | B | Verified. CLI passes to `emitMerge`. |
| B6 | `application/metaReview/emitMetaReviewV11.ts:49` | `defaults/metaReview/metaReviewDefaults.ts` | B | Verified: target aggregates 3 infrastructure adapters. Composition. |
| B7 | `application/metaReviewGate/metaReviewGateCommandDefaults.ts:79` | `defaults/metaReviewGate/metaReviewGateCommandDefaults.ts` | B | Verified. CLI passes the aggregator. |
| B8 | `application/pass/passReviewVerificationDefaults.ts:24` | `defaults/reviewer/reviewVerificationArtifactDefaults.ts` | **A** (reclassified) | Verified: target re-exports 3 cohesive review-verification artifact ports (read/resolve/write) from infrastructure. Port-slice DI: caller takes a `ReviewVerificationArtifactCapabilities` slice (or the 3 individual ports). |
| B9 | `application/pass/passValidationCommandDefaults.ts:121` | `defaults/pass/passValidationCommandDefaults.ts` | B | Verified. CLI passes the aggregator. |
| B10 | `application/pass/reviewerDeliveryDefaults.ts:33` | `defaults/reviewer/reviewerDeliveryDefaults.ts` | B | Verified. |
| B11 | `application/reconcile/reconcileCommandDefaults.ts:25` | `defaults/reconcile/reconcileCommandDefaults.ts` | B | Verified: target imports `infrastructure/` and `tmuxRunnerDefaults`, plus contains default probe logic. Composition. |
| B12 | `application/restart/restartCommandDefaults.ts:29` | `defaults/restart/restartCommandDefaults.ts` | B | Verified. |
| B13 | `application/reviewer/reviewerArtifactDefaults.ts:22` | `defaults/reviewer/reviewerArtifactDefaults.ts` | **A** (reclassified) | Verified: target re-exports 2 cohesive reviewer-brief artifact reads. Port-slice DI: caller takes a `ReviewerBriefArtifactCapabilities` slice (or the 2 individual ports). |
| B14 | `application/reviewer/reviewerTestEvidenceDefaults.ts:30` | `defaults/reviewer/reviewerTestEvidenceDefaults.ts` | **A** (reclassified) | Verified: target re-exports 5 cohesive reviewer test-evidence ports (path resolution from `shared/reviewer/testEvidence`, plus 4 from infrastructure: directive resolution, evidence verification, artifact write). Port-slice DI: caller takes a `ReviewerTestEvidenceCapabilities` slice. |
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
| C1 | `application/reply/replyCommandApi.ts:36` | `defaults/reply/replyMutationExecution.ts` | C | Move `defaults/reply/replyMutationExecution.ts` → `application/reply/replyMutationExecution.ts`. Replace the dynamic shim in `replyCommandApi.ts` with a static import. The mutation function already takes its IO ports as `input.dependencies.*`; no contract change needed. |

Verified by reading `defaults/reply/replyMutationExecution.ts`: imports are
`node:path`, `shared/state/executionContext.js`, `domain/state/machine.js`,
`domain/reply/replyEnvelopeDraft.js`, `domain/reply/postAppendStateWriteFailure.js`,
and an `application/reply/replyMutationExecutionContract.ts` type. **Zero
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
- `statusCommandViewProjection.ts`
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

---

## Notes

- Source list captured from `pnpm fitness:check:ci`, 2026-05-07. If the count
  drifts before work begins, re-run and reconcile against this inventory.
- Order within categories is not load-bearing; pick the smallest blast radius
  first within each category.
- All B-entries verified across v2 + v3. No remaining `B?` entries.
