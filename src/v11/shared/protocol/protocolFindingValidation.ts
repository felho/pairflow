import { type Finding } from "../../../contracts/kernel/findings.js";
import { isRecord, type ValidationError } from "../validation/primitives.js";
import {
  buildValidatedFinding,
  collectFindingShapeErrors
} from "./protocolFindingValidationHelpers.js";

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
