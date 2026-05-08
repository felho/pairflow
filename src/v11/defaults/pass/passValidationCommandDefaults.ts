import {
  buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective,
  type PassValidationEvidenceArtifact,
  resolvePassValidationArtifactPath,
  resolvePassValidationPolicy,
  resolvePassValidationReviewerCompatibilityArtifactPath,
  writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact
} from "../../infrastructure/artifact/validation/passValidationEvidence.js";
import {
  runPassValidationCommand,
  PassValidationRunnerExecutionError
} from "../../infrastructure/executor/validation/passValidationCommandRunner.js";
import {
  readDocContractGateArtifact,
  writeDocContractGateArtifact
} from "../../infrastructure/artifact/gates/docContractGateArtifacts.js";
import {
  resolveDocContractGateArtifactPath
} from "../../shared/gates/docContractGateArtifactPath.js";
import {
  resolveReviewVerificationInputFromRefs,
  writeReviewVerificationArtifactAtomic
} from "../../infrastructure/artifact/reviewer/reviewVerificationArtifacts.js";
import { reviewerDeliveryDefaults } from "../reviewer/reviewerDeliveryDefaults.js";
import {
  configurePassFlowRuntimeDependencyDefaults
} from "../../application/pass/passFlowDependencyWiring.js";

export type { PassValidationCommandResult } from "../../infrastructure/artifact/validation/passValidationEvidence.js";

export { PassValidationRunnerExecutionError };

function writePassValidationEvidenceArtifactPort(
  artifactPath: string,
  artifact: unknown
): Promise<void> {
  return writePassValidationEvidenceArtifact(
    artifactPath,
    artifact as PassValidationEvidenceArtifact
  );
}

export const passValidationDefaults = {
  buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective,
  readDocContractGateArtifact,
  resolvePassValidationArtifactPath,
  resolvePassValidationPolicy,
  resolveDocContractGateArtifactPath,
  resolveReviewVerificationInputFromRefs,
  resolvePassValidationReviewerCompatibilityArtifactPath,
  runPassValidationCommand,
  writeDocContractGateArtifact,
  writeReviewVerificationArtifactAtomic,
  writePassValidationEvidenceArtifact: writePassValidationEvidenceArtifactPort,
  writePassValidationReviewerCompatibilityArtifact
} as const;

configurePassFlowRuntimeDependencyDefaults({
  ...reviewerDeliveryDefaults,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact,
  writeReviewVerificationArtifactAtomic,
  resolveReviewVerificationInputFromRefs,
  resolvePassValidationPolicy,
  runPassValidationCommand,
  buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective,
  resolvePassValidationArtifactPath,
  resolvePassValidationReviewerCompatibilityArtifactPath,
  isPassValidationRunnerExecutionError: (
    error: unknown
  ): error is PassValidationRunnerExecutionError =>
    error instanceof PassValidationRunnerExecutionError,
  writePassValidationEvidenceArtifact: writePassValidationEvidenceArtifactPort,
  writePassValidationReviewerCompatibilityArtifact
});
