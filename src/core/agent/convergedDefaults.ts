import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../bubble/workspaceResolution.js";
import { assessPairflowCommandPath } from "../runtime/pairflowCommand.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";
import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifacts.js";
import { readReviewVerificationArtifactStatus } from "../reviewer/reviewVerificationArtifacts.js";
import { readStateSnapshot } from "../state/stateStore.js";

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
