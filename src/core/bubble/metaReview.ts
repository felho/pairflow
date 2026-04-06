import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveBubbleById } from "./bubbleLookup.js";
import {
  appendHumanApprovalRequestEnvelope,
  type ApprovalAdvisoryFinding
} from "./approvalRequestEnvelope.js";
import {
  StateStoreConflictError,
  readStateSnapshot,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../state/stateStore.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import {
  isNonEmptyString,
  isRecord
} from "../validation.js";
import {
  isMetaReviewExecutionContextActiveState
} from "./metaReviewExecutionContext.js";
import {
  clearLiveMetaReviewSnapshot,
  hasCanonicalSubmitForActiveMetaReviewRound,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
} from "../../v11/shared/metaReview/metaReviewSnapshot.js";
import {
  MetaReviewError,
  type MetaReviewErrorReasonCode
} from "../../v11/shared/metaReview/metaReviewError.js";
import {
  toMetaReviewError as toMetaReviewErrorV11
} from "../../v11/shared/metaReview/metaReviewCommandRuntime.js";
import { readRuntimeSessionsRegistry } from "../runtime/sessionsRegistry.js";
import { runtimePaneIndices, runTmux } from "../runtime/tmuxManager.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage
} from "../runtime/tmuxInput.js";
import type {
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../types/bubble.js";
import {
  hasApproveFindingsSplitMetadata,
  isFindingsClaimState,
  type FindingsParityStatus
} from "../../types/protocol.js";
import {
  type LatestSameRoundReviewerSnapshot,
  readLatestSameRoundReviewerSnapshotFromTranscript,
  resolveAdvisoryFindingsFromReportJson,
  resolveFindingsOpenSplitFromReportJson,
  resolveFindingsParityMetadataFromReportJson
} from "../../v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.js";
import {
  evaluateNoFindingsSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion
} from "../convergence/policy.js";
import type {
  MetaReviewDepth as MetaReviewDepthV11,
  MetaReviewLastReportView as MetaReviewLastReportViewV11,
  MetaReviewResult as MetaReviewResultV11,
  MetaReviewRunWarning as MetaReviewRunWarningV11,
  MetaReviewStatusView as MetaReviewStatusViewV11
} from "../../v11/shared/metaReview/metaReviewTypes.js";
import type {
  MetaReviewCommandDependencies as MetaReviewCommandDependenciesV11,
  MetaReviewReadInput as MetaReviewReadInputV11,
  MetaReviewSubmitInput as MetaReviewSubmitInputV11,
  MetaReviewSubmitResult as MetaReviewSubmitResultV11
} from "../../v11/shared/metaReview/metaReviewCommandContract.js";
import type { MetaReviewReviewerVerdict as MetaReviewReviewerVerdictV11 } from "../../v11/domain/metaReview/metaReviewReviewerVerdict.js";

const CANONICAL_META_REVIEW_REPORT_REF = "artifacts/meta-review-last.json";

export type MetaReviewDepth = MetaReviewDepthV11;
export type MetaReviewReviewerVerdict = MetaReviewReviewerVerdictV11;
export type MetaReviewStatusView = MetaReviewStatusViewV11;
export type MetaReviewLastReportView = MetaReviewLastReportViewV11;
export type MetaReviewResult = MetaReviewResultV11;
export type MetaReviewRunWarning = MetaReviewRunWarningV11;
export type MetaReviewSubmitResult = MetaReviewSubmitResultV11;
export type { MetaReviewErrorReasonCode };
export {
  getMetaReviewLastReport,
  getMetaReviewStatus,
  submitMetaReviewResult,
  toMetaReviewError
} from "../../v11/shared/metaReview/metaReviewCommandRuntime.js";
export {
  clearLiveMetaReviewSnapshot,
  hasCanonicalSubmitForActiveMetaReviewRound,
  MetaReviewError,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
};

interface MetaReviewLiveRunnerOutput {
  recommendation: MetaReviewRecommendation;
  summary?: string;
  rework_target_message?: string | null;
  report_json?: Record<string, unknown>;
}

export type MetaReviewReadInput = MetaReviewReadInputV11;

export interface MetaReviewRunInput extends MetaReviewReadInput {
  depth?: MetaReviewDepth;
}

export type MetaReviewSubmitInput = MetaReviewSubmitInputV11;

export interface MetaReviewLiveRunnerInput {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  transcriptPath: string;
  reviewerAgent: string;
  depth: MetaReviewDepth;
  state: BubbleStateSnapshot;
  runId: string;
  now: Date;
}

export interface MetaReviewDependencies extends MetaReviewCommandDependenciesV11 {
  runLiveReview?: (
    input: MetaReviewLiveRunnerInput
  ) => Promise<MetaReviewLiveRunnerOutput>;
  allowMetaReviewRunningState?: boolean;
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function resolveClaimStateFromRecommendation(
  recommendation: MetaReviewRecommendation
): "clean" | "open_findings" | "unknown" {
  if (recommendation === "approve") {
    return "clean";
  }
  if (recommendation === "rework") {
    return "open_findings";
  }
  return "unknown";
}

// Shared by submit and retained core test paths:
// - submit always provides reportJson (already schema-validated),
// - runMetaReview may canonicalize runner output without report_json.
function resolveCanonicalMetaReviewReportJson(input: {
  recommendation: MetaReviewRecommendation;
  reportJson?: Record<string, unknown>;
  runId: string;
}): Record<string, unknown> {
  const base = input.reportJson ?? {};
  const rawState = base.findings_claim_state;
  const claimState = isFindingsClaimState(rawState)
    ? rawState
    : resolveClaimStateFromRecommendation(input.recommendation);
  const claimSource = "meta_review_artifact";
  const fallbackCount = 0;
  const countFromFindings = typeof base.findings === "number"
    && Number.isInteger(base.findings)
    && base.findings >= 0
    ? base.findings
    : Array.isArray(base.findings)
      ? base.findings.length
      : undefined;
  const findingsCount =
    typeof base.findings_count === "number" &&
      Number.isInteger(base.findings_count) &&
      base.findings_count >= 0
      ? base.findings_count
      : (countFromFindings ?? fallbackCount);
  const splitFromReportJson = resolveFindingsOpenSplitFromReportJson(base);
  const findingsClaimedOpenTotal =
    normalizeNonNegativeInt(base.findings_claimed_open_total) ?? findingsCount;
  const hasExplicitBlockingOpenTotal = Object.hasOwn(
    base,
    "findings_blocking_open_total"
  );
  const hasExplicitAdvisoryOpenTotal = Object.hasOwn(
    base,
    "findings_advisory_open_total"
  );
  const explicitBlockingOpenTotal = normalizeNonNegativeInt(
    base.findings_blocking_open_total
  );
  const explicitAdvisoryOpenTotal = normalizeNonNegativeInt(
    base.findings_advisory_open_total
  );
  const hasInvalidExplicitSplitField =
    (hasExplicitBlockingOpenTotal && explicitBlockingOpenTotal === null) ||
    (hasExplicitAdvisoryOpenTotal && explicitAdvisoryOpenTotal === null);
  let findingsBlockingOpenTotal =
    explicitBlockingOpenTotal ?? splitFromReportJson.findings_blocking_open_total;
  let findingsAdvisoryOpenTotal =
    explicitAdvisoryOpenTotal ?? splitFromReportJson.findings_advisory_open_total;
  if (input.recommendation === "approve" && !hasInvalidExplicitSplitField) {
    if (
      findingsBlockingOpenTotal === null &&
      findingsAdvisoryOpenTotal === null
    ) {
      // Keep clean approve refresh deterministic while preserving fail-closed behavior
      // for approve+open_findings payloads that omit explicit split metadata.
      if (findingsClaimedOpenTotal === 0) {
        findingsBlockingOpenTotal = 0;
        findingsAdvisoryOpenTotal = 0;
      }
    } else if (
      findingsBlockingOpenTotal === null &&
      findingsAdvisoryOpenTotal !== null
    ) {
      const derivedBlockingOpenTotal =
        findingsClaimedOpenTotal - findingsAdvisoryOpenTotal;
      if (derivedBlockingOpenTotal >= 0) {
        findingsBlockingOpenTotal = derivedBlockingOpenTotal;
      }
    } else if (
      findingsBlockingOpenTotal !== null &&
      findingsAdvisoryOpenTotal === null
    ) {
      const derivedAdvisoryOpenTotal =
        findingsClaimedOpenTotal - findingsBlockingOpenTotal;
      if (derivedAdvisoryOpenTotal >= 0) {
        findingsAdvisoryOpenTotal = derivedAdvisoryOpenTotal;
      }
    }
  }
  const findingsArtifactRefFromInput =
    isNonEmptyString(base.findings_artifact_ref)
      ? base.findings_artifact_ref.trim()
      : null;
  let findingsArtifactRef = findingsArtifactRefFromInput;
  if (input.recommendation === "rework") {
    if (
      findingsArtifactRefFromInput === null ||
      findingsArtifactRefFromInput === CANONICAL_META_REVIEW_REPORT_REF
    ) {
      findingsArtifactRef = CANONICAL_META_REVIEW_REPORT_REF;
    }
  }
  const resolvedMetaReviewRunId = isNonEmptyString(base.meta_review_run_id)
    ? base.meta_review_run_id.trim()
    : isNonEmptyString(base.findings_run_id)
      ? base.findings_run_id.trim()
      : input.runId;
  const findingsRunId = resolvedMetaReviewRunId;
  const findingsDigestSha256 = isNonEmptyString(base.findings_digest_sha256)
    ? base.findings_digest_sha256.trim().toLowerCase()
    : null;
  const findingsArtifactStatus = isNonEmptyString(base.findings_artifact_status)
    ? base.findings_artifact_status.trim()
    : isNonEmptyString(base.artifact_status)
      ? base.artifact_status.trim()
      : null;
  const findingsArtifactOpenTotal =
    typeof base.findings_artifact_open_total === "number" &&
      Number.isInteger(base.findings_artifact_open_total) &&
      base.findings_artifact_open_total >= 0
      ? base.findings_artifact_open_total
      : null;
  const findingsParityStatusRaw = isNonEmptyString(base.findings_parity_status)
    ? base.findings_parity_status.trim()
    : null;
  const findingsParityStatus: FindingsParityStatus | null =
    findingsParityStatusRaw === "ok" ||
      findingsParityStatusRaw === "mismatch" ||
      findingsParityStatusRaw === "guard_failed"
      ? findingsParityStatusRaw
      : null;

  return {
    ...base,
    findings_claim_state: claimState,
    findings_claim_source: claimSource,
    findings_count: findingsCount,
    findings_claimed_open_total: findingsClaimedOpenTotal,
    findings_blocking_open_total: findingsBlockingOpenTotal,
    findings_advisory_open_total: findingsAdvisoryOpenTotal,
    findings_artifact_ref: findingsArtifactRef,
    findings_run_id: findingsRunId,
    meta_review_run_id: resolvedMetaReviewRunId,
    findings_digest_sha256: findingsDigestSha256,
    findings_artifact_status: findingsArtifactStatus,
    artifact_status: findingsArtifactStatus,
    findings_artifact_open_total: findingsArtifactOpenTotal,
    findings_parity_status: findingsParityStatus
  };
}

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

function readApprovalAdvisoryFindingsSnapshot(
  reportJson: Record<string, unknown> | undefined
): ApprovalAdvisoryFinding[] | undefined {
  return resolveAdvisoryFindingsFromReportJson(reportJson);
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

function shouldRefreshApprovalRequest(
  state: BubbleStateSnapshot["state"]
): boolean {
  return state === "READY_FOR_HUMAN_APPROVAL";
}

function mapRecommendationToStatus(
  recommendation: MetaReviewRecommendation
): MetaReviewRunStatus {
  if (recommendation === "inconclusive") {
    return "inconclusive";
  }

  return "success";
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

const metaReviewRunnerModes = ["pane_agent", "agent", "unavailable"] as const;
type MetaReviewRunnerMode = (typeof metaReviewRunnerModes)[number];
const defaultMetaReviewRunnerTimeoutMs = 10 * 60 * 1000;
const defaultMetaReviewPanePollIntervalMs = 800;
const metaReviewPaneCaptureHistoryLines = 5000;

function resolveMetaReviewRunnerMode(): MetaReviewRunnerMode {
  const configured = process.env.PAIRFLOW_META_REVIEW_RUNNER_MODE
    ?.trim()
    .toLowerCase();
  if (
    configured !== undefined &&
    (metaReviewRunnerModes as readonly string[]).includes(configured)
  ) {
    return configured as MetaReviewRunnerMode;
  }
  if (process.env.NODE_ENV === "test") {
    return "unavailable";
  }
  return "pane_agent";
}

function resolveMetaReviewRunnerTimeoutMs(): number {
  const raw = process.env.PAIRFLOW_META_REVIEW_TIMEOUT_MS;
  if (raw === undefined) {
    return defaultMetaReviewRunnerTimeoutMs;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultMetaReviewRunnerTimeoutMs;
  }
  return Math.floor(parsed);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

interface CommandRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCommand(input: {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
}): Promise<CommandRunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env }
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        child.kill("SIGKILL");
      }, 3_000).unref();
    }, input.timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      rejectPromise(error);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeoutHandle);
      if (timedOut) {
        rejectPromise(
          new Error(
            `meta-review runner command timed out after ${input.timeoutMs}ms`
          )
        );
        return;
      }
      resolvePromise({
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });
  });
}

function buildCodexMetaReviewSchema(): string {
  const schema = {
    type: "object",
    properties: {
      recommendation: {
        type: "string",
        enum: ["approve", "rework", "inconclusive"]
      },
      summary: {
        type: "string"
      },
      rework_target_message: {
        type: ["string", "null"]
      }
    },
    required: [
      "recommendation",
      "summary",
      "rework_target_message"
    ],
    additionalProperties: false
  } as const;
  return `${JSON.stringify(schema, null, 2)}\n`;
}

function buildMetaReviewPrompt(input: MetaReviewLiveRunnerInput): string {
  const depthDirective =
    input.depth === "deep"
      ? "Use deep mode: exhaustive verification with explicit evidence."
      : "Use standard mode: focused but complete verification.";
  return [
    "You are the Pairflow autonomous meta-reviewer.",
    "",
    `Bubble ID: ${input.bubbleId}`,
    `Run ID: ${input.runId}`,
    `Repository root: ${input.repoPath}`,
    `Bubble worktree: ${input.worktreePath}`,
    `Transcript path: ${input.transcriptPath}`,
    `Current lifecycle state: ${input.state.state}`,
    `Current round: ${input.state.round}`,
    `Reviewer agent: ${input.reviewerAgent}`,
    "",
    depthDirective,
    "",
    "Task:",
    "1. Inspect the bubble worktree and transcript/evidence context.",
    "2. Decide recommendation: rework | approve | inconclusive.",
    "3. Return JSON only, matching the required schema.",
    "",
    "Rules:",
    '- "summary" must be concise and specific.',
    '- if recommendation is "rework", "rework_target_message" must be non-empty and actionable.',
    '- if recommendation is not "rework", "rework_target_message" must be null.',
    "- Do not modify repository files; read-only review only."
  ].join("\n");
}

function buildPaneMetaReviewPrompt(input: MetaReviewLiveRunnerInput): string {
  const beginPrefix = "PAIRFLOW_META_REVIEW_JSON_BEGIN";
  const endPrefix = "PAIRFLOW_META_REVIEW_JSON_END";
  return [
    buildMetaReviewPrompt(input),
    "",
    "Output contract:",
    "- Return your final answer as a single JSON object.",
    "- Emit no prose outside the marker block below.",
    `- Begin marker prefix: ${beginPrefix}`,
    `- End marker prefix: ${endPrefix}`,
    `- Marker run id: ${input.runId}`,
    "- Compose markers exactly as <prefix>:<run-id> (no extra spaces).",
    "- Print the begin marker on its own line, then the JSON object.",
    "- Print the JSON object in between markers.",
    "- Print the end marker on its own line after the JSON object.",
    "- Do not wrap the JSON in markdown fences."
  ].join("\n");
}

export function parseMetaReviewRunnerOutput(
  raw: string
): MetaReviewReviewerVerdict {
  const normalizeJsonControlCharactersInStrings = (input: string): string => {
    let output = "";
    let inString = false;
    let escaped = false;

    for (const char of input) {
      if (!inString) {
        if (char === "\"") {
          inString = true;
        }
        output += char;
        continue;
      }

      if (escaped) {
        output += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        output += char;
        escaped = true;
        continue;
      }

      if (char === "\"") {
        output += char;
        inString = false;
        continue;
      }

      if (char === "\n") {
        output += "\\n";
        continue;
      }
      if (char === "\r") {
        output += "\\r";
        continue;
      }
      if (char === "\t") {
        output += "\\t";
        continue;
      }

      const codePoint = char.charCodeAt(0);
      if (codePoint >= 0x00 && codePoint < 0x20) {
        output += `\\u${codePoint.toString(16).padStart(4, "0")}`;
        continue;
      }

      output += char;
    }

    return output;
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    try {
      parsed = JSON.parse(normalizeJsonControlCharactersInStrings(raw));
    } catch {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`meta-review runner output is not valid JSON: ${reason}`);
    }
  }

  if (!isRecord(parsed)) {
    throw new Error("meta-review runner output must be a JSON object.");
  }

  const recommendationRaw = parsed.recommendation;
  if (
    recommendationRaw !== "approve" &&
    recommendationRaw !== "rework" &&
    recommendationRaw !== "inconclusive"
  ) {
    throw new Error(
      "meta-review runner output.recommendation must be one of: approve, rework, inconclusive."
    );
  }
  const recommendation = recommendationRaw;

  const summaryRaw = parsed.summary;
  if (!isNonEmptyString(summaryRaw)) {
    throw new Error("meta-review runner output.summary must be a non-empty string.");
  }
  const summary = summaryRaw.trim();

  const reworkRaw = parsed.rework_target_message;
  let reworkTargetMessage: string | null;
  if (reworkRaw === null || reworkRaw === undefined) {
    reworkTargetMessage = null;
  } else if (isNonEmptyString(reworkRaw)) {
    reworkTargetMessage = reworkRaw.trim();
  } else {
    throw new Error(
      "meta-review runner output.rework_target_message must be string|null."
    );
  }

  if (recommendation === "rework" && !isNonEmptyString(reworkTargetMessage)) {
    throw new Error(
      "meta-review runner output.rework_target_message is required when recommendation=rework."
    );
  }
  if (recommendation !== "rework") {
    reworkTargetMessage = null;
  }

  return {
    recommendation,
    summary,
    rework_target_message: reworkTargetMessage
  };
}

function truncateForErrorOutput(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}...`;
}

export function extractMetaReviewDelimitedBlock(input: {
  text: string;
  beginMarker: string;
  endMarker: string;
}): string | null {
  const beginIndex = input.text.lastIndexOf(input.beginMarker);
  if (beginIndex < 0) {
    return null;
  }
  const payloadStart = beginIndex + input.beginMarker.length;
  const endIndex = input.text.indexOf(input.endMarker, payloadStart);
  if (endIndex < 0) {
    return null;
  }
  const payload = input.text.slice(payloadStart, endIndex).trim();
  return payload.length === 0 ? null : payload;
}

async function resolveMetaReviewerPaneTarget(input: {
  bubbleId: string;
  repoPath: string;
}): Promise<string> {
  const sessionsPath = join(input.repoPath, ".pairflow", "runtime", "sessions.json");
  const sessions = await readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });
  const record = sessions[input.bubbleId];
  if (record === undefined) {
    throw new Error(
      `META_REVIEWER_PANE_UNAVAILABLE: runtime session missing for bubble ${input.bubbleId}.`
    );
  }
  const paneIndex = record.metaReviewerPane?.paneIndex ?? runtimePaneIndices.metaReviewer;
  if (!Number.isInteger(paneIndex) || paneIndex < 0) {
    throw new Error(
      `META_REVIEWER_PANE_UNAVAILABLE: invalid meta-reviewer pane index (${String(
        paneIndex
      )}).`
    );
  }
  return `${record.tmuxSessionName}:0.${paneIndex}`;
}

async function waitForMetaReviewPaneOutput(input: {
  targetPane: string;
  beginMarker: string;
  endMarker: string;
  timeoutMs: number;
}): Promise<string> {
  const deadline = Date.now() + input.timeoutMs;
  while (Date.now() <= deadline) {
    const capture = await runTmux(
      [
        "capture-pane",
        "-pt",
        input.targetPane,
        "-S",
        `-${metaReviewPaneCaptureHistoryLines}`,
        "-J"
      ],
      { allowFailure: true }
    );
    if (capture.exitCode === 0) {
      const payload = extractMetaReviewDelimitedBlock({
        text: capture.stdout,
        beginMarker: input.beginMarker,
        endMarker: input.endMarker
      });
      if (payload !== null) {
        return payload;
      }
    }
    await sleep(defaultMetaReviewPanePollIntervalMs);
  }

  throw new Error(
    `meta-review pane output timed out after ${input.timeoutMs}ms while waiting for run ${input.beginMarker}.`
  );
}

async function runCodexAgentLiveReview(
  input: MetaReviewLiveRunnerInput
): Promise<MetaReviewLiveRunnerOutput> {
  const scratchDir = await mkdtemp(
    join(tmpdir(), "pairflow-meta-review-runner-")
  );
  const schemaPath = join(scratchDir, "meta-review-output-schema.json");
  const outputPath = join(scratchDir, "meta-review-output.json");
  const timeoutMs = resolveMetaReviewRunnerTimeoutMs();
  try {
    await writeFile(schemaPath, buildCodexMetaReviewSchema(), "utf8");
    const prompt = buildMetaReviewPrompt(input);
    const commandResult = await runCommand({
      command: "codex",
      args: [
        "exec",
        "--cd",
        input.repoPath,
        "--sandbox",
        "read-only",
        "--ephemeral",
        "--add-dir",
        input.worktreePath,
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        prompt
      ],
      cwd: input.repoPath,
      timeoutMs
    });

    if (commandResult.exitCode !== 0) {
      const stderrTail = truncateForErrorOutput(commandResult.stderr, 1200);
      const stdoutTail = truncateForErrorOutput(commandResult.stdout, 1200);
      throw new Error(
        `meta-review runner command failed (exit ${commandResult.exitCode}). stderr=${JSON.stringify(stderrTail)} stdout=${JSON.stringify(stdoutTail)}`
      );
    }

    const rawOutput = await readFile(outputPath, "utf8");
    if (!isNonEmptyString(rawOutput)) {
      throw new Error("meta-review runner produced empty output.");
    }
    const parsed = parseMetaReviewRunnerOutput(rawOutput.trim());

    return {
      ...parsed,
      report_json: {
        source: "codex-exec",
        mode: "agent",
        depth: input.depth,
        bubble_id: input.bubbleId,
        run_id: input.runId
      }
    };
  } finally {
    await rm(scratchDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function runCodexPaneLiveReview(
  input: MetaReviewLiveRunnerInput
): Promise<MetaReviewLiveRunnerOutput> {
  const timeoutMs = resolveMetaReviewRunnerTimeoutMs();
  const targetPane = await resolveMetaReviewerPaneTarget({
    bubbleId: input.bubbleId,
    repoPath: input.repoPath
  });
  const beginMarker = `PAIRFLOW_META_REVIEW_JSON_BEGIN:${input.runId}`;
  const endMarker = `PAIRFLOW_META_REVIEW_JSON_END:${input.runId}`;

  await maybeAcceptClaudeTrustPrompt(runTmux, targetPane).catch(() => undefined);
  await sendAndSubmitTmuxPaneMessage(
    runTmux,
    targetPane,
    buildPaneMetaReviewPrompt(input)
  );

  const rawOutput = await waitForMetaReviewPaneOutput({
    targetPane,
    beginMarker,
    endMarker,
    timeoutMs
  });
  const parsed = parseMetaReviewRunnerOutput(rawOutput);

  return {
    ...parsed,
    report_json: {
      source: "codex-pane",
      mode: "agent",
      depth: input.depth,
      bubble_id: input.bubbleId,
      run_id: input.runId
    }
  };
}

async function defaultLiveRunner(
  input: MetaReviewLiveRunnerInput
): Promise<MetaReviewLiveRunnerOutput> {
  const mode = resolveMetaReviewRunnerMode();
  if (mode === "unavailable") {
    throw new Error("Meta-review runner adapter is unavailable.");
  }
  if (mode === "agent") {
    return runCodexAgentLiveReview(input);
  }
  return runCodexPaneLiveReview(input);
}

function stateWriteConflictToMetaReviewError(error: unknown): MetaReviewError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewError(
    "META_REVIEW_SNAPSHOT_WRITE_CONFLICT",
    `Failed to persist meta-review snapshot due to concurrent update. ${reason}`
  );
}

function formatRunnerFailure(error: unknown): {
  summary: string;
  warningMessage: string;
} {
  if (error instanceof MetaReviewError) {
    return {
      summary: `Meta-review runner failure (${error.reasonCode}): ${error.message}`,
      warningMessage: `${error.reasonCode}: ${error.message}`
    };
  }

  const reason = error instanceof Error ? error.message : String(error);
  return {
    summary: `Meta-review runner failure: ${reason}`,
    warningMessage: reason
  };
}

// Retained temporarily as a core-internal/test seam after operator/v11 live-run removal.
// There is no remaining `src/**` runtime caller through the public CLI or shared v11 facade.
// Full deletion is deferred to a focused follow-up because current core tests still exercise
// the live-run service directly while retained snapshot/recovery types remain in use.
export async function runMetaReview(
  input: MetaReviewRunInput,
  dependencies: MetaReviewDependencies = {}
): Promise<MetaReviewResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const runLiveReview = dependencies.runLiveReview ?? defaultLiveRunner;
  const readFileFn = dependencies.readFile ?? readFile;
  const writeFileFn = dependencies.writeFile ?? writeFile;
  const now = dependencies.now ?? new Date();
  const makeUuid = dependencies.randomUUID ?? randomUUID;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const loadedState = await readState(resolved.bubblePaths.statePath);
  if (
    isMetaReviewExecutionContextActiveState(loadedState.state)
    && dependencies.allowMetaReviewRunningState !== true
  ) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      "meta-review run is disabled while the active submit channel is reserved for an in-flight meta-review authority window"
    );
  }
  const runId = makeUuid();
  const updatedAt = now.toISOString();
  const depth = input.depth ?? "standard";

  let recommendation: MetaReviewRecommendation;
  let status: MetaReviewRunStatus;
  let summary: string | null;
  let reportJson: Record<string, unknown> | undefined;
  let reworkTargetMessage: string | null;
  const warnings: MetaReviewRunWarning[] = [];

  try {
    const output = await runLiveReview({
      bubbleId: resolved.bubbleId,
      repoPath: resolved.repoPath,
      worktreePath: resolved.bubblePaths.worktreePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      reviewerAgent: resolved.bubbleConfig.agents.reviewer,
      depth,
      state: loadedState.state,
      runId,
      now
    });

    recommendation = output.recommendation;
    status = mapRecommendationToStatus(recommendation);
    summary = normalizeOptionalText(output.summary);
    reworkTargetMessage = normalizeOptionalText(
      output.rework_target_message ?? undefined
    );
    reportJson = output.report_json;
  } catch (error) {
    const failure = formatRunnerFailure(error);
    recommendation = "inconclusive";
    status = "error";
    summary = failure.summary;
    reworkTargetMessage = null;

    warnings.push({
      reason_code: "META_REVIEW_RUNNER_ERROR",
      message: failure.warningMessage
    });
  }
  const canonicalReportJson = resolveCanonicalMetaReviewReportJson({
    recommendation,
    ...(reportJson !== undefined ? { reportJson } : {}),
    runId
  });

  assertRunPayloadInvariants({
    recommendation,
    status,
    reworkTargetMessage
  });

  const previousMetaReview = normalizeMetaReviewSnapshot(loadedState.state.meta_review);
  const lifecycleBaseState = loadedState.state;
  const nextMetaReview: BubbleMetaReviewSnapshotState = {
    ...previousMetaReview,
    execution_context: previousMetaReview.execution_context ?? null,
    last_autonomous_run_id: runId,
    last_autonomous_status: status,
    last_autonomous_recommendation: recommendation,
    last_autonomous_summary: summary,
    last_autonomous_report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    last_autonomous_rework_target_message: reworkTargetMessage,
    last_autonomous_updated_at: updatedAt,
    ...(loadedState.state.state === "READY_FOR_HUMAN_APPROVAL" && status === "success"
      ? { sticky_human_gate: true }
      : {})
  };

  const nextState: BubbleStateSnapshot = {
    ...lifecycleBaseState,
    meta_review: nextMetaReview
  };

  let written: LoadedStateSnapshot;
  try {
    written = await writeState(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: loadedState.state.state
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw stateWriteConflictToMetaReviewError(error);
    }
    throw error;
  }

  const reportPayload = {
    bubble_id: resolved.bubbleId,
    run_id: runId,
    round: written.state.round,
    generated_at: updatedAt,
    depth,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    report_json_ref: CANONICAL_META_REVIEW_REPORT_REF,
    rework_target_message: reworkTargetMessage,
    warnings,
    report_json: canonicalReportJson
  };
  const rollingArtifactPaths = [
    resolved.bubblePaths.metaReviewLastJsonArtifactPath
  ];
  const rollingArtifactBackup = await Promise.all(
    rollingArtifactPaths.map(async (artifactPath) => {
      try {
        const contents = await readFileFn(artifactPath, "utf8");
        return {
          artifactPath,
          existed: true as const,
          contents
        };
      } catch (error) {
        if (isMissingFileError(error)) {
          return {
            artifactPath,
            existed: false as const,
            contents: null
          };
        }
        throw error;
      }
    })
  );

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

  if (shouldRefreshApprovalRequest(written.state.state)) {
    const parity = readMetaReviewFindingsParitySnapshot(canonicalReportJson);
    const approvalFindings = readApprovalAdvisoryFindingsSnapshot(
      canonicalReportJson
    );
    const latestReviewerSnapshot = await readLatestApproveReviewerSnapshot({
      recommendation,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      round: written.state.round
    });
    const approvalRefreshRoute =
      recommendation === "approve"
        ? "human_gate_approve"
        : recommendation === "rework"
          ? "human_gate_budget_exhausted"
          : "human_gate_inconclusive";
    try {
      assertApproveRecommendationConsistentWithReviewerSnapshot({
        latestSnapshot: latestReviewerSnapshot,
        summary:
          summary ??
          `Meta-review completed with recommendation ${recommendation}.`,
        reportJson: canonicalReportJson
      });
      await appendHumanApprovalRequestEnvelope({
        appendEnvelope,
        transcriptPath: resolved.bubblePaths.transcriptPath,
        inboxPath: resolved.bubblePaths.inboxPath,
        lockPath: join(
          resolved.bubblePaths.locksDir,
          `${resolved.bubbleId}.lock`
        ),
        now,
        bubbleId: resolved.bubbleId,
        round: written.state.round,
        summary:
          summary ??
          `Meta-review completed with recommendation ${recommendation}.`,
        route: approvalRefreshRoute,
        refs: [CANONICAL_META_REVIEW_REPORT_REF],
        recommendation,
        parityMetadata: parity,
        ...(latestReviewerSnapshot !== undefined
          ? { reviewerSnapshot: latestReviewerSnapshot }
          : {}),
        ...(approvalFindings !== undefined
          ? { findings: approvalFindings }
          : {})
      });
    } catch (appendError) {
      const appendReason =
        appendError instanceof Error ? appendError.message : String(appendError);
      let rollbackReasonCode = "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_NOT_ATTEMPTED";
      let rollbackContext = "rollback_outcome=not_attempted";
      let artifactRestoreReasonCode =
        "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_NOT_ATTEMPTED";
      let artifactRestoreContext = "artifact_restore_outcome=not_attempted";
      let gateReasonCode: "META_REVIEW_GATE_STATE_CONFLICT" | "META_REVIEW_GATE_TRANSITION_INVALID" =
        "META_REVIEW_GATE_TRANSITION_INVALID";
      try {
        await writeState(resolved.bubblePaths.statePath, loadedState.state, {
          expectedFingerprint: written.fingerprint,
          expectedState: written.state.state
        });
        rollbackReasonCode = "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_APPLIED";
        rollbackContext = "rollback_outcome=applied";
      } catch (rollbackError) {
        const rollbackReason =
          rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
        rollbackContext = `rollback_outcome=failed rollback_error=${rollbackReason}`;
        if (rollbackError instanceof StateStoreConflictError) {
          gateReasonCode = "META_REVIEW_GATE_STATE_CONFLICT";
          rollbackReasonCode = "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_STATE_CONFLICT";
        } else {
          rollbackReasonCode =
            "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_TRANSITION_INVALID";
        }
      }
      if (rollbackReasonCode === "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_APPLIED") {
        try {
          await Promise.all(
            rollingArtifactBackup.map((artifact) =>
              artifact.existed
                ? writeFileFn(artifact.artifactPath, artifact.contents, "utf8")
                : rm(artifact.artifactPath, { force: true })
            )
          );
          artifactRestoreReasonCode =
            "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_APPLIED";
          artifactRestoreContext = "artifact_restore_outcome=applied";
        } catch (artifactRestoreError) {
          const artifactRestoreReason =
            artifactRestoreError instanceof Error
              ? artifactRestoreError.message
              : String(artifactRestoreError);
          artifactRestoreReasonCode =
            "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_FAILED";
          artifactRestoreContext =
            `artifact_restore_outcome=failed artifact_restore_error=${artifactRestoreReason}`;
        }
      }
      throw new MetaReviewError(
        "META_REVIEW_GATE_RUN_FAILED",
        `${gateReasonCode}: approval refresh append failed after state/artifact writes (append_error=${appendReason}; rollback_reason_code=${rollbackReasonCode}; rollback_target_state=${loadedState.state.state}; ${rollbackContext}; artifact_restore_reason_code=${artifactRestoreReasonCode}; ${artifactRestoreContext}).`
      );
    }
  }

  return {
    bubble_id: resolved.bubbleId,
    run_id: runId,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    rework_target_message: reworkTargetMessage,
    updated_at: updatedAt,
    warnings,
    report_json: canonicalReportJson
  };
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export function asMetaReviewError(error: unknown): never {
  throw toMetaReviewErrorV11(error);
}
