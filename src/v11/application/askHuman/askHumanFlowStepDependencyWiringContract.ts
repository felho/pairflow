import type { RunAskHumanFlowDependencies } from "./askHumanFlowContract.js";

export interface AskHumanFlowStepDependencies {
  executeAskHumanExecution:
    RunAskHumanFlowDependencies["executeAskHumanExecution"];
  finalizeAskHumanFlow:
    RunAskHumanFlowDependencies["finalizeAskHumanFlow"];
}
