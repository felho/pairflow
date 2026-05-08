import type { BubbleConfig } from "../../v11/shared/config/bubbleConfigTypes.js";
import type { PairflowGlobalConfig } from "../pairflowConfig.js";
import {
  assertValidation,
  validationFail,
  validationOk,
  type ValidationResult
} from "../../v11/shared/validation/primitives.js";
import { BUBBLE_EXECUTOR_INVALID } from "./errors.js";

export function validateBubbleConfigRemoteReferences(input: {
  bubbleConfig: BubbleConfig;
  globalConfig: PairflowGlobalConfig;
}): ValidationResult<BubbleConfig> {
  const executor = input.bubbleConfig.executor;
  if (executor === undefined) {
    return validationOk(input.bubbleConfig);
  }

  const remotes = input.globalConfig.remotes;
  if (
    remotes === undefined
    || !Object.prototype.hasOwnProperty.call(remotes, executor.remote)
  ) {
    return validationFail([
      {
        path: "executor.remote",
        message: `${BUBBLE_EXECUTOR_INVALID}: Remote "${executor.remote}" is not defined in the global [remotes.<name>] config`
      }
    ]);
  }

  return validationOk(input.bubbleConfig);
}

export function assertValidBubbleConfigRemoteReferences(input: {
  bubbleConfig: BubbleConfig;
  globalConfig: PairflowGlobalConfig;
}): BubbleConfig {
  return assertValidation(
    validateBubbleConfigRemoteReferences(input),
    "Invalid bubble config remote references"
  );
}
