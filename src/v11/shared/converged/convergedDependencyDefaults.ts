import { assessPairflowCommandPath } from "../../infrastructure/executor/command/pairflowCommand.js";
import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../infrastructure/executor/workspace/workspaceResolution.js";
import { readReviewVerificationArtifactStatus } from "../../infrastructure/artifact/reviewer/reviewVerificationArtifacts.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../transcript/transcriptDependencyDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifactDefaults.js";

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
