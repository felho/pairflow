# Modularity Review (Follow-Up)

**Scope**: Entire Pairflow repository (`src/**`, `ui/**`, `tools/fitness/**`, `docs/architecture/**`)
**Date**: 2026-05-08

This document is a complementary follow-up to [`2026-05-08-modularity-review.md`](./2026-05-08-modularity-review.md). It does not restate that review's three issues (UI contract parallel string-literal unions, missing `internal/` sub-boundary in the four largest application command directories, and the dynamic-import path-helper bypass at `application/open/openBubbleDefaults.ts`). All three landed since the prior review was written: the kernel vocabulary at `src/contracts/kernel/**` (commit `ce35fd2b`), explicit `internal/` boundaries inside `application/{start, kickoff, pass, askHuman}/` plus a new "flat application command directory threshold = 27" rule inside the `internal_module_boundary` fitness check (commit `7ab83b61`), and the relocation of `openBubbleDefaults.ts` into `src/v11/defaults/open/` so the composition root owns the wiring (commit `64a001e2`).

This follow-up surfaces three additional integrations that the [balance rule](https://coupling.dev/posts/core-concepts/balance/) rates as imbalanced now that the prior issues are gone, plus one parking-lot item left as a note.

## Executive Summary

Pairflow's `src/v11/**` layered architecture passes every hard-fail fitness check (`boundary`, `mutation`, `transition`, `error`, `complexity`, `dependency`, `application_defaults_boundary`, `shared_defaults_boundary`, `internal_module_boundary`, `critical_side_effect`, `ui_contract_boundary`, `ui_router_port_boundary`, `contract_timeout_policy`). The `internal_module_boundary` check now also enforces a directory-cohesion metric (flat application command directories > 27 files must declare an `internal/` sub-boundary), so the recent split is not just done but also locked in. The remaining imbalances are quieter and live one layer beneath the static checks: a vestigial alias layer on top of the new kernel that creates dual naming for the same vocabulary in the UI bundle, four shared vocabulary clusters that exhibit the same flat-sibling failure mode the application layer just fixed but at a higher distance, and four application command directories that sit just below the new 27-file threshold and trend toward it.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/contracts/kernel/**` -> `src/contracts/ui/uiActions.ts` 1:1 `Ui*` aliases (`UiActionAgentName = AgentName`, etc.) -> `@pairflow/ui-contracts` -> `ui/src/lib/types.ts` (which imports both canonical kernel names AND `Ui*` aliases for the same vocabulary) | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (no-op rename of canonical types) | Reaches the UI bundle through a tsconfig path alias; same logical layer | Medium — kernel vocabulary moves with every protocol/role/lifecycle addition | **No** |
| `src/v11/shared/state/**` (15 files, 1817 LOC), `src/v11/shared/metaReview/**` (16 files, 1524 LOC), `src/v11/shared/reviewer/**` (16 files, 1478 LOC), `src/v11/shared/gates/**` (12 files, 1090 LOC) — flat sibling lists owning core vocabulary, no `internal/` sub-boundary | [Functional + Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (clusters share command-local schema and submit pipelines) | Same directory, but each cluster is consumed across many commands (state: 104 importers, metaReview: 64, reviewer: 55, gates: 23) | High — every recent feature plan modifies state schemas, meta-review submit, gate evaluation | **Partially** — directory-internal distance is low, but the cross-command consumer fan-out and lack of declared public surface produces the same change-cost shape the application layer just paid to fix |
| `src/v11/application/converged/` (21 files), `application/planWatch/` (21), `application/approval/` (20), `application/create/` (17) — flat sibling lists below the new 27-file `internal_module_boundary` threshold | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (one command's flow split across many files) | Same directory, very low distance | High (these commands evolve with every lifecycle/remote-execution feature) | **Partially** — formula-balanced, threshold-tolerated, but the same low-cohesion-at-change-time shape that triggered the prior review's Issue 2 |
| `src/v11/application/**` -> `src/v11/ports/**` -> `src/v11/infrastructure/**` (29 ports; top consumer counts: stateSnapshots 52, transcript 33, tmuxDelivery 29, bubbleLookup 26, runtimeSessions 21) | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High (intentional) | Mixed | **Yes** |
| `tools/fitness/**` -> `src/v11/**` policy enforcement (now 13 hard-fail checks, including the new directory-cohesion metric) | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) policy enforcement | Medium | Medium | **Yes** |

## Issue: `src/contracts/ui/**` keeps a 1:1 `Ui*` alias layer over the kernel that re-introduces dual naming for the same vocabulary in the UI bundle

**Integration**: `src/contracts/kernel/{agentIdentity, lifecycle, protocol}.ts` -> `src/contracts/ui/uiActions.ts` (`UiActionAgentName = AgentName`, `UiActionAgentRole = AgentRole`, `UiActionProtocolMessageType = ProtocolMessageType`, `UiActionApprovalDecision = ApprovalDecision`, `UiActionPassIntent = PassIntent`, `UiActionProtocolParticipant = ProtocolParticipant`, `UiActionFindingsClaimState`, `UiActionFindingsClaimSource`) + `src/contracts/ui/bubbleLifecycle.ts` -> `@pairflow/ui-contracts` re-export -> `ui/src/lib/types.ts` (one import block contains both `BubbleLifecycleState` and `ProtocolMessageType` directly under their canonical names, alongside `UiApprovalDecisionDeliverySignal` and other `Ui*` DTOs that internally refer to `UiAction*` aliases)
**Severity**: Significant

### Knowledge Leakage

The kernel migration removed the parallel string-literal redeclaration the previous review flagged. What replaced it is a thinner — but still real — coupling: a 1:1 type-alias layer in `src/contracts/ui/uiActions.ts` that renames every kernel literal union without changing the underlying type:

```ts
import type {
  AgentName, AgentRole, ApprovalDecision,
  FindingsClaimSource, FindingsClaimState,
  PassIntent, ProtocolMessageType, ProtocolParticipant
} from "../kernel/index.js";

export type UiActionAgentName = AgentName;
export type UiActionAgentRole = AgentRole;
export type UiActionProtocolParticipant = ProtocolParticipant;
export type UiActionProtocolMessageType = ProtocolMessageType;
export type UiActionApprovalDecision = ApprovalDecision;
export type UiActionPassIntent = PassIntent;
export type UiActionFindingsClaimState = FindingsClaimState;
export type UiActionFindingsClaimSource = FindingsClaimSource;
```

The `Ui*` aliases are not used to constrain the kernel types or to attach UI-specific structure; they are exact synonyms. They are then composed into legitimate DTOs (`UiActionBubbleState`, `UiActionEvent`, `UiApprovalDecisionDeliverySignals`, etc.) that the UI bundle does need.

The leak is downstream: `ui/src/lib/types.ts` imports a single block from `@pairflow/ui-contracts` (the path alias for `src/contracts/ui/index.ts`) that mixes both naming conventions in the same import:

```ts
import type {
  BubbleLifecycleState,           // canonical kernel name
  ProtocolMessageType,             // canonical kernel name
  UiApprovalDecisionDeliverySignal,// Ui* DTO
  UiBubbleListEntry,               // Ui* DTO
  ...
} from "@pairflow/ui-contracts";
```

The UI tsconfig (`ui/tsconfig.json`) maps `@pairflow/ui-contracts` only to `../src/contracts/ui/index.ts`; the kernel is reachable in the UI bundle exclusively through the `contracts/ui/index.ts` re-exports. So the `Ui*` aliases are not gating bundle isolation either — the kernel content already crosses the boundary, just under a partially-renamed surface. This is [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) made redundant by the kernel split: the UI bundle and the backend now share the canonical types, but the contract surface still pretends to keep a renamed copy.

### Complexity Impact

The renaming layer's cost is small per change (one alias line per new vocabulary item), but it imposes a permanent decision tax: every new agent role, protocol message type, approval decision, or findings-claim state needs an explicit answer to "do we add a `UiAction*` alias for this, or import the kernel name?" The current state of `ui/src/lib/types.ts` shows the answer drifted: `BubbleLifecycleState` and `ProtocolMessageType` are imported directly, but `UiActionAgentName` / `UiActionPassIntent` are still used as the canonical UI form in some files. There is no rule that says which one to pick, and the parity test that used to govern the duplication was retired with the kernel migration.

The volatility evidence the prior review used for the parallel-redeclaration version still applies, just with smaller per-change surface: meta-review states, executor types, lifecycle states, protocol message types, and approval decisions are exactly the [core-subdomain](https://coupling.dev/posts/dimensions-of-coupling/volatility/) vocabulary that changes most. Each addition now picks up one rename line plus the call-site convention question.

### Cascading Changes

A new `AgentName` value (e.g. a third agent beyond `codex`/`claude`) currently requires: kernel addition in `contracts/kernel/agentIdentity.ts`, alias line update in `contracts/ui/uiActions.ts` (already type-derived, so no edit needed for set-extensions of unions, but new aliases for new types still need explicit lines), domain code paths that switch on the agent, and any UI presenter that switches. The rename layer adds nothing to the cascade — but it also removes nothing. Removing it converts every `UiAction*` import in the UI to the canonical kernel name, which is mechanical and one-time.

The user has not yet decided whether the alias layer is intentional (a permanent UI-surface contract) or transitional (the second half of the kernel migration). Both interpretations are defensible: a permanent rename layer can in principle anchor a future divergence between backend vocabulary and UI vocabulary, but in practice none has materialized in 24 hours of post-migration commits, and the alias-line growth rule has no documented owner.

### Recommended Improvement

Pick one of two coherent shapes and write it down:

1. **Promote the kernel as the canonical UI vocabulary; retire the `Ui*` aliases.** Add `src/contracts/kernel/**` to the UI tsconfig path alias (or extend `src/contracts/ui/index.ts` to re-export the kernel under its canonical names), then mechanically replace `UiActionAgentName` -> `AgentName`, `UiActionProtocolMessageType` -> `ProtocolMessageType`, etc. across `src/contracts/ui/**` and `ui/src/**`. Keep `Ui*`-prefixed names only for legitimate DTOs that compose the canonical types (`UiActionEvent`, `UiActionBubbleState`, `UiApprovalDecisionDeliverySignal`, etc.). This is the lower-coupling form: one canonical name per vocabulary, one place to add new values.

2. **Make the `Ui*` aliases an intentional, exhaustive boundary; document it; lock it down.** Forbid direct imports of `AgentName`/`AgentRole`/`ProtocolMessageType`/`ApprovalDecision`/`PassIntent` from the kernel into `src/contracts/ui/**` and `ui/src/**` via a small fitness check, and rename `BubbleLifecycleState` to `UiActionBubbleLifecycleState` in the UI to make the rename layer complete instead of partial. This is the conservative form: the rename layer becomes a real translation seam that the UI can later diverge from.

Doing neither — leaving the partial-migration state in place — is what produced the dual-naming pattern in `ui/src/lib/types.ts` and will keep producing it. The recommended option is **1**: it removes the rename without information, the kernel is already browser-safe, and the application/domain layers already use canonical names everywhere else.

The trade-off for option 1 is one mechanical rename pass plus a tsconfig path-alias edit. The benefit is that the prior review's contract-coupling story closes cleanly: every new core-subdomain literal becomes a single-site change in `src/contracts/kernel/**`, and the UI bundle reads the same names the domain layer writes.

## Issue: `src/v11/shared/{state, metaReview, reviewer, gates}/**` are flat sibling clusters at 12-16 files each, owning core vocabulary, with no declared public surface or `internal/` sub-boundary

**Integration**: `src/v11/shared/state/**` (15 files, 1817 LOC, 104 in-repo importers), `src/v11/shared/metaReview/**` (16 files, 1524 LOC, 64 importers), `src/v11/shared/reviewer/**` (16 files, 1478 LOC, 55 importers), `src/v11/shared/gates/**` (12 files, 1090 LOC, 23 importers) — flat-sibling layouts, all four directories owning genuinely shared but cohesive sub-clusters
**Severity**: Significant

### Knowledge Leakage

The prior review's Issue 2 fixed the application-layer instance of this exact shape: large flat-sibling command directories with no public surface or `internal/` sub-boundary. The accompanying fitness check (`internal_module_boundary` directory-cohesion threshold = 27) prevents `application/<command>/**` from regressing past 27 flat siblings. The shared layer received neither the migration nor the threshold.

`shared/state/**` is the clearest example. Its 15 files break into four distinct sub-concerns:

- **Schema authority** (`stateSchema.ts`, `stateSchemaAuthority.ts`, `stateSchemaAuthorityChecks.ts`, `stateSchemaSnapshotSlices.ts`)
- **Execution-context vocabulary** (`executionContext.ts`, `executionContextTypes.ts`, `stateSchemaExecution.ts`)
- **Meta-review schema** (`stateSchemaMetaReview.ts`, `stateSchemaMetaReviewAutonomous.ts`, `stateSchemaMetaReviewAutonomousSupport.ts`, `stateSchemaMetaReviewRuntime.ts`)
- **Rework / round-role vocabulary** (`stateSchemaRework.ts`, `reworkIntentTypes.ts`, `roundRoleHistoryTypes.ts`, `bubbleStateSnapshotTypes.ts`)

`shared/metaReview/**` is similar:

- **Submit pipeline** (`metaReviewCommandSubmitAuthority.ts`, `metaReviewCommandSubmitLink.ts`, `metaReviewCommandSubmitParity.ts`, `metaReviewCommandSubmitValidation.ts`, `metaReviewSubmitGuidance.ts`)
- **Canonicalization** (`metaReviewCanonicalization.ts`, `metaReviewCanonicalizationReport.ts`)
- **Snapshot / types / artifact IO** (`metaReviewSnapshot.ts`, `metaReviewSnapshotTypes.ts`, `metaReviewTypes.ts`, `metaReviewArtifactIo.ts`)
- **Command shell** (`metaReviewCommandContract.ts`, `metaReviewCommandErrorMapping.ts`, `metaReviewError.ts`, `metaReviewExecutionContext.ts`, `metaReviewDeliveryCapabilities.ts`)

`shared/reviewer/**`:

- **Review verification pipeline** (`reviewVerification.ts`, `reviewVerificationArtifactValidation.ts`, `reviewVerificationArtifactValidationEntry.ts`, `reviewVerificationClaimNormalization.ts`, `reviewVerificationContract.ts`, `reviewVerificationPayloadValidation.ts`)
- **Severity ontology** (`reviewerSeverityOntology.ts`, `reviewerSeverityOntology.generated.ts`)
- **Reviewer guidance** (`reviewerBrief.ts`, `reviewerCommandGateGuidance.ts`, `reviewerGuidance.ts`, `reviewerScoutExpansionGuidance.ts`, `reviewerPolicySnapshot.ts`)
- **Summary verifier / test evidence** (`summaryVerifierConsistencyGate.ts`, `summaryVerifierConsistencyGateArtifact.ts`, `testEvidence.ts`)

`shared/gates/**`:

- **Doc-contract gate artifacts** (`docContractGateArtifactContract.ts`, `docContractGateArtifactNormalization.ts`, `docContractGateArtifactPath.ts`, `docContractGateConfigTypes.ts`, `docContractGates.ts`, `gateStateTypes.ts`)
- **Reviewer / task warnings** (`docContractReviewerGateEvaluation.ts`, `docContractReviewerGateEvidence.ts`, `docContractReviewerGatePolicy.ts`, `docContractReviewerGateWarnings.ts`, `docContractReviewerWarnings.ts`, `docContractTaskWarnings.ts`)

The strength inside each cluster is [functional + model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) — files share types, error codes, and pipeline shape. The strength across clusters is much lower: `metaReviewCommandSubmitAuthority.ts` does not need access to `metaReviewArtifactIo.ts` internals, and `reviewVerificationPayloadValidation.ts` does not need access to `reviewerSeverityOntology.generated.ts`. With no `internal/` boundary, both kinds of dependencies are equally easy to write and helpers from one cluster leak into another over time. This is exactly the directory-level [low-cohesion failure mode](https://coupling.dev/posts/core-concepts/balance/) the application-layer split addressed.

### Complexity Impact

The fan-out makes this worse than the application-layer version: `shared/state/**` is consumed by 104 in-repo files, `shared/metaReview/**` by 64, `shared/reviewer/**` by 55, `shared/gates/**` by 23. Every consumer can reach into any sibling. A change to a meta-review submit-validation helper is logically a single concern, but the static graph allows any of the 64 consumers to import any of the 16 metaReview files, so reviewer-time discipline is the only thing keeping the surface coherent. The previous review's lifecycle-policy work compressed `shared/state/**` from larger per-file budgets to its current 1817 LOC across 15 files, which is a net improvement, but the directory shape is the same.

By the [balance rule](https://coupling.dev/posts/core-concepts/balance/), `STRENGTH XOR DISTANCE OR NOT VOLATILITY` formally passes because the directory has zero distance. The same caveat as in the prior Issue 2 applies: high strength + low distance + many siblings + high volatility + many cross-command consumers is the directory-level shape that produces a [big ball of mud](https://coupling.dev/posts/core-concepts/balance/) at change time. The prior review explicitly flagged these four directories as "candidates for the same `internal/` sub-boundary treatment recommended for the application commands once Issue 2 is in flight"; that condition is now met.

### Cascading Changes

A change to the meta-review submit pipeline today touches `metaReviewCommandSubmitAuthority.ts`, `metaReviewCommandSubmitLink.ts`, `metaReviewCommandSubmitParity.ts`, `metaReviewCommandSubmitValidation.ts`, and `metaReviewSubmitGuidance.ts` simultaneously, plus its sibling `metaReviewError.ts` and `metaReviewCommandErrorMapping.ts`. Each of the 64 importers can reach any of the 16 files. With an `internal/submit/` sub-boundary plus a public surface (`metaReviewCommandContract.ts`, `metaReviewSnapshot.ts`), the same change scopes to the named directory and the public surface only, and the static graph stops permitting cross-cluster reaches.

The same applies to `shared/state/**` (`internal/{schema, execution, metaReview, rework}/`), `shared/reviewer/**` (`internal/{verification, ontology, guidance, summary}/`), and `shared/gates/**` (`internal/{artifact, evaluation, warnings}/`). The naming clusters already encode the boundary; the move is mostly mechanical, mirroring the application-layer migration that just landed.

### Recommended Improvement

Apply the [v11-internal-module-boundaries](../architecture/v11-internal-module-boundaries.md) convention to the four shared clusters, in volatility-and-fan-out order:

1. **`shared/state/**` -> `internal/{schema, execution, metaReview, rework}/`** with `bubbleStateSnapshotTypes.ts`, `executionContext.ts`, and `stateSchema.ts` (or a thin `index.ts` re-exporting the public surface) as the public surface. Top priority: 104 importers and the highest schema volatility.
2. **`shared/metaReview/**` -> `internal/{submit, canonicalization, snapshot, command}/`** with `metaReviewCommandContract.ts`, `metaReviewSnapshot.ts`, and `metaReviewTypes.ts` as the public surface.
3. **`shared/reviewer/**` -> `internal/{verification, ontology, guidance, summary}/`** with `reviewVerificationContract.ts`, `reviewerGuidance.ts`, `reviewerSeverityOntology.ts`, and `testEvidence.ts` as the public surface.
4. **`shared/gates/**` -> `internal/{artifact, evaluation, warnings}/`** with `docContractGates.ts` and `gateStateTypes.ts` as the public surface.

Pair the migration with extending `tools/fitness/checks/internal-module-boundary.ts`'s directory-cohesion metric beyond `application/<command>/**` to `shared/<topic>/**` once any of these clusters cross a threshold (proposed: 12 flat siblings for `shared/<topic>/**`, slightly lower than the application threshold because shared directories are higher-fan-out and pay a steeper coordination cost per added file).

The trade-off is one mechanical move-and-rename per cluster. The benefit is that future state-schema additions, meta-review submit-pipeline changes, and reviewer-verification refinements all land inside named sub-directories rather than as new flat siblings, and the prior review's directory-level work compounds across both layers instead of stopping at the application boundary.

## Issue: `application/{converged, planWatch, approval, create}/` are flat sibling lists below the new 27-file `internal_module_boundary` threshold and exhibit the same shape that just got fixed in `start/kickoff/pass/askHuman`

**Integration**: `application/converged/` (21 files), `application/planWatch/` (21), `application/approval/` (20), `application/create/` (17) — flat sibling lists, no `internal/` sub-boundary, just below the new `flat_application_command_directory_threshold = 27` rule
**Severity**: Minor

### Knowledge Leakage

The new directory-cohesion check inside `internal_module_boundary` uses 27 as the threshold. Four application command directories sit at 17-21 files: just below the line, but with the same flat-sibling shape that the prior review's Issue 2 identified as a low-cohesion-at-change-time problem. The naming clusters that justified the `internal/` split in `start/`, `kickoff/`, `pass/`, and `askHuman/` are present here too:

- `application/converged/` 21 files -> `convergedCommandOrchestration.ts`, `convergedCommandErrorNormalization.ts`, `convergedDefaultDependencies.ts`, `convergedDependencyDefaults.ts` (orchestration shell) | `convergedExecution.ts`, `runConvergedFlow.ts`, `runConvergedFlowContract.ts`, `runConvergedFlowGateSupport.ts`, `convergedFlowInvocationBuilders.ts` (flow) | `convergedFinalization.ts`, `convergedFinalizationEvents.ts`, `convergedFinalizationMetadata.ts`, `convergedFinalizationTypes.ts` (finalization) | `convergedValidationGuards.ts`, `convergedValidationPreparation.ts`, `convergedValidationPreparationContract.ts`, `convergedPolicyPreparation.ts`, `convergedRoutingPreparation.ts` (preparation/validation) | `convergedGateDelivery.ts`, `convergedRolloutBlockingReasonResolver.ts`, `metaReviewRolloutBlockingReasonCodes.ts` (gate/rollout) — five clusters
- `application/planWatch/` 21 files -> `agentRunnerBridge.ts`, `agentRunnerBridgeContract.ts`, `agentRunnerBridgeResult.ts`, `codexAgentRunnerBridge.ts`, `codexAgentRunnerBridgeResult.ts`, `codexAgentRunnerStream.ts`, `codexAgentRunnerTimeline.ts`, `codexAgentRunnerArtifacts.ts` (runner bridge) | `linkedBubbleTriggerIndex.ts`, `linkedBubbleTriggerIndexContract.ts`, `linkedBubbleTriggerIndexFrontmatter.ts`, `linkedBubbleTriggerIndexPath.ts`, `linkedBubbleTriggerIndexTaskDiagnostics.ts`, `linkedBubbleTriggerIndexTrackerRows.ts` (linked-bubble index) | `planWatchLedger.ts`, `planWatchLedgerContract.ts`, `planWatchLoop.ts`, `planWatchLoopContract.ts`, `planWatchLoopExecution.ts`, `planWatchLoopMapping.ts`, `planWatchRunNowExecution.ts` (loop/ledger) — three clusters
- `application/approval/` 20 files -> orchestration shell + flow + remote + result mapping + rework intent — four clusters
- `application/create/` 17 files -> orchestration + finalization + persistence + preparation + runtime — four clusters

The strength inside each cluster is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/); the strength across clusters is much lower (a `linkedBubbleTriggerIndex*` file does not need access to `codexAgentRunnerStream.ts` internals). With the threshold at 27, all four are tolerated; the moment any of them adds 7-10 files in a feature plan (which the prior reviews' evidence shows is normal for this codebase), they cross the threshold and the migration becomes an emergency rather than a planned move.

### Complexity Impact

This is the smallest of the three issues in this follow-up because the formula passes (low intra-directory distance) and the fitness check actively prevents regression past the 27-file threshold. The cost is asymmetric: low today, high if ignored until the threshold trips during an unrelated feature merge. The volatility evidence is direct — these four directories are exactly the surfaces that the watchdog/remote-execution/auto-rework feature plans target.

### Cascading Changes

A change to the converged-flow validation preparation today touches `convergedValidationGuards.ts`, `convergedValidationPreparation.ts`, and `convergedValidationPreparationContract.ts` simultaneously. None of the directory's other 18 files need to change, but the static graph allows any of them to import any helper from any cluster. The `internal/{validation, finalization, gate, flow, orchestration}/` shape would scope each cluster's surface to its own directory.

### Recommended Improvement

Front-run the threshold instead of waiting for it to trip:

1. **`application/converged/**` -> `internal/{flow, finalization, validation, gate}/`** with `convergedCommandOrchestration.ts` + `runConvergedFlow.ts` as the public surface.
2. **`application/planWatch/**` -> `internal/{runner, linkedTriggerIndex, loop}/`** with `planWatchLoop.ts` + `agentRunnerBridge.ts` (or a dedicated `planWatchCommandApi.ts` if one is added) as the public surface.
3. **`application/approval/**` -> `internal/{flow, remote, rework, result}/`** with `approvalCommandApi.ts` + `runApprovalFlow.ts` as the public surface.
4. **`application/create/**` -> `internal/{persistence, preparation, finalization, runtime}/`** with `createBubble.ts` as the public surface.

Optionally lower the directory-cohesion threshold from 27 to a smaller number (e.g. 20) once these four directories are migrated, locking in the lower cap. The trade-off is one mechanical move per directory; the benefit is that the prior review's directory-level work continues compounding across the application layer instead of stopping at the four largest directories, and threshold breaches stop being merge-time emergencies.

## Notes

- `pnpm fitness:check:ci` was run during this review; all 13 hard-fail checks passed (`boundary`, `mutation`, `transition`, `error`, `complexity`, `contract_timeout_policy`, `dependency`, `application_defaults_boundary`, `internal_module_boundary`, `shared_defaults_boundary`, `critical_side_effect`, `ui_contract_boundary`, `ui_router_port_boundary`).
- The new `internal_module_boundary` directory-cohesion metric (`flat_application_command_directory_threshold = 27`, currently 0 violations) is the single most important governance addition since the prior review: it converts what was reviewer judgment into an enforceable rule. Issue 2 in this follow-up is the natural next extension (apply the metric to `shared/<topic>/**`); Issue 3 is the natural pre-emptive migration to make sure the application-side metric never trips.
- `src/index.ts` is unchanged at 914 LOC with 177 named re-exports across `cli/`, `application/`, `defaults/`, `infrastructure/`, `shared/`, `domain/`, `config/`, `contracts/kernel/`, and `types/`. The package is `private: true` (`package.json`), the only in-repo importers of `src/index.ts` are `tests/healthcheck.test.ts`, `tests/cli/bubbleExtractCommand.test.ts`, `tests/v11/application/planWatch/linkedBubbleTriggerIndex.test.ts`, and `tests/core/bubble/startBubble.test.ts` — and three of the four use directly-pathed imports for their actual subjects, only pulling a handful of names from `index.ts`. The [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) it expresses is currently theoretical; not actionable today, worth tracking if external consumption ever materializes.
- `src/types/**` (492 LOC across 6 files: `archive.ts`, `findings.ts`, `metrics.ts`, `protocol.ts` 274 LOC, `ui.ts` 79 LOC, `uiRemoteExecution.ts`) sits outside `src/v11/**` and outside `src/contracts/kernel/**`. It already imports from the kernel where appropriate (e.g. `protocol.ts` pulls `ProtocolMessageType` from the kernel) and is gated by `ui_contract_boundary` against UI/contract leakage, but it remains an unowned vocabulary cluster with 100 backend importers. Two paths are coherent: (a) absorb it into `src/v11/domain/**` and `src/v11/shared/**` per the [placement-and-extraction governance](../architecture/v11-placement-and-extraction-governance.md), or (b) re-frame it explicitly as a shrinking transitional shim with a removal condition. The current implicit state is the third option — owned by neither — and that is what the previous reviews' god-module patterns grew out of.
- `shared/protocol/**` (8 files), `shared/metaReviewGate/**` (8 files), and `shared/watchdog/**` (6 files) are below the proposed `shared/<topic>/**` threshold of 12, but they own high-volatility vocabulary; if Issue 2 above is implemented, they are the next-tier candidates after the 12+ cluster set, and adopting `internal/` there pre-emptively keeps the boundary convention consistent across the layer.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
