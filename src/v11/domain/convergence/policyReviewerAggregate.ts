import type { ReviewArtifactType } from "../../../types/bubble.js";
import {
  findingPriorities,
  isFindingLayer,
  isFindingTiming,
  resolveFindingPriority,
  type FindingPriority
} from "../../../types/findings.js";
import { isRecord } from "../../shared/validation/primitives.js";
import type { ReviewerFindingsAggregate } from "./policyTypes.js";

function resolvePolicyPriority(input: {
  reviewArtifactType: ReviewArtifactType;
  priority: FindingPriority;
  effectivePriority: FindingPriority;
  timing: "required-now" | "later-hardening";
  layer?: "L0" | "L1" | "L2";
}): FindingPriority {
  if (input.reviewArtifactType !== "document") {
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

function resolveThresholdPriority(input: {
  reviewArtifactType: ReviewArtifactType;
  priority: FindingPriority;
  effectivePriority: FindingPriority;
  timing: "required-now" | "later-hardening";
  layer?: "L0" | "L1" | "L2";
}): FindingPriority {
  if (input.reviewArtifactType !== "document") {
    return input.effectivePriority;
  }

  return resolvePolicyPriority(input);
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
      highestEffectivePriority: null,
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
  let highestEffectivePriorityIndex: number | null = null;

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
    const timing = isFindingTiming(finding.timing)
      ? finding.timing
      : "later-hardening";
    const layer = isFindingLayer(finding.layer) ? finding.layer : undefined;
    const policyPriority = resolvePolicyPriority({
      reviewArtifactType: input.reviewArtifactType,
      priority,
      effectivePriority,
      timing,
      ...(layer !== undefined ? { layer } : {})
    });
    const thresholdPriority = resolveThresholdPriority({
      reviewArtifactType: input.reviewArtifactType,
      priority,
      effectivePriority,
      timing,
      ...(layer !== undefined ? { layer } : {})
    });
    const priorityIndex = findingPriorities.indexOf(thresholdPriority);
    if (
      priorityIndex !== -1
      && (highestEffectivePriorityIndex === null || priorityIndex < highestEffectivePriorityIndex)
    ) {
      highestEffectivePriorityIndex = priorityIndex;
    }

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
    highestEffectivePriority:
      highestEffectivePriorityIndex === null
        ? null
        : (findingPriorities[highestEffectivePriorityIndex] ?? null),
    hasBlocking,
    hasNonBlocking
  };
}
