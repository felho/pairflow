import { deliveryTargetRoleMetadataKey, type ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  NormalizedApprovalDecisionInput
} from "../../shared/approval/approvalCommandInputNormalization.js";
import type {
  ResolvedApprovalCommandDependencies
} from "../../shared/approval/approvalCommandDependencyResolution.js";
import {
  resolveApprovalDecisionMetadata
} from "../../shared/approval/approvalRoutingEligibility.js";
import type { ApprovalDecisionDeliverySignalsResult } from "./approvalCommandContract.js";
import type { EmitTmuxDeliveryNotificationResult } from "../../shared/ports/tmuxDelivery.js";

type ApprovalDecisionFlowShape = Pick<
  NormalizedApprovalDecisionInput,
  "decision" | "message" | "overrideNonApprove" | "overrideReason"
> & {
  createError: PairflowCreateCommandError;
};

export async function buildApprovalDecisionEnvelopePayload(input: {
  decision: ApprovalDecisionFlowShape["decision"];
  message: ApprovalDecisionFlowShape["message"];
  overrideNonApprove: ApprovalDecisionFlowShape["overrideNonApprove"];
  overrideReason: ApprovalDecisionFlowShape["overrideReason"];
  state: Parameters<typeof resolveApprovalDecisionMetadata>[0]["state"];
  transcriptPath: string;
  round: number;
  readTranscriptEnvelopes: ResolvedApprovalCommandDependencies["readTranscriptEnvelopes"];
  createError: ApprovalDecisionFlowShape["createError"];
}): Promise<ProtocolEnvelope["payload"]> {
  const envelopePayload: ProtocolEnvelope["payload"] = {
    decision: input.decision
  };
  const envelopeMetadata = await resolveApprovalDecisionMetadata({
    decision: input.decision,
    state: input.state,
    transcriptPath: input.transcriptPath,
    round: input.round,
    overrideNonApprove: input.overrideNonApprove,
    overrideReason: input.overrideReason,
    readTranscriptEnvelopes: input.readTranscriptEnvelopes,
    createError: input.createError
  });

  if (input.message !== undefined) {
    envelopePayload.message = input.message;
  }
  if (Object.keys(envelopeMetadata).length > 0) {
    envelopePayload.metadata = envelopeMetadata;
  }

  return envelopePayload;
}

function buildFallbackDeliveryResult(message: string): EmitTmuxDeliveryNotificationResult {
  return {
    delivered: false,
    message,
    reason: "tmux_send_failed"
  };
}

export async function emitApprovalDecisionDeliverySignals(input: {
  decision: ApprovalDecisionFlowShape["decision"];
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  appendedEnvelope: ProtocolEnvelope;
  messageRef: string;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<ApprovalDecisionDeliverySignalsResult> {
  // Optional UX signal; never block protocol/state progression on notification failure.
  const statusDelivery = await input.dependencies.emitTmuxDeliveryNotification({
    bubbleId: input.resolved.bubbleId,
    bubbleConfig: input.resolved.bubbleConfig,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: input.appendedEnvelope,
    messageRef: input.messageRef
  }).catch(() =>
    buildFallbackDeliveryResult(
      `Failed to deliver approval decision ${input.appendedEnvelope.id} to status pane.`
    )
  );

  if (input.decision !== "rework") {
    return {
      statusDelivery
    };
  }

  // Rework requests must reach the implementer pane explicitly, otherwise
  // a human-gate -> RUNNING transition can remain invisible in practice.
  const existingDeliveryMetadata =
    typeof input.appendedEnvelope.payload.metadata === "object" &&
    input.appendedEnvelope.payload.metadata !== null
      ? input.appendedEnvelope.payload.metadata
      : {};
  const implementerDelivery = await input.dependencies.emitTmuxDeliveryNotification({
    bubbleId: input.resolved.bubbleId,
    bubbleConfig: input.resolved.bubbleConfig,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: {
      ...input.appendedEnvelope,
      recipient: input.resolved.bubbleConfig.agents.implementer,
      payload: {
        ...input.appendedEnvelope.payload,
        metadata: {
          ...existingDeliveryMetadata,
          [deliveryTargetRoleMetadataKey]: "implementer"
        }
      }
    },
    messageRef: input.messageRef
  }).catch(() =>
    buildFallbackDeliveryResult(
      `Failed to deliver approval decision ${input.appendedEnvelope.id} to implementer pane.`
    )
  );

  return {
    statusDelivery,
    implementerDelivery
  };
}

export async function emitApprovalDecisionLifecycleEvent(input: {
  decision: ApprovalDecisionFlowShape["decision"];
  refsCount: number;
  message: ApprovalDecisionFlowShape["message"];
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  bubbleInstanceId: string;
  round: number;
  now: Date;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<void> {
  await input.dependencies.emitBubbleLifecycleEventBestEffort({
    repoPath: input.resolved.repoPath,
    bubbleId: input.resolved.bubbleId,
    bubbleInstanceId: input.bubbleInstanceId,
    eventType:
      input.decision === "approve"
        ? "bubble_approved"
        : "bubble_rework_requested",
    round: input.round,
    actorRole: "human",
    metadata: {
      decision: input.decision,
      refs_count: input.refsCount,
      has_message: input.message !== undefined,
      message_length:
        input.message === undefined ? 0 : Array.from(input.message).length
    },
    now: input.now
  });
}
