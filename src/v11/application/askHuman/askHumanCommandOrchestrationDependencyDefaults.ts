import { createAskHumanCommandFlowDefaults } from "./askHumanCommandFlowDefaults.js";
import type { ResolvedAskHumanCommandOrchestrationDependencies } from "../../shared/askHuman/askHumanCommandOrchestrationDependencyResolutionContract.js";

export function resolveAskHumanCommandOrchestrationDependencyDefaults(): ResolvedAskHumanCommandOrchestrationDependencies {
  return createAskHumanCommandFlowDefaults();
}
