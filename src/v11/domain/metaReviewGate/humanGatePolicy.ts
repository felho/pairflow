import type { MetaReviewRecommendation } from "../../../types/bubble.js";

export function resolveHumanGateRecommendation(input: {
  metaReviewRun?: { recommendation: MetaReviewRecommendation };
  fallbackRecommendation?: MetaReviewRecommendation;
}): MetaReviewRecommendation | undefined {
  if (input.metaReviewRun !== undefined) {
    return input.metaReviewRun.recommendation;
  }
  return input.fallbackRecommendation;
}

export function buildHumanGateSummary(input: {
  convergenceSummary: string;
  metaReviewRun?: {
    summary: string | null;
  };
  fallbackReason?: string;
}): string {
  const runSummary = input.metaReviewRun?.summary?.trim();
  if (input.fallbackReason !== undefined) {
    if (
      typeof runSummary === "string" &&
      runSummary.length > 0 &&
      runSummary !== input.fallbackReason
    ) {
      return `${input.fallbackReason} Meta-review summary: ${runSummary}`;
    }
    return input.fallbackReason;
  }
  if (typeof runSummary === "string" && runSummary.length > 0) {
    return runSummary;
  }
  return input.convergenceSummary;
}
