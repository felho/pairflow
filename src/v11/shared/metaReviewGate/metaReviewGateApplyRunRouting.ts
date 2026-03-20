import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";

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
