import type { LoadedStateSnapshot } from "../ports/stateSnapshots.js";
import { StateStoreConflictError } from "../state/stateStoreDefaults.js";
import {
  isMetaReviewExecutionContextActiveState
} from "./metaReviewExecutionContext.js";
import {
  CANONICAL_META_REVIEW_REPORT_REF
} from "./metaReviewCanonicalization.js";
import { normalizeStringList } from "../normalization/stringNormalization.js";
import {
  hasCanonicalSubmitForActiveMetaReviewRound,
  normalizeMetaReviewSnapshot
} from "./metaReviewSnapshot.js";
import { MetaReviewError } from "./metaReviewError.js";
import { toMetaReviewExecutionContext } from "../state/executionContext.js";
import {
  stateWriteConflictToMetaReviewError
} from "./metaReviewCommandErrorMapping.js";
import type {
  MetaReviewArtifactReadPort,
  MetaReviewArtifactWritePort
} from "./metaReviewArtifactIo.js";
import type {
  BubbleExecutionContext,
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewResult,
  MetaReviewRunWarning,
  MetaReviewSubmitInput
} from "./metaReviewCommandContract.js";

export function buildCanonicalSubmitRunResult(input: {
  bubbleId: string;
  runId: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string;
  reworkTargetMessage: string | null;
  updatedAt: string;
  warnings: MetaReviewRunWarning[];
  reportJson: Record<string, unknown>;
}): MetaReviewResult {
  return {
    bubble_id: input.bubbleId,
    run_id: input.runId,
    status: input.status,
    recommendation: input.recommendation,
    summary: input.summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    rework_target_message: input.reworkTargetMessage,
    updated_at: input.updatedAt,
    warnings: [...input.warnings],
    report_json: input.reportJson
  };
}

export async function writeCanonicalSubmitState(input: {
  resolved: Awaited<ReturnType<NonNullable<MetaReviewCommandDependencies["resolveBubbleById"]>>>;
  loadedState: LoadedStateSnapshot;
  submitInput: MetaReviewSubmitInput;
  recommendation: MetaReviewRecommendation;
  status: MetaReviewRunStatus;
  summary: string;
  reworkTargetMessage: string | null;
  runId: string;
  updatedAt: string;
  readState: NonNullable<MetaReviewCommandDependencies["readStateSnapshot"]>;
  writeState: NonNullable<MetaReviewCommandDependencies["writeStateSnapshot"]>;
  executionContext: BubbleExecutionContext;
}): Promise<void> {
  const previousMetaReview = normalizeMetaReviewSnapshot(
    input.loadedState.state.meta_review
  );
  if (
    hasCanonicalSubmitForActiveMetaReviewRound({
      state: input.loadedState.state,
      snapshot: previousMetaReview
    })
  ) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      "meta-review submit rejected: canonical submit already recorded for active meta-review round."
    );
  }
  const nextMetaReview = {
    ...previousMetaReview,
    execution_context: toMetaReviewExecutionContext(input.executionContext),
    last_autonomous_run_id: input.runId,
    last_autonomous_status: input.status,
    last_autonomous_recommendation: input.recommendation,
    last_autonomous_summary: input.summary,
    last_autonomous_report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    last_autonomous_rework_target_message: input.reworkTargetMessage,
    last_autonomous_updated_at: input.updatedAt
  };

  const nextState: BubbleStateSnapshot = {
    ...input.loadedState.state,
    execution_context: input.executionContext,
    meta_review: nextMetaReview
  };

  try {
    await input.writeState(input.resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: input.loadedState.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      const latest = await input.readState(input.resolved.bubblePaths.statePath);
      if (!isMetaReviewExecutionContextActiveState(latest.state)) {
        throw new MetaReviewError(
          "META_REVIEW_STATE_INVALID",
          `meta-review submit requires RUNNING state with active meta-review authority (current: ${latest.state.state}).`
        );
      }
      if (latest.state.round !== input.submitInput.round) {
        throw new MetaReviewError(
          "META_REVIEW_ROUND_MISMATCH",
          `meta-review submit round mismatch (active: ${latest.state.round}, received: ${input.submitInput.round}).`
        );
      }
      const latestSnapshot = normalizeMetaReviewSnapshot(latest.state.meta_review);
      if (
        hasCanonicalSubmitForActiveMetaReviewRound({
          state: latest.state,
          snapshot: latestSnapshot
        })
      ) {
        throw new MetaReviewError(
          "META_REVIEW_STATE_INVALID",
          "meta-review submit rejected: canonical submit already recorded for active meta-review round."
        );
      }
      throw stateWriteConflictToMetaReviewError(error);
    }
    throw error;
  }
}

export async function writeCanonicalSubmitReportArtifact(input: {
  resolved: Awaited<ReturnType<NonNullable<MetaReviewCommandDependencies["resolveBubbleById"]>>>;
  submitInput: MetaReviewSubmitInput;
  runId: string;
  updatedAt: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string;
  reworkTargetMessage: string | null;
  canonicalReportJson: Record<string, unknown>;
  writeFileFn: MetaReviewArtifactWritePort;
}): Promise<MetaReviewRunWarning[]> {
  const warnings: MetaReviewRunWarning[] = [];
  const reportPayload = {
    bubble_id: input.resolved.bubbleId,
    run_id: input.runId,
    round: input.submitInput.round,
    generated_at: input.updatedAt,
    status: input.status,
    recommendation: input.recommendation,
    summary: input.summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    report_json_ref: CANONICAL_META_REVIEW_REPORT_REF,
    refs: normalizeStringList(input.submitInput.refs ?? []),
    rework_target_message: input.reworkTargetMessage,
    warnings,
    report_json: input.canonicalReportJson
  };

  const artifactWrites = await Promise.allSettled([
    input.writeFileFn(
      input.resolved.bubblePaths.metaReviewLastJsonArtifactPath,
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

  return warnings;
}

export async function assertSubmitReworkFindingsArtifactContract(input: {
  bubbleDir: string;
  artifactsDir: string;
  runResult: MetaReviewResult;
  reportJson: Record<string, unknown>;
  readFileFn: MetaReviewArtifactReadPort;
}): Promise<void> {
  const { resolveReworkFindingsParityInput } = await import(
    "../metaReviewGate/metaReviewGateFindingsParityInput.js"
  );
  const { validateFindingsArtifactParity } = await import(
    "../metaReviewGate/metaReviewGateFindingsParityHelpers.js"
  );

  if (input.runResult.recommendation !== "rework") {
    return;
  }

  const parityInput = resolveReworkFindingsParityInput({
    reportJson: input.reportJson,
    runResult: input.runResult,
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir
  });
  if (!parityInput.ok) {
    throw new MetaReviewError("META_REVIEW_SCHEMA_INVALID", parityInput.reason);
  }

  const artifactParity = await validateFindingsArtifactParity({
    artifactPath: parityInput.value.artifactPath,
    findingsCount: parityInput.value.findingsCount,
    digest: parityInput.value.digest,
    artifactStatus: parityInput.value.artifactStatus,
    metaReviewRunId: parityInput.value.metaReviewRunId,
    readFileFn: input.readFileFn
  });
  if (!artifactParity.ok) {
    throw new MetaReviewError("META_REVIEW_SCHEMA_INVALID", artifactParity.reason);
  }
}
