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
  metaReviewGateThresholdIsMet,
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
import { mergeRunResultWithParityResolution } from "./internal/metaReviewGateRunResultParity.js";
import { routeCleanMetaReviewRerun } from "./internal/metaReviewGateCurrentRunCleanRerun.js";
import {
  META_REVIEW_APPROVE_VALIDATION_FAILED,
  runMetaReviewApproveValidationGate
} from "./internal/metaReviewApproveValidationGate.js";

export const META_REVIEW_APPROVE_THRESHOLD_BACKSTOP =
  "META_REVIEW_APPROVE_THRESHOLD_BACKSTOP" as const;

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
  if (
    input.runResultForRouting.recommendation !== "approve" ||
    !metaReviewApproveClaimsOpenFindings(
      input.runResultForRouting.report_json ?? {}
    )
  ) {
    return {
      blocked: false,
      parityMetadata: input.parityMetadata
    };
  }

  const normalizedReviewPolicy = normalizeBubbleReviewPolicy(
    input.finalizeInput.resolved.bubbleConfig
  );
  const thresholdAuthority =
    input.thresholdAuthority
    ?? await resolveMetaReviewGateThresholdAuthority({
      runResult: input.runResultForRouting,
      bubbleDir: input.finalizeInput.resolved.bubblePaths.bubbleDir,
      artifactsDir: input.finalizeInput.resolved.bubblePaths.artifactsDir,
      readFileFn: input.finalizeInput.readFileFn
    });
  const parityMetadata =
    thresholdAuthority.parityMetadata ?? input.parityMetadata;

  if (
    thresholdAuthority.status !== "resolved" ||
    metaReviewGateThresholdIsMet({
      highestOpenSeverity: thresholdAuthority.highestOpenSeverity,
      minSeverity: normalizedReviewPolicy.meta_review_auto_rework_min_severity
    })
  ) {
    const authorityDetail =
      thresholdAuthority.status === "resolved"
        ? `highestOpenSeverity=${thresholdAuthority.highestOpenSeverity}; configuredMinSeverity=${normalizedReviewPolicy.meta_review_auto_rework_min_severity}`
        : `thresholdStatus=${thresholdAuthority.status}`;
    return {
      blocked: true,
      parityMetadata,
      fallbackReason:
        `${META_REVIEW_APPROVE_THRESHOLD_BACKSTOP}: invalid open-findings approve cannot route to human_gate_approve (${authorityDetail}).`
    };
  }

  return {
    blocked: false,
    parityMetadata,
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
  if (input.runResultForRouting.recommendation !== "approve") {
    return {
      clean: false,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        "META_REVIEW_GATE_CLEAN_RUN_NOT_APPROVE: recommendation is not approve."
    };
  }

  const normalizedReviewPolicy = normalizeBubbleReviewPolicy(
    input.finalizeInput.resolved.bubbleConfig
  );
  const parityMetadata = input.parityMetadata;
  if (
    parityMetadata?.findings_claimed_open_total === 0 &&
    parityMetadata.findings_blocking_open_total === 0 &&
    parityMetadata.findings_advisory_open_total === 0 &&
    parityMetadata.findings_parity_status !== "guard_failed"
  ) {
    return { clean: true, parityMetadata };
  }

  const thresholdAuthority =
    input.thresholdAuthority
    ?? await resolveMetaReviewGateThresholdAuthority({
      runResult: input.runResultForRouting,
      bubbleDir: input.finalizeInput.resolved.bubblePaths.bubbleDir,
      artifactsDir: input.finalizeInput.resolved.bubblePaths.artifactsDir,
      readFileFn: input.finalizeInput.readFileFn
    });
  const thresholdParityMetadata =
    thresholdAuthority.parityMetadata ?? parityMetadata;
  if (thresholdAuthority.status !== "resolved") {
    return {
      clean: false,
      parityMetadata: thresholdParityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_CLEAN_RUN_THRESHOLD_UNRESOLVED: thresholdStatus=${thresholdAuthority.status}.`
    };
  }
  if (
    metaReviewGateThresholdIsMet({
      highestOpenSeverity: thresholdAuthority.highestOpenSeverity,
      minSeverity: normalizedReviewPolicy.meta_review_auto_rework_min_severity
    })
  ) {
    return {
      clean: false,
      parityMetadata: thresholdParityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_CLEAN_RUN_THRESHOLD_MET: highestOpenSeverity=${thresholdAuthority.highestOpenSeverity}; configuredMinSeverity=${normalizedReviewPolicy.meta_review_auto_rework_min_severity}.`
    };
  }

  return { clean: true, parityMetadata: thresholdParityMetadata };
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

function isApproveValidationCommandFailure(fallbackReason: string): boolean {
  return (
    fallbackReason.includes("stage=exec") &&
    fallbackReason.includes("detail=command exited ")
  );
}

function buildApproveValidationReworkMessage(fallbackReason: string): string {
  return [
    "Meta-review approved the current change, but the required approve-gate validation failed.",
    "",
    "Please inspect the validation failure and try to fix it in this bubble worktree. Treat the failure as actionable for this bubble unless the correct fix is genuinely unclear.",
    "",
    `Validation failure: ${fallbackReason}`,
    "",
    "If the failure points to an ambiguous repository state or you cannot determine the appropriate fix after inspecting the log, ask the human for direction instead of routing around the failure."
  ].join("\n");
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
