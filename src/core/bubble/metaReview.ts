import { randomUUID } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import {
  StateStoreConflictError,
  readStateSnapshot,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../state/stateStore.js";
import { SchemaValidationError, isNonEmptyString } from "../validation.js";
import { readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../types/bubble.js";
import {
  isFindingPriority,
  resolveFindingPriority,
  type Finding
} from "../../types/findings.js";
import type {
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../types/bubble.js";
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

export interface MetaReviewLiveRunnerInput {
  bubbleId: string;
  repoPath: string;
  transcriptPath: string;
  reviewerAgent: string;
  depth: MetaReviewDepth;
  state: BubbleStateSnapshot;
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
  run_id: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string | null;
  report_ref: string;
  rework_target_message: string | null;
  updated_at: string;
  lifecycle_state: BubbleStateSnapshot["state"];
  warnings: MetaReviewRunWarning[];
}

export interface MetaReviewDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  runLiveReview?: (
    input: MetaReviewLiveRunnerInput
  ) => Promise<MetaReviewLiveRunnerOutput>;
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  now?: Date;
  randomUUID?: () => string;
}

export type MetaReviewErrorReasonCode =
  | "META_REVIEW_REWORK_MESSAGE_INVALID"
  | "META_REVIEW_SNAPSHOT_WRITE_CONFLICT"
  | "META_REVIEW_BUBBLE_LOOKUP_FAILED"
  | "META_REVIEW_SCHEMA_INVALID"
  | "META_REVIEW_SCHEMA_INVALID_COMBINATION"
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

const metaReviewRunnerModes = ["heuristic", "unavailable"] as const;
type MetaReviewRunnerMode = (typeof metaReviewRunnerModes)[number];

function resolveMetaReviewRunnerMode(): MetaReviewRunnerMode {
  const configuredMode = process.env.PAIRFLOW_META_REVIEW_RUNNER_MODE?.trim().toLowerCase();
  if (
    configuredMode !== undefined &&
    (metaReviewRunnerModes as readonly string[]).includes(configuredMode)
  ) {
    return configuredMode as MetaReviewRunnerMode;
  }
  if (process.env.NODE_ENV === "test") {
    return "unavailable";
  }
  return "heuristic";
}

function resolveMetaReviewFindingPriority(finding: Finding): string | null {
  const effective = finding.effective_priority;
  if (isFindingPriority(effective)) {
    return effective;
  }
  const resolved = resolveFindingPriority(finding);
  return resolved ?? null;
}

function formatFindingList(findings: Finding[]): string[] {
  return findings.map((finding, index) => {
    const priority = resolveMetaReviewFindingPriority(finding) ?? "Pn";
    return `${index + 1}. [${priority}] ${finding.title}`;
  });
}

function normalizeFindings(input: unknown): Finding[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.filter(
    (entry): entry is Finding =>
      typeof entry === "object" &&
      entry !== null &&
      isNonEmptyString((entry as { title?: unknown }).title)
  );
}

function buildHeuristicReport(input: {
  bubbleId: string;
  reviewerAgent: string;
  recommendation: MetaReviewRecommendation;
  summary: string;
  reviewerPassRound?: number;
  findings: Finding[];
}): string {
  const lines = [
    "# Meta Review Report",
    "",
    `- Bubble: ${input.bubbleId}`,
    `- Reviewer Agent: ${input.reviewerAgent}`,
    `- Recommendation: ${input.recommendation}`,
    `- Source: transcript-heuristic`,
    ...(input.reviewerPassRound !== undefined
      ? [`- Reviewer PASS round: ${input.reviewerPassRound}`]
      : []),
    "",
    "## Summary",
    "",
    input.summary
  ];
  if (input.findings.length > 0) {
    lines.push("", "## Latest Reviewer Findings", "", ...formatFindingList(input.findings));
  }
  return lines.join("\n");
}

async function runHeuristicLiveReview(
  input: MetaReviewLiveRunnerInput
): Promise<MetaReviewLiveRunnerOutput> {
  const transcript = await readTranscriptEnvelopes(input.transcriptPath, {
    allowMissing: true,
    toleratePartialFinalLine: true
  });

  const latestReviewerPass = [...transcript]
    .reverse()
    .find(
      (envelope) =>
        envelope.type === "PASS" && envelope.sender === input.reviewerAgent
    );

  if (latestReviewerPass === undefined) {
    const summary =
      "Heuristic meta-review inconclusive: no reviewer PASS envelope found in transcript.";
    return {
      recommendation: "inconclusive",
      summary,
      report_markdown: buildHeuristicReport({
        bubbleId: input.bubbleId,
        reviewerAgent: input.reviewerAgent,
        recommendation: "inconclusive",
        summary,
        findings: []
      }),
      report_json: {
        source: "transcript-heuristic",
        reason: "reviewer_pass_missing"
      }
    };
  }

  const findings = normalizeFindings(latestReviewerPass.payload.findings);
  const passIntent = latestReviewerPass.payload.pass_intent;
  const blockingFindings = findings.filter((finding) => {
    const priority = resolveMetaReviewFindingPriority(finding);
    return priority === "P0" || priority === "P1";
  });

  if (passIntent === "fix_request" || blockingFindings.length > 0) {
    const summary = `Heuristic meta-review recommends rework: latest reviewer pass includes ${blockingFindings.length > 0 ? "blocking findings" : "fix_request intent"}.`;
    const messageLines = [
      `Address reviewer blockers from round ${latestReviewerPass.round}:`,
      ...(blockingFindings.length > 0
        ? formatFindingList(blockingFindings)
        : ["1. Reviewer requested explicit fix cycle before approval."])
    ];
    return {
      recommendation: "rework",
      summary,
      report_markdown: buildHeuristicReport({
        bubbleId: input.bubbleId,
        reviewerAgent: input.reviewerAgent,
        recommendation: "rework",
        summary,
        reviewerPassRound: latestReviewerPass.round,
        findings
      }),
      report_json: {
        source: "transcript-heuristic",
        reviewer_pass_round: latestReviewerPass.round,
        findings_count: findings.length,
        blocking_findings_count: blockingFindings.length
      },
      rework_target_message: messageLines.join("\n")
    };
  }

  if (findings.length === 0) {
    const summary =
      "Heuristic meta-review approves: latest reviewer pass is clean with no findings.";
    return {
      recommendation: "approve",
      summary,
      report_markdown: buildHeuristicReport({
        bubbleId: input.bubbleId,
        reviewerAgent: input.reviewerAgent,
        recommendation: "approve",
        summary,
        reviewerPassRound: latestReviewerPass.round,
        findings
      }),
      report_json: {
        source: "transcript-heuristic",
        reviewer_pass_round: latestReviewerPass.round,
        findings_count: 0
      }
    };
  }

  const summary =
    "Heuristic meta-review inconclusive: latest reviewer pass contains only non-blocking findings.";
  return {
    recommendation: "inconclusive",
    summary,
    report_markdown: buildHeuristicReport({
      bubbleId: input.bubbleId,
      reviewerAgent: input.reviewerAgent,
      recommendation: "inconclusive",
      summary,
      reviewerPassRound: latestReviewerPass.round,
      findings
    }),
    report_json: {
      source: "transcript-heuristic",
      reviewer_pass_round: latestReviewerPass.round,
      findings_count: findings.length,
      reason: "non_blocking_findings_only"
    }
  };
}

async function defaultLiveRunner(
  input: MetaReviewLiveRunnerInput
): Promise<MetaReviewLiveRunnerOutput> {
  if (resolveMetaReviewRunnerMode() === "unavailable") {
    throw new Error("Meta-review runner adapter is unavailable.");
  }
  return runHeuristicLiveReview(input);
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
      transcriptPath: resolved.bubblePaths.transcriptPath,
      reviewerAgent: resolved.bubbleConfig.agents.reviewer,
      depth,
      state: loadedState.state,
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

  assertRunPayloadInvariants({
    recommendation,
    status,
    reworkTargetMessage
  });

  const previousMetaReview = normalizeMetaReviewSnapshot(loadedState.state.meta_review);
  const nextMetaReview: BubbleMetaReviewSnapshotState = {
    ...previousMetaReview,
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
    meta_review: nextMetaReview
  };

  let written: LoadedStateSnapshot;
  try {
    written = await writeState(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint
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
    report_json: reportJson
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
    depth,
    run_id: runId,
    status,
    recommendation,
    summary,
    report_ref: CANONICAL_META_REVIEW_REPORT_REF,
    rework_target_message: reworkTargetMessage,
    updated_at: updatedAt,
    lifecycle_state: written.state.state,
    warnings
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
