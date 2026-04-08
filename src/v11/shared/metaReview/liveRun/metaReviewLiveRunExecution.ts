import { isMetaReviewExecutionContextActiveState } from "../metaReviewExecutionContext.js";
import { MetaReviewError } from "../metaReviewError.js";
import { normalizeOptionalText } from "./metaReviewLiveRunReport.js";
import {
  assertRunPayloadInvariants,
  formatRunnerFailure,
  mapRecommendationToStatus
} from "./metaReviewLiveRunErrors.js";
import type {
  MetaReviewDepth,
  MetaReviewRunWarning
} from "./metaReviewLiveRunContract.js";
import type { ResolvedMetaReviewLiveRunPorts } from "./metaReviewLiveRunPorts.js";
import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../../types/bubble.js";

export interface ExecutedMetaReviewLiveRun {
  resolved: Awaited<ReturnType<ResolvedMetaReviewLiveRunPorts["resolveBubble"]>>;
  loadedState: LoadedStateSnapshot;
  runId: string;
  updatedAt: string;
  depth: string;
  recommendation: MetaReviewRecommendation;
  status: MetaReviewRunStatus;
  summary: string | null;
  reportJson: Record<string, unknown> | undefined;
  reworkTargetMessage: string | null;
  warnings: MetaReviewRunWarning[];
}

function assertMetaReviewRunningStateAllowed(
  loadedState: LoadedStateSnapshot,
  allowMetaReviewRunningState: boolean | undefined
): void {
  if (
    isMetaReviewExecutionContextActiveState(loadedState.state) &&
    allowMetaReviewRunningState !== true
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_STATE_INVALID",
      message:
        "meta-review run is disabled while the active submit channel is reserved for an in-flight meta-review authority window",
      context: {
        source: "meta_review_live_run_execution",
        bubbleId: loadedState.state.bubble_id,
        reason: "active_submit_channel_reserved"
      }
    });
  }
}

export async function executeMetaReviewLiveRun(input: {
  depth: MetaReviewDepth;
  resolved: Awaited<ReturnType<ResolvedMetaReviewLiveRunPorts["resolveBubble"]>>;
  ports: ResolvedMetaReviewLiveRunPorts;
  allowMetaReviewRunningState?: boolean;
}): Promise<ExecutedMetaReviewLiveRun> {
  const loadedState = await input.ports.readState(input.resolved.bubblePaths.statePath);
  assertMetaReviewRunningStateAllowed(
    loadedState,
    input.allowMetaReviewRunningState
  );

  const runId = input.ports.makeUuid();
  const updatedAt = input.ports.now.toISOString();
  const depth = input.depth;
  let recommendation: MetaReviewRecommendation;
  let status: MetaReviewRunStatus;
  let summary: string | null;
  let reportJson: Record<string, unknown> | undefined;
  let reworkTargetMessage: string | null;
  const warnings: MetaReviewRunWarning[] = [];

  try {
    const output = await input.ports.runLiveReview({
      bubbleId: input.resolved.bubbleId,
      repoPath: input.resolved.repoPath,
      worktreePath: input.resolved.bubblePaths.worktreePath,
      transcriptPath: input.resolved.bubblePaths.transcriptPath,
      reviewerAgent: input.resolved.bubbleConfig.agents.reviewer,
      depth,
      state: loadedState.state,
      runId,
      now: input.ports.now
    });

    recommendation = output.recommendation;
    status = mapRecommendationToStatus(recommendation);
    summary = normalizeOptionalText(output.summary);
    reworkTargetMessage = normalizeOptionalText(
      output.rework_target_message ?? undefined
    );
    reportJson = output.report_json;
  } catch (error) {
    const failure = formatRunnerFailure(error);
    recommendation = "inconclusive";
    status = "error";
    summary = failure.summary;
    reworkTargetMessage = null;
    warnings.push({
      reason_code: "META_REVIEW_RUNNER_ERROR",
      message: failure.warningMessage
    });
  }

  assertRunPayloadInvariants({
    recommendation,
    status,
    reworkTargetMessage
  });

  return {
    resolved: input.resolved,
    loadedState,
    runId,
    updatedAt,
    depth,
    recommendation,
    status,
    summary,
    reportJson,
    reworkTargetMessage,
    warnings
  };
}
