import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { resolveBubbleById } from "./bubbleLookup.js";
import {
  isMetaReviewExecutionContextActiveState
} from "./metaReviewExecutionContext.js";
import {
  defaultLiveRunner
} from "./metaReviewLiveRunner.js";
import {
  refreshMetaReviewApprovalRequest
} from "./metaReviewLiveRunApprovalRefresh.js";
import {
  CANONICAL_META_REVIEW_REPORT_REF,
  normalizeOptionalText,
  resolveCanonicalMetaReviewReportJson
} from "./metaReviewLiveRunReport.js";
import {
  buildMetaReviewLastJsonArtifactPayload,
  persistMetaReviewLastJsonArtifact
} from "./metaReviewLiveRunArtifacts.js";
import {
  buildMetaReviewRunResult,
  buildNextMetaReviewStateSnapshot,
  persistMetaReviewStateSnapshot
} from "./metaReviewLiveRunPersistence.js";
import {
  assertRunPayloadInvariants,
  formatRunnerFailure,
  mapRecommendationToStatus
} from "./metaReviewLiveRunErrors.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStore.js";
import { MetaReviewError } from "../../v11/shared/metaReview/metaReviewError.js";
import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../types/bubble.js";
import type {
  MetaReviewDependencies,
  MetaReviewResult,
  MetaReviewRunInput,
  MetaReviewRunWarning
} from "./metaReviewLiveRunContract.js";

export async function runMetaReview(
  input: MetaReviewRunInput,
  dependencies: MetaReviewDependencies = {}
): Promise<MetaReviewResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const runLiveReview = dependencies.runLiveReview ?? defaultLiveRunner;
  const readFileFn = dependencies.readFile ?? readFile;
  const writeFileFn = dependencies.writeFile ?? writeFile;
  const now = dependencies.now ?? new Date();
  const makeUuid = dependencies.randomUUID ?? randomUUID;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const loadedState = await readState(resolved.bubblePaths.statePath);
  if (
    isMetaReviewExecutionContextActiveState(loadedState.state)
    && dependencies.allowMetaReviewRunningState !== true
  ) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      "meta-review run is disabled while the active submit channel is reserved for an in-flight meta-review authority window"
    );
  }
  const runId = makeUuid();
  const updatedAt = now.toISOString();
  const depth = input.depth ?? "standard";

  let recommendation: MetaReviewRecommendation;
  let status: MetaReviewRunStatus;
  let summary: string | null;
  let reportJson: Record<string, unknown> | undefined;
  let reworkTargetMessage: string | null;
  const warnings: MetaReviewRunWarning[] = [];

  try {
    const output = await runLiveReview({
      bubbleId: resolved.bubbleId,
      repoPath: resolved.repoPath,
      worktreePath: resolved.bubblePaths.worktreePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      reviewerAgent: resolved.bubbleConfig.agents.reviewer,
      depth,
      state: loadedState.state,
      runId,
      now
    });

    recommendation = output.recommendation;
    status = mapRecommendationToStatus(recommendation);
    summary = normalizeOptionalText(output.summary);
    reworkTargetMessage = normalizeOptionalText(
      output.rework_target_message ?? undefined
    );
    reportJson = output.report_json;
  } catch (error) {
    const failure = formatRunnerFailure(error);
    recommendation = "inconclusive";
    status = "error";
    summary = failure.summary;
    reworkTargetMessage = null;

    warnings.push({
      reason_code: "META_REVIEW_RUNNER_ERROR",
      message: failure.warningMessage
    });
  }

  const canonicalReportJson = resolveCanonicalMetaReviewReportJson({
    recommendation,
    ...(reportJson !== undefined ? { reportJson } : {}),
    runId
  });

  assertRunPayloadInvariants({
    recommendation,
    status,
    reworkTargetMessage
  });

  const nextState = buildNextMetaReviewStateSnapshot({
    loadedState,
    runId,
    status,
    recommendation,
    summary,
    reworkTargetMessage,
    updatedAt,
    reportRef: CANONICAL_META_REVIEW_REPORT_REF
  });

  const written = await persistMetaReviewStateSnapshot({
    statePath: resolved.bubblePaths.statePath,
    loadedState,
    nextState,
    writeStateFn: writeState
  });

  const reportPayload = buildMetaReviewLastJsonArtifactPayload({
    bubbleId: resolved.bubbleId,
    runId,
    round: written.state.round,
    generatedAt: updatedAt,
    depth,
    status,
    recommendation,
    summary,
    reportRef: CANONICAL_META_REVIEW_REPORT_REF,
    reworkTargetMessage,
    warnings,
    canonicalReportJson
  });

  const { artifactBackup, writeWarning } =
    await persistMetaReviewLastJsonArtifact({
      artifactPath: resolved.bubblePaths.metaReviewLastJsonArtifactPath,
      reportPayload,
      readFileFn,
      writeFileFn
    });
  if (writeWarning !== null) {
    warnings.push(writeWarning);
  }

  await refreshMetaReviewApprovalRequest({
    bubbleId: resolved.bubbleId,
    artifactBackup,
    statePath: resolved.bubblePaths.statePath,
    state: written.state.state,
    round: written.state.round,
    recommendation,
    summary,
    canonicalReportJson,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    inboxPath: resolved.bubblePaths.inboxPath,
    lockPath: `${resolved.bubblePaths.locksDir}/${resolved.bubbleId}.lock`,
    loadedState,
    written,
    now,
    appendEnvelope,
    writeFileFn,
    writeStateFn: writeState
  });

  return buildMetaReviewRunResult({
    bubbleId: resolved.bubbleId,
    runId,
    status,
    recommendation,
    summary,
    reportRef: CANONICAL_META_REVIEW_REPORT_REF,
    reworkTargetMessage,
    updatedAt,
    warnings,
    canonicalReportJson
  });
}
