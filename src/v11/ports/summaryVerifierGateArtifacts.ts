import type {
  SummaryVerifierConsistencyGateArtifact
} from "../shared/reviewer/summaryVerifierConsistencyGateArtifact.js";

export type WriteSummaryVerifierConsistencyGateArtifactPort = (
  artifactPath: string,
  artifact: SummaryVerifierConsistencyGateArtifact
) => Promise<void>;
