import type { MetaReviewResult } from "../../../../shared/metaReview/metaReviewTypes.js";
import type { Finding } from "../../../../../types/findings.js";
import type { FindingsParityMetadata } from "../../../../../types/protocol.js";
import type { normalizeMetaReviewSnapshot } from "../../../../domain/metaReviewGate/snapshotState.js";
import { mergeRunResultWithParityResolution } from "../../../../domain/metaReviewGate/runResultParity.js";
import { validateStructuredMetaReviewPositiveClaim } from "../metaReviewGateFindingsValidation.js";
import type { MetaReviewGateArtifactReadFn } from "../../metaReviewGateFindingsMetadata.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "../../../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";

function callMetaReviewGateArtifactReadFn(
  readFileFn: MetaReviewGateArtifactReadFn,
  artifactPath: string,
  encoding: "utf8"
): Promise<string> {
  return readFileFn(artifactPath, encoding);
}

export async function resolveCurrentRunParity(input: {
  resolved: FinalizeCurrentRunMetaReviewGateInput["resolved"];
  snapshot: ReturnType<typeof normalizeMetaReviewSnapshot>;
  runResult: MetaReviewResult;
  readFileFn: MetaReviewGateArtifactReadFn;
}): Promise<
  | {
      ok: true;
      budgetAvailable: boolean;
      parityMetadata: FindingsParityMetadata | null;
      findingsForPayload: Finding[] | undefined;
      runResultForRouting: MetaReviewResult;
    }
  | {
      ok: false;
      reason: string;
      parityMetadata: FindingsParityMetadata | null;
      runResultForRouting: MetaReviewResult;
    }
> {
  const readFileFn = (artifactPath: string, encoding: "utf8") =>
    callMetaReviewGateArtifactReadFn(input.readFileFn, artifactPath, encoding);
  const parity = await validateStructuredMetaReviewPositiveClaim({
    runResult: input.runResult,
    ...(input.runResult.report_json !== undefined
      ? { reportJson: input.runResult.report_json }
      : {}),
    bubbleDir: input.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.resolved.bubblePaths.artifactsDir,
    readFileFn
  });
  if (!parity.ok) {
    return {
      ok: false,
      reason: parity.reason,
      parityMetadata: parity.metadata,
      runResultForRouting: mergeRunResultWithParityResolution({
        runResult: input.runResult,
        metadata: parity.metadata,
        diagnostics: []
      })
    };
  }
  return {
    ok: true,
    budgetAvailable: input.snapshot.auto_rework_count < input.snapshot.auto_rework_limit,
    parityMetadata: parity.metadata,
    findingsForPayload: parity.findingsForPayload,
    runResultForRouting: mergeRunResultWithParityResolution({
      runResult: input.runResult,
      metadata: parity.metadata,
      diagnostics: parity.diagnostics
    })
  };
}
