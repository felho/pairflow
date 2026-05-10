import {
  assertCreateReviewArtifactType,
  assertPairflowCommandProfile
} from "../../../config/bubbleConfig.js";
import type {
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../../v11/shared/config/bubbleConfigVocabulary.js";

export function appendMissingOption(
  missing: string[],
  value: string | undefined,
  option: string
): void {
  if (value === undefined) {
    missing.push(option);
  }
}

export function toValidationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function formatCreateError(message: string): string {
  return `${message} context: command_name=create.`;
}

export function formatCreateErrorWithReason(
  message: string,
  reasonCode: string
): string {
  return `${message} context: command_name=create reason_code=${reasonCode}.`;
}

export function toCreateCommandError(message: string): Error {
  return new Error(formatCreateError(message));
}

export function toCreateCommandReasonCodeError(
  message: string,
  reasonCode: string
): Error {
  return new Error(formatCreateErrorWithReason(message, reasonCode));
}

export function parsePairflowCommandProfile(
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

export function parseReviewArtifactType(
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
