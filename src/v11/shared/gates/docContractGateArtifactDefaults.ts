import { join } from "node:path";
import {
  readDocContractGateArtifact as readDocContractGateArtifactCore,
  writeDocContractGateArtifact as writeDocContractGateArtifactCore
} from "../../../core/gates/docContractGateArtifacts.js";
import type {
  ReadDocContractGateArtifactPort,
  WriteDocContractGateArtifactPort
} from "../ports/docContractGateArtifacts.js";

export function resolveDocContractGateArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "doc-contract-gates.json");
}

export const readDocContractGateArtifact: ReadDocContractGateArtifactPort = async (
  artifactPath
) => readDocContractGateArtifactCore(artifactPath);

export const writeDocContractGateArtifact: WriteDocContractGateArtifactPort = async (
  artifactPath,
  artifact
) => writeDocContractGateArtifactCore(artifactPath, artifact);
