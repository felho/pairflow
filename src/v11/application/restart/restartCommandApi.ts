import {
  restartBubbleCommandOrchestration,
  throwAsRestartBubbleError
} from "./restartCommandOrchestration.js";
import {
  loadRestartBubbleDependencyDefaults,
  type RestartBubbleDefaultDependencies
} from "./restartCommandDefaults.js";
import type {
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
} from "./restartCommandContract.js";
import { RestartBubbleError } from "./restartCommandRuntime.js";

export async function restartBubble(
  input: RestartBubbleInput,
  dependencies: RestartBubbleDependencies = {}
): Promise<RestartBubbleResult> {
  const restartBubbleDependencyDefaults =
    await loadRestartBubbleDependencyDefaults();
  return restartBubbleCommandOrchestration(input, {
    ...restartBubbleDependencyDefaults,
    ...dependencies
  });
}

export {
  RestartBubbleError,
  throwAsRestartBubbleError as asRestartBubbleError
};

export type {
  RestartBubbleDefaultDependencies,
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
};
