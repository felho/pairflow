import type {
  AgentName,
  ReviewArtifactType,
  RoundRoleHistoryEntry
} from "../../types/bubble.js";
import {
  isFindingLayer,
  isFindingTiming,
  resolveFindingPriority
} from "../../types/findings.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";
import { isRecord } from "../validation.js";

export interface ConvergencePolicyInput {
  currentRound: number;
  reviewer: AgentName;
  implementer: AgentName;
  reviewArtifactType: ReviewArtifactType;
  roundRoleHistory: RoundRoleHistoryEntry[];
  transcript: ProtocolEnvelope[];
}

export interface ConvergencePolicyResult {
  ok: boolean;
  errors: string[];
}

function getReviewerFindingsStatus(
  envelope: ProtocolEnvelope,
  input: {
    reviewArtifactType: ReviewArtifactType;
  }
): {
  missing: boolean;
  invalid: boolean;
  findingCount: number;
  hasBlocking: boolean;
} {
  const findings = envelope.payload.findings;
  if (!Array.isArray(findings)) {
    return {
      missing: true,
      invalid: false,
      findingCount: 0,
      hasBlocking: false
    };
  }

  let invalid = false;
  const docsScope = input.reviewArtifactType === "document";
  const hasBlocking = findings.some((finding) => {
    if (!isRecord(finding)) {
      invalid = true;
      return false;
    }

    const priority = resolveFindingPriority({
      priority: finding.priority,
      severity: finding.severity
    });
    if (priority === undefined) {
      invalid = true;
      return false;
    }

    const effectivePriority =
      resolveFindingPriority({
        priority: finding.effective_priority,
        severity: undefined
      }) ?? priority;
    const timing = isFindingTiming(finding.timing) ? finding.timing : "later-hardening";
    const layer = isFindingLayer(finding.layer) ? finding.layer : undefined;

    const blockingPriority = docsScope ? effectivePriority : priority;
    if (blockingPriority !== "P0" && blockingPriority !== "P1") {
      return false;
    }
    if (!docsScope) {
      // Legacy/non-doc behavior: any canonical P0/P1 finding is blocking.
      return true;
    }
    // Docs scope uses doc-contract blocker boundary.
    return timing === "required-now" && layer === "L1";
  });

  return {
    missing: false,
    invalid,
    findingCount: findings.length,
    hasBlocking
  };
}

function parseSummarySeverityCounts(summary: string | undefined): {
  hasFindingsWord: boolean;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  hasAnyPositiveCount: boolean;
} {
  if (summary === undefined) {
    return {
      hasFindingsWord: false,
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      hasAnyPositiveCount: false
    };
  }

  const counts = {
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0
  };
  const pattern = /(\d+)\s*(?:[x×]\s*)?P([0-3])\b/giu;
  for (const match of summary.matchAll(pattern)) {
    const rawCount = Number.parseInt(match[1] ?? "", 10);
    if (!Number.isFinite(rawCount)) {
      continue;
    }
    const normalizedCount = Math.max(0, rawCount);
    const severity = match[2];
    if (severity === "0") {
      counts.p0 += normalizedCount;
    } else if (severity === "1") {
      counts.p1 += normalizedCount;
    } else if (severity === "2") {
      counts.p2 += normalizedCount;
    } else if (severity === "3") {
      counts.p3 += normalizedCount;
    }
  }

  return {
    hasFindingsWord: /\bfindings?\b/iu.test(summary),
    p0: counts.p0,
    p1: counts.p1,
    p2: counts.p2,
    p3: counts.p3,
    hasAnyPositiveCount:
      counts.p0 + counts.p1 + counts.p2 + counts.p3 > 0
  };
}

function hasUnresolvedHumanQuestion(transcript: ProtocolEnvelope[]): boolean {
  let openQuestions = 0;
  for (const envelope of transcript) {
    if (envelope.type === "HUMAN_QUESTION") {
      openQuestions += 1;
      continue;
    }

    if (envelope.type === "HUMAN_REPLY" && openQuestions > 0) {
      openQuestions -= 1;
    }
  }

  return openQuestions > 0;
}

export function validateConvergencePolicy(
  input: ConvergencePolicyInput
): ConvergencePolicyResult {
  const errors: string[] = [];

  const currentRoundHistory = input.roundRoleHistory.find(
    (entry) => entry.round === input.currentRound
  );
  if (currentRoundHistory === undefined) {
    errors.push(
      `round_role_history is missing current round entry (${input.currentRound}).`
    );
  } else {
    if (currentRoundHistory.reviewer !== input.reviewer) {
      errors.push(
        `round_role_history reviewer for round ${input.currentRound} must be ${input.reviewer}.`
      );
    }
    if (currentRoundHistory.implementer !== input.implementer) {
      errors.push(
        `round_role_history implementer for round ${input.currentRound} must be ${input.implementer}.`
      );
    }
  }

  const distinctRounds = new Set(input.roundRoleHistory.map((entry) => entry.round));
  if (distinctRounds.size < 2) {
    errors.push(
      "Convergence requires reviewer-role alternation evidence across at least two rounds."
    );
  }

  const previousRound = input.currentRound - 1;
  const previousReviewerPass = [...input.transcript]
    .reverse()
    .find(
      (envelope) =>
        envelope.type === "PASS" &&
        envelope.sender === input.reviewer &&
        envelope.recipient === input.implementer &&
        envelope.round === previousRound
    );

  if (previousRound < 1 || previousReviewerPass === undefined) {
    errors.push(
      "Convergence requires a previous reviewer PASS from the prior round."
    );
  } else {
    const findingsStatus = getReviewerFindingsStatus(previousReviewerPass, {
      reviewArtifactType: input.reviewArtifactType
    });
    const summaryCounts = parseSummarySeverityCounts(
      previousReviewerPass.payload.summary
    );
    if (findingsStatus.missing) {
      errors.push(
        "Convergence requires previous reviewer PASS to declare findings explicitly (use --finding or --no-findings)."
      );
    } else if (findingsStatus.invalid) {
      errors.push(
        "Convergence blocked: previous reviewer PASS has invalid findings payload."
      );
    } else if (
      findingsStatus.findingCount === 0 &&
      summaryCounts.hasFindingsWord &&
      summaryCounts.hasAnyPositiveCount
    ) {
      errors.push(
        "Convergence blocked: previous reviewer PASS summary reports positive finding counts but payload.findings is empty. Use structured --finding entries instead of summary-only findings."
      );
    } else if (findingsStatus.hasBlocking) {
      errors.push(
        "Convergence blocked: previous reviewer PASS still contains open P0/P1 findings."
      );
    }
  }

  if (hasUnresolvedHumanQuestion(input.transcript)) {
    errors.push("Convergence blocked: unresolved HUMAN_QUESTION exists.");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
