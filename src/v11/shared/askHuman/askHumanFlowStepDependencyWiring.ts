import { executeAskHumanExecution } from "../../application/askHuman/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../application/askHuman/askHumanFinalization.js";
import type { AskHumanFlowStepDependencies } from "./askHumanFlowStepDependencyWiringContract.js";

export function createAskHumanFlowStepDependencies(): AskHumanFlowStepDependencies {
  return {
    executeAskHumanExecution,
    finalizeAskHumanFlow
  };
}
