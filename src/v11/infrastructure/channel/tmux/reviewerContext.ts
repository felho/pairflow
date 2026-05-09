import { readRuntimeSessionsRegistry } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  getSharedTopologySlotPaneIndexForRole
} from "../../../shared/topology/topologySlotPaneProjection.js";
import {
  respawnTmuxPaneCommand,
  runTmux,
  type TmuxRunner
} from "./tmuxManager.js";
import { submitTmuxPaneInput } from "./tmuxInput.js";
import { buildAgentCommand } from "../../../shared/command/agentCommand.js";
import { resolveCodexMcpDisableArgs } from "../../../shared/command/agentCommand.js";
import { resolveRuntimeSessionWorkspaceAuthority } from "../../../shared/runtimeSessionWorkspaceAuthority.js";
import { DEFAULT_ROLE_MCP_POLICY_BY_ROLE } from "../../../../config/defaults.js";
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
  startupSubmitDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function shouldSubmitStartupPrompt(
  agentName: string,
  startupPrompt: string | undefined
): boolean {
  return agentName === "codex" && (startupPrompt?.trim().length ?? 0) > 0;
}

async function maybeSubmitReviewerStartupPrompt(input: {
  agentName: string;
  startupPrompt?: string | undefined;
  runner: TmuxRunner;
  sessionName: string;
  paneIndex: number;
  startupSubmitDelayMs?: number;
}): Promise<void> {
  if (!shouldSubmitStartupPrompt(input.agentName, input.startupPrompt)) {
    return;
  }

  await sleep(input.startupSubmitDelayMs ?? 1500);
  await submitTmuxPaneInput(
    input.runner,
    `${input.sessionName}:0.${input.paneIndex}`
  );
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
  const reviewerPaneIndex = getSharedTopologySlotPaneIndexForRole("reviewer");
  const roleMcpPolicy =
    input.bubbleConfig.role_mcp?.reviewer
    ?? DEFAULT_ROLE_MCP_POLICY_BY_ROLE.reviewer;
  const codexMcpDisableArgs =
    input.bubbleConfig.agents.reviewer === "codex" && roleMcpPolicy === "disabled"
      ? await resolveCodexMcpDisableArgs({
        roleName: "reviewer",
        bubbleId: input.bubbleId
      })
      : undefined;
  const reviewerCommand = buildAgentCommand({
    agentName: input.bubbleConfig.agents.reviewer,
    roleName: "reviewer",
    roleMcpPolicy,
    ...(input.bubbleConfig.agents.reviewer_model !== undefined
      ? { model: input.bubbleConfig.agents.reviewer_model }
      : {}),
    bubbleId: input.bubbleId,
    workspacePath,
    pairflowCommandProfile: input.bubbleConfig.pairflow_command_profile,
    ...(codexMcpDisableArgs !== undefined ? { codexMcpDisableArgs } : {}),
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
      paneIndex: reviewerPaneIndex,
      cwd: workspacePath,
      command: reviewerCommand,
      runner
    });
    await maybeSubmitReviewerStartupPrompt({
      agentName: input.bubbleConfig.agents.reviewer,
      ...(input.reviewerStartupPrompt !== undefined
        ? { startupPrompt: input.reviewerStartupPrompt }
        : {}),
      runner,
      sessionName,
      paneIndex: reviewerPaneIndex,
      ...(input.startupSubmitDelayMs !== undefined
        ? { startupSubmitDelayMs: input.startupSubmitDelayMs }
        : {})
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
