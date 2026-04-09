import {
  buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective,
  resolvePassValidationArtifactPath,
  resolvePassValidationPolicy,
  resolvePassValidationReviewerCompatibilityArtifactPath,
  type PassValidationCommandResult,
  writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact
} from "../../../v11/infrastructure/artifact/validation/passValidationEvidence.js";
import {
  PassValidationRunnerExecutionError,
  runPassValidationCommand
} from "../../../v11/infrastructure/executor/validation/passValidationCommandRunner.js";

export const passValidationDefaults = {
  buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective,
  resolvePassValidationArtifactPath,
  resolvePassValidationPolicy,
  resolvePassValidationReviewerCompatibilityArtifactPath,
  runPassValidationCommand,
  writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact
} as const;

export {
  PassValidationRunnerExecutionError,
  type PassValidationCommandResult
};
