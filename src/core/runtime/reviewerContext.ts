import { type BubbleConfig } from "../../types/bubble.js";
import { readRuntimeSessionsRegistry } from "./sessionsRegistry.js";
import {
  respawnTmuxPaneCommand,
  runTmux,
  runtimePaneIndices,
  type TmuxRunner
} from "./tmuxManager.js";
import { buildAgentCommand } from "./agentCommand.js";

export interface RefreshReviewerContextInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  reviewerStartupPrompt?: string;
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
}

export type RefreshReviewerContextFailureReason =
  | "no_runtime_session"
  | "registry_read_failed"
  | "tmux_respawn_failed";

export interface RefreshReviewerContextResult {
  refreshed: boolean;
  reason?: RefreshReviewerContextFailureReason;
}

export async function refreshReviewerContext(
  input: RefreshReviewerContextInput
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
