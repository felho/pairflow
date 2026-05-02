import {
  buildAskHumanFinalizationResult
} from "./askHumanFinalizationArtifacts.js";
import { buildAskHumanFinalizationDependencyResolutionInput } from "./askHumanFinalizationDependencyResolutionInputBuilder.js";
import { buildAskHumanFinalizationLifecycleEventInput } from "./askHumanFinalizationLifecycleEventInputBuilder.js";
import type {
  FinalizeAskHumanFlowDependencies,
  FinalizeAskHumanFlowInput,
  RunAskHumanFlowResult
} from "./askHumanFlowContract.js";
import { buildAskHumanFinalizationNotificationInput } from "./askHumanFinalizationNotificationInputBuilder.js";
import { emitOptionalAskHumanNotifications } from "./askHumanNotificationEmission.js";
import { resolveAskHumanFinalizationDependencies } from "./askHumanFinalizationDependencyResolution.js";
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

  const notifications = await emitOptionalAskHumanNotifications(
    buildAskHumanFinalizationNotificationInput(input, messageRef),
    {
      emitDeliveryNotificationAck:
        resolvedDependencies.emitDeliveryNotificationAck,
      emitBubbleNotification: resolvedDependencies.emitBubbleNotification
    }
  );

  await resolvedDependencies.emitBubbleLifecycleEventBestEffort(
    buildAskHumanFinalizationLifecycleEventInput(input)
  );

  return buildAskHumanFinalizationResult({
    bubbleId: input.routing.resolved.bubbleId,
    sequence: input.appended.sequence,
    envelope: input.appended.envelope,
    state: input.written.state,
    ...(input.routing.activation !== undefined
      ? { activation: input.routing.activation }
      : {}),
    ...(notifications.deliveryResult !== undefined
      ? { deliveryResult: notifications.deliveryResult }
      : {})
  });
}
