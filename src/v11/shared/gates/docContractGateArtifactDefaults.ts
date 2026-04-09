import { join } from "node:path";
import type {
  ReadDocContractGateArtifactPort,
  WriteDocContractGateArtifactPort
} from "../ports/docContractGateArtifacts.js";

import type * as CoreDocContractGateArtifactsModule from "../../../core/gates/docContractGateArtifacts.js";

let coreDocContractGateArtifactsModulePromise:
  | Promise<typeof CoreDocContractGateArtifactsModule>
  | undefined;

async function loadCoreDocContractGateArtifactsModule(): Promise<
  typeof CoreDocContractGateArtifactsModule
> {
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
