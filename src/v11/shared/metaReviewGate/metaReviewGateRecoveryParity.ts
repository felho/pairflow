import type {
  BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import type { readFile } from "node:fs/promises";
import { validateStructuredMetaReviewPositiveClaim } from "./metaReviewGateFindingsValidation.js";

export type RecoveryParityResolution =
  | {
      ok: true;
      budgetAvailable: boolean;
      runResultForRouting: MetaReviewRunResult;
      parityMetadata: FindingsParityMetadata | null;
    }
  | {
      ok: false;
      reason: string;
      runResultForRouting: MetaReviewRunResult;
      parityMetadata: FindingsParityMetadata | null;
    };

function mergeRunResultWithParityResolution(input: {
  runResult: MetaReviewRunResult;
  metadata: FindingsParityMetadata | null;
  diagnostics: string[];
}): MetaReviewRunResult {
  if (input.metadata === null && input.diagnostics.length === 0) {
    return input.runResult;
  }
  const reportJson = { ...(input.runResult.report_json ?? {}) };
  if (input.metadata !== null) {
    reportJson.findings_claimed_open_total = input.metadata.findings_claimed_open_total;
    reportJson.findings_artifact_open_total = input.metadata.findings_artifact_open_total;
    reportJson.findings_artifact_status = input.metadata.findings_artifact_status;
    reportJson.findings_digest_sha256 = input.metadata.findings_digest_sha256;
    reportJson.meta_review_run_id = input.metadata.meta_review_run_id;
    reportJson.findings_parity_status = input.metadata.findings_parity_status;
  }
  const existingDiagnostics = Array.isArray(reportJson.claim_diagnostics)
    ? reportJson.claim_diagnostics.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];
  const mergedDiagnostics = [...existingDiagnostics, ...input.diagnostics];
  if (mergedDiagnostics.length > 0) {
    reportJson.claim_diagnostics = mergedDiagnostics;
  }
  return {
    ...input.runResult,
    report_json: reportJson
  };
}

export async function resolveRecoveryParityRouting(input: {
  context: {
    resolved: {
      bubblePaths: {
        bubbleDir: string;
        artifactsDir: string;
      };
    };
    readFileFn: typeof readFile;
    sleepForRetryMs?: (delayMs: number) => Promise<void>;
  };
  snapshot: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
}): Promise<RecoveryParityResolution> {
  const positiveClaimParity = await validateStructuredMetaReviewPositiveClaim({
    runResult: input.runResult,
    ...(input.runResult.report_json !== undefined
      ? { reportJson: input.runResult.report_json }
      : {}),
    bubbleDir: input.context.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.context.resolved.bubblePaths.artifactsDir,
    readFileFn: input.context.readFileFn,
    ...(input.context.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: input.context.sleepForRetryMs }
      : {})
  });
  if (!positiveClaimParity.ok) {
    return {
      ok: false,
      reason: positiveClaimParity.reason,
      runResultForRouting: mergeRunResultWithParityResolution({
        runResult: input.runResult,
        metadata: positiveClaimParity.metadata,
        diagnostics: []
      }),
      parityMetadata: positiveClaimParity.metadata
    };
  }
  return {
    ok: true,
    budgetAvailable: input.snapshot.auto_rework_count < input.snapshot.auto_rework_limit,
    runResultForRouting: mergeRunResultWithParityResolution({
      runResult: input.runResult,
      metadata: positiveClaimParity.metadata,
      diagnostics: positiveClaimParity.diagnostics
    }),
    parityMetadata: positiveClaimParity.metadata
  };
}
