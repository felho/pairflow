import { resolveMetaReviewLiveRunPorts } from "./metaReviewLiveRunPorts.js";
import {
  refreshMetaReviewApprovalRequest
} from "./metaReviewLiveRunApprovalRefresh.js";
import {
  resolveCanonicalMetaReviewReportJson
} from "../metaReviewCanonicalization.js";
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
    stickyHumanGate:
      execution.loadedState.state.state === "READY_FOR_HUMAN_APPROVAL"
      && execution.status === "success"
  });

  const written = await persistMetaReviewStateSnapshot({
    statePath: resolved.bubblePaths.statePath,
    loadedState: execution.loadedState,
    nextState,
    writeStateFn: ports.writeState
  });

  await refreshMetaReviewApprovalRequest({
    bubbleId: resolved.bubbleId,
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
    writeStateFn: ports.writeState
  });

  return buildMetaReviewRunResult({
    bubbleId: resolved.bubbleId,
    runId: execution.runId,
    status: execution.status,
    recommendation: execution.recommendation,
    summary: execution.summary,
    reworkTargetMessage: execution.reworkTargetMessage,
    updatedAt: execution.updatedAt,
    warnings: execution.warnings,
    canonicalReportJson
  });
}
