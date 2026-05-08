import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationContract.js";
import { executeAskHumanExecution } from "./askHumanExecution.js";
import { finalizeAskHumanFlow } from "./askHumanFinalization.js";
import { forwardAskHumanRuntimeNotificationDependencies } from "./askHumanRuntimeDependencyForwarding.js";
import type { AskHumanFlowRuntimeDependencies } from "./askHumanFlowDependencyWiringContract.js";
import {
  prepareAskHumanRouting
} from "./askHumanRoutingPreparation.js";

function hasRoutingDependencyOverrides(
  dependencies: AskHumanFlowRuntimeDependencies
): boolean {
  return (
    dependencies.resolveBubbleFromWorkspaceCwd !== undefined ||
    dependencies.ensureBubbleInstanceIdForMutation !== undefined ||
    dependencies.readStateSnapshot !== undefined
  );
}

export function createAskHumanCommandOrchestrationDependencies(
  runtimeDependencies: AskHumanFlowRuntimeDependencies
): AskHumanCommandOrchestrationDependencies {
  return {
    executeAskHumanExecution,
    finalizeAskHumanFlow,
    ...(hasRoutingDependencyOverrides(runtimeDependencies)
      ? {
          prepareAskHumanRouting: (input) =>
            prepareAskHumanRouting(input, {
              ...(runtimeDependencies.resolveBubbleFromWorkspaceCwd !== undefined
                ? {
                    resolveBubbleFromWorkspaceCwd:
                      runtimeDependencies.resolveBubbleFromWorkspaceCwd
                  }
                : {}),
              ...(runtimeDependencies.ensureBubbleInstanceIdForMutation !== undefined
                ? {
                    ensureBubbleInstanceIdForMutation:
                      runtimeDependencies.ensureBubbleInstanceIdForMutation
                  }
                : {}),
              ...(runtimeDependencies.readStateSnapshot !== undefined
                ? { readStateSnapshot: runtimeDependencies.readStateSnapshot }
                : {})
            })
        }
      : {}),
    ...forwardAskHumanRuntimeNotificationDependencies(runtimeDependencies)
  };
}
