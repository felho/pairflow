import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import { prepareKickoffPersistence } from "../mutation/kickoffPersistencePreparation.js";
import { buildKickoffNextState } from "../mutation/kickoffStateTransition.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";

export interface PrepareKickoffValidatedExecutionContextInput {
  validation: KickoffPreparedValidation;
  nowIso: string;
  readFile: ResolvedKickoffDependencies["readFileFn"];
}

export interface KickoffValidatedExecutionContext {
  nextState: PersistedBubbleStateSnapshot;
  persistence: Awaited<ReturnType<typeof prepareKickoffPersistence>>;
}

export async function prepareKickoffValidatedExecutionContext(
  input: PrepareKickoffValidatedExecutionContextInput
): Promise<KickoffValidatedExecutionContext> {
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
    readFile: input.readFile
  });

  return {
    nextState,
    persistence
  };
}
