import type {
  SummaryVerifierConsistencyGateArtifact
} from "../reviewer/summaryVerifierConsistencyGate.js";

export type WriteSummaryVerifierConsistencyGateArtifactPort = (
  artifactPath: string,
  artifact: SummaryVerifierConsistencyGateArtifact
) => Promise<void>;
