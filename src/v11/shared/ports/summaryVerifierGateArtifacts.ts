import type {
  SummaryVerifierConsistencyGateArtifact
} from "../reviewer/summaryVerifierConsistencyGateArtifact.js";

export type WriteSummaryVerifierConsistencyGateArtifactPort = (
  artifactPath: string,
  artifact: SummaryVerifierConsistencyGateArtifact
) => Promise<void>;
