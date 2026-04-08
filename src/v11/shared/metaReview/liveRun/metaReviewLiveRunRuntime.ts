import { resolveMetaReviewLiveRunPorts } from "./metaReviewLiveRunPorts.js";
import {
  refreshMetaReviewApprovalRequest
} from "./metaReviewLiveRunApprovalRefresh.js";
import {
  CANONICAL_META_REVIEW_REPORT_REF,
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
import type {
  MetaReviewDependencies,
  MetaReviewResult,
  MetaReviewRunInput,
} from "./metaReviewLiveRunContract.js";
import { executeMetaReviewLiveRun } from "./metaReviewLiveRunExecution.js";

export async function runMetaReview(
  input: MetaReviewRunInput,
  dependencies: MetaReviewDependencies = {}
): Promise<MetaReviewResult> {
  const ports = resolveMetaReviewLiveRunPorts(dependencies);

  const resolved = await ports.resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const execution = await executeMetaReviewLiveRun({
    depth: input.depth ?? "standard",
    resolved,
    ports,
  });
  const canonicalReportJson = resolveCanonicalMetaReviewReportJson({
    recommendation: execution.recommendation,
    ...(execution.reportJson !== undefined ? { reportJson: execution.reportJson } : {}),
    runId: execution.runId
  });

  const nextState = buildNextMetaReviewStateSnapshot({
    loadedState: execution.loadedState,
    runId: execution.runId,
    status: execution.status,
    recommendation: execution.recommendation,
    summary: execution.summary,
    reworkTargetMessage: execution.reworkTargetMessage,
    updatedAt: execution.updatedAt,
    reportRef: CANONICAL_META_REVIEW_REPORT_REF
  });

  const written = await persistMetaReviewStateSnapshot({
    statePath: resolved.bubblePaths.statePath,
    loadedState: execution.loadedState,
    nextState,
    writeStateFn: ports.writeState
  });

  const reportPayload = buildMetaReviewLastJsonArtifactPayload({
    bubbleId: resolved.bubbleId,
    runId: execution.runId,
    round: written.state.round,
    generatedAt: execution.updatedAt,
    depth: execution.depth,
    status: execution.status,
    recommendation: execution.recommendation,
    summary: execution.summary,
    reportRef: CANONICAL_META_REVIEW_REPORT_REF,
    reworkTargetMessage: execution.reworkTargetMessage,
    warnings: execution.warnings,
    canonicalReportJson
  });

  const { artifactBackup, writeWarning } =
    await persistMetaReviewLastJsonArtifact({
      artifactPath: resolved.bubblePaths.metaReviewLastJsonArtifactPath,
      reportPayload,
      readFileFn: ports.readFileFn,
      writeFileFn: ports.writeFileFn
    });
  if (writeWarning !== null) {
    execution.warnings.push(writeWarning);
  }

  await refreshMetaReviewApprovalRequest({
    bubbleId: resolved.bubbleId,
    artifactBackup,
    statePath: resolved.bubblePaths.statePath,
    state: written.state.state,
    round: written.state.round,
    recommendation: execution.recommendation,
    summary: execution.summary,
    canonicalReportJson,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    inboxPath: resolved.bubblePaths.inboxPath,
    lockPath: `${resolved.bubblePaths.locksDir}/${resolved.bubbleId}.lock`,
    loadedState: execution.loadedState,
    written,
    now: ports.now,
    appendEnvelope: ports.appendEnvelope,
    writeFileFn: ports.writeFileFn,
    writeStateFn: ports.writeState,
    ...(dependencies.removeFile !== undefined
      ? { removeFileFn: dependencies.removeFile }
      : {})
  });

  return buildMetaReviewRunResult({
    bubbleId: resolved.bubbleId,
    runId: execution.runId,
    status: execution.status,
    recommendation: execution.recommendation,
    summary: execution.summary,
    reportRef: CANONICAL_META_REVIEW_REPORT_REF,
    reworkTargetMessage: execution.reworkTargetMessage,
    updatedAt: execution.updatedAt,
    warnings: execution.warnings,
    canonicalReportJson
  });
}
