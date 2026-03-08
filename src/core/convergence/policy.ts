import type {
  AgentName,
  ReviewArtifactType,
  RoundRoleHistoryEntry
} from "../../types/bubble.js";
import {
  isFindingLayer,
  isFindingTiming,
  resolveFindingPriority,
  type FindingPriority
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
  severity_gate_round: number;
}

export interface ConvergencePolicyResult {
  ok: boolean;
  errors: string[];
}

export interface ReviewerFindingsAggregate {
  missing: boolean;
  invalid: boolean;
  findingCount: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  hasBlocking: boolean;
  hasNonBlocking: boolean;
}

function resolvePolicyPriority(input: {
  reviewArtifactType: ReviewArtifactType;
  priority: FindingPriority;
  effectivePriority: FindingPriority;
  timing: "required-now" | "later-hardening";
  layer?: "L0" | "L1" | "L2";
}): FindingPriority {
  if (input.reviewArtifactType !== "document") {
    // Non-doc scope keeps legacy blocker semantics on canonical priority.
    return input.priority;
  }

  const candidate = input.effectivePriority;
  if (candidate !== "P0" && candidate !== "P1") {
    return candidate;
  }

  const strictDocBlocker =
    input.timing === "required-now" && input.layer === "L1";
  return strictDocBlocker ? candidate : "P2";
}

export function evaluateReviewerFindingsAggregate(input: {
  findings: unknown;
  reviewArtifactType: ReviewArtifactType;
}): ReviewerFindingsAggregate {
  if (!Array.isArray(input.findings)) {
    return {
      missing: true,
      invalid: false,
      findingCount: 0,
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      hasBlocking: false,
      hasNonBlocking: false
    };
  }

  const counts = {
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0
  };
  let invalid = false;
  let hasBlocking = false;
  let hasNonBlocking = false;

  for (const finding of input.findings) {
    if (!isRecord(finding)) {
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

    const effectivePriority =
      resolveFindingPriority({
        priority: finding.effective_priority,
        severity: undefined
      }) ?? priority;
    const timing = isFindingTiming(finding.timing) ? finding.timing : "later-hardening";
    const layer = isFindingLayer(finding.layer) ? finding.layer : undefined;
    const policyPriority = resolvePolicyPriority({
      reviewArtifactType: input.reviewArtifactType,
      priority,
      effectivePriority,
      timing,
      ...(layer !== undefined ? { layer } : {})
    });

    if (policyPriority === "P0") {
      counts.p0 += 1;
      hasBlocking = true;
      continue;
    }
    if (policyPriority === "P1") {
      counts.p1 += 1;
      hasBlocking = true;
      continue;
    }
    if (policyPriority === "P2") {
      counts.p2 += 1;
      hasNonBlocking = true;
      continue;
    }
    counts.p3 += 1;
    hasNonBlocking = true;
  }

  return {
    missing: false,
    invalid,
    findingCount: input.findings.length,
    p0: counts.p0,
    p1: counts.p1,
    p2: counts.p2,
    p3: counts.p3,
    hasBlocking,
    hasNonBlocking
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

function resolvePreviousReviewerVerdict(input: {
  transcript: ProtocolEnvelope[];
  reviewer: AgentName;
  implementer: AgentName;
  previousRound: number;
}): ProtocolEnvelope | undefined {
  return [...input.transcript].reverse().find((envelope) => {
    if (envelope.sender !== input.reviewer || envelope.round !== input.previousRound) {
      return false;
    }
    if (envelope.type === "PASS") {
      return envelope.recipient === input.implementer;
    }
    if (envelope.type === "CONVERGENCE") {
      return envelope.recipient === "orchestrator";
    }
    return false;
  });
}

export function validateConvergencePolicy(
  input: ConvergencePolicyInput
): ConvergencePolicyResult {
  const errors: string[] = [];

  if (!Number.isInteger(input.severity_gate_round) || input.severity_gate_round < 4) {
    errors.push(
      "SEVERITY_GATE_ROUND_INVALID: severity_gate_round must be an integer >= 4."
    );
  }

  if (input.currentRound <= 1) {
    errors.push(
      "ROUND1_CONVERGENCE_GUARDRAIL: Convergence is not allowed in round 1."
    );
  }

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
  const previousReviewerVerdict = resolvePreviousReviewerVerdict({
    transcript: input.transcript,
    reviewer: input.reviewer,
    implementer: input.implementer,
    previousRound
  });

  if (previousRound < 1 || previousReviewerVerdict === undefined) {
    errors.push(
      "CONVERGENCE_PREVIOUS_REVIEWER_PASS_MISSING: Convergence requires a previous reviewer PASS or CONVERGENCE verdict from the prior round."
    );
  } else if (previousReviewerVerdict.type === "PASS") {
    const findingsAggregate = evaluateReviewerFindingsAggregate({
      findings: previousReviewerVerdict.payload.findings,
      reviewArtifactType: input.reviewArtifactType
    });
    const summaryCounts = parseSummarySeverityCounts(
      previousReviewerVerdict.payload.summary
    );
    if (findingsAggregate.missing) {
      errors.push(
        "Convergence requires previous reviewer PASS to declare findings explicitly (use --finding or --no-findings)."
      );
      if (summaryCounts.hasAnyPositiveCount) {
        errors.push(
          "Convergence diagnostics: previous reviewer summary reports findings counts, but payload.findings is missing."
        );
      }
    } else if (findingsAggregate.invalid) {
      errors.push(
        "Convergence blocked: previous reviewer PASS has invalid findings payload."
      );
    } else if (
      findingsAggregate.findingCount === 0 &&
      summaryCounts.hasFindingsWord &&
      summaryCounts.hasAnyPositiveCount
    ) {
      errors.push(
        "Convergence blocked: previous reviewer PASS summary reports positive finding counts but payload.findings is empty. Use structured --finding entries instead of summary-only findings."
      );
    } else if (findingsAggregate.hasBlocking) {
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
