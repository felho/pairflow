import {
  appendHumanApprovalRequestEnvelope
} from "../../metaReviewGate/approvalRequestEnvelope.js";
import { type LoadedStateSnapshot } from "../../../../core/state/stateStore.js";
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
import {
  buildApprovalRefreshFailureMessage,
  resolveApprovalRefreshRollbackContext
} from "./metaReviewLiveRunApprovalRollback.js";
import { CANONICAL_META_REVIEW_REPORT_REF } from "./metaReviewLiveRunReport.js";
import { MetaReviewError } from "../metaReviewError.js";
import type {
  MetaReviewRecommendation
} from "../../../../types/bubble.js";
import type { MetaReviewDependencies } from "./metaReviewLiveRunContract.js";

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
    const rollbackContext = await resolveApprovalRefreshRollbackContext({
      statePath: input.statePath,
      loadedState: input.loadedState,
      written: input.written,
      artifactBackup: input.artifactBackup,
      writeStateFn: input.writeStateFn,
      writeFileFn: input.writeFileFn
    });
    throw new MetaReviewError(
      "META_REVIEW_GATE_RUN_FAILED",
      buildApprovalRefreshFailureMessage({
        gateReasonCode: rollbackContext.gateReasonCode,
        appendReason,
        rollbackReasonCode: rollbackContext.rollbackReasonCode,
        rollbackTargetState: input.loadedState.state.state,
        rollbackContext: rollbackContext.rollbackContext,
        artifactRestoreReasonCode: rollbackContext.artifactRestoreReasonCode,
        artifactRestoreContext: rollbackContext.artifactRestoreContext
      })
    );
  }
}
