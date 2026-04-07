import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import {
  resolveBubbleById
} from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  StateStoreConflictError,
  readStateSnapshot,
  writeStateSnapshot
} from "../../infrastructure/state/stateStore.js";
import { readRuntimeSessionsRegistry } from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import {
  isInteger,
  isNonEmptyString,
  isRecord
} from "../validation/primitives.js";
import { normalizeStringList } from "../normalization/stringNormalization.js";
import {
  isMetaReviewExecutionContextActiveState
} from "./metaReviewExecutionContext.js";
import {
  hasCanonicalSubmitForActiveMetaReviewRound,
  normalizeMetaReviewSnapshot
} from "./metaReviewSnapshot.js";
import { MetaReviewError } from "./metaReviewError.js";
import {
  CANONICAL_META_REVIEW_REPORT_REF,
  normalizeOptionalText,
  resolveCanonicalMetaReviewReportJson
} from "./metaReviewCanonicalization.js";
import { toMetaReviewExecutionContext } from "../state/executionContext.js";
import {
  resolveReworkFindingsParityInput
} from "../metaReviewGate/metaReviewGateFindingsParityInput.js";
import {
  validateFindingsArtifactParity
} from "../metaReviewGate/metaReviewGateFindingsParityHelpers.js";
import type {
  RecoverMetaReviewGateFromSnapshotDependencies
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import type {
  recoverMetaReviewGateFromSnapshot
} from "../metaReviewGate/metaReviewGateRecovery.js";
import {
  executeImplementerHandoffDelivery
} from "../delivery/implementerHandoffDelivery.js";
import {
  assertApproveRecommendationConsistentWithReviewerSnapshot,
  readLatestApproveReviewerSnapshot
} from "./metaReviewRuntimeParity.js";
import {
  assertActiveMetaReviewExecutionContext,
  assertMetaReviewSubmitterAuthority,
  assertRunPayloadInvariants,
  assertSummaryStructuredParity,
  mapRecommendationToStatus,
  normalizeRequiredSubmitText,
  resolveSubmitCanonicalRunId
} from "./metaReviewCommandSubmitSupport.js";
import {
  stateWriteConflictToMetaReviewError,
  toMetaReviewError
} from "./metaReviewCommandErrorMapping.js";
import type {
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewResult,
  MetaReviewRunWarning,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "./metaReviewCommandContract.js";

type RecoverMetaReviewGateFromSnapshotFn = typeof recoverMetaReviewGateFromSnapshot;

async function resolveMetaReviewGateRecoveryExecutor(
  dependencies: MetaReviewCommandDependencies
): Promise<RecoverMetaReviewGateFromSnapshotFn> {
  if (dependencies.recoverMetaReviewGateFromSnapshot !== undefined) {
    return dependencies.recoverMetaReviewGateFromSnapshot;
  }
  const module = await import("../metaReviewGate/metaReviewGateRecovery.js");
  return module.recoverMetaReviewGateFromSnapshot;
}

function buildMetaReviewGateRecoveryDependencies(
  dependencies: MetaReviewCommandDependencies
): RecoverMetaReviewGateFromSnapshotDependencies {
  return {
    ...(dependencies.resolveBubbleById !== undefined
      ? { resolveBubbleById: dependencies.resolveBubbleById }
      : {}),
    ...(dependencies.readStateSnapshot !== undefined
      ? { readStateSnapshot: dependencies.readStateSnapshot }
      : {}),
    ...(dependencies.writeStateSnapshot !== undefined
      ? { writeStateSnapshot: dependencies.writeStateSnapshot }
      : {}),
    ...(dependencies.appendProtocolEnvelope !== undefined
      ? { appendProtocolEnvelope: dependencies.appendProtocolEnvelope }
      : {}),
    ...(dependencies.readFile !== undefined
      ? { readFile: dependencies.readFile }
      : {}),
    ...(dependencies.writeFile !== undefined
      ? { writeFile: dependencies.writeFile }
      : {})
  };
}

function buildCanonicalSubmitRunResult(input: {
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

function assertSubmitRecommendationRouteable(
  recommendation: MetaReviewRecommendation
): void {
  if (recommendation !== "inconclusive") {
    return;
  }
  throw new MetaReviewError(
    "META_REVIEW_GATE_RUN_FAILED",
    "meta-review submit recorded a canonical snapshot but recommendation=inconclusive is not routeable in the normal submit handoff. Use recovery only as fallback."
  );
}

async function assertSubmitReworkFindingsArtifactContract(input: {
  bubbleDir: string;
  artifactsDir: string;
  runResult: MetaReviewResult;
  reportJson: Record<string, unknown>;
  readFileFn: typeof readFile;
}): Promise<void> {
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

async function emitSubmitAutoReworkDelivery(input: {
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  routed: Awaited<ReturnType<RecoverMetaReviewGateFromSnapshotFn>>;
  dependencies: MetaReviewCommandDependencies;
}): Promise<void> {
  if (input.routed.route !== "auto_rework") {
    return;
  }

  const emitDelivery =
    input.dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const messageRef = resolveDeliveryMessageRef({
    bubbleId: input.resolved.bubbleId,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: input.routed.gateEnvelope
  });

  await executeImplementerHandoffDelivery({
    deliveryInput: {
      bubbleId: input.resolved.bubbleId,
      bubbleConfig: input.resolved.bubbleConfig,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope: input.routed.gateEnvelope,
      messageRef
    },
    emitDelivery
  });
}

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

  const previousMetaReview = normalizeMetaReviewSnapshot(loadedState.state.meta_review);
  if (
    hasCanonicalSubmitForActiveMetaReviewRound({
      state: loadedState.state,
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
    execution_context: toMetaReviewExecutionContext(executionContext),
    last_autonomous_run_id: runId,
    last_autonomous_status: status,
    last_autonomous_recommendation: recommendation,
    last_autonomous_summary: summary,
    last_autonomous_report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    last_autonomous_rework_target_message: reworkTargetMessage,
    last_autonomous_updated_at: updatedAt
  };

  const nextState: BubbleStateSnapshot = {
    ...loadedState.state,
    execution_context: executionContext,
    meta_review: nextMetaReview
  };

  try {
    await writeState(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      const latest = await readState(resolved.bubblePaths.statePath);
      if (!isMetaReviewExecutionContextActiveState(latest.state)) {
        throw new MetaReviewError(
          "META_REVIEW_STATE_INVALID",
          `meta-review submit requires RUNNING state with active meta-review authority (current: ${latest.state.state}).`
        );
      }
      if (latest.state.round !== input.round) {
        throw new MetaReviewError(
          "META_REVIEW_ROUND_MISMATCH",
          `meta-review submit round mismatch (active: ${latest.state.round}, received: ${input.round}).`
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

  const warnings: MetaReviewRunWarning[] = [];
  const reportPayload = {
    bubble_id: resolved.bubbleId,
    run_id: runId,
    round: input.round,
    generated_at: updatedAt,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    report_json_ref: CANONICAL_META_REVIEW_REPORT_REF,
    refs: normalizeStringList(input.refs ?? []),
    rework_target_message: reworkTargetMessage,
    warnings,
    report_json: canonicalReportJson
  };

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

  let routed;
  try {
    const recoverMetaReviewRoute =
      await resolveMetaReviewGateRecoveryExecutor(dependencies);
    routed = await recoverMetaReviewRoute(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath,
        cwd: resolved.bubblePaths.worktreePath,
        now,
        summary:
          "Meta-review submit completed; applying gate route from canonical snapshot.",
        runResult: canonicalRunResult
      },
      buildMetaReviewGateRecoveryDependencies(dependencies)
    );
  } catch (error) {
    throw toMetaReviewError(error);
  }

  await emitSubmitAutoReworkDelivery({
    resolved,
    routed,
    dependencies
  });

  const finalizedRunResult = routed.metaReviewRun ?? canonicalRunResult;
  return {
    bubbleId: resolved.bubbleId,
    status: finalizedRunResult.status,
    recommendation: finalizedRunResult.recommendation,
    summary: finalizedRunResult.summary,
    report_ref: finalizedRunResult.report_ref,
    rework_target_message: finalizedRunResult.rework_target_message,
    updated_at: finalizedRunResult.updated_at,
    lifecycle_state: routed.state.state,
    warnings: finalizedRunResult.warnings,
    report_json: finalizedRunResult.report_json ?? canonicalReportJson,
    gate_route: routed.route,
    gate_sequence: routed.gateSequence,
    gate_envelope_type: routed.gateEnvelope.type,
    ...(finalizedRunResult.run_id !== undefined
      ? { run_id: finalizedRunResult.run_id }
      : {})
  };
}
