import { normalizeMetaReviewSnapshot } from "../../domain/metaReviewGate/snapshotState.js";
import { META_REVIEW_APPROVE_THRESHOLD_BACKSTOP } from "../../domain/metaReviewGate/approveThresholdBackstopPolicy.js";
import {
  metaReviewApproveClaimsOpenFindings
} from "../../domain/metaReviewGate/approveSubmitThresholdPolicy.js";
import type { MetaReviewGateResult } from "../../shared/metaReviewGate/metaReviewGateResultContract.js";
import { resolveMetaReviewGateThresholdAuthority } from "./metaReviewGateThresholdAuthorityApi.js";
import { dispatchAutoRework } from "./internal/metaReviewGateAutoRework.js";
import {
  maybeRunStickyApproveValidation,
  routeApproveMetaReviewResult
} from "./internal/metaReviewGateCurrentRunApproveRouting.js";
import { resolveCurrentRunParity } from "./internal/metaReviewGateCurrentRunParity.js";
import {
  persistDispatchFailedHumanRoute,
  persistResolvedHumanRoute,
  persistRunFailedHumanRoute
} from "./internal/metaReviewGateCurrentRunRoutePersistence.js";
import {
  resolveApproveThresholdBackstop
} from "./internal/metaReviewGateCurrentRunThresholdPolicies.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";

export type {
  MetaReviewApproveValidationCommandRunInput
} from "../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";

export type {
  FinalizeCurrentRunMetaReviewGateInput
} from "../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";

export async function finalizeCurrentRunMetaReviewGate(
  input: FinalizeCurrentRunMetaReviewGateInput
): Promise<MetaReviewGateResult> {
  const snapshot = normalizeMetaReviewSnapshot(input.loaded.state.meta_review);

  if (input.runResult.status === "error") {
    return persistRunFailedHumanRoute(input);
  }

  const parity = await resolveCurrentRunParity({
    resolved: input.resolved,
    snapshot,
    runResult: input.runResult,
    readFileFn: input.readFileFn
  });

  if (!parity.ok) {
    return persistDispatchFailedHumanRoute({
      finalizeInput: input,
      loaded: input.loaded,
      expectedState: "RUNNING",
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: parity.parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${parity.reason}`,
      rollbackStateOnAppendFailure: input.loaded.state
    });
  }

  const approveThresholdAuthority =
    parity.runResultForRouting.recommendation === "approve" &&
    metaReviewApproveClaimsOpenFindings(parity.runResultForRouting.report_json ?? {})
      ? await resolveMetaReviewGateThresholdAuthority({
          runResult: parity.runResultForRouting,
          bubbleDir: input.resolved.bubblePaths.bubbleDir,
          artifactsDir: input.resolved.bubblePaths.artifactsDir,
          readFileFn: input.readFileFn
        })
      : undefined;
  const approveBackstop = await resolveApproveThresholdBackstop({
    finalizeInput: input,
    runResultForRouting: parity.runResultForRouting,
    parityMetadata: parity.parityMetadata,
    ...(approveThresholdAuthority !== undefined
      ? { thresholdAuthority: approveThresholdAuthority }
      : {})
  });
  if (approveBackstop.blocked) {
    return persistDispatchFailedHumanRoute({
      finalizeInput: input,
      loaded: input.loaded,
      expectedState: "RUNNING",
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: approveBackstop.parityMetadata,
      fallbackReason: approveBackstop.fallbackReason,
      gateReasonCode: META_REVIEW_APPROVE_THRESHOLD_BACKSTOP,
      rollbackStateOnAppendFailure: input.loaded.state
    });
  }

  if (snapshot.sticky_human_gate) {
    const stickyValidationFailure = await maybeRunStickyApproveValidation({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: approveBackstop.parityMetadata
    });
    if (stickyValidationFailure !== null) {
      return stickyValidationFailure;
    }

    return persistResolvedHumanRoute({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      budgetAvailable: parity.budgetAvailable,
      parityMetadata: approveBackstop.parityMetadata,
      forceStickyHumanGateBypass: true,
      consecutiveCleanRuns: 0
    });
  }

  if (
    parity.runResultForRouting.recommendation === "rework" &&
    parity.budgetAvailable
  ) {
    return dispatchAutoRework({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: parity.parityMetadata,
      findingsForPayload: parity.findingsForPayload,
      persistDispatchFailedHumanRoute: (dispatchInput) =>
        persistDispatchFailedHumanRoute({
          finalizeInput: input,
          ...dispatchInput
        })
    });
  }

  if (parity.runResultForRouting.recommendation === "approve") {
    return routeApproveMetaReviewResult({
      finalizeInput: input,
      snapshot,
      runResultForRouting: parity.runResultForRouting,
      budgetAvailable: parity.budgetAvailable,
      parityMetadata: approveBackstop.parityMetadata,
      ...(approveBackstop.thresholdAuthority !== undefined
        ? { thresholdAuthority: approveBackstop.thresholdAuthority }
        : {})
    });
  }

  // Rework + available budget is fully handled above, so this fallback can only
  // persist approve / inconclusive / budget-exhausted outcomes.
  return persistResolvedHumanRoute({
    finalizeInput: input,
    runResultForRouting: parity.runResultForRouting,
    budgetAvailable: parity.budgetAvailable,
    parityMetadata: parity.parityMetadata,
    forceStickyHumanGateBypass: false
  });
}
