import { readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../config/bubbleConfig.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { readStateSnapshot, StateStoreConflictError, writeStateSnapshot } from "../state/stateStore.js";
import { assertValidBubbleStateSnapshot } from "../state/stateSchema.js";
import { isNonEmptyString } from "../validation.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import {
  IDEATION_ALREADY_ACTIVE,
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_NOT_ELIGIBLE,
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_REQUIRES_RUNNING,
  IDEATION_KICKOFF_STATE_CONFLICT,
  IDEATION_KICKOFF_TASK_INVALID,
  hasIdeationMetadataParseWarning,
  resolveIdeationMetadata
} from "./ideation.js";
import type { BubbleConfig, BubbleStateSnapshot } from "../../types/bubble.js";

interface ResolvedKickoffTaskInput {
  content: string;
  source: "inline" | "file";
  sourcePath?: string;
}

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

class KickoffTaskInputValidationError extends Error {}

const IDEATION_PLACEHOLDER_CONTENT_MARKER = /metadata_source:\s*ideation_placeholder/iu;

function isIdeationPlaceholderTaskContent(content: string): boolean {
  return IDEATION_PLACEHOLDER_CONTENT_MARKER.test(content);
}

function renderTaskArtifact(task: ResolvedKickoffTaskInput): string {
  const sourceLine =
    task.source === "file"
      ? `Source: file (${task.sourcePath})`
      : "Source: inline text";

  return `# Bubble Task\n\n${sourceLine}\n\n${task.content}\n`;
}

async function resolveKickoffTaskInput(input: {
  task?: string;
  taskFile?: string;
  cwd: string;
}): Promise<ResolvedKickoffTaskInput> {
  const hasTaskText = isNonEmptyString(input.task);
  const hasTaskFile = isNonEmptyString(input.taskFile);
  if (hasTaskText && hasTaskFile) {
    throw new KickoffTaskInputValidationError(
      "Provide either task text or task file path, not both."
    );
  }
  if (!hasTaskText && !hasTaskFile) {
    throw new KickoffTaskInputValidationError("Provide task text or task file path.");
  }

  if (hasTaskFile) {
    const candidatePath = resolve(input.cwd, input.taskFile as string);
    const taskStats = await stat(candidatePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw new KickoffTaskInputValidationError(
          `Task file does not exist: ${candidatePath}`
        );
      }
      throw error;
    });
    if (!taskStats.isFile()) {
      throw new KickoffTaskInputValidationError(
        `Task path is not a file: ${candidatePath}`
      );
    }

    const content = await readFile(candidatePath, "utf8");
    const normalizedContent = content.trimEnd();
    if (normalizedContent.trim().length === 0) {
      throw new KickoffTaskInputValidationError(`Task file is empty: ${candidatePath}`);
    }
    if (isIdeationPlaceholderTaskContent(normalizedContent)) {
      throw new KickoffTaskInputValidationError(
        `Task file still contains ideation placeholder marker: ${candidatePath}`
      );
    }

    return {
      content: normalizedContent,
      source: "file",
      sourcePath: candidatePath
    };
  }

  const taskText = (input.task as string).trim();
  if (taskText.length === 0) {
    throw new KickoffTaskInputValidationError("Task cannot be empty.");
  }
  if (isIdeationPlaceholderTaskContent(taskText)) {
    throw new KickoffTaskInputValidationError(
      "Task text still contains ideation placeholder marker."
    );
  }
  return {
    content: taskText,
    source: "inline"
  };
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

function normalizeKickoffIdeationConfig(input: {
  bubbleConfig: BubbleConfig;
  nowIso: string;
}): BubbleConfig {
  return {
    ...input.bubbleConfig,
    ideation: {
      mode: true,
      task_pending: false,
      ...(input.bubbleConfig.ideation?.started_at !== undefined
        ? { started_at: input.bubbleConfig.ideation.started_at }
        : {}),
      kicked_off_at: input.nowIso
    }
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

  if (hasIdeationMetadataParseWarning(resolved.bubbleConfig)) {
    return buildFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_NOT_ALLOWED,
      stateBefore: state,
      markersBefore
    });
  }

  if (!ideationMetadata.mode) {
    return buildFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_NOT_ALLOWED,
      stateBefore: state,
      markersBefore
    });
  }

  if (state.round >= 1) {
    return buildFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_ALREADY_ACTIVE,
      stateBefore: state,
      markersBefore
    });
  }

  if (state.state !== "RUNNING") {
    return buildFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_REQUIRES_RUNNING,
      stateBefore: state,
      markersBefore
    });
  }

  if (!ideationMetadata.taskPending) {
    return buildFailureResult({
      bubbleId: resolved.bubbleId,
      reasonCode: IDEATION_KICKOFF_NOT_ELIGIBLE,
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

  const nextState = assertValidBubbleStateSnapshot({
    ...state,
    round: 1,
    active_agent: resolved.bubbleConfig.agents.implementer,
    active_role: "implementer",
    active_since: nowIso,
    last_command_at: nowIso,
    round_role_history: state.round_role_history.some((entry) => entry.round === 1)
      ? state.round_role_history
      : [
          ...state.round_role_history,
          {
            round: 1,
            implementer: resolved.bubbleConfig.agents.implementer,
            reviewer: resolved.bubbleConfig.agents.reviewer,
            switched_at: nowIso
          }
        ]
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
  const updatedConfig = normalizeKickoffIdeationConfig({
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
    await writeFileFn(resolved.bubblePaths.taskArtifactPath, renderTaskArtifact(task), {
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
      envelope: {
        bubble_id: resolved.bubbleId,
        sender: "orchestrator",
        recipient: resolved.bubbleConfig.agents.implementer,
        type: "TASK",
        round: 1,
        payload: {
          summary: task.content,
          metadata: {
            source: task.source,
            ...(task.sourcePath !== undefined
              ? { source_path: task.sourcePath }
              : {})
          }
        },
        refs: [resolved.bubblePaths.taskArtifactPath]
      }
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
