import { prepareAskHumanRouting } from "../../application/askHuman/askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "../../application/askHuman/runAskHumanFlow.js";
import type { AskHumanCommandFlowDefaults } from "./askHumanCommandFlowDefaultsContract.js";

export function createAskHumanCommandFlowDefaults(): AskHumanCommandFlowDefaults {
  return {
    prepareAskHumanRouting,
    runAskHumanFlow
  };
}
