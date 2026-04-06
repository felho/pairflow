// Temporary bridge: ideation canonical ownership moved to v11 and this shim
// remains only for legacy core callers until those imports are retired.
export {
  IDEATION_ALREADY_ACTIVE,
  IDEATION_CONVERGED_BLOCKED,
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_NOT_ELIGIBLE,
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_REQUIRES_RUNNING,
  IDEATION_KICKOFF_STATE_CONFLICT,
  IDEATION_KICKOFF_TASK_INVALID,
  IDEATION_METADATA_PARSE_WARNING,
  IDEATION_PASS_BLOCKED,
  IDEATION_REVIEW_ARTIFACT_TYPE_IMMUTABLE,
  IDEATION_TASK_INPUT_CONFLICT,
  IDEATION_TASK_REQUIRED
} from "../../v11/shared/ideation/ideationReasonCodes.js";
export {
  hasIdeationMetadataParseWarning,
  resolveIdeationMetadata,
  type ResolvedIdeationMetadata
} from "../../v11/domain/ideation/ideationMetadata.js";
