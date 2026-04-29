import type { MetaReviewArtifactReadPort } from "../metaReview/metaReviewArtifactIo.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type {
  AppendProtocolEnvelopePort
} from "../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import type { BubbleConfig } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import {
  type FindingsParityMetadata
} from "../../../types/protocol.js";
import {
  appendMetaReviewKickoffEnvelope,
  stageMetaReviewRunningState,
} from "./metaReviewGateApplyHelpers.js";
import {
  buildGateLockPath,
  normalizeMetaReviewSnapshot,
  setMetaReviewConsecutiveCleanRuns,
} from "./metaReviewGateShared.js";
import {
  type MetaReviewGateResult
} from "./metaReviewGateTypes.js";
import { dispatchAutoRework } from "./metaReviewGateAutoRework.js";
import { validateStructuredMetaReviewPositiveClaim } from "./metaReviewGateFindingsValidation.js";
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
} from "./metaReviewGateCurrentRunRoutePersistence.js";

export const META_REVIEW_APPROVE_THRESHOLD_BACKSTOP =
  "META_REVIEW_APPROVE_THRESHOLD_BACKSTOP" as const;

interface FinalizeCurrentRunMetaReviewGateInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: Pick<
      BubbleConfig,
      "watchdog_timeout_minutes" | "agents" | "review_policy"
    >;
    bubblePaths: {
      artifactsDir: string;
      bubbleDir: string;
      inboxPath: string;
      locksDir: string;
      statePath: string;
      transcriptPath: string;
    };
  };
  loaded: LoadedStateSnapshot;
  now: Date;
  refs: string[];
  summary: string;
  runResult: MetaReviewResult;
  readFileFn: MetaReviewArtifactReadPort;
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
}

function mergeRunResultWithParityResolution(input: {
  runResult: MetaReviewResult;
  metadata: FindingsParityMetadata | null;
  diagnostics: string[];
}): MetaReviewResult {
  if (input.metadata === null && input.diagnostics.length === 0) {
    return input.runResult;
  }
  const reportJson = { ...(input.runResult.report_json ?? {}) };
  if (input.metadata !== null) {
    reportJson.findings_claimed_open_total = input.metadata.findings_claimed_open_total;
    reportJson.findings_artifact_open_total = input.metadata.findings_artifact_open_total;
    reportJson.findings_blocking_open_total = input.metadata.findings_blocking_open_total;
    reportJson.findings_advisory_open_total = input.metadata.findings_advisory_open_total;
    reportJson.findings_artifact_status = input.metadata.findings_artifact_status;
    reportJson.findings_digest_sha256 = input.metadata.findings_digest_sha256;
    reportJson.meta_review_run_id = input.metadata.meta_review_run_id;
    reportJson.findings_parity_status = input.metadata.findings_parity_status;
  }
  const existingDiagnostics = Array.isArray(reportJson.claim_diagnostics)
    ? reportJson.claim_diagnostics.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];
  if (existingDiagnostics.length > 0 || input.diagnostics.length > 0) {
    reportJson.claim_diagnostics = [...existingDiagnostics, ...input.diagnostics];
  }
  return {
    ...input.runResult,
    report_json: reportJson
  };
}

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
  readFileFn: MetaReviewArtifactReadPort;
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

async function routeCleanMetaReviewRerun(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  updatedStreak: number;
}): Promise<MetaReviewGateResult> {
  const finalizeInput = input.finalizeInput;
  const loadedWithUpdatedStreak: LoadedStateSnapshot = {
    ...finalizeInput.loaded,
    state: setMetaReviewConsecutiveCleanRuns(
      finalizeInput.loaded.state,
      input.updatedStreak
    )
  };

  let metaReviewRunningState: LoadedStateSnapshot;
  try {
    metaReviewRunningState = await stageMetaReviewRunningState({
      bubbleId: finalizeInput.resolved.bubbleId,
      loadedRunning: loadedWithUpdatedStreak,
      metaReviewerAgent: finalizeInput.resolved.bubbleConfig.agents.meta_reviewer,
      nowIso: finalizeInput.now.toISOString(),
      watchdogTimeoutMinutes:
        finalizeInput.resolved.bubbleConfig.watchdog_timeout_minutes,
      statePath: finalizeInput.resolved.bubblePaths.statePath,
      writeState: finalizeInput.writeState
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return persistDispatchFailedHumanRoute({
      finalizeInput,
      loaded: finalizeInput.loaded,
      expectedState: "RUNNING",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: stage_error=${reason}`,
      rollbackStateOnAppendFailure: finalizeInput.loaded.state
    });
  }

  try {
    const appended = await appendMetaReviewKickoffEnvelope({
      appendEnvelope: finalizeInput.appendEnvelope,
      transcriptPath: finalizeInput.resolved.bubblePaths.transcriptPath,
      inboxPath: finalizeInput.resolved.bubblePaths.inboxPath,
      lockPath: buildGateLockPath({
        locksDir: finalizeInput.resolved.bubblePaths.locksDir,
        bubbleId: finalizeInput.resolved.bubbleId
      }),
      now: finalizeInput.now,
      bubbleId: finalizeInput.resolved.bubbleId,
      round: metaReviewRunningState.state.round,
      handoffId:
        metaReviewRunningState.state.meta_review?.execution_context?.handoff_id
        ?? `meta_review:${finalizeInput.resolved.bubbleId}:round:${metaReviewRunningState.state.round}`,
      metaReviewerAgent: finalizeInput.resolved.bubbleConfig.agents.meta_reviewer,
      refs: finalizeInput.refs
    });

    return {
      bubbleId: finalizeInput.resolved.bubbleId,
      route: "meta_review_running",
      gateSequence: appended.sequence,
      gateEnvelope: appended.envelope,
      state: metaReviewRunningState.state,
      metaReviewRun: input.runResultForRouting
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return persistDispatchFailedHumanRoute({
      finalizeInput,
      loaded: metaReviewRunningState,
      expectedState: "RUNNING",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: append_error=${reason}`,
      rollbackStateOnAppendFailure: setMetaReviewConsecutiveCleanRuns(
        finalizeInput.loaded.state,
        0
      )
    });
  }
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
    return persistResolvedHumanRoute({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      budgetAvailable: parity.budgetAvailable,
      parityMetadata: parity.parityMetadata,
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
    const cleanApproval = await resolveThresholdCleanApproval({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: approveBackstop.parityMetadata,
      ...(approveBackstop.thresholdAuthority !== undefined
        ? { thresholdAuthority: approveBackstop.thresholdAuthority }
        : {})
    });
    if (!cleanApproval.clean) {
      return persistDispatchFailedHumanRoute({
        finalizeInput: input,
        loaded: input.loaded,
        expectedState: "RUNNING",
        runResultForRouting: parity.runResultForRouting,
        parityMetadata: cleanApproval.parityMetadata,
        fallbackReason: cleanApproval.fallbackReason,
        rollbackStateOnAppendFailure: input.loaded.state
      });
    }

    const normalizedReviewPolicy = normalizeBubbleReviewPolicy(
      input.resolved.bubbleConfig
    );
    const updatedStreak = (snapshot.consecutive_clean_runs ?? 0) + 1;
    if (
      updatedStreak <
      normalizedReviewPolicy.meta_review_consecutive_clean_runs_required
    ) {
      return routeCleanMetaReviewRerun({
        finalizeInput: input,
        runResultForRouting: parity.runResultForRouting,
        parityMetadata: cleanApproval.parityMetadata,
        updatedStreak
      });
    }

    return persistResolvedHumanRoute({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      budgetAvailable: parity.budgetAvailable,
      parityMetadata: cleanApproval.parityMetadata,
      forceStickyHumanGateBypass: false,
      consecutiveCleanRuns: updatedStreak
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
