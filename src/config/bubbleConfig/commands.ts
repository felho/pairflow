import type { BubbleConfig } from "../../types/bubble.js";
import {
  isNonEmptyString,
  type ValidationError
} from "../../v11/shared/validation/primitives.js";
import {
  describeValidationCommandIdRule,
  isValidationCommandId
} from "../../v11/shared/validation/validationCommandId.js";
import {
  readBoolean,
  readString,
  readStringArray
} from "./readers.js";

function resolveValidationCommandString(
  commands: Record<string, unknown> | undefined,
  customCommands: Record<string, string>,
  id: string
): unknown {
  if (id in customCommands) {
    return customCommands[id];
  }
  return commands?.[id];
}

export function validateBubbleCommands(
  commands: Record<string, unknown> | undefined,
  errors: ValidationError[]
): BubbleConfig["commands"] | undefined {
  if (commands === undefined) {
    return undefined;
  }

  const testCommand = readString(commands, "test", "commands.test", errors, true);
  const typecheckCommand = readString(
    commands,
    "typecheck",
    "commands.typecheck",
    errors,
    true
  );
  const lintCommand = readString(commands, "lint", "commands.lint", errors, false);
  const bootstrapCommand = readString(
    commands,
    "bootstrap",
    "commands.bootstrap",
    errors,
    false
  );
  const validationRequired = readStringArray(
    commands,
    "validation_required",
    "commands.validation_required",
    errors,
    false
  );
  const metaReviewApproveRequired = readStringArray(
    commands,
    "meta_review_approve_required",
    "commands.meta_review_approve_required",
    errors,
    false
  );
  const validationRequiredExplicitCandidate = readBoolean(
    commands,
    "validation_required_explicit",
    "commands.validation_required_explicit",
    errors,
    false
  );
  const validationRequiredExplicit =
    validationRequiredExplicitCandidate === true ? true : undefined;
  const customCommands: Record<string, string> = {};
  const fixedCommandKeys = new Set([
    "bootstrap",
    "lint",
    "test",
    "typecheck",
    "meta_review_approve_required",
    "validation_required",
    "validation_required_explicit"
  ]);
  for (const [key, value] of Object.entries(commands)) {
    if (fixedCommandKeys.has(key)) {
      continue;
    }
    if (!isValidationCommandId(key)) {
      errors.push({
        path: `commands.${key}`,
        message: describeValidationCommandIdRule()
      });
      continue;
    }
    if (!isNonEmptyString(value)) {
      errors.push({
        path: `commands.${key}`,
        message: "Must be a non-empty string"
      });
      continue;
    }
    customCommands[key] = value.trim();
  }
  if (validationRequired !== undefined) {
    const seenValidationRequired = new Set<string>();
    validationRequired.forEach((id, index) => {
      if (!isValidationCommandId(id)) {
        errors.push({
          path: `commands.validation_required[${index}]`,
          message: describeValidationCommandIdRule()
        });
        return;
      }
      if (seenValidationRequired.has(id)) {
        errors.push({
          path: `commands.validation_required[${index}]`,
          message: `Duplicate validation command id "${id}"`
        });
        return;
      }
      seenValidationRequired.add(id);
    });
  }
  if (metaReviewApproveRequired !== undefined) {
    const seenMetaReviewApproveRequired = new Set<string>();
    metaReviewApproveRequired.forEach((id, index) => {
      if (!isValidationCommandId(id)) {
        errors.push({
          path: `commands.meta_review_approve_required[${index}]`,
          message: describeValidationCommandIdRule()
        });
        return;
      }
      if (seenMetaReviewApproveRequired.has(id)) {
        errors.push({
          path: `commands.meta_review_approve_required[${index}]`,
          message: `Duplicate validation command id "${id}"`
        });
        return;
      }
      seenMetaReviewApproveRequired.add(id);
      const commandValue = resolveValidationCommandString(
        commands,
        customCommands,
        id
      );
      if (!isNonEmptyString(commandValue)) {
        errors.push({
          path: `commands.${id}`,
          message:
            "Must be a non-empty string for configured meta-review approve validation"
        });
        return;
      }
    });
  }

  return {
    ...(bootstrapCommand !== undefined
      ? { bootstrap: bootstrapCommand }
      : {}),
    ...(lintCommand !== undefined
      ? { lint: lintCommand }
      : {}),
    test: testCommand as string,
    typecheck: typecheckCommand as string,
    ...customCommands,
    ...(metaReviewApproveRequired !== undefined
      ? { meta_review_approve_required: metaReviewApproveRequired }
      : {}),
    ...(validationRequired !== undefined
      ? { validation_required: validationRequired }
      : {}),
    ...(validationRequiredExplicit !== undefined
      ? { validation_required_explicit: validationRequiredExplicit }
      : {})
  };
}
