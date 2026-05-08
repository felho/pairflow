import type {
  RunAskHumanFlowDependencies,
  RunAskHumanFlowInput,
  RunAskHumanFlowResult
} from "./askHumanFlowContract.js";
import { askHumanFinalizationDependencyDefaults } from "./askHumanFinalizationDependencyDefaults.js";

export async function runAskHumanFlow(
  input: RunAskHumanFlowInput,
  dependencies: RunAskHumanFlowDependencies
): Promise<RunAskHumanFlowResult> {
  const executionDependencies = {
    ...(dependencies.appendProtocolEnvelope !== undefined
      ? { appendProtocolEnvelope: dependencies.appendProtocolEnvelope }
      : {}),
    ...(dependencies.writeStateSnapshot !== undefined
      ? { writeStateSnapshot: dependencies.writeStateSnapshot }
      : {}),
    ...(dependencies.applyStateTransition !== undefined
      ? { applyStateTransition: dependencies.applyStateTransition }
      : {})
  };

  const execution = await dependencies.executeAskHumanExecution(
    {
      now: input.now,
      routing: input.routing,
      createError: input.createError
    },
    executionDependencies
  );

  const finalizationDependencies = {
    emitDeliveryNotificationAck:
      dependencies.emitDeliveryNotificationAck
      ?? askHumanFinalizationDependencyDefaults.emitDeliveryNotificationAck,
    emitBubbleNotification:
      dependencies.emitBubbleNotification
      ?? askHumanFinalizationDependencyDefaults.emitBubbleNotification,
    resolveDeliveryMessageRef:
      dependencies.resolveDeliveryMessageRef
      ?? askHumanFinalizationDependencyDefaults.resolveDeliveryMessageRef,
    emitBubbleLifecycleEventBestEffort:
      dependencies.emitBubbleLifecycleEventBestEffort
      ?? askHumanFinalizationDependencyDefaults.emitBubbleLifecycleEventBestEffort
  };

  return dependencies.finalizeAskHumanFlow(
    {
      now: input.now,
      routing: input.routing,
      appended: execution.appended,
      written: execution.written
    },
    finalizationDependencies
  );
}
