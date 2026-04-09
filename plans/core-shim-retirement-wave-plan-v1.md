# Core Shim Retirement Wave Plan V1

Last updated from `main` after the temporary warn-only downgrade of
`tests/contracts/v11/core-shim-boundary-coverage.test.ts`.

## Goal

Retire the remaining `src/v11/**` and `src/cli/**` direct imports from
`src/core/**` without mixing simple shim rewrites with deeper architecture
decisions. The end-state is:

- easy shim-through imports removed first,
- medium dependency-resolution and contract-shape bridges removed second,
- hard retained-behavior or boundary-design cases handled explicitly,
- `core-shim-boundary-coverage` promoted back from warn-only to fail-only.

## Why A Wave Plan Is Needed

The current residual set is mixed:

- some `v11 -> core` imports are only thin re-export shims,
- some are dependency-resolution or type-contract bridges,
- some may still hide retained compatibility behavior or missing `ports`
  boundaries.

Treating the whole set as a single cleanup batch would either:

- block on the hardest residuals too early, or
- encourage unsafe path-only rewrites without clarifying ownership.

## Source Of Truth

- `tests/contracts/v11/core-shim-boundary-coverage.test.ts`
- `docs/architecture/v11-placement-and-extraction-governance.md`
- `docs/architecture/architecture-fitness-checks.md`
- `plans/v11-closure-and-residual-core-plan-v1.md`

## Current Operating Baseline

The boundary coverage test is temporarily warn-only because the current repo
state still contains a large residual `v11/cli -> core` surface.

## Current Explicit Residual Inventory

Latest verified checkpoint after the meta-review-gate defaults redesign:

- worktree clean
- `tests/contracts/v11/core-shim-boundary-coverage.test.ts` passes
- static direct residual bridge inventory remains locked to 0 entries
- the previously known `metaReviewGate` dynamic core bridge is retired
- remaining work has moved to broader dynamic core bridges that the current
  boundary test does not detect

Current remaining non-inventory bridge candidates:

- `src/v11/shared/metaReview/metaReviewDependencyDefaults.ts`
- `src/v11/shared/metrics/bubbleEvents.ts`

Current classification:

- `easy`
  - none confirmed at this checkpoint
- `medium`
  - `metaReviewDependencyDefaults`
  - `bubbleEvents`
- `hard / architecture-sensitive`
  - none confirmed at this checkpoint

Immediate planning note:

- do not treat the remaining residuals as path-only rewrites
- most of the remaining set would open forbidden `application/shared -> infrastructure`
  edges if rewritten naively
- the next safe wave should pick one medium cluster and replace the `core`
  bundle with a local explicit dependency/defaults bridge, not direct infra imports
- the previous `reconcile` hard residual is now retired:
  - source-of-truth wrapper lives in
    `src/v11/application/reconcile/reconcileCommandApi.ts`
  - `src/core/runtime/startupReconciler.ts` now re-exports the v11 facade
- the previous `merge` residual is now retired:
  - local defaults live in `src/v11/application/merge/mergeCommandDefaults.ts`
  - `mergeCommandDependencyResolution.ts` no longer imports
    `src/core/bubble/mergeBubbleDefaults.ts`
- the previous `metaReviewGate` bridge is now retired:
  - local defaults live in
    `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
  - `metaReviewGateDependencyDefaults.ts` no longer imports
    `src/core/bubble/metaReviewGateDefaults.ts`
- the previous `passValidation` bridge is now retired:
  - local defaults live in
    `src/v11/application/pass/passValidationCommandDefaults.ts`
  - `passValidationDependencyDefaults.ts` no longer imports
    `src/core/runtime/passValidationDefaults.ts`
- the previous `docContractGateArtifactDefaults` bridge is now retired:
  - the shared defaults file now lazy-loads the canonical v11 infrastructure
    owner directly
  - it no longer imports `src/core/gates/docContractGateArtifacts.ts`

Observed warning snapshot when the test was downgraded:

- about `323` direct `src/v11/**` or `src/cli/**` imports from `src/core/**`
- about `17` imports in the explicit retired-shim subset
- about `2` public `src/index.ts` exports still pointing at `./core/...`

These numbers are triage inputs, not yet a finalized ledger.

## Progress Ledger

- latest checkpoint after the lint-loader cleanup and boundary inventory refresh:
  - explicit residual inventory locked to `3` direct `src/v11 -> src/core` bridges
  - current residual set:
    - `src/v11/application/merge/mergeCommandDependencyResolution.ts -> src/core/bubble/mergeBubbleDefaults.ts`
    - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts -> src/core/bubble/metaReviewGateDefaults.ts`
    - `src/v11/application/reconcile/emitReconcileV11.ts -> src/core/runtime/startupReconciler.ts`
  - easy shim-through rewrites are effectively exhausted
  - remaining work is now mostly `medium/hard` boundary-default redesign:
    - `merge` is `medium`
    - `metaReviewGateDependencyDefaults` is `hard`
    - `reconcile/emitReconcileV11` is an intentional residual until a dedicated
      facade/defaults redesign replaces the current parity-preserving alias

- baseline after warn-only downgrade:
  - total direct residual imports: `323`
  - retired-shim subset: `17`
- after early easy waves and type-port retargets:
  - total direct residual imports: `193`
  - retired-shim subset: `7`
- after `4224fd82 refactor(shim): remove error-only core classifiers`:
  - total direct residual imports: `188`
  - retired-shim subset: `7`
- after the meta-review-gate shared type-port batch:
  - total direct residual imports: `185`
  - retired-shim subset: `7`
- after `9f4462d6 refactor(open): move wrapper defaults to core perimeter`:
  - total direct residual imports: `173`
  - retired-shim subset: `7`
- after the `askHuman` defaults-owner split plus façade realignment:
  - total direct residual imports: `171`
  - retired-shim subset: `7`
- after the first bounded `commit` perimeter-wrapper batch:
  - total direct residual imports: `165`
  - retired-shim subset: `7`
  - commit consumer lane now routes through `src/core/bubble/commitBubble.ts`
- after the approval public-api perimeter alignment:
  - total direct residual imports: `160`
  - retired-shim subset: `7`
  - `emitApprovalV11` no longer points at `src/core/human/approval.ts`
- after the converged defaults fan-in batch:
  - total direct residual imports: `158`
  - retired-shim subset: `7`
  - `convergedFlowInvocationBuilders.ts` no longer carries direct core-backed defaults
- after the `status/inbox` shared-default fan-in batch:
  - total direct residual imports: `65`
  - `statusCommandApi`, `statusCommandInternals`, `statusCommandGateState`, and
    `inboxCommandApi` now route through one local shared defaults module
- after the `metaReviewGate runtime` fan-in batch:
  - total direct residual imports: `64`
  - `metaReviewGateNotify` and `metaReviewGatePaneBinding` now route through one
    local application defaults module
- after the `kickoff + ui router defaults` cleanup batch:
  - total direct residual imports: `61`
  - `kickoffCliRunner` and `kickoffDependencyResolution` are back on the
    validated `core/bubble/kickoffDefaults` bridge
  - `routerDependencies` is back on `core/ui/routerDefaults` plus local UI extras
- after the `start prompt/defaults` fan-in batch:
  - total direct residual imports: `55`
  - `startCommandPrompts`, resume prompt builders, tmux launch wiring, CLI
    runner, context loader, defaults, and resume summary now route through two
    local `start` support modules instead of scattered direct `core` imports
- after the `kickoff defaults` fan-in batch:
  - total direct residual imports: `54`
  - `kickoffCliRunner` and `kickoffDependencyResolution` now share one local
    `kickoffDependencyDefaults` bridge instead of two direct `core` imports
- after the `delete defaults` fan-in batch:
  - total direct residual imports: `51`
  - `deleteBubble` and `deleteBubbleSupport` now share one local
    `deleteBubbleDependencyDefaults` bridge instead of two direct `core`
    imports
- after the first `pass` transcript + validation fan-in batch:
  - total direct residual imports: `49`
  - `passRoutingPreparation`, `normalPassAppendExecution`,
    `passValidationGate`, and `passFlowDependencyWiring` now route through two
    local `pass` support modules instead of four direct `core` imports
- after the `pass` review-verification fan-in batch:
  - total direct residual imports: `48`
  - `postAppendReviewVerificationWriter` and `reviewerVerificationResolver`
    now share one local `passReviewVerificationDefaults` bridge
- after the `metaReviewGate` transcript fan-in batch:
  - total direct residual imports: `47`
  - `approvalRequestEnvelope` and `metaReviewGateReviewerSnapshot` now share
    one local `metaReviewGateTranscriptDefaults` bridge
- after the shared `docContractGateArtifacts` fan-in batch:
  - total direct residual imports: `46`
  - `createBubblePersistence` and `reviewerDocGateArtifactUpdater` now share
    one `shared/gates/docContractGateArtifactDefaults` bridge
- after the shared `transcriptStore` fan-in batch:
  - total direct residual imports: `44`
  - `startCommandDependencyDefaults`, `passTranscriptDefaults`, and
    `metaReviewGateTranscriptDefaults` now route through one shared
    `shared/transcript/transcriptDependencyDefaults` bridge
- after the shared `stateStore` fan-in batch:
  - total direct residual imports: `42`
  - `postAppendStateWriter`, `metaReviewCommandSubmitRuntime`, and
    `metaReviewCommandSubmitPersistence` now route through one shared
    `shared/state/stateStoreDefaults` bridge
- after the parallel `approval + attach + list` easy-wave:
  - total direct residual imports: `39`
  - `approvalCommandApi` now lazy-loads the approval defaults bridge instead of
    carrying a direct `core` import in the public API file
  - `emitAttachV11` no longer depends on the `core` attach defaults shim
  - `listCommandApi` now routes through one local `listCommandDefaults` bridge
- after the shared `metaReview` dependency-defaults fan-in batch:
  - total direct residual imports: `38`
  - `metaReviewCommandSubmitPreparation`, `metaReviewCommandReadRuntime`, and
    `metaReviewLiveRunPorts` now share one
    `shared/metaReview/metaReviewDependencyDefaults` bridge
- after the `approval + attach + list + converged + pass` wave plus
  `emitMetaReviewV11` perimeter lazy-loading:
  - total direct residual imports: `31`
  - `approval`, `attach`, `list`, `converged`, and `pass` no longer dominate
    the frontier
  - `emitMetaReviewV11` no longer carries a static `core/runtime/metaReviewDefaults`
    import on the public v11 perimeter
- after the `status + ui events scan + actor protocol` cleanup wave:
  - total direct residual imports: `28`
  - `emitStatusV11`, `eventsScan`, and `actorEmitContext` no longer carry
    direct `src/core/**` imports
  - the remaining frontier is now concentrated in the harder application
    perimeter clusters: `reconcile`, `restart`, `start`, `watchdog`,
    `routerDependencies`, `metaReviewGate`, `open`, `merge`, `delete`,
    and `kickoff`
- after the `stop + watchdog + reconcile` perimeter wave:
  - total direct residual imports: `22`
  - `emitStatusV11`, `watchdogCommandApi`, `stop` lifecycle entrypoints, and
    `reconcileRuntimeSessionsV11` now avoid new static `src/core/**` perimeter
    imports
  - the remaining frontier is now mostly:
    `merge`, `metaReviewGate`, `open`, `reply`, `restart`, `start`,
    `routerDependencies`, and the intentional shared wrapper bridges
- after the `merge + start` perimeter wave plus the shared
  `metrics/transcript/metaReview` lazy-wrapper batch:
  - total direct residual imports: `13`
  - `startCommandPromptRuntime`, the merge dependency bridge, and the shared
    `metrics`, `transcript`, and `metaReview` wrapper modules no longer carry
    static `src/core/**` imports
  - the residual frontier is now concentrated in:
    `metaReviewGate`, `open`, `reply`, `restart`, `routerDependencies`,
    `askHumanDependencyDefaults`, `docContractGateArtifactDefaults`,
    `stateStoreDefaults`, and `statusCommandDependencyDefaults`
- after the `start` prompt-runtime retarget and latest boundary measurement:
  - total direct residual imports: `11`
  - `start/**` is out of the residual frontier
  - current explicit residuals:
    `metaReviewGate`, `open`, `reconcileCommandInputNormalization`, `reply`,
    `restart`, `routerDependencies`, `askHumanDependencyDefaults`,
    `docContractGateArtifactDefaults`, `stateStoreDefaults`,
    and `statusCommandDependencyDefaults`
- after the `metaReviewGate + reply + router/reconcile-input` endgame wave:
  - total direct residual imports: `7`
  - `metaReviewGate`, `reply`, `routerDependencies`, and
    `reconcileCommandInputNormalization` are out of the residual frontier
  - current residual set is now the intentional / harder edge list:
    `open`, `restart`, `askHumanDependencyDefaults`,
    `docContractGateArtifactDefaults`, `stateStoreDefaults`,
    and `statusCommandDependencyDefaults`
- after the `open` canonical-owner flip:
  - total direct residual imports: `6`
  - `open` is out of the residual frontier while facade parity remains intact
  - current residual set:
    `restart`, `askHumanDependencyDefaults`,
    `docContractGateArtifactDefaults`, `stateStoreDefaults`,
    and `statusCommandDependencyDefaults`
- after the shared `doc-gate + state` lazy-wrapper batch:
  - total direct residual imports: `4`
  - `docContractGateArtifactDefaults` and `stateStoreDefaults` no longer carry
    static `src/core/**` imports
  - current residual set:
    `restart`, `askHumanDependencyDefaults`,
    and `statusCommandDependencyDefaults`
- after the `reply + router + reconcile-input` cleanup wave:
  - total direct residual imports: `8`
  - `replyCommandDependencyResolution`, `routerDependencies`, and
    `reconcileCommandInputNormalization` no longer carry direct
    `src/core/**` imports
  - current explicit residuals:
    `metaReviewGate`, `open`, `restart`,
    `askHumanDependencyDefaults`, `docContractGateArtifactDefaults`,
    `stateStoreDefaults`, and `statusCommandDependencyDefaults`
- after the `merge` dependency-resolution lazy-load batch:
  - total direct residual imports: `21`
  - `resolveMergeCommandDependencies` and `mergeBubbleCommandOrchestration`
    now load `core/bubble/mergeBubbleDefaults` lazily instead of importing it
    statically at the `v11` perimeter
- after the `start + kickoff` local fan-in batch:
  - total direct residual imports: `54`
  - `application/start` prompt/runtime and default wiring now route through two
    local fan-in modules instead of repeated direct `core/runtime/*`,
    `core/protocol/*`, and `core/bubble/*` imports
  - `kickoffCliRunner` and `kickoffDependencyResolution` now route through one
    local kickoff defaults fan-in module
- after the `delete` local fan-in cleanup batch:
  - total direct residual imports: `51`
  - `deleteBubble` and `deleteBubbleSupport` now route through one local delete
    defaults fan-in module
  - the orphaned `deleteBubbleLegacyDefaults.ts` shim wrapper was removed
- after the `converged defaults` local fan-in batch:
  - total direct residual imports: `52`
  - `convergedDefaultDependencies`, `convergedRoutingPreparation`, and
    `convergedValidationPreparation` now route through one local converged
    defaults fan-in module
- latest checkpoint after the `askHuman` lazy shared-default batch:
  - total direct residual imports: `3`
  - `askHumanDependencyDefaults` no longer carries a static `src/core/**`
    import; the shared defaults now load runtime bridges lazily and keep the
    local sync message-ref helper in-repo
  - current residual set:
    `restart` and `statusCommandDependencyDefaults`
- latest checkpoint after the `status` lazy shared-default batch:
  - total direct residual imports: `1`
  - `statusCommandDependencyDefaults` no longer carries static
    `src/core/**` imports; inbox/status now resolve lookup errors by name
    instead of class identity
  - current residual set:
    `restart`
- latest checkpoint after the `restart` defaults-boundary redesign batch:
  - total direct residual imports: `0`
  - `emitRestartV11` no longer carries a static `src/core/**` import
  - `restart` now resolves defaults through a local `restartCommandApi` +
    `restartCommandDefaults` split while `core/bubble/restartBubble.ts`
    remains a compatibility facade
  - restart parity and contract coverage stayed green

- latest checkpoint after the shared `pass + doc-gate + metaReview + metrics`
  lazy-wrapper batch:
  - total direct residual imports: `3`
  - `passValidationDependencyDefaults`, `docContractGateArtifactDefaults`,
    `metaReviewDependencyDefaults`, and `bubbleEvents` no longer carry static
    `src/core/**` imports
  - current residual set:
    `merge`, `metaReviewGate`, and `reconcile`

- latest checkpoint after the `merge + metaReviewGate` defaults-shape batch:
  - total direct residual imports: `0`
  - `mergeCommandDependencyResolution` and
    `metaReviewGateDependencyDefaults` now use local explicit defaults-shapes
    over dynamic loaders instead of static `src/core/**` type imports
  - current residual set:
    none

Latest validated state:

- `tests/contracts/v11/core-shim-boundary-coverage.test.ts` PASS in fail-only mode
- latest validated boundary residual count: `0`
- latest explicit residuals:
  - none in static `src/v11/**` / `src/cli/**` -> `src/core/**` imports
- latest targeted validation still green for the shim-retirement wave:
  - `tests/contracts/v11/core-shim-boundary-coverage.test.ts`
  - `tests/v11/shared/metrics/bubbleEvents.test.ts`
  - `pnpm typecheck`
- latest fitness baseline after the restart redesign:
  - `dependency`: `30 fail / 2 warn`
  - `error`: `2 fail / 0 warn`
  - `pnpm typecheck`
- note:
  - full fitness still has pre-existing non-shim findings (`error`, `dependency`)
    outside this wave; the latest shim work did not increase those counts

Current conscious-triage note after the `open` owner-flip:

Residual target-shape notes (current best understanding):

- `restart`: not an easy owner-flip under the current dependency policy
- recommended immediate stance: treat it as an intentional residual until a
  dedicated defaults-boundary redesign is scheduled
- alternative path exists only if the project explicitly accepts parity-contract
  relaxation or a local lazy facade pattern on the v11 perimeter

- the residual frontier is no longer a uniform easy-wave backlog
- attempted `restart` owner-flip proved that boundary-count reduction alone is
  not enough; if the replacement opens new dependency-direction findings, the
  batch is not acceptable and must be reverted
- practical next step is now explicit:
  - either accept `restart` as the last intentional residual for this wave,
  - or open a separate restart-boundary redesign batch with wider contract
    scope than the shim-retirement wave

Current medium frontier after the latest easy/error-only waves:

- default-wiring modules that already depend on `shared/ports/**` types but still
  source runtime defaults from `src/core/**` bridges:
- `src/v11/application/restart/restartCommandDependencyResolution.ts`
- `src/v11/application/reply/replyCommandDependencyResolution.ts`
- `src/v11/application/approval/approvalCommandDependencyResolution.ts`
- `src/v11/application/delete/deleteBubbleSupport.ts`
- `src/v11/application/converged/convergedDefaultDependencies.ts`
- `src/v11/application/converged/convergedValidationPreparation.ts`
- `src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts`
- `src/v11/application/askHuman/askHumanRoutingPreparationDependencyDefaults.ts`
- `src/v11/application/watchdog/watchdogCommandApi.ts`
- `src/v11/application/pass/reviewerDelivery.ts`
- `src/v11/application/pass/normalPassAppendExecution.ts`
  - `src/v11/application/pass/autoConvergePreparation.ts`
  - `src/v11/application/pass/passWorkspaceContextPreparation.ts`
  - `src/v11/application/pass/postAppendReviewVerificationWriter.ts`
  - `src/v11/application/start/startCliRunner.ts`
  - `src/v11/application/start/startCommandContext.ts`
  - `src/v11/application/start/startCommandOrchestration.ts`
  - `src/v11/application/kickoff/kickoffCliRunner.ts`
  - `src/v11/application/create/createCliRunHelpers.ts`
  - `src/v11/infrastructure/ui/routerDependencies.ts`

Operational note:

- these are not safe path-only rewrites,
- most of them need either outward default-wiring migration into legacy wrappers
  or a new explicit value-level boundary that preserves current public behavior.

## Wave 0 Findings

Initial inventory run from `tests/contracts/v11/core-shim-boundary-coverage.test.ts`
shows:

- total direct residual imports: `323`
- retired-shim subset: `17`
- public `src/index.ts -> ./core/...` exports: `2`

Initial cluster distribution:

- `shared/metaReviewGate`: `35`
- `infrastructure/ui`: `31`
- `application/start`: `27`
- `application/pass`: `23`
- `shared/metaReview`: `21`
- `application/watchdog`: `20`
- `application/converged`: `18`
- `application/delete`: `14`
- `application/merge`: `13`
- `shared/askHuman`: `13`

Initial target distribution:

- `src/core/state/stateStore.ts`: `63`
- `src/core/bubble/bubbleLookup.ts`: `48`
- `src/core/protocol/transcriptStore.ts`: `37`
- `src/core/runtime/sessionsRegistry.ts`: `21`
- `src/core/runtime/tmuxManager.ts`: `18`
- `src/core/runtime/tmuxDelivery.ts`: `13`
- `src/core/bubble/bubbleInstanceId.ts`: `11`
- `src/core/workspace/git.ts`: `8`
- `src/core/runtime/pairflowCommand.ts`: `8`
- `src/core/bubble/workspaceResolution.ts`: `7`

Most important triage result:

- about `320 / 323` residual imports currently target thin or near-thin
  `core` bridge files,
- only `3 / 323` residual imports currently point at non-thin `core` targets:
  - `src/core/bubble/createBubble.ts`
  - `src/core/util/fileLock.ts`
  - `src/core/metrics/events.ts`

This means the next wave should aggressively favor thin-shim consumer rewrites
before opening deeper architecture batches.

Current tactical refinement from the completed easy waves:

- pure error-class imports are one of the safest remaining reducers,
- direct `application -> infrastructure` or `shared -> infrastructure`
  retargets are still out-of-bounds even when the `core` target is thin,
- some files that look easy by target shape are actually `medium` because the
  consumer layer cannot legally point at the canonical infrastructure owner.

## Classification Model

Every residual `v11/cli -> core` edge should be classified into one of these
three buckets before rewrite work starts.

### A. Easy Rewrite

Definition:

- `core` target is a thin re-export or very small facade,
- no extra contract meaning is added by the `core` path,
- canonical `v11` target is already obvious.

Typical shape:

- `export * from "../../v11/..."`
- one-symbol re-export with no behavior

Expected action:

- rewrite imports directly to the canonical `v11` owner,
- validate feature tests,
- remove from the residual inventory.

### B. Medium Bridge With Contract

Definition:

- the `core` import is still only a bridge, but the consumer file also builds
  dependency contracts, default wiring, or type surfaces from it,
- path rewrite alone is not enough because the consumer boundary must stay
  coherent.

Typical shape:

- dependency-resolution modules,
- command contract/default-wiring modules,
- type-only surfaces built from `typeof coreFunction`.

Expected action:

- retarget the consumer to canonical `v11` owners or explicit `shared/ports`,
- keep the consumer contract stable,
- validate the command/feature cluster,
- only then consider retiring the shim.

Note:

- `shared -> shared/ports` typed capability imports are legitimate in this repo
  when the consumer is expressing a dependency contract rather than embedding
  infrastructure behavior.

### C. Hard Retained Dependency

Definition:

- the `core` path still carries retained behavior, compatibility logic, or a
  missing architecture boundary,
- direct rewrite would either change behavior or force an implicit boundary
  decision.

Typical shape:

- retained behavior in `core`,
- compatibility adapter still serving multiple lanes,
- application-facing dependency that should probably become a `shared/ports`
  contract first.

Expected action:

- do not hide it with blind path rewrites,
- open a dedicated boundary/ownership batch,
- only retire the shim after the replacement boundary is explicit.

## Wave Strategy

### Wave 0: Inventory And Tagging

Goal:

- build the initial residual inventory from the boundary coverage test output,
- tag each edge as `easy`, `medium`, or `hard`,
- identify clusters by consumer lane.

Required output:

- residual inventory table,
- cluster grouping,
- first bounded batch candidates.

### Wave 1: Easy Rewrites

Goal:

- remove the clear thin-shim imports first,
- do not redesign boundaries here,
- maximize count reduction with low regression risk.

Expected effect:

- the raw residual count should fall quickly,
- some currently medium-looking clusters will simplify after surrounding easy
  edges disappear.

### Wave 2: Reclassification

Goal:

- rerun the residual report after Wave 1,
- reclassify the remaining set,
- promote newly simplified cases from `medium` to `easy`.

This wave is mandatory. Do not assume the initial classification remains
accurate after the first cleanup passes.

### Wave 3: Medium Contract Cleanup

Goal:

- handle dependency-resolution and contract-shape bridges cluster by cluster.

Preferred cluster order:

1. `approval`
2. `status` / `inbox`
3. `restart` / `reconcile`
4. `askHuman` / `kickoff`
5. `metaReviewGate` or other residual command clusters

Rule:

- each batch must keep behavior stable and avoid mixing unrelated `ports`
  redesign work unless the batch cannot be made correct without it.

### Wave 4: Hard Residuals

Goal:

- isolate the few remaining cases that still need architecture decisions.

Possible outcomes:

- new `shared/ports/**` contract,
- explicit compatibility bridge retained for a documented period,
- real owner move out of `core`,
- public API realignment.

### Wave 5: Boundary Test Re-hardening

Goal:

- return `tests/contracts/v11/core-shim-boundary-coverage.test.ts` to fail-only.

Promotion gate:

- no retired-shim imports remain under `src/v11/**`,
- no silent `src/cli/** -> src/core/**` growth remains,
- any explicitly retained hard residuals are documented and allowlisted with a
  concrete justification,
- the warning-only branch of the test is no longer needed.

## Initial Example Classification

These are examples only, not yet the full inventory.

### Likely Easy

- `src/v11/application/create/createCommandApi.ts`
  - `createBubble` currently re-exported from `src/core/bubble/createBubble.ts`
  - candidate for direct rewrite once the canonical owner is confirmed
- any consumer currently importing these top thin targets:
  - `src/core/state/stateStore.ts`
  - `src/core/bubble/bubbleLookup.ts`
  - `src/core/protocol/transcriptStore.ts`
  - `src/core/runtime/sessionsRegistry.ts`
  - `src/core/runtime/tmuxManager.ts`
  - `src/core/runtime/tmuxDelivery.ts`
  - `src/core/bubble/bubbleInstanceId.ts`
  - `src/core/workspace/git.ts`
  - `src/core/runtime/pairflowCommand.ts`
  - `src/core/bubble/workspaceResolution.ts`

### Likely Medium

- `src/v11/application/approval/approvalCommandDependencyResolution.ts`
  - imports transcript/state/tmux/bubble helpers through `core`,
  - also builds dependency contracts and default wiring from them,
  - not a pure path rewrite.
- `src/v11` consumer files that aggregate many thin shim imports into one
  dependency-resolution or command-contract module should still be treated as
  `medium` even when every individual target is a thin shim.

### Likely Hard

- any residual where `core` still carries retained compatibility behavior or
  where the correct end-state should be an explicit `shared/ports/**` boundary
  instead of a direct `application -> infrastructure` rewrite.
- current concrete candidates:
  - `src/core/bubble/createBubble.ts`
  - `src/core/metrics/events.ts`
- `src/core/util/fileLock.ts` looks almost-thin, but keep it out of the first
  path-only wave until the exact consumer contract is checked.

## Batch Rules

- Do not mix `easy` and `hard` work in the same commit.
- Prefer consumer-cluster batches over provider-cluster batches.
- If the canonical owner is not obvious, stop and classify the edge as `hard`
  until proven otherwise.
- Do not promote code into `shared` only to hide a `core` import.
- If a `medium` case requires `ports`, create or reuse the smallest correct
  `shared/ports/**` contract instead of a thin wrapper.

## Validation Per Batch

- relevant `vitest` scope
- targeted `eslint`
- `pnpm typecheck`
- `pnpm exec tsx tools/fitness/run-report.ts`
- rerun `tests/contracts/v11/core-shim-boundary-coverage.test.ts`

If the batch changes `src/**` and then any bubble lifecycle command is used for
validation, run `pnpm build` first.

## Ledger Template

| Wave | Cluster | Classification | Status | Notes |
| --- | --- | --- | --- | --- |
| W0 | inventory and initial tagging | mixed | planned | Build the first residual table from the current warn-only coverage output |
| W1 | inventory and initial tagging | mixed | completed | Initial coverage run shows `323` residual imports; `320` target thin or near-thin `core` bridges, so the backlog is dominated by consumer rewrites rather than retained `core` behavior |
| W2 | easy rewrite batch 1 | easy | validated | First safe rewrites landed only where the consumer layer stayed valid: `emitOpenV11` now imports `shellQuote` from `shared/foundation`, and `eventsStore` now imports `fileLock` from the canonical `infrastructure/foundation` owner; coverage moved from `323 -> 321` total and `17 -> 15` retired-shim warnings |
| W3 | easy rewrite batch 2 | easy | validated | Infrastructure-side `pairflowCommandAttach` now uses the canonical `bubbleLookup` owner and port type instead of the `core` shim; coverage moved from `321 -> 319` total with no new dependency regressions |
| W4 | easy rewrite batch 3 | easy | validated | `testEvidenceVerificationHelpers` now uses the canonical infrastructure `runGit` owner instead of the `core/workspace/git` shim; coverage moved from `319 -> 318` total while the retired-shim subset stayed at `15` |
| W5 | shared-safe shim retirement batch | easy | validated | Shared contract/type surfaces were retargeted away from thin `core` bridges into canonical `shared/ports` and sibling shared contracts; warn-only coverage moved from `318 -> 294` total while the retired-shim subset stayed at `15` |
| W6 | dependency policy alignment for shared ports | policy | validated | Dependency fitness now explicitly allows `shared -> shared/ports` capability-contract imports while keeping `shared-ports -> infrastructure` and anti-circumvention rules intact; full fitness returned to PASS after the shared-safe batch |
| W7 | shared type-only shim retirement batch | easy | validated | Shared actor/meta-review/meta-review-gate type-only imports now target canonical `shared/ports` contracts instead of `core` source types; warn-only coverage moved from `294 -> 279` total and `15 -> 12` retired-shim warnings while fitness and metaReviewGate regressions stayed green |
| W8 | final shared type-only cleanup | easy | validated | `shared/merge/mergeRoutingEligibility.ts` now targets the canonical git port type instead of the `core/workspace/git` shim; warn-only coverage moved from `279 -> 273` total while the retired-shim subset stayed at `12` |
| W9 | reviewer default-wiring consolidation | medium | validated | Reviewer brief and reviewer test-evidence default wiring moved out of pass/start/converged leaf helpers into dedicated application-level reviewer defaults modules; warn-only coverage moved from `273 -> 270` total and `12 -> 9` retired-shim warnings while pass/start/converged regressions, typecheck, and fitness all stayed green |

## Current Frontier

Validated current baseline after `W7`:

- total direct residual imports: `279`
- retired-shim subset: `12`
- fitness: PASS

Practical conclusion:

- the broad easy wave is now close to exhaustion,
- the remaining retired-shim residuals are no longer simple path rewrites,
- the next useful work should be handled as explicit medium boundary batches.

Current medium clusters:

1. reviewer evidence / reviewer brief
   - `src/v11/application/pass/reviewerDeliveryHelpers.ts`
   - `src/v11/application/pass/reviewerTestDirectiveResolver.ts`
   - `src/v11/application/start/startCommandContext.ts`
   - `src/v11/application/start/startCommandResumeFlowPreparation.ts`
   - shape: existing port types already exist, but default implementation wiring still hangs off retired `core` bridges

2. retained create bridge
   - `src/v11/application/create/createCommandApi.ts`
   - shape: compatibility facade still routes through retained `core/bubble/createBubble.ts`

3. metrics bridge
   - `src/v11/shared/metrics/bubbleEvents.ts`
   - shape: shared helper still depends on the retained metrics shim that mixes shared event building and infrastructure store resolution

4. UI router bridge
   - `src/v11/infrastructure/ui/routerContracts.ts`
   - `src/v11/infrastructure/ui/routerDependencies.ts`
   - shape: current UI boundary still depends on `core` command surfaces; direct retarget to `application` opens `infrastructure -> application` violations, so this needs a dedicated interface/boundary decision
   - status: core-backed defaults fan-in is now being collapsed through `src/core/ui/routerDefaults.ts`; the remaining non-core UI defaults stay local to the router perimeter

### Next Medium Batch Candidate: Reviewer Evidence / Reviewer Brief

Goal:

- retire the remaining reviewer evidence / reviewer brief `core` bridges without
  opening `application -> infrastructure` violations,
- keep `emitPassFromWorkspace` and `startBubble` behavior stable,
- avoid scattering default implementation wiring across multiple helper files.

Primary files:

- `src/v11/application/pass/reviewerDeliveryHelpers.ts`
- `src/v11/application/pass/reviewerTestDirectiveResolver.ts`
- `src/v11/application/start/startCommandContext.ts`
- `src/v11/application/start/startCommandResumeFlowPreparation.ts`

Supporting contracts already present:

- `src/v11/shared/ports/reviewerArtifacts.ts`
- `src/v11/shared/ports/reviewerContext.ts`
- `src/v11/shared/ports/reviewerTestEvidenceArtifacts.ts`
- `src/v11/shared/ports/tmuxDelivery.ts`

Observed constraint:

- the helper-level `core` imports are not the real problem by themselves,
- the real problem is that default implementations still live inside
  `application` helpers,
- moving those defaults directly to canonical `infrastructure` owners would
  trigger forbidden `application -> infrastructure` edges.

Planned implementation shape:

1. lift reviewer artifact / reviewer test evidence / delivery message-ref
   defaults out of the leaf helpers,
2. thread those capabilities through explicit dependency contracts,
3. resolve defaults at the narrowest allowed outer boundary that already owns
   runtime wiring,
4. only then remove the retired `core` helper imports from the leaf helpers.

Non-goals for the batch:

- do not redesign the whole pass/start orchestration surface,
- do not change runtime semantics of reviewer refresh or reviewer directive
  fallback,
- do not mix the UI router or `createBubble` retained bridge into the same
  batch.
| W7 | converged reviewer shim retirement | medium | validated | `convergedValidation*` stopped importing the retired `core/reviewer/summaryVerifierConsistencyGate` shim and now uses the canonical shared reviewer surface; warn-only coverage moved from `294 -> 263` total and the retired-shim subset dropped from `15 -> 8` |
| W8 | easy frontier reassessment | mixed | validated | The obvious easy frontier is now materially exhausted; attempted `infrastructure/ui` rewrite to direct `v11/application` facades opened `infrastructure -> application` dependency failures, so the UI router cluster is explicitly reclassified out of the easy wave |
| W9 | approval dependency bridge | medium | planned | Rewrite `approval` contract/default wiring away from `core` shims |
| W10 | reviewer evidence / brief bridge cleanup | medium | planned | Retire the `core/reviewer/testEvidence` and `core/reviewer/reviewerBrief` bridges via explicit dependency/default wiring, not path-only rewrites |
| W11 | metrics and create owner cleanup | hard | planned | Decide `shared/metrics/bubbleEvents` and `createBubble` end-state before removing the remaining retained bridges |
| W12 | boundary test re-hardening | mixed | planned | Return coverage test to fail-only |

## Stop Conditions

This wave should stop only when one of these is true:

1. the boundary coverage test is back to fail-only and green,
2. the remaining residuals are explicitly documented hard cases with a separate
   approved architecture plan,
3. or the repo intentionally accepts a smaller documented allowlist instead of
   full elimination.

## Immediate Next Step

Start with Wave 0:

- collect the current warn-only coverage inventory,
- group it by consumer cluster,
- tag each residual as `easy`, `medium`, or `hard`,
- then open the first thin-shim rewrite batch.

Wave 0 is now complete enough to start Wave 1:

- start with thin-shim consumer rewrites against:
  - `stateStore`
  - `bubbleLookup`
  - `transcriptStore`
  - `sessionsRegistry`
  - `tmuxManager`
  - `tmuxDelivery`
- defer `createBubble`, `metrics/events`, and the `fileLock` bridge until the
  thin-target frontier is materially smaller.

Wave 1 lesson from the first batch:

- `thin core target` does **not** automatically mean `easy consumer rewrite`,
- application-layer consumers cannot be rewritten straight to
  `v11/infrastructure/**` without opening dependency violations,
- therefore the remaining easy frontier should prefer:
  - `infrastructure -> infrastructure` rewrites,
  - `shared -> shared` rewrites,
  - `application -> shared` rewrites,
- and defer `application -> infrastructure` candidates to the `medium` wave
  unless an existing `shared/ports/**` or `shared/**` canonical boundary
  already exists.

Current effective residual baseline after the first medium cleanup:

- total direct residual imports: `263`
- retired-shim subset: `8`

Current remaining retired-shim frontier:

- `src/v11/application/converged/convergedValidationPreparation.ts`
  - `src/core/reviewer/testEvidence.ts`
- `src/v11/application/create/createCommandApi.ts`
  - `src/core/bubble/createBubble.ts`
- `src/v11/application/delete/deleteBubbleSupport.ts`
  - `src/core/bubble/deleteBubbleDefaults.ts`
- `src/v11/application/pass/reviewerDeliveryHelpers.ts`
  - `src/core/reviewer/reviewerBrief.ts`
- `src/v11/application/pass/reviewerTestDirectiveResolver.ts`
  - `src/core/reviewer/testEvidence.ts`
- `src/v11/application/start/startCommandContext.ts`
  - `src/core/reviewer/reviewerBrief.ts`
- `src/v11/application/start/startCommandResumeFlowPreparation.ts`
  - `src/core/reviewer/testEvidence.ts`
- `src/v11/shared/metrics/bubbleEvents.ts`
  - `src/core/metrics/events.ts`

Wave note:

- these are no longer thin rewrite candidates,
- the next productive waves should center on:
  - reviewer evidence / reviewer brief dependency-default cleanup,
  - approval dependency-resolution cleanup,
  - explicit hard-decision handling for `createBubble` and `metrics/events`.
- delete support now uses a dedicated core perimeter defaults owner
  (`src/core/bubble/deleteBubbleDefaults.ts`), reducing the support file to a
  single explicit perimeter import instead of eight scattered core imports.
