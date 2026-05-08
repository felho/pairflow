import type { executeKickoffMutationRollback } from "./kickoffMutationRollback.js";
import { buildKickoffMutationRollbackInput } from "./kickoffMutationRollbackInputBuilder.js";
import { buildKickoffMutationPipelineRolledBackResult } from "../mutation/kickoffMutationPipelineFlowHelpers.js";

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

function formatKickoffMutationRollbackFailure(input: {
  persistenceFailureCode: string;
  mutationError: unknown;
  rollbackErrors: string[];
}): string {
  const errorMessage =
    input.mutationError instanceof Error
      ? input.mutationError.message
      : String(input.mutationError);
  return `${input.persistenceFailureCode}: mutation failed (${errorMessage}) and rollback failed (${input.rollbackErrors.join("; ")}).`;
}

function throwKickoffMutationRollbackFailure(input: {
  persistenceFailureCode: string;
  mutationError: unknown;
  rollbackErrors: string[];
}): never {
  // reason_code=KICKOFF_MUTATION_ROLLBACK_FAILED context=kickoff_mutation_pipeline
  throw new Error(
    formatKickoffMutationRollbackFailure({
      persistenceFailureCode: input.persistenceFailureCode,
      mutationError: input.mutationError,
      rollbackErrors: input.rollbackErrors
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
