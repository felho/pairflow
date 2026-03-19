import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../config/bubbleConfig.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { readStateSnapshot, StateStoreConflictError, writeStateSnapshot } from "../state/stateStore.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import {
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_STATE_CONFLICT,
  IDEATION_KICKOFF_TASK_INVALID,
  resolveIdeationMetadata
} from "./ideation.js";
import type { BubbleStateSnapshot } from "../../types/bubble.js";
import {
  KickoffTaskInputValidationError,
  renderKickoffTaskArtifact,
  type ResolvedKickoffTaskInput,
  resolveKickoffTaskInput
} from "../../v11/shared/kickoff/kickoffTaskInputResolution.js";
import { resolveKickoffEligibilityFailureReason } from "../../v11/shared/kickoff/kickoffEligibility.js";
import { buildKickoffNextState } from "../../v11/shared/kickoff/kickoffStateTransition.js";
import { buildKickoffTaskEnvelope } from "../../v11/shared/kickoff/kickoffTaskEnvelope.js";
import { buildKickoffIdeationConfig } from "../../v11/shared/kickoff/kickoffIdeationConfig.js";

export interface KickoffBubbleInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
  now?: Date;
}

export interface KickoffBubbleResult {
  ok: boolean;
  bubble_id: string;
  reason_code: string | null;
  state_changed: boolean;
  protocol: {
    task_envelope_appended: boolean;
  };
  markers_before: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  markers_after: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  state_before?: BubbleStateSnapshot;
  state_after?: BubbleStateSnapshot;
}

export interface KickoffBubbleDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
}


function buildFailureResult(input: {
  bubbleId: string;
  reasonCode: string;
  stateBefore: BubbleStateSnapshot;
  markersBefore: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
}): KickoffBubbleResult {
  return {
    ok: false,
    bubble_id: input.bubbleId,
    reason_code: input.reasonCode,
    state_changed: false,
    protocol: {
      task_envelope_appended: false
    },
    markers_before: input.markersBefore,
    markers_after: input.markersBefore,
    state_before: input.stateBefore
  };
}

export async function kickoffBubble(
  input: KickoffBubbleInput,
  dependencies: KickoffBubbleDependencies = {}
): Promise<KickoffBubbleResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const readFileFn = dependencies.readFile ?? readFile;
  const writeFileFn = dependencies.writeFile ?? writeFile;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const ideationMetadata = resolveIdeationMetadata(resolved.bubbleConfig);
  const markersBefore = {
    ideation_mode: ideationMetadata.mode,
    ideation_task_pending: ideationMetadata.taskPending
  };

  const eligibilityFailureReason = resolveKickoffEligibilityFailureReason({
    hasParseWarning: resolved.bubbleConfig.ideation?.parse_warning !== undefined,
    ideationMode: ideationMetadata.mode,
    ideationTaskPending: ideationMetadata.taskPending,
    state
  });
  if (eligibilityFailureReason !== null) {
    return buildFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: eligibilityFailureReason,
      stateBefore: state,
      markersBefore
    });
  }

  let task: ResolvedKickoffTaskInput;
  try {
    task = await resolveKickoffTaskInput({
      ...(input.task !== undefined ? { task: input.task } : {}),
      ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
      cwd: input.cwd ?? process.cwd()
    });
  } catch (error) {
    if (error instanceof KickoffTaskInputValidationError) {
      return buildFailureResult({
        bubbleId: resolved.bubbleId,
        reasonCode: IDEATION_KICKOFF_TASK_INVALID,
        stateBefore: state,
        markersBefore
      });
    }
    throw error;
  }

  const latestState = await readState(resolved.bubblePaths.statePath);
  if (latestState.fingerprint !== loadedState.fingerprint) {
    return buildFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_STATE_CONFLICT,
      stateBefore: state,
      markersBefore
    });
  }

  const nextState = buildKickoffNextState({
    state,
    bubbleConfig: resolved.bubbleConfig,
    nowIso
  });

  const previousTaskArtifact = await readFileFn(
    resolved.bubblePaths.taskArtifactPath,
    "utf8"
  );
  const previousBubbleToml = await readFileFn(
    resolved.bubblePaths.bubbleTomlPath,
    "utf8"
  );
  const latestConfig = parseBubbleConfigToml(previousBubbleToml);
  const updatedConfig = buildKickoffIdeationConfig({
    bubbleConfig: latestConfig,
    nowIso
  });
  const nextBubbleToml = renderBubbleConfigToml(updatedConfig);

  let writtenState;
  try {
    writtenState = await writeState(
      resolved.bubblePaths.statePath,
      nextState,
      {
        expectedFingerprint: loadedState.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      return buildFailureResult({
        bubbleId: resolved.bubbleId,
        reasonCode: IDEATION_KICKOFF_STATE_CONFLICT,
        stateBefore: state,
        markersBefore
      });
    }
    throw error;
  }

  let transcriptBackup: string | null = null;
  try {
    await writeFileFn(resolved.bubblePaths.taskArtifactPath, renderKickoffTaskArtifact(task), {
      encoding: "utf8"
    });
    await writeFileFn(
      resolved.bubblePaths.bubbleTomlPath,
      nextBubbleToml,
      { encoding: "utf8" }
    );
    transcriptBackup = await readFileFn(resolved.bubblePaths.transcriptPath, "utf8");
    await appendEnvelope({
      transcriptPath: resolved.bubblePaths.transcriptPath,
      lockPath: join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`),
      now,
      envelope: buildKickoffTaskEnvelope({
        bubbleId: resolved.bubbleId,
        implementer: resolved.bubbleConfig.agents.implementer,
        task,
        taskArtifactPath: resolved.bubblePaths.taskArtifactPath
      })
    });
  } catch (error) {
    const rollbackErrors: string[] = [];
    if (transcriptBackup !== null) {
      await writeFileFn(resolved.bubblePaths.transcriptPath, transcriptBackup, {
        encoding: "utf8"
      }).catch((rollbackError) => {
        rollbackErrors.push(
          `transcript rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
        );
      });
    }
    await writeFileFn(resolved.bubblePaths.taskArtifactPath, previousTaskArtifact, {
      encoding: "utf8"
    }).catch((rollbackError) => {
      rollbackErrors.push(
        `task artifact rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
      );
    });
    await writeFileFn(resolved.bubblePaths.bubbleTomlPath, previousBubbleToml, {
      encoding: "utf8"
    }).catch((rollbackError) => {
      rollbackErrors.push(
        `bubble.toml rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
      );
    });
    await writeState(
      resolved.bubblePaths.statePath,
      state,
      {
        expectedFingerprint: writtenState.fingerprint,
        expectedState: "RUNNING"
      }
    ).catch((rollbackError) => {
      rollbackErrors.push(
        `state rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
      );
    });

    if (rollbackErrors.length > 0) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${IDEATION_KICKOFF_PERSISTENCE_FAILED}: mutation failed (${errorMessage}) and rollback failed (${rollbackErrors.join("; ")}).`
      );
    }

    return buildFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_PERSISTENCE_FAILED,
      stateBefore: state,
      markersBefore
    });
  }

  return {
    ok: true,
    bubble_id: resolved.bubbleId,
    reason_code: null,
    state_changed: true,
    protocol: {
      task_envelope_appended: true
    },
    markers_before: markersBefore,
    markers_after: {
      ideation_mode: true,
      ideation_task_pending: false
    },
    state_before: state,
    state_after: writtenState.state
  };
}
