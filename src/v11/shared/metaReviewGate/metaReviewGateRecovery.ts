import { handleRecoveryAutoReworkRoute } from "./metaReviewGateRecoveryAutoRework.js";
import {
  assertRecoveredRunResolutionConsistency,
  initializeRecoverMetaReviewExecutionContext,
  type RecoverMetaReviewExecutionContext,
  persistRecoveryDispatchFailedHumanRoute,
  persistRecoveryResolvedHumanRoute,
  persistRecoveryRunFailedHumanRoute,
  resolveRecoveredRunResolution,
  resolveRecoveryParityRouting
} from "./metaReviewGateRecoveryContext.js";
import { requireRecoverableMetaReviewExecutionContext } from "./metaReviewGateRecoveryContextHelpers.js";
import {
  metaReviewerAgent
} from "./metaReviewGateShared.js";
import { resolveHumanGateRoute } from "./metaReviewGateShared.js";
import { rethrowAfterMetaReviewerPaneDeactivation } from "./metaReviewGateRecoveryContextHelpers.js";
import { deliveryTargetRoleMetadataKey, type ProtocolEnvelope } from "../../../types/protocol.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type RecoverMetaReviewGateFromSnapshotDependencies,
  type RecoverMetaReviewGateFromSnapshotInput
} from "./metaReviewGateTypes.js";
import type {
  BubbleExecutionContext,
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type {
  FinishIncompleteActorApplyRouteInputPort,
  FinishIncompleteActorApplyRouteResultPort,
  FinishIncompleteActorResultPort,
  FinishIncompleteActorResultOutputPort,
  FinishIncompleteActorRoutePolicyPort
} from "../reconcile/finishIncompleteActorResultPort.js";

const metaReviewHandoffIdMetadataKey = "meta_review_handoff_id";
type MetaReviewRecoveryHumanGateRoute = Exclude<
  MetaReviewGateResult["route"],
  "meta_review_running" | "auto_rework"
>;
type MetaReviewRecoveryAppliedRoute =
  | "auto_rework"
  | "human_gate_run_failed"
  | "human_gate_dispatch_failed"
  | MetaReviewRecoveryHumanGateRoute;
type MetaReviewRecoveryMutationKind =
  | "auto_rework"
  | "ready_for_human_approval";
interface MetaReviewRecoveryRouteContext {
  budgetAvailable: boolean;
  parityMetadata: FindingsParityMetadata | null;
  snapshot: BubbleMetaReviewSnapshotState;
  fallbackReason?: string;
}

function resolveFinishIncompleteActorResultDependency(
  dependency: FinishIncompleteActorResultPort | undefined
): FinishIncompleteActorResultPort {
  if (dependency !== undefined) {
    return dependency;
  }
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    "META_REVIEW_GATE_TRANSITION_INVALID: snapshot-driven meta-review recovery requires finishIncompleteActorResult dependency wiring.",
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

function isMetaReviewKickoffEnvelope(input: {
  envelope: ProtocolEnvelope;
  round: number;
}): boolean {
  const metadata = input.envelope.payload.metadata;
  return (
    input.envelope.type === "TASK" &&
    input.envelope.sender === "orchestrator" &&
    input.envelope.recipient === metaReviewerAgent &&
    input.envelope.round === input.round &&
    metadata?.actor === "meta-review-gate" &&
    metadata?.actor_agent === "orchestrator" &&
    metadata?.lifecycle_state === "RUNNING" &&
    metadata?.[deliveryTargetRoleMetadataKey] === "meta_reviewer"
  );
}

async function resolveLatestKickoffEnvelopeForSnapshotReplay(
  context: RecoverMetaReviewExecutionContext,
  executionContext: BubbleExecutionContext
): Promise<{ envelope: MetaReviewGateResult["gateEnvelope"]; sequence: number } | null> {
  const transcript = await context.readTranscript(
    context.resolved.bubblePaths.transcriptPath,
    {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    }
  );
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const envelope = transcript[index]!;
    if (!isMetaReviewKickoffEnvelope({ envelope, round: executionContext.round })) {
      continue;
    }
    const handoffId = envelope.payload.metadata?.[metaReviewHandoffIdMetadataKey];
    if (
      typeof handoffId === "string" &&
      handoffId === executionContext.handoff_id
    ) {
      return {
        envelope,
        sequence: index + 1
      };
    }
  }
  return null;
}

function buildMetaReviewRecoveryRoutePolicy(input: {
  context: RecoverMetaReviewExecutionContext;
  snapshot: BubbleMetaReviewSnapshotState;
}): FinishIncompleteActorRoutePolicyPort<
  MetaReviewResult,
  BubbleMetaReviewSnapshotState,
  MetaReviewRecoveryAppliedRoute,
  MetaReviewRecoveryMutationKind,
  MetaReviewRecoveryRouteContext
> {
  return async ({ runResult }) => {
    if (runResult.status === "error") {
      return {
        appliedRoute: "human_gate_run_failed",
        mutationKind: "ready_for_human_approval",
        canonicalRun: runResult,
        routeContext: {
          budgetAvailable: false,
          parityMetadata: null,
          snapshot: input.snapshot
        }
      };
    }

    const parityResolution = await resolveRecoveryParityRouting({
      context: input.context,
      snapshot: input.snapshot,
      runResult
    });
    if (!parityResolution.ok) {
      return {
        appliedRoute: "human_gate_dispatch_failed",
        mutationKind: "ready_for_human_approval",
        canonicalRun: parityResolution.runResultForRouting,
        routeContext: {
          budgetAvailable: false,
          parityMetadata: parityResolution.parityMetadata,
          snapshot: input.snapshot,
          fallbackReason:
            `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${parityResolution.reason}`
        }
      };
    }

    if (
      runResult.recommendation === "rework" &&
      parityResolution.budgetAvailable
    ) {
      return {
        appliedRoute: "auto_rework",
        mutationKind: "auto_rework",
        canonicalRun: parityResolution.runResultForRouting,
        routeContext: {
          budgetAvailable: true,
          parityMetadata: parityResolution.parityMetadata,
          snapshot: input.snapshot
        }
      };
    }

    return {
      appliedRoute: resolveHumanGateRoute(
        runResult.recommendation,
        parityResolution.budgetAvailable
      ),
      mutationKind: "ready_for_human_approval",
      canonicalRun: parityResolution.runResultForRouting,
      routeContext: {
        budgetAvailable: parityResolution.budgetAvailable,
        parityMetadata: parityResolution.parityMetadata,
        snapshot: input.snapshot
      }
    };
  };
}

function assertNeverRoute(route: never): never {
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    "META_REVIEW_GATE_TRANSITION_INVALID: unsupported recovered route.",
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID",
      ...((route as unknown) !== undefined
        ? { restoreReasonCode: String(route as unknown) }
        : {})
    }
  );
}

async function applyMetaReviewRecoveryRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  summary: string;
  finishInput: FinishIncompleteActorApplyRouteInputPort<
    MetaReviewResult,
    BubbleMetaReviewSnapshotState,
    MetaReviewRecoveryAppliedRoute,
    MetaReviewRecoveryMutationKind,
    MetaReviewRecoveryRouteContext
  >;
}): Promise<
  FinishIncompleteActorApplyRouteResultPort<
    BubbleStateSnapshot,
    ProtocolEnvelope,
    MetaReviewResult,
    string
  >
> {
  const routeContext = input.finishInput.routeDecision.routeContext ?? {
    budgetAvailable: false,
    parityMetadata: null,
    snapshot: input.finishInput.snapshotState ?? {
      execution_context: null,
      runtime_delivery: null,
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: null,
      auto_rework_count: 0,
      auto_rework_limit: 0,
      sticky_human_gate: false
    }
  };

  let result: MetaReviewGateResult;
  switch (input.finishInput.routeDecision.appliedRoute) {
    case "human_gate_run_failed":
      result = await persistRecoveryRunFailedHumanRoute({
        context: input.context,
        summary: input.summary,
        runResult: input.finishInput.routeDecision.canonicalRun
      });
      break;
    case "human_gate_dispatch_failed":
      result = await persistRecoveryDispatchFailedHumanRoute({
        context: input.context,
        summary: input.summary,
        fallbackReason:
          routeContext.fallbackReason
          ?? "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: recovery route dispatch failed.",
        loaded: input.context.loaded,
        expectedState: "RUNNING",
        runResultForRouting: input.finishInput.routeDecision.canonicalRun,
        parityMetadata: routeContext.parityMetadata
      });
      break;
    case "auto_rework":
      result = await handleRecoveryAutoReworkRoute({
        context: input.context,
        snapshot: routeContext.snapshot,
        summary: input.summary,
        runResultForRouting: input.finishInput.routeDecision.canonicalRun,
        parityMetadata: routeContext.parityMetadata
      });
      break;
    case "human_gate_sticky_bypass":
    case "human_gate_approve":
    case "human_gate_budget_exhausted":
    case "human_gate_inconclusive":
      result = await persistRecoveryResolvedHumanRoute({
        context: input.context,
        summary: input.summary,
        runResultForRouting: input.finishInput.routeDecision.canonicalRun,
        recommendation:
          input.finishInput.routeDecision.canonicalRun.recommendation,
        budgetAvailable: routeContext.budgetAvailable,
        parityMetadata: routeContext.parityMetadata
      });
      break;
    default:
      return assertNeverRoute(input.finishInput.routeDecision.appliedRoute);
  }

  return {
    bubbleId: result.bubbleId,
    routeSequence: result.gateSequence,
    routeEnvelope: result.gateEnvelope,
    state: result.state,
    canonicalRun:
      result.metaReviewRun ?? input.finishInput.routeDecision.canonicalRun,
    ...(result.warnings !== undefined ? { warnings: result.warnings } : {}),
    ...(result.diagnostics !== undefined ? { diagnostics: result.diagnostics } : {})
  };
}

function mapFinishedActorResultToMetaReviewGateResult(
  result: FinishIncompleteActorResultOutputPort<
    MetaReviewResult,
    BubbleStateSnapshot,
    ProtocolEnvelope,
    MetaReviewRecoveryAppliedRoute,
    MetaReviewRecoveryMutationKind,
    string
  >
): MetaReviewGateResult {
  return {
    bubbleId: result.bubbleId,
    route: result.appliedRoute,
    gateSequence: result.routeSequence,
    gateEnvelope: result.routeEnvelope,
    state: result.state,
    metaReviewRun: result.canonicalRun,
    ...(result.warnings !== undefined ? { warnings: result.warnings } : {}),
    ...(result.diagnostics !== undefined ? { diagnostics: result.diagnostics } : {})
  };
}

export async function recoverMetaReviewGateFromSnapshot(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): Promise<MetaReviewGateResult> {
  let context: RecoverMetaReviewExecutionContext | null = null;
  try {
    context = await initializeRecoverMetaReviewExecutionContext(
      input,
      dependencies
    );
    const executionContext = requireRecoverableMetaReviewExecutionContext(
      context.loaded
    );
    const deadlineAtMs = Date.parse(executionContext.deadline_at);
    const isBeforeDeadline =
      Number.isFinite(deadlineAtMs) &&
      context.now.getTime() < deadlineAtMs;
    const runResolution = await resolveRecoveredRunResolution({
      context,
      ...(input.runResult !== undefined ? { requestedRunResult: input.runResult } : {}),
      ...(input.summary !== undefined ? { requestedSummary: input.summary } : {})
    });

    assertRecoveredRunResolutionConsistency({
      ...(input.runResult !== undefined ? { requestedRunResult: input.runResult } : {}),
      snapshotHasCanonicalSubmitInActiveWindow:
        runResolution.snapshotHasCanonicalSubmitInActiveWindow,
      snapshot: runResolution.snapshot,
      runResult: runResolution.runResult
    });

    if (
      input.runResult === undefined &&
      !runResolution.snapshotHasCanonicalSubmitInActiveWindow &&
      isBeforeDeadline
    ) {
      // Before canonical submit exists, recovery may only replay the persisted
      // kickoff route for the active execution window.
      const kickoff = await resolveLatestKickoffEnvelopeForSnapshotReplay(
        context,
        executionContext
      );
      if (kickoff === null) {
        throw new MetaReviewGateError(
          "META_REVIEW_GATE_TRANSITION_INVALID",
          `META_REVIEW_GATE_TRANSITION_INVALID: active meta-review recovery could not locate kickoff envelope before deadline (round=${executionContext.round}; handoff_id=${executionContext.handoff_id}).`
        );
      }
      return {
        bubbleId: context.resolved.bubbleId,
        route: "meta_review_running",
        gateSequence: kickoff.sequence,
        gateEnvelope: kickoff.envelope,
        state: context.loaded.state
      };
    }

    if (input.runResult === undefined) {
      const recoveryContext = context;
      const finishIncompleteActorResult =
        resolveFinishIncompleteActorResultDependency(
          dependencies.finishIncompleteActorResult
        );
      const finished = await finishIncompleteActorResult<
        MetaReviewResult,
        BubbleStateSnapshot,
        ProtocolEnvelope,
        MetaReviewRecoveryAppliedRoute,
        MetaReviewRecoveryMutationKind,
        BubbleMetaReviewSnapshotState,
        MetaReviewRecoveryRouteContext,
        string
      >(
        {
          bubbleId: recoveryContext.resolved.bubbleId,
          repoPath: input.repoPath,
          cwd: input.cwd,
          now: recoveryContext.now,
          executionContext,
          runResult: runResolution.runResult,
          routePolicy: buildMetaReviewRecoveryRoutePolicy({
            context: recoveryContext,
            snapshot: runResolution.snapshot
          }),
          summary: runResolution.summary,
          refs: recoveryContext.refs,
          callerTag: "meta_review_gate_recovery",
          snapshotState: runResolution.snapshot
        },
        {
          applyRoute: async (
            finishInput: FinishIncompleteActorApplyRouteInputPort<
              MetaReviewResult,
              BubbleMetaReviewSnapshotState,
              MetaReviewRecoveryAppliedRoute,
              MetaReviewRecoveryMutationKind,
              MetaReviewRecoveryRouteContext
            >
          ) =>
            applyMetaReviewRecoveryRoute({
              context: recoveryContext,
              summary: runResolution.summary,
              finishInput
            })
        }
      );

      return recoveryContext.finishWithPaneDeactivation(
        mapFinishedActorResultToMetaReviewGateResult(finished)
      );
    }

    if (runResolution.runResult.status === "error") {
      return context.finishWithPaneDeactivation(
        await persistRecoveryRunFailedHumanRoute({
          context,
          summary: runResolution.summary,
          runResult: runResolution.runResult
        })
      );
    }

    const parityResolution = await resolveRecoveryParityRouting({
      context,
      snapshot: runResolution.snapshot,
      runResult: runResolution.runResult
    });
    if (!parityResolution.ok) {
      return context.finishWithPaneDeactivation(
        await persistRecoveryDispatchFailedHumanRoute({
          context,
          summary: runResolution.summary,
          fallbackReason:
            `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${parityResolution.reason}`,
          loaded: context.loaded,
          expectedState: "RUNNING",
          runResultForRouting: parityResolution.runResultForRouting,
          parityMetadata: parityResolution.parityMetadata
        })
      );
    }

    if (
      runResolution.runResult.recommendation === "rework" &&
      parityResolution.budgetAvailable
    ) {
      return context.finishWithPaneDeactivation(
        await handleRecoveryAutoReworkRoute({
          context,
          snapshot: runResolution.snapshot,
          summary: runResolution.summary,
          runResultForRouting: parityResolution.runResultForRouting,
          parityMetadata: parityResolution.parityMetadata
        })
      );
    }

    return context.finishWithPaneDeactivation(
      await persistRecoveryResolvedHumanRoute({
        context,
        summary: runResolution.summary,
        runResultForRouting: parityResolution.runResultForRouting,
        recommendation: runResolution.runResult.recommendation,
        budgetAvailable: parityResolution.budgetAvailable,
        parityMetadata: parityResolution.parityMetadata
      })
    );
  } catch (error) {
    if (context === null) {
      throw error;
    }
    return rethrowAfterMetaReviewerPaneDeactivation({
      error,
      deactivateMetaReviewerPane: context.deactivateMetaReviewerPane,
      failureContext: "recovery failed"
    });
  }
}
