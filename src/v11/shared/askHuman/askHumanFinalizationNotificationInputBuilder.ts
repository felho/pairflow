import type { FinalizeAskHumanFlowInput } from "./askHumanFlowContract.js";
import type { EmitOptionalAskHumanNotificationsInput } from "./askHumanNotificationEmissionContract.js";

export function buildAskHumanFinalizationNotificationInput(
  input: FinalizeAskHumanFlowInput,
  messageRef: string
): EmitOptionalAskHumanNotificationsInput {
  return {
    bubbleId: input.routing.resolved.bubbleId,
    bubbleConfig: input.routing.resolved.bubbleConfig,
    sessionsPath: input.routing.resolved.bubblePaths.sessionsPath,
    envelope: input.appended.envelope,
    messageRef
  };
}
