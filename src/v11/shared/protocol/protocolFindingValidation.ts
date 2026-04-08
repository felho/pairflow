import {
  isFindingLayer,
  isFindingPriority,
  isFindingSeverity,
  isFindingTiming,
  resolveFindingPriority,
  type Finding
} from "../../../types/findings.js";
import {
  isNonEmptyString,
  isRecord,
  type ValidationError
} from "../validation/primitives.js";

function pushFindingFieldError(
  errors: ValidationError[],
  path: string,
  message: string
): void {
  errors.push({ path, message });
}

function areStringRefs(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isValidEvidenceValue(value: unknown): value is string | string[] {
  return isNonEmptyString(value) || areStringRefs(value);
}

function collectFindingShapeErrors(input: {
  entry: Record<string, unknown>;
  findingPath: string;
  errors: ValidationError[];
}): {
  resolvedPriority: "P0" | "P1" | "P2" | "P3" | undefined;
  title: string | undefined;
  detail: string | undefined;
  code: string | undefined;
  refs: string[] | undefined;
  timing: Finding["timing"] | undefined;
  layer: Finding["layer"] | undefined;
  evidence: Finding["evidence"] | undefined;
  effectivePriority: Finding["effective_priority"] | undefined;
  severity: Finding["severity"] | undefined;
} {
  const { entry, findingPath, errors } = input;
  const priority = entry.priority;
  const severity = entry.severity;
  const effectivePriority = entry.effective_priority;
  const detail = entry.detail;
  const code = entry.code;
  const refs = entry.refs;
  const timing = entry.timing;
  const layer = entry.layer;
  const evidence = entry.evidence;
  const title = entry.title;

  const resolvedPriority = resolveFindingPriority({
    priority: isFindingPriority(priority) ? priority : undefined,
    severity: isFindingSeverity(severity) ? severity : undefined
  });
  if (priority !== undefined && !isFindingPriority(priority)) {
    pushFindingFieldError(errors, `${findingPath}.priority`, "Must be one of: P0, P1, P2, P3");
  }
  if (severity !== undefined && !isFindingSeverity(severity)) {
    pushFindingFieldError(errors, `${findingPath}.severity`, "Must be one of: P0, P1, P2, P3");
  }
  if (effectivePriority !== undefined && !isFindingPriority(effectivePriority)) {
    pushFindingFieldError(
      errors,
      `${findingPath}.effective_priority`,
      "Must be one of: P0, P1, P2, P3 when provided"
    );
  }
  if (resolvedPriority === undefined) {
    pushFindingFieldError(
      errors,
      `${findingPath}.priority`,
      "Missing canonical priority (provide priority or severity alias)"
    );
  }
  if (!isNonEmptyString(title)) {
    pushFindingFieldError(errors, `${findingPath}.title`, "Must be a non-empty string");
  }
  if (!(detail === undefined || isNonEmptyString(detail))) {
    pushFindingFieldError(
      errors,
      `${findingPath}.detail`,
      "Must be a non-empty string when provided"
    );
  }
  if (!(code === undefined || isNonEmptyString(code))) {
    pushFindingFieldError(
      errors,
      `${findingPath}.code`,
      "Must be a non-empty string when provided"
    );
  }
  if (!(refs === undefined || areStringRefs(refs))) {
    pushFindingFieldError(
      errors,
      `${findingPath}.refs`,
      "Must be an array of non-empty strings when provided"
    );
  }
  if (!(timing === undefined || isFindingTiming(timing))) {
    pushFindingFieldError(
      errors,
      `${findingPath}.timing`,
      "Must be one of: required-now, later-hardening when provided"
    );
  }
  if (!(layer === undefined || isFindingLayer(layer))) {
    pushFindingFieldError(
      errors,
      `${findingPath}.layer`,
      "Must be one of: L0, L1, L2 when provided"
    );
  }
  if (!(evidence === undefined || isValidEvidenceValue(evidence))) {
    pushFindingFieldError(
      errors,
      `${findingPath}.evidence`,
      "Must be a non-empty string or array of non-empty strings when provided"
    );
  }

  return {
    resolvedPriority,
    title: isNonEmptyString(title) ? title : undefined,
    detail: isNonEmptyString(detail) ? detail : undefined,
    code: isNonEmptyString(code) ? code : undefined,
    refs: areStringRefs(refs) ? refs : undefined,
    timing: isFindingTiming(timing) ? timing : undefined,
    layer: isFindingLayer(layer) ? layer : undefined,
    evidence: isValidEvidenceValue(evidence) ? evidence : undefined,
    effectivePriority: isFindingPriority(effectivePriority) ? effectivePriority : undefined,
    severity: isFindingSeverity(severity) ? severity : undefined
  };
}

function buildValidatedFinding(input: {
  resolvedPriority: "P0" | "P1" | "P2" | "P3";
  title: string;
  detail: string | undefined;
  code: string | undefined;
  refs: string[] | undefined;
  timing: Finding["timing"] | undefined;
  layer: Finding["layer"] | undefined;
  evidence: Finding["evidence"] | undefined;
  effectivePriority: Finding["effective_priority"] | undefined;
  severity: Finding["severity"] | undefined;
}): Finding {
  const finding: Finding = {
    priority: input.resolvedPriority,
    ...(input.severity !== undefined ? { severity: input.severity } : {}),
    title: input.title
  };

  if (input.detail !== undefined) {
    finding.detail = input.detail;
  }
  if (input.code !== undefined) {
    finding.code = input.code;
  }
  if (input.refs !== undefined) {
    finding.refs = input.refs;
  }
  if (input.timing !== undefined) {
    finding.timing = input.timing;
  }
  if (input.layer !== undefined) {
    finding.layer = input.layer;
  }
  if (input.evidence !== undefined) {
    finding.evidence = input.evidence;
  }
  if (input.effectivePriority !== undefined) {
    finding.effective_priority = input.effectivePriority;
  }

  return finding;
}

export function validateFindings(
  input: unknown,
  path: string,
  errors: ValidationError[]
): Finding[] | undefined {
  if (!Array.isArray(input)) {
    errors.push({
      path,
      message: "Must be an array"
    });
    return undefined;
  }

  const findings: Finding[] = [];
  input.forEach((entry, index) => {
    const findingPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      errors.push({
        path: findingPath,
        message: "Must be an object"
      });
      return;
    }

    const validated = collectFindingShapeErrors({
      entry,
      findingPath,
      errors
    });
    if (validated.resolvedPriority === undefined || validated.title === undefined) {
      return;
    }

    findings.push(
      buildValidatedFinding({
        resolvedPriority: validated.resolvedPriority,
        title: validated.title,
        detail: validated.detail,
        code: validated.code,
        refs: validated.refs,
        timing: validated.timing,
        layer: validated.layer,
        evidence: validated.evidence,
        effectivePriority: validated.effectivePriority,
        severity: validated.severity
      })
    );
  });

  return findings;
}
