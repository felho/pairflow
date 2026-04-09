import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifacts.js";
import { readReviewVerificationArtifactStatus } from "../reviewer/reviewVerificationArtifacts.js";

export const statusGateDefaults = {
  readDocContractGateArtifact,
  readReviewVerificationArtifactStatus,
  resolveDocContractGateArtifactPath
} as const;
