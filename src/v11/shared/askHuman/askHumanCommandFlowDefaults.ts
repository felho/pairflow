import { prepareAskHumanRouting } from "../../application/askHuman/askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "../../application/askHuman/runAskHumanFlow.js";
import type { RunAskHumanFlowFn } from "./askHumanFlowContract.js";
import type { PrepareAskHumanRoutingFn } from "./askHumanRoutingContract.js";

export interface AskHumanCommandFlowDefaults {
  prepareAskHumanRouting: PrepareAskHumanRoutingFn;
  runAskHumanFlow: RunAskHumanFlowFn;
}

export function createAskHumanCommandFlowDefaults(): AskHumanCommandFlowDefaults {
  return {
    prepareAskHumanRouting,
    runAskHumanFlow
  };
}
