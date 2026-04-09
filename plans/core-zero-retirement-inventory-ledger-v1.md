---
artifact_type: ledger
artifact_id: ledger_core_zero_retirement_inventory_v1
title: "Core Zero Retirement Inventory Ledger"
status: completed
plan_ref: plans/core-zero-retirement-plan-v1.md
task_ref: plans/tasks/core-zero-retirement-phase1-inventory.md
generated_on: 2026-04-09
owners:
  - "felho"
---

# Core Zero Retirement Inventory Ledger

Ez a ledger a `src/core/**` teljes Phase 1 inventoryja. A cél nem thin bridge steady state, hanem a `src/core/**` teljes kifogyasztása és végső törlése.

A `current_consumers` mező statikus, feloldott relatív import/export scan eredménye a `src/**` és `tests/**` fájlokon.

## Baseline

- összes `src/core/**` fájl: `139`
- zero-consumer fájl: `64`
- csak `tests/core/**` consumerrel rendelkező fájl: `11`
- külső consumerrel rendelkező fájl: `64`

## Bucket Summary

| bucket | count |
|---|---:|
| thin-proxy | 67 |
| compat-facade | 71 |
| retained-behavior | 1 |

## Delete Eligibility Summary

| delete_eligibility | count |
|---|---:|
| ready-after-verification | 36 |
| ready-after-consumer-check | 28 |
| after-tests-core-retirement | 11 |
| blocked | 64 |

## Lane Summary

| lane_id | scope | owned_paths | count | merge_rule | validation_minimum |
|---|---|---|---:|---|---|
| A | Protocol / Workspace / Util retirement | `src/core/protocol/**`, `src/core/workspace/**`, `src/core/util/**` | 12 | diszjunkt write set, merge után worktree sync | célzott contract/parity kör + `pnpm typecheck` + releváns fitness szelet |
| B | Bubble command facade retirement | `src/core/bubble/{start,restart,resume,open,inbox,status,stop,list,attach}*` | 18 | diszjunkt write set, merge után worktree sync | célzott contract/parity kör + `pnpm typecheck` + releváns fitness szelet |
| C | Human / Agent surface retirement | `src/core/agent/**`, `src/core/human/**` | 9 | diszjunkt write set, merge után worktree sync | célzott contract/parity kör + `pnpm typecheck` + releváns fitness szelet |
| D | Runtime defaults and bridge retirement | `src/core/runtime/**` | 26 | diszjunkt write set, merge után worktree sync | célzott contract/parity kör + `pnpm typecheck` + releváns fitness szelet |
| E | Bubble defaults retirement | `src/core/bubble/*Defaults.ts`, `src/core/repo/createCliDefaults.ts` | 12 | diszjunkt write set, merge után worktree sync | célzott contract/parity kör + `pnpm typecheck` + releváns fitness szelet |
| F | Reviewer / Metrics / Watchdog retirement | `src/core/reviewer/**`, `src/core/metrics/**`, `src/core/watchdog/**` | 20 | diszjunkt write set, merge után worktree sync | célzott contract/parity kör + `pnpm typecheck` + releváns fitness szelet |
| G | Meta-review endgame | `src/core/bubble/metaReview*` | 3 | diszjunkt write set, merge után worktree sync | célzott contract/parity kör + `pnpm typecheck` + releváns fitness szelet |
| H | Residual cleanup / cross-cutting bridge retirement | minden más `src/core/**` residual bridge | 39 | diszjunkt write set, merge után worktree sync | célzott contract/parity kör + `pnpm typecheck` + releváns fitness szelet |

## Inventory

| path | bucket | lane | delete_eligibility | current_consumers | notes |
|---|---|---|---|---:|---|
| src/core/agent/askHuman.ts | compat-facade | C | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/agent/askHumanDefaults.ts | compat-facade | C | blocked | 1 |  |
| src/core/agent/converged.ts | compat-facade | C | blocked | 1 |  |
| src/core/agent/convergedDefaults.ts | compat-facade | C | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/agent/pass.ts | compat-facade | C | blocked | 2 |  |
| src/core/archive/archiveIndex.ts | thin-proxy | H | blocked | 1 |  |
| src/core/archive/archivePaths.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/archive/archiveSnapshot.ts | thin-proxy | H | blocked | 1 |  |
| src/core/bubble/actorEmitContext.ts | thin-proxy | H | blocked | 3 |  |
| src/core/bubble/actorEmitContextDefaults.ts | compat-facade | E | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/approvalRequestEnvelope.ts | thin-proxy | H | after-tests-core-retirement | 1 | csak tests/core fogyasztja |
| src/core/bubble/attachBubble.ts | compat-facade | B | after-tests-core-retirement | 1 | csak tests/core fogyasztja |
| src/core/bubble/attachDefaults.ts | compat-facade | B | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/bubbleInstanceId.ts | thin-proxy | H | blocked | 12 |  |
| src/core/bubble/bubbleLookup.ts | thin-proxy | H | blocked | 24 |  |
| src/core/bubble/commitBubble.ts | compat-facade | H | blocked | 2 |  |
| src/core/bubble/commitBubbleDefaults.ts | compat-facade | E | blocked | 1 |  |
| src/core/bubble/createBubble.ts | thin-proxy | H | blocked | 25 | közvetlen v11 re-export, saját wiring nélkül |
| src/core/bubble/createBubbleDefaults.ts | compat-facade | E | blocked | 1 |  |
| src/core/bubble/deleteBubble.ts | compat-facade | H | blocked | 1 |  |
| src/core/bubble/deleteBubbleDefaults.ts | compat-facade | E | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/ideation.ts | compat-facade | H | after-tests-core-retirement | 3 | csak tests/core fogyasztja |
| src/core/bubble/inboxBubble.ts | compat-facade | B | blocked | 2 |  |
| src/core/bubble/kickoffBubble.ts | compat-facade | H | after-tests-core-retirement | 1 | csak tests/core fogyasztja |
| src/core/bubble/kickoffDefaults.ts | compat-facade | E | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/listBubbles.ts | compat-facade | B | blocked | 3 |  |
| src/core/bubble/listCommandDefaults.ts | compat-facade | B | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/mergeBubble.ts | compat-facade | H | blocked | 1 |  |
| src/core/bubble/mergeBubbleDefaults.ts | compat-facade | E | blocked | 1 |  |
| src/core/bubble/metaReview.ts | retained-behavior | G | blocked | 4 | live-run compatibility + retained behavior |
| src/core/bubble/metaReviewExecutionContext.ts | thin-proxy | G | blocked | 4 |  |
| src/core/bubble/metaReviewGate.ts | compat-facade | G | after-tests-core-retirement | 2 | csak tests/core fogyasztja |
| src/core/bubble/metaReviewGateDefaults.ts | compat-facade | E | blocked | 1 |  |
| src/core/bubble/metaReviewGateRecoveryDefaults.ts | compat-facade | E | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/metaReviewReadDefaults.ts | compat-facade | E | blocked | 1 |  |
| src/core/bubble/openBubble.ts | compat-facade | B | blocked | 2 |  |
| src/core/bubble/passWorkspaceContextDefaults.ts | compat-facade | E | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/paths.ts | thin-proxy | H | after-tests-core-retirement | 4 | csak tests/core fogyasztja |
| src/core/bubble/pendingApprovalSignal.ts | compat-facade | H | blocked | 1 |  |
| src/core/bubble/replyBubbleDefaults.ts | compat-facade | E | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/repoResolution.ts | thin-proxy | H | blocked | 5 |  |
| src/core/bubble/restartBubble.ts | compat-facade | B | blocked | 2 |  |
| src/core/bubble/restartBubbleDefaults.ts | compat-facade | B | blocked | 1 |  |
| src/core/bubble/resumeBubble.ts | compat-facade | B | blocked | 1 |  |
| src/core/bubble/startBubble.ts | thin-proxy | B | blocked | 3 | v11 alias-export shell, saját defaults nélkül |
| src/core/bubble/startBubbleDefaults.ts | compat-facade | B | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/startCliDefaults.ts | compat-facade | B | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/startCommandContextDefaults.ts | compat-facade | B | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/statusBubble.ts | compat-facade | B | blocked | 3 |  |
| src/core/bubble/statusGateDefaults.ts | compat-facade | B | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/statusInboxDefaults.ts | compat-facade | B | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/bubble/stopBubble.ts | compat-facade | B | blocked | 1 |  |
| src/core/bubble/stopBubbleDefaults.ts | compat-facade | B | blocked | 1 |  |
| src/core/bubble/watchdogBubble.ts | compat-facade | H | after-tests-core-retirement | 1 | csak tests/core fogyasztja |
| src/core/bubble/workspaceResolution.ts | thin-proxy | H | blocked | 4 |  |
| src/core/convergence/policy.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/convergence/repeatCleanAutoConvergeDefaults.ts | compat-facade | H | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/convergence/repeatCleanAutoconverge.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/gates/docContractGateArtifacts.ts | compat-facade | H | blocked | 8 |  |
| src/core/gates/docContractGates.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/human/approval.ts | compat-facade | C | blocked | 1 |  |
| src/core/human/approvalDefaults.ts | compat-facade | C | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/human/reply.ts | compat-facade | C | blocked | 1 |  |
| src/core/human/reworkIntent.ts | compat-facade | C | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/metrics/bubbleEvents.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/metrics/bubbleEventsDefaults.ts | compat-facade | F | blocked | 1 |  |
| src/core/metrics/events.ts | compat-facade | F | blocked | 1 | metrics store fan-in shim; shared + infrastructure metrics surface fan-in bridge |
| src/core/metrics/report/aggregate.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/metrics/report/archiveContext.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/metrics/report/format.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/metrics/report/readEvents.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/metrics/report/report.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/metrics/report/selectShards.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/metrics/report/types.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/metrics/report/warnings.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/protocol/envelope.ts | thin-proxy | A | ready-after-verification | 0 |  |
| src/core/protocol/resumeSummary.ts | thin-proxy | A | ready-after-verification | 0 |  |
| src/core/protocol/sequenceAllocator.ts | thin-proxy | A | ready-after-verification | 0 |  |
| src/core/protocol/transcriptStore.ts | thin-proxy | A | blocked | 14 |  |
| src/core/protocol/validators.ts | thin-proxy | A | ready-after-verification | 0 |  |
| src/core/repo/createCliDefaults.ts | compat-facade | E | blocked | 1 |  |
| src/core/repo/registry.ts | compat-facade | H | blocked | 4 |  |
| src/core/reviewer/reviewVerification.ts | thin-proxy | F | ready-after-verification | 0 |  |
| src/core/reviewer/reviewVerificationArtifacts.ts | compat-facade | F | blocked | 4 |  |
| src/core/reviewer/reviewerBrief.ts | compat-facade | F | blocked | 1 |  |
| src/core/reviewer/summaryVerifierConsistencyGate.ts | compat-facade | F | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/reviewer/testEvidence.ts | compat-facade | F | after-tests-core-retirement | 2 | csak tests/core fogyasztja |
| src/core/runtime/agentCommand.ts | thin-proxy | D | blocked | 2 |  |
| src/core/runtime/metaReviewCommandSubmitDefaults.ts | compat-facade | D | blocked | 1 |  |
| src/core/runtime/metaReviewDefaults.ts | compat-facade | D | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/runtime/metaReviewGateRuntimeDefaults.ts | compat-facade | D | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/runtime/metaReviewLiveRunDefaults.ts | compat-facade | D | blocked | 1 |  |
| src/core/runtime/metaReviewSubmitGuidance.ts | thin-proxy | D | ready-after-verification | 0 |  |
| src/core/runtime/metaReviewerStartupPrompt.ts | thin-proxy | D | blocked | 1 |  |
| src/core/runtime/notifications.ts | thin-proxy | D | blocked | 3 |  |
| src/core/runtime/pairflowCommand.ts | thin-proxy | D | blocked | 1 |  |
| src/core/runtime/passValidationDefaults.ts | compat-facade | D | blocked | 1 |  |
| src/core/runtime/passValidationEvidence.ts | thin-proxy | D | ready-after-verification | 0 |  |
| src/core/runtime/reconcileCommandDefaults.ts | compat-facade | D | blocked | 1 |  |
| src/core/runtime/reviewerCommandGateGuidance.ts | thin-proxy | D | ready-after-verification | 0 |  |
| src/core/runtime/reviewerContext.ts | thin-proxy | D | blocked | 1 |  |
| src/core/runtime/reviewerDeliveryDefaults.ts | compat-facade | D | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/runtime/reviewerGuidance.ts | thin-proxy | D | ready-after-verification | 0 |  |
| src/core/runtime/reviewerScoutExpansionGuidance.ts | thin-proxy | D | ready-after-verification | 0 |  |
| src/core/runtime/reviewerSeverityOntology.generated.ts | thin-proxy | D | ready-after-verification | 0 |  |
| src/core/runtime/reviewerSeverityOntology.ts | thin-proxy | D | ready-after-verification | 0 |  |
| src/core/runtime/sessionsRegistry.ts | thin-proxy | D | blocked | 10 |  |
| src/core/runtime/startupReconciler.ts | thin-proxy | D | ready-after-verification | 0 | reconcile command facade; közvetlen reconcile API re-export |
| src/core/runtime/stopCommandDefaults.ts | compat-facade | D | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/runtime/tmuxDelivery.ts | thin-proxy | D | blocked | 9 |  |
| src/core/runtime/tmuxInput.ts | thin-proxy | D | blocked | 2 |  |
| src/core/runtime/tmuxManager.ts | thin-proxy | D | blocked | 6 |  |
| src/core/runtime/watchdog.ts | thin-proxy | D | blocked | 1 |  |
| src/core/state/executionContext.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/state/initialState.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/state/machine.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/state/stateSchema.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/state/stateStore.ts | thin-proxy | H | blocked | 25 |  |
| src/core/state/transitions.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/ui/bubbleAttention.ts | compat-facade | H | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/ui/events.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/ui/presenters/bubblePresenter.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/ui/presenters/timelinePresenter.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/ui/repoScope.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/ui/router.ts | thin-proxy | H | ready-after-verification | 0 |  |
| src/core/ui/routerDefaults.ts | compat-facade | H | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/ui/server.ts | compat-facade | H | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/util/fileLock.ts | compat-facade | A | after-tests-core-retirement | 1 | csak tests/core fogyasztja |
| src/core/util/normalize.ts | compat-facade | A | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/util/pathExists.ts | thin-proxy | A | blocked | 2 |  |
| src/core/util/shellQuote.ts | thin-proxy | A | after-tests-core-retirement | 1 | csak tests/core fogyasztja |
| src/core/util/structuredRef.ts | thin-proxy | A | after-tests-core-retirement | 1 | csak tests/core fogyasztja |
| src/core/validation.ts | compat-facade | H | blocked | 11 |  |
| src/core/watchdog/watchdogCommandDefaults.ts | compat-facade | F | ready-after-consumer-check | 0 | delete előtt surface review kell |
| src/core/watchdog/watchdogPaneActivityStore.ts | thin-proxy | F | blocked | 3 |  |
| src/core/watchdog/watchdogPendingReworkDefaults.ts | compat-facade | F | blocked | 1 |  |
| src/core/watchdog/watchdogTraceStore.ts | thin-proxy | F | blocked | 1 |  |
| src/core/workspace/git.ts | thin-proxy | A | blocked | 5 |  |
| src/core/workspace/worktreeManager.ts | thin-proxy | A | blocked | 3 |  |
