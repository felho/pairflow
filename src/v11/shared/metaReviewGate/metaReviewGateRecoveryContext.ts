import { readFile, writeFile } from "node:fs/promises";

import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import {
  readStateSnapshot,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import {
  hasCanonicalSubmitForActiveMetaReviewRound,
  type MetaReviewRunResult
} from "../../../core/bubble/metaReview.js";
import type {
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot,
  MetaReviewRecommendation
} from "../../../types/bubble.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import {
  readMetaReviewReportJsonArtifact,
  resolveFindingsParityMetadataFromReportJson
} from "./metaReviewGateFindingsMetadata.js";
import {
  normalizeRecoveredMetaReviewRunResult,
  synthesizeMetaReviewRunFailure,
  synthesizeMetaReviewRunResultFromSnapshot,
  writeRecoveredMetaReviewArtifacts
} from "./metaReviewGateRunResultArtifacts.js";
export {
  resolveRecoveryParityRouting,
  type RecoveryParityResolution
} from "./metaReviewGateRecoveryParity.js";
import {
  buildGateLockPath,
  buildHumanGateSummary,
  normalizeMetaReviewSnapshot,
  persistHumanGateRoute,
  resolveHumanGateRoute
} from "./metaReviewGateShared.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type RecoverMetaReviewGateFromSnapshotDependencies,
  type RecoverMetaReviewGateFromSnapshotInput
} from "./metaReviewGateTypes.js";

export interface RecoverMetaReviewExecutionContext {
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  now: Date;
  nowIso: string;
  refs: string[];
  lockPath: string;
  loaded: LoadedStateSnapshot;
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  readState: typeof readStateSnapshot;
  readFileFn: typeof readFile;
  writeFileFn: typeof writeFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
  deactivateMetaReviewerPane: () => Promise<string | null>;
  finishWithPaneDeactivation: (result: MetaReviewGateResult) => Promise<MetaReviewGateResult>;
}

export interface RecoveredRunResolution {
  snapshot: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
  summary: string;
  snapshotHasCanonicalSubmitInActiveWindow: boolean;
}

export async function initializeRecoverMetaReviewExecutionContext(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies
): Promise<RecoverMetaReviewExecutionContext> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const setMetaReviewerPane =
    dependencies.setMetaReviewerPaneBinding ?? setMetaReviewerPaneBinding;
  const readFileFn = dependencies.readFile ?? readFile;
  const writeFileFn = dependencies.writeFile ?? writeFile;
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const refs = input.refs ?? [];

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const lockPath = buildGateLockPath({
    locksDir: resolved.bubblePaths.locksDir,
    bubbleId: resolved.bubbleId
  });

  const deactivateMetaReviewerPane = async (): Promise<string | null> => {
    try {
      await setMetaReviewerPane({
        sessionsPath: resolved.bubblePaths.sessionsPath,
        bubbleId: resolved.bubbleId,
        active: false,
        now
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };

  const finishWithPaneDeactivation = async (
    result: MetaReviewGateResult
  ): Promise<MetaReviewGateResult> => {
    let finalizedResult = result;
    if (result.metaReviewRun !== undefined) {
      const artifactWrite = await writeRecoveredMetaReviewArtifacts({
        bubbleId: resolved.bubbleId,
        round: result.state.round,
        nowIso,
        runResult: result.metaReviewRun,
        paths: {
          metaReviewLastJsonArtifactPath:
            resolved.bubblePaths.metaReviewLastJsonArtifactPath,
          metaReviewLastMarkdownArtifactPath:
            resolved.bubblePaths.metaReviewLastMarkdownArtifactPath
        },
        writeFileFn
      });
      if (artifactWrite.warnings.length > 0) {
        finalizedResult = {
          ...result,
          metaReviewRun: {
            ...result.metaReviewRun,
            warnings: [
              ...result.metaReviewRun.warnings,
              ...artifactWrite.warnings
            ]
          }
        };
      }
    }
    await deactivateMetaReviewerPane();
    return finalizedResult;
  };

  const loaded = await readState(resolved.bubblePaths.statePath);
  if (loaded.state.state !== "META_REVIEW_RUNNING") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `meta-review gate recovery requires META_REVIEW_RUNNING state (current: ${loaded.state.state}).`
    );
  }

  return {
    resolved,
    now,
    nowIso,
    refs,
    lockPath,
    loaded,
    appendEnvelope,
    writeState,
    readState,
    readFileFn,
    writeFileFn,
    ...(dependencies.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: dependencies.sleepForRetryMs }
      : {}),
    deactivateMetaReviewerPane,
    finishWithPaneDeactivation
  };
}

export async function resolveRecoveredRunResolution(input: {
  context: RecoverMetaReviewExecutionContext;
  requestedRunResult?: MetaReviewRunResult;
  requestedSummary?: string;
}): Promise<RecoveredRunResolution> {
  const snapshot = normalizeMetaReviewSnapshot(input.context.loaded.state.meta_review);
  const fallbackSummary =
    input.requestedSummary ??
    "Meta-review completed previously; recovering gate route from snapshot.";
  const snapshotHasCanonicalSubmitInActiveWindow =
    hasCanonicalSubmitForActiveMetaReviewRound({
      state: input.context.loaded.state,
      snapshot
    });
  const reportJsonArtifactRead = await readMetaReviewReportJsonArtifact({
    artifactPath: input.context.resolved.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn: input.context.readFileFn
  });

  const runResultBase = normalizeRecoveredMetaReviewRunResult({
    bubbleId: input.context.resolved.bubbleId,
    nowIso: input.context.nowIso,
    fallbackSummary,
    bubbleDir: input.context.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.context.resolved.bubblePaths.artifactsDir,
    runResult: input.requestedRunResult ?? (
      snapshotHasCanonicalSubmitInActiveWindow
        ? synthesizeMetaReviewRunResultFromSnapshot({
            bubbleId: input.context.resolved.bubbleId,
            nowIso: input.context.nowIso,
            snapshot,
            fallbackSummary
          })
        : synthesizeMetaReviewRunFailure({
            bubbleId: input.context.resolved.bubbleId,
            nowIso: input.context.nowIso,
            fallbackSummary
          })
    )
  });
  const runResultResolvedFromSnapshot: MetaReviewRunResult =
    runResultBase.report_json !== undefined
      ? runResultBase
      : {
          ...runResultBase,
          ...(reportJsonArtifactRead.reportJson !== undefined
            ? { report_json: reportJsonArtifactRead.reportJson }
            : {})
        };
  const runResult: MetaReviewRunResult =
    reportJsonArtifactRead.diagnostics.length === 0
      ? runResultResolvedFromSnapshot
      : {
          ...runResultResolvedFromSnapshot,
          report_json: {
            ...(runResultResolvedFromSnapshot.report_json ?? {}),
            claim_diagnostics: [
              ...(
                Array.isArray(runResultResolvedFromSnapshot.report_json?.claim_diagnostics)
                  ? runResultResolvedFromSnapshot.report_json.claim_diagnostics
                      .filter((entry): entry is string => typeof entry === "string")
                  : []
              ),
              ...reportJsonArtifactRead.diagnostics
            ]
          }
        };
  const summary = runResult.summary
    ?? input.requestedSummary
    ?? "Meta-review completed previously; recovering gate route from snapshot.";

  return {
    snapshot,
    runResult,
    summary,
    snapshotHasCanonicalSubmitInActiveWindow
  };
}

export function assertRecoveredRunResolutionConsistency(input: {
  requestedRunResult?: MetaReviewRunResult;
  snapshotHasCanonicalSubmitInActiveWindow: boolean;
  snapshot: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
}): void {
  const snapshotUpdatedAtMs = Date.parse(input.snapshot.last_autonomous_updated_at ?? "");
  const runResultUpdatedAtMs = Date.parse(input.runResult.updated_at);
  const hasComparableTimestamps =
    Number.isFinite(snapshotUpdatedAtMs) && Number.isFinite(runResultUpdatedAtMs);
  const updatedAtChanged = input.requestedRunResult === undefined
    ? false
    : (hasComparableTimestamps
        ? snapshotUpdatedAtMs !== runResultUpdatedAtMs
        : input.snapshot.last_autonomous_updated_at !== input.runResult.updated_at);
  if (
    input.requestedRunResult !== undefined &&
    input.snapshotHasCanonicalSubmitInActiveWindow &&
    updatedAtChanged
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_STATE_CONFLICT",
      "META_REVIEW_GATE_STATE_CONFLICT: canonical snapshot changed between await and recovery route.",
      {
        stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
      }
    );
  }
}


export async function persistRecoveryRunFailedHumanRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  summary: string;
  runResult: MetaReviewRunResult;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.context.appendEnvelope,
    writeState: input.context.writeState,
    statePath: input.context.resolved.bubblePaths.statePath,
    transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
    inboxPath: input.context.resolved.bubblePaths.inboxPath,
    lockPath: input.context.lockPath,
    now: input.context.now,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      metaReviewRun: input.runResult
    }),
    refs: input.context.refs,
    loaded: input.context.loaded,
    expectedState: "META_REVIEW_RUNNING",
    route: "human_gate_run_failed",
    metaReviewRun: input.runResult,
    parityMetadata: resolveFindingsParityMetadataFromReportJson(
      input.runResult.report_json
    ),
    targetState: "META_REVIEW_FAILED",
    stickyHumanGate: false
  });
}

export async function persistRecoveryDispatchFailedHumanRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  summary: string;
  fallbackReason: string;
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  runResultForRouting: MetaReviewRunResult;
  parityMetadata: FindingsParityMetadata | null;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.context.appendEnvelope,
    writeState: input.context.writeState,
    statePath: input.context.resolved.bubblePaths.statePath,
    transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
    inboxPath: input.context.resolved.bubblePaths.inboxPath,
    lockPath: input.context.lockPath,
    now: input.context.now,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      fallbackReason: input.fallbackReason
    }),
    refs: input.context.refs,
    loaded: input.loaded,
    expectedState: input.expectedState,
    route: "human_gate_dispatch_failed",
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata ??
      resolveFindingsParityMetadataFromReportJson(input.runResultForRouting.report_json),
    ...(input.rollbackStateOnAppendFailure !== undefined
      ? { rollbackStateOnAppendFailure: input.rollbackStateOnAppendFailure }
      : {})
  });
}

export async function persistRecoveryResolvedHumanRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  summary: string;
  runResultForRouting: MetaReviewRunResult;
  recommendation: MetaReviewRecommendation;
  budgetAvailable: boolean;
  parityMetadata: FindingsParityMetadata | null;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.context.appendEnvelope,
    writeState: input.context.writeState,
    statePath: input.context.resolved.bubblePaths.statePath,
    transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
    inboxPath: input.context.resolved.bubblePaths.inboxPath,
    lockPath: input.context.lockPath,
    now: input.context.now,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      metaReviewRun: input.runResultForRouting
    }),
    refs: input.context.refs,
    loaded: input.context.loaded,
    expectedState: "META_REVIEW_RUNNING",
    route: resolveHumanGateRoute(input.recommendation, input.budgetAvailable),
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata ??
      resolveFindingsParityMetadataFromReportJson(input.runResultForRouting.report_json)
  });
}
