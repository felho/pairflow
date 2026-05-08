import {
  buildAskHumanFinalizationResult,
  buildAskHumanLifecycleMetricMetadata
} from "./askHumanFinalizationArtifacts.js";
import type {
  FinalizeAskHumanFlowDependencies,
  FinalizeAskHumanFlowInput,
  RunAskHumanFlowResult
} from "./askHumanFlowContract.js";
import { emitOptionalAskHumanNotifications } from "../notification/askHumanNotificationEmission.js";
import { askHumanFinalizationDependencyDefaults } from "./askHumanFinalizationDependencyDefaults.js";
export type {
  FinalizeAskHumanFlowDependencies,
  FinalizeAskHumanFlowInput,
  RunAskHumanFlowResult as FinalizeAskHumanFlowResult
};

export async function finalizeAskHumanFlow(
  input: FinalizeAskHumanFlowInput,
  dependencies: FinalizeAskHumanFlowDependencies = {}
): Promise<RunAskHumanFlowResult> {
  const emitDeliveryNotificationAck =
    dependencies.emitDeliveryNotificationAck
    ?? askHumanFinalizationDependencyDefaults.emitDeliveryNotificationAck;
  const emitBubbleNotification =
    dependencies.emitBubbleNotification
    ?? askHumanFinalizationDependencyDefaults.emitBubbleNotification;
  const resolveDeliveryMessageRef =
    dependencies.resolveDeliveryMessageRef
    ?? askHumanFinalizationDependencyDefaults.resolveDeliveryMessageRef;
  const emitBubbleLifecycleEventBestEffort =
    dependencies.emitBubbleLifecycleEventBestEffort
    ?? askHumanFinalizationDependencyDefaults.emitBubbleLifecycleEventBestEffort;

  const messageRef = resolveDeliveryMessageRef({
    bubbleId: input.routing.resolved.bubbleId,
    sessionsPath: input.routing.resolved.bubblePaths.sessionsPath,
    envelope: input.appended.envelope
  });

  const notifications = await emitOptionalAskHumanNotifications(
    {
      bubbleId: input.routing.resolved.bubbleId,
      bubbleConfig: input.routing.resolved.bubbleConfig,
      sessionsPath: input.routing.resolved.bubblePaths.sessionsPath,
      envelope: input.appended.envelope,
      messageRef
    },
    {
      emitDeliveryNotificationAck,
      emitBubbleNotification
    }
  );

  await emitBubbleLifecycleEventBestEffort(
    {
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
    }
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
