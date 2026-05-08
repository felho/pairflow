import type { FindingsClaimState } from "../../../contracts/kernel/protocol.js";

export interface SummaryFindingsAssertionEvaluation {
  hasPositiveAssertion: boolean;
  evaluatedClauseCount: number;
  positiveClauseCount: number;
}

export interface SummaryNoFindingsAssertionEvaluation {
  hasNoFindingsAssertion: boolean;
  evaluatedClauseCount: number;
  noFindingsClauseCount: number;
  positiveClauseCount: number;
}

export type ConvergedSummaryFindingsContradiction =
  | "summary_open_without_findings"
  | "summary_clean_with_findings";

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

const summaryNegationOrZeroPatterns = [
  summaryNoFindingsPattern,
  summaryNoFindingsFoundPattern,
  summaryWithoutFindingsPattern,
  summaryFindingsZeroCountPattern,
  summaryFindingsRemainZeroCountPattern,
  summaryZeroFindingsPattern,
  summaryNoSeverityFindingsPattern,
  summaryNoSeverityAlternationFindingsPattern,
  summaryNoSeverityFindingsFoundPattern,
  summaryResolvedSeverityFindingsPrefixPattern,
  summaryNegatedSeverityFindingsPattern,
  summaryResolvedSeverityFindingsPattern,
  summaryResolvedFindingsCountPattern,
  summaryNegatedFindingsCountPattern,
  summarySeverityFindingsZeroCountPattern
] as const;

function clauseMatchesAnyPattern(
  clause: string,
  patterns: readonly RegExp[]
): boolean {
  return patterns.some((pattern) => pattern.test(clause));
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
  if (clauseMatchesAnyPattern(clause, summaryNegationOrZeroPatterns)) {
    if (severityCounts.hasPositiveSeverityCount) {
      return false;
    }
    return true;
  }

  return clauseHasSeverityOnlyFindingsSignal(clause, severityCounts);
}

function clauseHasSeverityOnlyFindingsSignal(
  clause: string,
  severityCounts: {
    hasSeverityCount: boolean;
    hasPositiveSeverityCount: boolean;
  }
): boolean {
  return (
    summaryFindingsWordPattern.test(clause)
    && severityCounts.hasSeverityCount
    && !severityCounts.hasPositiveSeverityCount
    && !summaryPositiveFindingsCountPattern.test(clause)
    && !summaryPositiveFindingsAssignedCountPattern.test(clause)
  );
}

function clauseHasExplicitNoFindingsAssertion(clause: string): boolean {
  const severityCounts = parseSeverityCountStats(clause);
  const noFindingsPatterns = [
    summaryNoFindingsPattern,
    summaryNoFindingsFoundPattern,
    summaryWithoutFindingsPattern,
    summaryFindingsZeroCountPattern,
    summaryFindingsRemainZeroCountPattern,
    summaryZeroFindingsPattern,
    summaryNoSeverityFindingsPattern,
    summaryNoSeverityAlternationFindingsPattern,
    summaryNoSeverityFindingsFoundPattern,
    summaryNegatedSeverityFindingsPattern,
    summaryNegatedFindingsCountPattern,
    summarySeverityFindingsZeroCountPattern
  ] as const;

  if (clauseMatchesAnyPattern(clause, noFindingsPatterns)) {
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

export function evaluateNoFindingsSummaryFindingsAssertion(
  summary: string | undefined
): SummaryNoFindingsAssertionEvaluation {
  const normalized = normalizeSummaryAssertionText(summary);
  const clauses = splitSummaryIntoClauses(normalized);
  let noFindingsClauseCount = 0;
  let positiveClauseCount = 0;

  for (const clause of clauses) {
    if (clauseHasNegationOrZeroGuard(clause)) {
      if (clauseHasExplicitNoFindingsAssertion(clause)) {
        noFindingsClauseCount += 1;
      }
      continue;
    }
    if (clauseHasPositiveFindingsAssertion(clause)) {
      positiveClauseCount += 1;
    }
  }

  return {
    hasNoFindingsAssertion: noFindingsClauseCount > 0 && positiveClauseCount === 0,
    evaluatedClauseCount: clauses.length,
    noFindingsClauseCount,
    positiveClauseCount
  };
}

export function hasGlobalNoFindingsSummaryAssertion(
  summary: string | undefined
): boolean {
  const normalized = normalizeSummaryAssertionText(summary);
  if (normalized.length === 0) {
    return false;
  }
  return (
    summaryNoFindingsPattern.test(normalized)
    || summaryNoFindingsFoundPattern.test(normalized)
    || summaryWithoutFindingsPattern.test(normalized)
    || summaryFindingsZeroCountPattern.test(normalized)
    || summaryFindingsRemainZeroCountPattern.test(normalized)
    || summaryZeroFindingsPattern.test(normalized)
  );
}

export function resolveConvergedSummaryFindingsContradiction(input: {
  summary: string;
  hasFindings: boolean;
}): ConvergedSummaryFindingsContradiction | undefined {
  const positiveSummaryAssertion =
    evaluatePositiveSummaryFindingsAssertion(input.summary);
  const noFindingsSummaryAssertion =
    evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  if (positiveSummaryAssertion.hasPositiveAssertion && !input.hasFindings) {
    return "summary_open_without_findings";
  }
  if (input.hasFindings && noFindingsSummaryAssertion.hasNoFindingsAssertion) {
    return "summary_clean_with_findings";
  }
  return undefined;
}

export function resolveLegacySummaryFindingsClaimState(
  summary: string | undefined
): FindingsClaimState {
  const assertion = evaluatePositiveSummaryFindingsAssertion(summary);
  return assertion.hasPositiveAssertion ? "open_findings" : "unknown";
}
