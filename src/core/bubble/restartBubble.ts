import {
  resolveBubbleById
} from "./bubbleLookup.js";
import {
  restartBubbleCommandOrchestration
} from "../../v11/application/restart/restartCommandOrchestration.js";
import {
  RestartBubbleError,
  throwAsRestartBubbleError
} from "../../v11/application/restart/restartCommandRuntime.js";
import type {
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
} from "../../v11/application/restart/restartCommandContract.js";
import { startBubbleV11 as startBubble } from "../../v11/application/start/emitStartV11.js";
import { persistPassValidationRecoveryMarker } from "../runtime/passValidationEvidence.js";
import { removeRuntimeSession } from "../runtime/sessionsRegistry.js";
import { terminateBubbleTmuxSession } from "../runtime/tmuxManager.js";

export interface RestartBubbleDefaultDependencies {
  resolveBubbleById: RestartBubbleDependencies["resolveBubbleById"];
  terminateBubbleTmuxSession: RestartBubbleDependencies["terminateBubbleTmuxSession"];
  removeRuntimeSession: RestartBubbleDependencies["removeRuntimeSession"];
  persistPassValidationRecoveryMarker:
    RestartBubbleDependencies["persistPassValidationRecoveryMarker"];
  startBubble: RestartBubbleDependencies["startBubble"];
}

export const restartBubbleDefaults: RestartBubbleDefaultDependencies = {
  resolveBubbleById,
  terminateBubbleTmuxSession,
  removeRuntimeSession,
  persistPassValidationRecoveryMarker,
  startBubble
};

export async function restartBubble(
  input: RestartBubbleInput,
  dependencies: RestartBubbleDependencies = {}
): Promise<RestartBubbleResult> {
  const resolvedDependencies = {
    ...restartBubbleDefaults,
    ...dependencies
  } as RestartBubbleDependencies;
  return restartBubbleCommandOrchestration(input, resolvedDependencies);
}

export {
  RestartBubbleError,
  throwAsRestartBubbleError as asRestartBubbleError
};

export type {
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
} from "../../v11/application/restart/restartCommandContract.js";
