import type { EmitAskHumanDependencies } from "./askHumanCommandContract.js";
import type { AskHumanFlowRuntimeDependencies } from "./askHumanFlowDependencyWiringContract.js";

export function buildAskHumanFlowRuntimeDependenciesFromCommandRuntime(
  dependencies: EmitAskHumanDependencies
): AskHumanFlowRuntimeDependencies {
  return {
    emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification,
    emitBubbleNotification: dependencies.emitBubbleNotification
  };
}
