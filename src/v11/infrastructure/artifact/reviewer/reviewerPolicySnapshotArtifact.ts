import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type {
  EnsureReviewerPolicySnapshotPort,
  EnsureReviewerPolicySnapshotResult
} from "../../../ports/reviewerArtifacts.js";
import {
  buildReviewerPolicySnapshotContent,
  reviewerPolicySnapshotFileName
} from "../../../shared/reviewer/reviewerPolicySnapshot.js";
import {
  reviewerSeverityOntologySourceDoc
} from "../../../shared/reviewer/reviewerSeverityOntology.generated.js";

export const ensureReviewerPolicySnapshot: EnsureReviewerPolicySnapshotPort = async (
  input
) => {
  const artifactPathAbs = resolve(
    join(input.artifactsDir, reviewerPolicySnapshotFileName)
  );
  const snapshotContent = buildReviewerPolicySnapshotContent({
    reviewerBlockingMinSeverity: input.reviewerBlockingMinSeverity
  });

  try {
    await mkdir(dirname(artifactPathAbs), { recursive: true });
    await writeFile(artifactPathAbs, snapshotContent, "utf8");
  } catch (error) {
    return failure({
      stage: "write",
      artifactPathAbs,
      reason: "Failed to write reviewer policy snapshot artifact.",
      cause: error
    });
  }

  let readBack: string;
  try {
    readBack = await readFile(artifactPathAbs, "utf8");
  } catch (error) {
    return failure({
      stage: "read_back",
      artifactPathAbs,
      reason: "Failed to read reviewer policy snapshot artifact after write.",
      cause: error
    });
  }

  if (readBack.trim().length === 0) {
    return failure({
      stage: "validate_non_empty",
      artifactPathAbs,
      reason: "Reviewer policy snapshot artifact is empty after write."
    });
  }

  return {
    ok: true,
    policySnapshotPathAbs: artifactPathAbs
  };
};

function failure(input: {
  stage: Exclude<EnsureReviewerPolicySnapshotResult, { ok: true }>["stage"];
  artifactPathAbs: string;
  reason: string;
  cause?: unknown;
}): EnsureReviewerPolicySnapshotResult {
  return {
    ok: false,
    stage: input.stage,
    artifactPathAbs: input.artifactPathAbs,
    sourceDoc: reviewerSeverityOntologySourceDoc,
    reason: input.reason,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  };
}
