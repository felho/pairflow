import { persistPassValidationRecoveryMarker } from "../../artifact/validation/passValidationRecoveryMarker.js";
import { readRemotePointer } from "../../artifact/bubble/remoteExecutionArtifacts.js";
import { terminateBubbleTmuxSession } from "../../channel/tmux/tmuxManager.js";
import { removeRuntimeSession } from "../sessionRuntime/runtimeSessionsRegistry.js";
import { resolveBubbleById } from "../workspace/bubbleLookup.js";

export const restartBubbleDependencyDefaults = {
  resolveBubbleById,
  readRemotePointer,
  terminateBubbleTmuxSession,
  removeRuntimeSession,
  persistPassValidationRecoveryMarker
} as const;
