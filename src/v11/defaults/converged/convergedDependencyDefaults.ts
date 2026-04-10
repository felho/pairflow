import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { assessPairflowCommandPath } from "../../shared/command/pairflowCommandPathAssessment.js";
import {
  readReviewVerificationArtifactStatus
} from "../reviewer/reviewVerificationArtifactDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../shared/transcript/transcriptDependencyDefaults.js";
import { ensureBubbleInstanceIdForMutation } from "../bubbleIdentity/bubbleIdentityDefaults.js";
import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifactDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../workspace/workspaceResolutionDefaults.js";

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
    emitTmuxDeliveryNotification,
    resolveDeliveryMessageRef
  },
  gateDelivery: {
    emitTmuxDeliveryNotification,
    resolveDeliveryMessageRef
  },
  validation: {
    readDocContractGateArtifact,
    readReviewVerificationArtifactStatus,
    resolveDocContractGateArtifactPath
  },
  finalization: {
    assessPairflowCommandPath
  }
} as const;
