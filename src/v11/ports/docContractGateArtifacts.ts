import type { DocContractGateArtifact } from "../shared/gates/docContractGates.js";

export type ResolveDocContractGateArtifactPathPort = (
  artifactsDir: string
) => string;

export type ReadDocContractGateArtifactPort = (
  artifactPath: string
) => Promise<DocContractGateArtifact | undefined>;

export type WriteDocContractGateArtifactPort = (
  artifactPath: string,
  artifact: DocContractGateArtifact
) => Promise<void>;
