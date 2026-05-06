import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { Finding } from "../../../types/findings.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import {
  normalizeMetaReviewSnapshot,
} from "./internal/metaReviewGateShared.js";
import {
  type MetaReviewGateResult
} from "./metaReviewGateTypes.js";
import { dispatchAutoRework } from "./internal/metaReviewGateAutoRework.js";
import { validateStructuredMetaReviewPositiveClaim } from "./internal/metaReviewGateFindingsValidation.js";
import type { MetaReviewGateArtifactReadFn } from "./metaReviewGateFindingsMetadata.js";
import {
  type MetaReviewGateThresholdAuthorityResolution,
  resolveMetaReviewGateThresholdAuthority
} from "./metaReviewGateThresholdAuthority.js";
import { metaReviewApproveClaimsOpenFindings } from "../metaReview/metaReviewCommandSubmitValidation.js";
import { normalizeBubbleReviewPolicy } from "../reviewPolicy/reviewPolicyRuntime.js";
import {
  persistDispatchFailedHumanRoute,
  persistResolvedHumanRoute,
  persistRunFailedHumanRoute
} from "./internal/metaReviewGateCurrentRunRoutePersistence.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "./metaReviewGateCurrentRunTypes.js";
import {
  buildApproveValidationReworkMessage,
  isApproveValidationCommandFailure
} from "../../domain/metaReviewGate/approveValidationRework.js";
import {
  META_REVIEW_APPROVE_THRESHOLD_BACKSTOP,
  resolveApproveThresholdBackstopPolicy
} from "../../domain/metaReviewGate/approveThresholdBackstopPolicy.js";
import { resolveThresholdCleanApprovalPolicy } from "../../domain/metaReviewGate/cleanApprovalPolicy.js";
import { mergeRunResultWithParityResolution } from "../../domain/metaReviewGate/runResultParity.js";
import { routeCleanMetaReviewRerun } from "./internal/metaReviewGateCurrentRunCleanRerun.js";
import {
  META_REVIEW_APPROVE_VALIDATION_FAILED,
  runMetaReviewApproveValidationGate
} from "./internal/metaReviewApproveValidationGate.js";

function callMetaReviewGateArtifactReadFn(
  readFileFn: MetaReviewGateArtifactReadFn,
  artifactPath: string,
  encoding: "utf8"
): Promise<string> {
  return readFileFn(artifactPath, encoding);
}

async function resolveCurrentRunParity(input: {
  resolved: FinalizeCurrentRunMetaReviewGateInput["resolved"];
  snapshot: ReturnType<typeof normalizeMetaReviewSnapshot>;
  runResult: MetaReviewResult;
  readFileFn: MetaReviewGateArtifactReadFn;
}): Promise<
  | {
      ok: true;
      budgetAvailable: boolean;
      parityMetadata: FindingsParityMetadata | null;
      findingsForPayload: Finding[] | undefined;
      runResultForRouting: MetaReviewResult;
    }
  | {
      ok: false;
      reason: string;
      parityMetadata: FindingsParityMetadata | null;
      runResultForRouting: MetaReviewResult;
    }
> {
  const readFileFn = (artifactPath: string, encoding: "utf8") =>
    callMetaReviewGateArtifactReadFn(input.readFileFn, artifactPath, encoding);
  const parity = await validateStructuredMetaReviewPositiveClaim({
    runResult: input.runResult,
    ...(input.runResult.report_json !== undefined
      ? { reportJson: input.runResult.report_json }
      : {}),
    bubbleDir: input.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.resolved.bubblePaths.artifactsDir,
    readFileFn
  });
  if (!parity.ok) {
    return {
      ok: false,
      reason: parity.reason,
      parityMetadata: parity.metadata,
      runResultForRouting: mergeRunResultWithParityResolution({
        runResult: input.runResult,
        metadata: parity.metadata,
        diagnostics: []
      })
    };
  }
  return {
    ok: true,
    budgetAvailable: input.snapshot.auto_rework_count < input.snapshot.auto_rework_limit,
    parityMetadata: parity.metadata,
    findingsForPayload: parity.findingsForPayload,
    runResultForRouting: mergeRunResultWithParityResolution({
      runResult: input.runResult,
      metadata: parity.metadata,
      diagnostics: parity.diagnostics
    })
  };
}

async function resolveApproveThresholdBackstop(input: {
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

async function resolveThresholdCleanApproval(input: {
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

async function routeApproveMetaReviewResult(input: {
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

async function maybeRunStickyApproveValidation(input: {
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
