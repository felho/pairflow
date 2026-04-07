import { isAbsolute, relative, resolve } from "node:path";

import { isRecord } from "../validation/primitives.js";

export type MetaReviewGateArtifactReadFn = (
  artifactPath: string,
  encoding: "utf8"
) => Promise<string>;

function resolveMetaReviewReportJsonObject(
  source: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (source === undefined) {
    return undefined;
  }
  if (isRecord(source.report_json)) {
    return source.report_json;
  }
  return undefined;
}

export function resolveFindingsArtifactPath(input: {
  bubbleDir: string;
  artifactsDir: string;
  artifactRef: string;
}): string | undefined {
  if (
    !input.artifactRef.startsWith("artifacts/") ||
    input.artifactRef.includes("..") ||
    input.artifactRef.includes("\\") ||
    input.artifactRef.includes("\0")
  ) {
    return undefined;
  }
  const artifactPath = resolve(input.bubbleDir, input.artifactRef);
  const relativeToArtifacts = relative(input.artifactsDir, artifactPath);
  if (
    relativeToArtifacts.startsWith("..") ||
    isAbsolute(relativeToArtifacts)
  ) {
    return undefined;
  }
  return artifactPath;
}

export async function readMetaReviewReportJsonArtifact(input: {
  artifactPath: string;
  readFileFn: MetaReviewGateArtifactReadFn;
}): Promise<{
  reportJson?: Record<string, unknown>;
  diagnostics: string[];
}> {
  const diagnostics: string[] = [];
  const reader = input.readFileFn;
  let raw: string;
  try {
    raw = await reader(input.artifactPath, "utf8");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code !== "ENOENT") {
      diagnostics.push(
        `META_REVIEW_REPORT_JSON_ARTIFACT_READ_DIAGNOSTIC: ${input.artifactPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return { diagnostics };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    diagnostics.push(
      `META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: ${input.artifactPath}: ${error instanceof Error ? error.message : String(error)}`
    );
    return { diagnostics };
  }
  if (!isRecord(parsed)) {
    diagnostics.push(
      `META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: ${input.artifactPath}: top-level JSON value must be an object.`
    );
    return { diagnostics };
  }
  const reportJson = resolveMetaReviewReportJsonObject(parsed);
  if (reportJson === undefined) {
    diagnostics.push(
      `META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: ${input.artifactPath}: report_json claim object missing.`
    );
    return { diagnostics };
  }
  return { reportJson, diagnostics };
}
