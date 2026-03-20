import type { ExecuteKickoffMutationInput } from "./kickoffMutationExecution.js";
import {
  buildKickoffMutationRollbackInput,
  type KickoffMutationPipelineInputForBuilders
} from "./kickoffMutationRollbackInputBuilder.js";

export function buildKickoffMutationExecutionInput(
  input: KickoffMutationPipelineInputForBuilders
): ExecuteKickoffMutationInput {
  return {
    bubbleId: input.bubbleId,
    implementer: input.implementer,
    task: input.task,
    taskArtifactPath: input.taskArtifactPath,
    bubbleTomlPath: input.bubbleTomlPath,
    nextBubbleToml: input.nextBubbleToml,
    transcriptPath: input.transcriptPath,
    locksDir: input.locksDir,
    now: input.now,
    writeFile: input.writeFile,
    readFile: input.readFile,
    appendEnvelope: input.appendEnvelope,
    ...(input.onEnvelopeAppended !== undefined
      ? { onEnvelopeAppended: input.onEnvelopeAppended }
      : {})
  };
}

export { buildKickoffMutationRollbackInput };
