import { IDEATION_KICKOFF_PERSISTENCE_FAILED } from "../../shared/ideation/ideationReasonCodes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";
import { executeKickoffMutationPipeline } from "./kickoffMutationPipeline.js";
import {
  buildKickoffPersistenceFailureResult,
  type KickoffBubbleResultShape
} from "./kickoffValidatedExecutionResultBuilders.js";

export type ExecuteKickoffMutationOrFailureResult =
  | {
      kind: "failure";
      result: KickoffBubbleResultShape;
    }
  | {
      kind: "success";
      appendedTaskEnvelope?: ProtocolEnvelope;
    };

export async function executeKickoffMutationOrFailure(input: {
  validation: KickoffPreparedValidation;
  persistence: {
    previousBubbleToml: string;
    previousTaskArtifact: string;
    nextBubbleToml: string;
  };
  writtenStateFingerprint: string;
  now: Date;
  dependencies: ResolvedKickoffDependencies;
}): Promise<ExecuteKickoffMutationOrFailureResult> {
  let appendedTaskEnvelope: ProtocolEnvelope | undefined;
  const mutationPipelineResult = await executeKickoffMutationPipeline(
    {
      persistenceFailureCode: IDEATION_KICKOFF_PERSISTENCE_FAILED,
      bubbleId: input.validation.resolved.bubbleId,
      implementer: input.validation.resolved.bubbleConfig.agents.implementer,
      task: input.validation.task,
      taskArtifactPath: input.validation.resolved.bubblePaths.taskArtifactPath,
      bubbleTomlPath: input.validation.resolved.bubblePaths.bubbleTomlPath,
      nextBubbleToml: input.persistence.nextBubbleToml,
      previousBubbleToml: input.persistence.previousBubbleToml,
      previousTaskArtifact: input.persistence.previousTaskArtifact,
      transcriptPath: input.validation.resolved.bubblePaths.transcriptPath,
      locksDir: input.validation.resolved.bubblePaths.locksDir,
      now: input.now,
      statePath: input.validation.resolved.bubblePaths.statePath,
      previousState: input.validation.state,
      writtenStateFingerprint: input.writtenStateFingerprint,
      writeFile: input.dependencies.writeFileFn,
      readFile: input.dependencies.readFileFn,
      appendEnvelope: input.dependencies.appendEnvelope,
      onEnvelopeAppended: (envelope) => {
        appendedTaskEnvelope = envelope;
      },
      writeState: input.dependencies.writeState
    }
  );
  if (mutationPipelineResult.kind === "mutation_failed_rolled_back") {
    return {
      kind: "failure",
      result: buildKickoffPersistenceFailureResult({
        validation: input.validation,
        reasonCode: IDEATION_KICKOFF_PERSISTENCE_FAILED
      })
    };
  }

  return {
    kind: "success",
    ...(appendedTaskEnvelope !== undefined
      ? { appendedTaskEnvelope }
      : {})
  };
}
