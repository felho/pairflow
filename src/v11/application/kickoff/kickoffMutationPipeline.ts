import type {
  ExecuteKickoffMutationPipelineDependencies,
  ExecuteKickoffMutationPipelineInput,
  ExecuteKickoffMutationPipelineResult
} from "./kickoffMutationPipelineContract.js";
import {
  resolveKickoffMutationPipelineDependencies
} from "./kickoffMutationPipelineFlowHelpers.js";
import { executeKickoffMutationWithRollbackGuard } from "./kickoffMutationGuardedExecution.js";
export type {
  ExecuteKickoffMutationPipelineDependencies,
  ExecuteKickoffMutationPipelineInput,
  ExecuteKickoffMutationPipelineResult
} from "./kickoffMutationPipelineContract.js";

export async function executeKickoffMutationPipeline(
  input: ExecuteKickoffMutationPipelineInput,
  dependencies: ExecuteKickoffMutationPipelineDependencies = {}
): Promise<ExecuteKickoffMutationPipelineResult> {
  const resolvedDependencies =
    resolveKickoffMutationPipelineDependencies(dependencies);

  return executeKickoffMutationWithRollbackGuard({
    pipelineInput: input,
    executeMutation: resolvedDependencies.executeMutation,
    executeRollback: resolvedDependencies.executeRollback
  });
}
