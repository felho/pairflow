import type {
  ExecuteKickoffMutationInput,
  executeKickoffMutation
} from "./kickoffMutationExecution.js";
import type { executeKickoffMutationRollback } from "./kickoffMutationRollback.js";
import type { ExecuteKickoffMutationPipelineInput } from "./kickoffMutationPipelineContract.js";
import { buildKickoffMutationPipelineSuccessResult } from "./kickoffMutationPipelineFlowHelpers.js";
import { handleKickoffMutationFailure } from "./kickoffMutationFailureHandling.js";

type KickoffMutationPipelineInput = ExecuteKickoffMutationPipelineInput;

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
    const mutationInput: ExecuteKickoffMutationInput = {
      bubbleId: input.pipelineInput.bubbleId,
      implementer: input.pipelineInput.implementer,
      task: input.pipelineInput.task,
      taskArtifactPath: input.pipelineInput.taskArtifactPath,
      bubbleTomlPath: input.pipelineInput.bubbleTomlPath,
      nextBubbleToml: input.pipelineInput.nextBubbleToml,
      transcriptPath: input.pipelineInput.transcriptPath,
      locksDir: input.pipelineInput.locksDir,
      now: input.pipelineInput.now,
      writeFile: input.pipelineInput.writeFile,
      readFile: input.pipelineInput.readFile,
      appendEnvelope: input.pipelineInput.appendEnvelope,
      ...(input.pipelineInput.onEnvelopeAppended !== undefined
        ? { onEnvelopeAppended: input.pipelineInput.onEnvelopeAppended }
        : {})
    };
    transcriptBackup = await input.executeMutation(mutationInput);
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
