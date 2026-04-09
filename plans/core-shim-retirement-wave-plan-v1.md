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

Observed warning snapshot when the test was downgraded:

- about `323` direct `src/v11/**` or `src/cli/**` imports from `src/core/**`
- about `17` imports in the explicit retired-shim subset
- about `2` public `src/index.ts` exports still pointing at `./core/...`

These numbers are triage inputs, not yet a finalized ledger.

## Progress Ledger

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

Latest validated state:

- `tests/contracts/v11/core-shim-boundary-coverage.test.ts` PASS in warn-only mode
- all hard-fail fitness checks PASS
- no active dependency-direction regressions introduced by the easy waves

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
