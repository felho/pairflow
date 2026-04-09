import { emitBubbleLifecycleEventBestEffort } from "../../v11/shared/metrics/bubbleEvents.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../bubble/workspaceResolution.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { applyStateTransition } from "../../v11/domain/state/machine.js";

export const askHumanDependencyDefaults = {
  execution: {
    appendProtocolEnvelope,
    writeStateSnapshot,
    applyStateTransition
  },
  routingPreparation: {
    resolveBubbleFromWorkspaceCwd,
    ensureBubbleInstanceIdForMutation,
    readStateSnapshot
  },
  finalization: {
    emitTmuxDeliveryNotification,
    emitBubbleNotification,
    resolveDeliveryMessageRef,
    emitBubbleLifecycleEventBestEffort
  }
} as const;
