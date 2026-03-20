import { prepareAskHumanRouting } from "../../application/askHuman/askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "../../application/askHuman/runAskHumanFlow.js";
import type { AskHumanCommandFlowDefaults } from "./askHumanCommandFlowDefaultsContract.js";

export const askHumanCommandFlowDefaultImplementations: AskHumanCommandFlowDefaults = {
  prepareAskHumanRouting,
  runAskHumanFlow
};
