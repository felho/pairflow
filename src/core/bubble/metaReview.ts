import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import {
  StateStoreConflictError,
  readStateSnapshot,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../state/stateStore.js";
import { applyStateTransition } from "../state/machine.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import {
  SchemaValidationError,
  isInteger,
  isNonEmptyString,
  isRecord
} from "../validation.js";
import { readRuntimeSessionsRegistry } from "../runtime/sessionsRegistry.js";
import { runtimePaneIndices, runTmux } from "../runtime/tmuxManager.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage
} from "../runtime/tmuxInput.js";
import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../types/bubble.js";
import type {
  AgentName,
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../types/bubble.js";
import {
  isFindingsClaimState,
  type MetaReviewSubmissionPayload
} from "../../types/protocol.js";
const CANONICAL_META_REVIEW_REPORT_REF = "artifacts/meta-review-last.md";
const CANONICAL_META_REVIEW_REPORT_JSON_REF = "artifacts/meta-review-last.json";

export type MetaReviewDepth = "standard" | "deep";

export interface MetaReviewReadInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}

export interface MetaReviewRunInput extends MetaReviewReadInput {
  depth?: MetaReviewDepth;
}

export interface MetaReviewSubmitInput extends MetaReviewReadInput {
  round: number;
  recommendation: MetaReviewSubmissionPayload["recommendation"];
  summary: string;
  report_markdown: string;
  rework_target_message?: string | null;
  report_json?: Record<string, unknown>;
}

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

export interface MetaReviewLiveRunnerOutput {
  recommendation: MetaReviewRecommendation;
  summary?: string;
  report_markdown?: string;
  report_json?: Record<string, unknown>;
  rework_target_message?: string;
}

export interface MetaReviewStatusView {
  bubbleId: string;
  has_run: boolean;
  auto_rework_count: number;
  auto_rework_limit: number;
  sticky_human_gate: boolean;
  last_autonomous_run_id: string | null;
  last_autonomous_status: MetaReviewRunStatus | null;
  last_autonomous_recommendation: MetaReviewRecommendation | null;
  last_autonomous_summary: string | null;
  last_autonomous_report_ref: string | null;
  last_autonomous_rework_target_message: string | null;
  last_autonomous_updated_at: string | null;
}

export interface MetaReviewLastReportView {
  bubbleId: string;
  has_report: boolean;
  report_ref: string | null;
  summary: string | null;
  updated_at: string | null;
  report_markdown: string | null;
}

export interface MetaReviewRunWarning {
  reason_code:
    | "META_REVIEW_RUNNER_ERROR"
    | "META_REVIEW_ARTIFACT_WRITE_WARNING"
    | "META_REVIEWER_PANE_UNAVAILABLE";
  message: string;
}

export interface MetaReviewRunResult {
  bubbleId: string;
  depth: MetaReviewDepth;
  run_id?: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string | null;
  report_ref: string;
  rework_target_message: string | null;
  updated_at: string;
  lifecycle_state: BubbleStateSnapshot["state"];
  warnings: MetaReviewRunWarning[];
  report_json?: Record<string, unknown>;
}

export type MetaReviewSubmitResult = Omit<MetaReviewRunResult, "depth">;

export interface MetaReviewDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  readRuntimeSessionsRegistry?: typeof readRuntimeSessionsRegistry;
  runLiveReview?: (
    input: MetaReviewLiveRunnerInput
  ) => Promise<MetaReviewLiveRunnerOutput>;
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  now?: Date;
  randomUUID?: () => string;
  allowMetaReviewRunningState?: boolean;
}

export type MetaReviewErrorReasonCode =
  | "META_REVIEW_REWORK_MESSAGE_INVALID"
  | "META_REVIEW_STATE_INVALID"
  | "META_REVIEW_SENDER_MISMATCH"
  | "META_REVIEW_ROUND_MISMATCH"
  | "META_REVIEW_SNAPSHOT_WRITE_CONFLICT"
  | "META_REVIEW_BUBBLE_LOOKUP_FAILED"
  | "META_REVIEW_SCHEMA_INVALID"
  | "META_REVIEW_SCHEMA_INVALID_COMBINATION"
  | "META_REVIEW_GATE_RUN_FAILED"
  | "META_REVIEW_IO_ERROR"
  | "META_REVIEW_UNKNOWN_ERROR";

export class MetaReviewError extends Error {
  public readonly reasonCode: MetaReviewErrorReasonCode;

  public constructor(
    reasonCode: MetaReviewErrorReasonCode,
    message: string
  ) {
    super(message);
    this.name = "MetaReviewError";
    this.reasonCode = reasonCode;
  }
}

function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot === undefined) {
    return {
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: null,
      auto_rework_count: 0,
      auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
      sticky_human_gate: false
    };
  }

  return snapshot;
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

function resolveCanonicalMetaReviewReportJson(input: {
  recommendation: MetaReviewRecommendation;
  reportJson?: Record<string, unknown>;
  runId?: string | null;
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
  const findingsArtifactRef =
    isNonEmptyString(base.findings_artifact_ref)
      ? base.findings_artifact_ref.trim()
      : null;
  const findingsRunId =
    isNonEmptyString(base.findings_run_id)
      ? base.findings_run_id.trim()
      : input.runId ?? null;

  return {
    ...base,
    findings_claim_state: claimState,
    findings_claim_source: claimSource,
    findings_count: findingsCount,
    findings_artifact_ref: findingsArtifactRef,
    findings_run_id: findingsRunId
  };
}

function shouldRefreshApprovalRequest(
  state: BubbleStateSnapshot["state"]
): boolean {
  return (
    state === "READY_FOR_HUMAN_APPROVAL"
    || state === "READY_FOR_APPROVAL"
    || state === "META_REVIEW_FAILED"
  );
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

function normalizeRequiredSubmitText(
  value: string,
  fieldName: "summary" | "report_markdown"
): string {
  if (!isNonEmptyString(value)) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      `meta-review submit ${fieldName} must be a non-empty string`
    );
  }
  return fieldName === "summary" ? value.trim() : value.trimEnd();
}

export function hasCanonicalSubmitForActiveMetaReviewRound(input: {
  state: BubbleStateSnapshot;
  snapshot: BubbleMetaReviewSnapshotState;
}): boolean {
  if (input.state.state !== "META_REVIEW_RUNNING") {
    return false;
  }
  if (
    input.snapshot.last_autonomous_status === null ||
    input.snapshot.last_autonomous_recommendation === null ||
    !isNonEmptyString(input.snapshot.last_autonomous_report_ref) ||
    !isNonEmptyString(input.snapshot.last_autonomous_updated_at)
  ) {
    return false;
  }
  if (!isNonEmptyString(input.state.active_since)) {
    return false;
  }

  const activeSinceMs = Date.parse(input.state.active_since);
  const updatedAtMs = Date.parse(input.snapshot.last_autonomous_updated_at);
  if (Number.isNaN(activeSinceMs) || Number.isNaN(updatedAtMs)) {
    return false;
  }
  return updatedAtMs >= activeSinceMs;
}

async function assertMetaReviewSubmitterOwnership(input: {
  bubbleId: string;
  sessionsPath: string;
  readRuntimeSessions: typeof readRuntimeSessionsRegistry;
  state: BubbleStateSnapshot;
}): Promise<void> {
  if (input.state.state !== "META_REVIEW_RUNNING") {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      `meta-review submit requires META_REVIEW_RUNNING state (current: ${input.state.state}).`
    );
  }

  if (input.state.active_role !== "meta_reviewer") {
    throw new MetaReviewError(
      "META_REVIEW_SENDER_MISMATCH",
      `meta-review submit rejected: active role mismatch (expected meta_reviewer, found ${String(input.state.active_role)}).`
    );
  }

  if (
    input.state.active_agent !== metaReviewerSubmitterAgent ||
    input.state.active_since === null
  ) {
    const activeAgent = input.state.active_agent ?? "null";
    const activeSince = input.state.active_since ?? "null";
    throw new MetaReviewError(
      "META_REVIEW_SENDER_MISMATCH",
      `meta-review submit rejected: active meta-review ownership is missing or stale (active_agent=${activeAgent}, active_since=${activeSince}; expected active_agent=${metaReviewerSubmitterAgent} with non-null active_since).`
    );
  }

  const sessions = await input.readRuntimeSessions(input.sessionsPath, {
    allowMissing: true
  });
  const record = sessions[input.bubbleId];
  if (
    record?.metaReviewerPane?.role === "meta-reviewer" &&
    record.metaReviewerPane.active !== true
  ) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      "meta-review submit window closed: meta-reviewer pane ownership was deactivated by gate progression."
    );
  }
  if (
    record?.metaReviewerPane?.role !== "meta-reviewer" ||
    record.metaReviewerPane.active !== true
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SENDER_MISMATCH",
      "meta-review submit rejected: meta-reviewer pane ownership is not active in runtime session."
    );
  }
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

function buildFallbackReportMarkdown(input: {
  bubbleId: string;
  runId: string;
  updatedAt: string;
  summary: string;
}): string {
  return [
    "# Meta Review Report",
    "",
    `- Bubble: ${input.bubbleId}`,
    `- Run: ${input.runId}`,
    `- Generated: ${input.updatedAt}`,
    "- Recommendation: inconclusive",
    "- Status: error",
    "",
    "## Summary",
    "",
    input.summary
  ].join("\n");
}

function createMetaReviewStatusView(
  bubbleId: string,
  snapshot: BubbleMetaReviewSnapshotState
): MetaReviewStatusView {
  const hasRun =
    snapshot.last_autonomous_status !== null &&
    snapshot.last_autonomous_recommendation !== null;

  return {
    bubbleId,
    has_run: hasRun,
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
    last_autonomous_updated_at: snapshot.last_autonomous_updated_at
  };
}

const metaReviewRunnerModes = ["pane_agent", "agent", "unavailable"] as const;
type MetaReviewRunnerMode = (typeof metaReviewRunnerModes)[number];
const defaultMetaReviewRunnerTimeoutMs = 10 * 60 * 1000;
const defaultMetaReviewPanePollIntervalMs = 800;
const metaReviewPaneCaptureHistoryLines = 5000;
const metaReviewerSubmitterAgent: AgentName = "codex";

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
      },
      report_markdown: {
        type: "string"
      }
    },
    required: [
      "recommendation",
      "summary",
      "rework_target_message",
      "report_markdown"
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
    '- "report_markdown" must contain your rationale and evidence references.',
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
): {
  recommendation: MetaReviewRecommendation;
  summary: string;
  reworkTargetMessage: string | null;
  reportMarkdown: string;
} {
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

  const reportMarkdownRaw = parsed.report_markdown;
  if (!isNonEmptyString(reportMarkdownRaw)) {
    throw new Error(
      "meta-review runner output.report_markdown must be a non-empty string."
    );
  }
  const reportMarkdown = reportMarkdownRaw.trimEnd();

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
    reworkTargetMessage,
    reportMarkdown
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
      recommendation: parsed.recommendation,
      summary: parsed.summary,
      report_markdown: parsed.reportMarkdown,
      report_json: {
        source: "codex-exec",
        mode: "agent",
        depth: input.depth,
        bubble_id: input.bubbleId,
        run_id: input.runId
      },
      ...(parsed.reworkTargetMessage !== null
        ? { rework_target_message: parsed.reworkTargetMessage }
        : {})
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
    recommendation: parsed.recommendation,
    summary: parsed.summary,
    report_markdown: parsed.reportMarkdown,
    report_json: {
      source: "codex-pane",
      mode: "agent",
      depth: input.depth,
      bubble_id: input.bubbleId,
      run_id: input.runId
    },
    ...(parsed.reworkTargetMessage !== null
      ? { rework_target_message: parsed.reworkTargetMessage }
      : {})
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

export async function submitMetaReviewResult(
  input: MetaReviewSubmitInput,
  dependencies: MetaReviewDependencies = {}
): Promise<MetaReviewSubmitResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const readRuntimeSessions =
    dependencies.readRuntimeSessionsRegistry ?? readRuntimeSessionsRegistry;
  const writeFileFn = dependencies.writeFile ?? writeFile;
  const now = dependencies.now ?? new Date();

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const loadedState = await readState(resolved.bubblePaths.statePath);
  await assertMetaReviewSubmitterOwnership({
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

  if (input.report_json !== undefined && !isRecord(input.report_json)) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json must be an object when provided"
    );
  }

  const updatedAt = now.toISOString();
  const recommendation = input.recommendation;
  const status = mapRecommendationToStatus(recommendation);
  const summary = normalizeRequiredSubmitText(input.summary, "summary");
  const reportMarkdown = normalizeRequiredSubmitText(
    input.report_markdown,
    "report_markdown"
  );
  const reworkTargetMessage = normalizeOptionalText(
    input.rework_target_message ?? undefined
  );
  const canonicalReportJson = resolveCanonicalMetaReviewReportJson({
    recommendation,
    ...(input.report_json !== undefined
      ? { reportJson: input.report_json }
      : {}),
    runId: null
  });

  assertRunPayloadInvariants({
    recommendation,
    status,
    reworkTargetMessage
  });

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
    last_autonomous_run_id: null,
    last_autonomous_status: status,
    last_autonomous_recommendation: recommendation,
    last_autonomous_summary: summary,
    last_autonomous_report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    last_autonomous_rework_target_message: reworkTargetMessage,
    last_autonomous_updated_at: updatedAt
  };

  const nextState: BubbleStateSnapshot = {
    ...loadedState.state,
    meta_review: nextMetaReview
  };

  let written: LoadedStateSnapshot;
  try {
    written = await writeState(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "META_REVIEW_RUNNING"
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      const latest = await readState(resolved.bubblePaths.statePath);
      if (latest.state.state !== "META_REVIEW_RUNNING") {
        throw new MetaReviewError(
          "META_REVIEW_STATE_INVALID",
          `meta-review submit requires META_REVIEW_RUNNING state (current: ${latest.state.state}).`
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
    round: input.round,
    generated_at: updatedAt,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    report_json_ref: CANONICAL_META_REVIEW_REPORT_JSON_REF,
    rework_target_message: reworkTargetMessage,
    warnings,
    report_json: canonicalReportJson
  };

  const artifactWrites = await Promise.allSettled([
    writeFileFn(
      resolved.bubblePaths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(reportPayload, null, 2)}\n`,
      "utf8"
    ),
    writeFileFn(
      resolved.bubblePaths.metaReviewLastMarkdownArtifactPath,
      `${reportMarkdown.trimEnd()}\n`,
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

  return {
    bubbleId: resolved.bubbleId,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    rework_target_message: reworkTargetMessage,
    updated_at: updatedAt,
    lifecycle_state: written.state.state,
    warnings,
    report_json: canonicalReportJson
  };
}

export async function runMetaReview(
  input: MetaReviewRunInput,
  dependencies: MetaReviewDependencies = {}
): Promise<MetaReviewRunResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const runLiveReview = dependencies.runLiveReview ?? defaultLiveRunner;
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
    loadedState.state.state === "META_REVIEW_RUNNING"
    && dependencies.allowMetaReviewRunningState !== true
  ) {
    throw new MetaReviewError(
      "META_REVIEW_STATE_INVALID",
      "meta-review run is disabled while META_REVIEW_RUNNING submit channel is active"
    );
  }
  const runId = makeUuid();
  const updatedAt = now.toISOString();
  const depth = input.depth ?? "standard";

  let recommendation: MetaReviewRecommendation;
  let status: MetaReviewRunStatus;
  let summary: string | null;
  let reportMarkdown: string;
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
    reworkTargetMessage = normalizeOptionalText(output.rework_target_message);
    reportJson = output.report_json;

    if (isNonEmptyString(output.report_markdown)) {
      reportMarkdown = output.report_markdown.trimEnd();
    } else {
      const summaryText =
        summary ??
        `Meta-review completed with recommendation ${recommendation}.`;
      reportMarkdown = [
        "# Meta Review Report",
        "",
        `- Bubble: ${resolved.bubbleId}`,
        `- Run: ${runId}`,
        `- Generated: ${updatedAt}`,
        `- Recommendation: ${recommendation}`,
        `- Status: ${status}`,
        "",
        "## Summary",
        "",
        summaryText
      ].join("\n");
    }
  } catch (error) {
    const failure = formatRunnerFailure(error);
    recommendation = "inconclusive";
    status = "error";
    summary = failure.summary;
    reworkTargetMessage = null;
    reportMarkdown = buildFallbackReportMarkdown({
      bubbleId: resolved.bubbleId,
      runId,
      updatedAt,
      summary
    });

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
  const shouldRecoverFromRunFailedHumanGate =
    loadedState.state.state === "META_REVIEW_FAILED" && status === "success";
  const lifecycleBaseState = shouldRecoverFromRunFailedHumanGate
    ? applyStateTransition(loadedState.state, {
        to: "READY_FOR_HUMAN_APPROVAL",
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        lastCommandAt: updatedAt
      })
    : loadedState.state;
  const nextMetaReview: BubbleMetaReviewSnapshotState = {
    ...previousMetaReview,
    last_autonomous_run_id: runId,
    last_autonomous_status: status,
    last_autonomous_recommendation: recommendation,
    last_autonomous_summary: summary,
    last_autonomous_report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    last_autonomous_rework_target_message: reworkTargetMessage,
    last_autonomous_updated_at: updatedAt,
    ...(shouldRecoverFromRunFailedHumanGate ? { sticky_human_gate: true } : {})
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
    generated_at: updatedAt,
    depth,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    report_json_ref: CANONICAL_META_REVIEW_REPORT_JSON_REF,
    rework_target_message: reworkTargetMessage,
    warnings,
    report_json: canonicalReportJson
  };

  const artifactWrites = await Promise.allSettled([
    writeFileFn(
      resolved.bubblePaths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(reportPayload, null, 2)}\n`,
      "utf8"
    ),
    writeFileFn(
      resolved.bubblePaths.metaReviewLastMarkdownArtifactPath,
      `${reportMarkdown.trimEnd()}\n`,
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
    await appendProtocolEnvelope({
      transcriptPath: resolved.bubblePaths.transcriptPath,
      mirrorPaths: [resolved.bubblePaths.inboxPath],
      lockPath: join(
        resolved.bubblePaths.locksDir,
        `${resolved.bubbleId}.lock`
      ),
      now,
      envelope: {
        bubble_id: resolved.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: written.state.round,
        payload: {
          summary:
            summary ??
            `Meta-review completed with recommendation ${recommendation}.`,
          metadata: {
            actor: "meta-reviewer",
            actor_agent: "codex",
            latest_recommendation: recommendation,
            run_id: runId
          }
        },
        refs: [CANONICAL_META_REVIEW_REPORT_REF]
      }
    });
  }

  return {
    bubbleId: resolved.bubbleId,
    depth,
    run_id: runId,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    rework_target_message: reworkTargetMessage,
    updated_at: updatedAt,
    lifecycle_state: written.state.state,
    warnings,
    report_json: canonicalReportJson
  };
}

export async function getMetaReviewStatus(
  input: MetaReviewReadInput,
  dependencies: MetaReviewDependencies = {}
): Promise<MetaReviewStatusView> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const snapshot = normalizeMetaReviewSnapshot(loadedState.state.meta_review);

  return createMetaReviewStatusView(resolved.bubbleId, snapshot);
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export async function getMetaReviewLastReport(
  input: MetaReviewReadInput,
  dependencies: MetaReviewDependencies = {}
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

  if (!isNonEmptyString(snapshot.last_autonomous_report_ref)) {
    return {
      bubbleId: resolved.bubbleId,
      has_report: false,
      report_ref: null,
      summary: snapshot.last_autonomous_summary,
      updated_at: snapshot.last_autonomous_updated_at,
      report_markdown: null
    };
  }

  const reportRef = snapshot.last_autonomous_report_ref;
  const reportPath = resolveReportArtifactPath({
    bubbleDir: resolved.bubblePaths.bubbleDir,
    artifactsDir: resolved.bubblePaths.artifactsDir,
    reportRef
  });

  let reportMarkdown: string;
  try {
    reportMarkdown = await readFileFn(reportPath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        bubbleId: resolved.bubbleId,
        has_report: false,
        report_ref: reportRef,
        summary: snapshot.last_autonomous_summary,
        updated_at: snapshot.last_autonomous_updated_at,
        report_markdown: null
      };
    }
    throw error;
  }

  return {
    bubbleId: resolved.bubbleId,
    has_report: true,
    report_ref: reportRef,
    summary: snapshot.last_autonomous_summary,
    updated_at: snapshot.last_autonomous_updated_at,
    report_markdown: reportMarkdown
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
