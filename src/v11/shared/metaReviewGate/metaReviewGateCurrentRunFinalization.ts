import type { MetaReviewArtifactReadPort } from "../metaReview/metaReviewArtifactIo.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type {
  AppendProtocolEnvelopePort
} from "../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import type {
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import {
  type FindingsParityMetadata
} from "../../../types/protocol.js";
import {
  buildHumanGateSummary,
  buildGateLockPath,
  normalizeMetaReviewSnapshot,
  resolveHumanGateRoute,
  persistHumanGateRoute
} from "./metaReviewGateShared.js";
import { type MetaReviewGateResult } from "./metaReviewGateTypes.js";
import { dispatchAutoRework } from "./metaReviewGateAutoRework.js";
import { validateStructuredMetaReviewPositiveClaim } from "./metaReviewGateFindingsValidation.js";
import { resolveFindingsParityMetadataFromReportJson } from "./metaReviewGateFindingsMetadata.js";

interface FinalizeCurrentRunMetaReviewGateInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: {
      watchdog_timeout_minutes: number;
      agents: {
        implementer: string;
        reviewer: string;
      };
    };
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
      runResultForRouting: MetaReviewResult;
    }
  | {
      ok: false;
      reason: string;
      parityMetadata: FindingsParityMetadata | null;
      runResultForRouting: MetaReviewResult;
    }
> {
  const parity = await validateStructuredMetaReviewPositiveClaim({
    runResult: input.runResult,
    ...(input.runResult.report_json !== undefined
      ? { reportJson: input.runResult.report_json }
      : {}),
    bubbleDir: input.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.resolved.bubblePaths.artifactsDir,
    readFileFn: input.readFileFn
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
    runResultForRouting: mergeRunResultWithParityResolution({
      runResult: input.runResult,
      metadata: parity.metadata,
      diagnostics: parity.diagnostics
    })
  };
}

async function persistRunFailedHumanRoute(
  input: FinalizeCurrentRunMetaReviewGateInput
): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.appendEnvelope,
    writeState: input.writeState,
    statePath: input.resolved.bubblePaths.statePath,
    transcriptPath: input.resolved.bubblePaths.transcriptPath,
    inboxPath: input.resolved.bubblePaths.inboxPath,
    lockPath: buildGateLockPath({
      locksDir: input.resolved.bubblePaths.locksDir,
      bubbleId: input.resolved.bubbleId
    }),
    now: input.now,
    nowIso: input.now.toISOString(),
    bubbleId: input.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      metaReviewRun: input.runResult
    }),
    refs: input.refs,
    loaded: input.loaded,
    expectedState: "RUNNING",
    route: "human_gate_run_failed",
    metaReviewRun: input.runResult,
    parityMetadata: null,
    stickyHumanGate: false
  });
}

async function persistDispatchFailedHumanRoute(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  fallbackReason: string;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}): Promise<MetaReviewGateResult> {
  const finalizeInput = input.finalizeInput;
  return persistHumanGateRoute({
    appendEnvelope: finalizeInput.appendEnvelope,
    writeState: finalizeInput.writeState,
    statePath: finalizeInput.resolved.bubblePaths.statePath,
    transcriptPath: finalizeInput.resolved.bubblePaths.transcriptPath,
    inboxPath: finalizeInput.resolved.bubblePaths.inboxPath,
    lockPath: buildGateLockPath({
      locksDir: finalizeInput.resolved.bubblePaths.locksDir,
      bubbleId: finalizeInput.resolved.bubbleId
    }),
    now: finalizeInput.now,
    nowIso: finalizeInput.now.toISOString(),
    bubbleId: finalizeInput.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: finalizeInput.summary,
      fallbackReason: input.fallbackReason
    }),
    refs: finalizeInput.refs,
    loaded: input.loaded,
    expectedState: input.expectedState,
    route: "human_gate_dispatch_failed",
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata ??
      resolveFindingsParityMetadataFromReportJson(
        input.runResultForRouting.report_json
      ),
    ...(input.rollbackStateOnAppendFailure !== undefined
      ? { rollbackStateOnAppendFailure: input.rollbackStateOnAppendFailure }
      : {})
  });
}

async function persistResolvedHumanRoute(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  budgetAvailable: boolean;
  parityMetadata: FindingsParityMetadata | null;
  stickyHumanGate: boolean;
}): Promise<MetaReviewGateResult> {
  const finalizeInput = input.finalizeInput;
  const route = input.stickyHumanGate
    ? "human_gate_sticky_bypass"
    : resolveHumanGateRoute(
        input.runResultForRouting.recommendation,
        input.budgetAvailable
      );
  return persistHumanGateRoute({
    appendEnvelope: finalizeInput.appendEnvelope,
    writeState: finalizeInput.writeState,
    statePath: finalizeInput.resolved.bubblePaths.statePath,
    transcriptPath: finalizeInput.resolved.bubblePaths.transcriptPath,
    inboxPath: finalizeInput.resolved.bubblePaths.inboxPath,
    lockPath: buildGateLockPath({
      locksDir: finalizeInput.resolved.bubblePaths.locksDir,
      bubbleId: finalizeInput.resolved.bubbleId
    }),
    now: finalizeInput.now,
    nowIso: finalizeInput.now.toISOString(),
    bubbleId: finalizeInput.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: finalizeInput.summary,
      metaReviewRun: input.runResultForRouting
    }),
    refs: finalizeInput.refs,
    loaded: finalizeInput.loaded,
    expectedState: "RUNNING",
    route,
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata ??
      resolveFindingsParityMetadataFromReportJson(
        input.runResultForRouting.report_json
      )
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

  if (snapshot.sticky_human_gate) {
    return persistResolvedHumanRoute({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      budgetAvailable: parity.budgetAvailable,
      parityMetadata: parity.parityMetadata,
      stickyHumanGate: true
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
      persistDispatchFailedHumanRoute: (dispatchInput) =>
        persistDispatchFailedHumanRoute({
          finalizeInput: input,
          ...dispatchInput
        })
    });
  }

  return persistResolvedHumanRoute({
    finalizeInput: input,
    runResultForRouting: parity.runResultForRouting,
    budgetAvailable: parity.budgetAvailable,
    parityMetadata: parity.parityMetadata,
    stickyHumanGate: false
  });
}
