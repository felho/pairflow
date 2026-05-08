import type { BubbleRemotePointer } from "../../../types/bubble.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import type {
  ExecuteRemoteBubbleApprovalCommandPort,
  ResolveApprovalRemoteBubbleStatusTargetPort
} from "./approvalRemoteExecutionContract.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import { queueDeferredReworkIntent } from "./reworkIntentQueue.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../ports/bubbleIdentity.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../ports/transcript.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../ports/tmuxDelivery.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type { ResolveBubbleFromWorkspaceCwdPort } from "../../ports/workspaceResolution.js";

export interface ApprovalCommandDependencies {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  applyStateTransition?: typeof applyStateTransition;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  executeRemoteBubbleApprovalCommand?: ExecuteRemoteBubbleApprovalCommandPort;
  ensureBubbleInstanceIdForMutation?: EnsureBubbleInstanceIdForMutationPort;
  queueDeferredReworkIntent?: typeof queueDeferredReworkIntent;
  readRemotePointer?: (path: string) => Promise<BubbleRemotePointer | null>;
  readStateSnapshot?: ReadStateSnapshotPort;
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
  resolveRemoteBubbleStatusTarget?: ResolveApprovalRemoteBubbleStatusTargetPort;
  resolveBubbleById?: ResolveBubbleByIdPort;
  resolveBubbleFromWorkspaceCwd?: ResolveBubbleFromWorkspaceCwdPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
}

export interface ApprovalCommandDefaultDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  executeRemoteBubbleApprovalCommand: ExecuteRemoteBubbleApprovalCommandPort;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  readStateSnapshot: ReadStateSnapshotPort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  resolveRemoteBubbleStatusTarget: ResolveApprovalRemoteBubbleStatusTargetPort;
  resolveBubbleById: ResolveBubbleByIdPort;
  resolveBubbleFromWorkspaceCwd: ResolveBubbleFromWorkspaceCwdPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  writeStateSnapshot: WriteStateSnapshotPort;
}

export interface ResolvedApprovalCommandDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  applyStateTransition: typeof applyStateTransition;
  emitBubbleLifecycleEventBestEffort: typeof emitBubbleLifecycleEventBestEffort;
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  executeRemoteBubbleApprovalCommand: ExecuteRemoteBubbleApprovalCommandPort;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  queueDeferredReworkIntent: typeof queueDeferredReworkIntent;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  readStateSnapshot: ReadStateSnapshotPort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  resolveRemoteBubbleStatusTarget: ResolveApprovalRemoteBubbleStatusTargetPort;
  resolveBubbleById: ResolveBubbleByIdPort;
  resolveBubbleFromWorkspaceCwd: ResolveBubbleFromWorkspaceCwdPort;
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
    emitDeliveryNotificationAck:
      dependencies.emitDeliveryNotificationAck
      ?? defaults.emitDeliveryNotificationAck,
    executeRemoteBubbleApprovalCommand:
      dependencies.executeRemoteBubbleApprovalCommand
      ?? defaults.executeRemoteBubbleApprovalCommand,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation
      ?? defaults.ensureBubbleInstanceIdForMutation,
    queueDeferredReworkIntent:
      dependencies.queueDeferredReworkIntent ?? queueDeferredReworkIntent,
    readRemotePointer:
      dependencies.readRemotePointer ?? defaults.readRemotePointer,
    readStateSnapshot:
      dependencies.readStateSnapshot ?? defaults.readStateSnapshot,
    readTranscriptEnvelopes:
      dependencies.readTranscriptEnvelopes ?? defaults.readTranscriptEnvelopes,
    resolveRemoteBubbleStatusTarget:
      dependencies.resolveRemoteBubbleStatusTarget
      ?? defaults.resolveRemoteBubbleStatusTarget,
    resolveBubbleById: dependencies.resolveBubbleById ?? defaults.resolveBubbleById,
    resolveBubbleFromWorkspaceCwd:
      dependencies.resolveBubbleFromWorkspaceCwd
      ?? defaults.resolveBubbleFromWorkspaceCwd,
    resolveDeliveryMessageRef:
      dependencies.resolveDeliveryMessageRef ?? defaults.resolveDeliveryMessageRef,
    writeStateSnapshot: dependencies.writeStateSnapshot ?? defaults.writeStateSnapshot
  };
}
