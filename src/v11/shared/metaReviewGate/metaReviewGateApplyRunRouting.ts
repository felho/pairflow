import type { LoadedStateSnapshot } from "../ports/stateSnapshots.js";

import { appendMetaReviewKickoffEnvelope, persistMetaReviewRunFailedRoute } from "./metaReviewGateApplyHelpers.js";
import type { MetaReviewGateResult } from "./metaReviewGateTypes.js";
import type { ApplyMetaReviewGateExecutionContext } from "./metaReviewGateApplyContext.js";

interface RouteMetaReviewKickoffOrRunFailedInput {
  context: ApplyMetaReviewGateExecutionContext;
  convergenceSummary: string;
  metaReviewRunningState: LoadedStateSnapshot;
  shouldDeactivateMetaReviewerPane: boolean;
}

export async function routeMetaReviewKickoffOrRunFailed(
  input: RouteMetaReviewKickoffOrRunFailedInput
): Promise<MetaReviewGateResult> {
  try {
    const appended = await appendMetaReviewKickoffEnvelope({
      appendEnvelope: input.context.appendEnvelope,
      transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
      inboxPath: input.context.resolved.bubblePaths.inboxPath,
      lockPath: input.context.lockPath,
      now: input.context.now,
      bubbleId: input.context.resolved.bubbleId,
      round: input.metaReviewRunningState.state.round,
      handoffId:
        input.metaReviewRunningState.state.meta_review?.execution_context?.handoff_id ??
        `meta_review:${input.context.resolved.bubbleId}:round:${input.metaReviewRunningState.state.round}`,
      metaReviewerAgent: input.context.resolved.bubbleConfig.agents.meta_reviewer,
      refs: input.context.refs
    });

    return {
      bubbleId: input.context.resolved.bubbleId,
      route: "meta_review_running",
      gateSequence: appended.sequence,
      gateEnvelope: appended.envelope,
      state: input.metaReviewRunningState.state
    };
  } catch (error) {
    const runFailureReason = error instanceof Error ? error.message : String(error);
    try {
      return await persistMetaReviewRunFailedRoute({
        appendEnvelope: input.context.appendEnvelope,
        writeState: input.context.writeState,
        statePath: input.context.resolved.bubblePaths.statePath,
        transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
        inboxPath: input.context.resolved.bubblePaths.inboxPath,
        lockPath: input.context.lockPath,
        now: input.context.now,
        nowIso: input.context.nowIso,
        bubbleId: input.context.resolved.bubbleId,
        metaReviewerAgent: input.context.resolved.bubbleConfig.agents.meta_reviewer,
        convergenceSummary: input.convergenceSummary,
        fallbackReason: `META_REVIEW_GATE_RUN_FAILED: ${runFailureReason}`,
        refs: input.context.refs,
        loaded: input.metaReviewRunningState
      });
    } finally {
      if (input.shouldDeactivateMetaReviewerPane) {
        await input.context.deactivateMetaReviewerPane();
      }
    }
  }
}
