import type { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import {
  respawnTmuxPaneCommand
} from "../../../core/runtime/tmuxManager.js";
import type { TmuxRunner } from "../../../core/runtime/tmuxManager.js";
import { buildAgentCommand } from "../../../core/runtime/agentCommand.js";
import type { PairflowCommandProfile } from "../../../types/bubble.js";
import { buildMetaReviewerStartupPrompt } from "../../application/start/startCommandPrompts.js";
import type {
  MetaReviewRuntimeDeliveryObservation,
  NotifyMetaReviewerSubmissionRequest
} from "./metaReviewGateTypes.js";

export async function resolveMetaReviewerPaneWarning(input: {
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  notifySubmissionRequest: NotifyMetaReviewerSubmissionRequest;
  runTmuxRunner: TmuxRunner;
  sessionsPath: string;
  bubbleId: string;
  round: number;
  now: Date;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
}): Promise<{
  delivery: MetaReviewRuntimeDeliveryObservation;
  shouldDeactivate: boolean;
}> {
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
  const metaReviewerCommand = buildAgentCommand({
    agentName: "codex",
    bubbleId: input.bubbleId,
    worktreePath: bindStart.record.worktreePath,
    pairflowCommandProfile: input.pairflowCommandProfile,
    startupPrompt: buildMetaReviewerStartupPrompt({
      bubbleId: input.bubbleId,
      repoPath: bindStart.record.repoPath,
      worktreePath: bindStart.record.worktreePath,
      taskArtifactPath: input.taskArtifactPath,
      pairflowCommandProfile: input.pairflowCommandProfile
    })
  });
  try {
    await respawnTmuxPaneCommand({
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
}
