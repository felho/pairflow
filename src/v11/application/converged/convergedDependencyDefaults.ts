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
import type {
  WriteSummaryVerifierConsistencyGateArtifactPort
} from "../../shared/ports/summaryVerifierGateArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../shared/ports/reviewerTestEvidenceArtifacts.js";

export interface ConvergedDependencyDefaults {
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
    resolveReviewerTestExecutionDirective:
      ResolveReviewerTestExecutionDirectivePort;
    writeSummaryVerifierConsistencyGateArtifact:
      WriteSummaryVerifierConsistencyGateArtifactPort;
  };
  finalization: {
    assessPairflowCommandPath: AssessPairflowCommandPathPort;
  };
}

let configuredConvergedDependencyDefaults:
  | ConvergedDependencyDefaults
  | undefined;

export function configureConvergedDependencyDefaults(
  defaults: ConvergedDependencyDefaults
): void {
  configuredConvergedDependencyDefaults = defaults;
}

function requireConvergedDependencyDefaults(): ConvergedDependencyDefaults {
  if (configuredConvergedDependencyDefaults === undefined) {
    throw new Error(
      "CONVERGED_DEFAULTS_UNCONFIGURED: converged runtime defaults were not configured by the composition root. context={\"route\":\"convergedDependencyDefaults\"}"
    );
  }
  return configuredConvergedDependencyDefaults;
}

export const convergedDependencyDefaults: ConvergedDependencyDefaults = {
  flow: {
    readTranscriptEnvelopes: (...args) =>
      requireConvergedDependencyDefaults().flow.readTranscriptEnvelopes(...args)
  },
  routing: {
    ensureBubbleInstanceIdForMutation: (...args) =>
      requireConvergedDependencyDefaults()
        .routing.ensureBubbleInstanceIdForMutation(...args),
    readStateSnapshot: (...args) =>
      requireConvergedDependencyDefaults().routing.readStateSnapshot(...args),
    resolveBubbleFromWorkspaceCwd: (...args) =>
      requireConvergedDependencyDefaults()
        .routing.resolveBubbleFromWorkspaceCwd(...args)
  },
  execution: {
    appendProtocolEnvelope: (...args) => {
      const appendEnvelope =
        requireConvergedDependencyDefaults().execution.appendProtocolEnvelope;
      return appendEnvelope(...args);
    },
    emitBubbleNotification: (...args) =>
      requireConvergedDependencyDefaults()
        .execution.emitBubbleNotification(...args),
    emitDeliveryNotificationAck: (...args) =>
      requireConvergedDependencyDefaults()
        .execution.emitDeliveryNotificationAck(...args),
    resolveDeliveryMessageRef: (...args) =>
      requireConvergedDependencyDefaults()
        .execution.resolveDeliveryMessageRef(...args)
  },
  gateDelivery: {
    emitDeliveryNotificationAck: (...args) =>
      requireConvergedDependencyDefaults()
        .gateDelivery.emitDeliveryNotificationAck(...args),
    resolveDeliveryMessageRef: (...args) =>
      requireConvergedDependencyDefaults()
        .gateDelivery.resolveDeliveryMessageRef(...args)
  },
  validation: {
    readDocContractGateArtifact: (...args) =>
      requireConvergedDependencyDefaults()
        .validation.readDocContractGateArtifact(...args),
    readReviewVerificationArtifactStatus: (...args) =>
      requireConvergedDependencyDefaults()
        .validation.readReviewVerificationArtifactStatus(...args),
    resolveDocContractGateArtifactPath: (...args) =>
      requireConvergedDependencyDefaults()
        .validation.resolveDocContractGateArtifactPath(...args),
    resolveReviewerTestExecutionDirective: (...args) =>
      requireConvergedDependencyDefaults()
        .validation.resolveReviewerTestExecutionDirective(...args),
    writeSummaryVerifierConsistencyGateArtifact: (...args) =>
      requireConvergedDependencyDefaults()
        .validation.writeSummaryVerifierConsistencyGateArtifact(...args)
  },
  finalization: {
    assessPairflowCommandPath: (...args) =>
      requireConvergedDependencyDefaults()
        .finalization.assessPairflowCommandPath(...args)
  }
};
