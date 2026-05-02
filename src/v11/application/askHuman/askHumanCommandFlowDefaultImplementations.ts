import { prepareAskHumanRouting } from "./askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "./runAskHumanFlow.js";
import type { AskHumanCommandFlowDefaults } from "./askHumanCommandFlowDefaultsContract.js";

export const askHumanCommandFlowDefaultImplementations: AskHumanCommandFlowDefaults = {
  prepareAskHumanRouting,
  runAskHumanFlow
};
