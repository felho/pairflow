import {
  IDEATION_TASK_INPUT_CONFLICT,
  IDEATION_TASK_REQUIRED
} from "../../../v11/shared/ideation/ideationReasonCodes.js";
import type { BubbleCreateCommandOptions } from "./createCliOptionTypes.js";
import {
  appendMissingOption,
  parsePairflowCommandProfile,
  parseReviewArtifactType,
  toCreateCommandError,
  toCreateCommandReasonCodeError
} from "./createCliOptionValidationHelpers.js";
import {
  BUBBLE_EXECUTOR_INVALID,
  MISSING_REVIEW_ARTIFACT_TYPE_OPTION
} from "../../../config/bubbleConfig.js";
import {
  CREATE_REMOTE_ALIAS_INVALID,
  parseCreateRemoteAlias
} from "../../../v11/application/create/createRemoteAlias.js";
import { isValidationTargetId } from "../../../v11/shared/validation/validationTargetId.js";

export interface BubbleCreateParsedValues {
  id?: string;
  repo?: string;
  base?: string;
  task?: string;
  ideation?: boolean;
  help?: boolean;
  "review-artifact-type"?: string;
  "task-file"?: string;
  "reviewer-brief"?: string;
  "reviewer-brief-file"?: string;
  "bootstrap-command"?: string;
  "validation-target"?: string;
  "pairflow-command-profile"?: string;
  "accuracy-critical"?: boolean;
  remote?: string;
}

export interface CreateValidationState {
  missing: string[];
  isReviewArtifactTypeMissing: boolean;
  reviewArtifactTypeValidationError: string | undefined;
  pairflowCommandProfileValidationError: string | undefined;
  remoteValidationError: string | undefined;
  validationTargetValidationError: string | undefined;
}

function parseRemoteAlias(
  rawRemoteAlias: string | undefined
): {
  remote?: string;
  remoteValidationError?: string;
} {
  const { remoteAlias, errorMessage } = parseCreateRemoteAlias(rawRemoteAlias);
  return {
    ...(remoteAlias !== undefined ? { remote: remoteAlias } : {}),
    ...(errorMessage !== undefined
      ? { remoteValidationError: errorMessage }
      : {})
  };
}

export function collectCreateValidationState(
  options: BubbleCreateCommandOptions,
  values: BubbleCreateParsedValues
): CreateValidationState {
  const missing: string[] = [];
  appendMissingOption(missing, options.id, "--id");
  appendMissingOption(missing, options.repo, "--repo");
  if (values.base !== undefined) {
    const baseBranch = values.base.trim();
    if (baseBranch.length === 0) {
      missing.push("--base=<non-empty branch>");
    } else {
      options.base = baseBranch;
    }
  }

  const {
    pairflowCommandProfile,
    pairflowCommandProfileValidationError
  } = parsePairflowCommandProfile(values["pairflow-command-profile"]);
  if (pairflowCommandProfile !== undefined) {
    options.pairflowCommandProfile = pairflowCommandProfile;
  }
  const { remote, remoteValidationError } = parseRemoteAlias(values.remote);
  if (remote !== undefined) {
    options.remote = remote;
  }
  let validationTargetValidationError: string | undefined;
  if (values["validation-target"] !== undefined) {
    const validationTarget = values["validation-target"].trim();
    if (validationTarget.length === 0) {
      validationTargetValidationError =
        "VALIDATION_TARGET_ID_INVALID: --validation-target must be a non-empty validation target id.";
    } else if (!isValidationTargetId(validationTarget)) {
      validationTargetValidationError =
        "VALIDATION_TARGET_ID_INVALID: --validation-target must use a valid validation target id.";
    } else {
      options.validationTarget = validationTarget;
    }
  }

  const {
    isReviewArtifactTypeMissing,
    reviewArtifactType,
    reviewArtifactTypeValidationError
  } = parseReviewArtifactType(values["review-artifact-type"]);
  if (isReviewArtifactTypeMissing) {
    missing.push("--review-artifact-type");
  } else if (reviewArtifactType !== undefined) {
    options.reviewArtifactType = reviewArtifactType;
  }

  return {
    missing,
    isReviewArtifactTypeMissing,
    reviewArtifactTypeValidationError,
    pairflowCommandProfileValidationError,
    remoteValidationError,
    validationTargetValidationError
  };
}

export function validateCreateTaskInputMode(options: BubbleCreateCommandOptions): void {
  const hasTask = options.task !== undefined;
  const hasTaskFile = options.taskFile !== undefined;
  const ideationMode = options.ideation === true;

  if (ideationMode && (hasTask || hasTaskFile)) {
    throw toCreateCommandError(
      `${IDEATION_TASK_INPUT_CONFLICT}: --ideation cannot be combined with --task or --task-file.`
    );
  }
  if (!ideationMode && !hasTask && !hasTaskFile) {
    throw toCreateCommandError(
      `${IDEATION_TASK_REQUIRED}: Missing task input. Use --task, --task-file, or --ideation for taskless ideation bubbles.`
    );
  }
  if (!ideationMode && hasTask && hasTaskFile) {
    throw toCreateCommandError(
      "CREATE_TASK_INPUT_MODE_CONFLICT: Use only one task input: --task or --task-file."
    );
  }
}

export function validateCreateReviewerBriefInputMode(options: BubbleCreateCommandOptions): void {
  const hasReviewerBrief = options.reviewerBrief !== undefined;
  const hasReviewerBriefFile = options.reviewerBriefFile !== undefined;
  if (hasReviewerBrief && hasReviewerBriefFile) {
    throw toCreateCommandError(
      "CREATE_REVIEWER_BRIEF_INPUT_CONFLICT: Use only one reviewer brief input: --reviewer-brief or --reviewer-brief-file."
    );
  }
  if ((options.accuracyCritical ?? false) && !hasReviewerBrief && !hasReviewerBriefFile) {
    throw toCreateCommandError(
      "CREATE_ACCURACY_CRITICAL_REVIEWER_BRIEF_REQUIRED: --accuracy-critical requires reviewer brief input via --reviewer-brief or --reviewer-brief-file."
    );
  }
}

function formatAlsoMissingOptions(missingOptions: string[]): string {
  return missingOptions.length > 0 ? ` Also missing: ${missingOptions.join(", ")}.` : "";
}

export function throwMissingCreateOptionsError(state: CreateValidationState): never {
  // Policy: explicit review artifact ownership is the first create-time contract gate.
  // When it is missing, surface that requirement before secondary option validation
  // such as remote alias normalization errors.
  if (state.isReviewArtifactTypeMissing) {
    const otherMissing = state.missing.filter(
      (option) => option !== "--review-artifact-type"
    );
    throw toCreateCommandError(
      `${MISSING_REVIEW_ARTIFACT_TYPE_OPTION}: Missing required --review-artifact-type=<document|code> option.${formatAlsoMissingOptions(otherMissing)}`
    );
  }
  if (state.reviewArtifactTypeValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      `${state.reviewArtifactTypeValidationError}${formatAlsoMissingOptions(state.missing)}`,
      "CREATE_REVIEW_ARTIFACT_TYPE_VALIDATION_FAILED"
    );
  }
  if (state.pairflowCommandProfileValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      `${state.pairflowCommandProfileValidationError}${formatAlsoMissingOptions(state.missing)}`,
      "PAIRFLOW_COMMAND_PROFILE_INVALID"
    );
  }
  if (state.remoteValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      `${state.remoteValidationError}${formatAlsoMissingOptions(state.missing)}`,
      CREATE_REMOTE_ALIAS_INVALID
    );
  }
  if (state.validationTargetValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      `${state.validationTargetValidationError}${formatAlsoMissingOptions(state.missing)}`,
      "VALIDATION_TARGET_ID_INVALID"
    );
  }
  throw toCreateCommandError(
    `CREATE_REQUIRED_OPTIONS_MISSING: Missing required options: ${state.missing.join(", ")}`
  );
}

export function throwCreateValidationErrors(state: CreateValidationState): void {
  if (state.reviewArtifactTypeValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      state.reviewArtifactTypeValidationError,
      "CREATE_REVIEW_ARTIFACT_TYPE_VALIDATION_FAILED"
    );
  }
  if (state.pairflowCommandProfileValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      state.pairflowCommandProfileValidationError,
      "PAIRFLOW_COMMAND_PROFILE_INVALID"
    );
  }
  if (state.remoteValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      state.remoteValidationError,
      CREATE_REMOTE_ALIAS_INVALID
    );
  }
  if (state.validationTargetValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      state.validationTargetValidationError,
      "VALIDATION_TARGET_ID_INVALID"
    );
  }
}

export {
  BUBBLE_EXECUTOR_INVALID,
  CREATE_REMOTE_ALIAS_INVALID
};
