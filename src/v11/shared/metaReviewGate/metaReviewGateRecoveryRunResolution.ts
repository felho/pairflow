import {
  hasCanonicalSubmitForActiveMetaReviewRound
} from "../../../core/bubble/metaReview.js";
import type { readFile } from "node:fs/promises";
import type { BubbleMetaReviewSnapshotState } from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../metaReview/metaReviewTypes.js";
import { readMetaReviewReportJsonArtifact } from "./metaReviewGateFindingsMetadata.js";
import {
  normalizeRecoveredMetaReviewRunResult,
  synthesizeMetaReviewRunFailure,
  synthesizeMetaReviewRunResultFromSnapshot
} from "./metaReviewGateRunResultArtifacts.js";
import { normalizeMetaReviewSnapshot } from "./metaReviewGateShared.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";

interface RecoveryRunResolutionContext {
  loaded: {
    state: BubbleStateSnapshot;
  };
  nowIso: string;
  readFileFn: typeof readFile;
  resolved: {
    bubbleId: string;
    bubblePaths: {
      bubbleDir: string;
      artifactsDir: string;
      metaReviewLastJsonArtifactPath: string;
    };
  };
}

export interface RecoveredRunResolution {
  snapshot: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
  summary: string;
  snapshotHasCanonicalSubmitInActiveWindow: boolean;
}

export async function resolveRecoveredRunResolution(input: {
  context: RecoveryRunResolutionContext;
  requestedRunResult?: MetaReviewRunResult;
  requestedSummary?: string;
}): Promise<RecoveredRunResolution> {
  const snapshot = normalizeMetaReviewSnapshot(input.context.loaded.state.meta_review);
  const fallbackSummary =
    input.requestedSummary ??
    "Meta-review completed previously; recovering gate route from snapshot.";
  const snapshotHasCanonicalSubmitInActiveWindow =
    hasCanonicalSubmitForActiveMetaReviewRound({
      state: input.context.loaded.state,
      snapshot
    });
  const reportJsonArtifactRead = await readMetaReviewReportJsonArtifact({
    artifactPath: input.context.resolved.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn: input.context.readFileFn
  });

  const runResultBase = normalizeRecoveredMetaReviewRunResult({
    bubbleId: input.context.resolved.bubbleId,
    nowIso: input.context.nowIso,
    fallbackSummary,
    bubbleDir: input.context.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.context.resolved.bubblePaths.artifactsDir,
    runResult: input.requestedRunResult ?? (
      snapshotHasCanonicalSubmitInActiveWindow
        ? synthesizeMetaReviewRunResultFromSnapshot({
            bubbleId: input.context.resolved.bubbleId,
            nowIso: input.context.nowIso,
            snapshot,
            fallbackSummary
          })
        : synthesizeMetaReviewRunFailure({
            bubbleId: input.context.resolved.bubbleId,
            nowIso: input.context.nowIso,
            fallbackSummary
          })
    )
  });
  const runResultResolvedFromSnapshot: MetaReviewRunResult =
    runResultBase.report_json !== undefined
      ? runResultBase
      : {
          ...runResultBase,
          ...(reportJsonArtifactRead.reportJson !== undefined
            ? { report_json: reportJsonArtifactRead.reportJson }
            : {})
        };
  const runResult: MetaReviewRunResult =
    reportJsonArtifactRead.diagnostics.length === 0
      ? runResultResolvedFromSnapshot
      : {
          ...runResultResolvedFromSnapshot,
          report_json: {
            ...(runResultResolvedFromSnapshot.report_json ?? {}),
            claim_diagnostics: [
              ...(
                Array.isArray(runResultResolvedFromSnapshot.report_json?.claim_diagnostics)
                  ? runResultResolvedFromSnapshot.report_json.claim_diagnostics
                      .filter((entry): entry is string => typeof entry === "string")
                  : []
              ),
              ...reportJsonArtifactRead.diagnostics
            ]
          }
        };
  const summary = runResult.summary
    ?? input.requestedSummary
    ?? "Meta-review completed previously; recovering gate route from snapshot.";

  return {
    snapshot,
    runResult,
    summary,
    snapshotHasCanonicalSubmitInActiveWindow
  };
}

export function assertRecoveredRunResolutionConsistency(input: {
  requestedRunResult?: MetaReviewRunResult;
  snapshotHasCanonicalSubmitInActiveWindow: boolean;
  snapshot: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
}): void {
  const snapshotUpdatedAtMs = Date.parse(input.snapshot.last_autonomous_updated_at ?? "");
  const runResultUpdatedAtMs = Date.parse(input.runResult.updated_at);
  const hasComparableTimestamps =
    Number.isFinite(snapshotUpdatedAtMs) && Number.isFinite(runResultUpdatedAtMs);
  const updatedAtChanged = input.requestedRunResult === undefined
    ? false
    : (hasComparableTimestamps
        ? snapshotUpdatedAtMs !== runResultUpdatedAtMs
        : input.snapshot.last_autonomous_updated_at !== input.runResult.updated_at);
  if (
    input.requestedRunResult !== undefined &&
    input.snapshotHasCanonicalSubmitInActiveWindow &&
    updatedAtChanged
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_STATE_CONFLICT",
      "META_REVIEW_GATE_STATE_CONFLICT: canonical snapshot changed between await and recovery route.",
      {
        stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
      }
    );
  }
}
