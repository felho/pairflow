import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../core/protocol/transcriptStore.js";
import { applyStateTransition } from "../../../core/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../core/state/stateStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { queueDeferredReworkIntent } from "../../../core/human/reworkIntent.js";

export interface ApprovalCommandDependencies {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  applyStateTransition?: typeof applyStateTransition;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  ensureBubbleInstanceIdForMutation?: typeof ensureBubbleInstanceIdForMutation;
  queueDeferredReworkIntent?: typeof queueDeferredReworkIntent;
  readStateSnapshot?: typeof readStateSnapshot;
  readTranscriptEnvelopes?: typeof readTranscriptEnvelopes;
  resolveBubbleById?: typeof resolveBubbleById;
  resolveDeliveryMessageRef?: typeof resolveDeliveryMessageRef;
  writeStateSnapshot?: typeof writeStateSnapshot;
}

export interface ResolvedApprovalCommandDependencies {
  appendProtocolEnvelope: typeof appendProtocolEnvelope;
  applyStateTransition: typeof applyStateTransition;
  emitBubbleLifecycleEventBestEffort: typeof emitBubbleLifecycleEventBestEffort;
  emitTmuxDeliveryNotification: typeof emitTmuxDeliveryNotification;
  ensureBubbleInstanceIdForMutation: typeof ensureBubbleInstanceIdForMutation;
  queueDeferredReworkIntent: typeof queueDeferredReworkIntent;
  readStateSnapshot: typeof readStateSnapshot;
  readTranscriptEnvelopes: typeof readTranscriptEnvelopes;
  resolveBubbleById: typeof resolveBubbleById;
  resolveDeliveryMessageRef: typeof resolveDeliveryMessageRef;
  writeStateSnapshot: typeof writeStateSnapshot;
}

export function resolveApprovalCommandDependencies(
  dependencies: ApprovalCommandDependencies = {}
): ResolvedApprovalCommandDependencies {
  return {
    appendProtocolEnvelope:
      dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope,
    applyStateTransition: dependencies.applyStateTransition ?? applyStateTransition,
    emitBubbleLifecycleEventBestEffort:
      dependencies.emitBubbleLifecycleEventBestEffort
      ?? emitBubbleLifecycleEventBestEffort,
    emitTmuxDeliveryNotification:
      dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation
      ?? ensureBubbleInstanceIdForMutation,
    queueDeferredReworkIntent:
      dependencies.queueDeferredReworkIntent ?? queueDeferredReworkIntent,
    readStateSnapshot: dependencies.readStateSnapshot ?? readStateSnapshot,
    readTranscriptEnvelopes:
      dependencies.readTranscriptEnvelopes ?? readTranscriptEnvelopes,
    resolveBubbleById: dependencies.resolveBubbleById ?? resolveBubbleById,
    resolveDeliveryMessageRef:
      dependencies.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef,
    writeStateSnapshot: dependencies.writeStateSnapshot ?? writeStateSnapshot
  };
}
