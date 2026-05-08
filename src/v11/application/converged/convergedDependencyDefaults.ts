import type { EnsureBubbleInstanceIdForMutationPort } from "../../ports/bubbleIdentity.js";
import type { AssessPairflowCommandPathPort } from "../../ports/pairflowCommand.js";
import type {
  ReadStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../ports/transcript.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../ports/tmuxDelivery.js";
import type {
  ResolveBubbleFromWorkspaceCwdPort
} from "../../ports/workspaceResolution.js";
import type { EmitBubbleNotificationPort } from "../../ports/notifications.js";
import type {
  ReadDocContractGateArtifactPort,
  ResolveDocContractGateArtifactPathPort
} from "../../ports/docContractGateArtifacts.js";
import type { ReadReviewVerificationArtifactStatusPort } from "../../ports/reviewVerificationArtifacts.js";
import type {
  WriteSummaryVerifierConsistencyGateArtifactPort
} from "../../ports/summaryVerifierGateArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../ports/reviewerTestEvidenceArtifacts.js";

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
