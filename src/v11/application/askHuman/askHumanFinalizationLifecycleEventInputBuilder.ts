import type { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import type { FinalizeAskHumanFlowInput } from "./askHumanFlowContract.js";
import { buildAskHumanLifecycleMetricMetadata } from "./askHumanFinalizationArtifacts.js";

export function buildAskHumanFinalizationLifecycleEventInput(
  input: FinalizeAskHumanFlowInput
): Parameters<typeof emitBubbleLifecycleEventBestEffort>[0] {
  return {
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
  };
}
