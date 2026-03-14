import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { appendProtocolEnvelope, type AppendProtocolEnvelopeResult } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { isRecord } from "../validation.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../runtime/sessionsRegistry.js";
import { runTmux } from "../runtime/tmuxManager.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage
} from "../runtime/tmuxInput.js";
import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  type BubbleMetaReviewSnapshotState,
  type BubbleStateSnapshot,
  type AgentName,
  type MetaReviewRecommendation,
  type MetaReviewRunStatus
} from "../../types/bubble.js";
import {
  MetaReviewError,
  hasCanonicalSubmitForActiveMetaReviewRound,
  type MetaReviewRunResult,
  type MetaReviewRunWarning
} from "./metaReview.js";
import { appendHumanApprovalRequestEnvelope } from "./approvalRequestEnvelope.js";
import {
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode,
  resolveLegacySummaryFindingsClaimState
} from "../convergence/policy.js";
import {
  deliveryTargetRoleMetadataKey,
  type FindingsParityStatus,
  type FindingsParityMetadata,
  isFindingsClaimSource,
  isFindingsClaimState,
  type ProtocolEnvelope
} from "../../types/protocol.js";

export type MetaReviewGateRoute =
  | "meta_review_running"
  | "auto_rework"
  | "human_gate_sticky_bypass"
  | "human_gate_approve"
  | "human_gate_budget_exhausted"
  | "human_gate_inconclusive"
  | "human_gate_run_failed"
  | "human_gate_dispatch_failed";

export type MetaReviewGateReasonCode =
  | "META_REVIEW_GATE_RUN_FAILED"
  | "META_REVIEW_GATE_REWORK_DISPATCH_FAILED"
  | "META_REVIEW_GATE_STATE_CONFLICT"
  | "META_REVIEW_GATE_TRANSITION_INVALID";

export interface ApplyMetaReviewGateOnConvergenceInput {
  bubbleId: string;
  summary: string;
  refs?: string[];
  repoPath?: string;
  cwd?: string;
  now?: Date;
}

export interface ApplyMetaReviewGateOnConvergenceDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  setMetaReviewerPaneBinding?: typeof setMetaReviewerPaneBinding;
  notifyMetaReviewerSubmissionRequest?: typeof notifyMetaReviewerSubmissionRequest;
  runTmux?: typeof runTmux;
  readFile?: typeof readFile;
}

export interface RecoverMetaReviewGateFromSnapshotInput {
  bubbleId: string;
  refs?: string[];
  summary?: string;
  repoPath?: string;
  cwd?: string;
  now?: Date;
  runResult?: MetaReviewRunResult;
}

export interface RecoverMetaReviewGateFromSnapshotDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  setMetaReviewerPaneBinding?: typeof setMetaReviewerPaneBinding;
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}

export interface MetaReviewGateResult {
  bubbleId: string;
  route: MetaReviewGateRoute;
  gateSequence: number;
  gateEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  metaReviewRun?: MetaReviewRunResult;
}

interface MetaReviewGateErrorDiagnostics {
  rollbackReasonCode?: string;
  rollbackOutcome?: "not_attempted" | "applied" | "failed";
  rollbackTargetState?: BubbleStateSnapshot["state"];
  stageReasonCode?: string;
  restoreReasonCode?: string;
  retryInvariantReasonCode?: string;
}

export class MetaReviewGateError extends Error {
  public readonly reasonCode: MetaReviewGateReasonCode;
  public readonly diagnostics: MetaReviewGateErrorDiagnostics | undefined;

  public constructor(
    reasonCode: MetaReviewGateReasonCode,
    message: string,
    diagnostics?: MetaReviewGateErrorDiagnostics
  ) {
    super(message);
    this.name = "MetaReviewGateError";
    this.reasonCode = reasonCode;
    this.diagnostics = diagnostics;
  }
}

const metaReviewFallbackReportRef = "artifacts/meta-review-last.md";
const metaReviewFallbackReportJsonRef = "artifacts/meta-review-last.json";
const metaReviewerAgent: AgentName = "codex";
const metaReviewFindingsArtifactRequiredReasonCode =
  "META_REVIEW_FINDINGS_ARTIFACT_REQUIRED";
const metaReviewFindingsCountMismatchReasonCode =
  "META_REVIEW_FINDINGS_COUNT_MISMATCH";
const metaReviewFindingsRunLinkMissingReasonCode =
  "META_REVIEW_FINDINGS_RUN_LINK_MISSING";
const metaReviewFindingsParityGuardReasonCode =
  "META_REVIEW_FINDINGS_PARITY_GUARD";
const metaReviewGateRollbackNotAttemptedReasonCode =
  "META_REVIEW_GATE_ROLLBACK_NOT_ATTEMPTED";
const metaReviewGateRollbackAppliedReasonCode =
  "META_REVIEW_GATE_ROLLBACK_APPLIED";
const metaReviewGateRollbackStateConflictReasonCode =
  "META_REVIEW_GATE_ROLLBACK_STATE_CONFLICT";
const metaReviewGateRollbackTransitionInvalidReasonCode =
  "META_REVIEW_GATE_ROLLBACK_TRANSITION_INVALID";
const metaReviewGateStagedReadyRestoreAppliedReasonCode =
  "META_REVIEW_GATE_STAGED_READY_RESTORE_APPLIED";
const metaReviewGateStagedReadyRestoreStateConflictReasonCode =
  "META_REVIEW_GATE_STAGED_READY_RESTORE_STATE_CONFLICT";
const metaReviewGateStagedReadyRestoreTransitionInvalidReasonCode =
  "META_REVIEW_GATE_STAGED_READY_RESTORE_TRANSITION_INVALID";
const metaReviewGateAutoReworkRetryRoundInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_ROUND_INVARIANT";
const metaReviewGateAutoReworkRetryOwnershipInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_OWNERSHIP_INVARIANT";
const metaReviewGateAutoReworkRetryRoundRoleHistoryInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_ROUND_ROLE_HISTORY_INVARIANT";
const metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_RUN_IDENTITY_INVARIANT";
const metaReviewGatePaneDeactivationUnavoidableReasonCode =
  "META_REVIEW_GATE_PANE_DEACTIVATION_UNAVOIDABLE";
const findingsArtifactReadRetryableErrorCodes = new Set([
  "EAGAIN",
  "EBUSY",
  "EINTR",
  "EMFILE",
  "ENFILE",
  "ENOENT",
  "ETIMEDOUT",
  "EIO"
]);
const findingsArtifactReadMaxAttempts = 3;
const findingsArtifactReadRetryBaseDelayMs = 25;
const findingsArtifactReadRetryMaxDelayMs = 75;

function resolveFindingsArtifactReadRetryDelayMs(attempt: number): number {
  const scaledDelay = findingsArtifactReadRetryBaseDelayMs * attempt;
  return Math.min(scaledDelay, findingsArtifactReadRetryMaxDelayMs);
}

async function defaultSleepForRetryMs(delayMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot !== undefined) {
    return snapshot;
  }

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

function isRetryableFindingsArtifactReadError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) {
    return false;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return (
    typeof code === "string" &&
    findingsArtifactReadRetryableErrorCodes.has(code.trim().toUpperCase())
  );
}

function formatReadErrorDetail(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return `${code.trim().toUpperCase()}: ${error.message}`;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

async function readFindingsArtifactWithRetry(input: {
  artifactPath: string;
  readFileFn: typeof readFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | { ok: true; raw: string; attempts: number }
  | { ok: false; error: unknown; attempts: number; retried: boolean }
> {
  let attempts = 0;
  let lastError: unknown = new Error("unknown findings artifact read error");

  while (attempts < findingsArtifactReadMaxAttempts) {
    attempts += 1;
    try {
      const raw = await input.readFileFn(input.artifactPath, "utf8");
      return { ok: true, raw, attempts };
    } catch (error) {
      lastError = error;
      if (
        !isRetryableFindingsArtifactReadError(error) ||
        attempts >= findingsArtifactReadMaxAttempts
      ) {
        return {
          ok: false,
          error,
          attempts,
          retried: attempts > 1
        };
      }
      const retryDelayMs = resolveFindingsArtifactReadRetryDelayMs(attempts);
      const sleepForRetryMs = input.sleepForRetryMs ?? defaultSleepForRetryMs;
      await sleepForRetryMs(retryDelayMs);
    }
  }

  return {
    ok: false,
    error: lastError,
    attempts,
    retried: attempts > 1
  };
}

export interface NotifyMetaReviewerSubmissionRequestInput {
  bubbleId: string;
  round: number;
  targetPane: string;
}

export interface NotifyMetaReviewerSubmissionRequestDependencies {
  runTmux?: typeof runTmux;
}

export async function notifyMetaReviewerSubmissionRequest(
  input: NotifyMetaReviewerSubmissionRequestInput,
  dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
): Promise<void> {
  const runner = dependencies.runTmux ?? runTmux;
  const message = [
    `# [pairflow] bubble=${input.bubbleId} meta-review request round=${input.round}.`,
    "Perform autonomous meta-review now, then submit through structured Pairflow CLI (no pane markers).",
    `Required command: pairflow bubble meta-review submit --id ${input.bubbleId} --round ${input.round} --recommendation <approve|rework|inconclusive> --summary "<summary>" --report-markdown "<markdown>" [--rework-target-message "<message>"] [--report-json '{"findings_claim_state":"clean|open_findings|unknown","findings_claim_source":"meta_review_artifact","findings_count":<int>,"findings_artifact_ref":"artifacts/...","meta_review_run_id":"<run-id>","findings_digest_sha256":"<sha256>","findings_artifact_status":"available"}'].`
  ].join(" ");

  await maybeAcceptClaudeTrustPrompt(runner, input.targetPane).catch(() => undefined);
  await sendAndSubmitTmuxPaneMessage(runner, input.targetPane, message);
}

function toConflictError(error: unknown): MetaReviewGateError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_STATE_CONFLICT",
    `META_REVIEW_GATE_STATE_CONFLICT: ${reason}`
  );
}

function toTransitionError(error: unknown): MetaReviewGateError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${reason}`
  );
}

function assertRunningConvergenceState(state: BubbleStateSnapshot): void {
  if (state.state !== "RUNNING") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `meta-review gate convergence route requires RUNNING state (current: ${state.state}).`
    );
  }
}

function buildGateLockPath(paths: { locksDir: string; bubbleId: string }): string {
  return join(paths.locksDir, `${paths.bubbleId}.lock`);
}

function buildHumanGateSummary(input: {
  convergenceSummary: string;
  metaReviewRun?: MetaReviewRunResult;
  fallbackReason?: string;
}): string {
  if (input.fallbackReason !== undefined) {
    return input.fallbackReason;
  }
  const runSummary = input.metaReviewRun?.summary;
  if (typeof runSummary === "string" && runSummary.trim().length > 0) {
    return runSummary;
  }
  return input.convergenceSummary;
}

function resolveFindingsParityMetadataForEnvelope(
  metadata: FindingsParityMetadata | null | undefined
): Record<string, unknown> {
  if (metadata === null || metadata === undefined) {
    return {};
  }
  return {
    findings_claimed_open_total: metadata.findings_claimed_open_total,
    findings_artifact_open_total: metadata.findings_artifact_open_total,
    findings_artifact_status: metadata.findings_artifact_status,
    findings_digest_sha256: metadata.findings_digest_sha256,
    meta_review_run_id: metadata.meta_review_run_id,
    findings_parity_status: metadata.findings_parity_status
  };
}

function transitionToGateState(input: {
  current: BubbleStateSnapshot;
  nowIso: string;
  targetState:
    | "READY_FOR_HUMAN_APPROVAL"
    | "READY_FOR_APPROVAL"
    | "META_REVIEW_FAILED";
  stickyHumanGate: boolean;
  metaReviewRun?: MetaReviewRunResult;
  fallbackRecommendation?: MetaReviewRecommendation;
  fallbackSummary?: string;
}): BubbleStateSnapshot {
  const transitioned = applyStateTransition(input.current, {
    to: input.targetState,
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.nowIso
  });

  const metaReview = normalizeMetaReviewSnapshot(transitioned.meta_review);
  const shouldHydrateFromRunResult = input.metaReviewRun !== undefined;
  const runResult = input.metaReviewRun;
  const shouldHydrateFallbackRecommendation =
    input.fallbackRecommendation !== undefined;
  const fallbackRecommendation: MetaReviewRecommendation =
    input.fallbackRecommendation ?? "inconclusive";
  const fallbackStatus: MetaReviewRunStatus =
    fallbackRecommendation === "inconclusive" ? "error" : "success";
  const fallbackReworkTargetMessage =
    fallbackRecommendation === "rework"
      ? (
          typeof metaReview.last_autonomous_rework_target_message === "string" &&
          metaReview.last_autonomous_rework_target_message.trim().length > 0
            ? metaReview.last_autonomous_rework_target_message
            : "Meta-review gate fallback rework target unavailable."
        )
      : null;
  return {
    ...transitioned,
    meta_review: {
      ...metaReview,
      ...(shouldHydrateFromRunResult && runResult !== undefined
        ? buildHydratedMetaReviewSnapshotFromRunResult({
            metaReview,
            runResult
          })
        : shouldHydrateFallbackRecommendation
        ? {
            last_autonomous_run_id: null,
            last_autonomous_status: fallbackStatus,
            last_autonomous_recommendation: fallbackRecommendation,
            last_autonomous_summary:
              input.fallbackSummary ??
              `Meta-review gate fallback recommendation: ${fallbackRecommendation}.`,
            last_autonomous_report_ref: metaReviewFallbackReportRef,
            last_autonomous_rework_target_message: fallbackReworkTargetMessage,
            last_autonomous_updated_at: input.nowIso
          }
        : {}),
      sticky_human_gate: input.stickyHumanGate
    }
  };
}

function buildHydratedMetaReviewSnapshotFromRunResult(input: {
  metaReview: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
}): BubbleMetaReviewSnapshotState {
  return {
    ...input.metaReview,
    last_autonomous_run_id: input.runResult.run_id ?? null,
    last_autonomous_status: input.runResult.status,
    last_autonomous_recommendation: input.runResult.recommendation,
    last_autonomous_summary: input.runResult.summary,
    last_autonomous_report_ref: input.runResult.report_ref,
    last_autonomous_rework_target_message:
      input.runResult.recommendation === "rework"
        ? (
            typeof input.runResult.rework_target_message === "string" &&
            input.runResult.rework_target_message.trim().length > 0
              ? input.runResult.rework_target_message
              : "Meta-review gate fallback rework target unavailable."
          )
        : null,
    last_autonomous_updated_at: input.runResult.updated_at
  };
}

function incrementAutoReworkCount(input: BubbleStateSnapshot): BubbleStateSnapshot {
  const metaReview = normalizeMetaReviewSnapshot(input.meta_review);
  return {
    ...input,
    meta_review: {
      ...metaReview,
      auto_rework_count: metaReview.auto_rework_count + 1
    }
  };
}

function resolveHumanGateRoute(
  recommendation: MetaReviewRecommendation,
  budgetAvailable: boolean
): Exclude<
  MetaReviewGateRoute,
  | "meta_review_running"
  | "auto_rework"
  | "human_gate_sticky_bypass"
  | "human_gate_run_failed"
  | "human_gate_dispatch_failed"
> {
  if (recommendation === "approve") {
    return "human_gate_approve";
  }
  if (recommendation === "rework") {
    if (budgetAvailable) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        "META_REVIEW_GATE_TRANSITION_INVALID: human gate route resolver reached rework+budgetAvailable branch unexpectedly."
      );
    }
    return "human_gate_budget_exhausted";
  }
  return "human_gate_inconclusive";
}

function resolveMetaReviewReportJsonObject(
  source: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (source === undefined) {
    return undefined;
  }
  if (isRecord(source.report_json)) {
    return source.report_json;
  }
  const hasFlatClaimFields =
    source.findings_claim_state !== undefined ||
    source.findings_claim_source !== undefined ||
    source.findings_count !== undefined ||
    source.findings_artifact_ref !== undefined ||
    source.findings_run_id !== undefined ||
    source.meta_review_run_id !== undefined ||
    source.findings_digest_sha256 !== undefined ||
    source.findings_artifact_status !== undefined ||
    source.findings_parity_status !== undefined;
  return hasFlatClaimFields ? source : undefined;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function resolveMetaReviewRunId(
  reportJson: Record<string, unknown>
): string | undefined {
  if (
    typeof reportJson.meta_review_run_id === "string" &&
    reportJson.meta_review_run_id.trim().length > 0
  ) {
    return reportJson.meta_review_run_id.trim();
  }
  if (
    typeof reportJson.findings_run_id === "string" &&
    reportJson.findings_run_id.trim().length > 0
  ) {
    return reportJson.findings_run_id.trim();
  }
  return undefined;
}

function resolveFindingsArtifactStatus(
  reportJson: Record<string, unknown>
): string | undefined {
  if (
    typeof reportJson.findings_artifact_status === "string" &&
    reportJson.findings_artifact_status.trim().length > 0
  ) {
    return reportJson.findings_artifact_status.trim();
  }
  if (
    typeof reportJson.artifact_status === "string" &&
    reportJson.artifact_status.trim().length > 0
  ) {
    return reportJson.artifact_status.trim();
  }
  return undefined;
}

function resolveFindingsDigestSha256(
  reportJson: Record<string, unknown>
): string | undefined {
  if (
    typeof reportJson.findings_digest_sha256 !== "string" ||
    reportJson.findings_digest_sha256.trim().length === 0
  ) {
    return undefined;
  }
  const normalized = reportJson.findings_digest_sha256.trim().toLowerCase();
  return /^[a-f0-9]{64}$/u.test(normalized) ? normalized : undefined;
}

function resolveFindingsArtifactOpenTotalFromArtifact(
  artifact: Record<string, unknown>
): number | undefined {
  const candidates: unknown[] = [
    artifact.open_total,
    artifact.findings_open_total
  ];
  if (isRecord(artifact.summary)) {
    candidates.push(artifact.summary.open_total);
  }
  if (isRecord(artifact.findings_summary)) {
    candidates.push(artifact.findings_summary.open_total);
  }
  for (const candidate of candidates) {
    if (isNonNegativeInteger(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function resolveFindingsParityStatus(
  reportJson: Record<string, unknown>
): FindingsParityStatus | null {
  if (typeof reportJson.findings_parity_status === "string") {
    if (reportJson.findings_parity_status === "ok") {
      return "ok";
    }
    if (reportJson.findings_parity_status === "mismatch") {
      return "mismatch";
    }
    if (reportJson.findings_parity_status === "guard_failed") {
      return "guard_failed";
    }
  }
  return null;
}

function resolveRecoveredReportRef(input: {
  reportRef: string;
  bubbleDir: string;
  artifactsDir: string;
}): string {
  const reportRef = input.reportRef.trim();
  if (
    reportRef.length === 0 ||
    !reportRef.startsWith("artifacts/") ||
    reportRef.includes("..") ||
    reportRef.includes("\\") ||
    reportRef.includes("\0")
  ) {
    return metaReviewFallbackReportRef;
  }
  const resolvedPath = resolve(input.bubbleDir, reportRef);
  const relativeToArtifacts = relative(input.artifactsDir, resolvedPath);
  if (
    relativeToArtifacts.startsWith("..") ||
    isAbsolute(relativeToArtifacts)
  ) {
    return metaReviewFallbackReportRef;
  }
  return reportRef;
}

function resolveFindingsParityMetadataFromReportJson(
  reportJson: Record<string, unknown> | undefined
): FindingsParityMetadata | null {
  if (reportJson === undefined) {
    return null;
  }
  const claimCount = resolveFindingsCountFromMetaReviewReportJson(reportJson);
  const artifactCount = isNonNegativeInteger(reportJson.findings_artifact_open_total)
    ? reportJson.findings_artifact_open_total
    : null;
  return {
    findings_claimed_open_total: claimCount ?? null,
    findings_artifact_open_total: artifactCount,
    findings_artifact_status: resolveFindingsArtifactStatus(reportJson) ?? null,
    findings_digest_sha256: resolveFindingsDigestSha256(reportJson) ?? null,
    meta_review_run_id: resolveMetaReviewRunId(reportJson) ?? null,
    findings_parity_status: resolveFindingsParityStatus(reportJson)
  };
}

function resolveFindingsArtifactPath(input: {
  bubbleDir: string;
  artifactsDir: string;
  artifactRef: string;
}): string | undefined {
  if (
    !input.artifactRef.startsWith("artifacts/") ||
    input.artifactRef.includes("..") ||
    input.artifactRef.includes("\\") ||
    input.artifactRef.includes("\0")
  ) {
    return undefined;
  }
  const artifactPath = resolve(input.bubbleDir, input.artifactRef);
  const relativeToArtifacts = relative(input.artifactsDir, artifactPath);
  if (
    relativeToArtifacts.startsWith("..") ||
    isAbsolute(relativeToArtifacts)
  ) {
    return undefined;
  }
  return artifactPath;
}

async function readMetaReviewReportJsonArtifact(input: {
  artifactPath: string;
  readFileFn: typeof readFile;
}): Promise<{
  reportJson?: Record<string, unknown>;
  diagnostics: string[];
}> {
  const diagnostics: string[] = [];
  let raw: string;
  try {
    raw = await input.readFileFn(input.artifactPath, "utf8");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code !== "ENOENT") {
      diagnostics.push(
        `META_REVIEW_REPORT_JSON_ARTIFACT_READ_DIAGNOSTIC: ${input.artifactPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return { diagnostics };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    diagnostics.push(
      `META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: ${input.artifactPath}: ${error instanceof Error ? error.message : String(error)}`
    );
    return { diagnostics };
  }
  if (!isRecord(parsed)) {
    diagnostics.push(
      `META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: ${input.artifactPath}: top-level JSON value must be an object.`
    );
    return { diagnostics };
  }
  const reportJson = resolveMetaReviewReportJsonObject(parsed);
  if (reportJson === undefined) {
    diagnostics.push(
      `META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: ${input.artifactPath}: report_json claim object missing.`
    );
    return { diagnostics };
  }
  return { reportJson, diagnostics };
}

function resolveFindingsCountFromMetaReviewReportJson(
  reportJson: Record<string, unknown>
): number | undefined {
  const explicitCount = reportJson.findings_count;
  if (
    typeof explicitCount === "number" &&
    Number.isInteger(explicitCount) &&
    explicitCount >= 0
  ) {
    return explicitCount;
  }
  const findingsRaw = reportJson.findings;
  if (
    typeof findingsRaw === "number" &&
    Number.isInteger(findingsRaw) &&
    findingsRaw >= 0
  ) {
    return findingsRaw;
  }
  if (Array.isArray(findingsRaw)) {
    return findingsRaw.length;
  }
  return undefined;
}

function resolveStructuredMetaReviewClaimFromReportJson(input: {
  reportJson: Record<string, unknown>;
}):
  | {
      claim: {
        state: "clean" | "open_findings" | "unknown";
        source: "meta_review_artifact";
      };
    }
  | { claim: undefined }
  | { reason: string } {
  const claimStateRaw = input.reportJson.findings_claim_state;
  const claimSourceRaw = input.reportJson.findings_claim_source;
  const hasClaimState = claimStateRaw !== undefined;
  const hasClaimSource = claimSourceRaw !== undefined;

  if (hasClaimState !== hasClaimSource) {
    if (!hasClaimState) {
      return {
        reason:
          `${claimStateRequiredReasonCode}: meta-review report_json.findings_claim_state is required when findings_claim_source is provided.`
      };
    }
    return {
      reason:
        `${claimSourceInvalidReasonCode}: meta-review report_json.findings_claim_source is required when findings_claim_state is provided.`
    };
  }
  if (!hasClaimState) {
    return { claim: undefined };
  }
  if (!isFindingsClaimState(claimStateRaw)) {
    return {
      reason:
        `${claimStateRequiredReasonCode}: meta-review report_json.findings_claim_state must be clean|open_findings|unknown.`
    };
  }
  if (!isFindingsClaimSource(claimSourceRaw)) {
    return {
      reason:
        `${claimSourceInvalidReasonCode}: meta-review report_json.findings_claim_source must be payload_flags|payload_findings_count|legacy_summary_parser|meta_review_artifact.`
    };
  }
  if (claimSourceRaw !== "meta_review_artifact") {
    return {
      reason:
        `${claimSourceInvalidReasonCode}: meta-review structured claim source must be meta_review_artifact (found ${claimSourceRaw}).`
    };
  }

  return {
    claim: {
      state: claimStateRaw,
      source: "meta_review_artifact"
    }
  };
}

async function validateStructuredMetaReviewPositiveClaim(input: {
  runResult: MetaReviewRunResult;
  reportJson?: Record<string, unknown>;
  bubbleDir: string;
  artifactsDir: string;
  readFileFn: typeof readFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | { ok: true; diagnostics: string[]; metadata: FindingsParityMetadata | null }
  | { ok: false; reason: string; metadata: FindingsParityMetadata | null }
> {
  const failWithMetadata = (
    reason: string,
    metadata: FindingsParityMetadata | null = null
  ): { ok: false; reason: string; metadata: FindingsParityMetadata | null } => ({
    ok: false,
    reason,
    metadata
  });
  const recommendation = input.runResult.recommendation;
  if (input.reportJson === undefined) {
    if (recommendation !== "rework") {
      return { ok: true, diagnostics: [], metadata: null };
    }
    return failWithMetadata(
      `${metaReviewFindingsArtifactRequiredReasonCode}: structured report_json is required for positive meta-review claim parity.`
    );
  }

  const claimResolution = resolveStructuredMetaReviewClaimFromReportJson({
    reportJson: input.reportJson
  });
  if ("reason" in claimResolution) {
    return failWithMetadata(claimResolution.reason);
  }
  const claim = claimResolution.claim;
  if (recommendation !== "rework") {
    if (claim?.state === "open_findings") {
      return failWithMetadata(
        `${claimSourceInvalidReasonCode}: recommendation=${recommendation} cannot carry findings_claim_state=open_findings.`
      );
    }
    return { ok: true, diagnostics: [], metadata: null };
  }

  if (claim === undefined) {
    return failWithMetadata(
      `${claimStateRequiredReasonCode}: recommendation=rework requires report_json findings_claim_state/findings_claim_source.`
    );
  }
  if (claim.state === "unknown") {
    return failWithMetadata(
      `${claimStateRequiredReasonCode}: positive meta-review claim cannot remain unknown.`
    );
  }
  if (claim.state !== "open_findings") {
    return failWithMetadata(
      `${claimSourceInvalidReasonCode}: recommendation=rework requires findings_claim_state=open_findings (found ${claim.state}).`
    );
  }

  const findingsCount = resolveFindingsCountFromMetaReviewReportJson(
    input.reportJson
  );
  if (findingsCount === undefined || findingsCount <= 0) {
    return failWithMetadata(
      `${metaReviewFindingsCountMismatchReasonCode}: recommendation=rework requires findings_count>0 in report_json.`,
      {
        findings_claimed_open_total: findingsCount ?? null,
        findings_artifact_open_total: null,
        findings_artifact_status: resolveFindingsArtifactStatus(input.reportJson) ?? null,
        findings_digest_sha256: resolveFindingsDigestSha256(input.reportJson) ?? null,
        meta_review_run_id: resolveMetaReviewRunId(input.reportJson) ?? null,
        findings_parity_status: "mismatch"
      }
    );
  }

  const artifactRef = input.reportJson.findings_artifact_ref;
  if (
    typeof artifactRef !== "string" ||
    artifactRef.trim().length === 0
  ) {
    return failWithMetadata(
      `${metaReviewFindingsArtifactRequiredReasonCode}: recommendation=rework requires non-empty findings_artifact_ref in report_json.`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: resolveFindingsArtifactStatus(input.reportJson) ?? null,
        findings_digest_sha256: resolveFindingsDigestSha256(input.reportJson) ?? null,
        meta_review_run_id: resolveMetaReviewRunId(input.reportJson) ?? null,
        findings_parity_status: "guard_failed"
      }
    );
  }
  const metaReviewRunId = resolveMetaReviewRunId(input.reportJson);
  if (
    metaReviewRunId === undefined
  ) {
    return failWithMetadata(
      `${metaReviewFindingsRunLinkMissingReasonCode}: recommendation=rework requires non-empty meta_review_run_id in report_json.`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: resolveFindingsArtifactStatus(input.reportJson) ?? null,
        findings_digest_sha256: resolveFindingsDigestSha256(input.reportJson) ?? null,
        meta_review_run_id: null,
        findings_parity_status: "guard_failed"
      }
    );
  }

  if (
    input.runResult.run_id !== undefined &&
    metaReviewRunId !== input.runResult.run_id
  ) {
    return failWithMetadata(
      `${metaReviewFindingsRunLinkMissingReasonCode}: meta_review_run_id (${metaReviewRunId}) must match run_id (${input.runResult.run_id}).`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: resolveFindingsArtifactStatus(input.reportJson) ?? null,
        findings_digest_sha256: resolveFindingsDigestSha256(input.reportJson) ?? null,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "guard_failed"
      }
    );
  }

  const digest = resolveFindingsDigestSha256(input.reportJson);
  if (digest === undefined) {
    return failWithMetadata(
      `${metaReviewFindingsParityGuardReasonCode}: recommendation=rework requires findings_digest_sha256 parity metadata.`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: resolveFindingsArtifactStatus(input.reportJson) ?? null,
        findings_digest_sha256: null,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "guard_failed"
      }
    );
  }

  const artifactStatus = resolveFindingsArtifactStatus(input.reportJson);
  if (artifactStatus === undefined) {
    return failWithMetadata(
      `${metaReviewFindingsParityGuardReasonCode}: recommendation=rework requires findings_artifact_status parity metadata.`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: null,
        findings_digest_sha256: digest,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "guard_failed"
      }
    );
  }

  const artifactPath = resolveFindingsArtifactPath({
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir,
    artifactRef: artifactRef.trim()
  });
  if (artifactPath === undefined) {
    return failWithMetadata(
      `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_ref (${artifactRef.trim()}) must resolve under artifacts/.`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: artifactStatus,
        findings_digest_sha256: digest,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "guard_failed"
      }
    );
  }

  const artifactRead = await readFindingsArtifactWithRetry({
    artifactPath,
    readFileFn: input.readFileFn,
    ...(input.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: input.sleepForRetryMs }
      : {})
  });
  if (!artifactRead.ok) {
    const retryStatus = artifactRead.retried
      ? "transient_retry_exhausted"
      : "non_retryable_or_first_attempt";
    return failWithMetadata(
      `${metaReviewFindingsParityGuardReasonCode}: findings artifact read failed [${retryStatus}] after ${artifactRead.attempts} attempt(s) (${formatReadErrorDetail(artifactRead.error)}).`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: artifactStatus,
        findings_digest_sha256: digest,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "guard_failed"
      }
    );
  }
  const artifactRaw = artifactRead.raw;

  let artifactParsed: unknown;
  try {
    artifactParsed = JSON.parse(artifactRaw);
  } catch (error) {
    return failWithMetadata(
      `${metaReviewFindingsParityGuardReasonCode}: findings artifact parse failed (${error instanceof Error ? error.message : String(error)}).`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: artifactStatus,
        findings_digest_sha256: digest,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "guard_failed"
      }
    );
  }
  if (!isRecord(artifactParsed)) {
    return failWithMetadata(
      `${metaReviewFindingsParityGuardReasonCode}: findings artifact must be a JSON object.`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: artifactStatus,
        findings_digest_sha256: digest,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "guard_failed"
      }
    );
  }
  const artifactOpenTotal = resolveFindingsArtifactOpenTotalFromArtifact(
    artifactParsed
  );
  if (artifactOpenTotal === undefined) {
    return failWithMetadata(
      `${metaReviewFindingsParityGuardReasonCode}: findings artifact open_total is unavailable.`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: null,
        findings_artifact_status: artifactStatus,
        findings_digest_sha256: digest,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "guard_failed"
      }
    );
  }
  const computedDigest = createHash("sha256")
    .update(artifactRaw, "utf8")
    .digest("hex");
  if (computedDigest !== digest) {
    return failWithMetadata(
      `${metaReviewFindingsParityGuardReasonCode}: findings artifact digest mismatch.`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: artifactOpenTotal,
        findings_artifact_status: artifactStatus,
        findings_digest_sha256: digest,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "guard_failed"
      }
    );
  }
  if (findingsCount !== artifactOpenTotal) {
    return failWithMetadata(
      `${metaReviewFindingsCountMismatchReasonCode}: findings_count (${findingsCount}) must match findings artifact open_total (${artifactOpenTotal}).`,
      {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: artifactOpenTotal,
        findings_artifact_status: artifactStatus,
        findings_digest_sha256: digest,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "mismatch"
      }
    );
  }

  const parserState = resolveLegacySummaryFindingsClaimState(
    input.runResult.summary ?? undefined
  );
  if (parserState !== "open_findings") {
    return {
      ok: true,
      diagnostics: [
        `CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC: parser_state=${parserState} structured_state=open_findings structured_source=meta_review_artifact`
      ],
      metadata: {
        findings_claimed_open_total: findingsCount,
        findings_artifact_open_total: artifactOpenTotal,
        findings_artifact_status: artifactStatus,
        findings_digest_sha256: digest,
        meta_review_run_id: metaReviewRunId,
        findings_parity_status: "ok"
      }
    };
  }

  return {
    ok: true,
    diagnostics: [],
    metadata: {
      findings_claimed_open_total: findingsCount,
      findings_artifact_open_total: artifactOpenTotal,
      findings_artifact_status: artifactStatus,
      findings_digest_sha256: digest,
      meta_review_run_id: metaReviewRunId,
      findings_parity_status: "ok"
    }
  };
}

function synthesizeMetaReviewRunResultFromSnapshot(input: {
  bubbleId: string;
  nowIso: string;
  snapshot: BubbleMetaReviewSnapshotState;
  fallbackSummary: string;
}): MetaReviewRunResult {
  const recommendation = input.snapshot.last_autonomous_recommendation ?? "inconclusive";
  const status: MetaReviewRunStatus =
    input.snapshot.last_autonomous_status ?? "error";
  const summary = input.snapshot.last_autonomous_summary ?? input.fallbackSummary;
  const reportRef =
    input.snapshot.last_autonomous_report_ref ?? metaReviewFallbackReportRef;
  const runId =
    input.snapshot.last_autonomous_run_id === null
      ? undefined
      : input.snapshot.last_autonomous_run_id;
  const updatedAt = input.snapshot.last_autonomous_updated_at ?? input.nowIso;
  const reworkTargetMessage = recommendation === "rework"
    ? (input.snapshot.last_autonomous_rework_target_message ?? null)
    : null;

  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status,
    recommendation,
    summary,
    report_ref: reportRef,
    rework_target_message: reworkTargetMessage,
    updated_at: updatedAt,
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: [],
    ...(runId !== undefined ? { run_id: runId } : {})
  };
}

function synthesizeMetaReviewRunFailure(input: {
  bubbleId: string;
  nowIso: string;
  fallbackSummary: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "error",
    recommendation: "inconclusive",
    summary: input.fallbackSummary,
    report_ref: metaReviewFallbackReportRef,
    rework_target_message: null,
    updated_at: input.nowIso,
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: []
  };
}

function normalizeRecoveredMetaReviewRunResult(input: {
  bubbleId: string;
  nowIso: string;
  fallbackSummary: string;
  runResult: MetaReviewRunResult;
  bubbleDir: string;
  artifactsDir: string;
}): MetaReviewRunResult {
  const normalizedSummary =
    typeof input.runResult.summary === "string"
      && input.runResult.summary.trim().length > 0
      ? input.runResult.summary
      : input.fallbackSummary;
  const normalizedUpdatedAt =
    typeof input.runResult.updated_at === "string" &&
      input.runResult.updated_at.trim().length > 0
      ? input.runResult.updated_at
      : input.nowIso;
  const normalizedReportRef =
    typeof input.runResult.report_ref === "string"
      ? resolveRecoveredReportRef({
          reportRef: input.runResult.report_ref,
          bubbleDir: input.bubbleDir,
          artifactsDir: input.artifactsDir
        })
      : metaReviewFallbackReportRef;

  return {
    ...input.runResult,
    bubbleId: input.bubbleId,
    summary: normalizedSummary,
    report_ref: normalizedReportRef,
    updated_at: normalizedUpdatedAt,
    rework_target_message:
      input.runResult.recommendation === "rework"
        ? (input.runResult.rework_target_message ?? null)
        : null,
    warnings: [...input.runResult.warnings]
  };
}

function buildRecoveredMetaReviewReportMarkdown(input: {
  bubbleId: string;
  runResult: MetaReviewRunResult;
  nowIso: string;
}): string {
  const summary =
    input.runResult.summary ??
    `Meta-review recovery route recorded recommendation=${input.runResult.recommendation}.`;
  const runIdLine =
    typeof input.runResult.run_id === "string" && input.runResult.run_id.trim().length > 0
      ? [`- Run: ${input.runResult.run_id}`]
      : [];

  return [
    "# Meta Review Report",
    "",
    `- Bubble: ${input.bubbleId}`,
    ...runIdLine,
    `- Generated: ${input.nowIso}`,
    `- Recommendation: ${input.runResult.recommendation}`,
    `- Status: ${input.runResult.status}`,
    "",
    "## Summary",
    "",
    summary
  ].join("\n");
}

async function writeRecoveredMetaReviewArtifacts(input: {
  bubbleId: string;
  round: number;
  nowIso: string;
  runResult: MetaReviewRunResult;
  paths: {
    metaReviewLastJsonArtifactPath: string;
    metaReviewLastMarkdownArtifactPath: string;
  };
  writeFileFn: typeof writeFile;
}): Promise<{ warnings: MetaReviewRunWarning[] }> {
  const warnings: MetaReviewRunWarning[] = [];

  const markdown = buildRecoveredMetaReviewReportMarkdown({
    bubbleId: input.bubbleId,
    runResult: input.runResult,
    nowIso: input.nowIso
  });
  try {
    await input.writeFileFn(
      input.paths.metaReviewLastMarkdownArtifactPath,
      `${markdown.trimEnd()}\n`,
      "utf8"
    );
  } catch (error) {
    warnings.push({
      reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
      message: `${metaReviewFallbackReportRef}: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  const reportPayload = {
    bubble_id: input.bubbleId,
    round: input.round,
    generated_at: input.nowIso,
    status: input.runResult.status,
    recommendation: input.runResult.recommendation,
    summary: input.runResult.summary,
    report_ref: input.runResult.report_ref,
    report_json_ref: metaReviewFallbackReportJsonRef,
    rework_target_message: input.runResult.rework_target_message,
    warnings: [
      ...input.runResult.warnings,
      ...warnings
    ],
    ...(input.runResult.run_id !== undefined
      ? { run_id: input.runResult.run_id }
      : {}),
    ...(input.runResult.report_json !== undefined
      ? { report_json: input.runResult.report_json }
      : {})
  };
  try {
    await input.writeFileFn(
      input.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(reportPayload, null, 2)}\n`,
      "utf8"
    );
  } catch (error) {
    warnings.push({
      reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
      message: `${metaReviewFallbackReportJsonRef}: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  return { warnings };
}

async function persistHumanGateRoute(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  summary: string;
  refs: string[];
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  route: MetaReviewGateRoute;
  metaReviewRun?: MetaReviewRunResult;
  parityMetadata?: FindingsParityMetadata | null;
  fallbackRecommendation?: MetaReviewRecommendation;
  targetState?:
    | "READY_FOR_HUMAN_APPROVAL"
    | "READY_FOR_APPROVAL"
    | "META_REVIEW_FAILED";
  stickyHumanGate?: boolean;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}): Promise<MetaReviewGateResult> {
  if (
    input.metaReviewRun !== undefined
    && input.fallbackRecommendation !== undefined
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_TRANSITION_INVALID: persistHumanGateRoute requires either metaReviewRun or fallbackRecommendation, but not both."
    );
  }
  const targetState = input.targetState ?? "READY_FOR_HUMAN_APPROVAL";
  const stickyHumanGate = input.stickyHumanGate
    ?? resolveDefaultStickyHumanGateForRoute(input.route);
  const nextState = transitionToGateState({
    current: input.loaded.state,
    nowIso: input.nowIso,
    targetState,
    stickyHumanGate,
    ...(input.metaReviewRun !== undefined
      ? { metaReviewRun: input.metaReviewRun }
      : {}),
    ...(input.fallbackRecommendation !== undefined
      ? {
          fallbackRecommendation: input.fallbackRecommendation,
          fallbackSummary: input.summary
        }
      : {})
  });

  let written: LoadedStateSnapshot;
  try {
    written = await input.writeState(input.statePath, nextState, {
      expectedFingerprint: input.loaded.fingerprint,
      expectedState: input.expectedState
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw error;
  }

  let gateAppended: AppendProtocolEnvelopeResult;
  try {
    gateAppended = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: input.appendEnvelope,
      transcriptPath: input.transcriptPath,
      inboxPath: input.inboxPath,
      lockPath: input.lockPath,
      now: input.now,
      bubbleId: input.bubbleId,
      round: input.loaded.state.round,
      summary: input.summary,
      route: input.route,
      refs: input.refs,
      ...(input.metaReviewRun !== undefined
        ? { recommendation: input.metaReviewRun.recommendation }
        : input.fallbackRecommendation !== undefined
          ? { recommendation: input.fallbackRecommendation }
          : {}),
      parityMetadata: input.parityMetadata
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const rollbackState = input.rollbackStateOnAppendFailure ?? input.loaded.state;
    let rollbackContext = "rollback_outcome=not_attempted";
    let rollbackDiagnosticReasonCode = metaReviewGateRollbackNotAttemptedReasonCode;
    let rollbackOutcome: "not_attempted" | "applied" | "failed" = "not_attempted";
    let rollbackReasonCode: MetaReviewGateReasonCode = "META_REVIEW_GATE_TRANSITION_INVALID";
    try {
      await input.writeState(input.statePath, rollbackState, {
        expectedFingerprint: written.fingerprint,
        expectedState: targetState
      });
      rollbackContext = "rollback_outcome=applied";
      rollbackDiagnosticReasonCode = metaReviewGateRollbackAppliedReasonCode;
      rollbackOutcome = "applied";
    } catch (rollbackError) {
      if (rollbackError instanceof StateStoreConflictError) {
        rollbackReasonCode = "META_REVIEW_GATE_STATE_CONFLICT";
        rollbackDiagnosticReasonCode = metaReviewGateRollbackStateConflictReasonCode;
      } else {
        rollbackDiagnosticReasonCode = metaReviewGateRollbackTransitionInvalidReasonCode;
      }
      const rollbackReason = rollbackError instanceof Error
        ? rollbackError.message
        : String(rollbackError);
      rollbackContext = `rollback_outcome=failed rollback_error=${rollbackReason}`;
      rollbackOutcome = "failed";
    }
    throw new MetaReviewGateError(
      rollbackReasonCode,
      `${rollbackReasonCode}: state transitioned to ${targetState} but approval request append failed (rollback_reason_code=${rollbackDiagnosticReasonCode}; rollback_target_state=${rollbackState.state}; ${rollbackContext}). Root error: ${reason}`,
      {
        rollbackReasonCode: rollbackDiagnosticReasonCode,
        rollbackOutcome,
        rollbackTargetState: rollbackState.state
      }
    );
  }

  return {
    bubbleId: input.bubbleId,
    route: input.route,
    gateSequence: gateAppended.sequence,
    gateEnvelope: gateAppended.envelope,
    state: written.state,
    ...(input.metaReviewRun !== undefined ? { metaReviewRun: input.metaReviewRun } : {})
  };
}

function resolveDefaultStickyHumanGateForRoute(route: MetaReviewGateRoute): boolean {
  if (route === "human_gate_run_failed" || route === "human_gate_dispatch_failed") {
    return false;
  }
  if (route === "human_gate_approve" || route === "human_gate_inconclusive") {
    return true;
  }
  if (route === "human_gate_budget_exhausted" || route === "human_gate_sticky_bypass") {
    return true;
  }
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: sticky_human_gate default policy is undefined for route=${route}.`
  );
}

function resolveAutoReworkRetryInvariantViolation(input: {
  latest: BubbleStateSnapshot;
  expected: BubbleStateSnapshot;
}): string | null {
  if (input.latest.round !== input.expected.round) {
    return metaReviewGateAutoReworkRetryRoundInvariantReasonCode;
  }
  if (
    input.latest.active_role !== input.expected.active_role
    || input.latest.active_agent !== input.expected.active_agent
  ) {
    return metaReviewGateAutoReworkRetryOwnershipInvariantReasonCode;
  }
  const expectedRoundRole = input.expected.round_role_history.find(
    (entry) => entry.round === input.expected.round
  );
  const latestRoundRole = input.latest.round_role_history.find(
    (entry) => entry.round === input.latest.round
  );
  if (
    expectedRoundRole === undefined ||
    latestRoundRole === undefined ||
    latestRoundRole.implementer !== expectedRoundRole.implementer ||
    latestRoundRole.reviewer !== expectedRoundRole.reviewer
  ) {
    return metaReviewGateAutoReworkRetryRoundRoleHistoryInvariantReasonCode;
  }
  return null;
}

function resolveCanonicalMetaReviewRunId(
  snapshot: BubbleMetaReviewSnapshotState
): string | null {
  if (
    typeof snapshot.last_autonomous_run_id === "string"
    && snapshot.last_autonomous_run_id.trim().length > 0
  ) {
    return snapshot.last_autonomous_run_id.trim();
  }
  return null;
}

export async function recoverMetaReviewGateFromSnapshot(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): Promise<MetaReviewGateResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const setMetaReviewerPane =
    dependencies.setMetaReviewerPaneBinding ?? setMetaReviewerPaneBinding;
  const readFileFn = dependencies.readFile ?? readFile;
  const writeFileFn = dependencies.writeFile ?? writeFile;
  const sleepForRetryMs = dependencies.sleepForRetryMs;
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const refs = input.refs ?? [];

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const lockPath = buildGateLockPath({
    locksDir: resolved.bubblePaths.locksDir,
    bubbleId: resolved.bubbleId
  });
  const deactivateMetaReviewerPane = async (): Promise<string | null> => {
    try {
      await setMetaReviewerPane({
        sessionsPath: resolved.bubblePaths.sessionsPath,
        bubbleId: resolved.bubbleId,
        active: false,
        now
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };
  const finishWithPaneDeactivation = async (
    result: MetaReviewGateResult
  ): Promise<MetaReviewGateResult> => {
    let finalizedResult = result;
    if (result.metaReviewRun !== undefined) {
      const artifactWrite = await writeRecoveredMetaReviewArtifacts({
        bubbleId: resolved.bubbleId,
        round: result.state.round,
        nowIso,
        runResult: result.metaReviewRun,
        paths: {
          metaReviewLastJsonArtifactPath:
            resolved.bubblePaths.metaReviewLastJsonArtifactPath,
          metaReviewLastMarkdownArtifactPath:
            resolved.bubblePaths.metaReviewLastMarkdownArtifactPath
        },
        writeFileFn
      });
      if (artifactWrite.warnings.length > 0) {
        finalizedResult = {
          ...result,
          metaReviewRun: {
            ...result.metaReviewRun,
            warnings: [
              ...result.metaReviewRun.warnings,
              ...artifactWrite.warnings
            ]
          }
        };
      }
    }
    await deactivateMetaReviewerPane();
    return finalizedResult;
  };

  const loaded = await readState(resolved.bubblePaths.statePath);
  if (loaded.state.state !== "META_REVIEW_RUNNING") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `meta-review gate recovery requires META_REVIEW_RUNNING state (current: ${loaded.state.state}).`
    );
  }

  try {
    const snapshot = normalizeMetaReviewSnapshot(loaded.state.meta_review);
  const fallbackSummary =
    input.summary ??
    "Meta-review completed previously; recovering gate route from snapshot.";
  const snapshotHasCanonicalSubmitInActiveWindow =
    hasCanonicalSubmitForActiveMetaReviewRound({
      state: loaded.state,
      snapshot
    });
  const reportJsonArtifactRead = await readMetaReviewReportJsonArtifact({
    artifactPath: resolved.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn
  });
  const runResultBase = normalizeRecoveredMetaReviewRunResult({
    bubbleId: resolved.bubbleId,
    nowIso,
    fallbackSummary,
    bubbleDir: resolved.bubblePaths.bubbleDir,
    artifactsDir: resolved.bubblePaths.artifactsDir,
    runResult: input.runResult ?? (
      snapshotHasCanonicalSubmitInActiveWindow
        ? synthesizeMetaReviewRunResultFromSnapshot({
            bubbleId: resolved.bubbleId,
            nowIso,
            snapshot,
            fallbackSummary
          })
        : synthesizeMetaReviewRunFailure({
            bubbleId: resolved.bubbleId,
            nowIso,
            fallbackSummary
          })
    )
  });
  const runResultResolvedFromSnapshot: MetaReviewRunResult =
    runResultBase.report_json !== undefined
      ? runResultBase
      : {
          ...runResultBase,
          ...(reportJsonArtifactRead.reportJson !== undefined
            ? { report_json: reportJsonArtifactRead.reportJson }
            : {})
        };
  const runResult: MetaReviewRunResult =
    reportJsonArtifactRead.diagnostics.length === 0
      ? runResultResolvedFromSnapshot
      : {
          ...runResultResolvedFromSnapshot,
          report_json: {
            ...(runResultResolvedFromSnapshot.report_json ?? {}),
            claim_diagnostics: [
              ...(
                Array.isArray(runResultResolvedFromSnapshot.report_json?.claim_diagnostics)
                  ? runResultResolvedFromSnapshot.report_json.claim_diagnostics
                      .filter((entry): entry is string => typeof entry === "string")
                  : []
              ),
              ...reportJsonArtifactRead.diagnostics
            ]
          }
        };
  const summary = runResult.summary
    ?? input.summary
    ?? "Meta-review completed previously; recovering gate route from snapshot.";

  const snapshotHasRunIdentity = snapshotHasCanonicalSubmitInActiveWindow;
  const snapshotUpdatedAtMs = Date.parse(snapshot.last_autonomous_updated_at ?? "");
  const runResultUpdatedAtMs = Date.parse(runResult.updated_at);
  const hasComparableTimestamps =
    Number.isFinite(snapshotUpdatedAtMs) && Number.isFinite(runResultUpdatedAtMs);
  const updatedAtChanged = input.runResult === undefined
    ? false
    : (hasComparableTimestamps
        ? snapshotUpdatedAtMs !== runResultUpdatedAtMs
        : snapshot.last_autonomous_updated_at !== runResult.updated_at);
  if (
    input.runResult !== undefined
    && snapshotHasRunIdentity
    && updatedAtChanged
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_STATE_CONFLICT",
      "META_REVIEW_GATE_STATE_CONFLICT: canonical snapshot changed between await and recovery route."
    );
  }

  if (runResult.status === "error") {
    return finishWithPaneDeactivation(
      await persistHumanGateRoute({
        appendEnvelope,
        writeState,
        statePath: resolved.bubblePaths.statePath,
        transcriptPath: resolved.bubblePaths.transcriptPath,
        inboxPath: resolved.bubblePaths.inboxPath,
        lockPath,
        now,
        nowIso,
        bubbleId: resolved.bubbleId,
        summary: buildHumanGateSummary({
          convergenceSummary: summary,
          metaReviewRun: runResult
        }),
        refs,
        loaded,
        expectedState: "META_REVIEW_RUNNING",
        route: "human_gate_run_failed",
        metaReviewRun: runResult,
        parityMetadata: resolveFindingsParityMetadataFromReportJson(
          runResult.report_json
        ),
        targetState: "META_REVIEW_FAILED",
        stickyHumanGate: false
      })
    );
  }

  const recommendation = runResult.recommendation;
  const budgetAvailable =
    snapshot.auto_rework_count < snapshot.auto_rework_limit;
  const positiveClaimParity = await validateStructuredMetaReviewPositiveClaim({
    runResult,
    ...(runResult.report_json !== undefined
      ? { reportJson: runResult.report_json }
      : {}),
    bubbleDir: resolved.bubblePaths.bubbleDir,
    artifactsDir: resolved.bubblePaths.artifactsDir,
    readFileFn,
    ...(sleepForRetryMs !== undefined ? { sleepForRetryMs } : {})
  });
  if (!positiveClaimParity.ok) {
    const parityDecoratedRunResult: MetaReviewRunResult =
      positiveClaimParity.metadata === null
        ? runResult
        : {
            ...runResult,
            report_json: {
              ...(runResult.report_json ?? {}),
              findings_claimed_open_total:
                positiveClaimParity.metadata.findings_claimed_open_total,
              findings_artifact_open_total:
                positiveClaimParity.metadata.findings_artifact_open_total,
              findings_artifact_status:
                positiveClaimParity.metadata.findings_artifact_status,
              findings_digest_sha256:
                positiveClaimParity.metadata.findings_digest_sha256,
              meta_review_run_id: positiveClaimParity.metadata.meta_review_run_id,
              findings_parity_status:
                positiveClaimParity.metadata.findings_parity_status
            }
          };
    return finishWithPaneDeactivation(
      await persistHumanGateRoute({
        appendEnvelope,
        writeState,
        statePath: resolved.bubblePaths.statePath,
        transcriptPath: resolved.bubblePaths.transcriptPath,
        inboxPath: resolved.bubblePaths.inboxPath,
        lockPath,
        now,
        nowIso,
        bubbleId: resolved.bubbleId,
        summary: buildHumanGateSummary({
          convergenceSummary: summary,
          fallbackReason:
            `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${positiveClaimParity.reason}`
        }),
        refs,
        loaded,
        expectedState: "META_REVIEW_RUNNING",
        route: "human_gate_dispatch_failed",
        metaReviewRun: parityDecoratedRunResult,
        parityMetadata: positiveClaimParity.metadata
      })
    );
  }
  const runResultForRouting: MetaReviewRunResult =
    positiveClaimParity.diagnostics.length === 0 &&
      positiveClaimParity.metadata === null
      ? runResult
      : {
          ...runResult,
          report_json: (() => {
            const base = { ...(runResult.report_json ?? {}) };
            if (positiveClaimParity.metadata !== null) {
              base.findings_claimed_open_total =
                positiveClaimParity.metadata.findings_claimed_open_total;
              base.findings_artifact_open_total =
                positiveClaimParity.metadata.findings_artifact_open_total;
              base.findings_artifact_status =
                positiveClaimParity.metadata.findings_artifact_status;
              base.findings_digest_sha256 =
                positiveClaimParity.metadata.findings_digest_sha256;
              base.meta_review_run_id =
                positiveClaimParity.metadata.meta_review_run_id;
              base.findings_parity_status =
                positiveClaimParity.metadata.findings_parity_status;
            }
            const existingDiagnostics = Array.isArray(base.claim_diagnostics)
              ? base.claim_diagnostics.filter(
                  (entry): entry is string => typeof entry === "string"
                )
              : [];
            const mergedDiagnostics = [
              ...existingDiagnostics,
              ...positiveClaimParity.diagnostics
            ];
            if (mergedDiagnostics.length > 0) {
              base.claim_diagnostics = mergedDiagnostics;
            }
            return base;
          })()
        };

  if (recommendation === "rework" && budgetAvailable) {
    if (snapshot.sticky_human_gate) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_STATE_CONFLICT",
        "META_REVIEW_GATE_STATE_CONFLICT: sticky_human_gate became true before auto rework dispatch."
      );
    }

    const reworkMessage = runResult.rework_target_message;
    if (reworkMessage === null || reworkMessage.trim().length === 0) {
      return finishWithPaneDeactivation(
        await persistHumanGateRoute({
          appendEnvelope,
          writeState,
          statePath: resolved.bubblePaths.statePath,
          transcriptPath: resolved.bubblePaths.transcriptPath,
          inboxPath: resolved.bubblePaths.inboxPath,
          lockPath,
          now,
          nowIso,
          bubbleId: resolved.bubbleId,
          summary: buildHumanGateSummary({
            convergenceSummary: summary,
            fallbackReason:
              "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: missing rework target message for autonomous dispatch"
          }),
          refs,
          loaded,
          expectedState: "META_REVIEW_RUNNING",
          route: "human_gate_dispatch_failed",
          metaReviewRun: runResultForRouting,
          parityMetadata:
            positiveClaimParity.metadata ??
            resolveFindingsParityMetadataFromReportJson(runResultForRouting.report_json),
          rollbackStateOnAppendFailure: loaded.state
        })
      );
    }

    let resumedWritten: LoadedStateSnapshot;
    try {
      const nextRound = loaded.state.round + 1;
      const resumed = applyStateTransition(loaded.state, {
        to: "RUNNING",
        round: nextRound,
        activeAgent: resolved.bubbleConfig.agents.implementer,
        activeRole: "implementer",
        activeSince: nowIso,
        lastCommandAt: nowIso,
        appendRoundRoleEntry: {
          round: nextRound,
          implementer: resolved.bubbleConfig.agents.implementer,
          reviewer: resolved.bubbleConfig.agents.reviewer,
          switched_at: nowIso
        }
      });
      resumedWritten = await writeState(resolved.bubblePaths.statePath, resumed, {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "META_REVIEW_RUNNING"
      });
    } catch (error) {
      if (error instanceof StateStoreConflictError) {
        throw toConflictError(error);
      }
      throw toTransitionError(error);
    }

    let dispatched: AppendProtocolEnvelopeResult;
    try {
      dispatched = await appendEnvelope({
        transcriptPath: resolved.bubblePaths.transcriptPath,
        mirrorPaths: [resolved.bubblePaths.inboxPath],
        lockPath,
        now,
        envelope: {
          bubble_id: resolved.bubbleId,
          sender: "orchestrator",
          recipient: resolved.bubbleConfig.agents.implementer,
          type: "APPROVAL_DECISION",
          round: loaded.state.round,
          payload: {
            decision: "revise",
            message: reworkMessage,
            metadata: {
              [deliveryTargetRoleMetadataKey]: "implementer",
              actor: "meta-reviewer",
              actor_agent: "codex",
              recommendation: runResultForRouting.recommendation,
              ...(runResultForRouting.run_id !== undefined
                ? { run_id: runResultForRouting.run_id }
                : {}),
              ...resolveFindingsParityMetadataForEnvelope(
                positiveClaimParity.metadata
              )
            }
          },
          refs
        }
      });
    } catch (error) {
      const appendReason = error instanceof Error ? error.message : String(error);

      let readyForApproval: LoadedStateSnapshot;
      let restoreOutcome = "restore_outcome=not_attempted";
      try {
        const backToReady = applyStateTransition(resumedWritten.state, {
          to: "READY_FOR_APPROVAL",
          activeAgent: null,
          activeRole: null,
          activeSince: null,
          lastCommandAt: nowIso
        });
        const restoredCounterReady: BubbleStateSnapshot = {
          ...backToReady,
          round: loaded.state.round,
          round_role_history: loaded.state.round_role_history,
          meta_review: buildHydratedMetaReviewSnapshotFromRunResult({
            metaReview: normalizeMetaReviewSnapshot(backToReady.meta_review),
            runResult: runResultForRouting
          })
        };
        readyForApproval = await writeState(
          resolved.bubblePaths.statePath,
          restoredCounterReady,
          {
            expectedFingerprint: resumedWritten.fingerprint,
            expectedState: "RUNNING"
          }
        );
        restoreOutcome = "restore_outcome=applied";
      } catch (recoveryError) {
        const restoreReason =
          recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
        restoreOutcome = `restore_outcome=failed restore_error=${restoreReason}`;
        if (recoveryError instanceof StateStoreConflictError) {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_STATE_CONFLICT",
            `META_REVIEW_GATE_STATE_CONFLICT: auto-rework dispatch append failed (append_error=${appendReason}) and restore to READY_FOR_APPROVAL failed (${restoreOutcome}).`
          );
        }
        throw new MetaReviewGateError(
          "META_REVIEW_GATE_TRANSITION_INVALID",
          `META_REVIEW_GATE_TRANSITION_INVALID: auto-rework dispatch append failed (append_error=${appendReason}) and restore to READY_FOR_APPROVAL failed (${restoreOutcome}).`
        );
      }

      return finishWithPaneDeactivation(
        await persistHumanGateRoute({
          appendEnvelope,
          writeState,
          statePath: resolved.bubblePaths.statePath,
          transcriptPath: resolved.bubblePaths.transcriptPath,
          inboxPath: resolved.bubblePaths.inboxPath,
          lockPath,
          now,
          nowIso,
          bubbleId: resolved.bubbleId,
          summary: buildHumanGateSummary({
            convergenceSummary: summary,
            fallbackReason:
              `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: append_error=${appendReason}; ${restoreOutcome}`
          }),
          refs,
          loaded: readyForApproval,
          expectedState: "READY_FOR_APPROVAL",
          route: "human_gate_dispatch_failed",
          metaReviewRun: runResultForRouting,
          parityMetadata:
            positiveClaimParity.metadata ??
            resolveFindingsParityMetadataFromReportJson(runResultForRouting.report_json),
          rollbackStateOnAppendFailure: readyForApproval.state
        })
      );
    }

    let written: LoadedStateSnapshot | undefined;
    try {
      const resumedWithHydratedRun: BubbleStateSnapshot = {
        ...resumedWritten.state,
        meta_review: buildHydratedMetaReviewSnapshotFromRunResult({
          metaReview: normalizeMetaReviewSnapshot(resumedWritten.state.meta_review),
          runResult: runResultForRouting
        })
      };
      const resumedWithCounter = incrementAutoReworkCount(resumedWithHydratedRun);
      written = await writeState(
        resolved.bubblePaths.statePath,
        resumedWithCounter,
        {
          expectedFingerprint: resumedWritten.fingerprint,
          expectedState: "RUNNING"
        }
      );
    } catch (error) {
      if (error instanceof StateStoreConflictError) {
        const expectedCount = snapshot.auto_rework_count;
        const targetCount = expectedCount + 1;
        let latestConflict: StateStoreConflictError = error;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const latest = await readState(resolved.bubblePaths.statePath);
          if (latest.state.state !== "RUNNING") {
            throw toConflictError(latestConflict);
          }
          const retryInvariantViolation = resolveAutoReworkRetryInvariantViolation({
            latest: latest.state,
            expected: resumedWritten.state
          });
          if (retryInvariantViolation !== null) {
            throw new MetaReviewGateError(
              "META_REVIEW_GATE_STATE_CONFLICT",
              `META_REVIEW_GATE_STATE_CONFLICT: auto-rework CAS retry invariant failed (retry_invariant_reason_code=${retryInvariantViolation}; attempt=${attempt + 1}).`,
              {
                retryInvariantReasonCode: retryInvariantViolation
              }
            );
          }

          const latestMetaReview = normalizeMetaReviewSnapshot(latest.state.meta_review);
          if (latestMetaReview.auto_rework_count >= targetCount) {
            written = latest;
            break;
          }

          const retryRunId =
            typeof runResultForRouting.run_id === "string" &&
            runResultForRouting.run_id.trim().length > 0
              ? runResultForRouting.run_id
              : null;
          const latestCanonicalRunId = resolveCanonicalMetaReviewRunId(latestMetaReview);
          if (
            latestCanonicalRunId !== null
            && retryRunId !== null
            && latestCanonicalRunId !== retryRunId
          ) {
            throw new MetaReviewGateError(
              "META_REVIEW_GATE_STATE_CONFLICT",
              `META_REVIEW_GATE_STATE_CONFLICT: auto-rework CAS retry invariant failed (retry_invariant_reason_code=${metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode}; attempt=${attempt + 1}).`,
              {
                retryInvariantReasonCode:
                  metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode
              }
            );
          }

          const latestHydratedMetaReview = buildHydratedMetaReviewSnapshotFromRunResult({
            metaReview: latestMetaReview,
            runResult: runResultForRouting
          });
          const latestIncremented: BubbleStateSnapshot = {
            ...latest.state,
            meta_review: {
              ...latestHydratedMetaReview,
              auto_rework_count: targetCount
            }
          };
          try {
            written = await writeState(
              resolved.bubblePaths.statePath,
              latestIncremented,
              {
                expectedFingerprint: latest.fingerprint,
                expectedState: "RUNNING"
              }
            );
            break;
          } catch (retryError) {
            if (!(retryError instanceof StateStoreConflictError)) {
              throw toTransitionError(retryError);
            }
            latestConflict = retryError;
          }
        }

        if (written === undefined) {
          throw toConflictError(latestConflict);
        }
      } else {
        throw toTransitionError(error);
      }
    }
    if (written === undefined) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_STATE_CONFLICT",
        "META_REVIEW_GATE_STATE_CONFLICT: auto-rework count update did not converge after dispatch."
      );
    }

    return finishWithPaneDeactivation({
      bubbleId: resolved.bubbleId,
      route: "auto_rework",
      gateSequence: dispatched.sequence,
      gateEnvelope: dispatched.envelope,
      state: written.state,
      metaReviewRun: runResultForRouting
    });
  }

    return finishWithPaneDeactivation(
      await persistHumanGateRoute({
        appendEnvelope,
        writeState,
        statePath: resolved.bubblePaths.statePath,
        transcriptPath: resolved.bubblePaths.transcriptPath,
        inboxPath: resolved.bubblePaths.inboxPath,
        lockPath,
        now,
        nowIso,
        bubbleId: resolved.bubbleId,
        summary: buildHumanGateSummary({
          convergenceSummary: summary,
          metaReviewRun: runResultForRouting
        }),
        refs,
        loaded,
        expectedState: "META_REVIEW_RUNNING",
        route: resolveHumanGateRoute(recommendation, budgetAvailable),
        metaReviewRun: runResultForRouting,
        parityMetadata:
          positiveClaimParity.metadata ??
          resolveFindingsParityMetadataFromReportJson(runResultForRouting.report_json)
      })
    );
  } catch (error) {
    const deactivationError = await deactivateMetaReviewerPane();
    if (deactivationError !== null) {
      const root = toMetaReviewGateError(error);
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        `META_REVIEW_GATE_TRANSITION_INVALID: ${metaReviewGatePaneDeactivationUnavoidableReasonCode}: recovery failed and pane deactivation could not be confirmed (deactivation_error=${deactivationError}). Root error: ${root.message}`,
        {
          ...root.diagnostics,
          stageReasonCode: metaReviewGatePaneDeactivationUnavoidableReasonCode
        }
      );
    }
    throw error;
  }
}

export async function applyMetaReviewGateOnConvergence(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const setMetaReviewerPane =
    dependencies.setMetaReviewerPaneBinding ?? setMetaReviewerPaneBinding;
  const notifySubmissionRequest =
    dependencies.notifyMetaReviewerSubmissionRequest ?? notifyMetaReviewerSubmissionRequest;
  const runTmuxRunner = dependencies.runTmux ?? runTmux;
  const readFileFn = dependencies.readFile ?? readFile;
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const refs = input.refs ?? [];

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const lockPath = buildGateLockPath({
    locksDir: resolved.bubblePaths.locksDir,
    bubbleId: resolved.bubbleId
  });
  const deactivateMetaReviewerPane = async (): Promise<void> => {
    await setMetaReviewerPane({
      sessionsPath: resolved.bubblePaths.sessionsPath,
      bubbleId: resolved.bubbleId,
      active: false,
      now
    }).catch(() => undefined);
  };
  const loadedRunning = await readState(resolved.bubblePaths.statePath);
  assertRunningConvergenceState(loadedRunning.state);

  let readyForApproval: LoadedStateSnapshot;
  try {
    const nextReadyForApproval = applyStateTransition(loadedRunning.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: nowIso
    });
    readyForApproval = await writeState(
      resolved.bubblePaths.statePath,
      nextReadyForApproval,
      {
        expectedFingerprint: loadedRunning.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw toTransitionError(error);
  }

  const restoreRunningAfterStagedReadyFailure = async (input: {
    rootError: unknown;
    stageReasonCode: string;
  }): Promise<never> => {
    const rootGateError = toMetaReviewGateError(input.rootError);
    try {
      await writeState(resolved.bubblePaths.statePath, loadedRunning.state, {
        expectedFingerprint: readyForApproval.fingerprint,
        expectedState: "READY_FOR_APPROVAL"
      });
    } catch (restoreError) {
      const restoreReason = restoreError instanceof Error
        ? restoreError.message
        : String(restoreError);
      const restoreReasonCode =
        restoreError instanceof StateStoreConflictError
          ? metaReviewGateStagedReadyRestoreStateConflictReasonCode
          : metaReviewGateStagedReadyRestoreTransitionInvalidReasonCode;
      throw new MetaReviewGateError(
        restoreError instanceof StateStoreConflictError
          ? "META_REVIEW_GATE_STATE_CONFLICT"
          : "META_REVIEW_GATE_TRANSITION_INVALID",
        `${restoreError instanceof StateStoreConflictError ? "META_REVIEW_GATE_STATE_CONFLICT" : "META_REVIEW_GATE_TRANSITION_INVALID"}: ${input.stageReasonCode}: failed after READY_FOR_APPROVAL staging and restore to RUNNING failed (restore_reason_code=${restoreReasonCode}; restore_error=${restoreReason}). Root error: ${rootGateError.message}`,
        {
          ...rootGateError.diagnostics,
          stageReasonCode: input.stageReasonCode,
          restoreReasonCode
        }
      );
    }
    throw new MetaReviewGateError(
      rootGateError.reasonCode,
      `${rootGateError.reasonCode}: ${input.stageReasonCode}: failed after READY_FOR_APPROVAL staging and restore to RUNNING applied (restore_reason_code=${metaReviewGateStagedReadyRestoreAppliedReasonCode}). Root error: ${rootGateError.message}`,
      {
        ...rootGateError.diagnostics,
        stageReasonCode: input.stageReasonCode,
        restoreReasonCode: metaReviewGateStagedReadyRestoreAppliedReasonCode
      }
    );
  };

  const readyMetaReview = normalizeMetaReviewSnapshot(
    readyForApproval.state.meta_review
  );

  if (readyMetaReview.sticky_human_gate) {
    const parityArtifactRead = await readMetaReviewReportJsonArtifact({
      artifactPath: resolved.bubblePaths.metaReviewLastJsonArtifactPath,
      readFileFn
    });
    try {
      return await persistHumanGateRoute({
        appendEnvelope,
        writeState,
        statePath: resolved.bubblePaths.statePath,
        transcriptPath: resolved.bubblePaths.transcriptPath,
        inboxPath: resolved.bubblePaths.inboxPath,
        lockPath,
        now,
        nowIso,
        bubbleId: resolved.bubbleId,
        summary: input.summary,
        refs,
        loaded: readyForApproval,
        expectedState: "READY_FOR_APPROVAL",
        route: "human_gate_sticky_bypass",
        parityMetadata: resolveFindingsParityMetadataFromReportJson(
          parityArtifactRead.reportJson
        ),
        rollbackStateOnAppendFailure: loadedRunning.state
      });
    } catch (error) {
      const gateError = toMetaReviewGateError(error);
      if (
        gateError.diagnostics?.rollbackOutcome === "applied" &&
        gateError.diagnostics.rollbackReasonCode ===
          metaReviewGateRollbackAppliedReasonCode
      ) {
        throw gateError;
      }
      return restoreRunningAfterStagedReadyFailure({
        rootError: gateError,
        stageReasonCode: "META_REVIEW_GATE_STICKY_BYPASS_ROUTE_FAILED"
      });
    }
  }

  let metaReviewRunningState: LoadedStateSnapshot;
  try {
    const nextMetaReviewRunning = applyStateTransition(readyForApproval.state, {
      to: "META_REVIEW_RUNNING",
      activeAgent: metaReviewerAgent,
      activeRole: "meta_reviewer",
      activeSince: nowIso,
      lastCommandAt: nowIso
    });
    metaReviewRunningState = await writeState(
      resolved.bubblePaths.statePath,
      nextMetaReviewRunning,
      {
        expectedFingerprint: readyForApproval.fingerprint,
        expectedState: "READY_FOR_APPROVAL"
      }
    );
  } catch (error) {
    return restoreRunningAfterStagedReadyFailure({
      rootError: error,
      stageReasonCode: "META_REVIEW_GATE_META_REVIEW_STAGE_TRANSITION_FAILED"
    });
  }

  let metaReviewerPaneWarning: string | null = null;
  let shouldDeactivateMetaReviewerPane = false;
  const bindStart = await setMetaReviewerPane({
    sessionsPath: resolved.bubblePaths.sessionsPath,
    bubbleId: resolved.bubbleId,
    active: true,
    now
  }).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      updated: false,
      reason: "no_runtime_session" as const,
      errorMessage: reason
    };
  });
  if (!bindStart.updated) {
    const bindReason = "errorMessage" in bindStart
      ? bindStart.errorMessage
      : bindStart.reason ?? "unknown";
    metaReviewerPaneWarning = `META_REVIEWER_PANE_UNAVAILABLE: ${bindReason}`;
  } else if ("record" in bindStart && bindStart.record !== undefined) {
    shouldDeactivateMetaReviewerPane = true;
    const paneIndex = bindStart.record.metaReviewerPane?.paneIndex ?? 3;
    const targetPane = `${bindStart.record.tmuxSessionName}:0.${paneIndex}`;
    await notifySubmissionRequest(
      {
        bubbleId: resolved.bubbleId,
        round: metaReviewRunningState.state.round,
        targetPane
      },
      {
        runTmux: runTmuxRunner
      }
    ).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      metaReviewerPaneWarning = `META_REVIEWER_PANE_UNAVAILABLE: ${reason}`;
    });
  }

  if (metaReviewerPaneWarning !== null) {
    if (shouldDeactivateMetaReviewerPane) {
      await deactivateMetaReviewerPane();
    }
    return persistHumanGateRoute({
      appendEnvelope,
      writeState,
      statePath: resolved.bubblePaths.statePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      inboxPath: resolved.bubblePaths.inboxPath,
      lockPath,
      now,
      nowIso,
      bubbleId: resolved.bubbleId,
      summary: buildHumanGateSummary({
        convergenceSummary: input.summary,
        fallbackReason:
          `META_REVIEW_GATE_RUN_FAILED: structured submit request unavailable (${metaReviewerPaneWarning}).`
      }),
      refs,
      loaded: metaReviewRunningState,
      expectedState: "META_REVIEW_RUNNING",
      route: "human_gate_run_failed",
      fallbackRecommendation: "inconclusive",
      targetState: "META_REVIEW_FAILED",
      stickyHumanGate: false
    });
  }

  try {
    const kickoffSummary = [
      `Meta-review gate opened for bubble ${resolved.bubbleId} round ${metaReviewRunningState.state.round}.`,
      "Submit result through structured CLI:",
      `pairflow bubble meta-review submit --id ${resolved.bubbleId} --round ${metaReviewRunningState.state.round} --recommendation <approve|rework|inconclusive> --summary "<summary>" --report-markdown "<markdown>" [--rework-target-message "<message>"] [--report-json '{"findings_claim_state":"clean|open_findings|unknown","findings_claim_source":"meta_review_artifact","findings_count":<int>,"findings_artifact_ref":"artifacts/...","meta_review_run_id":"<run-id>","findings_digest_sha256":"<sha256>","findings_artifact_status":"available"}'].`
    ].join(" ");

    const appended = await appendEnvelope({
      transcriptPath: resolved.bubblePaths.transcriptPath,
      mirrorPaths: [resolved.bubblePaths.inboxPath],
      lockPath,
      now,
      envelope: {
        bubble_id: resolved.bubbleId,
        sender: "orchestrator",
        recipient: metaReviewerAgent,
        type: "TASK",
        round: metaReviewRunningState.state.round,
        payload: {
          summary: kickoffSummary,
          metadata: {
            [deliveryTargetRoleMetadataKey]: "meta_reviewer",
            actor: "meta-review-gate",
            actor_agent: "orchestrator",
            lifecycle_state: "META_REVIEW_RUNNING"
          }
        },
        refs
      }
    });

    return {
      bubbleId: resolved.bubbleId,
      route: "meta_review_running",
      gateSequence: appended.sequence,
      gateEnvelope: appended.envelope,
      state: metaReviewRunningState.state
    };
  } catch (error) {
    const runFailureReason = error instanceof Error ? error.message : String(error);
    const fallbackSummary = buildHumanGateSummary({
      convergenceSummary: input.summary,
      fallbackReason: `META_REVIEW_GATE_RUN_FAILED: ${runFailureReason}`
    });
    try {
      return await persistHumanGateRoute({
        appendEnvelope,
        writeState,
        statePath: resolved.bubblePaths.statePath,
        transcriptPath: resolved.bubblePaths.transcriptPath,
        inboxPath: resolved.bubblePaths.inboxPath,
        lockPath,
        now,
        nowIso,
        bubbleId: resolved.bubbleId,
        summary: fallbackSummary,
        refs,
        loaded: metaReviewRunningState,
        expectedState: "META_REVIEW_RUNNING",
        route: "human_gate_run_failed",
        fallbackRecommendation: "inconclusive",
        targetState: "META_REVIEW_FAILED",
        stickyHumanGate: false
      });
    } finally {
      if (shouldDeactivateMetaReviewerPane) {
        await deactivateMetaReviewerPane();
      }
    }
  }
}

export function toMetaReviewGateError(error: unknown): MetaReviewGateError {
  if (error instanceof MetaReviewGateError) {
    return error;
  }
  if (error instanceof StateStoreConflictError) {
    return toConflictError(error);
  }
  if (error instanceof BubbleLookupError) {
    return new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      error.message
    );
  }
  if (error instanceof MetaReviewError) {
    return new MetaReviewGateError(
      "META_REVIEW_GATE_RUN_FAILED",
      `${error.reasonCode}: ${error.message}`
    );
  }
  if (error instanceof Error) {
    return new MetaReviewGateError("META_REVIEW_GATE_TRANSITION_INVALID", error.message);
  }
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `Unknown meta-review gate error: ${String(error)}`
  );
}

export function asMetaReviewGateError(error: unknown): never {
  throw toMetaReviewGateError(error);
}
