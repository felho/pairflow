import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import {
  BubbleLookupError,
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
  SchemaValidationError,
  isInteger,
  isNonEmptyString,
  isRecord
} from "../validation/primitives.js";
import { normalizeStringList } from "../normalization/stringNormalization.js";
import {
  isMetaReviewExecutionContextActiveState,
  validateActiveMetaReviewExecutionContext
} from "./metaReviewExecutionContext.js";
import {
  clearLiveMetaReviewSnapshot,
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
import type {
  AgentName,
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";
import {
  hasApproveFindingsSplitMetadata
} from "../../../types/protocol.js";
import type {
  FindingsParityStatus
} from "../../../types/protocol.js";
import {
  type LatestSameRoundReviewerSnapshot,
  readLatestSameRoundReviewerSnapshotFromTranscript,
  resolveFindingsOpenSplitFromReportJson,
  resolveFindingsParityMetadataFromReportJson
} from "../metaReviewGate/metaReviewGateFindingsMetadata.js";
import {
  resolveStructuredMetaReviewClaimFromReportJson
} from "../metaReviewGate/metaReviewGateFindingsClaimParsing.js";
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
  evaluateNoFindingsSummaryFindingsAssertion,
  evaluatePositiveSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion
} from "../../domain/convergence/policy.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewLastReportView,
  MetaReviewReadInput,
  MetaReviewResult,
  MetaReviewRunWarning,
  MetaReviewStatusView,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "./metaReviewCommandContract.js";

const metaReviewerSubmitterAgent: AgentName = "codex";
const metaReviewParityArtifactReadFailedReasonCode =
  "META_REVIEW_PARITY_ARTIFACT_READ_FAILED";
const metaReviewParityArtifactParseFailedReasonCode =
  "META_REVIEW_PARITY_ARTIFACT_PARSE_FAILED";
const metaReviewParityArtifactShapeInvalidReasonCode =
  "META_REVIEW_PARITY_ARTIFACT_SHAPE_INVALID";
const metaReviewParityArtifactReportJsonInvalidReasonCode =
  "META_REVIEW_PARITY_REPORT_JSON_INVALID";
const metaReviewSnapshotRoundStaleReasonCode = "META_REVIEW_SNAPSHOT_ROUND_STALE";
const metaReviewSnapshotRoundAheadReasonCode = "META_REVIEW_SNAPSHOT_ROUND_AHEAD";
const metaReviewSnapshotRoundMissingReasonCode =
  "META_REVIEW_SNAPSHOT_ROUND_MISSING";

type RecoverMetaReviewGateFromSnapshotFn = typeof recoverMetaReviewGateFromSnapshot;
type MetaReviewSnapshotRoundIdentity = "present" | "missing" | "unavailable";

interface MetaReviewFindingsParitySnapshot {
  findings_claimed_open_total: number | null;
  findings_artifact_open_total: number | null;
  findings_blocking_open_total: number | null;
  findings_advisory_open_total: number | null;
  findings_artifact_status: string | null;
  findings_digest_sha256: string | null;
  meta_review_run_id: string | null;
  findings_parity_status: FindingsParityStatus | null;
}

const emptyMetaReviewFindingsParitySnapshot: MetaReviewFindingsParitySnapshot = {
  findings_claimed_open_total: null,
  findings_artifact_open_total: null,
  findings_blocking_open_total: null,
  findings_advisory_open_total: null,
  findings_artifact_status: null,
  findings_digest_sha256: null,
  meta_review_run_id: null,
  findings_parity_status: null
};

interface MetaReviewParityArtifactReadResult {
  parity: MetaReviewFindingsParitySnapshot;
  diagnostics: string[];
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
}

function parseOptionalSubmitRunLinkField(
  value: unknown
): { status: "absent" } | { status: "valid"; value: string } | { status: "invalid" } {
  if (value === undefined || value === null) {
    return { status: "absent" };
  }
  if (typeof value !== "string") {
    return { status: "invalid" };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { status: "invalid" };
  }
  return { status: "valid", value: trimmed };
}

function resolveSubmitCanonicalRunId(input: {
  recommendation: MetaReviewRecommendation;
  reportJson: Record<string, unknown>;
  generatedRunId: string;
}): string {
  const reportJson = input.reportJson;
  const metaReviewRunId = parseOptionalSubmitRunLinkField(
    reportJson.meta_review_run_id
  );
  const findingsRunId = parseOptionalSubmitRunLinkField(
    reportJson.findings_run_id
  );

  if (metaReviewRunId.status === "invalid" || findingsRunId.status === "invalid") {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json run-link fields must be non-empty strings when provided"
    );
  }

  if (
    metaReviewRunId.status === "valid" &&
    findingsRunId.status === "valid" &&
    metaReviewRunId.value !== findingsRunId.value
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json run-link fields must match when both are provided"
    );
  }

  const providedRunId =
    metaReviewRunId.status === "valid"
      ? metaReviewRunId.value
      : findingsRunId.status === "valid"
        ? findingsRunId.value
        : null;

  if (input.recommendation === "rework" && providedRunId === null) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit recommendation=rework requires explicit report_json meta_review_run_id/findings_run_id linkage"
    );
  }

  return providedRunId ?? input.generatedRunId;
}

function requireStructuredMetaReviewClaim(
  reportJson: Record<string, unknown>
): {
  state: "clean" | "open_findings" | "unknown";
  source: "meta_review_artifact";
} {
  const parsed = resolveStructuredMetaReviewClaimFromReportJson({ reportJson });
  if ("reason" in parsed) {
    throw new MetaReviewError("META_REVIEW_SCHEMA_INVALID", parsed.reason);
  }
  if (parsed.claim === undefined) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json requires findings_claim_state and findings_claim_source fields"
    );
  }
  return parsed.claim;
}

function requireStructuredFindingsCount(reportJson: Record<string, unknown>): number {
  if (!Object.hasOwn(reportJson, "findings_count")) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json.findings_count is required and must be a non-negative integer"
    );
  }
  const explicitCount = reportJson.findings_count;
  if (!isInteger(explicitCount) || explicitCount < 0) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json.findings_count is required and must be a non-negative integer"
    );
  }
  return explicitCount;
}

function assertSummaryStructuredParity(input: {
  recommendation: MetaReviewRecommendation;
  summary: string;
  reportJson: Record<string, unknown>;
}): void {
  const structuredClaim = requireStructuredMetaReviewClaim(input.reportJson);
  const structuredCount = requireStructuredFindingsCount(input.reportJson);
  if (
    (structuredClaim.state === "open_findings" && structuredCount === 0) ||
    (structuredClaim.state === "clean" && structuredCount > 0)
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit structured claim/count tuple is inconsistent"
    );
  }
  const summaryPositiveAssertion =
    evaluatePositiveSummaryFindingsAssertion(input.summary);
  const summaryNoFindingsAssertion =
    evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  const structuredHasOpenFindings =
    structuredClaim.state === "open_findings" || structuredCount > 0;

  if (summaryPositiveAssertion.hasPositiveAssertion && structuredCount === 0) {
    throw new MetaReviewError(
      "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH",
      "meta-review submit summary claims open findings while report_json.findings_count is 0"
    );
  }

  if (
    summaryNoFindingsAssertion.hasNoFindingsAssertion &&
    structuredHasOpenFindings
  ) {
    const split = resolveFindingsOpenSplitFromReportJson(input.reportJson);
    const claimedOpenTotal =
      normalizeNonNegativeInt(input.reportJson.findings_claimed_open_total)
      ?? structuredCount;
    const hasAdvisoryOnlyApproveOpenFindings =
      input.recommendation === "approve" &&
      structuredClaim.state === "open_findings" &&
      claimedOpenTotal > 0 &&
      split.findings_blocking_open_total === 0 &&
      split.findings_advisory_open_total === claimedOpenTotal;
    if (
      hasAdvisoryOnlyApproveOpenFindings &&
      !hasGlobalNoFindingsSummaryAssertion(input.summary)
    ) {
      return;
    }
    throw new MetaReviewError(
      "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH",
      "meta-review submit summary claims no findings while structured report_json claims open findings"
    );
  }
}

function normalizeNonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}


function readMetaReviewFindingsParitySnapshot(
  reportJson: Record<string, unknown> | undefined
): MetaReviewFindingsParitySnapshot {
  if (reportJson === undefined) {
    return { ...emptyMetaReviewFindingsParitySnapshot };
  }
  const claimCount = normalizeNonNegativeInt(
    reportJson.findings_claimed_open_total ?? reportJson.findings_count
  );
  const artifactCount = normalizeNonNegativeInt(
    reportJson.findings_artifact_open_total
  );
  const explicitBlockingCount = normalizeNonNegativeInt(
    reportJson.findings_blocking_open_total
  );
  const explicitAdvisoryCount = normalizeNonNegativeInt(
    reportJson.findings_advisory_open_total
  );
  const splitFromReportJson = resolveFindingsOpenSplitFromReportJson(reportJson);
  const blockingCount =
    explicitBlockingCount ?? splitFromReportJson.findings_blocking_open_total;
  const advisoryCount =
    explicitAdvisoryCount ?? splitFromReportJson.findings_advisory_open_total;
  const artifactStatus = isNonEmptyString(reportJson.findings_artifact_status)
    ? reportJson.findings_artifact_status.trim()
    : isNonEmptyString(reportJson.artifact_status)
      ? reportJson.artifact_status.trim()
      : null;
  const digest = isNonEmptyString(reportJson.findings_digest_sha256)
    ? reportJson.findings_digest_sha256.trim().toLowerCase()
    : null;
  const runId = isNonEmptyString(reportJson.meta_review_run_id)
    ? reportJson.meta_review_run_id.trim()
    : isNonEmptyString(reportJson.findings_run_id)
      ? reportJson.findings_run_id.trim()
      : null;
  const parityStatusRaw = isNonEmptyString(reportJson.findings_parity_status)
    ? reportJson.findings_parity_status.trim()
    : null;
  let parityStatus: "ok" | "mismatch" | "guard_failed" | null = null;
  if (
    parityStatusRaw === "ok" ||
    parityStatusRaw === "mismatch" ||
    parityStatusRaw === "guard_failed"
  ) {
    parityStatus = parityStatusRaw;
  }

  return {
    findings_claimed_open_total: claimCount,
    findings_artifact_open_total: artifactCount,
    findings_blocking_open_total: blockingCount,
    findings_advisory_open_total: advisoryCount,
    findings_artifact_status: artifactStatus,
    findings_digest_sha256: digest,
    meta_review_run_id: runId,
    findings_parity_status: parityStatus
  };
}

function assertApproveRecommendationConsistentWithReviewerSnapshot(
  input: {
    summary: string;
    reportJson: Record<string, unknown>;
    latestSnapshot: LatestSameRoundReviewerSnapshot | undefined;
  }
): void {
  const latestSnapshot = input.latestSnapshot;
  if (latestSnapshot === undefined || latestSnapshot.findings_open_total === null) {
    return;
  }

  const parityMetadata = resolveFindingsParityMetadataFromReportJson(input.reportJson);
  if (parityMetadata === null || !hasApproveFindingsSplitMetadata(parityMetadata)) {
    return;
  }

  const mismatchDetails: string[] = [];
  if (parityMetadata.findings_claimed_open_total !== latestSnapshot.findings_open_total) {
    mismatchDetails.push(
      `claimed=${parityMetadata.findings_claimed_open_total} snapshot_open_total=${latestSnapshot.findings_open_total}`
    );
  }
  if (
    latestSnapshot.findings_blocking_open_total !== null &&
    parityMetadata.findings_blocking_open_total
      !== latestSnapshot.findings_blocking_open_total
  ) {
    mismatchDetails.push(
      `blocking=${parityMetadata.findings_blocking_open_total} snapshot_blocking=${latestSnapshot.findings_blocking_open_total}`
    );
  }
  if (
    latestSnapshot.findings_advisory_open_total !== null &&
    parityMetadata.findings_advisory_open_total
      !== latestSnapshot.findings_advisory_open_total
  ) {
    mismatchDetails.push(
      `advisory=${parityMetadata.findings_advisory_open_total} snapshot_advisory=${latestSnapshot.findings_advisory_open_total}`
    );
  }
  if (mismatchDetails.length > 0) {
    throw new MetaReviewError(
      "META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT",
      `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT: latest same-round reviewer snapshot (${latestSnapshot.envelopeId}) contradicts approve report_json (${mismatchDetails.join("; ")}).`
    );
  }

  const noFindingsAssertion = evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  const advisoryOnlyOpenFindings =
    latestSnapshot.findings_open_total > 0 &&
    latestSnapshot.findings_blocking_open_total === 0 &&
    latestSnapshot.findings_advisory_open_total !== null &&
    latestSnapshot.findings_advisory_open_total === latestSnapshot.findings_open_total;
  if (
    noFindingsAssertion.hasNoFindingsAssertion &&
    latestSnapshot.findings_open_total > 0 &&
    !(
      advisoryOnlyOpenFindings &&
      !hasGlobalNoFindingsSummaryAssertion(input.summary)
    )
  ) {
    throw new MetaReviewError(
      "META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT",
      `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT: latest same-round reviewer snapshot (${latestSnapshot.envelopeId}) reports open findings, so clean approve summary cannot be emitted.`
    );
  }
}

async function readLatestApproveReviewerSnapshot(input: {
  recommendation: MetaReviewRecommendation;
  transcriptPath: string;
  round: number;
}): Promise<LatestSameRoundReviewerSnapshot | undefined> {
  if (input.recommendation !== "approve") {
    return undefined;
  }
  return readLatestSameRoundReviewerSnapshotFromTranscript(
    input.transcriptPath,
    input.round
  );
}

function mapRecommendationToStatus(
  recommendation: MetaReviewRecommendation
): MetaReviewRunStatus {
  return recommendation === "inconclusive" ? "inconclusive" : "success";
}

function assertRunPayloadInvariants(input: {
  recommendation: MetaReviewRecommendation;
  status: MetaReviewRunStatus;
  reworkTargetMessage: string | null;
}): void {
  if (
    input.recommendation === "rework" &&
    !isNonEmptyString(input.reworkTargetMessage)
  ) {
    throw new MetaReviewError(
      "META_REVIEW_REWORK_MESSAGE_INVALID",
      "meta-review run requires a non-empty rework target message when recommendation is rework"
    );
  }
  if (
    input.recommendation !== "rework" &&
    input.reworkTargetMessage !== null &&
    !isNonEmptyString(input.reworkTargetMessage)
  ) {
    throw new MetaReviewError(
      "META_REVIEW_REWORK_MESSAGE_INVALID",
      "meta-review run advisory rework target message must be non-empty when provided"
    );
  }

  if (
    (input.recommendation === "rework" || input.recommendation === "approve") &&
    input.status !== "success"
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID_COMBINATION",
      "invalid meta-review status/recommendation combination"
    );
  }

  if (
    (input.status === "error" || input.status === "inconclusive") &&
    input.recommendation !== "inconclusive"
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID_COMBINATION",
      "invalid meta-review status/recommendation combination"
    );
  }
}

function normalizeRequiredSubmitText(
  value: string,
  fieldName: "summary"
): string {
  if (!isNonEmptyString(value)) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      `meta-review submit ${fieldName} must be a non-empty string`
    );
  }
  return value.trim();
}

function assertActiveMetaReviewExecutionContext(
  state: BubbleStateSnapshot
) {
  const executionContextResult = validateActiveMetaReviewExecutionContext(state);
  if (executionContextResult.ok) {
    return executionContextResult.value;
  }
  throw new MetaReviewError(
    "META_REVIEW_STATE_INVALID",
    `meta-review canonical execution context is invalid (${executionContextResult.errors.map((error) => `${error.path}: ${error.message}`).join("; ")}).`
  );
}

async function assertMetaReviewSubmitterAuthority(input: {
  bubbleId: string;
  sessionsPath: string;
  readRuntimeSessions: typeof readRuntimeSessionsRegistry;
  state: BubbleStateSnapshot;
}): Promise<void> {
  assertActiveMetaReviewExecutionContext(input.state);

  const hasAnyActiveOwnership =
    input.state.active_agent !== null ||
    input.state.active_role !== null ||
    input.state.active_since !== null;
  const hasCompleteActiveOwnership =
    input.state.active_agent !== null &&
    input.state.active_role !== null &&
    input.state.active_since !== null;

  if (hasAnyActiveOwnership && !hasCompleteActiveOwnership) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      "meta-review submit rejected: active ownership fields are partially populated."
    );
  }

  if (!hasAnyActiveOwnership) {
    const sessions = await input.readRuntimeSessions(input.sessionsPath, {
      allowMissing: true
    });
    void sessions[input.bubbleId]?.metaReviewerPane;
    return;
  }

  if (input.state.active_role !== "meta_reviewer") {
    throw new MetaReviewError(
      "META_REVIEW_SENDER_MISMATCH",
      `meta-review submit rejected: active role mismatch (expected meta_reviewer, found ${String(input.state.active_role)}).`
    );
  }

  if (input.state.active_agent !== metaReviewerSubmitterAgent) {
    const activeAgent = input.state.active_agent ?? "null";
    throw new MetaReviewError(
      "META_REVIEW_SENDER_MISMATCH",
      `meta-review submit rejected: active meta-review ownership is missing or stale (active_agent=${activeAgent}; expected active_agent=${metaReviewerSubmitterAgent}).`
    );
  }

  const sessions = await input.readRuntimeSessions(input.sessionsPath, {
    allowMissing: true
  });
  void sessions[input.bubbleId]?.metaReviewerPane;
}

function resolveReportArtifactPath(input: {
  bubbleDir: string;
  artifactsDir: string;
  reportRef: string;
}): string {
  if (
    !input.reportRef.startsWith("artifacts/") ||
    input.reportRef.includes("..") ||
    input.reportRef.includes("\\") ||
    input.reportRef.includes("\0")
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "Invalid meta-review report_ref; expected a safe artifacts/* reference."
    );
  }

  const resolvedReportPath = resolve(input.bubbleDir, input.reportRef);
  const relativeToArtifacts = relative(input.artifactsDir, resolvedReportPath);

  if (
    relativeToArtifacts.startsWith("..") ||
    isAbsolute(relativeToArtifacts)
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "Invalid meta-review report_ref; resolved path escapes artifacts directory."
    );
  }

  return resolvedReportPath;
}

function createMetaReviewStatusView(
  bubbleId: string,
  snapshot: BubbleMetaReviewSnapshotState,
  projectionFreshness: MetaReviewStatusView["projection_freshness"],
  parity: MetaReviewFindingsParitySnapshot = emptyMetaReviewFindingsParitySnapshot,
  parityDiagnostics: string[] = []
): MetaReviewStatusView {
  const hasRun =
    snapshot.last_autonomous_status !== null &&
    snapshot.last_autonomous_recommendation !== null;

  return {
    bubbleId,
    has_run: hasRun,
    operator_surface: "projection_only",
    projection_freshness: projectionFreshness,
    auto_rework_count: snapshot.auto_rework_count,
    auto_rework_limit: snapshot.auto_rework_limit,
    sticky_human_gate: snapshot.sticky_human_gate,
    last_autonomous_run_id: snapshot.last_autonomous_run_id,
    last_autonomous_status: snapshot.last_autonomous_status,
    last_autonomous_recommendation: snapshot.last_autonomous_recommendation,
    last_autonomous_summary: snapshot.last_autonomous_summary,
    last_autonomous_report_ref: snapshot.last_autonomous_report_ref,
    last_autonomous_rework_target_message:
      snapshot.last_autonomous_rework_target_message,
    last_autonomous_updated_at: snapshot.last_autonomous_updated_at,
    findings_claimed_open_total: parity.findings_claimed_open_total,
    findings_artifact_open_total: parity.findings_artifact_open_total,
    findings_blocking_open_total: parity.findings_blocking_open_total,
    findings_advisory_open_total: parity.findings_advisory_open_total,
    findings_artifact_status: parity.findings_artifact_status,
    findings_digest_sha256: parity.findings_digest_sha256,
    meta_review_run_id: parity.meta_review_run_id,
    findings_parity_status: parity.findings_parity_status,
    parity_diagnostics: [...parityDiagnostics]
  };
}

function isRoundLocalMetaReviewSnapshotOutsideCurrentRound(input: {
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: "present" | "missing" | "unavailable";
}): boolean {
  return (
    isInteger(input.currentRound) &&
    input.currentRound > 0 &&
    ((input.snapshotRoundIdentity === "missing" && input.snapshotRound === null) ||
      (input.snapshotRound !== null &&
        input.snapshotRound !== input.currentRound))
  );
}

function stateWriteConflictToMetaReviewError(error: unknown): MetaReviewError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewError(
    "META_REVIEW_SNAPSHOT_WRITE_CONFLICT",
    `Failed to persist meta-review snapshot due to concurrent update. ${reason}`
  );
}

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
  const nextMetaReview: BubbleMetaReviewSnapshotState = {
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

function resolveMetaReviewProjectionFreshness(input: {
  hasSnapshot: boolean;
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
  diagnostics?: string[];
}): MetaReviewStatusView["projection_freshness"] {
  if (!input.hasSnapshot) {
    return "no_snapshot";
  }
  if (input.snapshotRoundIdentity === "unavailable") {
    return "unknown";
  }
  if (
    input.snapshotRoundIdentity === "missing" &&
    input.snapshotRound === null &&
    isInteger(input.currentRound) &&
    input.currentRound > 0
  ) {
    return "round_missing";
  }
  if (
    input.snapshotRoundIdentity === "missing" ||
    !isInteger(input.currentRound) ||
    input.currentRound < 1 ||
    (input.snapshotRoundIdentity === "present" && input.snapshotRound === null)
  ) {
    return "unknown";
  }
  if (
    input.snapshotRound !== null &&
    isInteger(input.currentRound) &&
    input.currentRound > 0 &&
    input.snapshotRound < input.currentRound
  ) {
    return "stale";
  }
  if (
    input.snapshotRound !== null &&
    isInteger(input.currentRound) &&
    input.currentRound > 0 &&
    input.snapshotRound > input.currentRound
  ) {
    return "ahead";
  }
  if ((input.diagnostics ?? []).length > 0) {
    return "unknown";
  }
  return "current_round";
}

function resolveParityArtifactReadErrorCode(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return code.trim().toUpperCase();
    }
  }
  return "UNKNOWN";
}

function readMetaReviewParitySnapshotFromArtifactRaw(
  artifactRaw: string
): MetaReviewParityArtifactReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(artifactRaw);
  } catch {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [metaReviewParityArtifactParseFailedReasonCode],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  if (!isRecord(parsed)) {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [metaReviewParityArtifactShapeInvalidReasonCode],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  if (
    "report_json" in parsed &&
    parsed.report_json !== undefined &&
    !isRecord(parsed.report_json)
  ) {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [metaReviewParityArtifactReportJsonInvalidReasonCode],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  const reportJson = isRecord(parsed.report_json)
    ? parsed.report_json
    : parsed;
  const snapshotRound =
    typeof parsed.round === "number" && isInteger(parsed.round) && parsed.round > 0
      ? parsed.round
      : null;

  return {
    parity: readMetaReviewFindingsParitySnapshot(reportJson),
    diagnostics: [],
    snapshotRound,
    snapshotRoundIdentity: snapshotRound === null ? "missing" : "present"
  };
}

function resolveSnapshotFreshnessDiagnostics(input: {
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
}): string[] {
  if (!isInteger(input.currentRound) || input.currentRound < 1) {
    return [];
  }
  if (input.snapshotRoundIdentity === "missing" && input.snapshotRound === null) {
    return [
      `${metaReviewSnapshotRoundMissingReasonCode}:current_round=${input.currentRound}`
    ];
  }
  if (input.snapshotRound === null) {
    return [];
  }
  if (input.snapshotRound < input.currentRound) {
    return [
      `${metaReviewSnapshotRoundStaleReasonCode}:snapshot_round=${input.snapshotRound};current_round=${input.currentRound}`
    ];
  }
  if (input.snapshotRound > input.currentRound) {
    return [
      `${metaReviewSnapshotRoundAheadReasonCode}:snapshot_round=${input.snapshotRound};current_round=${input.currentRound}`
    ];
  }
  return [];
}

async function readMetaReviewParitySnapshotFromArtifact(input: {
  artifactPath: string;
  readFileFn: typeof readFile;
}): Promise<MetaReviewParityArtifactReadResult> {
  let artifactRaw: string;
  try {
    artifactRaw = await input.readFileFn(input.artifactPath, "utf8");
  } catch (error) {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [
        `${metaReviewParityArtifactReadFailedReasonCode}:${resolveParityArtifactReadErrorCode(error)}`
      ],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  return readMetaReviewParitySnapshotFromArtifactRaw(artifactRaw);
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export async function getMetaReviewStatus(
  input: MetaReviewReadInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewStatusView> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const readFileFn = dependencies.readFile ?? readFile;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const snapshot = normalizeMetaReviewSnapshot(loadedState.state.meta_review);
  if (!isNonEmptyString(snapshot.last_autonomous_report_ref)) {
    return createMetaReviewStatusView(
      resolved.bubbleId,
      snapshot,
      "no_snapshot"
    );
  }
  const parityRead = await readMetaReviewParitySnapshotFromArtifact({
    artifactPath: resolved.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn
  });
  const freshnessDiagnostics = resolveSnapshotFreshnessDiagnostics({
    currentRound: loadedState.state.round,
    snapshotRound: parityRead.snapshotRound,
    snapshotRoundIdentity: parityRead.snapshotRoundIdentity
  });
  if (
    isRoundLocalMetaReviewSnapshotOutsideCurrentRound({
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity
    })
  ) {
    return createMetaReviewStatusView(
      resolved.bubbleId,
      clearLiveMetaReviewSnapshot(snapshot),
      resolveMetaReviewProjectionFreshness({
        hasSnapshot: true,
        currentRound: loadedState.state.round,
        snapshotRound: parityRead.snapshotRound,
        snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
        diagnostics: [...parityRead.diagnostics, ...freshnessDiagnostics]
      }),
      emptyMetaReviewFindingsParitySnapshot,
      [...parityRead.diagnostics, ...freshnessDiagnostics]
    );
  }

  return createMetaReviewStatusView(
    resolved.bubbleId,
    snapshot,
    resolveMetaReviewProjectionFreshness({
      hasSnapshot: true,
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
      diagnostics: [...parityRead.diagnostics, ...freshnessDiagnostics]
    }),
    parityRead.parity,
    [...parityRead.diagnostics, ...freshnessDiagnostics]
  );
}

export async function getMetaReviewLastReport(
  input: MetaReviewReadInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewLastReportView> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const readFileFn = dependencies.readFile ?? readFile;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const snapshot = normalizeMetaReviewSnapshot(loadedState.state.meta_review);
  let parity = { ...emptyMetaReviewFindingsParitySnapshot };
  let parityDiagnostics: string[] = [];

  if (!isNonEmptyString(snapshot.last_autonomous_report_ref)) {
    return {
      bubbleId: resolved.bubbleId,
      has_report: false,
      operator_surface: "projection_only",
      projection_freshness: "no_snapshot",
      report_ref: null,
      summary: snapshot.last_autonomous_summary,
      updated_at: snapshot.last_autonomous_updated_at,
      report_json: null,
      findings_claimed_open_total: parity.findings_claimed_open_total,
      findings_artifact_open_total: parity.findings_artifact_open_total,
      findings_blocking_open_total: parity.findings_blocking_open_total,
      findings_advisory_open_total: parity.findings_advisory_open_total,
      findings_artifact_status: parity.findings_artifact_status,
      findings_digest_sha256: parity.findings_digest_sha256,
      meta_review_run_id: parity.meta_review_run_id,
      findings_parity_status: parity.findings_parity_status,
      parity_diagnostics: parityDiagnostics
    };
  }

  const reportRef = snapshot.last_autonomous_report_ref;
  const reportPath = resolveReportArtifactPath({
    bubbleDir: resolved.bubblePaths.bubbleDir,
    artifactsDir: resolved.bubblePaths.artifactsDir,
    reportRef
  });
  const parityRead = await readMetaReviewParitySnapshotFromArtifact({
    artifactPath: resolved.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn
  });
  parity = parityRead.parity;
  parityDiagnostics = [
    ...parityRead.diagnostics,
    ...resolveSnapshotFreshnessDiagnostics({
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity
    })
  ];
  if (
    isRoundLocalMetaReviewSnapshotOutsideCurrentRound({
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity
    })
  ) {
    return {
      bubbleId: resolved.bubbleId,
      has_report: false,
      operator_surface: "projection_only",
      projection_freshness: resolveMetaReviewProjectionFreshness({
        hasSnapshot: true,
        currentRound: loadedState.state.round,
        snapshotRound: parityRead.snapshotRound,
        snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
        diagnostics: parityDiagnostics
      }),
      report_ref: null,
      summary: null,
      updated_at: null,
      report_json: null,
      findings_claimed_open_total: null,
      findings_artifact_open_total: null,
      findings_blocking_open_total: null,
      findings_advisory_open_total: null,
      findings_artifact_status: null,
      findings_digest_sha256: null,
      meta_review_run_id: null,
      findings_parity_status: null,
      parity_diagnostics: parityDiagnostics
    };
  }

  let reportJson: Record<string, unknown> | null = null;
  try {
    const reportRaw = await readFileFn(reportPath, "utf8");
    const parsed: unknown = JSON.parse(reportRaw);
    if (isRecord(parsed) && isRecord(parsed.report_json)) {
      reportJson = parsed.report_json;
    } else if (isRecord(parsed)) {
      reportJson = parsed;
    }
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        bubbleId: resolved.bubbleId,
        has_report: false,
        operator_surface: "projection_only",
        projection_freshness: resolveMetaReviewProjectionFreshness({
          hasSnapshot: true,
          currentRound: loadedState.state.round,
          snapshotRound: parityRead.snapshotRound,
          snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
          diagnostics: parityDiagnostics
        }),
        report_ref: reportRef,
        summary: snapshot.last_autonomous_summary,
        updated_at: snapshot.last_autonomous_updated_at,
        report_json: null,
        findings_claimed_open_total: parity.findings_claimed_open_total,
        findings_artifact_open_total: parity.findings_artifact_open_total,
        findings_blocking_open_total: parity.findings_blocking_open_total,
        findings_advisory_open_total: parity.findings_advisory_open_total,
        findings_artifact_status: parity.findings_artifact_status,
        findings_digest_sha256: parity.findings_digest_sha256,
        meta_review_run_id: parity.meta_review_run_id,
        findings_parity_status: parity.findings_parity_status,
        parity_diagnostics: parityDiagnostics
      };
    }
    return {
      bubbleId: resolved.bubbleId,
      has_report: true,
      operator_surface: "projection_only",
      projection_freshness: resolveMetaReviewProjectionFreshness({
        hasSnapshot: true,
        currentRound: loadedState.state.round,
        snapshotRound: parityRead.snapshotRound,
        snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
        diagnostics: parityDiagnostics
      }),
      report_ref: reportRef,
      summary: snapshot.last_autonomous_summary,
      updated_at: snapshot.last_autonomous_updated_at,
      report_json: null,
      findings_claimed_open_total: parity.findings_claimed_open_total,
      findings_artifact_open_total: parity.findings_artifact_open_total,
      findings_blocking_open_total: parity.findings_blocking_open_total,
      findings_advisory_open_total: parity.findings_advisory_open_total,
      findings_artifact_status: parity.findings_artifact_status,
      findings_digest_sha256: parity.findings_digest_sha256,
      meta_review_run_id: parity.meta_review_run_id,
      findings_parity_status: parity.findings_parity_status,
      parity_diagnostics: parityDiagnostics
    };
  }

  return {
    bubbleId: resolved.bubbleId,
    has_report: true,
    operator_surface: "projection_only",
    projection_freshness: resolveMetaReviewProjectionFreshness({
      hasSnapshot: true,
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
      diagnostics: parityDiagnostics
    }),
    report_ref: reportRef,
    summary: snapshot.last_autonomous_summary,
    updated_at: snapshot.last_autonomous_updated_at,
    report_json: reportJson,
    findings_claimed_open_total: parity.findings_claimed_open_total,
    findings_artifact_open_total: parity.findings_artifact_open_total,
    findings_blocking_open_total: parity.findings_blocking_open_total,
    findings_advisory_open_total: parity.findings_advisory_open_total,
    findings_artifact_status: parity.findings_artifact_status,
    findings_digest_sha256: parity.findings_digest_sha256,
    meta_review_run_id: parity.meta_review_run_id,
    findings_parity_status: parity.findings_parity_status,
    parity_diagnostics: parityDiagnostics
  };
}

export function toMetaReviewError(error: unknown): MetaReviewError {
  if (error instanceof MetaReviewError) {
    return error;
  }
  if (
    error instanceof Error &&
    "reasonCode" in error &&
    typeof (error as { reasonCode?: unknown }).reasonCode === "string" &&
    (error as { reasonCode: string }).reasonCode.startsWith("META_REVIEW_GATE_")
  ) {
    const gateReason = (error as { reasonCode: string }).reasonCode;
    return new MetaReviewError("META_REVIEW_GATE_RUN_FAILED", `${gateReason}: ${error.message}`);
  }
  if (error instanceof BubbleLookupError) {
    return new MetaReviewError("META_REVIEW_BUBBLE_LOOKUP_FAILED", error.message);
  }
  if (error instanceof StateStoreConflictError) {
    return stateWriteConflictToMetaReviewError(error);
  }
  if (error instanceof SchemaValidationError || error instanceof SyntaxError) {
    return new MetaReviewError("META_REVIEW_SCHEMA_INVALID", error.message);
  }
  if (
    error instanceof Error &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string"
  ) {
    const ioError = error as NodeJS.ErrnoException;
    return new MetaReviewError(
      "META_REVIEW_IO_ERROR",
      `[${ioError.code}] ${ioError.message}`
    );
  }
  if (error instanceof Error) {
    return new MetaReviewError("META_REVIEW_UNKNOWN_ERROR", error.message);
  }

  return new MetaReviewError(
    "META_REVIEW_UNKNOWN_ERROR",
    `Unknown meta-review error: ${String(error)}`
  );
}

export function asMetaReviewError(error: unknown): never {
  throw toMetaReviewError(error);
}
