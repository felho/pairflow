import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { appendProtocolEnvelope, type AppendProtocolEnvelopeResult } from "../../../core/protocol/transcriptStore.js";
import { applyStateTransition } from "../../../core/state/machine.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import { runTmux } from "../../../core/runtime/tmuxManager.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage
} from "../../../core/runtime/tmuxInput.js";
import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  type BubbleMetaReviewSnapshotState,
  type BubbleStateSnapshot,
  type AgentName,
  type MetaReviewRecommendation,
  type MetaReviewRunStatus
} from "../../../types/bubble.js";
import {
  MetaReviewError,
  hasCanonicalSubmitForActiveMetaReviewRound,
  type MetaReviewRunResult,
  type MetaReviewRunWarning
} from "../../../core/bubble/metaReview.js";
import { appendHumanApprovalRequestEnvelope } from "../../../core/bubble/approvalRequestEnvelope.js";
import {
  deliveryTargetRoleMetadataKey,
  type FindingsParityMetadata,
  type ProtocolEnvelope
} from "../../../types/protocol.js";
import {
  readMetaReviewReportJsonArtifact,
  resolveFindingsParityMetadataFromReportJson
} from "./metaReviewGateFindingsMetadata.js";
import { validateStructuredMetaReviewPositiveClaim } from "./metaReviewGateFindingsValidation.js";

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
      `meta-review gate convergence route requires RUNNING state (current: ${state.state}).`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
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
        "META_REVIEW_GATE_TRANSITION_INVALID: human gate route resolver reached rework+budgetAvailable branch unexpectedly.",
        {
          stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
        }
      );
    }
    return "human_gate_budget_exhausted";
  }
  return "human_gate_inconclusive";
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
      "META_REVIEW_GATE_TRANSITION_INVALID: persistHumanGateRoute requires either metaReviewRun or fallbackRecommendation, but not both.",
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
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
    `META_REVIEW_GATE_TRANSITION_INVALID: sticky_human_gate default policy is undefined for route=${route}.`,
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
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

interface RecoverMetaReviewExecutionContext {
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  now: Date;
  nowIso: string;
  refs: string[];
  lockPath: string;
  loaded: LoadedStateSnapshot;
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  readState: typeof readStateSnapshot;
  readFileFn: typeof readFile;
  writeFileFn: typeof writeFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
  deactivateMetaReviewerPane: () => Promise<string | null>;
  finishWithPaneDeactivation: (result: MetaReviewGateResult) => Promise<MetaReviewGateResult>;
}

interface RecoveredRunResolution {
  snapshot: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
  summary: string;
  snapshotHasCanonicalSubmitInActiveWindow: boolean;
}

type RecoveryParityResolution =
  | {
      ok: true;
      budgetAvailable: boolean;
      runResultForRouting: MetaReviewRunResult;
      parityMetadata: FindingsParityMetadata | null;
    }
  | {
      ok: false;
      reason: string;
      runResultForRouting: MetaReviewRunResult;
      parityMetadata: FindingsParityMetadata | null;
    };

async function initializeRecoverMetaReviewExecutionContext(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies
): Promise<RecoverMetaReviewExecutionContext> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const setMetaReviewerPane =
    dependencies.setMetaReviewerPaneBinding ?? setMetaReviewerPaneBinding;
  const readFileFn = dependencies.readFile ?? readFile;
  const writeFileFn = dependencies.writeFile ?? writeFile;
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

  return {
    resolved,
    now,
    nowIso,
    refs,
    lockPath,
    loaded,
    appendEnvelope,
    writeState,
    readState,
    readFileFn,
    writeFileFn,
    ...(dependencies.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: dependencies.sleepForRetryMs }
      : {}),
    deactivateMetaReviewerPane,
    finishWithPaneDeactivation
  };
}

async function resolveRecoveredRunResolution(input: {
  context: RecoverMetaReviewExecutionContext;
  requestedRunResult?: MetaReviewRunResult;
  requestedSummary?: string;
}): Promise<RecoveredRunResolution> {
  const snapshot = normalizeMetaReviewSnapshot(input.context.loaded.state.meta_review);
  const fallbackSummary =
    input.requestedSummary ??
    "Meta-review completed previously; recovering gate route from snapshot.";
  const snapshotHasCanonicalSubmitInActiveWindow =
    hasCanonicalSubmitForActiveMetaReviewRound({
      state: input.context.loaded.state,
      snapshot
    });
  const reportJsonArtifactRead = await readMetaReviewReportJsonArtifact({
    artifactPath: input.context.resolved.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn: input.context.readFileFn
  });

  const runResultBase = normalizeRecoveredMetaReviewRunResult({
    bubbleId: input.context.resolved.bubbleId,
    nowIso: input.context.nowIso,
    fallbackSummary,
    bubbleDir: input.context.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.context.resolved.bubblePaths.artifactsDir,
    runResult: input.requestedRunResult ?? (
      snapshotHasCanonicalSubmitInActiveWindow
        ? synthesizeMetaReviewRunResultFromSnapshot({
            bubbleId: input.context.resolved.bubbleId,
            nowIso: input.context.nowIso,
            snapshot,
            fallbackSummary
          })
        : synthesizeMetaReviewRunFailure({
            bubbleId: input.context.resolved.bubbleId,
            nowIso: input.context.nowIso,
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
    ?? input.requestedSummary
    ?? "Meta-review completed previously; recovering gate route from snapshot.";

  return {
    snapshot,
    runResult,
    summary,
    snapshotHasCanonicalSubmitInActiveWindow
  };
}

function assertRecoveredRunResolutionConsistency(input: {
  requestedRunResult?: MetaReviewRunResult;
  snapshotHasCanonicalSubmitInActiveWindow: boolean;
  snapshot: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
}): void {
  const snapshotUpdatedAtMs = Date.parse(input.snapshot.last_autonomous_updated_at ?? "");
  const runResultUpdatedAtMs = Date.parse(input.runResult.updated_at);
  const hasComparableTimestamps =
    Number.isFinite(snapshotUpdatedAtMs) && Number.isFinite(runResultUpdatedAtMs);
  const updatedAtChanged = input.requestedRunResult === undefined
    ? false
    : (hasComparableTimestamps
        ? snapshotUpdatedAtMs !== runResultUpdatedAtMs
        : input.snapshot.last_autonomous_updated_at !== input.runResult.updated_at);
  if (
    input.requestedRunResult !== undefined
    && input.snapshotHasCanonicalSubmitInActiveWindow
    && updatedAtChanged
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_STATE_CONFLICT",
      "META_REVIEW_GATE_STATE_CONFLICT: canonical snapshot changed between await and recovery route.",
      {
        stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
      }
    );
  }
}

function mergeRunResultWithParityResolution(input: {
  runResult: MetaReviewRunResult;
  metadata: FindingsParityMetadata | null;
  diagnostics: string[];
}): MetaReviewRunResult {
  if (input.metadata === null && input.diagnostics.length === 0) {
    return input.runResult;
  }
  const reportJson = { ...(input.runResult.report_json ?? {}) };
  if (input.metadata !== null) {
    reportJson.findings_claimed_open_total = input.metadata.findings_claimed_open_total;
    reportJson.findings_artifact_open_total = input.metadata.findings_artifact_open_total;
    reportJson.findings_artifact_status = input.metadata.findings_artifact_status;
    reportJson.findings_digest_sha256 = input.metadata.findings_digest_sha256;
    reportJson.meta_review_run_id = input.metadata.meta_review_run_id;
    reportJson.findings_parity_status = input.metadata.findings_parity_status;
  }
  const existingDiagnostics = Array.isArray(reportJson.claim_diagnostics)
    ? reportJson.claim_diagnostics.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];
  const mergedDiagnostics = [...existingDiagnostics, ...input.diagnostics];
  if (mergedDiagnostics.length > 0) {
    reportJson.claim_diagnostics = mergedDiagnostics;
  }
  return {
    ...input.runResult,
    report_json: reportJson
  };
}

async function resolveRecoveryParityRouting(input: {
  context: RecoverMetaReviewExecutionContext;
  snapshot: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
}): Promise<RecoveryParityResolution> {
  const positiveClaimParity = await validateStructuredMetaReviewPositiveClaim({
    runResult: input.runResult,
    ...(input.runResult.report_json !== undefined
      ? { reportJson: input.runResult.report_json }
      : {}),
    bubbleDir: input.context.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.context.resolved.bubblePaths.artifactsDir,
    readFileFn: input.context.readFileFn,
    ...(input.context.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: input.context.sleepForRetryMs }
      : {})
  });
  if (!positiveClaimParity.ok) {
    return {
      ok: false,
      reason: positiveClaimParity.reason,
      runResultForRouting: mergeRunResultWithParityResolution({
        runResult: input.runResult,
        metadata: positiveClaimParity.metadata,
        diagnostics: []
      }),
      parityMetadata: positiveClaimParity.metadata
    };
  }
  return {
    ok: true,
    budgetAvailable: input.snapshot.auto_rework_count < input.snapshot.auto_rework_limit,
    runResultForRouting: mergeRunResultWithParityResolution({
      runResult: input.runResult,
      metadata: positiveClaimParity.metadata,
      diagnostics: positiveClaimParity.diagnostics
    }),
    parityMetadata: positiveClaimParity.metadata
  };
}

async function persistRecoveryRunFailedHumanRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  summary: string;
  runResult: MetaReviewRunResult;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.context.appendEnvelope,
    writeState: input.context.writeState,
    statePath: input.context.resolved.bubblePaths.statePath,
    transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
    inboxPath: input.context.resolved.bubblePaths.inboxPath,
    lockPath: input.context.lockPath,
    now: input.context.now,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      metaReviewRun: input.runResult
    }),
    refs: input.context.refs,
    loaded: input.context.loaded,
    expectedState: "META_REVIEW_RUNNING",
    route: "human_gate_run_failed",
    metaReviewRun: input.runResult,
    parityMetadata: resolveFindingsParityMetadataFromReportJson(
      input.runResult.report_json
    ),
    targetState: "META_REVIEW_FAILED",
    stickyHumanGate: false
  });
}

async function persistRecoveryDispatchFailedHumanRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  summary: string;
  fallbackReason: string;
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  runResultForRouting: MetaReviewRunResult;
  parityMetadata: FindingsParityMetadata | null;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.context.appendEnvelope,
    writeState: input.context.writeState,
    statePath: input.context.resolved.bubblePaths.statePath,
    transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
    inboxPath: input.context.resolved.bubblePaths.inboxPath,
    lockPath: input.context.lockPath,
    now: input.context.now,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      fallbackReason: input.fallbackReason
    }),
    refs: input.context.refs,
    loaded: input.loaded,
    expectedState: input.expectedState,
    route: "human_gate_dispatch_failed",
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata ??
      resolveFindingsParityMetadataFromReportJson(input.runResultForRouting.report_json),
    ...(input.rollbackStateOnAppendFailure !== undefined
      ? { rollbackStateOnAppendFailure: input.rollbackStateOnAppendFailure }
      : {})
  });
}

async function transitionRecoveryToRunningForAutoRework(input: {
  context: RecoverMetaReviewExecutionContext;
  loaded: LoadedStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  const nextRound = input.loaded.state.round + 1;
  const resumed = applyStateTransition(input.loaded.state, {
    to: "RUNNING",
    round: nextRound,
    activeAgent: input.context.resolved.bubbleConfig.agents.implementer,
    activeRole: "implementer",
    activeSince: input.context.nowIso,
    lastCommandAt: input.context.nowIso,
    appendRoundRoleEntry: {
      round: nextRound,
      implementer: input.context.resolved.bubbleConfig.agents.implementer,
      reviewer: input.context.resolved.bubbleConfig.agents.reviewer,
      switched_at: input.context.nowIso
    }
  });
  return input.context.writeState(input.context.resolved.bubblePaths.statePath, resumed, {
    expectedFingerprint: input.loaded.fingerprint,
    expectedState: "META_REVIEW_RUNNING"
  });
}

async function restoreReadyForApprovalAfterDispatchFailure(input: {
  context: RecoverMetaReviewExecutionContext;
  loaded: LoadedStateSnapshot;
  resumedWritten: LoadedStateSnapshot;
  runResultForRouting: MetaReviewRunResult;
  appendReason: string;
}): Promise<{ readyForApproval: LoadedStateSnapshot; restoreOutcome: string }> {
  let restoreOutcome = "restore_outcome=not_attempted";
  try {
    const backToReady = applyStateTransition(input.resumedWritten.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.context.nowIso
    });
    const restoredCounterReady: BubbleStateSnapshot = {
      ...backToReady,
      round: input.loaded.state.round,
      round_role_history: input.loaded.state.round_role_history,
      meta_review: buildHydratedMetaReviewSnapshotFromRunResult({
        metaReview: normalizeMetaReviewSnapshot(backToReady.meta_review),
        runResult: input.runResultForRouting
      })
    };
    const readyForApproval = await input.context.writeState(
      input.context.resolved.bubblePaths.statePath,
      restoredCounterReady,
      {
        expectedFingerprint: input.resumedWritten.fingerprint,
        expectedState: "RUNNING"
      }
    );
    restoreOutcome = "restore_outcome=applied";
    return { readyForApproval, restoreOutcome };
  } catch (recoveryError) {
    const restoreReason =
      recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
    restoreOutcome = `restore_outcome=failed restore_error=${restoreReason}`;
    if (recoveryError instanceof StateStoreConflictError) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_STATE_CONFLICT",
        `META_REVIEW_GATE_STATE_CONFLICT: auto-rework dispatch append failed (append_error=${input.appendReason}) and restore to READY_FOR_APPROVAL failed (${restoreOutcome}).`,
        {
          stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
        }
      );
    }
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: auto-rework dispatch append failed (append_error=${input.appendReason}) and restore to READY_FOR_APPROVAL failed (${restoreOutcome}).`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
}

async function persistAutoReworkCounterAfterRecoveryDispatch(input: {
  context: RecoverMetaReviewExecutionContext;
  snapshot: BubbleMetaReviewSnapshotState;
  resumedWritten: LoadedStateSnapshot;
  runResultForRouting: MetaReviewRunResult;
}): Promise<LoadedStateSnapshot> {
  let written: LoadedStateSnapshot | undefined;
  try {
    const resumedWithHydratedRun: BubbleStateSnapshot = {
      ...input.resumedWritten.state,
      meta_review: buildHydratedMetaReviewSnapshotFromRunResult({
        metaReview: normalizeMetaReviewSnapshot(input.resumedWritten.state.meta_review),
        runResult: input.runResultForRouting
      })
    };
    const resumedWithCounter = incrementAutoReworkCount(resumedWithHydratedRun);
    written = await input.context.writeState(
      input.context.resolved.bubblePaths.statePath,
      resumedWithCounter,
      {
        expectedFingerprint: input.resumedWritten.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (!(error instanceof StateStoreConflictError)) {
      throw toTransitionError(error);
    }
    let latestConflict: StateStoreConflictError = error;
    const expectedCount = input.snapshot.auto_rework_count;
    const targetCount = expectedCount + 1;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const latest = await input.context.readState(
        input.context.resolved.bubblePaths.statePath
      );
      if (latest.state.state !== "RUNNING") {
        throw toConflictError(latestConflict);
      }
      const retryInvariantViolation = resolveAutoReworkRetryInvariantViolation({
        latest: latest.state,
        expected: input.resumedWritten.state
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
        typeof input.runResultForRouting.run_id === "string" &&
        input.runResultForRouting.run_id.trim().length > 0
          ? input.runResultForRouting.run_id
          : null;
      const latestCanonicalRunId = resolveCanonicalMetaReviewRunId(latestMetaReview);
      if (
        latestCanonicalRunId !== null &&
        retryRunId !== null &&
        latestCanonicalRunId !== retryRunId
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
        runResult: input.runResultForRouting
      });
      const latestIncremented: BubbleStateSnapshot = {
        ...latest.state,
        meta_review: {
          ...latestHydratedMetaReview,
          auto_rework_count: targetCount
        }
      };
      try {
        written = await input.context.writeState(
          input.context.resolved.bubblePaths.statePath,
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
  }
  if (written === undefined) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_STATE_CONFLICT",
      "META_REVIEW_GATE_STATE_CONFLICT: auto-rework count update did not converge after dispatch.",
      {
        stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
      }
    );
  }
  return written;
}

async function handleRecoveryAutoReworkRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  snapshot: BubbleMetaReviewSnapshotState;
  summary: string;
  runResultForRouting: MetaReviewRunResult;
  parityMetadata: FindingsParityMetadata | null;
}): Promise<MetaReviewGateResult> {
  if (input.snapshot.sticky_human_gate) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_STATE_CONFLICT",
      "META_REVIEW_GATE_STATE_CONFLICT: sticky_human_gate became true before auto rework dispatch.",
      {
        stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
      }
    );
  }

  const reworkMessage = input.runResultForRouting.rework_target_message;
  if (reworkMessage === null || reworkMessage.trim().length === 0) {
    return persistRecoveryDispatchFailedHumanRoute({
      context: input.context,
      summary: input.summary,
      fallbackReason:
        "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: missing rework target message for autonomous dispatch",
      loaded: input.context.loaded,
      expectedState: "META_REVIEW_RUNNING",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      rollbackStateOnAppendFailure: input.context.loaded.state
    });
  }

  const resumedWritten = await transitionRecoveryToRunningForAutoRework({
    context: input.context,
    loaded: input.context.loaded
  }).catch((error: unknown) => {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw toTransitionError(error);
  });

  let dispatched: AppendProtocolEnvelopeResult;
  try {
    dispatched = await input.context.appendEnvelope({
      transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
      mirrorPaths: [input.context.resolved.bubblePaths.inboxPath],
      lockPath: input.context.lockPath,
      now: input.context.now,
      envelope: {
        bubble_id: input.context.resolved.bubbleId,
        sender: "orchestrator",
        recipient: input.context.resolved.bubbleConfig.agents.implementer,
        type: "APPROVAL_DECISION",
        round: input.context.loaded.state.round,
        payload: {
          decision: "revise",
          message: reworkMessage,
          metadata: {
            [deliveryTargetRoleMetadataKey]: "implementer",
            actor: "meta-reviewer",
            actor_agent: "codex",
            recommendation: input.runResultForRouting.recommendation,
            ...(input.runResultForRouting.run_id !== undefined
              ? { run_id: input.runResultForRouting.run_id }
              : {}),
            ...resolveFindingsParityMetadataForEnvelope(input.parityMetadata)
          }
        },
        refs: input.context.refs
      }
    });
  } catch (error) {
    const appendReason = error instanceof Error ? error.message : String(error);
    const restored = await restoreReadyForApprovalAfterDispatchFailure({
      context: input.context,
      loaded: input.context.loaded,
      resumedWritten,
      runResultForRouting: input.runResultForRouting,
      appendReason
    });
    return persistRecoveryDispatchFailedHumanRoute({
      context: input.context,
      summary: input.summary,
      fallbackReason:
        `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: append_error=${appendReason}; ${restored.restoreOutcome}`,
      loaded: restored.readyForApproval,
      expectedState: "READY_FOR_APPROVAL",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      rollbackStateOnAppendFailure: restored.readyForApproval.state
    });
  }

  const written = await persistAutoReworkCounterAfterRecoveryDispatch({
    context: input.context,
    snapshot: input.snapshot,
    resumedWritten,
    runResultForRouting: input.runResultForRouting
  });

  return {
    bubbleId: input.context.resolved.bubbleId,
    route: "auto_rework",
    gateSequence: dispatched.sequence,
    gateEnvelope: dispatched.envelope,
    state: written.state,
    metaReviewRun: input.runResultForRouting
  };
}

async function persistRecoveryResolvedHumanRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  summary: string;
  runResultForRouting: MetaReviewRunResult;
  recommendation: MetaReviewRecommendation;
  budgetAvailable: boolean;
  parityMetadata: FindingsParityMetadata | null;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.context.appendEnvelope,
    writeState: input.context.writeState,
    statePath: input.context.resolved.bubblePaths.statePath,
    transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
    inboxPath: input.context.resolved.bubblePaths.inboxPath,
    lockPath: input.context.lockPath,
    now: input.context.now,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      metaReviewRun: input.runResultForRouting
    }),
    refs: input.context.refs,
    loaded: input.context.loaded,
    expectedState: "META_REVIEW_RUNNING",
    route: resolveHumanGateRoute(input.recommendation, input.budgetAvailable),
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata ??
      resolveFindingsParityMetadataFromReportJson(input.runResultForRouting.report_json)
  });
}

export async function recoverMetaReviewGateFromSnapshot(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): Promise<MetaReviewGateResult> {
  const context = await initializeRecoverMetaReviewExecutionContext(
    input,
    dependencies
  );
  try {
    const runResolution = await resolveRecoveredRunResolution({
      context,
      ...(input.runResult !== undefined ? { requestedRunResult: input.runResult } : {}),
      ...(input.summary !== undefined ? { requestedSummary: input.summary } : {})
    });

    assertRecoveredRunResolutionConsistency({
      ...(input.runResult !== undefined ? { requestedRunResult: input.runResult } : {}),
      snapshotHasCanonicalSubmitInActiveWindow:
        runResolution.snapshotHasCanonicalSubmitInActiveWindow,
      snapshot: runResolution.snapshot,
      runResult: runResolution.runResult
    });

    if (runResolution.runResult.status === "error") {
      return context.finishWithPaneDeactivation(
        await persistRecoveryRunFailedHumanRoute({
          context,
          summary: runResolution.summary,
          runResult: runResolution.runResult
        })
      );
    }

    const parityResolution = await resolveRecoveryParityRouting({
      context,
      snapshot: runResolution.snapshot,
      runResult: runResolution.runResult
    });
    if (!parityResolution.ok) {
      return context.finishWithPaneDeactivation(
        await persistRecoveryDispatchFailedHumanRoute({
          context,
          summary: runResolution.summary,
          fallbackReason:
            `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${parityResolution.reason}`,
          loaded: context.loaded,
          expectedState: "META_REVIEW_RUNNING",
          runResultForRouting: parityResolution.runResultForRouting,
          parityMetadata: parityResolution.parityMetadata
        })
      );
    }

    if (
      runResolution.runResult.recommendation === "rework" &&
      parityResolution.budgetAvailable
    ) {
      return context.finishWithPaneDeactivation(
        await handleRecoveryAutoReworkRoute({
          context,
          snapshot: runResolution.snapshot,
          summary: runResolution.summary,
          runResultForRouting: parityResolution.runResultForRouting,
          parityMetadata: parityResolution.parityMetadata
        })
      );
    }

    return context.finishWithPaneDeactivation(
      await persistRecoveryResolvedHumanRoute({
        context,
        summary: runResolution.summary,
        runResultForRouting: parityResolution.runResultForRouting,
        recommendation: runResolution.runResult.recommendation,
        budgetAvailable: parityResolution.budgetAvailable,
        parityMetadata: parityResolution.parityMetadata
      })
    );
  } catch (error) {
    const deactivationError = await context.deactivateMetaReviewerPane();
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

async function stageReadyForApprovalState(input: {
  loadedRunning: LoadedStateSnapshot;
  nowIso: string;
  statePath: string;
  writeState: typeof writeStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  try {
    const nextReadyForApproval = applyStateTransition(input.loadedRunning.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.nowIso
    });
    return await input.writeState(input.statePath, nextReadyForApproval, {
      expectedFingerprint: input.loadedRunning.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw toTransitionError(error);
  }
}

async function restoreRunningAfterStagedReadyFailure(input: {
  rootError: unknown;
  stageReasonCode: string;
  writeState: typeof writeStateSnapshot;
  statePath: string;
  loadedRunning: LoadedStateSnapshot;
  readyForApproval: LoadedStateSnapshot;
}): Promise<never> {
  const rootGateError = toMetaReviewGateError(input.rootError);
  try {
    await input.writeState(input.statePath, input.loadedRunning.state, {
      expectedFingerprint: input.readyForApproval.fingerprint,
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
}

async function stageMetaReviewRunningState(input: {
  readyForApproval: LoadedStateSnapshot;
  nowIso: string;
  statePath: string;
  writeState: typeof writeStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  const nextMetaReviewRunning = applyStateTransition(input.readyForApproval.state, {
    to: "META_REVIEW_RUNNING",
    activeAgent: metaReviewerAgent,
    activeRole: "meta_reviewer",
    activeSince: input.nowIso,
    lastCommandAt: input.nowIso
  });
  return input.writeState(
    input.statePath,
    nextMetaReviewRunning,
    {
      expectedFingerprint: input.readyForApproval.fingerprint,
      expectedState: "READY_FOR_APPROVAL"
    }
  );
}

async function resolveMetaReviewerPaneWarning(input: {
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  notifySubmissionRequest: typeof notifyMetaReviewerSubmissionRequest;
  runTmuxRunner: typeof runTmux;
  sessionsPath: string;
  bubbleId: string;
  round: number;
  now: Date;
}): Promise<{ warning: string | null; shouldDeactivate: boolean }> {
  let warning: string | null = null;
  let shouldDeactivate = false;
  const bindStart = await input.setMetaReviewerPane({
    sessionsPath: input.sessionsPath,
    bubbleId: input.bubbleId,
    active: true,
    now: input.now
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
    return {
      warning: `META_REVIEWER_PANE_UNAVAILABLE: ${bindReason}`,
      shouldDeactivate: false
    };
  }
  if (!("record" in bindStart) || bindStart.record === undefined) {
    return { warning: null, shouldDeactivate: false };
  }

  shouldDeactivate = true;
  const paneIndex = bindStart.record.metaReviewerPane?.paneIndex ?? 3;
  const targetPane = `${bindStart.record.tmuxSessionName}:0.${paneIndex}`;
  await input.notifySubmissionRequest(
    {
      bubbleId: input.bubbleId,
      round: input.round,
      targetPane
    },
    {
      runTmux: input.runTmuxRunner
    }
  ).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    warning = `META_REVIEWER_PANE_UNAVAILABLE: ${reason}`;
  });
  return { warning, shouldDeactivate };
}

async function appendMetaReviewKickoffEnvelope(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  round: number;
  refs: string[];
}): Promise<AppendProtocolEnvelopeResult> {
  const kickoffSummary = [
    `Meta-review gate opened for bubble ${input.bubbleId} round ${input.round}.`,
    "Submit result through structured CLI:",
    `pairflow bubble meta-review submit --id ${input.bubbleId} --round ${input.round} --recommendation <approve|rework|inconclusive> --summary "<summary>" --report-markdown "<markdown>" [--rework-target-message "<message>"] [--report-json '{"findings_claim_state":"clean|open_findings|unknown","findings_claim_source":"meta_review_artifact","findings_count":<int>,"findings_artifact_ref":"artifacts/...","meta_review_run_id":"<run-id>","findings_digest_sha256":"<sha256>","findings_artifact_status":"available"}'].`
  ].join(" ");

  return input.appendEnvelope({
    transcriptPath: input.transcriptPath,
    mirrorPaths: [input.inboxPath],
    lockPath: input.lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.bubbleId,
      sender: "orchestrator",
      recipient: metaReviewerAgent,
      type: "TASK",
      round: input.round,
      payload: {
        summary: kickoffSummary,
        metadata: {
          [deliveryTargetRoleMetadataKey]: "meta_reviewer",
          actor: "meta-review-gate",
          actor_agent: "orchestrator",
          lifecycle_state: "META_REVIEW_RUNNING"
        }
      },
      refs: input.refs
    }
  });
}

async function persistMetaReviewRunFailedRoute(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  convergenceSummary: string;
  fallbackReason: string;
  refs: string[];
  loaded: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.appendEnvelope,
    writeState: input.writeState,
    statePath: input.statePath,
    transcriptPath: input.transcriptPath,
    inboxPath: input.inboxPath,
    lockPath: input.lockPath,
    now: input.now,
    nowIso: input.nowIso,
    bubbleId: input.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.convergenceSummary,
      fallbackReason: input.fallbackReason
    }),
    refs: input.refs,
    loaded: input.loaded,
    expectedState: "META_REVIEW_RUNNING",
    route: "human_gate_run_failed",
    fallbackRecommendation: "inconclusive",
    targetState: "META_REVIEW_FAILED",
    stickyHumanGate: false
  });
}

async function routeStickyHumanGateBypass(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  readFileFn: typeof readFile;
  bubblePaths: Awaited<ReturnType<typeof resolveBubbleById>>["bubblePaths"];
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  summary: string;
  refs: string[];
  loadedRunning: LoadedStateSnapshot;
  readyForApproval: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  const parityArtifactRead = await readMetaReviewReportJsonArtifact({
    artifactPath: input.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn: input.readFileFn
  });
  try {
    return await persistHumanGateRoute({
      appendEnvelope: input.appendEnvelope,
      writeState: input.writeState,
      statePath: input.bubblePaths.statePath,
      transcriptPath: input.bubblePaths.transcriptPath,
      inboxPath: input.bubblePaths.inboxPath,
      lockPath: input.lockPath,
      now: input.now,
      nowIso: input.nowIso,
      bubbleId: input.bubbleId,
      summary: input.summary,
      refs: input.refs,
      loaded: input.readyForApproval,
      expectedState: "READY_FOR_APPROVAL",
      route: "human_gate_sticky_bypass",
      parityMetadata: resolveFindingsParityMetadataFromReportJson(
        parityArtifactRead.reportJson
      ),
      rollbackStateOnAppendFailure: input.loadedRunning.state
    });
  } catch (error) {
    const gateError = toMetaReviewGateError(error);
    if (
      gateError.diagnostics?.rollbackOutcome === "applied" &&
      gateError.diagnostics.rollbackReasonCode === metaReviewGateRollbackAppliedReasonCode
    ) {
      throw gateError;
    }
    return restoreRunningAfterStagedReadyFailure({
      rootError: gateError,
      stageReasonCode: "META_REVIEW_GATE_STICKY_BYPASS_ROUTE_FAILED",
      writeState: input.writeState,
      statePath: input.bubblePaths.statePath,
      loadedRunning: input.loadedRunning,
      readyForApproval: input.readyForApproval
    });
  }
}

interface ApplyMetaReviewGateExecutionContext {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  notifySubmissionRequest: typeof notifyMetaReviewerSubmissionRequest;
  runTmuxRunner: typeof runTmux;
  readFileFn: typeof readFile;
  now: Date;
  nowIso: string;
  refs: string[];
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  lockPath: string;
  deactivateMetaReviewerPane: () => Promise<void>;
  loadedRunning: LoadedStateSnapshot;
  readyForApproval: LoadedStateSnapshot;
}

async function initializeApplyMetaReviewGateExecutionContext(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies
): Promise<ApplyMetaReviewGateExecutionContext> {
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
  const readyForApproval = await stageReadyForApprovalState({
    loadedRunning,
    nowIso,
    statePath: resolved.bubblePaths.statePath,
    writeState
  });

  return {
    appendEnvelope,
    writeState,
    setMetaReviewerPane,
    notifySubmissionRequest,
    runTmuxRunner,
    readFileFn,
    now,
    nowIso,
    refs,
    resolved,
    lockPath,
    deactivateMetaReviewerPane,
    loadedRunning,
    readyForApproval
  };
}

async function routeMetaReviewKickoffOrRunFailed(
  input: {
    context: ApplyMetaReviewGateExecutionContext;
    convergenceSummary: string;
    metaReviewRunningState: LoadedStateSnapshot;
    shouldDeactivateMetaReviewerPane: boolean;
  }
): Promise<MetaReviewGateResult> {
  try {
    const appended = await appendMetaReviewKickoffEnvelope({
      appendEnvelope: input.context.appendEnvelope,
      transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
      inboxPath: input.context.resolved.bubblePaths.inboxPath,
      lockPath: input.context.lockPath,
      now: input.context.now,
      bubbleId: input.context.resolved.bubbleId,
      round: input.metaReviewRunningState.state.round,
      refs: input.context.refs
    });

    return {
      bubbleId: input.context.resolved.bubbleId,
      route: "meta_review_running",
      gateSequence: appended.sequence,
      gateEnvelope: appended.envelope,
      state: input.metaReviewRunningState.state
    };
  } catch (error) {
    const runFailureReason = error instanceof Error ? error.message : String(error);
    try {
      return await persistMetaReviewRunFailedRoute({
        appendEnvelope: input.context.appendEnvelope,
        writeState: input.context.writeState,
        statePath: input.context.resolved.bubblePaths.statePath,
        transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
        inboxPath: input.context.resolved.bubblePaths.inboxPath,
        lockPath: input.context.lockPath,
        now: input.context.now,
        nowIso: input.context.nowIso,
        bubbleId: input.context.resolved.bubbleId,
        convergenceSummary: input.convergenceSummary,
        fallbackReason: `META_REVIEW_GATE_RUN_FAILED: ${runFailureReason}`,
        refs: input.context.refs,
        loaded: input.metaReviewRunningState
      });
    } finally {
      if (input.shouldDeactivateMetaReviewerPane) {
        await input.context.deactivateMetaReviewerPane();
      }
    }
  }
}

export async function applyMetaReviewGateOnConvergence(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  const context = await initializeApplyMetaReviewGateExecutionContext(
    input,
    dependencies
  );

  const readyMetaReview = normalizeMetaReviewSnapshot(
    context.readyForApproval.state.meta_review
  );

  if (readyMetaReview.sticky_human_gate) {
    return routeStickyHumanGateBypass({
      appendEnvelope: context.appendEnvelope,
      writeState: context.writeState,
      readFileFn: context.readFileFn,
      bubblePaths: context.resolved.bubblePaths,
      lockPath: context.lockPath,
      now: context.now,
      nowIso: context.nowIso,
      bubbleId: context.resolved.bubbleId,
      summary: input.summary,
      refs: context.refs,
      loadedRunning: context.loadedRunning,
      readyForApproval: context.readyForApproval
    });
  }

  let metaReviewRunningState: LoadedStateSnapshot;
  try {
    metaReviewRunningState = await stageMetaReviewRunningState({
      readyForApproval: context.readyForApproval,
      nowIso: context.nowIso,
      statePath: context.resolved.bubblePaths.statePath,
      writeState: context.writeState
    });
  } catch (error) {
    return restoreRunningAfterStagedReadyFailure({
      rootError: error,
      stageReasonCode: "META_REVIEW_GATE_META_REVIEW_STAGE_TRANSITION_FAILED",
      writeState: context.writeState,
      statePath: context.resolved.bubblePaths.statePath,
      loadedRunning: context.loadedRunning,
      readyForApproval: context.readyForApproval
    });
  }

  const paneBinding = await resolveMetaReviewerPaneWarning({
    setMetaReviewerPane: context.setMetaReviewerPane,
    notifySubmissionRequest: context.notifySubmissionRequest,
    runTmuxRunner: context.runTmuxRunner,
    sessionsPath: context.resolved.bubblePaths.sessionsPath,
    bubbleId: context.resolved.bubbleId,
    round: metaReviewRunningState.state.round,
    now: context.now
  });
  const metaReviewerPaneWarning = paneBinding.warning;
  const shouldDeactivateMetaReviewerPane = paneBinding.shouldDeactivate;

  if (metaReviewerPaneWarning !== null) {
    if (shouldDeactivateMetaReviewerPane) {
      await context.deactivateMetaReviewerPane();
    }
    return persistMetaReviewRunFailedRoute({
      appendEnvelope: context.appendEnvelope,
      writeState: context.writeState,
      statePath: context.resolved.bubblePaths.statePath,
      transcriptPath: context.resolved.bubblePaths.transcriptPath,
      inboxPath: context.resolved.bubblePaths.inboxPath,
      lockPath: context.lockPath,
      now: context.now,
      nowIso: context.nowIso,
      bubbleId: context.resolved.bubbleId,
      convergenceSummary: input.summary,
      fallbackReason:
        `META_REVIEW_GATE_RUN_FAILED: structured submit request unavailable (${metaReviewerPaneWarning}).`,
      refs: context.refs,
      loaded: metaReviewRunningState
    });
  }

  return routeMetaReviewKickoffOrRunFailed({
    context,
    convergenceSummary: input.summary,
    metaReviewRunningState,
    shouldDeactivateMetaReviewerPane
  });
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
