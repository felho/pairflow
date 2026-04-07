import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../core/protocol/transcriptStore.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../ports/transcript.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../core/state/stateStore.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import type {
  EmitTmuxDeliveryNotificationPort,
  ResolveDeliveryMessageRefPort
} from "../ports/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import type {
  EnsureBubbleInstanceIdForMutationPort
} from "../ports/bubbleIdentity.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import { queueDeferredReworkIntent } from "./reworkIntent.js";

export interface ApprovalCommandDependencies {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  applyStateTransition?: typeof applyStateTransition;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
  emitTmuxDeliveryNotification?: EmitTmuxDeliveryNotificationPort;
  ensureBubbleInstanceIdForMutation?: EnsureBubbleInstanceIdForMutationPort;
  queueDeferredReworkIntent?: typeof queueDeferredReworkIntent;
  readStateSnapshot?: ReadStateSnapshotPort;
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
  resolveBubbleById?: ResolveBubbleByIdPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
}

export interface ResolvedApprovalCommandDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  applyStateTransition: typeof applyStateTransition;
  emitBubbleLifecycleEventBestEffort: typeof emitBubbleLifecycleEventBestEffort;
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  queueDeferredReworkIntent: typeof queueDeferredReworkIntent;
  readStateSnapshot: ReadStateSnapshotPort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  resolveBubbleById: ResolveBubbleByIdPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  writeStateSnapshot: WriteStateSnapshotPort;
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
