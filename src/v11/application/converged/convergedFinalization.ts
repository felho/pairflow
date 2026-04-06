import { assessPairflowCommandPath } from "../../infrastructure/executor/command/pairflowCommand.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import {
  buildFinalizeConvergedFlowResult,
  emitConvergedFinalizationEvents
} from "./convergedFinalizationEvents.js";
import type {
  FinalizeConvergedFlowDependencies,
  FinalizeConvergedFlowInput,
  FinalizeConvergedFlowResult
} from "./convergedFinalizationTypes.js";

export async function finalizeConvergedFlow(
  input: FinalizeConvergedFlowInput,
  dependencies: FinalizeConvergedFlowDependencies
): Promise<FinalizeConvergedFlowResult> {
  const assessCommandPath =
    dependencies.assessPairflowCommandPath ?? assessPairflowCommandPath;
  const emitLifecycle =
    dependencies.emitBubbleLifecycleEventBestEffort ?? emitBubbleLifecycleEventBestEffort;
  const activeEntrypoint = dependencies.activeEntrypoint ?? process.argv[1];

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
