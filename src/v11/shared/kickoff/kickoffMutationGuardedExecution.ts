import type { executeKickoffMutation } from "./kickoffMutationExecution.js";
import type { executeKickoffMutationRollback } from "./kickoffMutationRollback.js";
import { buildKickoffMutationExecutionInput } from "./kickoffMutationPipelineInputBuilders.js";
import { buildKickoffMutationPipelineSuccessResult } from "./kickoffMutationPipelineFlowHelpers.js";
import { handleKickoffMutationFailure } from "./kickoffMutationFailureHandling.js";

type KickoffMutationPipelineInput = Parameters<
  typeof buildKickoffMutationExecutionInput
>[0] & {
  persistenceFailureCode: string;
};

type KickoffMutationPipelineResult =
  | ReturnType<typeof buildKickoffMutationPipelineSuccessResult>
  | Awaited<ReturnType<typeof handleKickoffMutationFailure>>;

export async function executeKickoffMutationWithRollbackGuard(input: {
  pipelineInput: KickoffMutationPipelineInput;
  executeMutation: typeof executeKickoffMutation;
  executeRollback: typeof executeKickoffMutationRollback;
}): Promise<KickoffMutationPipelineResult> {
  let transcriptBackup: string | null = null;
  try {
    transcriptBackup = await input.executeMutation(
      buildKickoffMutationExecutionInput(input.pipelineInput)
    );
  } catch (error) {
    return handleKickoffMutationFailure({
      pipelineInput: input.pipelineInput,
      mutationError: error,
      transcriptBackup,
      executeRollback: input.executeRollback
    });
  }

  return buildKickoffMutationPipelineSuccessResult();
}
