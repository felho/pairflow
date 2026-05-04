import {
  assertValidation,
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../v11/shared/validation/primitives.js";
import {
  DEFAULT_COMMIT_REQUIRES_APPROVAL,
  DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER,
  DEFAULT_LOCAL_OVERLAY_ENABLED,
  DEFAULT_LOCAL_OVERLAY_ENTRIES,
  DEFAULT_LOCAL_OVERLAY_MODE,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_PAIRFLOW_COMMAND_PROFILE,
  DEFAULT_QUALITY_MODE,
  DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY,
  DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY,
  DEFAULT_REVIEW_POLICY_LOOP_MODE,
  DEFAULT_REVIEW_ARTIFACT_TYPE,
  DEFAULT_REVIEWER_CONTEXT_MODE,
  DEFAULT_SEVERITY_GATE_ROUND,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "./defaults.js";
import {
  isAgentName,
  isAttachLauncher,
  isBubbleExecutorType,
  isBubbleReviewAutoReworkSeverity,
  isBubbleReviewLoopMode,
  isLocalOverlayMode,
  isPairflowCommandProfile,
  isQualityMode,
  isReviewArtifactType,
  isReviewerContextMode,
  isWorkMode,
  type AttachLauncher,
  type BubbleConfig
} from "../types/bubble.js";
import type { PairflowGlobalConfig } from "./pairflowConfig.js";
import { IDEATION_METADATA_PARSE_WARNING } from "../v11/shared/ideation/ideationReasonCodes.js";
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
import {
  BUBBLE_EXECUTOR_INVALID,
  REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID,
  REVIEW_POLICY_INVALID,
  REVIEW_POLICY_LOOP_MODE_INVALID,
  REVIEW_POLICY_THRESHOLD_INVALID,
  SEVERITY_GATE_ROUND_INVALID
} from "./bubbleConfig/errors.js";
import { parseToml } from "./bubbleConfig/parser.js";
import {
  describeUnknownValue,
  readBoolean,
  readObject,
  readString,
  readStringArray
} from "./bubbleConfig/readers.js";
import { assertValidBubbleConfigRemoteReferences } from "./bubbleConfig/remoteReferences.js";

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

function readReviewPolicyConsecutiveCleanRunsRequired(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): number | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required field" });
    }
    return undefined;
  }

  if (!isInteger(value) || value < 1) {
    errors.push({
      path,
      message:
        `${REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID}: Must be an integer >= 1`
    });
    return undefined;
  }

  return value;
}

function isSafeLocalOverlayEntry(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("//")) {
    return false;
  }
  const segments = normalized.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== ".." && segment !== ".");
}

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

  const implementer = agents
    ? readString(agents, "implementer", "agents.implementer", errors, true)
    : undefined;
  if (implementer !== undefined && !isAgentName(implementer)) {
    errors.push({
      path: "agents.implementer",
      message: "Must be one of: codex, claude"
    });
  }

  const reviewer = agents
    ? readString(agents, "reviewer", "agents.reviewer", errors, true)
    : undefined;
  if (reviewer !== undefined && !isAgentName(reviewer)) {
    errors.push({
      path: "agents.reviewer",
      message: "Must be one of: codex, claude"
    });
  }

  const metaReviewerCandidate = agents
    ? readString(
        agents,
        "meta_reviewer",
        "agents.meta_reviewer",
        errors,
        false
      )
    : undefined;
  // Legacy two-agent bubble.toml files normalize here so downstream runtime
  // consumers never need their own role-specific meta-reviewer fallback.
  const metaReviewer = metaReviewerCandidate ?? "codex";
  if (metaReviewerCandidate !== undefined && !isAgentName(metaReviewerCandidate)) {
    errors.push({
      path: "agents.meta_reviewer",
      message: "Must be one of: codex, claude"
    });
  }

  const testCommand = commands
    ? readString(commands, "test", "commands.test", errors, true)
    : undefined;
  const typecheckCommand = commands
    ? readString(commands, "typecheck", "commands.typecheck", errors, true)
    : undefined;
  const lintCommand = commands
    ? readString(commands, "lint", "commands.lint", errors, false)
    : undefined;
  const bootstrapCommand = commands
    ? readString(commands, "bootstrap", "commands.bootstrap", errors, false)
    : undefined;
  const validationRequired = commands
    ? readStringArray(
        commands,
        "validation_required",
        "commands.validation_required",
        errors,
        false
      )
    : undefined;
  const metaReviewApproveRequired = commands
    ? readStringArray(
        commands,
        "meta_review_approve_required",
        "commands.meta_review_approve_required",
        errors,
        false
      )
    : undefined;
  const validationRequiredExplicitCandidate = commands
    ? readBoolean(
        commands,
        "validation_required_explicit",
        "commands.validation_required_explicit",
        errors,
        false
      )
    : undefined;
  const validationRequiredExplicit =
    validationRequiredExplicitCandidate === true ? true : undefined;
  const customCommands: Record<string, string> = {};
  if (commands !== undefined) {
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

  let validatedValidationTarget: BubbleConfig["validation_target"] | undefined;
  if (validationTarget !== undefined) {
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
    if (targetId !== undefined) {
      validatedValidationTarget = {
        id: targetId,
        ...(normalizedCwd !== undefined ? { cwd: normalizedCwd } : {}),
        ...(normalizedPaths !== undefined ? { paths: normalizedPaths } : {})
      };
    }
  }

  const notificationsEnabled = notifications
    ? (readBoolean(
        notifications,
        "enabled",
        "notifications.enabled",
        errors,
        false
      ) ?? true)
    : true;
  const waitingHumanSound = notifications
    ? readString(
        notifications,
        "waiting_human_sound",
        "notifications.waiting_human_sound",
        errors,
        false
      )
    : undefined;
  const convergedSound = notifications
    ? readString(
        notifications,
        "converged_sound",
        "notifications.converged_sound",
        errors,
        false
      )
    : undefined;

  const localOverlayEnabled = localOverlay
    ? (readBoolean(
        localOverlay,
        "enabled",
        "local_overlay.enabled",
        errors,
        false
      ) ?? DEFAULT_LOCAL_OVERLAY_ENABLED)
    : DEFAULT_LOCAL_OVERLAY_ENABLED;
  const localOverlayModeCandidate =
    localOverlay?.mode ?? DEFAULT_LOCAL_OVERLAY_MODE;
  if (!isLocalOverlayMode(localOverlayModeCandidate)) {
    errors.push({
      path: "local_overlay.mode",
      message: "Must be one of: symlink, copy"
    });
  }
  const localOverlayMode = isLocalOverlayMode(localOverlayModeCandidate)
    ? localOverlayModeCandidate
    : DEFAULT_LOCAL_OVERLAY_MODE;

  const localOverlayEntriesInput = localOverlay
    ? readStringArray(
        localOverlay,
        "entries",
        "local_overlay.entries",
        errors,
        false
      )
    : undefined;
  const localOverlayEntries =
    localOverlayEntriesInput === undefined
      ? [...DEFAULT_LOCAL_OVERLAY_ENTRIES]
      : localOverlayEntriesInput;
  for (const entry of localOverlayEntries) {
    if (!isSafeLocalOverlayEntry(entry)) {
      errors.push({
        path: "local_overlay.entries",
        message:
          "Entries must be normalized relative paths without '.'/'..' segments"
      });
    }
  }

  const docContractGateWarnings: string[] = [];
  const existingDocContractGateParseWarning = docContractGates
    ? readString(
        docContractGates,
        "parse_warning",
        "doc_contract_gates.parse_warning",
        errors,
        false
      )
    : undefined;
  const roundGateAppliesAfterCandidate = docContractGates?.round_gate_applies_after;
  let roundGateAppliesAfter = DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER;
  if (roundGateAppliesAfterCandidate !== undefined) {
    if (isInteger(roundGateAppliesAfterCandidate) && roundGateAppliesAfterCandidate >= 0) {
      roundGateAppliesAfter = roundGateAppliesAfterCandidate;
    } else {
      docContractGateWarnings.push(
        `doc_contract_gates.round_gate_applies_after must be a non-negative integer. Received ${describeUnknownValue(roundGateAppliesAfterCandidate)}.`
      );
    }
  }

  const ideationWarnings: string[] = [];
  const existingIdeationParseWarning = ideation
    ? readString(
        ideation,
        "parse_warning",
        "ideation.parse_warning",
        errors,
        false
      )
    : undefined;
  const ideationModeCandidate = ideation?.mode;
  let ideationMode = false;
  if (ideationModeCandidate !== undefined) {
    if (typeof ideationModeCandidate === "boolean") {
      ideationMode = ideationModeCandidate;
    } else {
      ideationWarnings.push(
        `${IDEATION_METADATA_PARSE_WARNING}: ideation.mode must be boolean. Received ${describeUnknownValue(ideationModeCandidate)}.`
      );
    }
  }
  const ideationTaskPendingCandidate = ideation?.task_pending;
  let ideationTaskPending = false;
  if (ideationTaskPendingCandidate !== undefined) {
    if (typeof ideationTaskPendingCandidate === "boolean") {
      ideationTaskPending = ideationTaskPendingCandidate;
    } else {
      ideationWarnings.push(
        `${IDEATION_METADATA_PARSE_WARNING}: ideation.task_pending must be boolean. Received ${describeUnknownValue(ideationTaskPendingCandidate)}.`
      );
    }
  }
  const ideationStartedAtCandidate = ideation?.started_at;
  let ideationStartedAt: string | undefined;
  if (ideationStartedAtCandidate !== undefined) {
    if (isIsoTimestamp(ideationStartedAtCandidate)) {
      ideationStartedAt = ideationStartedAtCandidate;
    } else {
      ideationWarnings.push(
        `${IDEATION_METADATA_PARSE_WARNING}: ideation.started_at must be an ISO timestamp. Received ${describeUnknownValue(ideationStartedAtCandidate)}.`
      );
    }
  }
  const ideationKickedOffAtCandidate = ideation?.kicked_off_at;
  let ideationKickedOffAt: string | undefined;
  if (ideationKickedOffAtCandidate !== undefined) {
    if (isIsoTimestamp(ideationKickedOffAtCandidate)) {
      ideationKickedOffAt = ideationKickedOffAtCandidate;
    } else {
      ideationWarnings.push(
        `${IDEATION_METADATA_PARSE_WARNING}: ideation.kicked_off_at must be an ISO timestamp. Received ${describeUnknownValue(ideationKickedOffAtCandidate)}.`
      );
    }
  }
  if (!ideationMode && ideationTaskPending) {
    ideationWarnings.push(
      `${IDEATION_METADATA_PARSE_WARNING}: ideation.task_pending=true is invalid when ideation.mode=false; normalized to false.`
    );
    ideationTaskPending = false;
  }

  const allowedReviewPolicyKeys = new Set([
    "review_loop_mode",
    "reviewer_blocking_min_severity",
    "meta_review_auto_rework_min_severity",
    "meta_review_consecutive_clean_runs_required"
  ]);
  if (reviewPolicy !== undefined) {
    for (const key of Object.keys(reviewPolicy)) {
      if (allowedReviewPolicyKeys.has(key)) {
        continue;
      }

      errors.push({
        path: `review_policy.${key}`,
        message:
          `${REVIEW_POLICY_INVALID}: Unknown review_policy field "${key}"`
      });
    }
  }

  const hasExplicitReviewPolicyFields =
    reviewPolicy !== undefined &&
    Object.keys(reviewPolicy).some((key) => allowedReviewPolicyKeys.has(key));

  const reviewPolicyLoopModeCandidate =
    reviewPolicy?.review_loop_mode ?? DEFAULT_REVIEW_POLICY_LOOP_MODE;
  if (!isBubbleReviewLoopMode(reviewPolicyLoopModeCandidate)) {
    errors.push({
      path: "review_policy.review_loop_mode",
      message:
        `${REVIEW_POLICY_LOOP_MODE_INVALID}: Must be one of: full, meta_only`
    });
  }
  const reviewPolicyLoopMode = isBubbleReviewLoopMode(reviewPolicyLoopModeCandidate)
    ? reviewPolicyLoopModeCandidate
    : DEFAULT_REVIEW_POLICY_LOOP_MODE;

  const reviewPolicyReviewerSeverityCandidate =
    reviewPolicy?.reviewer_blocking_min_severity
    ?? DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY;
  if (!isBubbleReviewAutoReworkSeverity(reviewPolicyReviewerSeverityCandidate)) {
    errors.push({
      path: "review_policy.reviewer_blocking_min_severity",
      message:
        `${REVIEW_POLICY_THRESHOLD_INVALID}: Must be one of: P1, P2, P3`
    });
  }
  const reviewPolicyReviewerSeverity = isBubbleReviewAutoReworkSeverity(
    reviewPolicyReviewerSeverityCandidate
  )
    ? reviewPolicyReviewerSeverityCandidate
    : DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY;

  const reviewPolicySeverityCandidate =
    reviewPolicy?.meta_review_auto_rework_min_severity
    ?? DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY;
  if (!isBubbleReviewAutoReworkSeverity(reviewPolicySeverityCandidate)) {
    errors.push({
      path: "review_policy.meta_review_auto_rework_min_severity",
      message:
        `${REVIEW_POLICY_THRESHOLD_INVALID}: Must be one of: P1, P2, P3`
    });
  }
  const reviewPolicySeverity = isBubbleReviewAutoReworkSeverity(
    reviewPolicySeverityCandidate
  )
    ? reviewPolicySeverityCandidate
    : DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY;

  const reviewPolicyConsecutiveCleanRunsRequired =
    reviewPolicy === undefined
      ? undefined
      : (
          readReviewPolicyConsecutiveCleanRunsRequired(
            reviewPolicy,
            "meta_review_consecutive_clean_runs_required",
            "review_policy.meta_review_consecutive_clean_runs_required",
            errors,
            false
          )
        );

  let validatedExecutor: BubbleConfig["executor"] | undefined;
  if (executor !== undefined) {
    const allowedKeys = new Set(["type", "remote"]);
    for (const key of Object.keys(executor)) {
      if (allowedKeys.has(key)) {
        continue;
      }

      const duplicationKeys = new Set([
        "host",
        "user",
        "repo_base",
        "pairflow_command",
        "default_port_forwards"
      ]);
      errors.push({
        path: `executor.${key}`,
        message: duplicationKeys.has(key)
          ? `${BUBBLE_EXECUTOR_INVALID}: Inline remote host details are not allowed in [executor]; use [remotes.<name>] in the global config and keep only executor.remote in bubble.toml.`
          : `${BUBBLE_EXECUTOR_INVALID}: Unknown executor field "${key}"`
      });
    }

    const executorType = readString(
      executor,
      "type",
      "executor.type",
      errors,
      true
    );
    const executorRemote = readString(
      executor,
      "remote",
      "executor.remote",
      errors,
      true
    );

    if (executorType !== undefined && !isBubbleExecutorType(executorType)) {
      errors.push({
        path: "executor.type",
        message: `${BUBBLE_EXECUTOR_INVALID}: Must be "ssh" when [executor] is present`
      });
    }

    if (
      executorType !== undefined
      && executorRemote !== undefined
      && isBubbleExecutorType(executorType)
    ) {
      validatedExecutor = {
        type: executorType,
        remote: executorRemote
      };
    }
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  const validatedNotifications: BubbleConfig["notifications"] = {
    enabled: notificationsEnabled
  };
  if (waitingHumanSound !== undefined) {
    validatedNotifications.waiting_human_sound = waitingHumanSound;
  }
  if (convergedSound !== undefined) {
    validatedNotifications.converged_sound = convergedSound;
  }

  const validatedReviewPolicy: BubbleConfig["review_policy"] =
    !hasExplicitReviewPolicyFields
      ? undefined
      : {
          review_loop_mode: reviewPolicyLoopMode,
          reviewer_blocking_min_severity: reviewPolicyReviewerSeverity,
          meta_review_auto_rework_min_severity: reviewPolicySeverity,
          ...(reviewPolicyConsecutiveCleanRunsRequired !== undefined
            ? {
                meta_review_consecutive_clean_runs_required:
                  reviewPolicyConsecutiveCleanRunsRequired
              }
            : {})
        };

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
    agents: {
      implementer: implementer as "codex" | "claude",
      reviewer: reviewer as "codex" | "claude",
      meta_reviewer: metaReviewer as "codex" | "claude"
    },
    commands: {
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
    },
    notifications: validatedNotifications,
    local_overlay: {
      enabled: localOverlayEnabled,
      mode: localOverlayMode,
      entries: localOverlayEntries
    },
    doc_contract_gates: {
      round_gate_applies_after: roundGateAppliesAfter,
      ...((existingDocContractGateParseWarning !== undefined || docContractGateWarnings.length > 0)
        ? {
            parse_warning: [
              existingDocContractGateParseWarning,
              ...(docContractGateWarnings.length > 0
                ? [docContractGateWarnings.join(" ")]
                : [])
            ]
              .filter((entry): entry is string => entry !== undefined)
              .join(" ")
          }
        : {})
    },
    ...(
      ideationMode ||
      ideationTaskPending ||
      ideationStartedAt !== undefined ||
      ideationKickedOffAt !== undefined ||
      existingIdeationParseWarning !== undefined ||
      ideationWarnings.length > 0
        ? {
            ideation: {
              mode: ideationMode,
              task_pending: ideationTaskPending,
              ...(ideationStartedAt !== undefined
                ? { started_at: ideationStartedAt }
                : {}),
              ...(ideationKickedOffAt !== undefined
                ? { kicked_off_at: ideationKickedOffAt }
                : {}),
              ...((existingIdeationParseWarning !== undefined || ideationWarnings.length > 0)
                ? {
                    parse_warning: [
                      existingIdeationParseWarning,
                      ...(ideationWarnings.length > 0
                        ? [ideationWarnings.join(" ")]
                        : [])
                    ]
                      .filter((entry): entry is string => entry !== undefined)
                      .join(" ")
                  }
                : {})
            }
          }
        : {}
    ),
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
