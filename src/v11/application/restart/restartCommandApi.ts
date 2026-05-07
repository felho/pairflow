import {
  restartBubbleCommandOrchestration,
  throwAsRestartBubbleError
} from "./restartCommandOrchestration.js";
import type {
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
} from "./restartCommandContract.js";
import { RestartBubbleError } from "./restartCommandRuntime.js";

export type RestartBubbleDefaultDependencies = Required<
  Omit<RestartBubbleDependencies, "startBubble">
>;

export async function restartBubble(
  input: RestartBubbleInput,
  dependencies: RestartBubbleDependencies = {}
): Promise<RestartBubbleResult> {
  return restartBubbleCommandOrchestration(input, dependencies);
}

export {
  RestartBubbleError,
  throwAsRestartBubbleError as asRestartBubbleError
};

export type {
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
};
