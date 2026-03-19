import {
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_STATE_CONFLICT
} from "../../../core/bubble/ideation.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyResolution.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";
import { buildKickoffNextState } from "./kickoffStateTransition.js";
import { prepareKickoffPersistence } from "./kickoffPersistencePreparation.js";
import { persistKickoffState } from "./kickoffStatePersistence.js";
import { executeKickoffMutationPipeline } from "./kickoffMutationPipeline.js";
import {
  buildKickoffMutationPipelineInput,
  buildKickoffStatePersistenceInput
} from "./kickoffValidatedExecutionInputBuilders.js";
import {
  buildKickoffFailureResult,
  buildKickoffSuccessResult,
  type KickoffBubbleResultShape
} from "./kickoffResultBuilders.js";

export interface ExecuteKickoffValidatedFlowInput {
  validation: KickoffPreparedValidation;
  now: Date;
  nowIso: string;
}

function buildKickoffPersistenceFailureResult(input: {
  validation: KickoffPreparedValidation;
  reasonCode: string;
}): KickoffBubbleResultShape {
  return buildKickoffFailureResult({
    bubbleId: input.validation.resolved.bubbleId,
    reasonCode: input.reasonCode,
    stateBefore: input.validation.state,
    markersBefore: input.validation.markersBefore
  });
}

function buildKickoffValidatedSuccessResult(input: {
  validation: KickoffPreparedValidation;
  writtenState: {
    state: KickoffPreparedValidation["state"];
  };
}): KickoffBubbleResultShape {
  return buildKickoffSuccessResult({
    bubbleId: input.validation.resolved.bubbleId,
    markersBefore: input.validation.markersBefore,
    stateBefore: input.validation.state,
    stateAfter: input.writtenState.state
  });
}

type PersistKickoffNextStateResult =
  | {
      kind: "failure";
      result: KickoffBubbleResultShape;
    }
  | {
      kind: "written";
      writtenState: {
        state: KickoffPreparedValidation["state"];
        fingerprint: string;
      };
    };

async function persistKickoffNextStateOrFailure(input: {
  validation: KickoffPreparedValidation;
  nextState: ReturnType<typeof buildKickoffNextState>;
  dependencies: ResolvedKickoffDependencies;
}): Promise<PersistKickoffNextStateResult> {
  const statePersistenceResult = await persistKickoffState(
    buildKickoffStatePersistenceInput({
      validation: input.validation,
      nextState: input.nextState,
      dependencies: input.dependencies
    })
  );
  if (statePersistenceResult.kind === "conflict") {
    return {
      kind: "failure",
      result: buildKickoffPersistenceFailureResult({
        validation: input.validation,
        reasonCode: IDEATION_KICKOFF_STATE_CONFLICT
      })
    };
  }

  return {
    kind: "written",
    writtenState: statePersistenceResult.writtenState
  };
}

type ExecuteKickoffMutationOrFailureResult =
  | {
      kind: "failure";
      result: KickoffBubbleResultShape;
    }
  | {
      kind: "success";
    };

async function executeKickoffMutationOrFailure(input: {
  validation: KickoffPreparedValidation;
  persistence: Awaited<ReturnType<typeof prepareKickoffPersistence>>;
  writtenStateFingerprint: string;
  now: Date;
  dependencies: ResolvedKickoffDependencies;
}): Promise<ExecuteKickoffMutationOrFailureResult> {
  const mutationPipelineResult = await executeKickoffMutationPipeline(
    buildKickoffMutationPipelineInput({
      persistenceFailureCode: IDEATION_KICKOFF_PERSISTENCE_FAILED,
      validation: input.validation,
      persistence: input.persistence,
      writtenStateFingerprint: input.writtenStateFingerprint,
      now: input.now,
      dependencies: input.dependencies
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
    kind: "success"
  };
}

export async function executeKickoffValidatedFlow(
  input: ExecuteKickoffValidatedFlowInput,
  dependencies: ResolvedKickoffDependencies
): Promise<KickoffBubbleResultShape> {
  const { resolved, state } = input.validation;

  const nextState = buildKickoffNextState({
    state,
    bubbleConfig: resolved.bubbleConfig,
    nowIso: input.nowIso
  });

  const persistence = await prepareKickoffPersistence({
    taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
    bubbleTomlPath: resolved.bubblePaths.bubbleTomlPath,
    nowIso: input.nowIso,
    readFile: dependencies.readFileFn
  });

  const persistedState = await persistKickoffNextStateOrFailure({
    validation: input.validation,
    nextState,
    dependencies
  });
  if (persistedState.kind === "failure") {
    return persistedState.result;
  }
  const writtenState = persistedState.writtenState;

  const mutationOrFailure = await executeKickoffMutationOrFailure({
    validation: input.validation,
    persistence,
    writtenStateFingerprint: writtenState.fingerprint,
    now: input.now,
    dependencies
  });
  if (mutationOrFailure.kind === "failure") {
    return mutationOrFailure.result;
  }

  return buildKickoffValidatedSuccessResult({
    validation: input.validation,
    writtenState
  });
}
