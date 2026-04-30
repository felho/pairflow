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
import {
  describeValidationTargetIdRule,
  isValidationTargetId
} from "../v11/shared/validation/validationTargetId.js";
import {
  normalizeValidationTargetCwd,
  normalizeValidationTargetPathSelector
} from "../v11/shared/validation/validationTargetPaths.js";
import { parseToml } from "./bubbleConfig.js";

export const VALIDATION_TARGET_DEFAULT_NOT_UNIQUE =
  "VALIDATION_TARGET_DEFAULT_NOT_UNIQUE" as const;
export const VALIDATION_TARGET_ID_INVALID =
  "VALIDATION_TARGET_ID_INVALID" as const;
export const VALIDATION_TARGET_PATH_SELECTOR_INVALID =
  "VALIDATION_TARGET_PATH_SELECTOR_INVALID" as const;
export const VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE =
  "VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE" as const;
export const VALIDATION_TARGET_CWD_INVALID =
  "VALIDATION_TARGET_CWD_INVALID" as const;

export interface RepoValidationTargetConfig {
  commands: Record<string, string>;
  required: string[];
  default?: boolean;
  cwd?: string;
  paths?: string[];
}

export interface RepoValidationConfig {
  required?: string[];
  commands?: Record<string, string>;
  targets?: Record<string, RepoValidationTargetConfig>;
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

  const allowedValidationKeys = new Set(["required", "commands", "targets"]);
  for (const key of Object.keys(validation)) {
    if (!allowedValidationKeys.has(key)) {
      errors.push({
        path: `validation.${key}`,
        message: `Unsupported validation field "${key}".`
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

  const targets = validation.targets;
  if (targets !== undefined) {
    if (!isRecord(targets)) {
      errors.push({
        path: "validation.targets",
        message: "Must be an object/section"
      });
    } else {
      const validatedTargets: Record<string, RepoValidationTargetConfig> = {};
      let defaultTargetCount = 0;
      for (const [targetId, targetConfig] of Object.entries(targets)) {
        const targetPath = `validation.targets.${targetId}`;
        if (!isValidationTargetId(targetId)) {
          errors.push({
            path: targetPath,
            message: `${VALIDATION_TARGET_ID_INVALID}: ${describeValidationTargetIdRule()}`
          });
          continue;
        }
        if (!isRecord(targetConfig)) {
          errors.push({ path: targetPath, message: "Must be an object/section" });
          continue;
        }

        const targetAllowedKeys = new Set([
          "commands",
          "required",
          "default",
          "cwd",
          "paths"
        ]);
        for (const key of Object.keys(targetConfig)) {
          if (!targetAllowedKeys.has(key)) {
            errors.push({
              path: `${targetPath}.${key}`,
              message: `Unsupported validation target field "${key}".`
            });
          }
        }

        const targetCommands: Record<string, string> = {};
        if (!isRecord(targetConfig.commands)) {
          errors.push({
            path: `${targetPath}.commands`,
            message: "Must be an object/section"
          });
        } else {
          for (const [id, command] of Object.entries(targetConfig.commands)) {
            if (!isValidationCommandId(id)) {
              errors.push({
                path: `${targetPath}.commands.${id}`,
                message: describeValidationCommandIdRule()
              });
              continue;
            }
            if (typeof command !== "string" || command.trim().length === 0) {
              errors.push({
                path: `${targetPath}.commands.${id}`,
                message: "Must be a non-empty string"
              });
              continue;
            }
            targetCommands[id] = command.trim();
          }
        }

        const targetRequired: string[] = [];
        if (!Array.isArray(targetConfig.required)) {
          errors.push({
            path: `${targetPath}.required`,
            message: "Must be an array of validation command ids"
          });
        } else {
          const seen = new Set<string>();
          targetConfig.required.forEach((item, index) => {
            if (typeof item !== "string" || item.trim().length === 0) {
              errors.push({
                path: `${targetPath}.required[${index}]`,
                message: "Must be a non-empty validation command id string"
              });
              return;
            }
            const id = item.trim();
            if (!isValidationCommandId(id)) {
              errors.push({
                path: `${targetPath}.required[${index}]`,
                message: describeValidationCommandIdRule()
              });
              return;
            }
            if (seen.has(id)) {
              errors.push({
                path: `${targetPath}.required[${index}]`,
                message: `Duplicate validation command id "${id}"`
              });
              return;
            }
            seen.add(id);
            targetRequired.push(id);
          });
        }

        const validatedTarget: RepoValidationTargetConfig = {
          commands: targetCommands,
          required: targetRequired
        };

        if (targetConfig.default !== undefined) {
          if (typeof targetConfig.default !== "boolean") {
            errors.push({
              path: `${targetPath}.default`,
              message: "Must be a boolean"
            });
          } else if (targetConfig.default) {
            defaultTargetCount += 1;
            validatedTarget.default = true;
          }
        }

        if (targetConfig.cwd !== undefined) {
          if (typeof targetConfig.cwd !== "string") {
            errors.push({
              path: `${targetPath}.cwd`,
              message: `${VALIDATION_TARGET_CWD_INVALID}: Must be a non-empty string`
            });
          } else {
            const normalizedCwd =
              normalizeValidationTargetCwd(targetConfig.cwd);
            if (normalizedCwd === undefined) {
              errors.push({
                path: `${targetPath}.cwd`,
                message: `${VALIDATION_TARGET_CWD_INVALID}: Must be a non-empty normalized relative path`
              });
            } else {
              validatedTarget.cwd = normalizedCwd;
            }
          }
        }

        if (targetConfig.paths !== undefined) {
          if (!Array.isArray(targetConfig.paths)) {
            errors.push({
              path: `${targetPath}.paths`,
              message: "Must be an array of path selectors"
            });
          } else {
            const validatedPaths: string[] = [];
            targetConfig.paths.forEach((item, index) => {
              if (typeof item !== "string") {
                errors.push({
                  path: `${targetPath}.paths[${index}]`,
                  message: `${VALIDATION_TARGET_PATH_SELECTOR_INVALID}: Must be a non-empty normalized relative path selector`
                });
                return;
              }
              const normalizedPath = normalizeValidationTargetPathSelector(item);
              if (normalizedPath === undefined) {
                errors.push({
                  path: `${targetPath}.paths[${index}]`,
                  message: `${VALIDATION_TARGET_PATH_SELECTOR_INVALID}: Must be a non-empty normalized relative path selector`
                });
                return;
              }
              validatedPaths.push(normalizedPath);
            });
            validatedTarget.paths = validatedPaths;
          }
        }

        validatedTargets[targetId] = validatedTarget;
      }
      if (defaultTargetCount > 1) {
        errors.push({
          path: "validation.targets",
          message: `${VALIDATION_TARGET_DEFAULT_NOT_UNIQUE}: At most one validation target may set default=true.`
        });
      }
      validatedValidation.targets = validatedTargets;
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
