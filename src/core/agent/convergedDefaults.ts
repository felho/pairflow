import { emitBubbleNotification } from "../../v11/infrastructure/channel/notifications.js";
import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../v11/infrastructure/executor/workspace/workspaceResolution.js";
import { assessPairflowCommandPath } from "../runtime/pairflowCommand.js";
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
