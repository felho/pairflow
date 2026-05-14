import { type Finding } from "../../../contracts/kernel/findings.js";
import type { ProtocolAdvisoryFinding } from "./protocolEnvelopeContract.js";
import { isRecord, type ValidationError } from "../validation/primitives.js";
import {
  buildValidatedFinding,
  collectFindingShapeErrors
} from "./protocolFindingValidationHelpers.js";

function isProtocolAdvisorySeverity(value: unknown): value is "P2" | "P3" {
  return value === "P2" || value === "P3";
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && entry.trim().length > 0);
}

function normalizeAdvisoryRefs(value: string[] | undefined): string[] | undefined {
  return value?.map((entry) => entry.trim());
}

export function validateAdvisoryFindings(
  input: unknown,
  path: string,
  errors: ValidationError[]
): ProtocolAdvisoryFinding[] | undefined {
  if (!Array.isArray(input)) {
    errors.push({
      path,
      message: "Must be an array"
    });
    return undefined;
  }

  const findings: ProtocolAdvisoryFinding[] = [];
  input.forEach((entry, index) => {
    const findingPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      errors.push({
        path: findingPath,
        message: "Must be an object"
      });
      return;
    }

    const severity = entry.severity;
    const title = entry.title;
    const refs = entry.refs;
    const allowedKeys = new Set(["severity", "title", "refs"]);
    for (const key of Object.keys(entry)) {
      if (!allowedKeys.has(key)) {
        errors.push({
          path: `${findingPath}.${key}`,
          message: "Advisory findings only allow severity, title, and refs"
        });
      }
    }
    if (!isProtocolAdvisorySeverity(severity)) {
      errors.push({
        path: `${findingPath}.severity`,
        message: "Must be one of: P2, P3"
      });
    }
    if (typeof title !== "string" || title.trim().length === 0) {
      errors.push({
        path: `${findingPath}.title`,
        message: "Must be a non-empty string"
      });
    }
    if (refs !== undefined && !isNonEmptyStringArray(refs)) {
      errors.push({
        path: `${findingPath}.refs`,
        message: "Must be an array of non-empty strings when provided"
      });
    }

    const refsValid = refs === undefined || isNonEmptyStringArray(refs);
    if (
      isProtocolAdvisorySeverity(severity) &&
      typeof title === "string" &&
      title.trim().length > 0 &&
      refsValid
    ) {
      const normalizedRefs = normalizeAdvisoryRefs(refs);
      findings.push({
        severity,
        title: title.trim(),
        ...(normalizedRefs !== undefined
          ? { refs: normalizedRefs }
          : {})
      });
    }
  });

  return findings;
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
