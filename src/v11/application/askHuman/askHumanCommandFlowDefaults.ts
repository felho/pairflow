import type { AskHumanCommandFlowDefaults } from "../../shared/askHuman/askHumanCommandFlowDefaultsContract.js";
import { askHumanCommandFlowDefaultImplementations } from "./askHumanCommandFlowDefaultImplementations.js";

export function createAskHumanCommandFlowDefaults(): AskHumanCommandFlowDefaults {
  return {
    ...askHumanCommandFlowDefaultImplementations
  };
}
