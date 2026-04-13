import type {
  RuntimeSessionRecord
} from "../../shared/ports/runtimeSessions.js";
import type {
  ResolveMetaReviewerPaneWarning
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";
import {
  resolveRuntimeSessionWorkspaceAuthority
} from "../../shared/runtimeSessionWorkspaceAuthority.js";
import { buildMetaReviewerStartupPrompt } from "../start/startCommandPrompts.js";

function resolveMetaReviewerWorkspaceAuthority(input: {
  bubbleId: string;
  runtimeSessionRecord: RuntimeSessionRecord;
}):
  | {
    status: "resolved";
    workspacePath: string;
  }
  | {
    status: "failed";
    message: string;
  } {
  const resolution = resolveRuntimeSessionWorkspaceAuthority({
    runtimeSessionRecord: input.runtimeSessionRecord
  });
  if (resolution.status === "resolved") {
    return {
      status: "resolved",
      workspacePath: resolution.authority.workspacePath
    };
  }

  return {
    status: "failed",
    message:
      resolution.reason === "legacy_clone_fallback_forbidden"
        ? `Bubble ${input.bubbleId} cannot bind meta-review pane because runtime session only retained a clone-mode worktree reference without canonical workspace authority.`
        : `Bubble ${input.bubbleId} cannot bind meta-review pane because runtime workspace authority is empty.`
  };
}

export const resolveMetaReviewerPaneWarning: ResolveMetaReviewerPaneWarning = async (
  input
) => {
  if (input.buildAgentCommand === undefined) {
    return {
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_RUNTIME_UNAVAILABLE",
        message: "meta-review gate pane binding is missing agent command builder."
      },
      shouldDeactivate: false
    };
  }
  if (input.respawnTmuxPaneCommand === undefined) {
    return {
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_RUNTIME_UNAVAILABLE",
        message: "meta-review gate pane binding is missing respawn capability."
      },
      shouldDeactivate: false
    };
  }

  let shouldDeactivate = false;
  const bindStart = await input.setMetaReviewerPane({
    sessionsPath: input.sessionsPath,
    bubbleId: input.bubbleId,
    active: true,
    now: input.now
  }).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      updated: false,
      reason: "no_runtime_session" as const,
      errorMessage: reason
    };
  });
  if (!bindStart.updated) {
    const bindReason = "errorMessage" in bindStart
      ? bindStart.errorMessage
      : bindStart.reason ?? "unknown";
    return {
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_UNAVAILABLE",
        message: `META_REVIEWER_PANE_UNAVAILABLE: ${bindReason}`
      },
      shouldDeactivate: false
    };
  }
  if (!("record" in bindStart) || bindStart.record === undefined) {
    return {
      delivery: {
        status: "confirmed",
        reasonCode: null,
        message: "meta-review submit request uses durable handoff only; no pane binding update required."
      },
      shouldDeactivate: false
    };
  }

  shouldDeactivate = true;
  const paneIndex = bindStart.record.metaReviewerPane?.paneIndex ?? 3;
  const targetPane = `${bindStart.record.tmuxSessionName}:0.${paneIndex}`;
  const workspaceAuthority = resolveMetaReviewerWorkspaceAuthority({
    bubbleId: input.bubbleId,
    runtimeSessionRecord: bindStart.record
  });
  if (workspaceAuthority.status !== "resolved") {
    return {
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_UNAVAILABLE",
        message: `META_REVIEWER_PANE_UNAVAILABLE: ${workspaceAuthority.message}`
      },
      shouldDeactivate
    };
  }
  const workspacePath = workspaceAuthority.workspacePath;
  const metaReviewerCommand = input.buildAgentCommand({
    agentName: "codex",
    bubbleId: input.bubbleId,
    workspacePath,
    pairflowCommandProfile: input.pairflowCommandProfile,
    startupPrompt: buildMetaReviewerStartupPrompt({
      bubbleId: input.bubbleId,
      repoPath: bindStart.record.repoPath,
      workspacePath,
      taskArtifactPath: input.taskArtifactPath,
      pairflowCommandProfile: input.pairflowCommandProfile
    })
  });
  try {
    await input.respawnTmuxPaneCommand({
      sessionName: bindStart.record.tmuxSessionName,
      paneIndex,
      cwd: workspacePath,
      command: metaReviewerCommand,
      runner: input.runTmuxRunner
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_RESPAWN_FAILED",
        message: `META_REVIEWER_PANE_RESPAWN_FAILED: ${reason}`
      },
      shouldDeactivate
    };
  }
  const delivery = await input.notifySubmissionRequest(
    {
      bubbleId: input.bubbleId,
      round: input.round,
      targetPane
    },
    {
      runTmux: input.runTmuxRunner
    }
  ).catch((error: unknown) => ({
    status: "failed" as const,
    reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
    message: error instanceof Error ? error.message : String(error)
  }));
  return { delivery, shouldDeactivate };
};
