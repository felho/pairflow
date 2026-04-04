import {
  buildAskHumanFinalizationResult
} from "../../shared/askHuman/askHumanFinalizationArtifacts.js";
import { buildAskHumanFinalizationDependencyResolutionInput } from "../../shared/askHuman/askHumanFinalizationDependencyResolutionInputBuilder.js";
import { buildAskHumanFinalizationLifecycleEventInput } from "../../shared/askHuman/askHumanFinalizationLifecycleEventInputBuilder.js";
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

  const notifications = await emitOptionalAskHumanNotifications(
    buildAskHumanFinalizationNotificationInput(input, messageRef),
    {
      emitTmuxDeliveryNotification:
        resolvedDependencies.emitTmuxDeliveryNotification,
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
    ...(notifications.deliveryResult !== undefined
      ? { deliveryResult: notifications.deliveryResult }
      : {})
  });
}
