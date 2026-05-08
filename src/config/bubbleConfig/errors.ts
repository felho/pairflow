import {
  isCreateReviewArtifactType,
  isPairflowCommandProfile,
  type CreateReviewArtifactType
} from "../../v11/shared/config/bubbleConfigVocabulary.js";

export const MISSING_REVIEW_ARTIFACT_TYPE_OPTION =
  "MISSING_REVIEW_ARTIFACT_TYPE_OPTION" as const;
export const INVALID_REVIEW_ARTIFACT_TYPE_OPTION =
  "INVALID_REVIEW_ARTIFACT_TYPE_OPTION" as const;
export const REVIEW_ARTIFACT_TYPE_AUTO_REMOVED =
  "REVIEW_ARTIFACT_TYPE_AUTO_REMOVED" as const;
export const PAIRFLOW_COMMAND_PROFILE_INVALID =
  "PAIRFLOW_COMMAND_PROFILE_INVALID" as const;
export const DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER =
  "DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER" as const;
export const SEVERITY_GATE_ROUND_INVALID =
  "SEVERITY_GATE_ROUND_INVALID" as const;
export const BUBBLE_EXECUTOR_INVALID =
  "BUBBLE_EXECUTOR_INVALID" as const;
export const REVIEW_POLICY_INVALID =
  "REVIEW_POLICY_INVALID" as const;
export const REVIEW_POLICY_LOOP_MODE_INVALID =
  "REVIEW_POLICY_LOOP_MODE_INVALID" as const;
export const REVIEW_POLICY_THRESHOLD_INVALID =
  "REVIEW_POLICY_THRESHOLD_INVALID" as const;
export const REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID =
  "REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID" as const;

function formatCreateReviewArtifactTypeError(
  reasonCode:
    | typeof MISSING_REVIEW_ARTIFACT_TYPE_OPTION
    | typeof INVALID_REVIEW_ARTIFACT_TYPE_OPTION
    | typeof REVIEW_ARTIFACT_TYPE_AUTO_REMOVED,
  message: string
): string {
  return `${reasonCode}: ${message}`;
}

export function assertCreateReviewArtifactType(
  value: unknown
): CreateReviewArtifactType {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      formatCreateReviewArtifactTypeError(
        MISSING_REVIEW_ARTIFACT_TYPE_OPTION,
        "Missing required --review-artifact-type=<document|code> option."
      )
    );
  }

  const normalized = value.trim();
  if (normalized === "auto") {
    throw new Error(
      formatCreateReviewArtifactTypeError(
        REVIEW_ARTIFACT_TYPE_AUTO_REMOVED,
        "The --review-artifact-type=auto value is removed. Use --review-artifact-type=<document|code>."
      )
    );
  }

  if (!isCreateReviewArtifactType(normalized)) {
    throw new Error(
      formatCreateReviewArtifactTypeError(
        INVALID_REVIEW_ARTIFACT_TYPE_OPTION,
        `Invalid --review-artifact-type value "${normalized}". Accepted values: document|code.`
      )
    );
  }

  return normalized;
}

export function assertPairflowCommandProfile(value: unknown): "external" | "self_host" {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `${PAIRFLOW_COMMAND_PROFILE_INVALID}: Missing --pairflow-command-profile value. Accepted values: external|self_host.`
    );
  }

  const normalized = value.trim();
  if (!isPairflowCommandProfile(normalized)) {
    throw new Error(
      `${PAIRFLOW_COMMAND_PROFILE_INVALID}: Invalid --pairflow-command-profile value "${normalized}". Accepted values: external|self_host.`
    );
  }

  return normalized;
}
