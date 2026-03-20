import type { readFile, writeFile } from "node:fs/promises";

import type { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type {
  readStateSnapshot,
  writeStateSnapshot,
  LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import {
  type MetaReviewRunResult
} from "../../../core/bubble/metaReview.js";
import type {
  BubbleStateSnapshot,
  MetaReviewRecommendation
} from "../../../types/bubble.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import {
  resolveFindingsParityMetadataFromReportJson
} from "./metaReviewGateFindingsMetadata.js";
export {
  resolveRecoveryParityRouting,
  type RecoveryParityResolution
} from "./metaReviewGateRecoveryParity.js";
import {
  buildGateLockPath,
  buildHumanGateSummary,
  persistHumanGateRoute,
  resolveHumanGateRoute
} from "./metaReviewGateShared.js";
import {
  type MetaReviewGateResult,
  type RecoverMetaReviewGateFromSnapshotDependencies,
  type RecoverMetaReviewGateFromSnapshotInput
} from "./metaReviewGateTypes.js";
import {
  assertRecoverableMetaReviewState,
  buildDeactivateMetaReviewerPane,
  buildFinishWithPaneDeactivation,
  resolveRecoveryContextDependencies
} from "./metaReviewGateRecoveryContextHelpers.js";
export {
  assertRecoveredRunResolutionConsistency,
  resolveRecoveredRunResolution,
  type RecoveredRunResolution
} from "./metaReviewGateRecoveryRunResolution.js";

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

export async function initializeRecoverMetaReviewExecutionContext(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies
): Promise<RecoverMetaReviewExecutionContext> {
  const resolvedDependencies = resolveRecoveryContextDependencies(dependencies);
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const refs = input.refs ?? [];

  const resolved = await resolvedDependencies.resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const lockPath = buildGateLockPath({
    locksDir: resolved.bubblePaths.locksDir,
    bubbleId: resolved.bubbleId
  });
  const deactivateMetaReviewerPane = buildDeactivateMetaReviewerPane({
    setMetaReviewerPane: resolvedDependencies.setMetaReviewerPane,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    bubbleId: resolved.bubbleId,
    now
  });
  const finishWithPaneDeactivation = buildFinishWithPaneDeactivation({
    bubbleId: resolved.bubbleId,
    nowIso,
    writeFileFn: resolvedDependencies.writeFileFn,
    artifactsPaths: {
      metaReviewLastJsonArtifactPath:
        resolved.bubblePaths.metaReviewLastJsonArtifactPath,
      metaReviewLastMarkdownArtifactPath:
        resolved.bubblePaths.metaReviewLastMarkdownArtifactPath
    },
    deactivateMetaReviewerPane
  });

  const loaded = await resolvedDependencies.readState(resolved.bubblePaths.statePath);
  assertRecoverableMetaReviewState(loaded);

  return {
    resolved,
    now,
    nowIso,
    refs,
    lockPath,
    loaded,
    appendEnvelope: resolvedDependencies.appendEnvelope,
    writeState: resolvedDependencies.writeState,
    readState: resolvedDependencies.readState,
    readFileFn: resolvedDependencies.readFileFn,
    writeFileFn: resolvedDependencies.writeFileFn,
    ...(dependencies.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: dependencies.sleepForRetryMs }
      : {}),
    deactivateMetaReviewerPane,
    finishWithPaneDeactivation
  };
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
