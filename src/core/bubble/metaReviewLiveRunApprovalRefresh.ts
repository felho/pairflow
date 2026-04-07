import { rm } from "node:fs/promises";

import {
  appendHumanApprovalRequestEnvelope
} from "./approvalRequestEnvelope.js";
import {
  StateStoreConflictError,
  type LoadedStateSnapshot
} from "../state/stateStore.js";
import {
  readApprovalAdvisoryFindingsSnapshot,
  readMetaReviewFindingsParitySnapshot
} from "./metaReviewLiveRunParity.js";
import {
  assertApproveRecommendationConsistentWithReviewerSnapshot,
  readLatestApproveReviewerSnapshot
} from "./metaReviewLiveRunReviewerSnapshot.js";
import {
  shouldRefreshApprovalRequest
} from "./metaReviewLiveRunErrors.js";
import { CANONICAL_META_REVIEW_REPORT_REF } from "./metaReviewLiveRunReport.js";
import { MetaReviewError } from "../../v11/shared/metaReview/metaReviewError.js";
import type {
  MetaReviewRecommendation
} from "../../types/bubble.js";
import type {
  MetaReviewDependencies,
} from "./metaReviewLiveRunContract.js";

async function restoreRollingArtifactBackup(
  artifactBackup: {
    artifactPath: string;
    existed: boolean;
    contents: string | null;
  }[],
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

export async function refreshMetaReviewApprovalRequest(input: {
  bubbleId: string;
  artifactBackup: {
    artifactPath: string;
    existed: boolean;
    contents: string | null;
  }[];
  statePath: string;
  state: string;
  round: number;
  recommendation: MetaReviewRecommendation;
  summary: string | null;
  canonicalReportJson: Record<string, unknown>;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  loadedState: LoadedStateSnapshot;
  written: LoadedStateSnapshot;
  now: Date;
  appendEnvelope: NonNullable<MetaReviewDependencies["appendProtocolEnvelope"]>;
  writeFileFn: NonNullable<MetaReviewDependencies["writeFile"]>;
  writeStateFn: NonNullable<MetaReviewDependencies["writeStateSnapshot"]>;
}): Promise<void> {
  if (!shouldRefreshApprovalRequest(input.state)) {
    return;
  }

  const parity = readMetaReviewFindingsParitySnapshot(input.canonicalReportJson);
  const approvalFindings = readApprovalAdvisoryFindingsSnapshot(
    input.canonicalReportJson
  );
  const latestReviewerSnapshot = await readLatestApproveReviewerSnapshot({
    recommendation: input.recommendation,
    transcriptPath: input.transcriptPath,
    round: input.round
  });
  const approvalSummary =
    input.summary ??
    `Meta-review completed with recommendation ${input.recommendation}.`;

  try {
    assertApproveRecommendationConsistentWithReviewerSnapshot({
      latestSnapshot: latestReviewerSnapshot,
      summary: approvalSummary,
      reportJson: input.canonicalReportJson
    });
    await appendHumanApprovalRequestEnvelope({
      appendEnvelope: input.appendEnvelope,
      transcriptPath: input.transcriptPath,
      inboxPath: input.inboxPath,
      lockPath: input.lockPath,
      now: input.now,
      bubbleId: input.bubbleId,
      round: input.written.state.round,
      summary: approvalSummary,
      route: resolveApprovalRefreshRoute(input.recommendation),
      refs: [CANONICAL_META_REVIEW_REPORT_REF],
      recommendation: input.recommendation,
      parityMetadata: parity,
      ...(latestReviewerSnapshot !== undefined
        ? { reviewerSnapshot: latestReviewerSnapshot }
        : {}),
      ...(approvalFindings !== undefined ? { findings: approvalFindings } : {})
    });
  } catch (appendError) {
    const appendReason =
      appendError instanceof Error ? appendError.message : String(appendError);
    let rollbackReasonCode = "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_NOT_ATTEMPTED";
    let rollbackContext = "rollback_outcome=not_attempted";
    let artifactRestoreReasonCode =
      "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_NOT_ATTEMPTED";
    let artifactRestoreContext = "artifact_restore_outcome=not_attempted";
    let gateReasonCode:
      | "META_REVIEW_GATE_STATE_CONFLICT"
      | "META_REVIEW_GATE_TRANSITION_INVALID" =
      "META_REVIEW_GATE_TRANSITION_INVALID";
    try {
      await input.writeStateFn(input.statePath, input.loadedState.state, {
        expectedFingerprint: input.written.fingerprint,
        expectedState: input.written.state.state
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
        await restoreRollingArtifactBackup(input.artifactBackup, input.writeFileFn);
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
      `${gateReasonCode}: approval refresh append failed after state/artifact writes (append_error=${appendReason}; rollback_reason_code=${rollbackReasonCode}; rollback_target_state=${input.loadedState.state.state}; ${rollbackContext}; artifact_restore_reason_code=${artifactRestoreReasonCode}; ${artifactRestoreContext}).`
    );
  }
}
