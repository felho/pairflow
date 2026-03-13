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

export interface SummaryFindingsAssertionEvaluation {
  hasPositiveAssertion: boolean;
  evaluatedClauseCount: number;
  positiveClauseCount: number;
}

const convergenceSummaryPayloadContradictionReasonCode =
  "CONVERGENCE_SUMMARY_PAYLOAD_CONTRADICTION";
const summaryClauseSplitPattern =
  /(?:[.;!?]|\bbut\b|\bhowever\b|\byet\b|\bthough\b|\bwhile\b|\balthough\b|\bdespite\b|(?<!p[0-3]),(?!\s*(?:were\s+)?(?:resolved|closed|cleared|fixed|addressed|handled)\b)|(?<!\bp[0-3]\s)(?<!\bp[0-3],\s)(?<!\bp[0-3],)\band\b)+/iu;
const summaryFindingsWordPattern = /\bfindings?\b/iu;
const summaryNoFindingsPattern =
  /\b(?:no|zero)\s+(?:(?:open|remaining|active|unresolved)\s+)*findings?\b/iu;
const summaryNoFindingsFoundPattern =
  /\b(?:none\s+found|no\s+findings?\s+found)\b/iu;
const summaryWithoutFindingsPattern = /\bwithout\s+(?:any\s+)?findings?\b/iu;
const summaryFindingsZeroCountPattern = /\bfindings?\s*[:=]?\s*0\b/iu;
const summaryFindingsRemainZeroCountPattern =
  /\bfindings?\s+(?:remain|remaining)\s*[:=]?\s*0\b/iu;
const summaryZeroFindingsPattern = /\b0\s+findings?\b/iu;
const summaryNoSeverityFindingsPattern =
  /\b(?:no|zero)\s+(?:open\s+)?p[0-3]\s+findings?\b/iu;
const summaryNoSeverityAlternationFindingsPattern =
  /\b(?:no|zero)\s+(?:open\s+)?p[0-3](?:\s*(?:,\s*and|,|\/|and|or)\s*p[0-3])+\s+findings?\b/iu;
const summaryNoSeverityFindingsFoundPattern =
  /\b(?:no|zero|none)\s+(?:open\s+)?p[0-3]\s+findings?\s+found\b/iu;
const summaryResolvedSeverityFindingsPrefixPattern =
  /\b(?:addressed|handled|resolved|closed|cleared|fixed)\s+p[0-3]\s+findings?\b/iu;
const summaryNegatedSeverityFindingsPattern =
  /\bp[0-3]\s+findings?\s*(?:,\s*)?(?:were|are|remain|remained|became|stay|stayed|seem|seemed|appear|appeared)?\s*(?:not|never)\s+(?:really\s+)?(?:present|open|remaining|active|found|observed|detected|seen|identified)\b/iu;
const summaryResolvedSeverityFindingsPattern =
  /\bp[0-3]\s+findings?\s*(?:,\s*)?(?:are|were|remain|remained|have\s+been|had\s+been)?\s*(?:resolved|closed|cleared|fixed|addressed|handled)\b/iu;
const summaryResolvedFindingsCountPattern =
  /\b([1-9]\d*)\s+findings?\s*(?:,\s*)?(?:(?:that|which)\s+)?(?:are|were|remain|remained|have\s+been|had\s+been)?\s*(?:resolved|closed|cleared|fixed|addressed|handled)\b/iu;
const summaryNegatedFindingsCountPattern =
  /\b([1-9]\d*)\s+findings?\s*(?:,\s*)?(?:were|are|remain|remained|became|stay|stayed|seem|seemed|appear|appeared)?\s*(?:not|never)\s+(?:really\s+)?(?:present|open|remaining|active|unresolved|found|observed|detected|seen|identified)\b/iu;
const summarySeverityFindingsZeroCountPattern =
  /\bp[0-3]\s+findings?\s*(?:(?:is|are|were|remain|remained)\s+|[:=]\s*)?0\b/iu;
const summaryPositiveFindingsCountPattern = /(?:^|[^\w])([1-9]\d*)\s+findings?\b/iu;
const summaryPositiveFindingsAssignedCountPattern =
  /\bfindings?\s*[:=]\s*([1-9]\d*)\b/iu;
const summaryPositiveFindingsSignalPattern =
  /\b(?:open|remaining|unresolved|active)\s+findings?\b|\bfindings?\s+(?:remain|remaining|left|open|unresolved|active|persist|persists)\b/iu;
const summarySeverityPattern = /\bp[0-3]\b/iu;

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

function normalizeSummaryAssertionText(summary: string | undefined): string {
  if (typeof summary !== "string") {
    return "";
  }
  return summary.toLowerCase().replace(/\s+/gu, " ").trim();
}

function splitSummaryIntoClauses(normalizedSummary: string): string[] {
  if (normalizedSummary.length === 0) {
    return [];
  }
  return normalizedSummary
    .split(summaryClauseSplitPattern)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

function parseSeverityCountStats(clause: string): {
  hasSeverityCount: boolean;
  hasPositiveSeverityCount: boolean;
} {
  const summarySeverityCountPattern = /(\d+)\s*(?:[x×]\s*)?p([0-3])\b/giu;
  let hasSeverityCount = false;
  let hasPositiveSeverityCount = false;
  for (const match of clause.matchAll(summarySeverityCountPattern)) {
    const rawCount = Number.parseInt(match[1] ?? "", 10);
    if (!Number.isFinite(rawCount)) {
      continue;
    }
    hasSeverityCount = true;
    if (rawCount > 0) {
      hasPositiveSeverityCount = true;
      break;
    }
  }
  return {
    hasSeverityCount,
    hasPositiveSeverityCount
  };
}

function clauseHasNegationOrZeroGuard(clause: string): boolean {
  const severityCounts = parseSeverityCountStats(clause);
  if (
    summaryNoFindingsPattern.test(clause)
    || summaryNoFindingsFoundPattern.test(clause)
    || summaryWithoutFindingsPattern.test(clause)
    || summaryFindingsZeroCountPattern.test(clause)
    || summaryFindingsRemainZeroCountPattern.test(clause)
    || summaryZeroFindingsPattern.test(clause)
    || summaryNoSeverityFindingsPattern.test(clause)
    || summaryNoSeverityAlternationFindingsPattern.test(clause)
    || summaryNoSeverityFindingsFoundPattern.test(clause)
    || summaryResolvedSeverityFindingsPrefixPattern.test(clause)
    || summaryNegatedSeverityFindingsPattern.test(clause)
    || summaryResolvedSeverityFindingsPattern.test(clause)
    || summaryResolvedFindingsCountPattern.test(clause)
    || summaryNegatedFindingsCountPattern.test(clause)
    || summarySeverityFindingsZeroCountPattern.test(clause)
  ) {
    if (severityCounts.hasPositiveSeverityCount) {
      return false;
    }
    return true;
  }

  return (
    summaryFindingsWordPattern.test(clause)
    && severityCounts.hasSeverityCount
    && !severityCounts.hasPositiveSeverityCount
    && !summaryPositiveFindingsCountPattern.test(clause)
    && !summaryPositiveFindingsAssignedCountPattern.test(clause)
  );
}

function clauseHasPositiveFindingsAssertion(clause: string): boolean {
  const severityCounts = parseSeverityCountStats(clause);
  if (severityCounts.hasPositiveSeverityCount) {
    return true;
  }
  if (summaryPositiveFindingsCountPattern.test(clause)) {
    return true;
  }
  if (summaryPositiveFindingsAssignedCountPattern.test(clause)) {
    return true;
  }
  if (summaryPositiveFindingsSignalPattern.test(clause)) {
    return true;
  }
  const hasSeverity = summarySeverityPattern.test(clause);
  const hasFindingsWord = summaryFindingsWordPattern.test(clause);
  if (hasSeverity && hasFindingsWord) {
    return true;
  }
  return false;
}

export function evaluatePositiveSummaryFindingsAssertion(
  summary: string | undefined
): SummaryFindingsAssertionEvaluation {
  const normalized = normalizeSummaryAssertionText(summary);
  const clauses = splitSummaryIntoClauses(normalized);

  let positiveClauseCount = 0;
  for (const clause of clauses) {
    if (clauseHasNegationOrZeroGuard(clause)) {
      continue;
    }
    if (clauseHasPositiveFindingsAssertion(clause)) {
      positiveClauseCount += 1;
    }
  }

  return {
    hasPositiveAssertion: positiveClauseCount > 0,
    evaluatedClauseCount: clauses.length,
    positiveClauseCount
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
    const summaryFindingsAssertion = evaluatePositiveSummaryFindingsAssertion(
      previousReviewerVerdict.payload.summary
    );
    if (findingsAggregate.missing) {
      errors.push(
        "Convergence requires previous reviewer PASS to declare findings explicitly (use --finding or --no-findings)."
      );
      if (summaryFindingsAssertion.hasPositiveAssertion) {
        errors.push(
          `${convergenceSummaryPayloadContradictionReasonCode}: Convergence diagnostics: previous reviewer PASS summary asserts positive findings/severity, but payload.findings is missing.`
        );
      }
    } else if (findingsAggregate.invalid) {
      errors.push(
        "Convergence blocked: previous reviewer PASS has invalid findings payload."
      );
    } else if (
      findingsAggregate.findingCount === 0 &&
      summaryFindingsAssertion.hasPositiveAssertion
    ) {
      errors.push(
        `${convergenceSummaryPayloadContradictionReasonCode}: Convergence blocked: previous reviewer PASS summary asserts positive findings/severity but payload.findings is empty. Use structured --finding entries instead of summary-only findings.`
      );
    } else if (
      findingsAggregate.hasBlocking
      && (
        input.currentRound < input.severity_gate_round
        || input.reviewArtifactType === "document"
      )
    ) {
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
