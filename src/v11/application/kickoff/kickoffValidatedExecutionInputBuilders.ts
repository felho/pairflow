import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import type { KickoffPreparedValidation } from "./kickoffValidationPreparation.js";
import type { buildKickoffNextState } from "./kickoffStateTransition.js";
import type { prepareKickoffPersistence } from "./kickoffPersistencePreparation.js";
import type { persistKickoffState } from "./kickoffStatePersistence.js";
import type { executeKickoffMutationPipeline } from "./kickoffMutationPipeline.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export function buildKickoffStatePersistenceInput(input: {
  validation: KickoffPreparedValidation;
  nextState: ReturnType<typeof buildKickoffNextState>;
  dependencies: ResolvedKickoffDependencies;
}): Parameters<typeof persistKickoffState>[0] {
  return {
    statePath: input.validation.resolved.bubblePaths.statePath,
    loadedFingerprint: input.validation.loadedState.fingerprint,
    nextState: input.nextState,
    readState: input.dependencies.readState,
    writeState: input.dependencies.writeState
  };
}

export function buildKickoffMutationPipelineInput(input: {
  persistenceFailureCode: string;
  validation: KickoffPreparedValidation;
  persistence: Awaited<ReturnType<typeof prepareKickoffPersistence>>;
  writtenStateFingerprint: string;
  now: Date;
  dependencies: ResolvedKickoffDependencies;
  onEnvelopeAppended?: (envelope: ProtocolEnvelope) => void;
}): Parameters<typeof executeKickoffMutationPipeline>[0] {
  return {
    persistenceFailureCode: input.persistenceFailureCode,
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
    ...(input.onEnvelopeAppended !== undefined
      ? { onEnvelopeAppended: input.onEnvelopeAppended }
      : {}),
    writeState: input.dependencies.writeState
  };
}
