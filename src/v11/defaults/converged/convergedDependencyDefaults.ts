import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { assessPairflowCommandPath } from "../../shared/command/pairflowCommandPathAssessment.js";
import {
  readReviewVerificationArtifactStatus
} from "../../infrastructure/artifact/reviewer/reviewVerificationArtifacts.js";
import {
  writeSummaryVerifierConsistencyGateArtifact
} from "../../infrastructure/artifact/reviewer/summaryVerifierConsistencyGateArtifacts.js";
import {
  resolveReviewerTestExecutionDirective
} from "../reviewer/reviewerTestEvidenceDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../infrastructure/artifact/transcript/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../../infrastructure/artifact/gates/docContractGateArtifacts.js";
import { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { resolveBubbleFromWorkspaceCwd } from "../../infrastructure/executor/workspace/workspaceResolution.js";
import {
  applyMetaReviewGateOnConvergenceV11
} from "../metaReviewGate/metaReviewGateApi.js";
import { configureConvergedDependencyDefaults } from "../../application/converged/internal/orchestration/convergedDependencyDefaults.js";

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
    applyMetaReviewGateOnConvergence: applyMetaReviewGateOnConvergenceV11,
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
