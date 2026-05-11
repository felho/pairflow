import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../../shared/metaReview/metaReviewTypes.js";
import {
  assertActiveMetaReviewExecutionContext,
  assertMetaReviewSubmitStaleGuard
} from "./authority.js";
import type {
  MetaReviewArtifactReadPort
} from "../../../../shared/metaReview/metaReviewArtifactIo.js";
import type { BubbleStateSnapshot } from "../../../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  BubbleExecutionContext
} from "../../../../shared/state/executionContextTypes.js";
import type {
  LoadedStateSnapshot
} from "../../../../ports/stateSnapshots.js";
import { normalizeMetaReviewSnapshot } from "../../../../shared/metaReview/metaReviewSnapshot.js";
import { MetaReviewError } from "../../../../shared/metaReview/metaReviewError.js";
import { toMetaReviewExecutionContext } from "../../../../shared/state/executionContext.js";
import {
  stateWriteConflictToMetaReviewError
} from "../error/metaReviewCommandErrorMapping.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewResult,
  MetaReviewRunWarning,
  MetaReviewSubmitInput
} from "../../../../shared/metaReview/metaReviewCommandContract.js";

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
  const nextMetaReview = {
    ...previousMetaReview,
    execution_context: toMetaReviewExecutionContext(input.executionContext)
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
    if (isNamedError(error, "StateStoreConflictError")) {
      const latest = await input.readState(input.resolved.bubblePaths.statePath);
      const latestExecutionContext =
        assertActiveMetaReviewExecutionContext(latest.state);
      assertMetaReviewSubmitStaleGuard({
        bubbleId: input.resolved.bubbleId,
        executionContext: latestExecutionContext,
        stateFingerprint: latest.fingerprint,
        ...(input.submitInput.expectedHandoffId !== undefined
          ? { expectedHandoffId: input.submitInput.expectedHandoffId }
          : {}),
        ...(input.submitInput.expectedExecutionId !== undefined
          ? { expectedExecutionId: input.submitInput.expectedExecutionId }
          : {}),
        ...(input.submitInput.expectedRole !== undefined
          ? { expectedRole: input.submitInput.expectedRole }
          : {}),
        ...(input.submitInput.expectedRound !== undefined
          ? { expectedRound: input.submitInput.expectedRound }
          : {})
      });
      if (
        input.submitInput.expectedStateFingerprint !== undefined &&
        latest.fingerprint !== input.submitInput.expectedStateFingerprint
      ) {
        throw new MetaReviewError({
          reasonCode: "META_REVIEW_STATE_INVALID",
          message:
            "meta-review submit rejected: canonical state fingerprint mismatch.",
          context: {
            source: "write_canonical_submit_state",
            reason: "state_fingerprint_mismatch_after_conflict_refresh",
            bubbleId: input.resolved.bubbleId
          }
        });
      }
      throw stateWriteConflictToMetaReviewError(error);
    }
    throw error;
  }
}

export async function assertSubmitReworkFindingsArtifactContract(input: {
  bubbleDir: string;
  artifactsDir: string;
  runResult: MetaReviewResult;
  reportJson: Record<string, unknown>;
  readFileFn: MetaReviewArtifactReadPort;
}): Promise<void> {
  const {
    resolveReworkFindingsParityInput,
    validateFindingsArtifactParity
  } = await import("../../../metaReviewGate/metaReviewGateFindingsParityApi.js");

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
