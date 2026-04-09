const passValidationDefaultsPromise = import(
  "../../../core/runtime/passValidationDefaults.js"
).then(({ passValidationDefaults, PassValidationRunnerExecutionError }) => ({
  ...passValidationDefaults,
  PassValidationRunnerExecutionError
}));

const resolvedPassValidationDefaults = await passValidationDefaultsPromise;

export const passValidationDefaults = {
  buildPassValidationEvidenceArtifact:
    resolvedPassValidationDefaults.buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective:
    resolvedPassValidationDefaults.createPassValidationReviewerDirective,
  resolvePassValidationArtifactPath:
    resolvedPassValidationDefaults.resolvePassValidationArtifactPath,
  resolvePassValidationPolicy:
    resolvedPassValidationDefaults.resolvePassValidationPolicy,
  resolvePassValidationReviewerCompatibilityArtifactPath:
    resolvedPassValidationDefaults.resolvePassValidationReviewerCompatibilityArtifactPath,
  runPassValidationCommand:
    resolvedPassValidationDefaults.runPassValidationCommand,
  writePassValidationEvidenceArtifact:
    resolvedPassValidationDefaults.writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact:
    resolvedPassValidationDefaults.writePassValidationReviewerCompatibilityArtifact
} as const;

export const PassValidationRunnerExecutionError =
  resolvedPassValidationDefaults.PassValidationRunnerExecutionError;

export type PassValidationCommandResult =
  import("../../../core/runtime/passValidationDefaults.js").PassValidationCommandResult;
