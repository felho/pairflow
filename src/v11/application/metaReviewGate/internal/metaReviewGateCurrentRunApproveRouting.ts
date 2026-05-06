import type { MetaReviewResult } from "../../../shared/metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../../types/protocol.js";
import type { normalizeMetaReviewSnapshot } from "../../../domain/metaReviewGate/snapshotState.js";
import {
  buildApproveValidationReworkMessage,
  isApproveValidationCommandFailure
} from "../../../domain/metaReviewGate/approveValidationRework.js";
import { normalizeBubbleReviewPolicy } from "../../../shared/reviewPolicy/reviewPolicyRuntime.js";
import { dispatchAutoRework } from "./metaReviewGateAutoRework.js";
import { routeCleanMetaReviewRerun } from "./metaReviewGateCurrentRunCleanRerun.js";
import {
  persistDispatchFailedHumanRoute,
  persistResolvedHumanRoute
} from "./metaReviewGateCurrentRunRoutePersistence.js";
import { resolveThresholdCleanApproval } from "./metaReviewGateCurrentRunThresholdPolicies.js";
import type { MetaReviewGateThresholdAuthorityResolution } from "../metaReviewGateThresholdAuthorityApi.js";
import {
  META_REVIEW_APPROVE_VALIDATION_FAILED,
  runMetaReviewApproveValidationGate
} from "./metaReviewApproveValidationGate.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "../../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";
import type { MetaReviewGateResult } from "../../../shared/metaReviewGate/metaReviewGateResultContract.js";

export async function routeApproveMetaReviewResult(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  snapshot: ReturnType<typeof normalizeMetaReviewSnapshot>;
  runResultForRouting: MetaReviewResult;
  budgetAvailable: boolean;
  parityMetadata: FindingsParityMetadata | null;
  thresholdAuthority?: MetaReviewGateThresholdAuthorityResolution;
}): Promise<MetaReviewGateResult> {
  const cleanApproval = await resolveThresholdCleanApproval({
    finalizeInput: input.finalizeInput,
    runResultForRouting: input.runResultForRouting,
    parityMetadata: input.parityMetadata,
    ...(input.thresholdAuthority !== undefined
      ? { thresholdAuthority: input.thresholdAuthority }
      : {})
  });
  if (!cleanApproval.clean) {
    return persistDispatchFailedHumanRoute({
      finalizeInput: input.finalizeInput,
      loaded: input.finalizeInput.loaded,
      expectedState: "RUNNING",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: cleanApproval.parityMetadata,
      fallbackReason: cleanApproval.fallbackReason,
      rollbackStateOnAppendFailure: input.finalizeInput.loaded.state
    });
  }

  const normalizedReviewPolicy = normalizeBubbleReviewPolicy(
    input.finalizeInput.resolved.bubbleConfig
  );
  const updatedStreak = (input.snapshot.consecutive_clean_runs ?? 0) + 1;
  if (
    updatedStreak <
    normalizedReviewPolicy.meta_review_consecutive_clean_runs_required
  ) {
    return routeCleanMetaReviewRerun({
      finalizeInput: input.finalizeInput,
      runResultForRouting: input.runResultForRouting,
      parityMetadata: cleanApproval.parityMetadata,
      updatedStreak
    });
  }

  const approveValidation = await runMetaReviewApproveValidationGate({
    finalizeInput: input.finalizeInput
  });
  if (!approveValidation.ok) {
    if (
      input.budgetAvailable &&
      isApproveValidationCommandFailure(approveValidation.fallbackReason)
    ) {
      return dispatchAutoRework({
        finalizeInput: input.finalizeInput,
        runResultForRouting: input.runResultForRouting,
        parityMetadata: cleanApproval.parityMetadata,
        findingsForPayload: undefined,
        reworkTargetMessage: buildApproveValidationReworkMessage(
          approveValidation.fallbackReason
        ),
        persistDispatchFailedHumanRoute: (dispatchInput) =>
          persistDispatchFailedHumanRoute({
            finalizeInput: input.finalizeInput,
            ...dispatchInput
          })
      });
    }

    return persistDispatchFailedHumanRoute({
      finalizeInput: input.finalizeInput,
      loaded: input.finalizeInput.loaded,
      expectedState: "RUNNING",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: cleanApproval.parityMetadata,
      fallbackReason: approveValidation.fallbackReason,
      gateReasonCode: META_REVIEW_APPROVE_VALIDATION_FAILED,
      targetState: "RUNNING",
      rollbackStateOnAppendFailure: input.finalizeInput.loaded.state
    });
  }

  return persistResolvedHumanRoute({
    finalizeInput: input.finalizeInput,
    runResultForRouting: input.runResultForRouting,
    budgetAvailable: input.budgetAvailable,
    parityMetadata: cleanApproval.parityMetadata,
    forceStickyHumanGateBypass: false,
    consecutiveCleanRuns: updatedStreak
  });
}

export async function maybeRunStickyApproveValidation(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
}): Promise<MetaReviewGateResult | null> {
  // Sticky human-gate bypass preserves prior human routing for non-approve results;
  // approve results still need the configured final validation gate.
  if (input.runResultForRouting.recommendation !== "approve") {
    return null;
  }

  const approveValidation = await runMetaReviewApproveValidationGate({
    finalizeInput: input.finalizeInput
  });
  if (approveValidation.ok) {
    return null;
  }

  return persistDispatchFailedHumanRoute({
    finalizeInput: input.finalizeInput,
    loaded: input.finalizeInput.loaded,
    expectedState: "RUNNING",
    runResultForRouting: input.runResultForRouting,
    parityMetadata: input.parityMetadata,
    fallbackReason: approveValidation.fallbackReason,
    gateReasonCode: META_REVIEW_APPROVE_VALIDATION_FAILED,
    targetState: "RUNNING",
    rollbackStateOnAppendFailure: input.finalizeInput.loaded.state
  });
}
