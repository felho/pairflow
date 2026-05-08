import { join } from "node:path";

import {
  readDocContractGateArtifact as readDocContractGateArtifactCanonical,
  writeDocContractGateArtifact as writeDocContractGateArtifactCanonical
} from "../../infrastructure/artifact/gates/docContractGateArtifacts.js";
import type {
  ReadDocContractGateArtifactPort,
  WriteDocContractGateArtifactPort
} from "../../ports/docContractGateArtifacts.js";

export function resolveDocContractGateArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "doc-contract-gates.json");
}

export const readDocContractGateArtifact: ReadDocContractGateArtifactPort = async (
  artifactPath
) => readDocContractGateArtifactCanonical(artifactPath);

export const writeDocContractGateArtifact: WriteDocContractGateArtifactPort = async (
  artifactPath,
  artifact
) => writeDocContractGateArtifactCanonical(artifactPath, artifact);
