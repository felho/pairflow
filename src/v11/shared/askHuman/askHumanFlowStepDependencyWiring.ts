import { executeAskHumanExecution } from "../../application/askHuman/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../application/askHuman/askHumanFinalization.js";
import type { RunAskHumanFlowDependencies } from "./askHumanFlowContract.js";

export interface AskHumanFlowStepDependencies {
  executeAskHumanExecution:
    RunAskHumanFlowDependencies["executeAskHumanExecution"];
  finalizeAskHumanFlow:
    RunAskHumanFlowDependencies["finalizeAskHumanFlow"];
}

export function createAskHumanFlowStepDependencies(): AskHumanFlowStepDependencies {
  return {
    executeAskHumanExecution,
    finalizeAskHumanFlow
  };
}
