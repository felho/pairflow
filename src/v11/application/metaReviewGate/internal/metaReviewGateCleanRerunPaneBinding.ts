import type { LoadedStateSnapshot } from "../../../ports/stateSnapshots.js";
import {
  appendDeactivateTelemetry,
  buildCleanRerunRuntimeDelivery,
  deactivateCleanRerunMetaReviewerPane
} from "./metaReviewGateCleanRerunDelivery.js";
import type {
  CleanRerunDeliveryCapableInput,
  MetaReviewPaneWarningResult,
  RouteCleanMetaReviewRerunInput
} from "./metaReviewGateCleanRerunContract.js";
import { failCleanRerunClosed } from "./metaReviewGateCleanRerunDispatch.js";
import { persistCleanRerunDeliveryObservation } from "./metaReviewGateCleanRerunObservation.js";
import type { MetaReviewGateResult } from "../../../shared/metaReviewGate/metaReviewGateResultContract.js";
import { DEFAULT_ROLE_MCP_POLICY_BY_ROLE } from "../../../../config/defaults.js";

function isMetaReviewGateResult(
  value: LoadedStateSnapshot | MetaReviewGateResult
): value is MetaReviewGateResult {
  return "route" in value;
}

export async function resolveCleanRerunPaneBinding(input: {
  routeInput: RouteCleanMetaReviewRerunInput & {
    finalizeInput: CleanRerunDeliveryCapableInput;
  };
  kickoffResult: MetaReviewGateResult;
  metaReviewRunningState: LoadedStateSnapshot;
}): Promise<MetaReviewPaneWarningResult | MetaReviewGateResult> {
  const finalizeInput = input.routeInput.finalizeInput;
  try {
    return await finalizeInput.resolvePaneWarning({
      setMetaReviewerPane: finalizeInput.setMetaReviewerPane,
      ...(finalizeInput.notifySubmissionRequest !== undefined
        ? { notifySubmissionRequest: finalizeInput.notifySubmissionRequest }
        : {}),
      ...(finalizeInput.runtime !== undefined
        ? { runtime: finalizeInput.runtime }
        : {}),
      sessionsPath: finalizeInput.resolved.bubblePaths.sessionsPath,
      bubbleId: finalizeInput.resolved.bubbleId,
      round: input.kickoffResult.state.round,
      now: finalizeInput.now,
      taskArtifactPath: finalizeInput.resolved.bubblePaths.taskArtifactPath,
      pairflowCommandProfile:
        finalizeInput.resolved.bubbleConfig.pairflow_command_profile ?? "external",
      metaReviewerAgent: finalizeInput.resolved.bubbleConfig.agents.meta_reviewer,
      metaReviewerMcpPolicy:
        finalizeInput.resolved.bubbleConfig.role_mcp?.meta_reviewer
        ?? DEFAULT_ROLE_MCP_POLICY_BY_ROLE.meta_reviewer
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const executionContext =
      input.kickoffResult.state.meta_review?.execution_context ?? null;
    if (executionContext !== null) {
      const observed = await persistCleanRerunDeliveryObservation({
        routeInput: input.routeInput,
        kickoffResult: input.kickoffResult,
        metaReviewRunningState: input.metaReviewRunningState,
        delivery: buildCleanRerunRuntimeDelivery({
          executionContext,
          finalizeInput,
          delivery: {
            status: "failed",
            reasonCode: "META_REVIEW_PANE_NOTIFICATION_ERROR",
            message: `meta-review pane notification failed: ${reason}`
          }
        })
      });
      if (isMetaReviewGateResult(observed)) {
        return observed;
      }
      const deactivateReason = await deactivateCleanRerunMetaReviewerPane(
        finalizeInput
      );
      return failCleanRerunClosed({
        routeInput: input.routeInput,
        fallbackReason: appendDeactivateTelemetry({
          fallbackReason:
            `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: pane_notification_error=${reason}`,
          deactivateReason
        }),
        loaded: observed
      });
    }
    const deactivateReason = await deactivateCleanRerunMetaReviewerPane(
      finalizeInput
    );
    return failCleanRerunClosed({
      routeInput: input.routeInput,
      fallbackReason: appendDeactivateTelemetry({
        fallbackReason:
          `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: pane_notification_error=${reason}`,
        deactivateReason
      }),
      loaded: input.metaReviewRunningState
    });
  }
}
