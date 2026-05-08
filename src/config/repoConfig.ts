import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  SchemaValidationError,
  assertValidation,
  isInteger,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../v11/shared/validation/primitives.js";
import {
  isAgentName
} from "../v11/domain/agentIdentity/agentIdentity.js";
import type {
  AgentName
} from "../v11/domain/agentIdentity/agentIdentity.js";
import type {
  BubbleReviewAutoReworkSeverity,
  BubbleReviewLoopMode
} from "../v11/shared/reviewPolicy/reviewPolicyTypes.js";
import type {
  PairflowCommandProfile,
  ReviewerContextMode
} from "../v11/shared/config/bubbleConfigVocabulary.js";
import {
  isBubbleReviewAutoReworkSeverity,
  isBubbleReviewLoopMode
} from "../v11/shared/reviewPolicy/reviewPolicyTypes.js";
import {
  isPairflowCommandProfile,
  isReviewerContextMode
} from "../v11/shared/config/bubbleConfigVocabulary.js";
import {
  builtInValidationCommandIds,
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

const builtInValidationCommandIdSet = new Set<string>(
  builtInValidationCommandIds
);

export interface RepoValidationTargetConfig {
  commands: Record<string, string>;
  required: string[];
  default?: boolean;
  cwd?: string;
  paths?: string[];
}

export interface RepoValidationConfig {
  required?: string[];
  meta_review_approve_required?: string[];
  commands?: Record<string, string>;
  targets?: Record<string, RepoValidationTargetConfig>;
}

export interface RepoDefaultsAgentsConfig {
  implementer?: AgentName;
  reviewer?: AgentName;
  meta_reviewer?: AgentName;
}

export interface RepoDefaultsReviewPolicyConfig {
  review_loop_mode?: BubbleReviewLoopMode;
  reviewer_blocking_min_severity?: BubbleReviewAutoReworkSeverity;
  meta_review_auto_rework_min_severity?: BubbleReviewAutoReworkSeverity;
  meta_review_consecutive_clean_runs_required?: number;
}

export interface RepoDefaultsDocContractGatesConfig {
  round_gate_applies_after?: number;
}

export interface RepoDefaultsConfig {
  base_branch?: string;
  watchdog_timeout_minutes?: number;
  max_rounds?: number;
  severity_gate_round?: number;
  pairflow_command_profile?: PairflowCommandProfile;
  reviewer_context_mode?: ReviewerContextMode;
  agents?: RepoDefaultsAgentsConfig;
  review_policy?: RepoDefaultsReviewPolicyConfig;
  doc_contract_gates?: RepoDefaultsDocContractGatesConfig;
}

export interface RepoPlanWatchRunnerConfig {
  backend?: string;
}

export interface RepoPlanWatchConfig {
  runner?: RepoPlanWatchRunnerConfig;
}

export interface PairflowRepoConfig {
  defaults?: RepoDefaultsConfig;
  validation?: RepoValidationConfig;
  plan_watch?: RepoPlanWatchConfig;
}

function readOptionalNonEmptyString(input: {
  source: Record<string, unknown>;
  key: string;
  path: string;
  errors: ValidationError[];
}): string | undefined {
  const value = input.source[input.key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    input.errors.push({
      path: input.path,
      message: "Must be a non-empty string"
    });
    return undefined;
  }
  return value.trim();
}

function readOptionalInteger(input: {
  source: Record<string, unknown>;
  key: string;
  path: string;
  errors: ValidationError[];
  isValid: (value: number) => boolean;
  message: string;
}): number | undefined {
  const value = input.source[input.key];
  if (value === undefined) {
    return undefined;
  }
  if (!isInteger(value) || !input.isValid(value)) {
    input.errors.push({
      path: input.path,
      message: input.message
    });
    return undefined;
  }
  return value;
}

function readOptionalEnum<T extends string>(input: {
  source: Record<string, unknown>;
  key: string;
  path: string;
  errors: ValidationError[];
  isValid: (value: unknown) => value is T;
  message: string;
}): T | undefined {
  const value = input.source[input.key];
  if (value === undefined) {
    return undefined;
  }
  if (!input.isValid(value)) {
    input.errors.push({
      path: input.path,
      message: input.message
    });
    return undefined;
  }
  return value;
}

function collectValidationTargetCommandIds(targets: unknown): Set<string> {
  const commandIds = new Set<string>();
  if (!isRecord(targets)) {
    return commandIds;
  }
  for (const targetConfig of Object.values(targets)) {
    if (!isRecord(targetConfig) || !isRecord(targetConfig.commands)) {
      continue;
    }
    for (const [id, command] of Object.entries(targetConfig.commands)) {
      if (
        isValidationCommandId(id)
        && typeof command === "string"
        && command.trim().length > 0
      ) {
        commandIds.add(id);
      }
    }
  }
  return commandIds;
}

function validateRepoDefaultsConfig(
  defaults: unknown,
  errors: ValidationError[]
): RepoDefaultsConfig | undefined {
  if (defaults === undefined) {
    return undefined;
  }
  if (!isRecord(defaults)) {
    errors.push({
      path: "defaults",
      message: "Must be an object/section"
    });
    return undefined;
  }

  const allowedDefaultsKeys = new Set([
    "base_branch",
    "watchdog_timeout_minutes",
    "max_rounds",
    "severity_gate_round",
    "pairflow_command_profile",
    "reviewer_context_mode",
    "agents",
    "review_policy",
    "doc_contract_gates"
  ]);
  for (const key of Object.keys(defaults)) {
    if (!allowedDefaultsKeys.has(key)) {
      errors.push({
        path: `defaults.${key}`,
        message: `Unsupported defaults field "${key}".`
      });
    }
  }

  const validated: RepoDefaultsConfig = {};
  const baseBranch = readOptionalNonEmptyString({
    source: defaults,
    key: "base_branch",
    path: "defaults.base_branch",
    errors
  });
  if (baseBranch !== undefined) {
    validated.base_branch = baseBranch;
  }
  const watchdogTimeoutMinutes = readOptionalInteger({
    source: defaults,
    key: "watchdog_timeout_minutes",
    path: "defaults.watchdog_timeout_minutes",
    errors,
    isValid: (value) => value > 0,
    message: "Must be a positive integer"
  });
  if (watchdogTimeoutMinutes !== undefined) {
    validated.watchdog_timeout_minutes = watchdogTimeoutMinutes;
  }
  const maxRounds = readOptionalInteger({
    source: defaults,
    key: "max_rounds",
    path: "defaults.max_rounds",
    errors,
    isValid: (value) => value > 0,
    message: "Must be a positive integer"
  });
  if (maxRounds !== undefined) {
    validated.max_rounds = maxRounds;
  }
  const severityGateRound = readOptionalInteger({
    source: defaults,
    key: "severity_gate_round",
    path: "defaults.severity_gate_round",
    errors,
    isValid: (value) => value >= 4,
    message: "SEVERITY_GATE_ROUND_INVALID: Must be an integer >= 4"
  });
  if (severityGateRound !== undefined) {
    validated.severity_gate_round = severityGateRound;
  }
  const pairflowCommandProfile = readOptionalEnum({
    source: defaults,
    key: "pairflow_command_profile",
    path: "defaults.pairflow_command_profile",
    errors,
    isValid: isPairflowCommandProfile,
    message: "PAIRFLOW_COMMAND_PROFILE_INVALID: Must be one of: external, self_host"
  });
  if (pairflowCommandProfile !== undefined) {
    validated.pairflow_command_profile = pairflowCommandProfile;
  }
  const reviewerContextMode = readOptionalEnum({
    source: defaults,
    key: "reviewer_context_mode",
    path: "defaults.reviewer_context_mode",
    errors,
    isValid: isReviewerContextMode,
    message: "Must be one of: fresh, persistent"
  });
  if (reviewerContextMode !== undefined) {
    validated.reviewer_context_mode = reviewerContextMode;
  }

  const agents = defaults.agents;
  if (agents !== undefined) {
    if (!isRecord(agents)) {
      errors.push({ path: "defaults.agents", message: "Must be an object/section" });
    } else {
      const allowedAgentKeys = new Set(["implementer", "reviewer", "meta_reviewer"]);
      for (const key of Object.keys(agents)) {
        if (!allowedAgentKeys.has(key)) {
          errors.push({
            path: `defaults.agents.${key}`,
            message: `Unsupported defaults.agents field "${key}".`
          });
        }
      }
      const validatedAgents: RepoDefaultsAgentsConfig = {};
      const agentKeys = [
        "implementer",
        "reviewer",
        "meta_reviewer"
      ] as const;
      for (const key of agentKeys) {
        const value = readOptionalEnum({
          source: agents,
          key,
          path: `defaults.agents.${key}`,
          errors,
          isValid: isAgentName,
          message: "Must be one of: codex, claude"
        });
        if (value !== undefined) {
          validatedAgents[key] = value;
        }
      }
      if (Object.keys(validatedAgents).length > 0) {
        validated.agents = validatedAgents;
      }
    }
  }

  const reviewPolicy = defaults.review_policy;
  if (reviewPolicy !== undefined) {
    if (!isRecord(reviewPolicy)) {
      errors.push({
        path: "defaults.review_policy",
        message: "Must be an object/section"
      });
    } else {
      const allowedReviewPolicyKeys = new Set([
        "review_loop_mode",
        "reviewer_blocking_min_severity",
        "meta_review_auto_rework_min_severity",
        "meta_review_consecutive_clean_runs_required"
      ]);
      for (const key of Object.keys(reviewPolicy)) {
        if (!allowedReviewPolicyKeys.has(key)) {
          errors.push({
            path: `defaults.review_policy.${key}`,
            message: `Unsupported defaults.review_policy field "${key}".`
          });
        }
      }
      const validatedPolicy: RepoDefaultsReviewPolicyConfig = {};
      const reviewLoopMode = readOptionalEnum({
        source: reviewPolicy,
        key: "review_loop_mode",
        path: "defaults.review_policy.review_loop_mode",
        errors,
        isValid: isBubbleReviewLoopMode,
        message: "REVIEW_POLICY_LOOP_MODE_INVALID: Must be one of: full, meta_only"
      });
      if (reviewLoopMode !== undefined) {
        validatedPolicy.review_loop_mode = reviewLoopMode;
      }
      const reviewerSeverity = readOptionalEnum({
        source: reviewPolicy,
        key: "reviewer_blocking_min_severity",
        path: "defaults.review_policy.reviewer_blocking_min_severity",
        errors,
        isValid: isBubbleReviewAutoReworkSeverity,
        message: "REVIEW_POLICY_THRESHOLD_INVALID: Must be one of: P1, P2, P3"
      });
      if (reviewerSeverity !== undefined) {
        validatedPolicy.reviewer_blocking_min_severity = reviewerSeverity;
      }
      const metaSeverity = readOptionalEnum({
        source: reviewPolicy,
        key: "meta_review_auto_rework_min_severity",
        path: "defaults.review_policy.meta_review_auto_rework_min_severity",
        errors,
        isValid: isBubbleReviewAutoReworkSeverity,
        message: "REVIEW_POLICY_THRESHOLD_INVALID: Must be one of: P1, P2, P3"
      });
      if (metaSeverity !== undefined) {
        validatedPolicy.meta_review_auto_rework_min_severity = metaSeverity;
      }
      const cleanRuns = readOptionalInteger({
        source: reviewPolicy,
        key: "meta_review_consecutive_clean_runs_required",
        path: "defaults.review_policy.meta_review_consecutive_clean_runs_required",
        errors,
        isValid: (value) => value >= 1,
        message:
          "REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID: Must be an integer >= 1"
      });
      if (cleanRuns !== undefined) {
        validatedPolicy.meta_review_consecutive_clean_runs_required = cleanRuns;
      }
      if (Object.keys(validatedPolicy).length > 0) {
        validated.review_policy = validatedPolicy;
      }
    }
  }

  const docContractGates = defaults.doc_contract_gates;
  if (docContractGates !== undefined) {
    if (!isRecord(docContractGates)) {
      errors.push({
        path: "defaults.doc_contract_gates",
        message: "Must be an object/section"
      });
    } else {
      const allowedDocContractGateKeys = new Set(["round_gate_applies_after"]);
      for (const key of Object.keys(docContractGates)) {
        if (!allowedDocContractGateKeys.has(key)) {
          errors.push({
            path: `defaults.doc_contract_gates.${key}`,
            message: `Unsupported defaults.doc_contract_gates field "${key}".`
          });
        }
      }
      const roundGateAppliesAfter = readOptionalInteger({
        source: docContractGates,
        key: "round_gate_applies_after",
        path: "defaults.doc_contract_gates.round_gate_applies_after",
        errors,
        isValid: (value) => value >= 0,
        message: "Must be a non-negative integer"
      });
      if (roundGateAppliesAfter !== undefined) {
        validated.doc_contract_gates = {
          round_gate_applies_after: roundGateAppliesAfter
        };
      }
    }
  }

  return validated;
}

function validateRepoPlanWatchConfig(
  planWatch: unknown,
  errors: ValidationError[]
): RepoPlanWatchConfig | undefined {
  if (planWatch === undefined) {
    return undefined;
  }
  if (!isRecord(planWatch)) {
    errors.push({
      path: "plan_watch",
      message: "Must be an object/section"
    });
    return undefined;
  }

  const allowedPlanWatchKeys = new Set(["runner"]);
  for (const key of Object.keys(planWatch)) {
    if (!allowedPlanWatchKeys.has(key)) {
      errors.push({
        path: `plan_watch.${key}`,
        message: `Unsupported plan_watch field "${key}".`
      });
    }
  }

  const runner = planWatch.runner;
  if (runner === undefined) {
    return {};
  }
  if (!isRecord(runner)) {
    errors.push({
      path: "plan_watch.runner",
      message: "Must be an object/section"
    });
    return undefined;
  }

  const allowedRunnerKeys = new Set(["backend"]);
  for (const key of Object.keys(runner)) {
    if (!allowedRunnerKeys.has(key)) {
      errors.push({
        path: `plan_watch.runner.${key}`,
        message: `Unsupported plan_watch.runner field "${key}".`
      });
    }
  }

  const validatedRunner: RepoPlanWatchRunnerConfig = {};
  const backend = readOptionalNonEmptyString({
    source: runner,
    key: "backend",
    path: "plan_watch.runner.backend",
    errors
  });
  if (backend !== undefined) {
    validatedRunner.backend = backend;
  }

  return { runner: validatedRunner };
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

  const allowedTopLevelKeys = new Set([
    "enforcement_mode",
    "validation",
    "defaults",
    "plan_watch"
  ]);
  for (const key of Object.keys(input)) {
    if (!allowedTopLevelKeys.has(key)) {
      errors.push({
        path: key,
        message:
          `Unsupported top-level Pairflow repo config section "${key}". Supported sections are [defaults], [plan_watch], [validation], and legacy [enforcement_mode].`
      });
    }
  }

  const defaults = validateRepoDefaultsConfig(input.defaults, errors);
  const planWatch = validateRepoPlanWatchConfig(input.plan_watch, errors);
  const validation = input.validation;
  if (validation === undefined) {
    return errors.length > 0
      ? validationFail(errors)
      : validationOk({
          ...(defaults !== undefined ? { defaults } : {}),
          ...(planWatch !== undefined ? { plan_watch: planWatch } : {})
        });
  }
  if (!isRecord(validation)) {
    errors.push({
      path: "validation",
      message: "Must be an object/section"
    });
    return validationFail(errors);
  }

  const allowedValidationKeys = new Set([
    "required",
    "meta_review_approve_required",
    "commands",
    "targets"
  ]);
  for (const key of Object.keys(validation)) {
    if (!allowedValidationKeys.has(key)) {
      errors.push({
        path: `validation.${key}`,
        message: `Unsupported validation field "${key}".`
      });
    }
  }

  const validatedValidation: RepoValidationConfig = {};
  const readValidationCommandIdList = (
    value: unknown,
    path: "validation.required" | "validation.meta_review_approve_required"
  ): string[] | undefined => {
    if (value === undefined) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      errors.push({
        path,
        message: "Must be an array of validation command ids"
      });
      return undefined;
    }

    const seen = new Set<string>();
    const requiredIds: string[] = [];
    value.forEach((item, index) => {
      if (typeof item !== "string" || item.trim().length === 0) {
        errors.push({
          path: `${path}[${index}]`,
          message: "Must be a non-empty validation command id string"
        });
        return;
      }
      const id = item.trim();
      if (!isValidationCommandId(id)) {
        errors.push({
          path: `${path}[${index}]`,
          message: describeValidationCommandIdRule()
        });
        return;
      }
      if (seen.has(id)) {
        errors.push({
          path: `${path}[${index}]`,
          message: `Duplicate validation command id "${id}"`
        });
        return;
      }
      seen.add(id);
      requiredIds.push(id);
    });
    return requiredIds;
  };

  const required = readValidationCommandIdList(
    validation.required,
    "validation.required"
  );
  if (required !== undefined) {
    validatedValidation.required = required;
  }
  const metaReviewApproveRequired = readValidationCommandIdList(
    validation.meta_review_approve_required,
    "validation.meta_review_approve_required"
  );
  if (metaReviewApproveRequired !== undefined) {
    validatedValidation.meta_review_approve_required =
      metaReviewApproveRequired;
  }

  const commands = validation.commands;
  const validationCommandIds = new Set<string>();
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
        validationCommandIds.add(id);
      }
      validatedValidation.commands = validatedCommands;
    }
  }
  const targetValidationCommandIds = collectValidationTargetCommandIds(
    validation.targets
  );
  metaReviewApproveRequired?.forEach((id, index) => {
    if (
      validationCommandIds.has(id)
      || targetValidationCommandIds.has(id)
      || builtInValidationCommandIdSet.has(id)
    ) {
      return;
    }
    errors.push({
      path: `validation.meta_review_approve_required[${index}]`,
      message:
        `validation.meta_review_approve_required references "${id}", but no `
        + `validation.commands.${id} or validation.targets.*.commands.${id} `
        + "entry is configured"
    });
  });

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

  return validationOk({
    ...(defaults !== undefined ? { defaults } : {}),
    ...(planWatch !== undefined ? { plan_watch: planWatch } : {}),
    validation: validatedValidation
  });
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
