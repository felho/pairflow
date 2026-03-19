import { normalizeStringList } from "../../../core/util/normalize.js";
import { isRecord } from "../../../core/validation.js";
import {
  isFindingLayer,
  isFindingTiming,
  resolveFindingPriority,
  type Finding
} from "../../../types/findings.js";

export interface NormalizedReviewerFindingsPayload {
  findings: Finding[];
  invalid: boolean;
}

interface NormalizedRefsResult {
  refs: string[];
  invalid: boolean;
}

interface NormalizeFindingResult {
  finding?: Finding;
  invalid: boolean;
}

function normalizeFindingRefs(refsRaw: unknown): NormalizedRefsResult {
  if (refsRaw === undefined) {
    return {
      refs: [],
      invalid: false
    };
  }
  if (!Array.isArray(refsRaw)) {
    return {
      refs: [],
      invalid: true
    };
  }
  const refs = normalizeStringList(refsRaw);
  if (refsRaw.length > 0 && refs.length === 0) {
    return {
      refs: [],
      invalid: true
    };
  }
  return {
    refs,
    invalid: false
  };
}

function normalizePriorityFields(input: {
  findingRecord: Record<string, unknown>;
  normalizedFinding: Finding;
}): void {
  const normalizedPriority = resolveFindingPriority({
    priority: input.findingRecord.priority,
    severity: undefined
  });
  const normalizedSeverity = resolveFindingPriority({
    priority: undefined,
    severity: input.findingRecord.severity
  });
  if (normalizedPriority !== undefined) {
    input.normalizedFinding.priority = normalizedPriority;
  }
  if (normalizedSeverity !== undefined) {
    input.normalizedFinding.severity = normalizedSeverity;
  }
  if (normalizedPriority === undefined && normalizedSeverity !== undefined) {
    input.normalizedFinding.priority = normalizedSeverity;
  }
}

function normalizeOptionalFields(input: {
  findingRecord: Record<string, unknown>;
  normalizedFinding: Finding;
}): void {
  if (
    typeof input.findingRecord.detail === "string"
    && input.findingRecord.detail.trim().length > 0
  ) {
    input.normalizedFinding.detail = input.findingRecord.detail;
  }
  if (
    typeof input.findingRecord.code === "string"
    && input.findingRecord.code.trim().length > 0
  ) {
    input.normalizedFinding.code = input.findingRecord.code;
  }
  if (isFindingTiming(input.findingRecord.timing)) {
    input.normalizedFinding.timing = input.findingRecord.timing;
  }
  if (isFindingLayer(input.findingRecord.layer)) {
    input.normalizedFinding.layer = input.findingRecord.layer;
  }
  const effectivePriority = resolveFindingPriority({
    priority: input.findingRecord.effective_priority,
    severity: undefined
  });
  if (effectivePriority !== undefined) {
    input.normalizedFinding.effective_priority = effectivePriority;
  }
  if (typeof input.findingRecord.evidence === "string") {
    input.normalizedFinding.evidence = input.findingRecord.evidence;
  } else if (Array.isArray(input.findingRecord.evidence)) {
    input.normalizedFinding.evidence = normalizeStringList(
      input.findingRecord.evidence
    );
  }
}

function normalizeFinding(rawFinding: unknown): NormalizeFindingResult {
  if (!isRecord(rawFinding)) {
    return { invalid: true };
  }

  if (
    typeof rawFinding.title !== "string"
    || rawFinding.title.trim().length === 0
  ) {
    return { invalid: true };
  }

  const priority = resolveFindingPriority({
    priority: rawFinding.priority,
    severity: rawFinding.severity
  });
  if (priority === undefined) {
    return { invalid: true };
  }

  const normalizedRefs = normalizeFindingRefs(rawFinding.refs);
  if (normalizedRefs.invalid) {
    return { invalid: true };
  }

  const normalizedFinding: Finding = {
    title: rawFinding.title.trim()
  };
  normalizePriorityFields({
    findingRecord: rawFinding,
    normalizedFinding
  });
  normalizeOptionalFields({
    findingRecord: rawFinding,
    normalizedFinding
  });
  if (normalizedRefs.refs.length > 0) {
    normalizedFinding.refs = normalizedRefs.refs;
  }

  return {
    finding: normalizedFinding,
    invalid: false
  };
}

export function normalizeReviewerFindingsPayload(
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
  for (const rawFinding of findings) {
    const result = normalizeFinding(rawFinding);
    if (result.invalid) {
      invalid = true;
      continue;
    }
    if (result.finding !== undefined) {
      normalized.push(result.finding);
    }
  }

  return {
    findings: normalized,
    invalid
  };
}
