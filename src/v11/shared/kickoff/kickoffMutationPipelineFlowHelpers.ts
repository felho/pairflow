import { executeKickoffMutation } from "./kickoffMutationExecution.js";
import { executeKickoffMutationRollback } from "./kickoffMutationRollback.js";

export interface KickoffMutationPipelineDependencyOverrides {
  executeMutation?: typeof executeKickoffMutation;
  executeRollback?: typeof executeKickoffMutationRollback;
}

export function resolveKickoffMutationPipelineDependencies(
  dependencies: KickoffMutationPipelineDependencyOverrides
): {
  executeMutation: typeof executeKickoffMutation;
  executeRollback: typeof executeKickoffMutationRollback;
} {
  return {
    executeMutation: dependencies.executeMutation ?? executeKickoffMutation,
    executeRollback: dependencies.executeRollback ?? executeKickoffMutationRollback
  };
}

export function buildKickoffMutationPipelineSuccessResult(): {
  kind: "success";
} {
  return {
    kind: "success"
  };
}

export function buildKickoffMutationPipelineRolledBackResult(): {
  kind: "mutation_failed_rolled_back";
} {
  return {
    kind: "mutation_failed_rolled_back"
  };
}
