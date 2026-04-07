import { prepareAskHumanRouting } from "./askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "./runAskHumanFlow.js";
import type { AskHumanCommandFlowDefaults } from "../../shared/askHuman/askHumanCommandFlowDefaultsContract.js";

export const askHumanCommandFlowDefaultImplementations: AskHumanCommandFlowDefaults = {
  prepareAskHumanRouting,
  runAskHumanFlow
};
