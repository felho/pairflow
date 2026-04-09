import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { assessPairflowCommandPath } from "../runtime/pairflowCommand.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";

export const convergedDependencyDefaults = {
  flow: {
    readTranscriptEnvelopes
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
  finalization: {
    assessPairflowCommandPath
  }
} as const;
