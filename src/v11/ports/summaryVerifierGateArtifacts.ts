import type {
  SummaryVerifierConsistencyGateArtifact
} from "../shared/reviewer/summaryVerifierConsistencyGate.js";

export type WriteSummaryVerifierConsistencyGateArtifactPort = (
  artifactPath: string,
  artifact: SummaryVerifierConsistencyGateArtifact
) => Promise<void>;
