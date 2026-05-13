import type { MetaReviewResult } from "../../../../shared/metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../../shared/metaReviewGate/findingsParityMetadataContract.js";
import { normalizeBubbleReviewPolicy } from "../../../../shared/reviewPolicy/reviewPolicyRuntime.js";
import {
  META_REVIEW_APPROVE_THRESHOLD_BACKSTOP,
  resolveApproveThresholdBackstopPolicy
} from "../../../../domain/metaReviewGate/approveThresholdBackstopPolicy.js";
import {
  metaReviewApproveClaimsOpenFindings
} from "../../../../domain/metaReviewGate/approveSubmitThresholdPolicy.js";
import { resolveThresholdCleanApprovalPolicy } from "../../../../domain/metaReviewGate/cleanApprovalPolicy.js";
import {
  type MetaReviewGateThresholdAuthorityResolution,
  resolveMetaReviewGateThresholdAuthority
} from "../../metaReviewGateThresholdAuthorityApi.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "../../../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";

export async function resolveApproveThresholdBackstop(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  thresholdAuthority?: MetaReviewGateThresholdAuthorityResolution;
}): Promise<
  | {
      blocked: false;
      parityMetadata: FindingsParityMetadata | null;
      thresholdAuthority?: MetaReviewGateThresholdAuthorityResolution;
    }
  | {
      blocked: true;
      parityMetadata: FindingsParityMetadata | null;
      fallbackReason: string;
    }
> {
  const normalizedReviewPolicy = normalizeBubbleReviewPolicy(
    input.finalizeInput.resolved.bubbleConfig
  );
  const initialPolicy = resolveApproveThresholdBackstopPolicy({
    recommendation: input.runResultForRouting.recommendation,
    claimsOpenFindings: metaReviewApproveClaimsOpenFindings(
      input.runResultForRouting.report_json ?? {}
    ),
    parityMetadata: input.parityMetadata,
    configuredMinSeverity:
      normalizedReviewPolicy.meta_review_auto_rework_min_severity,
    ...(input.thresholdAuthority !== undefined
      ? { thresholdAuthority: input.thresholdAuthority }
      : {})
  });
  if (initialPolicy.blocked) {
    return initialPolicy;
  }
  if (!initialPolicy.thresholdRequired) {
    return {
      blocked: false,
      parityMetadata: initialPolicy.parityMetadata,
      ...(input.thresholdAuthority !== undefined
        ? { thresholdAuthority: input.thresholdAuthority }
        : {})
    };
  }

  const thresholdAuthority =
    input.thresholdAuthority
    ?? await resolveMetaReviewGateThresholdAuthority({
      runResult: input.runResultForRouting,
      bubbleDir: input.finalizeInput.resolved.bubblePaths.bubbleDir,
      artifactsDir: input.finalizeInput.resolved.bubblePaths.artifactsDir,
      readFileFn: input.finalizeInput.readFileFn
    });
  const policy = resolveApproveThresholdBackstopPolicy({
    recommendation: input.runResultForRouting.recommendation,
    claimsOpenFindings: true,
    parityMetadata: input.parityMetadata,
    configuredMinSeverity:
      normalizedReviewPolicy.meta_review_auto_rework_min_severity,
    thresholdAuthority
  });
  if (!policy.blocked && policy.thresholdRequired) {
    return {
      blocked: true,
      parityMetadata: policy.parityMetadata,
      fallbackReason:
        `${META_REVIEW_APPROVE_THRESHOLD_BACKSTOP}: invalid open-findings approve cannot route to human_gate_approve (thresholdStatus=missing).`
    };
  }
  if (policy.blocked) {
    return policy;
  }
  return {
    blocked: false,
    parityMetadata: policy.parityMetadata,
    thresholdAuthority
  };
}

export async function resolveThresholdCleanApproval(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  thresholdAuthority?: MetaReviewGateThresholdAuthorityResolution;
}): Promise<
  | { clean: true; parityMetadata: FindingsParityMetadata | null }
  | {
      clean: false;
      parityMetadata: FindingsParityMetadata | null;
      fallbackReason: string;
    }
> {
  const normalizedReviewPolicy = normalizeBubbleReviewPolicy(
    input.finalizeInput.resolved.bubbleConfig
  );
  const initialPolicy = resolveThresholdCleanApprovalPolicy({
    recommendation: input.runResultForRouting.recommendation,
    parityMetadata: input.parityMetadata,
    configuredMinSeverity:
      normalizedReviewPolicy.meta_review_auto_rework_min_severity,
    ...(input.thresholdAuthority !== undefined
      ? { thresholdAuthority: input.thresholdAuthority }
      : {})
  });
  if (initialPolicy.clean || !initialPolicy.thresholdRequired) {
    return initialPolicy;
  }

  const thresholdAuthority =
    input.thresholdAuthority
    ?? await resolveMetaReviewGateThresholdAuthority({
      runResult: input.runResultForRouting,
      bubbleDir: input.finalizeInput.resolved.bubblePaths.bubbleDir,
      artifactsDir: input.finalizeInput.resolved.bubblePaths.artifactsDir,
      readFileFn: input.finalizeInput.readFileFn
    });
  const policy = resolveThresholdCleanApprovalPolicy({
    recommendation: input.runResultForRouting.recommendation,
    parityMetadata: input.parityMetadata,
    configuredMinSeverity:
      normalizedReviewPolicy.meta_review_auto_rework_min_severity,
    thresholdAuthority
  });
  if (!policy.clean && policy.thresholdRequired) {
    return {
      clean: false,
      parityMetadata: policy.parityMetadata,
      fallbackReason:
        "META_REVIEW_GATE_CLEAN_RUN_THRESHOLD_UNRESOLVED: thresholdStatus=missing."
    };
  }
  return policy;
}
