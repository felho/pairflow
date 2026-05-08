import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { assessPairflowCommandPath } from "../../shared/command/pairflowCommandPathAssessment.js";
import {
  readReviewVerificationArtifactStatus
} from "../reviewer/reviewVerificationArtifactDefaults.js";
import {
  writeSummaryVerifierConsistencyGateArtifact
} from "../reviewer/summaryVerifierConsistencyGateDefaults.js";
import {
  resolveReviewerTestExecutionDirective
} from "../reviewer/reviewerTestEvidenceDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../transcript/transcriptDependencyDefaults.js";
import { ensureBubbleInstanceIdForMutation } from "../bubbleIdentity/bubbleIdentityDefaults.js";
import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifactDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../workspace/workspaceResolutionDefaults.js";
import { configureConvergedDependencyDefaults } from "../../application/converged/convergedDependencyDefaults.js";

export const convergedDependencyDefaults = {
  flow: {
    readTranscriptEnvelopes
  },
  routing: {
    ensureBubbleInstanceIdForMutation,
    readStateSnapshot,
    resolveBubbleFromWorkspaceCwd
  },
  execution: {
    appendProtocolEnvelope,
    emitBubbleNotification,
    emitDeliveryNotificationAck,
    resolveDeliveryMessageRef
  },
  gateDelivery: {
    emitDeliveryNotificationAck,
    resolveDeliveryMessageRef
  },
  validation: {
    readDocContractGateArtifact,
    readReviewVerificationArtifactStatus,
    resolveDocContractGateArtifactPath,
    resolveReviewerTestExecutionDirective,
    writeSummaryVerifierConsistencyGateArtifact
  },
  finalization: {
    assessPairflowCommandPath
  }
} as const;

configureConvergedDependencyDefaults(convergedDependencyDefaults);
