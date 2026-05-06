import type {
  BubbleStateSnapshot
} from "../../../../types/bubble.js";
import type { FindingsParityMetadata } from "../../../../types/protocol.js";
import type { MetaReviewResult } from "../../metaReview/metaReviewTypes.js";
import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import {
  buildGateLockPath,
  buildHumanGateSummary,
  persistHumanGateRoute,
  resolveHumanGateRoute
} from "./metaReviewGateShared.js";
import type { MetaReviewGateThresholdMetadata } from "../metaReviewGateTypes.js";
import type { MetaReviewGateResult } from "../metaReviewGateResultContract.js";
import { resolveFindingsParityMetadataFromReportJson } from "../metaReviewGateFindingsMetadata.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "../metaReviewGateCurrentRunTypes.js";

function resolveHumanGatePersistenceDecision(input: {
  forceStickyHumanGateBypass: boolean;
  recommendation: MetaReviewResult["recommendation"];
  budgetAvailable: boolean;
  thresholdMetadata?: MetaReviewGateThresholdMetadata;
}): Exclude<MetaReviewGateResult["route"], "meta_review_running" | "auto_rework"> {
  if (input.forceStickyHumanGateBypass) {
    return "human_gate_sticky_bypass";
  }

  return resolveHumanGateRoute({
    recommendation: input.recommendation,
    budgetAvailable: input.budgetAvailable,
    thresholdStatus: input.thresholdMetadata?.status ?? null
  });
}

export async function persistRunFailedHumanRoute(
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
    metaReviewerAgent: input.resolved.bubbleConfig.agents.meta_reviewer,
    loaded: input.loaded,
    expectedState: "RUNNING",
    route: "human_gate_run_failed",
    metaReviewRun: input.runResult,
    parityMetadata: null,
    stickyHumanGate: false,
    consecutiveCleanRuns: 0
  });
}

export async function persistDispatchFailedHumanRoute(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  fallbackReason: string;
  gateReasonCode?: string;
  targetState?: "READY_FOR_HUMAN_APPROVAL" | "RUNNING";
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
    metaReviewerAgent: finalizeInput.resolved.bubbleConfig.agents.meta_reviewer,
    loaded: input.loaded,
    expectedState: input.expectedState,
    route: "human_gate_dispatch_failed",
    ...(input.targetState !== undefined
      ? { targetState: input.targetState }
      : {}),
    metaReviewRun: input.runResultForRouting,
    ...(input.gateReasonCode !== undefined
      ? { gateReasonCode: input.gateReasonCode }
      : {}),
    parityMetadata:
      input.parityMetadata
      ?? resolveFindingsParityMetadataFromReportJson(input.runResultForRouting.report_json),
    consecutiveCleanRuns: 0,
    ...(input.rollbackStateOnAppendFailure !== undefined
      ? { rollbackStateOnAppendFailure: input.rollbackStateOnAppendFailure }
      : {})
  });
}

export async function persistResolvedHumanRoute(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  budgetAvailable: boolean;
  parityMetadata: FindingsParityMetadata | null;
  forceStickyHumanGateBypass: boolean;
  thresholdMetadata?: MetaReviewGateThresholdMetadata;
  fallbackReason?: string;
  consecutiveCleanRuns?: number;
}): Promise<MetaReviewGateResult> {
  const finalizeInput = input.finalizeInput;
  const humanGateDecision = resolveHumanGatePersistenceDecision({
    forceStickyHumanGateBypass: input.forceStickyHumanGateBypass,
    recommendation: input.runResultForRouting.recommendation,
    budgetAvailable: input.budgetAvailable,
    ...(input.thresholdMetadata !== undefined
      ? { thresholdMetadata: input.thresholdMetadata }
      : {})
  });
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
      metaReviewRun: input.runResultForRouting,
      ...(input.fallbackReason !== undefined
        ? { fallbackReason: input.fallbackReason }
        : {})
    }),
    refs: finalizeInput.refs,
    metaReviewerAgent: finalizeInput.resolved.bubbleConfig.agents.meta_reviewer,
    loaded: finalizeInput.loaded,
    expectedState: "RUNNING",
    route: humanGateDecision,
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata
      ?? resolveFindingsParityMetadataFromReportJson(input.runResultForRouting.report_json),
    ...(input.consecutiveCleanRuns !== undefined
      ? { consecutiveCleanRuns: input.consecutiveCleanRuns }
      : { consecutiveCleanRuns: 0 }),
    ...(input.thresholdMetadata !== undefined
      ? { thresholdMetadata: input.thresholdMetadata }
      : {})
  });
}
