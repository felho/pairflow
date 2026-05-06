import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type { AssessPairflowCommandPathPort } from "../../shared/ports/pairflowCommand.js";
import type {
  ReadStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../shared/ports/transcript.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../shared/ports/tmuxDelivery.js";
import type {
  ResolveBubbleFromWorkspaceCwdPort
} from "../../shared/ports/workspaceResolution.js";
import type { EmitBubbleNotificationPort } from "../../shared/ports/notifications.js";
import type {
  ReadDocContractGateArtifactPort,
  ResolveDocContractGateArtifactPathPort
} from "../../shared/ports/docContractGateArtifacts.js";
import type { ReadReviewVerificationArtifactStatusPort } from "../../shared/ports/reviewVerificationArtifacts.js";

interface ConvergedDependencyDefaults {
  flow: {
    readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  };
  routing: {
    ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
    readStateSnapshot: ReadStateSnapshotPort;
    resolveBubbleFromWorkspaceCwd: ResolveBubbleFromWorkspaceCwdPort;
  };
  execution: {
    appendProtocolEnvelope: AppendProtocolEnvelopePort;
    emitBubbleNotification: EmitBubbleNotificationPort;
    emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
    resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  };
  gateDelivery: {
    emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
    resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  };
  validation: {
    readDocContractGateArtifact: ReadDocContractGateArtifactPort;
    readReviewVerificationArtifactStatus:
      ReadReviewVerificationArtifactStatusPort;
    resolveDocContractGateArtifactPath: ResolveDocContractGateArtifactPathPort;
  };
  finalization: {
    assessPairflowCommandPath: AssessPairflowCommandPathPort;
  };
}

interface ConvergedDependencyDefaultsModule {
  convergedDependencyDefaults: ConvergedDependencyDefaults;
}

let convergedDependencyDefaultsModulePromise:
  | Promise<ConvergedDependencyDefaultsModule>
  | undefined;

function getConvergedDependencyDefaultsModulePath(): string {
  return "../../defaults/converged/convergedDependencyDefaults.js";
}

async function loadConvergedDependencyDefaultsModule():
  Promise<ConvergedDependencyDefaultsModule> {
  convergedDependencyDefaultsModulePromise ??= import(
    getConvergedDependencyDefaultsModulePath()
  ) as Promise<ConvergedDependencyDefaultsModule>;
  return convergedDependencyDefaultsModulePromise;
}

const convergedDependencyDefaultsModule =
  await loadConvergedDependencyDefaultsModule();

export const convergedDependencyDefaults =
  convergedDependencyDefaultsModule.convergedDependencyDefaults;
