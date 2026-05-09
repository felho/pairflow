import { randomUUID } from "node:crypto";

import {
  readStateSnapshot,
  resolveBubbleById
} from "../../../start/startCommandDependencyDefaults.js";
import {
  isInteger,
  isNonEmptyString,
  isRecord
} from "../../../../shared/validation/primitives.js";
import { MetaReviewError } from "../../../../shared/metaReview/metaReviewError.js";
import {
  normalizeOptionalText,
  resolveCanonicalMetaReviewReportJson
} from "../../../../shared/metaReview/metaReviewCanonicalization.js";
import {
  assertApproveRecommendationConsistentWithReviewerSnapshot,
  readLatestApproveReviewerSnapshot
} from "../../metaReviewRuntimeParity.js";
import {
  assertActiveMetaReviewExecutionContext,
  assertMetaReviewSubmitStaleGuard,
  assertMetaReviewSubmitterAuthority
} from "./authority.js";
import {
  assertSubmitPayloadInvariants,
  assertSubmitStatusIsSuccess,
  resolveSubmitRunStatus,
  normalizeRequiredSubmitText
} from "./validation.js";
import {
  metaReviewApproveClaimsOpenFindings,
  metaReviewApproveThresholdBlockedReasonCode,
  metaReviewApproveThresholdContextUnresolvedReasonCode,
  resolveMetaReviewSubmitApproveThresholdPolicy
} from "../../../../domain/metaReviewGate/approveSubmitThresholdPolicy.js";
import {
  assertSummaryStructuredParity,
} from "./parity.js";
import {
  resolveSubmitCanonicalRunId
} from "./link.js";
import {
  resolveMetaReviewGateThresholdAuthority
} from "../../../metaReviewGate/metaReviewGateThresholdAuthorityApi.js";
import { normalizeBubbleReviewPolicy } from "../../../../shared/reviewPolicy/reviewPolicyRuntime.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput
} from "../../../../shared/metaReview/metaReviewCommandContract.js";

type MetaReviewSubmitPreparationPorts = {
  resolveBubble: NonNullable<MetaReviewCommandDependencies["resolveBubbleById"]>;
  readState: NonNullable<MetaReviewCommandDependencies["readStateSnapshot"]>;
  readRuntimeSessions: NonNullable<
    MetaReviewCommandDependencies["readRuntimeSessionsRegistry"]
  >;
  readFileFn: NonNullable<MetaReviewCommandDependencies["readFile"]>;
  randomUuidFn: () => string;
};

const metaReviewCommandSubmitDefaults = {
  readStateSnapshot,
  resolveBubbleById
} as const;

export interface PreparedMetaReviewSubmitContext {
  resolved: Awaited<ReturnType<typeof metaReviewCommandSubmitDefaults.resolveBubbleById>>;
  loadedState: Awaited<ReturnType<typeof metaReviewCommandSubmitDefaults.readStateSnapshot>>;
  readFileFn: NonNullable<MetaReviewCommandDependencies["readFile"]>;
  recommendation: MetaReviewSubmitInput["recommendation"];
  status: ReturnType<typeof resolveSubmitRunStatus>;
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

function resolveMetaReviewRuntimeSessionsPort(
  bubbleId: string,
  dependencies: MetaReviewCommandDependencies
): NonNullable<MetaReviewCommandDependencies["readRuntimeSessionsRegistry"]> {
  if (dependencies.readRuntimeSessionsRegistry !== undefined) {
    return dependencies.readRuntimeSessionsRegistry;
  }
  throw new MetaReviewError({
    reasonCode: "META_REVIEW_UNKNOWN_ERROR",
    message: "meta-review runtime session read capability is unavailable.",
    context: {
      source: "meta_review_command_submit_preparation",
      bubbleId,
      reason: "runtime_session_read_capability_unavailable"
    }
  });
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

function resolveMetaReviewSubmitPreparationPorts(input: {
  submitInput: MetaReviewSubmitInput;
  dependencies: MetaReviewCommandDependencies;
}): MetaReviewSubmitPreparationPorts {
  return {
    resolveBubble:
      input.dependencies.resolveBubbleById ??
      metaReviewCommandSubmitDefaults.resolveBubbleById,
    readState:
      input.dependencies.readStateSnapshot ??
      metaReviewCommandSubmitDefaults.readStateSnapshot,
    readRuntimeSessions: resolveMetaReviewRuntimeSessionsPort(
      input.submitInput.bubbleId,
      input.dependencies
    ),
    readFileFn: resolveMetaReviewArtifactReadPort(
      input.submitInput.bubbleId,
      input.dependencies
    ),
    randomUuidFn: input.dependencies.randomUUID ?? randomUUID
  };
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
  status: ReturnType<typeof resolveSubmitRunStatus>;
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
  const status = resolveSubmitRunStatus();
  const summary = normalizeRequiredSubmitText(input.submitInput.summary, "summary");
  const reworkTargetMessage = normalizeOptionalText(
    input.submitInput.rework_target_message ?? undefined
  );
  assertSubmitStatusIsSuccess(status);
  assertSubmitPayloadInvariants({
    recommendation,
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

async function assertApproveThresholdPolicyIfNeeded(input: {
  resolved: Awaited<
    ReturnType<typeof metaReviewCommandSubmitDefaults.resolveBubbleById>
  >;
  validated: ReturnType<typeof resolveValidatedSubmitShape>;
  runId: string;
  canonicalReportJson: Record<string, unknown>;
  readFileFn: NonNullable<MetaReviewCommandDependencies["readFile"]>;
  round: number;
}): Promise<void> {
  if (
    input.validated.recommendation !== "approve" ||
    !metaReviewApproveClaimsOpenFindings(input.canonicalReportJson)
  ) {
    return;
  }

  const normalizedReviewPolicy = normalizeBubbleReviewPolicy(
    input.resolved.bubbleConfig
  );
  const thresholdAuthority = await resolveMetaReviewGateThresholdAuthority({
    runResult: {
      bubble_id: input.resolved.bubbleId,
      run_id: input.runId,
      status: input.validated.status,
      recommendation: input.validated.recommendation,
      summary: input.validated.summary,
      rework_target_message: input.validated.reworkTargetMessage,
      updated_at: input.validated.updatedAt,
      warnings: [],
      report_json: input.canonicalReportJson
    },
    bubbleDir: input.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.resolved.bubblePaths.artifactsDir,
    readFileFn: input.readFileFn
  });
  const policy = resolveMetaReviewSubmitApproveThresholdPolicy({
    recommendation: input.validated.recommendation,
    reportJson: input.canonicalReportJson,
    minSeverity: normalizedReviewPolicy.meta_review_auto_rework_min_severity,
    thresholdAuthority
  });
  if (policy.accepted) {
    return;
  }

  if (
    policy.reasonCode === metaReviewApproveThresholdContextUnresolvedReasonCode
  ) {
    throw new MetaReviewError({
      reasonCode: metaReviewApproveThresholdContextUnresolvedReasonCode,
      message:
        "meta-review approve rejected: open-findings approve requires resolved same-run threshold authority.",
      context: {
        source: "meta_review_command_submit_preparation",
        bubbleId: input.resolved.bubbleId,
        round: input.round,
        reason: policy.reason,
        configuredMinSeverity:
          normalizedReviewPolicy.meta_review_auto_rework_min_severity,
        thresholdStatus: policy.thresholdStatus ?? "missing"
      }
    });
  }

  throw new MetaReviewError({
    reasonCode: metaReviewApproveThresholdBlockedReasonCode,
    message:
      "meta-review approve rejected: highest same-run open severity meets the configured premature-approval guard threshold; emit rework instead.",
    context: {
      source: "meta_review_command_submit_preparation",
      bubbleId: input.resolved.bubbleId,
      round: input.round,
      reason: policy.reason,
      configuredMinSeverity:
        normalizedReviewPolicy.meta_review_auto_rework_min_severity,
      highestOpenSeverity: policy.highestOpenSeverity,
      artifactRef: policy.artifactRef,
      metaReviewRunId: policy.metaReviewRunId
    }
  });
}

export async function prepareAcceptedMetaReviewSubmit(input: {
  submitInput: MetaReviewSubmitInput;
  dependencies: MetaReviewCommandDependencies;
  now: Date;
}): Promise<PreparedMetaReviewSubmitContext> {
  const ports = resolveMetaReviewSubmitPreparationPorts(input);

  const resolved = await ports.resolveBubble({
    bubbleId: input.submitInput.bubbleId,
    ...(input.submitInput.repoPath !== undefined
      ? { repoPath: input.submitInput.repoPath }
      : {}),
    ...(input.submitInput.cwd !== undefined ? { cwd: input.submitInput.cwd } : {})
  });

  const loadedState = await ports.readState(resolved.bubblePaths.statePath);
  await assertMetaReviewSubmitterAuthority({
    bubbleId: resolved.bubbleId,
    metaReviewerAgent: resolved.bubbleConfig.agents.meta_reviewer,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    readRuntimeSessions: ports.readRuntimeSessions,
    state: loadedState.state,
    ...(input.dependencies.now !== undefined ? { now: input.now } : {})
  });
  const executionContext = assertActiveMetaReviewExecutionContext(
    loadedState.state
  );
  assertMetaReviewSubmitStaleGuard({
    bubbleId: resolved.bubbleId,
    executionContext,
    stateFingerprint: loadedState.fingerprint,
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
      : {}),
    ...(input.submitInput.expectedStateFingerprint !== undefined
      ? { expectedStateFingerprint: input.submitInput.expectedStateFingerprint }
      : {})
  });

  const validated = resolveValidatedSubmitShape({
    submitInput: input.submitInput,
    loadedState,
    now: input.now,
    randomUuidFn: ports.randomUuidFn
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
  await assertApproveThresholdPolicyIfNeeded({
    resolved,
    validated,
    runId,
    canonicalReportJson,
    readFileFn: ports.readFileFn,
    round: input.submitInput.round
  });

  return {
    resolved,
    loadedState,
    readFileFn: ports.readFileFn,
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
