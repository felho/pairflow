import { join } from "node:path";
import type {
  ReadDocContractGateArtifactPort,
  WriteDocContractGateArtifactPort
} from "../ports/docContractGateArtifacts.js";

type CoreDocContractGateArtifactsModule = {
  readDocContractGateArtifact: ReadDocContractGateArtifactPort;
  writeDocContractGateArtifact: WriteDocContractGateArtifactPort;
};

let coreDocContractGateArtifactsModulePromise:
  | Promise<CoreDocContractGateArtifactsModule>
  | undefined;

async function loadCoreDocContractGateArtifactsModule(): Promise<
  CoreDocContractGateArtifactsModule
> {
  coreDocContractGateArtifactsModulePromise ??= import(
    "../../../core/gates/docContractGateArtifacts.js"
  ).then(({ readDocContractGateArtifact, writeDocContractGateArtifact }) => ({
    readDocContractGateArtifact,
    writeDocContractGateArtifact
  }));
  return coreDocContractGateArtifactsModulePromise;
}

export function resolveDocContractGateArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "doc-contract-gates.json");
}

export const readDocContractGateArtifact: ReadDocContractGateArtifactPort = async (
  artifactPath
) => {
  const module = await loadCoreDocContractGateArtifactsModule();
  return module.readDocContractGateArtifact(artifactPath);
};

export const writeDocContractGateArtifact: WriteDocContractGateArtifactPort = async (
  artifactPath,
  artifact
) => {
  const module = await loadCoreDocContractGateArtifactsModule();
  return module.writeDocContractGateArtifact(artifactPath, artifact);
};
