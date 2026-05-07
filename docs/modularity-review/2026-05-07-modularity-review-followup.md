# Modularity Review (Follow-Up)

**Scope**: Entire Pairflow repository (`src/**`, `ui/**`, `tools/fitness/**`, `plans/archive/**`)
**Date**: 2026-05-07

This document is a complementary follow-up to [`2026-05-07-modularity-review.md`](./2026-05-07-modularity-review.md). It does not restate that review's three issues (shared mutation helpers owning lifecycle policy, meta-review submit validation split across shared/domain, UI timeline contract retaining protocol-shaped entries). It surfaces three additional integrations that were not flagged there but that the [balance rule](https://coupling.dev/posts/core-concepts/balance/) rates as imbalanced.

## Executive Summary

Pairflow's `src/v11/**` layered architecture passes every hard-fail fitness check, so the obvious forbidden import edges are gone. The remaining [modularity](https://coupling.dev/posts/core-concepts/modularity/) risk now lives one level beneath the static checks, in three places the prior review did not address: a systematic dynamic-import workaround that subverts the `application_defaults_boundary` and `shared_defaults_boundary` checks, a 636-line god type module at `src/types/bubble.ts` that 306 v11 files depend on, and forced micro-fragmentation under `application/<command>/**` driven by the 500-line file budget rather than by domain seams. All three are concentrated in [high-volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) lifecycle and command-orchestration code, so the imbalance shows up as cascading edits across many small files on every feature plan.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `application/**` and `shared/**` -> `defaults/**` via `function get<X>ModulePath() { return "..." } ; await import(get<X>ModulePath())` | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (real call hidden behind dynamic import) | Static distance is artificial: the AST scanner cannot see the path; runtime distance is zero | High composition wiring volatility in lifecycle/meta-review areas | **No** |
| 306 v11 files (159 `application`, 86 `shared`, 30 `infrastructure`, 26 `domain`, 5 `defaults`) -> `src/types/bubble.ts` | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (~30 exported types and consts spanning lifecycle, config, agents, review policy, meta-review, remote pointers, execution context) | Single root file, low logical distance | Very high — every recent feature plan modifies it | **No** |
| Sibling files inside one `application/<command>/**` directory (e.g. `kickoff/`=62, `metaReviewGate/`=55, `pass/`=48, `start/`=34, `metaReview/`=14) | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (one command's flow split across many files) | Same directory, very low distance | High (commands evolve continuously) | **Partially** — formula-balanced, but [low cohesion](https://coupling.dev/posts/core-concepts/balance/) at the directory level |
| `src/v11/shared/ports/**` (29 files) -> `src/v11/infrastructure/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High (intentional) | Mixed | **Yes** |

## Issue: Defaults boundary fitness checks are systematically bypassed by dynamic imports

**Integration**: `src/v11/application/**` and `src/v11/shared/**` -> `src/v11/defaults/**` via `function get<X>ModulePath(): string { return "../../defaults/.../X.js" }` followed by `await import(get<X>ModulePath())`
**Severity**: Significant

### Knowledge Leakage

The `application_defaults_boundary` and `shared_defaults_boundary` fitness checks (`tools/fitness/checks/application-defaults-boundary.ts`, `tools/fitness/checks/shared-defaults-boundary.ts`) are intended to protect composition ownership: application and shared code must depend on `shared/ports/**` capability contracts, not on the `defaults/**` wiring that picks the concrete `infrastructure/**` adapter. The architecture document `docs/architecture/architecture-fitness-checks.md` calls out the exact failure mode this is meant to prevent: "a forbidden edge disappears, but the code still violates the purpose of the rule through a thin wrapper or re-export camouflage".

42 files now use this shape:

```ts
function getStateStoreDefaultsModulePath(): string {
  return "../../defaults/state/stateStoreDefaults.js";
}
await import(getStateStoreDefaultsModulePath());
```

The path string is hidden behind a function so the AST-based check (which only follows literal-string `import(...)` arguments) records no edge. Examples:

- `src/v11/application/state/stateStoreDependencyDefaults.ts:18-25`
- `src/v11/application/process/processSpawnDependencyDefaults.ts:3-10`
- `src/v11/application/start/startBubbleDependencyDefaults.ts:56-69`
- `src/v11/shared/state/stateStoreDefaults.ts:21-31`
- `src/v11/application/commit/commitCliCommand.ts:18`
- `src/v11/application/reviewer/reviewerTestEvidenceDefaults.ts:18-30`
- ... and 36 more across `application/{commit, merge, delete, reconcile, restart, watchdog, askHuman, kickoff (via createBubbleDefaults), repoRegistry, status, tmux, bubbleIdentity, ...}` and `shared/{bubbleLookup, transcript, status, read-model/list, metaReview, metrics, actorProtocol, ...}`.

The static graph passes. The runtime call graph contains exactly the edge the policy was designed to forbid.

This is high [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/): each helper exposes the public callable surface of the underlying defaults module, often with a one-line re-implementation that just `await`s and re-applies the original signature. It is closer to a [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) bridge than a [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) seam.

### Complexity Impact

The architecture model says application code should depend on a port, and infrastructure should be wired in `defaults/**`. The current pattern lets application and shared code reach defaults at runtime while remaining static-graph-clean. Two costs follow.

First, the architecture model loses its predictive power. A reader cannot answer "what does this command depend on?" by reading imports; they must also grep for `getXModulePath`. The fitness report says the layering is intact, but the runtime composition is not.

Second, the workaround ossifies. Because the helpers are syntactically identical and easy to copy, every new defaults capability tends to ship its own helper. The pattern grows linearly with feature work. Removing it later requires touching 42 sites.

This is the [tight coupling](https://coupling.dev/posts/core-concepts/balance/) that the layering rule was built to prevent, made invisible.

### Cascading Changes

A change to a default's exported function signature still cascades to every helper that mirrors that signature, plus its `application/<cmd>/**` callers, exactly as if the import edge existed. Because the helpers reproduce signatures by hand (rest-args forwarding in `processSpawnDependencyDefaults.ts`, explicit per-export wrappers in `stateStoreDependencyDefaults.ts`), signature drift between the defaults module and the helper produces silent runtime failures rather than typecheck failures. The dynamic import is typed as `unknown` and cast at the boundary.

### Recommended Improvement

Treat each helper as one of two cases:

1. **The wiring really does need to cross the boundary** (e.g. `processSpawnDefault`, `readStateSnapshot`, `writeStateSnapshot`). In that case, the correct answer is the existing port: `application/**` already imports `shared/ports/processSpawn.ts` and `shared/ports/stateSnapshots.ts`. The runtime adapter should be injected as a dependency from the composition root (`src/cli/**` entrypoints, contract test wiring), not pulled in at module load via a dynamic import. The helper file disappears; its consumers take the port as a constructor/parameter dependency the way `EmitPassDependencies` already does in `src/v11/application/pass/passCommandContract.ts`.

2. **The wiring is genuinely command-local** and only one application command consumes it. In that case the underlying default belongs under that command's `application/<command>/**` directory and the dynamic-import indirection adds no value; collapse it to a plain import.

In both cases, the dynamic-import-with-path-helper shape should not exist in the repository. If a helper truly needs to break the rule for a documented reason (e.g. a strangler-style migration), the [Triage Matrix](../architecture/architecture-fitness-checks.md) `legacy-bridge-for-now` category exists for that, and the policy supports `allow-shared-defaults-boundary-import` exceptions with explicit `id`/`owner`/`reason` — that is the correct surface for opting out, not a function literal.

The fitness checker should be hardened in parallel: extend `parseImportSpecifiers` so that an `import(call())` whose argument is a function call returning a string-literal-typed value is reported as `import-target-unresolved`. A targeted regression test: `tools/fitness/checks/shared-defaults-boundary.ts` should fail today on the existing 42 files; it does not. That gap is itself a coupling problem, because it lets the static check's pass rate drift from the architecture's actual posture.

The trade-off is a one-time migration of 42 helpers and possibly a small amount of composition-root rewiring, against permanently restoring the meaning of two fitness checks.

## Issue: `src/types/bubble.ts` is a 636-line god type module fanning out to 306 v11 files

**Integration**: 306 `src/v11/**` files (159 application, 86 shared, 30 infrastructure, 26 domain, 5 defaults) -> `src/types/bubble.ts`
**Severity**: Significant

### Knowledge Leakage

`src/types/bubble.ts` is the single canonical source for, in one file:

- lifecycle states (`bubbleLifecycleStates`, `BubbleLifecycleState`)
- agent identity (`AgentName`, `AgentRole`, `BubbleAgentsConfig`, `resolveConfiguredAgentForRole`, `resolveUniquelyConfiguredRoleForAgent`)
- workspace and quality modes (`WorkMode`, `QualityMode`, `ReviewerContextMode`, `PairflowCommandProfile`)
- review policy (`BubbleReviewPolicyConfig`, `BubbleReviewPolicyRuntimeView`, `BubbleReviewLoopMode`, `BubbleReviewAutoReworkSeverity`)
- meta-review snapshot and runtime delivery (`BubbleMetaReviewSnapshotState`, `BubbleMetaReviewExecutionContext`, `BubbleMetaReviewRuntimeDeliveryState`, `MetaReviewRunStatus`, `MetaReviewRecommendation`)
- remote/SSH executor model (`BubbleExecutorConfig`, `BubbleExecutorType`, `PairflowRemoteHostConfig`, `BubbleRemotePointer`, `BubbleRemotePointerCreated`, `BubbleRemotePointerStarted`, `BubbleRemoteStateCache`)
- ideation, doc-contract gates, attach launcher, local overlay, validation target, command profile, rework intent, failing gates, spec lock state, round-role history
- the canonical `BubbleStateSnapshot` data shape and `BubbleConfig` runtime config
- type-guard functions for many of the above
- one piece of policy logic (`resolveConfiguredAgentForRole` is a real function, not a type guard)

This is [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) at extreme breadth. The file is the de facto domain kernel, but it lives outside the layered `v11` architecture and so escapes every governance document under `docs/architecture/**`. The `v11-placement-and-extraction-governance.md` source-of-truth rule applies to `src/v11/**`; `src/types/bubble.ts` predates that rule and was never moved.

The [domain](https://coupling.dev/posts/related-topics/domain-driven-design/) concerns mixed in this single file span a [core subdomain](https://coupling.dev/posts/dimensions-of-coupling/volatility/) (lifecycle, agent protocol, meta-review authority — Pairflow's competitive logic), a supporting subdomain (review policy, ideation, doc-contract gates), and a generic subdomain (SSH executor pointers, attach launchers). They share nothing except being "bubble-related".

### Complexity Impact

[Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is high and concrete. Sampling the most recent feature plans in `plans/archive/`:

- `2026-04-27-meta-review-consecutive-clean-runs-plan-v1` Phase 1 lists `src/types/bubble.ts` as a target file.
- `2026-04-27-meta-review-consecutive-clean-runs-plan-v1` Phase 3 (read-model + UI) lists `src/types/bubble.ts` and `src/types/ui.ts` as target files.
- `2026-04-29-repo-level-validation-profile-plan-v2` modifies it to add validation-target shape.
- `2026-05-04-ideation-bubble-extract-plan-v1` modifies it to extend ideation config.
- `2026-05-04-pre-kickoff-admin-phase-plan-v1` modifies it for the new phase.

Every meaningful product change of recent weeks touched this file. Combined with 306 importers across every layer, the [cost of change](https://coupling.dev/posts/dimensions-of-coupling/distance/) is amplified by fan-out: a small change to `BubbleConfig` has model-coupled rebuild and re-test pressure on 159 application files alone.

The [balance rule](https://coupling.dev/posts/core-concepts/balance/) is unbalanced: model strength is moderate-to-high, distance is minimal (single file imported everywhere), and volatility is high. By the formula `STRENGTH XOR DISTANCE OR NOT VOLATILITY`, the integration is balanced only when volatility is low. It is not.

The prior review's Issue #1 already attacks this from the *mutation* side (lifecycle helpers under `shared/**` knowing transition policy). It is the same coupling problem from the *type* side: lifecycle, agent, review policy, and SSH executor types share one file because they share one consumer-set, not because they share meaning.

### Cascading Changes

The lockstep between this file and `src/contracts/ui/uiActions.ts` is the most visible cascade. `uiActions.ts` redeclares `AgentName`, `AgentRole`, lifecycle states, and protocol message types as parallel string-literal unions for browser safety, and `tests/contracts/uiContractTransitSource.test.ts` enforces parity. Adding a state, a role, a protocol message type, or an executor kind requires a coordinated edit in at least `src/types/bubble.ts`, `src/contracts/ui/uiActions.ts`, the parity tests, and the v11 consumers that switch on the literal.

Adding a meta-review state field cascades into `src/types/bubble.ts` (snapshot type), `src/v11/shared/state/stateSchemaMetaReview*.ts` (validation), `src/v11/shared/metaReview/metaReviewSnapshot.ts` (normalization), the meta-review gate apply pipeline (13 files in `shared/metaReviewGate/**`), the read-model projection (`shared/read-model/list/listReadModelEntryProjection.ts`, `shared/status/statusCommandViewBuilder.ts`), the SSH status payload (`infrastructure/executor/ssh/sshBubbleStatusPayload.ts`), and the UI presenter chain (`infrastructure/ui/presenters/bubblePresenter.ts`, `routerActionDispatch.ts`, `routerActions.ts`, `routerHttp.ts`). The `2026-04-27-meta-review-consecutive-clean-runs-plan-v1` Phase 3 task target list contains exactly this footprint: 20 source files plus 6 test files.

### Recommended Improvement

Split `src/types/bubble.ts` along subdomain seams the type already encodes, and move each slice to the canonical owner that already exists under `src/v11/**`:

- **Lifecycle and snapshot** (`bubbleLifecycleStates`, `BubbleLifecycleState`, `BubbleStateSnapshot`, `BubbleExecutionContext`, `RoundRoleHistoryEntry`, related guards) -> `src/v11/shared/state/`. The state schema and validation already live there; the type definition should live next to its validator.
- **Agent identity and roles** (`AgentName`, `AgentRole`, `agentRoles`, `agentNames`, `BubbleAgentsConfig`, `resolveConfiguredAgentForRole`, `resolveUniquelyConfiguredRoleForAgent`) -> `src/v11/domain/agentIdentity/` (new). `resolveConfiguredAgentForRole` is policy logic, not a type, and currently has no home that matches its meaning.
- **Review policy** (`BubbleReviewPolicyConfig`, `BubbleReviewPolicyRuntimeView`, `BubbleReviewLoopMode`, `BubbleReviewAutoReworkSeverity`, `BubbleReviewSupportStatus`) -> `src/v11/shared/reviewPolicy/`. The runtime helpers already live there.
- **Meta-review snapshot and runtime delivery** (`BubbleMetaReviewSnapshotState`, `BubbleMetaReviewExecutionContext`, `BubbleMetaReviewRuntimeDeliveryState`, `MetaReviewRunStatus`, `MetaReviewRecommendation`, related types) -> `src/v11/shared/metaReview/`. Same colocation rationale.
- **Remote executor and pointers** (`BubbleExecutorConfig`, `BubbleExecutorType`, `PairflowRemoteHostConfig`, `BubbleRemotePointer*`, `BubbleRemoteStateCache`) -> `src/v11/shared/remote/`. The executor surface is already a recognized boundary.
- **Bubble configuration aggregate** (`BubbleConfig`, `BubbleCommandsConfig`, `BubbleNotificationsConfig`, `BubbleLocalOverlayConfig`, `BubbleDocContractGatesConfig`, `BubbleIdeationConfig`, `BubbleValidationTargetConfig`, `LocalOverlayMode`, `WorkMode`, `QualityMode`, `ReviewerContextMode`, `PairflowCommandProfile`, `AttachLauncher`) -> `src/config/bubbleConfig.ts` (already exists) plus a small `src/v11/shared/bubble/` aggregate that re-exports the slice types into `BubbleConfig`'s shape.

After the split, no single file owns more than one subdomain's vocabulary, and the per-feature target file count for type changes drops to the slice that actually changed. The `src/types/bubble.ts` file becomes a thin temporary re-export bridge under the [Temporary Adapter Rule](../architecture/v11-placement-and-extraction-governance.md), and is removed once consumers migrate.

The cost is a mechanical move-and-rename across ~300 files, plus updates to the UI contract parity guards. The benefit is that "where does this type live?" matches "what subdomain owns this concern?" — the [source-of-truth rule](../architecture/v11-placement-and-extraction-governance.md) starts applying to types as well as to logic.

A useful sequencing rule: do not split until the prior review's Issue #1 (shared mutation helpers) is resolved or in flight. The mutation refactor decides which `shared/state/**` and `domain/state/**` boundaries exist; the snapshot type should land at whichever owner the mutation refactor picks, not before.

## Issue: `application/<command>/**` directories are micro-fragmented under file-budget pressure

**Integration**: Sibling files inside one command directory (e.g. `src/v11/application/kickoff/**` 62 files, `application/metaReviewGate/**` 55, `application/pass/**` 48, `application/start/**` 34, `application/converged/**` 23, `application/create/**` 27)
**Severity**: Significant

### Knowledge Leakage

The `complexity` fitness check enforces a 500-line file budget (`tools/fitness/checks/complexity.ts:33`) and a 120-line function budget. The check has no notion of directory cohesion. As commands have grown, their application directories have absorbed the growth by splitting into more files rather than by carving out new boundaries.

`application/kickoff/**` is the clearest example: 62 sibling files at average 75-80 lines, all named `kickoff*.ts`, all collaborating on one logical command. The directory contains seven mutation-pipeline files (`kickoffMutationExecution.ts`, `kickoffMutationFailureHandling.ts`, `kickoffMutationGuardedExecution.ts`, `kickoffMutationPipeline.ts`, `kickoffMutationPipelineContract.ts`, `kickoffMutationPipelineFlowHelpers.ts`, `kickoffMutationPipelineInputBuilders.ts`), four mutation-rollback files (`kickoffMutationRollback.ts`, `kickoffMutationRollbackFailure.ts`, `kickoffMutationRollbackInputBuilder.ts`, `kickoffRollbackStepExecution.ts`), and seven validated-execution files (`kickoffValidatedExecution.ts`, ...DeliveryPersistencePreparationResultBuilders.ts variants).

These files share command-local types, error codes, and helper imports. They do not represent independent abstractions; they represent one workflow sliced to fit under 500 lines. The strength among them is [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/), not [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/).

By the [balance rule](https://coupling.dev/posts/core-concepts/balance/), `STRENGTH XOR DISTANCE OR NOT VOLATILITY` is satisfied: distance is minimal because everything is in the same directory, so high strength is allowed. But the rule's [low strength + low distance](https://coupling.dev/posts/core-concepts/balance/) warning applies in reverse here: high strength + low distance + many siblings is the directory-level shape of a [big ball of mud](https://coupling.dev/posts/core-concepts/balance/), where one logical change requires reading 10-20 sibling files to reconstruct intent.

### Complexity Impact

The fragmentation is invisible to fitness because each file is small and has a clear name. It is visible at change time. Sampling recent feature plans:

- `2026-04-27-meta-review-consecutive-clean-runs-plan-v1` Phase 2 (gate routing) lists 13 target files, all under `src/v11/shared/metaReviewGate/**`.
- `2026-04-27-meta-review-consecutive-clean-runs-plan-v1` Phase 5 (clean-rerun canonical context) lists 11 target files, mostly under `shared/metaReviewGate/**` plus three under `shared/metaReview/**` and `shared/state/**`.
- `2026-05-05-shared-command-boundary-cleanup-plan-v1` task `9-list-readmedl-introduce` lists 21 target files; task `10-list-runtime-cutover` lists 15.

A single logical change ("add a counter and route differently when it is below threshold") expanded to 13 files in one phase, all colleagues. The complexity check ensured each file is small; it did not ensure the logical change stayed cohesive.

[Cognitive load](https://coupling.dev/posts/core-concepts/complexity/) for a developer (or LLM) editing the kickoff command requires holding more than the 4±1 short-term-memory units the [balanced coupling model](https://coupling.dev/posts/core-concepts/balance/) discusses. In practice the LLM workflow that the user described handles this scale because LLMs read more files cheaply, but the friction shows up as long target file lists in every plan and as reviewer fatigue when verifying that all 13 sibling edits are consistent.

### Cascading Changes

The cascade is contained inside one directory, which is the formula's reassuring case. But because helpers are split by mechanical line-budget rather than by abstraction, change cost scales with file count rather than with concept count. Adding a new validated-execution branch to `kickoff` may require touching `kickoffValidatedExecution.ts`, `kickoffValidatedExecutionDelivery.ts`, `kickoffValidatedExecutionInputBuilders.ts`, `kickoffValidatedExecutionMutation.ts`, `kickoffValidatedExecutionPersistence.ts`, `kickoffValidatedExecutionPreparation.ts`, and `kickoffValidatedExecutionResultBuilders.ts` — seven files for what would be one method on a class.

A related symptom: the file-budget pressure leaks into shared code as well. `shared/metaReviewGate/**` has 17 files (`metaReviewGateApply.ts`, `metaReviewGateApplyContext.ts`, `metaReviewGateApplyHelpers.ts`, `metaReviewGateApplyObservation.ts`, `metaReviewGateApplyPersistence.ts`, `metaReviewGateApplyRunRouting.ts`, ...). The `Apply` family alone is six files. This is the same pattern with a different layer label, and the prior review's Issue #2 picks it up from the policy-ownership angle.

### Recommended Improvement

Two changes that work together:

1. **Make the complexity check aware of directory cohesion.** Add a per-directory metric to `tools/fitness/checks/complexity.ts`: when a directory under `application/<command>/**` exceeds N files (initial proposal: 20), require the directory to declare an internal sub-boundary using the `internal/` convention from `docs/architecture/v11-internal-module-boundaries.md`, or split into named sub-directories that reflect real abstraction (e.g. `kickoff/mutation/`, `kickoff/validation/`, `kickoff/rollback/`, `kickoff/cli/`). The signal "directory has 60 files all named `kickoff*.ts`" is the smell; the signal "directory has 60 files spread across three named subdirectories with explicit public surfaces" is fine.

2. **Raise the per-file budget from 500 to roughly 800-1000 lines for `application/**`** *and* tighten the per-function budget. The 500 line ceiling forces splits that the function budget already discourages. A larger file budget combined with a stricter function budget produces fewer files of more cohesive content. The current 120-line function budget is reasonable; the 500-line file budget is the binding constraint. Calibrate against the real distribution: today's `application/**` 90th-percentile file is around 350 lines, so 800 is generous but not lax.

These two changes redirect fitness pressure from "make every file small" toward "make every directory's purpose obvious", which is the actual modularity goal.

The trade-off is some larger files reappearing where they correctly belong. The benefit is that command directories regain visible internal structure, and feature plans can target a sub-boundary instead of a sibling list. After the change, the prior review's Issue #1 recommendation (split mutation construction from execution and move construction to `domain/state`) becomes easier because the application command directories will already have explicit sub-boundaries to receive the moved-in pieces.

This issue is the directory-level analog of what `docs/architecture/v11-internal-module-boundaries.md` already enforces at the module level. It should not require a new doctrine, only an extension of the existing internal-module convention to commands whose application directory has crossed the comfort threshold. `kickoff`, `metaReviewGate`, `pass`, and `start` are the obvious first candidates.

## Notes

`pnpm fitness:check:ci` was not re-run for this follow-up; the prior review confirmed it passes today. The findings above explicitly describe gaps in what the fitness suite currently detects, so a green run does not refute them.

The dynamic-import workaround discussed in the first issue is the most actionable item: it can be measured (42 sites), the fix shape is clear (port-based dependency injection that already exists for some commands), and tightening `tools/fitness/checks/shared-defaults-boundary.ts` to flag function-call import targets gives a regression bound. The directory micro-fragmentation issue is the most strategically important: it shapes how every future command grows, and it is the limit on the lifecycle and meta-review consolidation work the prior review recommended.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
