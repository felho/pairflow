import { prepareAskHumanRouting } from "./askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "./runAskHumanFlow.js";
import type { AskHumanCommandFlowDefaults } from "./askHumanCommandFlowDefaultsContract.js";

export function createAskHumanCommandFlowDefaults(): AskHumanCommandFlowDefaults {
  return {
    prepareAskHumanRouting,
    runAskHumanFlow
  };
}
