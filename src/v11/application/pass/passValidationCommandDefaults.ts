import {
  buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective,
  resolvePassValidationArtifactPath,
  resolvePassValidationPolicy,
  resolvePassValidationReviewerCompatibilityArtifactPath,
  type PassValidationCommandResult,
  writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact
} from "../../infrastructure/artifact/validation/passValidationEvidence.js";
import {
  PassValidationRunnerExecutionError,
  runPassValidationCommand
} from "../../infrastructure/executor/validation/passValidationCommandRunner.js";

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

export { PassValidationRunnerExecutionError };
export type { PassValidationCommandResult };
