import { join } from "node:path";

import type {
  ReadDocContractGateArtifactPort,
  WriteDocContractGateArtifactPort
} from "../../shared/ports/docContractGateArtifacts.js";

interface DocContractGateArtifactDefaultsModule {
  readDocContractGateArtifact: ReadDocContractGateArtifactPort;
  writeDocContractGateArtifact: WriteDocContractGateArtifactPort;
}

let docContractGateArtifactDefaultsModulePromise:
  | Promise<DocContractGateArtifactDefaultsModule>
  | undefined;

function getDocContractGateArtifactDefaultsModulePath(): string {
  return "../../defaults/gates/docContractGateArtifactDefaults.js";
}

async function loadDocContractGateArtifactDefaultsModule():
  Promise<DocContractGateArtifactDefaultsModule> {
  docContractGateArtifactDefaultsModulePromise ??= import(
    getDocContractGateArtifactDefaultsModulePath()
  ) as Promise<DocContractGateArtifactDefaultsModule>;
  return docContractGateArtifactDefaultsModulePromise;
}

export function resolveDocContractGateArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "doc-contract-gates.json");
}

export const readDocContractGateArtifact:
  ReadDocContractGateArtifactPort = async (...args) => {
    const { readDocContractGateArtifact: readDocContractGateArtifactDefault } =
      await loadDocContractGateArtifactDefaultsModule();
    return readDocContractGateArtifactDefault(...args);
  };

export const writeDocContractGateArtifact:
  WriteDocContractGateArtifactPort = async (...args) => {
    const { writeDocContractGateArtifact: writeDocContractGateArtifactDefault } =
      await loadDocContractGateArtifactDefaultsModule();
    return writeDocContractGateArtifactDefault(...args);
  };
