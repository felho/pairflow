import { applyStateTransition } from "../../v11/domain/state/machine.js";
import { emitBubbleNotification } from "../../v11/infrastructure/channel/notifications.js";
import { emitBubbleLifecycleEventBestEffort } from "../../v11/shared/metrics/bubbleEvents.js";
import { ensureBubbleInstanceIdForMutation } from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../v11/infrastructure/executor/workspace/workspaceResolution.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../v11/infrastructure/channel/tmux/tmuxDelivery.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";

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
