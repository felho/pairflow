import { randomUUID } from "node:crypto";

import { metaReviewCommandSubmitDefaults } from "../../../core/runtime/metaReviewCommandSubmitDefaults.js";
import {
  isInteger,
  isNonEmptyString,
  isRecord
} from "../validation/primitives.js";
import { MetaReviewError } from "./metaReviewError.js";
import {
  normalizeOptionalText,
  resolveCanonicalMetaReviewReportJson
} from "./metaReviewCanonicalization.js";
import {
  assertApproveRecommendationConsistentWithReviewerSnapshot,
  readLatestApproveReviewerSnapshot
} from "./metaReviewRuntimeParity.js";
import {
  assertActiveMetaReviewExecutionContext,
  assertMetaReviewExecutionWindowActive,
  assertMetaReviewSubmitterAuthority
} from "./metaReviewCommandSubmitAuthority.js";
import {
  assertRunPayloadInvariants,
  mapRecommendationToStatus,
  normalizeRequiredSubmitText
} from "./metaReviewCommandSubmitValidation.js";
import {
  assertSummaryStructuredParity,
} from "./metaReviewCommandSubmitParity.js";
import {
  resolveSubmitCanonicalRunId
} from "./metaReviewCommandSubmitLink.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput
} from "./metaReviewCommandContract.js";

export interface PreparedMetaReviewSubmitContext {
  resolved: Awaited<ReturnType<typeof metaReviewCommandSubmitDefaults.resolveBubbleById>>;
  loadedState: Awaited<ReturnType<typeof metaReviewCommandSubmitDefaults.readStateSnapshot>>;
  readFileFn: NonNullable<MetaReviewCommandDependencies["readFile"]>;
  writeFileFn: NonNullable<MetaReviewCommandDependencies["writeFile"]>;
  recommendation: MetaReviewSubmitInput["recommendation"];
  status: ReturnType<typeof mapRecommendationToStatus>;
  summary: string;
  reworkTargetMessage: string | null;
  reportJson: Record<string, unknown>;
  generatedRunId: string;
  runId: string;
  canonicalReportJson: Record<string, unknown>;
  latestReviewerSnapshot: Awaited<
    ReturnType<typeof readLatestApproveReviewerSnapshot>
  >;
  executionContext: ReturnType<typeof assertActiveMetaReviewExecutionContext>;
  now: Date;
}

function resolveMetaReviewArtifactReadPort(
  bubbleId: string,
  dependencies: MetaReviewCommandDependencies
): NonNullable<MetaReviewCommandDependencies["readFile"]> {
  if (dependencies.readFile !== undefined) {
    return dependencies.readFile;
  }
  throw new MetaReviewError({
    reasonCode: "META_REVIEW_UNKNOWN_ERROR",
    message: "meta-review artifact read capability is unavailable.",
    context: {
      source: "meta_review_command_submit_preparation",
      bubbleId,
      reason: "artifact_read_capability_unavailable"
    }
  });
}

function resolveMetaReviewArtifactWritePort(
  bubbleId: string,
  dependencies: MetaReviewCommandDependencies
): NonNullable<MetaReviewCommandDependencies["writeFile"]> {
  if (dependencies.writeFile !== undefined) {
    return dependencies.writeFile;
  }
  throw new MetaReviewError({
    reasonCode: "META_REVIEW_UNKNOWN_ERROR",
    message: "meta-review artifact write capability is unavailable.",
    context: {
      source: "meta_review_command_submit_preparation",
      bubbleId,
      reason: "artifact_write_capability_unavailable"
    }
  });
}

function resolveValidatedSubmitShape(input: {
  submitInput: MetaReviewSubmitInput;
  loadedState: Awaited<
    ReturnType<typeof metaReviewCommandSubmitDefaults.readStateSnapshot>
  >;
  now: Date;
  randomUuidFn: () => string;
}): {
  recommendation: MetaReviewSubmitInput["recommendation"];
  status: ReturnType<typeof mapRecommendationToStatus>;
  summary: string;
  reworkTargetMessage: string | null;
  reportJson: Record<string, unknown>;
  generatedRunId: string;
  updatedAt: string;
} {
  if (!isInteger(input.submitInput.round) || input.submitInput.round < 1) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID",
      message: "meta-review submit round must be a positive integer",
      context: {
        source: "meta_review_command_submit_preparation",
        bubbleId: input.submitInput.bubbleId,
        round: input.submitInput.round,
        reason: "round_must_be_positive_integer"
      }
    });
  }

  if (input.submitInput.round !== input.loadedState.state.round) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_ROUND_MISMATCH",
      message: `meta-review submit round mismatch (active: ${input.loadedState.state.round}, received: ${input.submitInput.round}).`,
      context: {
        source: "meta_review_command_submit_preparation",
        bubbleId: input.submitInput.bubbleId,
        round: input.submitInput.round,
        reason: "submit_round_mismatch"
      }
    });
  }

  if (
    input.submitInput.recommendation !== "approve" &&
    input.submitInput.recommendation !== "rework" &&
    input.submitInput.recommendation !== "inconclusive"
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID",
      message:
        "meta-review submit recommendation must be one of: approve, rework, inconclusive",
      context: {
        source: "meta_review_command_submit_preparation",
        bubbleId: input.submitInput.bubbleId,
        round: input.submitInput.round,
        reason: "recommendation_not_in_allowed_set"
      }
    });
  }

  if (
    input.submitInput.report_json === undefined ||
    !isRecord(input.submitInput.report_json)
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID",
      message: "meta-review submit report_json is required and must be an object",
      context: {
        source: "meta_review_command_submit_preparation",
        bubbleId: input.submitInput.bubbleId,
        round: input.submitInput.round,
        reason: "report_json_missing_or_invalid"
      }
    });
  }

  const reportJson = input.submitInput.report_json;
  const updatedAt = input.now.toISOString();
  const runIdRaw = input.randomUuidFn();
  if (!isNonEmptyString(runIdRaw)) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID",
      message: "meta-review submit run_id must be a non-empty string",
      context: {
        source: "meta_review_command_submit_preparation",
        bubbleId: input.submitInput.bubbleId,
        round: input.submitInput.round,
        reason: "generated_run_id_empty"
      }
    });
  }

  const recommendation = input.submitInput.recommendation;
  const status = mapRecommendationToStatus(recommendation);
  const summary = normalizeRequiredSubmitText(input.submitInput.summary, "summary");
  const reworkTargetMessage = normalizeOptionalText(
    input.submitInput.rework_target_message ?? undefined
  );
  assertRunPayloadInvariants({
    recommendation,
    status,
    reworkTargetMessage
  });
  assertSummaryStructuredParity({
    recommendation,
    summary,
    reportJson
  });

  return {
    recommendation,
    status,
    summary,
    reworkTargetMessage,
    reportJson,
    generatedRunId: runIdRaw.trim(),
    updatedAt
  };
}

export async function prepareMetaReviewSubmitContext(input: {
  submitInput: MetaReviewSubmitInput;
  dependencies: MetaReviewCommandDependencies;
  now: Date;
}): Promise<PreparedMetaReviewSubmitContext> {
  const resolveBubble =
    input.dependencies.resolveBubbleById ?? metaReviewCommandSubmitDefaults.resolveBubbleById;
  const readState =
    input.dependencies.readStateSnapshot ?? metaReviewCommandSubmitDefaults.readStateSnapshot;
  const readRuntimeSessions =
    input.dependencies.readRuntimeSessionsRegistry
    ?? metaReviewCommandSubmitDefaults.readRuntimeSessionsRegistry;
  const readFileFn = resolveMetaReviewArtifactReadPort(
    input.submitInput.bubbleId,
    input.dependencies
  );
  const writeFileFn = resolveMetaReviewArtifactWritePort(
    input.submitInput.bubbleId,
    input.dependencies
  );
  const randomUuidFn = input.dependencies.randomUUID ?? randomUUID;

  const resolved = await resolveBubble({
    bubbleId: input.submitInput.bubbleId,
    ...(input.submitInput.repoPath !== undefined
      ? { repoPath: input.submitInput.repoPath }
      : {}),
    ...(input.submitInput.cwd !== undefined ? { cwd: input.submitInput.cwd } : {})
  });

  const loadedState = await readState(resolved.bubblePaths.statePath);
  await assertMetaReviewSubmitterAuthority({
    bubbleId: resolved.bubbleId,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    readRuntimeSessions,
    state: loadedState.state,
    ...(input.dependencies.now !== undefined ? { now: input.now } : {})
  });

  const validated = resolveValidatedSubmitShape({
    submitInput: input.submitInput,
    loadedState,
    now: input.now,
    randomUuidFn
  });

  const runId = resolveSubmitCanonicalRunId({
    recommendation: validated.recommendation,
    reportJson: validated.reportJson,
    generatedRunId: validated.generatedRunId
  });
  const canonicalReportJson = resolveCanonicalMetaReviewReportJson({
    recommendation: validated.recommendation,
    reportJson: validated.reportJson,
    runId
  });
  const latestReviewerSnapshot = await readLatestApproveReviewerSnapshot({
    recommendation: validated.recommendation,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    round: input.submitInput.round
  });
  assertApproveRecommendationConsistentWithReviewerSnapshot({
    latestSnapshot: latestReviewerSnapshot,
    summary: validated.summary,
    reportJson: canonicalReportJson
  });
  const executionContext = assertActiveMetaReviewExecutionContext(
    loadedState.state
  );
  if (input.dependencies.now !== undefined) {
    assertMetaReviewExecutionWindowActive({
      bubbleId: resolved.bubbleId,
      executionContext,
      now: input.now
    });
  }

  return {
    resolved,
    loadedState,
    readFileFn,
    writeFileFn,
    recommendation: validated.recommendation,
    status: validated.status,
    summary: validated.summary,
    reworkTargetMessage: validated.reworkTargetMessage,
    reportJson: validated.reportJson,
    generatedRunId: validated.generatedRunId,
    runId,
    canonicalReportJson,
    latestReviewerSnapshot,
    executionContext,
    now: input.now
  };
}
