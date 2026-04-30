import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  SchemaValidationError,
  assertValidation,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../v11/shared/validation/primitives.js";
import {
  describeValidationCommandIdRule,
  isValidationCommandId
} from "../v11/shared/validation/validationCommandId.js";
import { parseToml } from "./bubbleConfig.js";

export interface RepoValidationConfig {
  required?: string[];
  commands?: Record<string, string>;
}

export interface PairflowRepoConfig {
  validation?: RepoValidationConfig;
}

export function resolvePairflowRepoConfigPath(repoPath: string): string {
  return join(repoPath, "pairflow.toml");
}

export function validatePairflowRepoConfig(
  input: unknown
): ValidationResult<PairflowRepoConfig> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [
      {
        path: "$",
        message: "Config must be an object"
      }
      ]
    };
  }

  const allowedTopLevelKeys = new Set(["enforcement_mode", "validation"]);
  for (const key of Object.keys(input)) {
    if (!allowedTopLevelKeys.has(key)) {
      errors.push({
        path: key,
        message:
          `Unsupported top-level Pairflow repo config section "${key}". Supported sections are [validation] and legacy [enforcement_mode].`
      });
    }
  }

  const validation = input.validation;
  if (validation === undefined) {
    return errors.length > 0 ? validationFail(errors) : validationOk({});
  }
  if (!isRecord(validation)) {
    return validationFail([
      {
        path: "validation",
        message: "Must be an object/section"
      }
    ]);
  }

  const allowedValidationKeys = new Set(["required", "commands"]);
  for (const key of Object.keys(validation)) {
    if (!allowedValidationKeys.has(key)) {
      errors.push({
        path: `validation.${key}`,
        message:
          `Unsupported validation field "${key}" in Task 1; target-specific validation config is not supported yet.`
      });
    }
  }

  const validatedValidation: RepoValidationConfig = {};
  const required = validation.required;
  if (required !== undefined) {
    if (!Array.isArray(required)) {
      errors.push({
        path: "validation.required",
        message: "Must be an array of validation command ids"
      });
    } else {
      const seen = new Set<string>();
      const requiredIds: string[] = [];
      required.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          errors.push({
            path: `validation.required[${index}]`,
            message: "Must be a non-empty validation command id string"
          });
          return;
        }
        const id = item.trim();
        if (!isValidationCommandId(id)) {
          errors.push({
            path: `validation.required[${index}]`,
            message: describeValidationCommandIdRule()
          });
          return;
        }
        if (seen.has(id)) {
          errors.push({
            path: `validation.required[${index}]`,
            message: `Duplicate validation command id "${id}"`
          });
          return;
        }
        seen.add(id);
        requiredIds.push(id);
      });
      validatedValidation.required = requiredIds;
    }
  }

  const commands = validation.commands;
  if (commands !== undefined) {
    if (!isRecord(commands)) {
      errors.push({
        path: "validation.commands",
        message: "Must be an object/section"
      });
    } else {
      const validatedCommands: Record<string, string> = {};
      for (const [id, command] of Object.entries(commands)) {
        if (!isValidationCommandId(id)) {
          errors.push({
            path: `validation.commands.${id}`,
            message: describeValidationCommandIdRule()
          });
          continue;
        }
        if (typeof command !== "string" || command.trim().length === 0) {
          errors.push({
            path: `validation.commands.${id}`,
            message: "Must be a non-empty string"
          });
          continue;
        }
        validatedCommands[id] = command.trim();
      }
      validatedValidation.commands = validatedCommands;
    }
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk({ validation: validatedValidation });
}

export function assertValidPairflowRepoConfig(input: unknown): PairflowRepoConfig {
  return assertValidation(validatePairflowRepoConfig(input), "Invalid Pairflow repo config");
}

export function parsePairflowRepoConfigToml(input: string): PairflowRepoConfig {
  const parsed = (() => {
    try {
      return parseToml(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new SchemaValidationError("Invalid Pairflow repo config", [
        {
          path: "$",
          message: reason
        }
      ]);
    }
  })();
  return assertValidPairflowRepoConfig(parsed);
}

export async function loadPairflowRepoConfig(
  repoPath: string,
  path: string = resolvePairflowRepoConfigPath(repoPath)
): Promise<PairflowRepoConfig> {
  const raw = await readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (raw === undefined) {
    return {};
  }

  return parsePairflowRepoConfigToml(raw);
}
