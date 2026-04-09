import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifacts.js";
import { readReviewVerificationArtifactStatus } from "../../v11/shared/reviewer/reviewVerificationArtifactReaders.js";

export const statusGateDefaults = {
  readDocContractGateArtifact,
  readReviewVerificationArtifactStatus,
  resolveDocContractGateArtifactPath
} as const;
