import { applyStateTransition } from "../../domain/state/machine.js";
import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import { queueDeferredReworkIntent } from "../../shared/approval/reworkIntent.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../shared/ports/transcript.js";
import type {
  EmitTmuxDeliveryNotificationPort,
  ResolveDeliveryMessageRefPort
} from "../../shared/ports/tmuxDelivery.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";

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

export interface ApprovalCommandDefaultDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  readStateSnapshot: ReadStateSnapshotPort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  resolveBubbleById: ResolveBubbleByIdPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  writeStateSnapshot: WriteStateSnapshotPort;
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
  dependencies: ApprovalCommandDependencies = {},
  defaults: ApprovalCommandDefaultDependencies
): ResolvedApprovalCommandDependencies {
  return {
    appendProtocolEnvelope:
      dependencies.appendProtocolEnvelope ?? defaults.appendProtocolEnvelope,
    applyStateTransition: dependencies.applyStateTransition ?? applyStateTransition,
    emitBubbleLifecycleEventBestEffort:
      dependencies.emitBubbleLifecycleEventBestEffort
      ?? emitBubbleLifecycleEventBestEffort,
    emitTmuxDeliveryNotification:
      dependencies.emitTmuxDeliveryNotification
      ?? defaults.emitTmuxDeliveryNotification,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation
      ?? defaults.ensureBubbleInstanceIdForMutation,
    queueDeferredReworkIntent:
      dependencies.queueDeferredReworkIntent ?? queueDeferredReworkIntent,
    readStateSnapshot:
      dependencies.readStateSnapshot ?? defaults.readStateSnapshot,
    readTranscriptEnvelopes:
      dependencies.readTranscriptEnvelopes ?? defaults.readTranscriptEnvelopes,
    resolveBubbleById: dependencies.resolveBubbleById ?? defaults.resolveBubbleById,
    resolveDeliveryMessageRef:
      dependencies.resolveDeliveryMessageRef ?? defaults.resolveDeliveryMessageRef,
    writeStateSnapshot: dependencies.writeStateSnapshot ?? defaults.writeStateSnapshot
  };
}
