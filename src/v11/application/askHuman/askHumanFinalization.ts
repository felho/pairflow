import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { AppendProtocolEnvelopeResult } from "../../../core/protocol/transcriptStore.js";
import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import type { AskHumanRoutingContext } from "../../shared/askHuman/askHumanRoutingContext.js";

export interface FinalizeAskHumanFlowInput {
  now: Date;
  routing: AskHumanRoutingContext;
  appended: AppendProtocolEnvelopeResult;
  written: LoadedStateSnapshot;
}

export interface FinalizeAskHumanFlowResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
}

export interface FinalizeAskHumanFlowDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  resolveDeliveryMessageRef?: typeof resolveDeliveryMessageRef;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

function emitOptionalAskHumanNotifications(
  input: FinalizeAskHumanFlowInput,
  dependencies: {
    emitTmuxDeliveryNotification: typeof emitTmuxDeliveryNotification;
    emitBubbleNotification: typeof emitBubbleNotification;
  },
  messageRef: string
): void {
  // Optional UX signal; never block protocol/state progression on notification failure.
  void dependencies.emitTmuxDeliveryNotification({
    bubbleId: input.routing.resolved.bubbleId,
    bubbleConfig: input.routing.resolved.bubbleConfig,
    sessionsPath: input.routing.resolved.bubblePaths.sessionsPath,
    envelope: input.appended.envelope,
    messageRef
  });

  // Optional UX signal; never block protocol/state progression on notification failure.
  void dependencies.emitBubbleNotification(input.routing.resolved.bubbleConfig, "waiting-human");
}

function buildAskHumanLifecycleMetadata(input: FinalizeAskHumanFlowInput) {
  return {
    sender: input.routing.state.active_agent,
    refs_count: input.routing.refs.length,
    question_length: Array.from(input.routing.question).length
  };
}

export async function finalizeAskHumanFlow(
  input: FinalizeAskHumanFlowInput,
  dependencies: FinalizeAskHumanFlowDependencies = {}
): Promise<FinalizeAskHumanFlowResult> {
  const emitTmuxDeliveryNotificationFn =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const emitBubbleNotificationFn =
    dependencies.emitBubbleNotification ?? emitBubbleNotification;
  const resolveDeliveryMessageRefFn =
    dependencies.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef;
  const emitBubbleLifecycleEventBestEffortFn =
    dependencies.emitBubbleLifecycleEventBestEffort ?? emitBubbleLifecycleEventBestEffort;

  const messageRef = resolveDeliveryMessageRefFn({
    bubbleId: input.routing.resolved.bubbleId,
    sessionsPath: input.routing.resolved.bubblePaths.sessionsPath,
    envelope: input.appended.envelope
  });

  emitOptionalAskHumanNotifications(
    input,
    {
      emitTmuxDeliveryNotification: emitTmuxDeliveryNotificationFn,
      emitBubbleNotification: emitBubbleNotificationFn
    },
    messageRef
  );

  await emitBubbleLifecycleEventBestEffortFn({
    repoPath: input.routing.resolved.repoPath,
    bubbleId: input.routing.resolved.bubbleId,
    bubbleInstanceId: input.routing.bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_asked_human",
    round: input.routing.state.round,
    actorRole: input.routing.state.active_role,
    metadata: buildAskHumanLifecycleMetadata(input),
    now: input.now
  });

  return {
    bubbleId: input.routing.resolved.bubbleId,
    sequence: input.appended.sequence,
    envelope: input.appended.envelope,
    state: input.written.state,
    inferredRecipient: "human"
  };
}
