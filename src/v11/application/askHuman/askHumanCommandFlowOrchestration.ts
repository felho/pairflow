import { buildAskHumanFlowInputFromCommandOrchestration } from "./askHumanCommandFlowInvocationBuilder.js";
import { buildAskHumanFlowDependencies } from "./askHumanFlowInvocationBuilders.js";
import { buildAskHumanRoutingInputFromCommandOrchestration } from "./askHumanCommandRoutingInvocationBuilder.js";
import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput,
  AskHumanCommandOrchestrationResult
} from "./askHumanCommandOrchestrationContract.js";
import type { ResolvedAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyResolutionContract.js";

export async function runAskHumanCommandFlowOrchestration(
  input: AskHumanCommandOrchestrationInput,
  dependencies: AskHumanCommandOrchestrationDependencies,
  resolvedDependencies: ResolvedAskHumanCommandOrchestrationDependencies
): Promise<AskHumanCommandOrchestrationResult> {
  const routing = await resolvedDependencies.prepareAskHumanRouting(
    buildAskHumanRoutingInputFromCommandOrchestration(input)
  );

  return resolvedDependencies.runAskHumanFlow(
    buildAskHumanFlowInputFromCommandOrchestration(input, routing),
    buildAskHumanFlowDependencies({
      executeAskHumanExecution: dependencies.executeAskHumanExecution,
      finalizeAskHumanFlow: dependencies.finalizeAskHumanFlow,
      emitDeliveryNotificationAck:
        dependencies.emitDeliveryNotificationAck,
      emitBubbleNotification: dependencies.emitBubbleNotification,
      emitBubbleLifecycleEventBestEffort:
        dependencies.emitBubbleLifecycleEventBestEffort
    })
  );
}
