import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import { prepareKickoffPersistence } from "./kickoffPersistencePreparation.js";
import { buildKickoffNextState } from "./kickoffStateTransition.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";

export interface PrepareKickoffValidatedExecutionContextInput {
  validation: KickoffPreparedValidation;
  nowIso: string;
  readFile: ResolvedKickoffDependencies["readFileFn"];
}

export interface KickoffValidatedExecutionContext {
  nextState: BubbleStateSnapshot;
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
