import { join } from "node:path";
import type {
  ReadDocContractGateArtifactPort,
  WriteDocContractGateArtifactPort
} from "../ports/docContractGateArtifacts.js";

type CoreDocContractGateArtifactsModule =
  typeof import("../../../core/gates/docContractGateArtifacts.js");

let coreDocContractGateArtifactsModulePromise:
  | Promise<CoreDocContractGateArtifactsModule>
  | undefined;

async function loadCoreDocContractGateArtifactsModule() {
  coreDocContractGateArtifactsModulePromise ??= import(
    "../../../core/gates/docContractGateArtifacts.js"
  );
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
