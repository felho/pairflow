import type { BubbleConfig } from "../../v11/shared/config/bubbleConfigTypes.js";
import type { ValidationError } from "../../v11/shared/validation/primitives.js";
import {
  describeValidationTargetIdRule,
  isValidationTargetId
} from "../../v11/shared/validation/validationTargetId.js";
import {
  normalizeValidationTargetCwd,
  normalizeValidationTargetPathSelector
} from "../../v11/shared/validation/validationTargetPaths.js";
import { readString, readStringArray } from "./readers.js";

export function validateBubbleValidationTarget(
  validationTarget: Record<string, unknown> | undefined,
  errors: ValidationError[]
): BubbleConfig["validation_target"] | undefined {
  if (validationTarget === undefined) {
    return undefined;
  }

  const targetId = readString(
    validationTarget,
    "id",
    "validation_target.id",
    errors,
    true
  );
  const targetCwd = readString(
    validationTarget,
    "cwd",
    "validation_target.cwd",
    errors,
    false
  );
  const targetPaths = readStringArray(
    validationTarget,
    "paths",
    "validation_target.paths",
    errors,
    false
  );
  if (
    targetId !== undefined &&
    !isValidationTargetId(targetId)
  ) {
    errors.push({
      path: "validation_target.id",
      message: describeValidationTargetIdRule()
    });
  }
  const normalizedCwd =
    targetCwd !== undefined
      ? normalizeValidationTargetCwd(targetCwd)
      : undefined;
  if (targetCwd !== undefined && normalizedCwd === undefined) {
    errors.push({
      path: "validation_target.cwd",
      message: "Must be a normalized relative path"
    });
  }
  const normalizedPaths: string[] | undefined =
    targetPaths !== undefined ? [] : undefined;
  targetPaths?.forEach((path, index) => {
    const normalizedPath = normalizeValidationTargetPathSelector(path);
    if (normalizedPath === undefined) {
      errors.push({
        path: `validation_target.paths[${index}]`,
        message: "Must be a normalized relative path selector"
      });
      return;
    }
    normalizedPaths?.push(normalizedPath);
  });

  return targetId !== undefined
    ? {
        id: targetId,
        ...(normalizedCwd !== undefined ? { cwd: normalizedCwd } : {}),
        ...(normalizedPaths !== undefined ? { paths: normalizedPaths } : {})
      }
    : undefined;
}
