import { isMissingFileError } from "./metaReviewLiveRunErrors.js";
import type {
  MetaReviewDependencies,
  MetaReviewRunWarning
} from "./metaReviewLiveRunContract.js";
import type {
  MetaReviewArtifactReadPort,
  MetaReviewArtifactWritePort
} from "../metaReviewArtifactIo.js";
import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../../types/bubble.js";

export interface RollingArtifactBackupEntry {
  artifactPath: string;
  existed: boolean;
  contents: string | null;
}

interface BuildMetaReviewLastJsonArtifactPayloadInput {
  bubbleId: string;
  runId: string;
  round: number;
  generatedAt: string;
  depth: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string | null;
  reportRef: string;
  reworkTargetMessage: string | null;
  warnings: MetaReviewRunWarning[];
  canonicalReportJson: Record<string, unknown>;
}

export function buildMetaReviewLastJsonArtifactPayload(
  input: BuildMetaReviewLastJsonArtifactPayloadInput
): Record<string, unknown> {
  return {
    bubble_id: input.bubbleId,
    run_id: input.runId,
    round: input.round,
    generated_at: input.generatedAt,
    depth: input.depth,
    status: input.status,
    recommendation: input.recommendation,
    summary: input.summary,
    report_ref: input.reportRef,
    report_json_ref: input.reportRef,
    rework_target_message: input.reworkTargetMessage,
    warnings: input.warnings,
    report_json: input.canonicalReportJson
  };
}

async function readRollingArtifactBackup(
  artifactPath: string,
  readFileFn: MetaReviewArtifactReadPort
): Promise<RollingArtifactBackupEntry> {
  try {
    const contents = await readFileFn(artifactPath, "utf8");
    return {
      artifactPath,
      existed: true,
      contents
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        artifactPath,
        existed: false,
        contents: null
      };
    }
    throw error;
  }
}

function buildArtifactWriteWarning(
  failedArtifactWrites: PromiseRejectedResult[]
): MetaReviewRunWarning | null {
  if (failedArtifactWrites.length === 0) {
    return null;
  }
  const message = failedArtifactWrites
    .map((result) =>
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason)
    )
    .join("; ");
  return {
    reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
    message
  };
}

export async function persistMetaReviewLastJsonArtifact(input: {
  artifactPath: string;
  reportPayload: Record<string, unknown>;
  readFileFn: MetaReviewArtifactReadPort;
  writeFileFn: MetaReviewArtifactWritePort;
}): Promise<{
  artifactBackup: RollingArtifactBackupEntry[];
  writeWarning: MetaReviewRunWarning | null;
}> {
  const artifactBackup = await Promise.all([
    readRollingArtifactBackup(input.artifactPath, input.readFileFn)
  ]);

  const artifactWrites = await Promise.allSettled([
    input.writeFileFn(
      input.artifactPath,
      `${JSON.stringify(input.reportPayload, null, 2)}\n`,
      "utf8"
    )
  ]);

  const failedArtifactWrites = artifactWrites.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );

  return {
    artifactBackup,
    writeWarning: buildArtifactWriteWarning(failedArtifactWrites)
  };
}

export type MetaReviewReadFileFn = MetaReviewArtifactReadPort;
export type MetaReviewWriteFileFn = MetaReviewArtifactWritePort;
