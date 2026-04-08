import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { reviewerTestEvidenceSchemaVersion } from "../../../shared/reviewer/testEvidence.js";
import type { ReviewerTestEvidenceArtifact } from "../../../shared/reviewer/testEvidence.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function writeReviewerTestEvidenceArtifact(
  artifactPath: string,
  artifact: ReviewerTestEvidenceArtifact
): Promise<void> {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, {
    encoding: "utf8"
  });
}

export async function readReviewerTestEvidenceArtifact(
  artifactPath: string
): Promise<ReviewerTestEvidenceArtifact | undefined> {
  const raw = await readFile(artifactPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (raw === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
  if (!isRecord(parsed)) {
    return undefined;
  }

  if (parsed.schema_version !== reviewerTestEvidenceSchemaVersion) {
    return undefined;
  }

  const required = [
    "bubble_id",
    "pass_envelope_id",
    "pass_ts",
    "round",
    "verified_at",
    "status",
    "decision",
    "reason_code",
    "reason_detail",
    "required_commands",
    "command_evidence",
    "git"
  ];
  for (const key of required) {
    if (!(key in parsed)) {
      return undefined;
    }
  }

  return parsed as unknown as ReviewerTestEvidenceArtifact;
}
