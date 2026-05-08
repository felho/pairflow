import type { AskHumanCommandOrchestrationDependencies } from "../mutation/askHumanCommandOrchestrationContract.js";
import { executeAskHumanExecution } from "./askHumanExecution.js";
import { finalizeAskHumanFlow } from "../mutation/askHumanFinalization.js";
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
    ...(runtimeDependencies.emitDeliveryNotificationAck !== undefined
      ? {
          emitDeliveryNotificationAck:
            runtimeDependencies.emitDeliveryNotificationAck
        }
      : {}),
    ...(runtimeDependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: runtimeDependencies.emitBubbleNotification }
      : {}),
    ...(runtimeDependencies.resolveDeliveryMessageRef !== undefined
      ? { resolveDeliveryMessageRef: runtimeDependencies.resolveDeliveryMessageRef }
      : {}),
    ...(runtimeDependencies.emitBubbleLifecycleEventBestEffort !== undefined
      ? {
          emitBubbleLifecycleEventBestEffort:
            runtimeDependencies.emitBubbleLifecycleEventBestEffort
        }
      : {})
  };
}
