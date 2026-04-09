import { metaReviewGateRuntimeDependencyDefaults } from "./metaReviewGateRuntimeDependencyDefaults.js";
import type {
  ResolveMetaReviewerPaneWarning
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";

export const resolveMetaReviewerPaneWarning: ResolveMetaReviewerPaneWarning = async (
  input
) => {
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
  const metaReviewerCommand =
    metaReviewGateRuntimeDependencyDefaults.buildAgentCommand({
    agentName: "codex",
    bubbleId: input.bubbleId,
    worktreePath: bindStart.record.worktreePath,
    pairflowCommandProfile: input.pairflowCommandProfile,
    startupPrompt:
      metaReviewGateRuntimeDependencyDefaults.buildMetaReviewerStartupPrompt({
        bubbleId: input.bubbleId,
        repoPath: bindStart.record.repoPath,
        worktreePath: bindStart.record.worktreePath,
        taskArtifactPath: input.taskArtifactPath,
        pairflowCommandProfile: input.pairflowCommandProfile
      })
  });
  try {
    await metaReviewGateRuntimeDependencyDefaults.respawnTmuxPaneCommand({
      sessionName: bindStart.record.tmuxSessionName,
      paneIndex,
      cwd: bindStart.record.worktreePath,
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
