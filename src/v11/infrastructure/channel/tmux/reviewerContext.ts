import { readRuntimeSessionsRegistry } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  getSharedTopologySlotPaneIndexForRole
} from "../../../shared/topology/topologySlotPaneProjection.js";
import {
  respawnTmuxPaneCommand,
  runTmux,
  type TmuxRunner
} from "./tmuxManager.js";
import { buildAgentCommand } from "../../../shared/command/agentCommand.js";
import { resolveRuntimeSessionWorkspaceAuthority } from "../../../shared/runtimeSessionWorkspaceAuthority.js";
import type {
  RefreshReviewerContextInput,
  RefreshReviewerContextResult
} from "../../../ports/reviewerContext.js";

export type {
  RefreshReviewerContextFailureReason,
  RefreshReviewerContextInput,
  RefreshReviewerContextPort,
  RefreshReviewerContextResult
} from "../../../ports/reviewerContext.js";

interface RefreshReviewerContextInternalInput extends RefreshReviewerContextInput {
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
}

export async function refreshReviewerContext(
  input: RefreshReviewerContextInternalInput
): Promise<RefreshReviewerContextResult> {
  const readSessions = input.readSessionsRegistry ?? readRuntimeSessionsRegistry;

  let sessionName: string | undefined;
  let workspacePath: string | undefined;
  try {
    const sessions = await readSessions(input.sessionsPath, {
      allowMissing: true
    });
    const record = sessions[input.bubbleId];
    sessionName = record?.tmuxSessionName;
    const workspaceAuthority = resolveRuntimeSessionWorkspaceAuthority({
      runtimeSessionRecord: record
    });
    if (workspaceAuthority.status === "resolved") {
      workspacePath = workspaceAuthority.authority.workspacePath;
    }
  } catch {
    return {
      refreshed: false,
      reason: "registry_read_failed"
    };
  }

  if (sessionName === undefined || workspacePath === undefined) {
    return {
      refreshed: false,
      reason: "no_runtime_session"
    };
  }

  const runner = input.runner ?? runTmux;
  const reviewerCommand = buildAgentCommand({
    agentName: input.bubbleConfig.agents.reviewer,
    bubbleId: input.bubbleId,
    workspacePath,
    pairflowCommandProfile: input.bubbleConfig.pairflow_command_profile,
    ...(input.bubbleConfig.executor?.type === "ssh"
      ? {
          remoteWorkspaceAuthority: {
            workspaceRoot: workspacePath
          }
        }
      : {}),
    startupPrompt: input.reviewerStartupPrompt
  });

  try {
    await respawnTmuxPaneCommand({
      sessionName,
      paneIndex: getSharedTopologySlotPaneIndexForRole("reviewer"),
      cwd: workspacePath,
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
