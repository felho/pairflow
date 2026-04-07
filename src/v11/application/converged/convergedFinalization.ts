import {
  buildFinalizeConvergedFlowResult,
  emitConvergedFinalizationEvents
} from "./convergedFinalizationEvents.js";
import type {
  FinalizeConvergedFlowDependencies,
  FinalizeConvergedFlowInput,
  FinalizeConvergedFlowResult
} from "./convergedFinalizationTypes.js";
import { buildDefaultConvergedFinalizationDependencies } from "../../shared/converged/convergedFlowInvocationBuilders.js";

export async function finalizeConvergedFlow(
  input: FinalizeConvergedFlowInput,
  dependencies: FinalizeConvergedFlowDependencies
): Promise<FinalizeConvergedFlowResult> {
  const resolvedDependencies = buildDefaultConvergedFinalizationDependencies({
    resolveMetaReviewRolloutBlockingReasonCodes:
      dependencies.resolveMetaReviewRolloutBlockingReasonCodes,
    ...(dependencies.activeEntrypoint !== undefined
      ? { activeEntrypoint: dependencies.activeEntrypoint }
      : {}),
    ...(dependencies.assessPairflowCommandPath !== undefined
      ? {
          assessPairflowCommandPath:
            dependencies.assessPairflowCommandPath
        }
      : {}),
    ...(dependencies.emitBubbleLifecycleEventBestEffort !== undefined
      ? {
          emitBubbleLifecycleEventBestEffort:
            dependencies.emitBubbleLifecycleEventBestEffort
        }
      : {})
  });
  const assessCommandPath = resolvedDependencies.assessPairflowCommandPath!;
  const emitLifecycle =
    resolvedDependencies.emitBubbleLifecycleEventBestEffort!;
  const activeEntrypoint =
    resolvedDependencies.activeEntrypoint ?? process.argv[1];

  const commandPathStatus = assessCommandPath({
    worktreePath: input.resolved.bubblePaths.worktreePath,
    profile: input.resolved.bubbleConfig.pairflow_command_profile,
    activeEntrypoint
  });
  const blockingReasonCodes = dependencies.resolveMetaReviewRolloutBlockingReasonCodes({
    gateRoute: input.gateResult.route,
    metaReviewWarnings: input.gateResult.metaReviewRun?.warnings ?? [],
    commandPathStatus
  });
  await emitConvergedFinalizationEvents({
    flow: input,
    emitLifecycle,
    commandPathStatus,
    blockingReasonCodes
  });

  return buildFinalizeConvergedFlowResult(input);
}
