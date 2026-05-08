import { IDEATION_KICKOFF_STATE_CONFLICT } from "../../../../shared/ideation/ideationReasonCodes.js";
import type { ResolvedKickoffDependencies } from "../validation/kickoffDependencyContract.js";
import type { KickoffPreparedValidation } from "../validation/kickoffValidationPreparation.js";
import type { buildKickoffNextState } from "./kickoffStateTransition.js";
import { persistKickoffState } from "./kickoffStatePersistence.js";
import {
  buildKickoffPersistenceFailureResult,
  type KickoffBubbleResultShape
} from "../validation/kickoffValidatedExecutionResultBuilders.js";

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
    {
      statePath: input.validation.resolved.bubblePaths.statePath,
      loadedFingerprint: input.validation.loadedState.fingerprint,
      nextState: input.nextState,
      readState: input.dependencies.readState,
      writeState: input.dependencies.writeState
    }
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
