import { join } from "node:path";
import type {
  ReadDocContractGateArtifactPort,
  WriteDocContractGateArtifactPort
} from "../ports/docContractGateArtifacts.js";

type DocContractGateArtifactsModule = {
  readDocContractGateArtifact: ReadDocContractGateArtifactPort;
  writeDocContractGateArtifact: WriteDocContractGateArtifactPort;
};

let docContractGateArtifactsModulePromise:
  | Promise<DocContractGateArtifactsModule>
  | undefined;

async function loadDocContractGateArtifactsModule(): Promise<
  DocContractGateArtifactsModule
> {
  docContractGateArtifactsModulePromise ??= import(
    "../../infrastructure/artifact/gates/docContractGateArtifacts.js"
  ).then(({ readDocContractGateArtifact, writeDocContractGateArtifact }) => ({
    readDocContractGateArtifact,
    writeDocContractGateArtifact
  }));
  return docContractGateArtifactsModulePromise;
}

export function resolveDocContractGateArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "doc-contract-gates.json");
}

export const readDocContractGateArtifact: ReadDocContractGateArtifactPort = async (
  artifactPath
) => {
  const module = await loadDocContractGateArtifactsModule();
  return module.readDocContractGateArtifact(artifactPath);
};

export const writeDocContractGateArtifact: WriteDocContractGateArtifactPort = async (
  artifactPath,
  artifact
) => {
  const module = await loadDocContractGateArtifactsModule();
  return module.writeDocContractGateArtifact(artifactPath, artifact);
};
