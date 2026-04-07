import {
  isInteger,
  isNonEmptyString
} from "../validation/primitives.js";
import { validateActiveMetaReviewExecutionContext } from "./metaReviewExecutionContext.js";
import { MetaReviewError } from "./metaReviewError.js";
import type {
  AgentName,
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";
import {
  resolveStructuredMetaReviewClaimFromReportJson
} from "../metaReviewGate/metaReviewGateFindingsClaimParsing.js";
import {
  resolveFindingsOpenSplitFromReportJson
} from "../metaReviewGate/metaReviewGateFindingsMetadata.js";
import {
  evaluateNoFindingsSummaryFindingsAssertion,
  evaluatePositiveSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion
} from "../../domain/convergence/policy.js";
import type {
  MetaReviewCommandDependencies
} from "./metaReviewCommandContract.js";

const metaReviewerSubmitterAgent: AgentName = "codex";

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

export function resolveSubmitCanonicalRunId(input: {
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

function normalizeNonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function assertSummaryStructuredParity(input: {
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

export function mapRecommendationToStatus(
  recommendation: MetaReviewRecommendation
): MetaReviewRunStatus {
  return recommendation === "inconclusive" ? "inconclusive" : "success";
}

export function assertRunPayloadInvariants(input: {
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

export function normalizeRequiredSubmitText(
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

export function assertActiveMetaReviewExecutionContext(
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

export async function assertMetaReviewSubmitterAuthority(input: {
  bubbleId: string;
  sessionsPath: string;
  readRuntimeSessions: NonNullable<MetaReviewCommandDependencies["readRuntimeSessionsRegistry"]>;
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
