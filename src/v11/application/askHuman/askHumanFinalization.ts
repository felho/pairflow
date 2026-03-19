import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import type { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { AppendProtocolEnvelopeResult } from "../../../core/protocol/transcriptStore.js";
import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import {
  buildAskHumanFinalizationResult,
  buildAskHumanLifecycleMetricMetadata
} from "../../shared/askHuman/askHumanFinalizationArtifacts.js";
import type { AskHumanRoutingContext } from "../../shared/askHuman/askHumanRoutingContext.js";
import { resolveAskHumanFinalizationDependencies } from "../../shared/askHuman/askHumanFinalizationDependencyResolution.js";

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

export async function finalizeAskHumanFlow(
  input: FinalizeAskHumanFlowInput,
  dependencies: FinalizeAskHumanFlowDependencies = {}
): Promise<FinalizeAskHumanFlowResult> {
  const resolvedDependencies = resolveAskHumanFinalizationDependencies({
    emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification,
    emitBubbleNotification: dependencies.emitBubbleNotification,
    resolveDeliveryMessageRef: dependencies.resolveDeliveryMessageRef,
    emitBubbleLifecycleEventBestEffort:
      dependencies.emitBubbleLifecycleEventBestEffort
  });

  const messageRef = resolvedDependencies.resolveDeliveryMessageRef({
    bubbleId: input.routing.resolved.bubbleId,
    sessionsPath: input.routing.resolved.bubblePaths.sessionsPath,
    envelope: input.appended.envelope
  });

  emitOptionalAskHumanNotifications(
    input,
    {
      emitTmuxDeliveryNotification:
        resolvedDependencies.emitTmuxDeliveryNotification,
      emitBubbleNotification: resolvedDependencies.emitBubbleNotification
    },
    messageRef
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
