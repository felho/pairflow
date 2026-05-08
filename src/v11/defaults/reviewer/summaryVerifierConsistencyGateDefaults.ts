import { writeSummaryVerifierConsistencyGateArtifact as writeSummaryVerifierConsistencyGateArtifactCanonical } from "../../infrastructure/artifact/reviewer/summaryVerifierConsistencyGateArtifacts.js";
import type { WriteSummaryVerifierConsistencyGateArtifactPort } from "../../ports/summaryVerifierGateArtifacts.js";

export const writeSummaryVerifierConsistencyGateArtifact:
WriteSummaryVerifierConsistencyGateArtifactPort = async (...args) =>
  writeSummaryVerifierConsistencyGateArtifactCanonical(...args);
