import {
  buildAskHumanFinalizationResult,
  buildAskHumanLifecycleMetricMetadata
} from "../../shared/askHuman/askHumanFinalizationArtifacts.js";
import { buildAskHumanFinalizationDependencyResolutionInput } from "../../shared/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.js";
import type {
  FinalizeAskHumanFlowDependencies,
  FinalizeAskHumanFlowInput,
  RunAskHumanFlowResult
} from "../../shared/askHuman/askHumanFlowContract.js";
import { buildAskHumanFinalizationNotificationInput } from "../../shared/askHuman/askHumanFinalizationNotificationInputBuilder.js";
import { emitOptionalAskHumanNotifications } from "../../shared/askHuman/askHumanNotificationEmission.js";
import { resolveAskHumanFinalizationDependencies } from "../../shared/askHuman/askHumanFinalizationDependencyResolution.js";
export type {
  FinalizeAskHumanFlowDependencies,
  FinalizeAskHumanFlowInput,
  RunAskHumanFlowResult as FinalizeAskHumanFlowResult
};

export async function finalizeAskHumanFlow(
  input: FinalizeAskHumanFlowInput,
  dependencies: FinalizeAskHumanFlowDependencies = {}
): Promise<RunAskHumanFlowResult> {
  const resolvedDependencies = resolveAskHumanFinalizationDependencies(
    buildAskHumanFinalizationDependencyResolutionInput(dependencies)
  );

  const messageRef = resolvedDependencies.resolveDeliveryMessageRef({
    bubbleId: input.routing.resolved.bubbleId,
    sessionsPath: input.routing.resolved.bubblePaths.sessionsPath,
    envelope: input.appended.envelope
  });

  emitOptionalAskHumanNotifications(
    buildAskHumanFinalizationNotificationInput(input, messageRef),
    {
      emitTmuxDeliveryNotification:
        resolvedDependencies.emitTmuxDeliveryNotification,
      emitBubbleNotification: resolvedDependencies.emitBubbleNotification
    }
  );

  await resolvedDependencies.emitBubbleLifecycleEventBestEffort({
    repoPath: input.routing.resolved.repoPath,
    bubbleId: input.routing.resolved.bubbleId,
    bubbleInstanceId: input.routing.bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_asked_human",
    round: input.routing.state.round,
    actorRole: input.routing.state.active_role,
    metadata: buildAskHumanLifecycleMetricMetadata({
      sender: input.routing.state.active_agent,
      refs: input.routing.refs,
      question: input.routing.question
    }),
    now: input.now
  });

  return buildAskHumanFinalizationResult({
    bubbleId: input.routing.resolved.bubbleId,
    sequence: input.appended.sequence,
    envelope: input.appended.envelope,
    state: input.written.state
  });
}
