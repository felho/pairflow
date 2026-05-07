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
import {
  resolveReviewVerificationInputFromRefs,
  writeReviewVerificationArtifactAtomic
} from "../reviewer/reviewVerificationArtifactDefaults.js";

export type { PassValidationCommandResult } from "../../infrastructure/artifact/validation/passValidationEvidence.js";

export { PassValidationRunnerExecutionError };

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
  writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact
} as const;
