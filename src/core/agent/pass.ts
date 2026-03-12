import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes,
  type AppendProtocolEnvelopeResult
} from "../protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import { isRecord } from "../validation.js";
import {
  resolveBubbleFromWorkspaceCwd,
  WorkspaceResolutionError
} from "../bubble/workspaceResolution.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import {
  deliveryTargetRoleMetadataKey,
  isPassIntent,
  type PassIntent,
  type ProtocolEnvelope
} from "../../types/protocol.js";
import type { Finding } from "../../types/findings.js";
import type {
  AgentName,
  AgentRole,
  BubbleConfig,
  BubbleFailingGate,
  BubbleStateSnapshot,
  RoundRoleHistoryEntry
} from "../../types/bubble.js";
import { refreshReviewerContext } from "../runtime/reviewerContext.js";
import {
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirectiveFromArtifact,
  type ReviewerTestExecutionDirective,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} from "../reviewer/testEvidence.js";
import {
  createReviewVerificationArtifact,
  type ReviewVerificationInputResolution,
  resolveReviewVerificationInputFromRefs,
  ReviewVerificationError,
  writeReviewVerificationArtifactAtomic
} from "../reviewer/reviewVerification.js";
import {
  formatReviewerBriefPrompt,
  formatReviewerFocusBridgeBlock,
  readReviewerBriefArtifact,
  readReviewerFocusArtifact
} from "../reviewer/reviewerBrief.js";
import {
  createDocContractGateArtifact,
  type DocContractGateArtifact,
  evaluateReviewerGateWarnings,
  isDocContractGateScopeActive,
  mergeArtifactWithReviewerEvaluation,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../gates/docContractGates.js";
import {
  evaluateReviewerFindingsAggregate,
  validateConvergencePolicy
} from "../convergence/policy.js";
import {
  evaluateRepeatCleanAutoconvergeTrigger,
  repeatCleanAutoconvergePolicyRejectedReasonCode,
  repeatCleanAutoconvergeTriggeredReasonCode,
  type RepeatCleanAutoconvergeReasonCode,
  type RepeatCleanAutoconvergeReasonDetail
} from "../convergence/repeatCleanAutoconverge.js";
import {
  isFindingLayer,
  isFindingTiming,
  resolveFindingPriority
} from "../../types/findings.js";
import {
  emitConvergedFromWorkspace,
  type EmitConvergedDependencies,
  type EmitConvergedResult
} from "./converged.js";

export interface EmitPassInput {
  summary: string;
  refs?: string[];
  intent?: PassIntent;
  findings?: Finding[];
  noFindings?: boolean;
  cwd?: string;
  now?: Date;
}

export interface EmitPassResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  resultEnvelopeKind: "pass" | "convergence";
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  transitionDecision: "normal_pass" | "auto_converge";
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  autoConverged?: {
    gateRoute: EmitConvergedResult["gateRoute"];
    convergenceSequence: number;
    convergenceEnvelope: ProtocolEnvelope;
    approvalRequestSequence: number;
    approvalRequestEnvelope: ProtocolEnvelope;
  };
  delivery?: {
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
  docGateArtifactWriteFailureReason?: string;
}

export interface EmitPassDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
  refreshReviewerContext?: typeof refreshReviewerContext;
}

interface ResolvedHandoff {
  senderAgent: AgentName;
  senderRole: "implementer" | "reviewer";
  recipientAgent: AgentName;
  recipientRole: "implementer" | "reviewer";
  envelopeRound: number;
  nextRound: number;
  appendRoundRoleEntry?: RoundRoleHistoryEntry;
}

export class PassCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PassCommandError";
  }
}

type RepeatCleanPolicyRejectedSubtype =
  | "policy_gate_rejected"
  | "review_verification_write_failed"
  | "downstream_converged_rejected";

const repeatCleanMostRecentPreviousReviewerPassIsCleanMetadataKey =
  "most_recent_previous_reviewer_pass_is_clean";
const repeatCleanMostRecentPreviousReviewerCleanPassEnvelopeLegacyMetadataKey =
  "most_recent_previous_reviewer_clean_pass_envelope";
const docsOnlySkipLogRefConflictReasonCode = "DOCS_ONLY_SKIP_LOG_REF_CONFLICT";
const docsOnlyRuntimeChecksSkippedMarkers = [
  "runtime checks intentionally not executed",
  "runtime checks were intentionally not executed"
];
const docsOnlyRuntimeLogRefPattern = /^\.pairflow\/evidence\/[^\s]+\.log$/u;
const docsOnlyRuntimeLogRefPatternText =
  docsOnlyRuntimeLogRefPattern.source.replaceAll("\\/", "/");
const reviewerPassNonBlockingPostGateReasonCode =
  "REVIEWER_PASS_NON_BLOCKING_POST_GATE";
const reviewerPassNoFindingsPostGateReasonCode =
  "REVIEWER_PASS_NO_FINDINGS_POST_GATE";
const findingsPayloadInvalidReasonCode = "FINDINGS_PAYLOAD_INVALID";

interface NormalizedReviewerFindingsPayload {
  findings: Finding[];
  invalid: boolean;
}

function formatRepeatCleanPolicyRejectedMessage(input: {
  subtype: RepeatCleanPolicyRejectedSubtype;
  detail: string;
}): string {
  return `${repeatCleanAutoconvergePolicyRejectedReasonCode}: subtype=${input.subtype}; ${input.detail}`;
}

function readBooleanMetadataValue(
  metadata: Record<string, unknown>,
  key: string
): boolean | undefined {
  const value = metadata[key];
  return typeof value === "boolean" ? value : undefined;
}

function normalizePassSummaryForMarkerScan(summary: string): string {
  return summary.toLowerCase().replace(/\s+/gu, " ").trim();
}

function hasRuntimeChecksSkippedClaim(summary: string): boolean {
  const normalized = normalizePassSummaryForMarkerScan(summary);
  return docsOnlyRuntimeChecksSkippedMarkers.some((marker) =>
    normalized.includes(marker)
  );
}

function collectRuntimeLogRefs(refs: string[]): string[] {
  return refs.filter((ref) => docsOnlyRuntimeLogRefPattern.test(ref));
}

function assertNoDocsOnlySkipLogRefConflict(input: {
  reviewArtifactType: BubbleConfig["review_artifact_type"];
  senderRole: AgentRole;
  summary: string;
  refs: string[];
}): void {
  if (input.senderRole !== "implementer" || input.reviewArtifactType !== "document") {
    return;
  }
  if (!hasRuntimeChecksSkippedClaim(input.summary)) {
    return;
  }
  const conflictingRefs = collectRuntimeLogRefs(input.refs);
  if (conflictingRefs.length === 0) {
    return;
  }
  const sampledRefs = conflictingRefs.slice(0, 3).join(",");
  const sampleSuffix = `; example_refs=${sampledRefs}`;
  throw new PassCommandError(
    `${docsOnlySkipLogRefConflictReasonCode}: reason_code=${docsOnlySkipLogRefConflictReasonCode}; conflicting_ref_count=${conflictingRefs.length}; ref_class=runtime_log_ref; ref_pattern=${docsOnlyRuntimeLogRefPatternText}${sampleSuffix}. Remove runtime log refs or update the summary claim.`
  );
}

// Canonical reader for repeat-clean most-recent previous reviewer PASS cleanliness.
// Deprecated key is retained for backward compatibility with existing append-only transcripts.
export function resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(
  metadata: Record<string, unknown> | undefined
): boolean | undefined {
  if (metadata === undefined) {
    return undefined;
  }
  const canonical = readBooleanMetadataValue(
    metadata,
    repeatCleanMostRecentPreviousReviewerPassIsCleanMetadataKey
  );
  if (canonical !== undefined) {
    return canonical;
  }
  return readBooleanMetadataValue(
    metadata,
    repeatCleanMostRecentPreviousReviewerCleanPassEnvelopeLegacyMetadataKey
  );
}

function buildRepeatCleanPassPayloadMetadata(input: {
  transitionDecision: "normal_pass" | "auto_converge";
  reasonCode: RepeatCleanAutoconvergeReasonCode;
  reasonDetail: RepeatCleanAutoconvergeReasonDetail;
  trigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
}): Record<string, unknown> {
  return {
    transition_decision: input.transitionDecision,
    reason_code: input.reasonCode,
    reason_detail: input.reasonDetail,
    trigger: input.trigger,
    [repeatCleanMostRecentPreviousReviewerPassIsCleanMetadataKey]:
      input.mostRecentPreviousReviewerCleanPassEnvelope,
    // Deprecated alias, retained for append-only transcript backward compatibility.
    [repeatCleanMostRecentPreviousReviewerCleanPassEnvelopeLegacyMetadataKey]:
      input.mostRecentPreviousReviewerCleanPassEnvelope
  };
}

function buildRepeatCleanLifecycleMetadata(input: {
  transitionDecision: "normal_pass" | "auto_converge";
  reasonCode: RepeatCleanAutoconvergeReasonCode;
  reasonDetail: RepeatCleanAutoconvergeReasonDetail;
  trigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
}): Record<string, unknown> {
  return {
    transition_decision: input.transitionDecision,
    repeat_clean_trigger: input.trigger,
    repeat_clean_reason_code: input.reasonCode,
    repeat_clean_reason_detail: input.reasonDetail,
    [repeatCleanMostRecentPreviousReviewerPassIsCleanMetadataKey]:
      input.mostRecentPreviousReviewerCleanPassEnvelope,
    // Deprecated alias, retained for metrics reader backward compatibility.
    [repeatCleanMostRecentPreviousReviewerCleanPassEnvelopeLegacyMetadataKey]:
      input.mostRecentPreviousReviewerCleanPassEnvelope
  };
}

export function inferPassIntent(activeRole: AgentRole): PassIntent {
  if (activeRole === "implementer") {
    return "review";
  }
  if (activeRole === "reviewer") {
    return "fix_request";
  }

  throw new PassCommandError(
    `Unsupported active role for pass intent inference: ${activeRole}.`
  );
}

function inferReviewerPassIntent(
  hasFindings: boolean,
  noFindings: boolean
): PassIntent {
  if (hasFindings && noFindings) {
    throw new PassCommandError(
      "Reviewer PASS cannot use both --finding and --no-findings."
    );
  }

  if (!hasFindings && !noFindings) {
    throw new PassCommandError(
      `${findingsPayloadInvalidReasonCode}: Reviewer PASS requires explicit findings declaration: use --finding <P0|P1|P2|P3:Title[|ref1,ref2]> (repeatable) or --no-findings.`
    );
  }

  return noFindings ? "review" : "fix_request";
}

function resolveHandoff(
  state: BubbleStateSnapshot,
  implementer: AgentName,
  reviewer: AgentName,
  nowIso: string
): ResolvedHandoff {
  if (state.state !== "RUNNING") {
    throw new PassCommandError(
      `PASS can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }

  if (state.active_agent === null || state.active_role === null) {
    throw new PassCommandError(
      "RUNNING state is missing active agent/role; cannot resolve PASS sender."
    );
  }

  if (state.active_role === "implementer" && state.active_agent !== implementer) {
    throw new PassCommandError(
      `Active role implementer must map to configured implementer agent (${implementer}).`
    );
  }
  if (state.active_role === "reviewer" && state.active_agent !== reviewer) {
    throw new PassCommandError(
      `Active role reviewer must map to configured reviewer agent (${reviewer}).`
    );
  }

  if (state.round < 1) {
    throw new PassCommandError(
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }

  if (state.active_role === "implementer") {
    return {
      senderAgent: implementer,
      senderRole: "implementer",
      recipientAgent: reviewer,
      recipientRole: "reviewer",
      envelopeRound: state.round,
      nextRound: state.round
    };
  }

  if (state.active_role !== "reviewer") {
    throw new PassCommandError(
      `Unsupported active role for PASS handoff resolution: ${state.active_role}.`
    );
  }

  const nextRound = state.round + 1;
  const hasRoundEntry = state.round_role_history.some((entry) => entry.round === nextRound);

  const base: ResolvedHandoff = {
    senderAgent: reviewer,
    senderRole: "reviewer",
    recipientAgent: implementer,
    recipientRole: "implementer",
    envelopeRound: state.round,
    nextRound
  };

  if (hasRoundEntry) {
    return base;
  }

  return {
    ...base,
    appendRoundRoleEntry: {
      round: nextRound,
      implementer,
      reviewer,
      switched_at: nowIso
    }
  };
}

function mapAppendResult(result: AppendProtocolEnvelopeResult): Pick<EmitPassResult, "sequence" | "envelope"> {
  return {
    sequence: result.sequence,
    envelope: result.envelope
  };
}

function buildFindingCounts(findings: Finding[]): {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
} {
  const counts = {
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0
  };

  for (const finding of findings) {
    const priority = resolveFindingPriority({
      priority: finding.effective_priority ?? finding.priority,
      ...(finding.effective_priority === undefined
        ? { severity: finding.severity }
        : {})
    });
    switch (priority) {
      case "P0":
        counts.p0 += 1;
        break;
      case "P1":
        counts.p1 += 1;
        break;
      case "P2":
        counts.p2 += 1;
        break;
      case "P3":
        counts.p3 += 1;
        break;
      default:
        break;
    }
  }

  return counts;
}

function normalizeReviewerFindingsPayload(
  findings: unknown
): NormalizedReviewerFindingsPayload {
  if (!Array.isArray(findings)) {
    return {
      findings: [],
      invalid: findings !== undefined
    };
  }

  const normalized: Finding[] = [];
  let invalid = false;
  for (const finding of findings) {
    if (!isRecord(finding)) {
      invalid = true;
      continue;
    }

    if (typeof finding.title !== "string" || finding.title.trim().length === 0) {
      invalid = true;
      continue;
    }

    const priority = resolveFindingPriority({
      priority: finding.priority,
      severity: finding.severity
    });
    if (priority === undefined) {
      invalid = true;
      continue;
    }

    if (finding.refs !== undefined && !Array.isArray(finding.refs)) {
      invalid = true;
      continue;
    }

    const normalizedFindingRefs = normalizeStringList(finding.refs ?? []);
    if (
      Array.isArray(finding.refs)
      && finding.refs.length > 0
      && normalizedFindingRefs.length === 0
    ) {
      invalid = true;
      continue;
    }

    const normalizedPriority = resolveFindingPriority({
      priority: finding.priority,
      severity: undefined
    });
    const normalizedSeverity = resolveFindingPriority({
      priority: undefined,
      severity: finding.severity
    });
    const normalizedFinding: Finding = {
      title: finding.title.trim()
    };
    if (normalizedPriority !== undefined) {
      normalizedFinding.priority = normalizedPriority;
    }
    if (normalizedSeverity !== undefined) {
      normalizedFinding.severity = normalizedSeverity;
    }
    if (normalizedPriority === undefined && normalizedSeverity !== undefined) {
      normalizedFinding.priority = normalizedSeverity;
    }
    if (typeof finding.detail === "string" && finding.detail.trim().length > 0) {
      normalizedFinding.detail = finding.detail;
    }
    if (typeof finding.code === "string" && finding.code.trim().length > 0) {
      normalizedFinding.code = finding.code;
    }
    if (isFindingTiming(finding.timing)) {
      normalizedFinding.timing = finding.timing;
    }
    if (isFindingLayer(finding.layer)) {
      normalizedFinding.layer = finding.layer;
    }
    const effectivePriority =
      resolveFindingPriority({
        priority: finding.effective_priority,
        severity: undefined
      });
    if (effectivePriority !== undefined) {
      normalizedFinding.effective_priority = effectivePriority;
    }
    if (typeof finding.evidence === "string") {
      normalizedFinding.evidence = finding.evidence;
    } else if (Array.isArray(finding.evidence)) {
      normalizedFinding.evidence = normalizeStringList(finding.evidence);
    }

    if (normalizedFindingRefs.length > 0) {
      normalizedFinding.refs = normalizedFindingRefs;
    } else {
      delete normalizedFinding.refs;
    }

    normalized.push(normalizedFinding);
  }

  return {
    findings: normalized,
    invalid
  };
}

function buildPostGateConvergedGuidance(input: {
  round: number;
  severityGateRound: number;
}): string {
  return `Use \`pairflow converged --summary "..."\` instead (round ${input.round} >= severity_gate_round ${input.severityGateRound}).`;
}

function validateReviewerPassGate(input: {
  round: number;
  noFindings: boolean;
  findings: Finding[];
  findingsPayloadInvalid: boolean;
  reviewArtifactType: BubbleConfig["review_artifact_type"];
  severityGateRound: number;
}): void {
  const postGate = input.round >= input.severityGateRound;
  const invalidPayloadGuidance = postGate
    ? `Provide structured findings with severity/title (and optional refs), or use \`pairflow converged --summary "..."\` for clean/non-blocking outcomes. ${buildPostGateConvergedGuidance({
      round: input.round,
      severityGateRound: input.severityGateRound
    })}`
    : "Provide structured findings with severity/title (and optional refs) or use --no-findings explicitly for a clean review.";
  if (postGate && input.noFindings) {
    throw new PassCommandError(
      `${reviewerPassNoFindingsPostGateReasonCode}: Reviewer PASS with --no-findings is not allowed after severity gate. ${buildPostGateConvergedGuidance({
        round: input.round,
        severityGateRound: input.severityGateRound
      })}`
    );
  }

  if (input.findingsPayloadInvalid) {
    throw new PassCommandError(
      `${findingsPayloadInvalidReasonCode}: Reviewer PASS findings payload is invalid. ${invalidPayloadGuidance}`
    );
  }

  if (input.findings.length === 0 && !input.noFindings) {
    if (postGate) {
      throw new PassCommandError(
        `${findingsPayloadInvalidReasonCode}: Reviewer PASS requires explicit structured findings in post-gate rounds. ${buildPostGateConvergedGuidance({
          round: input.round,
          severityGateRound: input.severityGateRound
        })}`
      );
    }
    throw new PassCommandError(
      `${findingsPayloadInvalidReasonCode}: Reviewer PASS requires explicit findings declaration: use --finding <P0|P1|P2|P3:Title[|ref1,ref2]> (repeatable) or --no-findings.`
    );
  }

  if (!postGate) {
    return;
  }

  const aggregate = evaluateReviewerFindingsAggregate({
    findings: input.findings,
    reviewArtifactType: input.reviewArtifactType
  });
  if (aggregate.invalid) {
    throw new PassCommandError(
      `${findingsPayloadInvalidReasonCode}: Reviewer PASS findings payload is invalid. ${invalidPayloadGuidance}`
    );
  }
  if (aggregate.hasBlocking) {
    return;
  }

  const p3Only = aggregate.p3 > 0 && aggregate.p0 === 0 && aggregate.p1 === 0 && aggregate.p2 === 0;
  const hasDeclaredCanonicalBlocker = input.findings.some((finding) => {
    const priority = resolveFindingPriority({
      priority: finding.priority,
      severity: finding.severity
    });
    return priority === "P0" || priority === "P1";
  });
  const docScopeQualifierNote =
    input.reviewArtifactType === "document" && hasDeclaredCanonicalBlocker
      ? " Document scope qualifier: blocker findings require strict `timing=required-now` + `layer=L1`; CLI `--finding` cannot encode these qualifiers, so unqualified `P0/P1` entries are treated as non-blocking."
      : "";
  throw new PassCommandError(
    `${reviewerPassNonBlockingPostGateReasonCode}: Reviewer PASS is not allowed after severity gate when no blocker findings remain${p3Only ? " (P3-only finding set)." : "."}${docScopeQualifierNote} ${buildPostGateConvergedGuidance({
      round: input.round,
      severityGateRound: input.severityGateRound
    })}`
  );
}

function validateReviewerVerificationConsistency(input: {
  payloadOverall: "pass" | "fail";
  intent: PassIntent;
  hasFindings: boolean;
}): void {
  if (
    input.payloadOverall === "fail"
    && (input.intent !== "fix_request" || !input.hasFindings)
  ) {
    throw new PassCommandError(
      "Accuracy-critical reviewer PASS with overall=fail requires intent=fix_request and open findings."
    );
  }
  if (
    input.payloadOverall === "pass"
    && (input.intent !== "review" || input.hasFindings)
  ) {
    throw new PassCommandError(
      "Accuracy-critical reviewer PASS with overall=pass requires clean handoff (intent=review and no findings)."
    );
  }
}

function createDocGateReadFailureWarning(input: {
  artifactPath: string;
  reason: string;
}): BubbleFailingGate {
  return {
    gate_id: "review.serialization",
    reason_code: "STATUS_GATE_SERIALIZATION_WARNING",
    message:
      `Doc gate artifact could not be read during reviewer PASS; preserving advisory fail-open with reset gate baseline. reason=${input.reason}`,
    priority: "P2",
    timing: "later-hardening",
    layer: "L1",
    signal_level: "warning",
    evidence_refs: [input.artifactPath]
  };
}

function extractTaskContentFromTaskArtifact(taskArtifactContent: string): string {
  const match = /^# Bubble Task\r?\n\r?\nSource: [^\n]*\r?\n\r?\n([\s\S]*)$/u
    .exec(taskArtifactContent);
  if (match?.[1] !== undefined) {
    return match[1].trimEnd();
  }
  return taskArtifactContent;
}

async function resolveReviewerVerification(input: {
  accuracyCritical: boolean;
  senderRole: AgentRole;
  refs: string[];
  worktreePath: string;
}): Promise<ReviewVerificationInputResolution | undefined> {
  if (!input.accuracyCritical || input.senderRole !== "reviewer") {
    return undefined;
  }

  try {
    return await resolveReviewVerificationInputFromRefs({
      refs: input.refs,
      worktreePath: input.worktreePath
    });
  } catch (error) {
    if (error instanceof ReviewVerificationError) {
      throw new PassCommandError(error.message);
    }
    throw error;
  }
}

async function updateReviewerDocGateArtifact(input: {
  now: Date;
  bubbleConfig: BubbleConfig;
  artifactsDir: string;
  taskArtifactPath: string;
  round: number;
  findings: Finding[];
  reviewerEvaluation?: ReturnType<typeof evaluateReviewerGateWarnings>;
}): Promise<string | undefined> {
  if (
    !isDocContractGateScopeActive({
      reviewArtifactType: input.bubbleConfig.review_artifact_type
    })
  ) {
    return undefined;
  }

  const gateArtifactPath = resolveDocContractGateArtifactPath(
    input.artifactsDir
  );
  let baseArtifact: DocContractGateArtifact | undefined;
  let gateReadWarning: BubbleFailingGate | undefined;
  try {
    baseArtifact = await readDocContractGateArtifact(gateArtifactPath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    gateReadWarning = createDocGateReadFailureWarning({
      artifactPath: gateArtifactPath,
      reason
    });
  }
  let fallbackArtifact: DocContractGateArtifact | undefined;
  if (baseArtifact === undefined) {
    fallbackArtifact = createDocContractGateArtifact({
      now: input.now,
      bubbleConfig: input.bubbleConfig,
      taskContent: ""
    });
    const taskArtifactContent = await readFile(
      input.taskArtifactPath,
      "utf8"
    ).catch(() => undefined);
    if (taskArtifactContent !== undefined) {
      fallbackArtifact.task_warnings = createDocContractGateArtifact({
        now: input.now,
        bubbleConfig: input.bubbleConfig,
        taskContent: extractTaskContentFromTaskArtifact(taskArtifactContent)
      }).task_warnings;
    }
    if (gateReadWarning !== undefined) {
      fallbackArtifact.config_warnings = [
        ...fallbackArtifact.config_warnings,
        gateReadWarning
      ];
    }
  }
  const reviewEvaluation =
    input.reviewerEvaluation
    ?? evaluateReviewerGateWarnings({
      round: input.round,
      findings: input.findings,
      roundGateAppliesAfter:
        input.bubbleConfig.doc_contract_gates.round_gate_applies_after
    });
  const artifactForMerge = baseArtifact ?? fallbackArtifact;
  if (artifactForMerge === undefined) {
    throw new PassCommandError(
      "Doc gate artifact fallback invariant violated during reviewer PASS."
    );
  }
  const nextArtifact = mergeArtifactWithReviewerEvaluation({
    now: input.now,
    artifact: artifactForMerge,
    reviewerEvaluation: reviewEvaluation
  });
  try {
    await writeDocContractGateArtifact(gateArtifactPath, nextArtifact);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  return undefined;
}

export async function emitPassFromWorkspace(
  input: EmitPassInput,
  dependencies: EmitPassDependencies = {}
): Promise<EmitPassResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const summary = requireNonEmptyString(
    input.summary,
    "PASS summary",
    (message) => new PassCommandError(message)
  );
  const refs = normalizeStringList(input.refs ?? []);
  const normalizedFindings = normalizeReviewerFindingsPayload(input.findings);
  const findings = normalizedFindings.findings;
  const hasFindings = findings.length > 0;
  const noFindings = input.noFindings ?? false;

  const resolved = await resolveBubbleFromWorkspaceCwd(input.cwd);
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  const { implementer, reviewer } = resolved.bubbleConfig.agents;
  const handoff = resolveHandoff(state, implementer, reviewer, nowIso);
  if (handoff.senderRole === "reviewer") {
    validateReviewerPassGate({
      round: handoff.envelopeRound,
      noFindings,
      findings,
      findingsPayloadInvalid: normalizedFindings.invalid,
      reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
      severityGateRound: resolved.bubbleConfig.severity_gate_round
    });
  }
  const inferredReviewerIntent =
    handoff.senderRole === "reviewer"
      ? inferReviewerPassIntent(hasFindings, noFindings)
      : undefined;

  if (handoff.senderRole !== "reviewer" && (hasFindings || noFindings)) {
    throw new PassCommandError(
      "Implementer PASS does not accept findings flags; findings are reviewer-only."
    );
  }

  const inferredIntent = input.intent === undefined;
  const intent = input.intent
    ?? (handoff.senderRole === "reviewer"
      ? inferredReviewerIntent
      : inferPassIntent(handoff.senderRole));
  if (!isPassIntent(intent)) {
    throw new PassCommandError(`Invalid pass intent: ${String(intent)}`);
  }
  if (handoff.senderRole === "reviewer") {
    // `intent=task` remains implementer-only by design; reviewer handoff
    // semantics are constrained to `review`/`fix_request` with findings flags.
    if (intent === "task") {
      throw new PassCommandError(
        "Reviewer PASS cannot use intent=task."
      );
    }
    if (noFindings && intent === "fix_request") {
      throw new PassCommandError(
        "Reviewer PASS with --no-findings cannot use intent=fix_request."
      );
    }
    if (hasFindings && intent === "review") {
      throw new PassCommandError(
        "Reviewer PASS with findings cannot use intent=review."
      );
    }
  }

  assertNoDocsOnlySkipLogRefConflict({
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
    senderRole: handoff.senderRole,
    summary,
    refs
  });

  const accuracyCritical = resolved.bubbleConfig.accuracy_critical === true;
  const reviewerVerification = await resolveReviewerVerification({
    accuracyCritical,
    senderRole: handoff.senderRole,
    refs,
    worktreePath: resolved.bubblePaths.worktreePath
  });
  if (reviewerVerification !== undefined) {
    validateReviewerVerificationConsistency({
      payloadOverall: reviewerVerification.payload.overall,
      intent,
      hasFindings
    });
  }

  const transcript = await readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
    allowMissing: true,
    toleratePartialFinalLine: true
  });
  const repeatCleanTrigger = evaluateRepeatCleanAutoconvergeTrigger({
    activeRole: handoff.senderRole,
    passIntent: intent,
    hasFindings,
    round: handoff.envelopeRound,
    reviewer,
    implementer,
    transcript
  });
  if (repeatCleanTrigger.trigger) {
    const policyResult = validateConvergencePolicy({
      currentRound: handoff.envelopeRound,
      reviewer,
      implementer,
      reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
      roundRoleHistory: state.round_role_history,
      transcript,
      severity_gate_round: resolved.bubbleConfig.severity_gate_round
    });
    if (!policyResult.ok) {
      throw new PassCommandError(
        formatRepeatCleanPolicyRejectedMessage({
          subtype: "policy_gate_rejected",
          detail: policyResult.errors.join(" ")
        })
      );
    }

    const stateBeforeAutoConvergeSideEffects = await readStateSnapshot(
      resolved.bubblePaths.statePath
    );
    if (stateBeforeAutoConvergeSideEffects.fingerprint !== loadedState.fingerprint) {
      throw new PassCommandError(
        formatRepeatCleanPolicyRejectedMessage({
          subtype: "policy_gate_rejected",
          detail:
            "AUTO_CONVERGE_STATE_STALE: state changed between repeat-clean evaluation and convergence transition."
        })
      );
    }

    if (reviewerVerification !== undefined) {
      const verificationArtifact = createReviewVerificationArtifact({
        payload: reviewerVerification.payload,
        inputRef: reviewerVerification.inputRef,
        bubbleId: resolved.bubbleId,
        round: handoff.envelopeRound,
        reviewer: handoff.senderAgent,
        generatedAt: nowIso
      });
      try {
        await writeReviewVerificationArtifactAtomic(
          resolved.bubblePaths.reviewVerificationArtifactPath,
          verificationArtifact
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new PassCommandError(
          formatRepeatCleanPolicyRejectedMessage({
            subtype: "review_verification_write_failed",
            detail:
              `review-verification artifact write failed before convergence transition. Root error: ${reason}`
          })
        );
      }
    }

    let converged;
    try {
      converged = await emitConvergedFromWorkspace(
        {
          summary,
          refs,
          cwd: resolved.bubblePaths.worktreePath,
          now,
          expectedStateFingerprint: stateBeforeAutoConvergeSideEffects.fingerprint,
          expectedRound: handoff.envelopeRound,
          expectedReviewer: reviewer
        },
        {
          ...(dependencies.emitTmuxDeliveryNotification !== undefined
            ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
            : {}),
          ...(dependencies.emitBubbleNotification !== undefined
            ? { emitBubbleNotification: dependencies.emitBubbleNotification }
            : {})
        }
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new PassCommandError(
        formatRepeatCleanPolicyRejectedMessage({
          subtype: "downstream_converged_rejected",
          detail: reason
        })
      );
    }

    const autoConvergeFindings = findings;
    let autoConvergeDocGateArtifactWriteFailureReason: string | undefined;
    if (handoff.senderRole === "reviewer") {
      autoConvergeDocGateArtifactWriteFailureReason = await updateReviewerDocGateArtifact({
        now,
        bubbleConfig: resolved.bubbleConfig,
        artifactsDir: resolved.bubblePaths.artifactsDir,
        taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
        round: handoff.envelopeRound,
        findings: autoConvergeFindings
      });
    }

    await emitBubbleLifecycleEventBestEffort({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_passed",
      round: handoff.envelopeRound,
      actorRole: handoff.senderRole,
      metadata: {
        pass_intent: intent,
        inferred_intent: inferredIntent,
        sender: handoff.senderAgent,
        recipient: "human",
        recipient_role: "human",
        refs_count: refs.length,
        has_findings: hasFindings,
        no_findings: noFindings,
        ...buildRepeatCleanLifecycleMetadata({
          transitionDecision: "auto_converge",
          reasonCode: repeatCleanTrigger.reasonCode,
          reasonDetail: repeatCleanTrigger.reasonDetail,
          trigger: repeatCleanTrigger.trigger,
          mostRecentPreviousReviewerCleanPassEnvelope:
            repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope
        }),
        ...buildFindingCounts(autoConvergeFindings),
        ...(autoConvergeDocGateArtifactWriteFailureReason !== undefined
          ? {
              doc_gate_artifact_write_failed: true,
              doc_gate_artifact_write_failure_reason:
                autoConvergeDocGateArtifactWriteFailureReason
            }
          : {})
      },
      now
    });

    return {
      bubbleId: resolved.bubbleId,
      sequence: converged.convergenceSequence,
      envelope: converged.convergenceEnvelope,
      resultEnvelopeKind: "convergence",
      state: converged.state,
      inferredIntent,
      transitionDecision: "auto_converge",
      repeatCleanReasonCode: repeatCleanAutoconvergeTriggeredReasonCode,
      repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
      repeatCleanTrigger: true,
      mostRecentPreviousReviewerCleanPassEnvelope: true,
      autoConverged: {
        gateRoute: converged.gateRoute,
        convergenceSequence: converged.convergenceSequence,
        convergenceEnvelope: converged.convergenceEnvelope,
        approvalRequestSequence: converged.approvalRequestSequence,
        approvalRequestEnvelope: converged.approvalRequestEnvelope
      },
      ...(converged.delivery !== undefined
        ? {
            delivery: converged.delivery
          }
        : {}),
      ...(autoConvergeDocGateArtifactWriteFailureReason !== undefined
        ? {
            docGateArtifactWriteFailureReason:
              autoConvergeDocGateArtifactWriteFailureReason
          }
        : {})
    };
  }

  let reviewerGateEvaluation:
    | ReturnType<typeof evaluateReviewerGateWarnings>
    | undefined;
  let docGateArtifactWriteFailureReason: string | undefined;
  const docGateScopeActive =
    handoff.senderRole === "reviewer"
    && isDocContractGateScopeActive({
      reviewArtifactType: resolved.bubbleConfig.review_artifact_type
    });
  const findingsForPayload: Finding[] =
    docGateScopeActive && hasFindings
      ? (() => {
        reviewerGateEvaluation = evaluateReviewerGateWarnings({
          round: handoff.envelopeRound,
          findings,
          roundGateAppliesAfter:
            resolved.bubbleConfig.doc_contract_gates.round_gate_applies_after
        });
        return reviewerGateEvaluation.normalizedFindings;
      })()
      : findings;

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);

  const appendResult = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    lockPath,
    now,
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: handoff.senderAgent,
      recipient: handoff.recipientAgent,
      type: "PASS",
      round: handoff.envelopeRound,
      payload: {
        summary,
        pass_intent: intent,
        metadata: {
          ...buildRepeatCleanPassPayloadMetadata({
            transitionDecision: "normal_pass",
            reasonCode: repeatCleanTrigger.reasonCode,
            reasonDetail: repeatCleanTrigger.reasonDetail,
            trigger: repeatCleanTrigger.trigger,
            mostRecentPreviousReviewerCleanPassEnvelope:
              repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope
          }),
          [deliveryTargetRoleMetadataKey]: handoff.recipientRole
        },
        ...(handoff.senderRole === "reviewer"
          ? { findings: hasFindings ? findingsForPayload : [] }
          : {})
      },
      refs
    }
  });

  const mapped = mapAppendResult(appendResult);

  if (reviewerVerification !== undefined) {
    const verificationArtifact = createReviewVerificationArtifact({
      payload: reviewerVerification.payload,
      inputRef: reviewerVerification.inputRef,
      bubbleId: resolved.bubbleId,
      round: handoff.nextRound,
      reviewer: handoff.senderAgent,
      generatedAt: nowIso
    });
    try {
      await writeReviewVerificationArtifactAtomic(
        resolved.bubblePaths.reviewVerificationArtifactPath,
        verificationArtifact
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new PassCommandError(
        `PASS ${mapped.envelope.id} was appended but review-verification artifact write failed before state transition. State remains unchanged and transcript is canonical; recover via state reconciliation from transcript tail after fixing artifact path/input. Root error: ${reason}`
      );
    }
  }

  const nextState: BubbleStateSnapshot = {
    ...state,
    round: handoff.nextRound,
    active_agent: handoff.recipientAgent,
    active_role: handoff.recipientRole,
    active_since: nowIso,
    last_command_at: nowIso,
    round_role_history:
      handoff.appendRoundRoleEntry === undefined
        ? state.round_role_history
        : [...state.round_role_history, handoff.appendRoundRoleEntry]
  };

  let written;
  try {
    // Transcript is canonical source of truth. If state write fails after append,
    // recovery must reconcile from latest transcript entry.
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new PassCommandError(
      `PASS ${appendResult.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  if (docGateScopeActive) {
    docGateArtifactWriteFailureReason = await updateReviewerDocGateArtifact({
      now,
      bubbleConfig: resolved.bubbleConfig,
      artifactsDir: resolved.bubblePaths.artifactsDir,
      taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
      round: handoff.envelopeRound,
      findings: hasFindings ? findings : [],
      ...(reviewerGateEvaluation !== undefined
        ? { reviewerEvaluation: reviewerGateEvaluation }
        : {})
    });
  }

  let reviewerTestDirective: ReviewerTestExecutionDirective | undefined;
  if (handoff.senderRole === "implementer") {
    let implementerDirective: ReviewerTestExecutionDirective | undefined
    const evidenceArtifactPath = resolveReviewerTestEvidenceArtifactPath(
      resolved.bubblePaths.artifactsDir
    );

    const evidenceArtifact = await verifyImplementerTestEvidence({
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      envelope: mapped.envelope,
      worktreePath: resolved.bubblePaths.worktreePath,
      repoPath: resolved.repoPath,
      now
    }).catch(() => undefined);

    if (evidenceArtifact !== undefined) {
      const artifactWriteSucceeded = await writeReviewerTestEvidenceArtifact(
        evidenceArtifactPath,
        evidenceArtifact
      )
        .then(() => true)
        .catch(() => false);
      if (artifactWriteSucceeded) {
        implementerDirective = await resolveReviewerTestExecutionDirectiveFromArtifact({
          artifact: evidenceArtifact,
          worktreePath: resolved.bubblePaths.worktreePath,
          reviewArtifactType: resolved.bubbleConfig.review_artifact_type
        }).catch(() => undefined);
      }
    }

    reviewerTestDirective =
      implementerDirective ??
      (resolved.bubbleConfig.review_artifact_type === "document"
        ? {
            skip_full_rerun: true,
            reason_code: "no_trigger",
            reason_detail: "docs-only scope, runtime checks not required",
            verification_status: "trusted"
          }
        : {
            skip_full_rerun: false,
            reason_code: "evidence_unverifiable",
            reason_detail:
              "Failed to resolve reviewer test directive due to verification runtime error.",
            verification_status: "untrusted"
          });
  }

  const reviewerBriefText = await readReviewerBriefArtifact(
    resolved.bubblePaths.reviewerBriefArtifactPath
  ).catch(() => undefined);
  const reviewerFocus = await readReviewerFocusArtifact(
    resolved.bubblePaths.reviewerFocusArtifactPath
  ).catch(() => undefined);
  const reviewerStartupContextBlocks: string[] = [];
  if (reviewerBriefText !== undefined) {
    reviewerStartupContextBlocks.push(formatReviewerBriefPrompt(reviewerBriefText));
  }
  if (reviewerFocus?.status === "present") {
    reviewerStartupContextBlocks.push(
      formatReviewerFocusBridgeBlock(reviewerFocus)
    );
  }
  const reviewerStartupPrompt =
    reviewerStartupContextBlocks.length > 0
      ? reviewerStartupContextBlocks.join("\n\n")
      : undefined;

  const refreshReviewer =
    dependencies.refreshReviewerContext ?? refreshReviewerContext;
  let deliveryInitialDelayMs: number | undefined;
  if (
    handoff.senderRole === "implementer" &&
    resolved.bubbleConfig.reviewer_context_mode === "fresh"
  ) {
    // Best effort only; protocol/state progression must not fail if tmux refresh fails.
    const refreshResult = await refreshReviewer({
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      ...(reviewerStartupPrompt !== undefined
        ? { reviewerStartupPrompt }
        : {})
    }).catch(() => undefined);
    if (refreshResult?.refreshed === true) {
      // Give the respawned reviewer CLI a short warm-up before delivery injection.
      deliveryInitialDelayMs = 1500;
    }
  }

  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const deliveryInput = {
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: mapped.envelope,
    messageRef: resolveDeliveryMessageRef({
      bubbleId: resolved.bubbleId,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      envelope: mapped.envelope
    }),
    ...(reviewerTestDirective !== undefined ? { reviewerTestDirective } : {}),
    ...(reviewerBriefText !== undefined ? { reviewerBrief: reviewerBriefText } : {}),
    ...(
      handoff.senderRole === "implementer" &&
      reviewerFocus?.status === "present"
        ? { reviewerFocus }
        : {}
    ),
    ...(deliveryInitialDelayMs !== undefined ? { initialDelayMs: deliveryInitialDelayMs } : {})
  };
  let deliveryResult = await emitDelivery(deliveryInput).catch(() => undefined);
  let deliveryRetried = false;
  const shouldRetryDelivery =
    handoff.senderRole === "implementer"
    && handoff.recipientRole === "reviewer"
    && (
      deliveryResult?.reason === "delivery_unconfirmed"
      || deliveryResult?.reason === "tmux_send_failed"
    );
  if (shouldRetryDelivery) {
    deliveryRetried = true;
    deliveryResult = await emitDelivery({
      ...deliveryInput,
      // Respawned reviewer CLIs can take a few seconds to become input-ready.
      // Retry once with a longer warm-up window before giving up.
      initialDelayMs: 5000,
      deliveryAttempts: 6
    }).catch(() => deliveryResult);
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_passed",
    round: handoff.envelopeRound,
    actorRole: handoff.senderRole,
    metadata: {
      pass_intent: intent,
      inferred_intent: inferredIntent,
      sender: handoff.senderAgent,
      recipient: handoff.recipientAgent,
      recipient_role: handoff.recipientRole,
      refs_count: refs.length,
      has_findings: hasFindings,
      no_findings: noFindings,
      ...buildRepeatCleanLifecycleMetadata({
        transitionDecision: "normal_pass",
        reasonCode: repeatCleanTrigger.reasonCode,
        reasonDetail: repeatCleanTrigger.reasonDetail,
        trigger: repeatCleanTrigger.trigger,
        mostRecentPreviousReviewerCleanPassEnvelope:
          repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope
      }),
      ...(reviewerTestDirective !== undefined
        ? {
            reviewer_test_evidence_decision: reviewerTestDirective.skip_full_rerun
              ? "skip_full_rerun"
              : "run_checks",
            reviewer_test_evidence_reason_code: reviewerTestDirective.reason_code,
            reviewer_test_evidence_verification_status:
              reviewerTestDirective.verification_status
          }
        : {}),
      ...buildFindingCounts(
        handoff.senderRole === "reviewer" ? findingsForPayload : findings
      ),
      ...(docGateArtifactWriteFailureReason !== undefined
        ? {
            doc_gate_artifact_write_failed: true,
            doc_gate_artifact_write_failure_reason:
              docGateArtifactWriteFailureReason
          }
        : {})
      },
    now
  });

  const mostRecentPreviousReviewerCleanPassEnvelope =
    resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(
      mapped.envelope.payload.metadata
    ) ?? repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope;

  return {
    bubbleId: resolved.bubbleId,
    sequence: mapped.sequence,
    envelope: mapped.envelope,
    resultEnvelopeKind: "pass",
    state: written.state,
    inferredIntent,
    transitionDecision: "normal_pass",
    repeatCleanReasonCode: repeatCleanTrigger.reasonCode,
    repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
    repeatCleanTrigger: repeatCleanTrigger.trigger,
    mostRecentPreviousReviewerCleanPassEnvelope,
    ...(deliveryResult !== undefined
      ? {
          delivery: {
            delivered: deliveryResult.delivered,
            ...(deliveryResult.reason !== undefined
              ? { reason: deliveryResult.reason }
              : {}),
            retried: deliveryRetried
          }
        }
      : {}),
    ...(docGateArtifactWriteFailureReason !== undefined
      ? {
          docGateArtifactWriteFailureReason
        }
      : {})
  };
}

export function asPassCommandError(error: unknown): never {
  if (error instanceof PassCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new PassCommandError(error.message);
  }

  if (error instanceof Error) {
    throw new PassCommandError(error.message);
  }

  throw error;
}
