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
  assertRunPayloadInvariants,
  formatRunnerFailure,
  mapRecommendationToStatus,
  isMissingFileError,
  stateWriteConflictToMetaReviewError
} from "./metaReviewLiveRunErrors.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import {
  StateStoreConflictError,
  readStateSnapshot,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../state/stateStore.js";
import {
  normalizeMetaReviewSnapshot
} from "../../v11/shared/metaReview/metaReviewSnapshot.js";
import { MetaReviewError } from "../../v11/shared/metaReview/metaReviewError.js";
import type {
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../types/bubble.js";
import type {
  MetaReviewDependencies,
  MetaReviewResult,
  MetaReviewRunInput,
  MetaReviewRunWarning
} from "./metaReviewLiveRunContract.js";

interface RollingArtifactBackupEntry {
  artifactPath: string;
  existed: boolean;
  contents: string | null;
}

async function readRollingArtifactBackup(
  artifactPath: string,
  readFileFn: NonNullable<MetaReviewDependencies["readFile"]>
): Promise<RollingArtifactBackupEntry> {
  try {
    const contents = await readFileFn(artifactPath, "utf8");
    return {
      artifactPath,
      existed: true,
      contents
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        artifactPath,
        existed: false,
        contents: null
      };
    }
    throw error;
  }
}

export async function runMetaReview(
  input: MetaReviewRunInput,
  dependencies: MetaReviewDependencies = {}
): Promise<MetaReviewResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const runLiveReview = dependencies.runLiveReview ?? defaultLiveRunner;
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

  const previousMetaReview = normalizeMetaReviewSnapshot(loadedState.state.meta_review);
  const lifecycleBaseState = loadedState.state;
  const nextMetaReview: BubbleMetaReviewSnapshotState = {
    ...previousMetaReview,
    execution_context: previousMetaReview.execution_context ?? null,
    last_autonomous_run_id: runId,
    last_autonomous_status: status,
    last_autonomous_recommendation: recommendation,
    last_autonomous_summary: summary,
    last_autonomous_report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    last_autonomous_rework_target_message: reworkTargetMessage,
    last_autonomous_updated_at: updatedAt,
    ...(loadedState.state.state === "READY_FOR_HUMAN_APPROVAL" && status === "success"
      ? { sticky_human_gate: true }
      : {})
  };

  const nextState: BubbleStateSnapshot = {
    ...lifecycleBaseState,
    meta_review: nextMetaReview
  };

  let written: LoadedStateSnapshot;
  try {
    written = await writeState(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: loadedState.state.state
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw stateWriteConflictToMetaReviewError(error);
    }
    throw error;
  }

  const reportPayload = {
    bubble_id: resolved.bubbleId,
    run_id: runId,
    round: written.state.round,
    generated_at: updatedAt,
    depth,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    report_json_ref: CANONICAL_META_REVIEW_REPORT_REF,
    rework_target_message: reworkTargetMessage,
    warnings,
    report_json: canonicalReportJson
  };

  const artifactBackup = await Promise.all([
    readRollingArtifactBackup(
      resolved.bubblePaths.metaReviewLastJsonArtifactPath,
      dependencies.readFile ?? readFile
    )
  ]);

  const artifactWrites = await Promise.allSettled([
    (dependencies.writeFile ?? writeFile)(
      resolved.bubblePaths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(reportPayload, null, 2)}\n`,
      "utf8"
    )
  ]);

  const failedArtifactWrites = artifactWrites.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  if (failedArtifactWrites.length > 0) {
    const message = failedArtifactWrites
      .map((result) =>
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason)
      )
      .join("; ");
    warnings.push({
      reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
      message
    });
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
    writeFileFn: dependencies.writeFile ?? writeFile,
    writeStateFn: writeState
  });

  return {
    bubble_id: resolved.bubbleId,
    run_id: runId,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    rework_target_message: reworkTargetMessage,
    updated_at: updatedAt,
    warnings,
    report_json: canonicalReportJson
  };
}
