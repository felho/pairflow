import { handleRecoveryAutoReworkRoute } from "./metaReviewGateRecoveryAutoRework.js";
import {
  assertRecoveredRunResolutionConsistency,
  initializeRecoverMetaReviewExecutionContext,
  persistRecoveryDispatchFailedHumanRoute,
  persistRecoveryResolvedHumanRoute,
  persistRecoveryRunFailedHumanRoute,
  resolveRecoveredRunResolution,
  resolveRecoveryParityRouting
} from "./metaReviewGateRecoveryContext.js";
import { metaReviewGatePaneDeactivationUnavoidableReasonCode } from "./metaReviewGateShared.js";
import { toMetaReviewGateError } from "./metaReviewGateErrorConversion.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type RecoverMetaReviewGateFromSnapshotDependencies,
  type RecoverMetaReviewGateFromSnapshotInput
} from "./metaReviewGateTypes.js";

export async function recoverMetaReviewGateFromSnapshot(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): Promise<MetaReviewGateResult> {
  const context = await initializeRecoverMetaReviewExecutionContext(
    input,
    dependencies
  );
  try {
    const runResolution = await resolveRecoveredRunResolution({
      context,
      ...(input.runResult !== undefined ? { requestedRunResult: input.runResult } : {}),
      ...(input.summary !== undefined ? { requestedSummary: input.summary } : {})
    });

    assertRecoveredRunResolutionConsistency({
      ...(input.runResult !== undefined ? { requestedRunResult: input.runResult } : {}),
      snapshotHasCanonicalSubmitInActiveWindow:
        runResolution.snapshotHasCanonicalSubmitInActiveWindow,
      snapshot: runResolution.snapshot,
      runResult: runResolution.runResult
    });

    if (runResolution.runResult.status === "error") {
      return context.finishWithPaneDeactivation(
        await persistRecoveryRunFailedHumanRoute({
          context,
          summary: runResolution.summary,
          runResult: runResolution.runResult
        })
      );
    }

    const parityResolution = await resolveRecoveryParityRouting({
      context,
      snapshot: runResolution.snapshot,
      runResult: runResolution.runResult
    });
    if (!parityResolution.ok) {
      return context.finishWithPaneDeactivation(
        await persistRecoveryDispatchFailedHumanRoute({
          context,
          summary: runResolution.summary,
          fallbackReason:
            `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${parityResolution.reason}`,
          loaded: context.loaded,
          expectedState: "META_REVIEW_RUNNING",
          runResultForRouting: parityResolution.runResultForRouting,
          parityMetadata: parityResolution.parityMetadata
        })
      );
    }

    if (
      runResolution.runResult.recommendation === "rework" &&
      parityResolution.budgetAvailable
    ) {
      return context.finishWithPaneDeactivation(
        await handleRecoveryAutoReworkRoute({
          context,
          snapshot: runResolution.snapshot,
          summary: runResolution.summary,
          runResultForRouting: parityResolution.runResultForRouting,
          parityMetadata: parityResolution.parityMetadata
        })
      );
    }

    return context.finishWithPaneDeactivation(
      await persistRecoveryResolvedHumanRoute({
        context,
        summary: runResolution.summary,
        runResultForRouting: parityResolution.runResultForRouting,
        recommendation: runResolution.runResult.recommendation,
        budgetAvailable: parityResolution.budgetAvailable,
        parityMetadata: parityResolution.parityMetadata
      })
    );
  } catch (error) {
    const deactivationError = await context.deactivateMetaReviewerPane();
    if (deactivationError !== null) {
      const root = toMetaReviewGateError(error);
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        `META_REVIEW_GATE_TRANSITION_INVALID: ${metaReviewGatePaneDeactivationUnavoidableReasonCode}: recovery failed and pane deactivation could not be confirmed (deactivation_error=${deactivationError}). Root error: ${root.message}`,
        {
          ...root.diagnostics,
          stageReasonCode: metaReviewGatePaneDeactivationUnavoidableReasonCode
        }
      );
    }
    throw error;
  }
}
