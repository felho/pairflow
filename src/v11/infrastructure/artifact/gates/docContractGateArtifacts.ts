import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  DocContractGateArtifactError,
  normalizeDocContractGateArtifact
} from "../../../shared/gates/docContractGates.js";
import type {
  ReadDocContractGateArtifactPort,
  ResolveDocContractGateArtifactPathPort,
  WriteDocContractGateArtifactPort
} from "../../../shared/ports/docContractGateArtifacts.js";

export const resolveDocContractGateArtifactPath:
ResolveDocContractGateArtifactPathPort = (artifactsDir) =>
  join(artifactsDir, "doc-contract-gates.json");

export const readDocContractGateArtifact: ReadDocContractGateArtifactPort = async (
  artifactPath
) => {
  const raw = await readFile(artifactPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  );
  if (raw === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new DocContractGateArtifactError({
      message: `Invalid JSON in doc contract gate artifact: ${error instanceof Error ? error.message : String(error)}`,
      context: {
        source: "artifact_read",
        reason: "invalid_json",
        artifactPath
      }
    });
  }

  return normalizeDocContractGateArtifact(parsed);
};

export const writeDocContractGateArtifact: WriteDocContractGateArtifactPort = async (
  artifactPath,
  artifact
) => {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
};
