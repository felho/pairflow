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
    {
      question: input.question,
      ...(input.refs !== undefined
        ? { refs: input.refs }
        : {}),
      ...(input.cwd !== undefined
        ? { cwd: input.cwd }
        : {}),
      ...(input.authoritativeContext !== undefined
        ? { authoritativeContext: input.authoritativeContext }
        : {}),
      now: input.now,
      createError: input.createError
    }
  );

  return resolvedDependencies.runAskHumanFlow(
    {
      now: input.now,
      routing,
      createError: input.createError
    },
    {
      executeAskHumanExecution: dependencies.executeAskHumanExecution,
      finalizeAskHumanFlow: dependencies.finalizeAskHumanFlow,
      ...(dependencies.emitDeliveryNotificationAck !== undefined
        ? {
            emitDeliveryNotificationAck:
              dependencies.emitDeliveryNotificationAck
          }
        : {}),
      ...(dependencies.emitBubbleNotification !== undefined
        ? { emitBubbleNotification: dependencies.emitBubbleNotification }
        : {}),
      ...(dependencies.emitBubbleLifecycleEventBestEffort !== undefined
        ? {
            emitBubbleLifecycleEventBestEffort:
              dependencies.emitBubbleLifecycleEventBestEffort
          }
        : {})
    }
  );
}
