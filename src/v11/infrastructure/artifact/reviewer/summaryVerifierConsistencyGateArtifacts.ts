import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type {
  WriteSummaryVerifierConsistencyGateArtifactPort
} from "../../../shared/ports/summaryVerifierGateArtifacts.js";

export const writeSummaryVerifierConsistencyGateArtifact:
WriteSummaryVerifierConsistencyGateArtifactPort = async (
  artifactPath,
  artifact
): Promise<void> => {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
};
