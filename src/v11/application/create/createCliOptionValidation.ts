import {
  assertCreateReviewArtifactType,
  assertPairflowCommandProfile,
  MISSING_REVIEW_ARTIFACT_TYPE_OPTION
} from "../../../config/bubbleConfig.js";
import {
  IDEATION_TASK_INPUT_CONFLICT,
  IDEATION_TASK_REQUIRED
} from "../../../core/bubble/ideation.js";
import type {
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../../types/bubble.js";
import type { BubbleCreateCommandOptions } from "./createCliOptionTypes.js";

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
  "pairflow-command-profile"?: string;
  "accuracy-critical"?: boolean;
}

export interface CreateValidationState {
  missing: string[];
  isReviewArtifactTypeMissing: boolean;
  reviewArtifactTypeValidationError: string | undefined;
  pairflowCommandProfileValidationError: string | undefined;
}

function appendMissingOption(
  missing: string[],
  value: string | undefined,
  option: string
): void {
  if (value === undefined) {
    missing.push(option);
  }
}

function toValidationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatCreateError(message: string): string {
  return `${message} context: command_name=create.`;
}

function formatCreateErrorWithReason(message: string, reasonCode: string): string {
  return `${message} context: command_name=create reason_code=${reasonCode}.`;
}

function toCreateCommandError(message: string): Error {
  return new Error(formatCreateError(message));
}

function toCreateCommandReasonCodeError(message: string, reasonCode: string): Error {
  return new Error(formatCreateErrorWithReason(message, reasonCode));
}

function parsePairflowCommandProfile(
  rawPairflowCommandProfile: string | undefined
): {
  pairflowCommandProfile?: PairflowCommandProfile;
  pairflowCommandProfileValidationError?: string;
} {
  if (rawPairflowCommandProfile === undefined) {
    return {};
  }
  try {
    return {
      pairflowCommandProfile: assertPairflowCommandProfile(rawPairflowCommandProfile)
    };
  } catch (error) {
    return {
      pairflowCommandProfileValidationError: toValidationErrorMessage(error)
    };
  }
}

function parseReviewArtifactType(
  rawReviewArtifactType: string | undefined
): {
  isReviewArtifactTypeMissing: boolean;
  reviewArtifactType?: CreateReviewArtifactType;
  reviewArtifactTypeValidationError?: string;
} {
  if (rawReviewArtifactType === undefined) {
    return {
      isReviewArtifactTypeMissing: true
    };
  }
  try {
    return {
      isReviewArtifactTypeMissing: false,
      reviewArtifactType: assertCreateReviewArtifactType(rawReviewArtifactType)
    };
  } catch (error) {
    return {
      isReviewArtifactTypeMissing: false,
      reviewArtifactTypeValidationError: toValidationErrorMessage(error)
    };
  }
}

export function collectCreateValidationState(
  options: BubbleCreateCommandOptions,
  values: BubbleCreateParsedValues
): CreateValidationState {
  const missing: string[] = [];
  appendMissingOption(missing, options.id, "--id");
  appendMissingOption(missing, options.repo, "--repo");
  appendMissingOption(missing, options.base, "--base");

  const {
    pairflowCommandProfile,
    pairflowCommandProfileValidationError
  } = parsePairflowCommandProfile(values["pairflow-command-profile"]);
  if (pairflowCommandProfile !== undefined) {
    options.pairflowCommandProfile = pairflowCommandProfile;
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
    pairflowCommandProfileValidationError
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
}
