import type { BubbleRemotePointer } from "../../../types/bubble.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import type {
  ExecuteRemoteBubbleApprovalCommandPort,
  ResolveApprovalRemoteBubbleStatusTargetPort
} from "./approvalRemoteExecutionContract.js";
import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import { queueDeferredReworkIntent } from "../../shared/approval/reworkIntent.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../shared/ports/transcript.js";
import type {
  EmitDeliveryAckLikePort,
  ResolveDeliveryMessageRefPort
} from "../../shared/ports/tmuxDelivery.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type { ResolveBubbleFromWorkspaceCwdPort } from "../../shared/ports/workspaceResolution.js";

export interface ApprovalCommandDependencies {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  applyStateTransition?: typeof applyStateTransition;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
  emitDeliveryNotificationAck?: EmitDeliveryAckLikePort;
  emitTmuxDeliveryNotification?: EmitDeliveryAckLikePort;
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
  emitDeliveryNotificationAck: EmitDeliveryAckLikePort;
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
  emitDeliveryNotificationAck: EmitDeliveryAckLikePort;
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
      ?? dependencies.emitTmuxDeliveryNotification
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
