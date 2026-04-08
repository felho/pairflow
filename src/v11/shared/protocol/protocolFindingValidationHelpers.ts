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
  type ValidationError
} from "../validation/primitives.js";

export type FindingPriority = "P0" | "P1" | "P2" | "P3";

export type ValidatedFindingShape = {
  resolvedPriority: FindingPriority | undefined;
  title: string | undefined;
  detail: string | undefined;
  code: string | undefined;
  refs: string[] | undefined;
  timing: Finding["timing"] | undefined;
  layer: Finding["layer"] | undefined;
  evidence: Finding["evidence"] | undefined;
  effectivePriority: Finding["effective_priority"] | undefined;
  severity: Finding["severity"] | undefined;
};

function pushFindingFieldError(
  errors: ValidationError[],
  path: string,
  message: string
): void {
  errors.push({ path, message });
}

export function areStringRefs(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

export function isValidEvidenceValue(value: unknown): value is string | string[] {
  return isNonEmptyString(value) || areStringRefs(value);
}

function validateFindingPriorityFields(input: {
  entry: Record<string, unknown>;
  findingPath: string;
  errors: ValidationError[];
}): {
  resolvedPriority: FindingPriority | undefined;
  effectivePriority: Finding["effective_priority"] | undefined;
  severity: Finding["severity"] | undefined;
} {
  const { entry, findingPath, errors } = input;
  const priority = entry.priority;
  const severity = entry.severity;
  const effectivePriority = entry.effective_priority;

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

  return {
    resolvedPriority,
    effectivePriority: isFindingPriority(effectivePriority) ? effectivePriority : undefined,
    severity: isFindingSeverity(severity) ? severity : undefined
  };
}

function validateFindingTextFields(input: {
  entry: Record<string, unknown>;
  findingPath: string;
  errors: ValidationError[];
}): {
  title: string | undefined;
  detail: string | undefined;
  code: string | undefined;
} {
  const { entry, findingPath, errors } = input;
  const title = entry.title;
  const detail = entry.detail;
  const code = entry.code;

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

  return {
    title: isNonEmptyString(title) ? title : undefined,
    detail: isNonEmptyString(detail) ? detail : undefined,
    code: isNonEmptyString(code) ? code : undefined
  };
}

function validateFindingMetadataFields(input: {
  entry: Record<string, unknown>;
  findingPath: string;
  errors: ValidationError[];
}): {
  refs: string[] | undefined;
  timing: Finding["timing"] | undefined;
  layer: Finding["layer"] | undefined;
  evidence: Finding["evidence"] | undefined;
} {
  const { entry, findingPath, errors } = input;
  const refs = entry.refs;
  const timing = entry.timing;
  const layer = entry.layer;
  const evidence = entry.evidence;

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
    refs: areStringRefs(refs) ? refs : undefined,
    timing: isFindingTiming(timing) ? timing : undefined,
    layer: isFindingLayer(layer) ? layer : undefined,
    evidence: isValidEvidenceValue(evidence) ? evidence : undefined
  };
}

export function collectFindingShapeErrors(input: {
  entry: Record<string, unknown>;
  findingPath: string;
  errors: ValidationError[];
}): ValidatedFindingShape {
  return {
    ...validateFindingPriorityFields(input),
    ...validateFindingTextFields(input),
    ...validateFindingMetadataFields(input)
  };
}

export function buildValidatedFinding(input: {
  resolvedPriority: FindingPriority;
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
  return {
    priority: input.resolvedPriority,
    ...(input.severity !== undefined ? { severity: input.severity } : {}),
    title: input.title,
    ...(input.detail !== undefined ? { detail: input.detail } : {}),
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.refs !== undefined ? { refs: input.refs } : {}),
    ...(input.timing !== undefined ? { timing: input.timing } : {}),
    ...(input.layer !== undefined ? { layer: input.layer } : {}),
    ...(input.evidence !== undefined ? { evidence: input.evidence } : {}),
    ...(input.effectivePriority !== undefined
      ? { effective_priority: input.effectivePriority }
      : {})
  };
}
