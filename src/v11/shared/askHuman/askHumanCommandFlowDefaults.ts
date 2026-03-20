import type { AskHumanCommandFlowDefaults } from "./askHumanCommandFlowDefaultsContract.js";
import { askHumanCommandFlowDefaultImplementations } from "./askHumanCommandFlowDefaultImplementations.js";

export function createAskHumanCommandFlowDefaults(): AskHumanCommandFlowDefaults {
  return {
    ...askHumanCommandFlowDefaultImplementations
  };
}
