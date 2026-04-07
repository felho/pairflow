import { IDEATION_KICKOFF_PERSISTENCE_FAILED } from "../ideation/ideationReasonCodes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";
import { executeKickoffMutationPipeline } from "./kickoffMutationPipeline.js";
import { buildKickoffMutationPipelineInput } from "./kickoffValidatedExecutionInputBuilders.js";
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
    buildKickoffMutationPipelineInput({
      persistenceFailureCode: IDEATION_KICKOFF_PERSISTENCE_FAILED,
      validation: input.validation,
      persistence: input.persistence,
      writtenStateFingerprint: input.writtenStateFingerprint,
      now: input.now,
      dependencies: input.dependencies,
      onEnvelopeAppended: (envelope) => {
        appendedTaskEnvelope = envelope;
      }
    })
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
