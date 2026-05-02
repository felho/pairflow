import { createAskHumanCommandFlowDefaults } from "./askHumanCommandFlowDefaults.js";
import type { ResolvedAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyResolutionContract.js";

export function resolveAskHumanCommandOrchestrationDependencyDefaults(): ResolvedAskHumanCommandOrchestrationDependencies {
  return createAskHumanCommandFlowDefaults();
}
