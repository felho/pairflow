import { persistPassValidationRecoveryMarker } from "../../artifact/validation/passValidationRecoveryMarker.js";
import { terminateBubbleTmuxSession } from "../../channel/tmux/tmuxManager.js";
import { removeRuntimeSession } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { resolveBubbleById } from "../../executor/workspace/bubbleLookup.js";

export const restartBubbleDependencyDefaults = {
  resolveBubbleById,
  terminateBubbleTmuxSession,
  removeRuntimeSession,
  persistPassValidationRecoveryMarker
} as const;
