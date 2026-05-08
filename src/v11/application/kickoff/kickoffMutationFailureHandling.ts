import type { executeKickoffMutationRollback } from "./kickoffMutationRollback.js";
import { buildKickoffMutationRollbackInput } from "./kickoffMutationRollbackInputBuilder.js";
import { throwKickoffMutationRollbackFailure } from "./kickoffMutationRollbackFailure.js";
import { buildKickoffMutationPipelineRolledBackResult } from "./kickoffMutationPipelineFlowHelpers.js";

type KickoffMutationRollbackPipelineInput = Parameters<
  typeof buildKickoffMutationRollbackInput
>[0]["pipelineInput"];

async function executeKickoffRollback(input: {
  pipelineInput: KickoffMutationRollbackPipelineInput;
  transcriptBackup: string | null;
  executeRollback: typeof executeKickoffMutationRollback;
}): Promise<string[]> {
  return input.executeRollback(
    buildKickoffMutationRollbackInput({
      pipelineInput: input.pipelineInput,
      transcriptBackup: input.transcriptBackup
    })
  );
}

export async function handleKickoffMutationFailure(input: {
  pipelineInput: KickoffMutationRollbackPipelineInput & {
    persistenceFailureCode: string;
  };
  mutationError: unknown;
  transcriptBackup: string | null;
  executeRollback: typeof executeKickoffMutationRollback;
}): Promise<{ kind: "mutation_failed_rolled_back" }> {
  const rollbackErrors = await executeKickoffRollback({
    pipelineInput: input.pipelineInput,
    transcriptBackup: input.transcriptBackup,
    executeRollback: input.executeRollback
  });

  if (rollbackErrors.length > 0) {
    throwKickoffMutationRollbackFailure({
      persistenceFailureCode: input.pipelineInput.persistenceFailureCode,
      mutationError: input.mutationError,
      rollbackErrors
    });
  }

  return buildKickoffMutationPipelineRolledBackResult();
}
