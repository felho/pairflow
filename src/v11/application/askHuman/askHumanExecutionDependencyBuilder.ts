import type {
  AskHumanExecutionDependencies,
  AskHumanExecutionDependencySource
} from "./askHumanExecutionDependencyBuilderContract.js";

export function buildAskHumanExecutionDependencies(
  dependencies: AskHumanExecutionDependencySource
): AskHumanExecutionDependencies {
  return {
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
}
