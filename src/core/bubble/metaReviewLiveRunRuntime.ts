import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  appendHumanApprovalRequestEnvelope
} from "./approvalRequestEnvelope.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import {
  isMetaReviewExecutionContextActiveState
} from "./metaReviewExecutionContext.js";
import {
  defaultLiveRunner
} from "./metaReviewLiveRunner.js";
import {
  assertApproveRecommendationConsistentWithReviewerSnapshot,
  assertRunPayloadInvariants,
  CANONICAL_META_REVIEW_REPORT_REF,
  formatRunnerFailure,
  isMissingFileError,
  mapRecommendationToStatus,
  normalizeOptionalText,
  readApprovalAdvisoryFindingsSnapshot,
  readLatestApproveReviewerSnapshot,
  readMetaReviewFindingsParitySnapshot,
  resolveCanonicalMetaReviewReportJson,
  shouldRefreshApprovalRequest,
  stateWriteConflictToMetaReviewError
} from "./metaReviewLiveRunSupport.js";
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

async function restoreRollingArtifactBackup(
  artifactBackup: RollingArtifactBackupEntry[],
  writeFileFn: NonNullable<MetaReviewDependencies["writeFile"]>
): Promise<void> {
  await Promise.all(
    artifactBackup.map((artifact) =>
      artifact.existed
        ? writeFileFn(artifact.artifactPath, artifact.contents ?? "", "utf8")
        : rm(artifact.artifactPath, { force: true })
    )
  );
}

function resolveApprovalRefreshRoute(
  recommendation: MetaReviewRecommendation
): "human_gate_approve" | "human_gate_budget_exhausted" | "human_gate_inconclusive" {
  if (recommendation === "approve") {
    return "human_gate_approve";
  }
  if (recommendation === "rework") {
    return "human_gate_budget_exhausted";
  }
  return "human_gate_inconclusive";
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
      readFileFn
    )
  ]);

  const artifactWrites = await Promise.allSettled([
    writeFileFn(
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

  if (shouldRefreshApprovalRequest(written.state.state)) {
    const parity = readMetaReviewFindingsParitySnapshot(canonicalReportJson);
    const approvalFindings = readApprovalAdvisoryFindingsSnapshot(
      canonicalReportJson
    );
    const latestReviewerSnapshot = await readLatestApproveReviewerSnapshot({
      recommendation,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      round: written.state.round
    });
    const approvalSummary =
      summary ??
      `Meta-review completed with recommendation ${recommendation}.`;
    try {
      assertApproveRecommendationConsistentWithReviewerSnapshot({
        latestSnapshot: latestReviewerSnapshot,
        summary: approvalSummary,
        reportJson: canonicalReportJson
      });
      await appendHumanApprovalRequestEnvelope({
        appendEnvelope,
        transcriptPath: resolved.bubblePaths.transcriptPath,
        inboxPath: resolved.bubblePaths.inboxPath,
        lockPath: join(
          resolved.bubblePaths.locksDir,
          `${resolved.bubbleId}.lock`
        ),
        now,
        bubbleId: resolved.bubbleId,
        round: written.state.round,
        summary: approvalSummary,
        route: resolveApprovalRefreshRoute(recommendation),
        refs: [CANONICAL_META_REVIEW_REPORT_REF],
        recommendation,
        parityMetadata: parity,
        ...(latestReviewerSnapshot !== undefined
          ? { reviewerSnapshot: latestReviewerSnapshot }
          : {}),
        ...(approvalFindings !== undefined
          ? { findings: approvalFindings }
          : {})
      });
    } catch (appendError) {
      const appendReason =
        appendError instanceof Error ? appendError.message : String(appendError);
      let rollbackReasonCode = "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_NOT_ATTEMPTED";
      let rollbackContext = "rollback_outcome=not_attempted";
      let artifactRestoreReasonCode =
        "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_NOT_ATTEMPTED";
      let artifactRestoreContext = "artifact_restore_outcome=not_attempted";
      let gateReasonCode: "META_REVIEW_GATE_STATE_CONFLICT" | "META_REVIEW_GATE_TRANSITION_INVALID" =
        "META_REVIEW_GATE_TRANSITION_INVALID";
      try {
        await writeState(resolved.bubblePaths.statePath, loadedState.state, {
          expectedFingerprint: written.fingerprint,
          expectedState: written.state.state
        });
        rollbackReasonCode = "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_APPLIED";
        rollbackContext = "rollback_outcome=applied";
      } catch (rollbackError) {
        const rollbackReason =
          rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
        rollbackContext = `rollback_outcome=failed rollback_error=${rollbackReason}`;
        if (rollbackError instanceof StateStoreConflictError) {
          gateReasonCode = "META_REVIEW_GATE_STATE_CONFLICT";
          rollbackReasonCode = "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_STATE_CONFLICT";
        } else {
          rollbackReasonCode =
            "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_TRANSITION_INVALID";
        }
      }
      if (rollbackReasonCode === "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_APPLIED") {
        try {
          await restoreRollingArtifactBackup(artifactBackup, writeFileFn);
          artifactRestoreReasonCode =
            "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_APPLIED";
          artifactRestoreContext = "artifact_restore_outcome=applied";
        } catch (artifactRestoreError) {
          const artifactRestoreReason =
            artifactRestoreError instanceof Error
              ? artifactRestoreError.message
              : String(artifactRestoreError);
          artifactRestoreReasonCode =
            "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_FAILED";
          artifactRestoreContext =
            `artifact_restore_outcome=failed artifact_restore_error=${artifactRestoreReason}`;
        }
      }
      throw new MetaReviewError(
        "META_REVIEW_GATE_RUN_FAILED",
        `${gateReasonCode}: approval refresh append failed after state/artifact writes (append_error=${appendReason}; rollback_reason_code=${rollbackReasonCode}; rollback_target_state=${loadedState.state.state}; ${rollbackContext}; artifact_restore_reason_code=${artifactRestoreReasonCode}; ${artifactRestoreContext}).`
      );
    }
  }

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
