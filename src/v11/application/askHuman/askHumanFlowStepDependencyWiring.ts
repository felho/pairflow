import { executeAskHumanExecution } from "./askHumanExecution.js";
import { finalizeAskHumanFlow } from "./askHumanFinalization.js";
import type { AskHumanFlowStepDependencies } from "./askHumanFlowStepDependencyWiringContract.js";

export function createAskHumanFlowStepDependencies(): AskHumanFlowStepDependencies {
  return {
    executeAskHumanExecution,
    finalizeAskHumanFlow
  };
}
