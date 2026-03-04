import { join } from "node:path";

import {
  appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult
} from "../protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
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
import { isPassIntent, type PassIntent, type ProtocolEnvelope } from "../../types/protocol.js";
import type { Finding } from "../../types/findings.js";
import type { AgentName, AgentRole, BubbleStateSnapshot, RoundRoleHistoryEntry } from "../../types/bubble.js";
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
  readReviewerBriefArtifact
} from "../reviewer/reviewerBrief.js";

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
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  delivery?: {
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
}

export interface EmitPassDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  refreshReviewerContext?: typeof refreshReviewerContext;
}

interface ResolvedHandoff {
  senderAgent: AgentName;
  senderRole: AgentRole;
  recipientAgent: AgentName;
  recipientRole: AgentRole;
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

export function inferPassIntent(activeRole: AgentRole): PassIntent {
  if (activeRole === "implementer") {
    return "review";
  }

  return "fix_request";
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
      "Reviewer PASS requires explicit findings declaration: use --finding <P0|P1|P2|P3:Title[|ref1,ref2]> (repeatable) or --no-findings."
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
    switch (finding.severity) {
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

function isBlockerSeverity(severity: Finding["severity"]): boolean {
  return severity === "P0" || severity === "P1";
}

function normalizeFindingRefs(findings: Finding[]): Finding[] {
  return findings.map((finding) => {
    const normalizedFindingRefs = normalizeStringList(finding.refs ?? []);

    if (normalizedFindingRefs.length > 0) {
      return {
        ...finding,
        refs: normalizedFindingRefs
      };
    }

    if (finding.refs !== undefined) {
      const withoutRefs: Finding = { ...finding };
      delete withoutRefs.refs;
      return withoutRefs;
    }

    return finding;
  });
}

function listBlockerFindingsMissingRefs(findings: Finding[]): Finding[] {
  return findings.filter(
    (finding) =>
      isBlockerSeverity(finding.severity) &&
      normalizeStringList(finding.refs ?? []).length === 0
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
  const findings = normalizeFindingRefs(input.findings ?? []);
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
  const inferredReviewerIntent =
    handoff.senderRole === "reviewer"
      ? inferReviewerPassIntent(hasFindings, noFindings)
      : undefined;

  if (handoff.senderRole === "reviewer") {
    if (listBlockerFindingsMissingRefs(findings).length > 0) {
      throw new PassCommandError(
        "Reviewer PASS with P0/P1 findings requires explicit finding-level evidence refs (finding.refs). Provide per-finding refs via --finding <P0|P1:Title|ref1,ref2>. Envelope --ref artifacts do not satisfy blocker evidence binding."
      );
    }
  } else if (hasFindings || noFindings) {
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
        ...(handoff.senderRole === "reviewer"
          ? { findings: hasFindings ? findings : [] }
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
  );

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
      ...(reviewerBriefText !== undefined
        ? { reviewerStartupPrompt: formatReviewerBriefPrompt(reviewerBriefText) }
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
      ...buildFindingCounts(findings)
    },
    now
  });

  return {
    bubbleId: resolved.bubbleId,
    sequence: mapped.sequence,
    envelope: mapped.envelope,
    state: written.state,
    inferredIntent,
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
