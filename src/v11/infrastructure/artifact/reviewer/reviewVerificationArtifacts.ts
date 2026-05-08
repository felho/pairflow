import { readFile, rename, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import {
  REVIEW_VERIFICATION_INPUT_FILENAME,
  REVIEW_VERIFICATION_SCHEMA,
  ReviewVerificationError,
  type ReviewVerificationArtifact,
  type ReviewVerificationArtifactStatus,
  type ReviewVerificationInputResolution,
  validateReviewVerificationArtifact,
  validateReviewVerificationPayload
} from "../../../shared/reviewer/reviewVerification.js";
import type {
  ReadReviewVerificationArtifactStatusOptions
} from "../../../ports/reviewVerificationArtifacts.js";

function getRefBasename(ref: string): string {
  const normalized = ref.replaceAll("\\", "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? normalized;
}

export async function resolveReviewVerificationInputFromRefs(input: {
  refs: string[];
  worktreePath: string;
}): Promise<ReviewVerificationInputResolution> {
  const matchedRef = input.refs.find(
    (ref) => getRefBasename(ref) === REVIEW_VERIFICATION_INPUT_FILENAME
  );
  if (matchedRef === undefined) {
    throw new ReviewVerificationError(
      "review_verification_ref_missing",
      `Accuracy-critical reviewer PASS requires a --ref to ${REVIEW_VERIFICATION_INPUT_FILENAME}.`,
      {
        inputRef: REVIEW_VERIFICATION_INPUT_FILENAME,
        reason: "review_verification_ref_missing",
        worktreePath: input.worktreePath
      }
    );
  }

  const resolvedPath = isAbsolute(matchedRef)
    ? resolve(matchedRef)
    : resolve(input.worktreePath, matchedRef);
  const raw = await readFile(resolvedPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      const reason = error.code ?? "unknown";
      throw new ReviewVerificationError(
        "review_verification_ref_unreadable",
        `Failed to read review verification input (${resolvedPath}): ${reason}.`,
        {
          inputRef: getRefBasename(matchedRef),
          path: resolvedPath,
          reason: "review_verification_ref_unreadable",
          worktreePath: input.worktreePath
        }
      );
    }
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ReviewVerificationError(
      "review_verification_json_invalid",
      `Invalid JSON in ${REVIEW_VERIFICATION_INPUT_FILENAME}: ${reason}`,
      {
        inputRef: getRefBasename(matchedRef),
        path: resolvedPath,
        reason: "review_verification_json_invalid",
        worktreePath: input.worktreePath
      }
    );
  }

  const validated = validateReviewVerificationPayload(parsed);
  if (!validated.ok) {
    const detail = validated.errors
      .map((entry) =>
        entry.path !== undefined
          ? `${entry.path}: ${entry.message}`
          : entry.message
      )
      .join(" ");
    throw new ReviewVerificationError(
      "review_verification_schema_invalid",
      `Invalid ${REVIEW_VERIFICATION_SCHEMA} payload: ${detail}`,
      {
        inputRef: getRefBasename(matchedRef),
        path: resolvedPath,
        reason: "review_verification_schema_invalid",
        schema: REVIEW_VERIFICATION_SCHEMA,
        worktreePath: input.worktreePath
      }
    );
  }

  return {
    inputRef: getRefBasename(matchedRef),
    resolvedPath,
    payload: validated.value
  };
}

export async function writeReviewVerificationArtifactAtomic(
  path: string,
  artifact: ReviewVerificationArtifact
): Promise<void> {
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  await rename(tempPath, path);
}

export async function readReviewVerificationArtifactStatus(
  artifactPath: string,
  options: ReadReviewVerificationArtifactStatusOptions = {}
): Promise<ReviewVerificationArtifactStatus> {
  const raw = await readFile(artifactPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return undefined;
      }
      return null;
    }
  );

  if (raw === undefined) {
    return {
      status: "missing"
    };
  }
  if (raw === null) {
    return {
      status: "invalid"
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      status: "invalid"
    };
  }

  const validated = validateReviewVerificationArtifact(parsed);
  if (!validated.ok) {
    return {
      status: "invalid"
    };
  }

  if (
    options.expectedRound !== undefined
    && validated.value.meta.round !== options.expectedRound
  ) {
    return {
      status: "invalid"
    };
  }
  if (
    options.expectedReviewer !== undefined
    && validated.value.meta.reviewer !== options.expectedReviewer
  ) {
    return {
      status: "invalid"
    };
  }

  return {
    status: validated.value.overall,
    artifact: validated.value
  };
}
