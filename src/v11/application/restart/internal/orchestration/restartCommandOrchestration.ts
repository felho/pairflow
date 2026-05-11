import type {
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
} from "../../restartCommandContract.js";
import { runRestartFlow } from "./runRestartFlow.js";
import { resolveRestartBubbleDependencies } from "../preparation/restartCommandDependencyResolution.js";
import { normalizeRestartBubbleInput } from "../preparation/restartCommandInputNormalization.js";
import {
  createRestartBubbleError,
  throwAsRestartBubbleError
} from "../error/restartCommandRuntime.js";

export async function restartBubbleCommandOrchestration(
  input: RestartBubbleInput,
  dependencies: RestartBubbleDependencies = {}
): Promise<RestartBubbleResult> {
  try {
    const normalizedInput = normalizeRestartBubbleInput(
      input,
      createRestartBubbleError
    );
    const resolvedDependencies = resolveRestartBubbleDependencies(dependencies);
    return await runRestartFlow(normalizedInput, resolvedDependencies);
  } catch (error) {
    return throwAsRestartBubbleError(error);
  }
}

export { throwAsRestartBubbleError };
