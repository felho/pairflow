import {
  assertCreateReviewArtifactType,
  assertPairflowCommandProfile
} from "../../../config/bubbleConfig.js";
import type {
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../../types/bubble.js";
import {
  formatCreateError,
  formatCreateErrorWithReason,
  toCreateCommandError,
  toCreateCommandReasonCodeError
} from "../../../v11/application/create/createCommandErrors.js";

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

export {
  formatCreateError,
  formatCreateErrorWithReason,
  toCreateCommandError,
  toCreateCommandReasonCodeError
};

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
