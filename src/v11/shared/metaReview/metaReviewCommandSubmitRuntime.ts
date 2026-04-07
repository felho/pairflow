import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import {
  resolveBubbleById
} from "../../../core/bubble/bubbleLookup.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../core/state/stateStore.js";
import { readRuntimeSessionsRegistry } from "../../../core/runtime/sessionsRegistry.js";
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
import {
  assertSubmitReworkFindingsArtifactContract,
  buildCanonicalSubmitRunResult,
  writeCanonicalSubmitReportArtifact,
  writeCanonicalSubmitState
} from "./metaReviewCommandSubmitPersistence.js";
import {
  assertSubmitRecommendationRouteable,
  finalizeMetaReviewSubmitResult,
  recoverMetaReviewSubmitRoute
} from "./metaReviewCommandSubmitRouting.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "./metaReviewCommandContract.js";

export async function submitMetaReviewResult(
  input: MetaReviewSubmitInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewSubmitResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const readRuntimeSessions =
    dependencies.readRuntimeSessionsRegistry ?? readRuntimeSessionsRegistry;
  const readFileFn = dependencies.readFile ?? readFile;
  const writeFileFn = dependencies.writeFile ?? writeFile;
  const randomUuidFn = dependencies.randomUUID ?? randomUUID;
  const now = dependencies.now ?? new Date();

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const loadedState = await readState(resolved.bubblePaths.statePath);
  await assertMetaReviewSubmitterAuthority({
    bubbleId: resolved.bubbleId,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    readRuntimeSessions,
    state: loadedState.state
  });

  if (!isInteger(input.round) || input.round < 1) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit round must be a positive integer"
    );
  }

  if (input.round !== loadedState.state.round) {
    throw new MetaReviewError(
      "META_REVIEW_ROUND_MISMATCH",
      `meta-review submit round mismatch (active: ${loadedState.state.round}, received: ${input.round}).`
    );
  }

  if (
    input.recommendation !== "approve" &&
    input.recommendation !== "rework" &&
    input.recommendation !== "inconclusive"
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit recommendation must be one of: approve, rework, inconclusive"
    );
  }

  if (input.report_json === undefined || !isRecord(input.report_json)) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json is required and must be an object"
    );
  }
  const reportJson = input.report_json;

  const updatedAt = now.toISOString();
  const runIdRaw = randomUuidFn();
  if (!isNonEmptyString(runIdRaw)) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit run_id must be a non-empty string"
    );
  }
  const generatedRunId = runIdRaw.trim();
  const recommendation = input.recommendation;
  const status = mapRecommendationToStatus(recommendation);
  const summary = normalizeRequiredSubmitText(input.summary, "summary");
  const reworkTargetMessage = normalizeOptionalText(
    input.rework_target_message ?? undefined
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
  const runId = resolveSubmitCanonicalRunId({
    recommendation,
    reportJson,
    generatedRunId
  });
  const canonicalReportJson = resolveCanonicalMetaReviewReportJson({
    recommendation,
    reportJson,
    runId
  });
  const latestReviewerSnapshot = await readLatestApproveReviewerSnapshot({
    recommendation,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    round: input.round
  });
  assertApproveRecommendationConsistentWithReviewerSnapshot({
    latestSnapshot: latestReviewerSnapshot,
    summary,
    reportJson: canonicalReportJson
  });
  const executionContext = assertActiveMetaReviewExecutionContext(
    loadedState.state
  );
  if (
    input.expectedStateFingerprint !== undefined &&
    loadedState.fingerprint !== input.expectedStateFingerprint
  ) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      "meta-review submit rejected: canonical actor state fingerprint mismatch."
    );
  }
  if (
    input.expectedHandoffId !== undefined &&
    executionContext.handoff_id !== input.expectedHandoffId
  ) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      `meta-review submit rejected: canonical actor handoff mismatch (active: ${executionContext.handoff_id}, received: ${input.expectedHandoffId}).`
    );
  }
  if (
    input.expectedRole !== undefined &&
    executionContext.active_role !== input.expectedRole
  ) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      `meta-review submit rejected: canonical actor role mismatch (active: ${executionContext.active_role}, received: ${input.expectedRole}).`
    );
  }
  if (
    input.expectedRound !== undefined &&
    executionContext.round !== input.expectedRound
  ) {
    throw new MetaReviewError(
      "META_REVIEW_ROUND_MISMATCH",
      `meta-review submit rejected: canonical actor round mismatch (active: ${executionContext.round}, received: ${input.expectedRound}).`
    );
  }
  const updatedAtMs = Date.parse(updatedAt);
  const startedAtMs = Date.parse(executionContext.started_at);
  const deadlineAtMs = Date.parse(executionContext.deadline_at);
  if (
    Number.isNaN(updatedAtMs) ||
    Number.isNaN(startedAtMs) ||
    Number.isNaN(deadlineAtMs) ||
    updatedAtMs < startedAtMs ||
    updatedAtMs > deadlineAtMs
  ) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      `meta-review submit rejected: canonical authority window is closed for ${executionContext.handoff_id} (${executionContext.started_at} -> ${executionContext.deadline_at}).`
    );
  }

  await writeCanonicalSubmitState({
    resolved,
    loadedState,
    submitInput: input,
    recommendation,
    status,
    summary,
    reworkTargetMessage,
    runId,
    updatedAt,
    readState,
    writeState,
    executionContext
  });

  const warnings = await writeCanonicalSubmitReportArtifact({
    resolved,
    submitInput: input,
    runId,
    updatedAt,
    status,
    recommendation,
    summary,
    reworkTargetMessage,
    canonicalReportJson,
    writeFileFn
  });

  const canonicalRunResult = buildCanonicalSubmitRunResult({
    bubbleId: resolved.bubbleId,
    runId,
    status,
    recommendation,
    summary,
    reworkTargetMessage,
    updatedAt,
    warnings,
    reportJson: canonicalReportJson
  });

  await assertSubmitReworkFindingsArtifactContract({
    bubbleDir: resolved.bubblePaths.bubbleDir,
    artifactsDir: resolved.bubblePaths.artifactsDir,
    runResult: canonicalRunResult,
    reportJson: canonicalReportJson,
    readFileFn
  });

  assertSubmitRecommendationRouteable(recommendation);

  const routed = await recoverMetaReviewSubmitRoute({
    resolved,
    repoPath: resolved.repoPath,
    now,
    canonicalRunResult,
    dependencies
  });

  return finalizeMetaReviewSubmitResult({
    resolved,
    routed,
    dependencies,
    canonicalRunResult,
    canonicalReportJson
  });
}
