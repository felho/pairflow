import {
  passValidationDefaults as corePassValidationDefaults,
  PassValidationRunnerExecutionError,
  type PassValidationCommandResult
} from "../../../core/runtime/passValidationDefaults.js";

export const passValidationDefaults = {
  buildPassValidationEvidenceArtifact:
    corePassValidationDefaults.buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective:
    corePassValidationDefaults.createPassValidationReviewerDirective,
  resolvePassValidationArtifactPath:
    corePassValidationDefaults.resolvePassValidationArtifactPath,
  resolvePassValidationPolicy:
    corePassValidationDefaults.resolvePassValidationPolicy,
  resolvePassValidationReviewerCompatibilityArtifactPath:
    corePassValidationDefaults.resolvePassValidationReviewerCompatibilityArtifactPath,
  runPassValidationCommand: corePassValidationDefaults.runPassValidationCommand,
  writePassValidationEvidenceArtifact:
    corePassValidationDefaults.writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact:
    corePassValidationDefaults.writePassValidationReviewerCompatibilityArtifact
} as const;

export {
  PassValidationRunnerExecutionError,
  type PassValidationCommandResult
};
