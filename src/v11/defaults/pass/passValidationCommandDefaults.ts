import {
  buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective,
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
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../gates/docContractGateArtifactDefaults.js";

export type { PassValidationCommandResult } from "../../infrastructure/artifact/validation/passValidationEvidence.js";

export { PassValidationRunnerExecutionError };

export const passValidationDefaults = {
  buildPassValidationEvidenceArtifact,
  createPassValidationReviewerDirective,
  readDocContractGateArtifact,
  resolvePassValidationArtifactPath,
  resolvePassValidationPolicy,
  resolveDocContractGateArtifactPath,
  resolvePassValidationReviewerCompatibilityArtifactPath,
  runPassValidationCommand,
  writeDocContractGateArtifact,
  writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact
} as const;
