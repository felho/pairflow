import { IDEATION_KICKOFF_STATE_CONFLICT } from "../../../core/bubble/ideation.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyResolution.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";
import type { buildKickoffNextState } from "./kickoffStateTransition.js";
import { persistKickoffState } from "./kickoffStatePersistence.js";
import { buildKickoffStatePersistenceInput } from "./kickoffValidatedExecutionInputBuilders.js";
import {
  buildKickoffPersistenceFailureResult,
  type KickoffBubbleResultShape
} from "./kickoffValidatedExecutionResultBuilders.js";

export type PersistKickoffNextStateResult =
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

export async function persistKickoffNextStateOrFailure(input: {
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
