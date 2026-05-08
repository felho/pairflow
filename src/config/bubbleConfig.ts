import {
  assertValidation,
  isInteger,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../v11/shared/validation/primitives.js";
import {
  DEFAULT_COMMIT_REQUIRES_APPROVAL,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_PAIRFLOW_COMMAND_PROFILE,
  DEFAULT_QUALITY_MODE,
  DEFAULT_REVIEW_ARTIFACT_TYPE,
  DEFAULT_REVIEWER_CONTEXT_MODE,
  DEFAULT_SEVERITY_GATE_ROUND,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "./defaults.js";
import {
  isPairflowCommandProfile,
  isQualityMode,
  isReviewArtifactType,
  isReviewerContextMode,
  isWorkMode,
  type BubbleConfig
} from "../types/bubble.js";
import {
  isAttachLauncher,
  type AttachLauncher
} from "../v11/shared/bubbleAttachment/attachLauncherTypes.js";
import type { PairflowGlobalConfig } from "./pairflowConfig.js";
import { validateBubbleAgents } from "./bubbleConfig/agents.js";
import { SEVERITY_GATE_ROUND_INVALID } from "./bubbleConfig/errors.js";
import { validateBubbleExecutor } from "./bubbleConfig/executor.js";
import { validateBubbleDocContractGates } from "./bubbleConfig/docContractGates.js";
import { parseToml } from "./bubbleConfig/parser.js";
import {
  readObject,
  readString
} from "./bubbleConfig/readers.js";
import { validateBubbleCommands } from "./bubbleConfig/commands.js";
import { validateBubbleIdeation } from "./bubbleConfig/ideation.js";
import { validateBubbleLocalOverlay } from "./bubbleConfig/localOverlay.js";
import { validateBubbleNotifications } from "./bubbleConfig/notifications.js";
import { assertValidBubbleConfigRemoteReferences } from "./bubbleConfig/remoteReferences.js";
import { validateBubbleReviewPolicy } from "./bubbleConfig/reviewPolicy.js";
import { validateBubbleValidationTarget } from "./bubbleConfig/validationTarget.js";

export {
  assertCreateReviewArtifactType,
  assertPairflowCommandProfile,
  BUBBLE_EXECUTOR_INVALID,
  DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER,
  INVALID_REVIEW_ARTIFACT_TYPE_OPTION,
  MISSING_REVIEW_ARTIFACT_TYPE_OPTION,
  PAIRFLOW_COMMAND_PROFILE_INVALID,
  REVIEW_ARTIFACT_TYPE_AUTO_REMOVED,
  REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID,
  REVIEW_POLICY_INVALID,
  REVIEW_POLICY_LOOP_MODE_INVALID,
  REVIEW_POLICY_THRESHOLD_INVALID,
  SEVERITY_GATE_ROUND_INVALID
} from "./bubbleConfig/errors.js";
export { parseToml, TOML_PARSER_LIMITATIONS } from "./bubbleConfig/parser.js";
export {
  assertValidBubbleConfigRemoteReferences,
  validateBubbleConfigRemoteReferences
} from "./bubbleConfig/remoteReferences.js";
export { renderBubbleConfigToml } from "./bubbleConfig/render.js";

export function validateBubbleConfig(input: unknown): ValidationResult<BubbleConfig> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([{ path: "$", message: "Config must be an object" }]);
  }

  const id = readString(input, "id", "id", errors, true);
  const bubbleInstanceId = readString(
    input,
    "bubble_instance_id",
    "bubble_instance_id",
    errors,
    false
  );
  if (
    bubbleInstanceId !== undefined &&
    !/^[A-Za-z0-9][A-Za-z0-9_-]{9,127}$/u.test(bubbleInstanceId)
  ) {
    errors.push({
      path: "bubble_instance_id",
      message:
        "Must be 10-128 chars and contain only letters, digits, '_' or '-'"
    });
  }
  const repoPath = readString(input, "repo_path", "repo_path", errors, true);
  const baseBranch = readString(input, "base_branch", "base_branch", errors, true);
  const bubbleBranch = readString(
    input,
    "bubble_branch",
    "bubble_branch",
    errors,
    true
  );

  const workMode = input.work_mode ?? DEFAULT_WORK_MODE;
  if (!isWorkMode(workMode)) {
    errors.push({
      path: "work_mode",
      message: "Must be one of: worktree, clone"
    });
  }

  const qualityMode = input.quality_mode ?? DEFAULT_QUALITY_MODE;
  if (!isQualityMode(qualityMode)) {
    errors.push({
      path: "quality_mode",
      message: "MVP only supports strict quality mode"
    });
  }

  const reviewArtifactType =
    input.review_artifact_type ?? DEFAULT_REVIEW_ARTIFACT_TYPE;
  if (!isReviewArtifactType(reviewArtifactType)) {
    errors.push({
      path: "review_artifact_type",
      message: "Must be one of: code, document"
    });
  }

  const pairflowCommandProfile =
    input.pairflow_command_profile ?? DEFAULT_PAIRFLOW_COMMAND_PROFILE;
  if (!isPairflowCommandProfile(pairflowCommandProfile)) {
    errors.push({
      path: "pairflow_command_profile",
      message: "Must be one of: external, self_host"
    });
  }

  const reviewerContextMode =
    input.reviewer_context_mode ?? DEFAULT_REVIEWER_CONTEXT_MODE;
  if (!isReviewerContextMode(reviewerContextMode)) {
    errors.push({
      path: "reviewer_context_mode",
      message: "Must be one of: fresh, persistent"
    });
  }

  const watchdogTimeoutMinutes =
    input.watchdog_timeout_minutes ?? DEFAULT_WATCHDOG_TIMEOUT_MINUTES;
  if (!isInteger(watchdogTimeoutMinutes) || watchdogTimeoutMinutes <= 0) {
    errors.push({
      path: "watchdog_timeout_minutes",
      message: "Must be a positive integer"
    });
  }

  const maxRounds = input.max_rounds ?? DEFAULT_MAX_ROUNDS;
  if (!isInteger(maxRounds) || maxRounds <= 0) {
    errors.push({
      path: "max_rounds",
      message: "Must be a positive integer"
    });
  }

  const severityGateRound =
    input.severity_gate_round ?? DEFAULT_SEVERITY_GATE_ROUND;
  if (!isInteger(severityGateRound) || severityGateRound < 4) {
    errors.push({
      path: "severity_gate_round",
      message: `${SEVERITY_GATE_ROUND_INVALID}: Must be an integer >= 4`
    });
  }

  const commitRequiresApproval =
    input.commit_requires_approval ?? DEFAULT_COMMIT_REQUIRES_APPROVAL;
  if (typeof commitRequiresApproval !== "boolean") {
    errors.push({
      path: "commit_requires_approval",
      message: "Must be a boolean"
    });
  }

  const accuracyCritical = input.accuracy_critical ?? false;
  if (typeof accuracyCritical !== "boolean") {
    errors.push({
      path: "accuracy_critical",
      message: "Must be a boolean"
    });
  }

  const attachLauncher = input.attach_launcher;
  if (attachLauncher !== undefined && !isAttachLauncher(attachLauncher)) {
    errors.push({
      path: "attach_launcher",
      message: "Must be one of: auto, warp, iterm2, terminal, ghostty, copy"
    });
  }

  const openCommand = readString(input, "open_command", "open_command", errors, false);
  const openRemoteCommand = readString(
    input,
    "open_remote_command",
    "open_remote_command",
    errors,
    false
  );

  const agents = readObject(input, "agents", "agents", errors, true);
  const commands = readObject(input, "commands", "commands", errors, true);
  const notifications = readObject(
    input,
    "notifications",
    "notifications",
    errors,
    false
  );
  const localOverlay = readObject(
    input,
    "local_overlay",
    "local_overlay",
    errors,
    false
  );
  const docContractGates = readObject(
    input,
    "doc_contract_gates",
    "doc_contract_gates",
    errors,
    false
  );
  const ideation = readObject(
    input,
    "ideation",
    "ideation",
    errors,
    false
  );
  const executor = readObject(
    input,
    "executor",
    "executor",
    errors,
    false
  );
  const reviewPolicy = readObject(
    input,
    "review_policy",
    "review_policy",
    errors,
    false
  );
  const validationTarget = readObject(
    input,
    "validation_target",
    "validation_target",
    errors,
    false
  );

  const validatedAgents = validateBubbleAgents(agents, errors);

  const validatedCommands = validateBubbleCommands(commands, errors);

  const validatedValidationTarget = validateBubbleValidationTarget(
    validationTarget,
    errors
  );

  const validatedNotifications = validateBubbleNotifications(
    notifications,
    errors
  );

  const validatedLocalOverlay = validateBubbleLocalOverlay(localOverlay, errors);

  const validatedDocContractGates = validateBubbleDocContractGates(
    docContractGates,
    errors
  );

  const validatedIdeation = validateBubbleIdeation(ideation, errors);

  const validatedReviewPolicy = validateBubbleReviewPolicy(reviewPolicy, errors);

  const validatedExecutor = validateBubbleExecutor(executor, errors);

  if (errors.length > 0) {
    return validationFail(errors);
  }

  const validatedConfig: BubbleConfig = {
    id: id as string,
    ...(bubbleInstanceId !== undefined
      ? { bubble_instance_id: bubbleInstanceId }
      : {}),
    repo_path: repoPath as string,
    base_branch: baseBranch as string,
    bubble_branch: bubbleBranch as string,
    work_mode: workMode as BubbleConfig["work_mode"],
    quality_mode: qualityMode as BubbleConfig["quality_mode"],
    review_artifact_type:
      reviewArtifactType as BubbleConfig["review_artifact_type"],
    pairflow_command_profile:
      pairflowCommandProfile as BubbleConfig["pairflow_command_profile"],
    reviewer_context_mode:
      reviewerContextMode as BubbleConfig["reviewer_context_mode"],
    watchdog_timeout_minutes: watchdogTimeoutMinutes as number,
    max_rounds: maxRounds as number,
    severity_gate_round: severityGateRound as number,
    commit_requires_approval: commitRequiresApproval as boolean,
    accuracy_critical: accuracyCritical as boolean,
    ...(attachLauncher !== undefined
      ? { attach_launcher: attachLauncher as AttachLauncher }
      : {}),
    ...(validatedReviewPolicy !== undefined
      ? { review_policy: validatedReviewPolicy }
      : {}),
    ...(validatedValidationTarget !== undefined
      ? { validation_target: validatedValidationTarget }
      : {}),
    agents: validatedAgents,
    commands: validatedCommands as BubbleConfig["commands"],
    notifications: validatedNotifications,
    local_overlay: validatedLocalOverlay,
    doc_contract_gates: validatedDocContractGates,
    ...(validatedIdeation !== undefined
      ? { ideation: validatedIdeation }
      : {}),
    ...(validatedExecutor !== undefined
      ? { executor: validatedExecutor }
      : {})
  };

  if (openCommand !== undefined) {
    validatedConfig.open_command = openCommand;
  }

  if (openRemoteCommand !== undefined) {
    validatedConfig.open_remote_command = openRemoteCommand;
  }

  return validationOk(validatedConfig);
}

export function assertValidBubbleConfig(input: unknown): BubbleConfig {
  const result = validateBubbleConfig(input);
  return assertValidation(result, "Invalid bubble config");
}

export interface ParseBubbleConfigTomlOptions {
  globalConfig?: PairflowGlobalConfig;
}

export function parseBubbleConfigToml(
  input: string,
  options?: ParseBubbleConfigTomlOptions
): BubbleConfig {
  const parsed = parseToml(input);
  const bubbleConfig = assertValidBubbleConfig(parsed);
  if (options?.globalConfig === undefined) {
    return bubbleConfig;
  }

  return assertValidBubbleConfigRemoteReferences({
    bubbleConfig,
    globalConfig: options.globalConfig
  });
}

export function parseWatchdogTimeoutMinutes(input: unknown): number {
  if (input === undefined) {
    return DEFAULT_WATCHDOG_TIMEOUT_MINUTES;
  }

  if (!isInteger(input) || input <= 0) {
    throw new Error("watchdog_timeout_minutes must be a positive integer");
  }

  return input;
}
