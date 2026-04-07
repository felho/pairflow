import { readRuntimeSessionsRegistry } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  respawnTmuxPaneCommand,
  runTmux,
  runtimePaneIndices,
  type TmuxRunner
} from "./tmuxManager.js";
import { buildAgentCommand } from "../../executor/command/agentCommand.js";
import type {
  RefreshReviewerContextInput,
  RefreshReviewerContextResult
} from "../../../shared/ports/reviewerContext.js";

export type {
  RefreshReviewerContextFailureReason,
  RefreshReviewerContextInput,
  RefreshReviewerContextPort,
  RefreshReviewerContextResult
} from "../../../shared/ports/reviewerContext.js";

interface RefreshReviewerContextInternalInput extends RefreshReviewerContextInput {
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
}

export async function refreshReviewerContext(
  input: RefreshReviewerContextInternalInput
): Promise<RefreshReviewerContextResult> {
  const readSessions = input.readSessionsRegistry ?? readRuntimeSessionsRegistry;

  let sessionName: string | undefined;
  let worktreePath: string | undefined;
  try {
    const sessions = await readSessions(input.sessionsPath, {
      allowMissing: true
    });
    const record = sessions[input.bubbleId];
    sessionName = record?.tmuxSessionName;
    worktreePath = record?.worktreePath;
  } catch {
    return {
      refreshed: false,
      reason: "registry_read_failed"
    };
  }

  if (sessionName === undefined || worktreePath === undefined) {
    return {
      refreshed: false,
      reason: "no_runtime_session"
    };
  }

  const runner = input.runner ?? runTmux;
  const reviewerCommand = buildAgentCommand({
    agentName: input.bubbleConfig.agents.reviewer,
    bubbleId: input.bubbleId,
    worktreePath,
    pairflowCommandProfile: input.bubbleConfig.pairflow_command_profile,
    startupPrompt: input.reviewerStartupPrompt
  });

  try {
    await respawnTmuxPaneCommand({
      sessionName,
      paneIndex: runtimePaneIndices.reviewer,
      cwd: worktreePath,
      command: reviewerCommand,
      runner
    });
  } catch {
    return {
      refreshed: false,
      reason: "tmux_respawn_failed"
    };
  }

  return {
    refreshed: true
  };
}
