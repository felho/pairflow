import type { BubbleRemotePointer } from "../../../types/bubble.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import type {
  ExecuteRemoteBubbleApprovalCommandInput,
  ExecuteRemoteBubbleApprovalCommandResult
} from "../../infrastructure/executor/ssh/sshBubbleApprovalCommand.js";
import type { RemoteBubbleStatusTarget } from "../../infrastructure/executor/ssh/sshBubbleStatus.js";
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
  executeRemoteBubbleApprovalCommand?: (
    input: ExecuteRemoteBubbleApprovalCommandInput
  ) => Promise<ExecuteRemoteBubbleApprovalCommandResult>;
  ensureBubbleInstanceIdForMutation?: EnsureBubbleInstanceIdForMutationPort;
  queueDeferredReworkIntent?: typeof queueDeferredReworkIntent;
  readRemotePointer?: (path: string) => Promise<BubbleRemotePointer | null>;
  readStateSnapshot?: ReadStateSnapshotPort;
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
  resolveRemoteBubbleStatusTarget?: (input: {
    bubbleId: string;
    remoteAlias: string;
    expectedHost?: string;
  }) => Promise<RemoteBubbleStatusTarget>;
  resolveBubbleById?: ResolveBubbleByIdPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
}

export interface ApprovalCommandDefaultDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  executeRemoteBubbleApprovalCommand: (
    input: ExecuteRemoteBubbleApprovalCommandInput
  ) => Promise<ExecuteRemoteBubbleApprovalCommandResult>;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  readStateSnapshot: ReadStateSnapshotPort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  resolveRemoteBubbleStatusTarget: (input: {
    bubbleId: string;
    remoteAlias: string;
    expectedHost?: string;
  }) => Promise<RemoteBubbleStatusTarget>;
  resolveBubbleById: ResolveBubbleByIdPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  writeStateSnapshot: WriteStateSnapshotPort;
}

export interface ResolvedApprovalCommandDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  applyStateTransition: typeof applyStateTransition;
  emitBubbleLifecycleEventBestEffort: typeof emitBubbleLifecycleEventBestEffort;
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  executeRemoteBubbleApprovalCommand: (
    input: ExecuteRemoteBubbleApprovalCommandInput
  ) => Promise<ExecuteRemoteBubbleApprovalCommandResult>;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  queueDeferredReworkIntent: typeof queueDeferredReworkIntent;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  readStateSnapshot: ReadStateSnapshotPort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  resolveRemoteBubbleStatusTarget: (input: {
    bubbleId: string;
    remoteAlias: string;
    expectedHost?: string;
  }) => Promise<RemoteBubbleStatusTarget>;
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
    resolveDeliveryMessageRef:
      dependencies.resolveDeliveryMessageRef ?? defaults.resolveDeliveryMessageRef,
    writeStateSnapshot: dependencies.writeStateSnapshot ?? defaults.writeStateSnapshot
  };
}
