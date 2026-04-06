import type { readFile, writeFile } from "node:fs/promises";

import type {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../core/protocol/transcriptStore.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type {
  readStateSnapshot,
  writeStateSnapshot,
  LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import type {
  BubbleStateSnapshot,
  MetaReviewRecommendation
} from "../../../types/bubble.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import type { MetaReviewRunResult } from "../metaReview/metaReviewTypes.js";
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
  buildDeactivateMetaReviewerPane,
  buildFinishWithPaneDeactivation,
  rethrowAfterMetaReviewerPaneDeactivation,
  resolveRecoveryContextDependencies
} from "./metaReviewGateRecoveryContextHelpers.js";
import { buildRecoveryHumanRoutePersistenceInput } from "./metaReviewGateRecoveryHumanRouteInput.js";
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
  readTranscript: typeof readTranscriptEnvelopes;
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
        resolved.bubblePaths.metaReviewLastJsonArtifactPath
    },
    deactivateMetaReviewerPane
  });

  const loaded = await resolvedDependencies.readState(
    resolved.bubblePaths.statePath
  ).catch((error: unknown) =>
    rethrowAfterMetaReviewerPaneDeactivation({
      error,
      deactivateMetaReviewerPane,
      failureContext: "recovery initialization failed"
    })
  );

  return {
    resolved,
    now,
    nowIso,
    refs,
    lockPath,
    loaded,
    appendEnvelope: resolvedDependencies.appendEnvelope,
    readTranscript: resolvedDependencies.readTranscript,
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
  return persistHumanGateRoute(buildRecoveryHumanRoutePersistenceInput({
    context: input.context,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      metaReviewRun: input.runResult
    }),
    loaded: input.context.loaded,
    expectedState: "RUNNING",
    route: "human_gate_run_failed",
    runResultForRouting: input.runResult,
    parityMetadata: null,
    targetState: "READY_FOR_HUMAN_APPROVAL",
    stickyHumanGate: false
  }));
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
  return persistHumanGateRoute(buildRecoveryHumanRoutePersistenceInput({
    context: input.context,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      fallbackReason: input.fallbackReason
    }),
    loaded: input.loaded,
    expectedState: input.expectedState,
    route: "human_gate_dispatch_failed",
    runResultForRouting: input.runResultForRouting,
    parityMetadata: input.parityMetadata,
    ...(input.rollbackStateOnAppendFailure !== undefined
      ? { rollbackStateOnAppendFailure: input.rollbackStateOnAppendFailure }
      : {})
  }));
}

export async function persistRecoveryResolvedHumanRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  summary: string;
  runResultForRouting: MetaReviewRunResult;
  recommendation: MetaReviewRecommendation;
  budgetAvailable: boolean;
  parityMetadata: FindingsParityMetadata | null;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute(buildRecoveryHumanRoutePersistenceInput({
    context: input.context,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      metaReviewRun: input.runResultForRouting
    }),
    loaded: input.context.loaded,
    expectedState: "RUNNING",
    route: resolveHumanGateRoute(input.recommendation, input.budgetAvailable),
    runResultForRouting: input.runResultForRouting,
    parityMetadata: input.parityMetadata
  }));
}
