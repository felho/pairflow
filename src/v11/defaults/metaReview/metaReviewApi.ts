import { readFile, rm, writeFile } from "node:fs/promises";

import {
  clearLiveMetaReviewSnapshot,
  hasCanonicalSubmitForActiveMetaReviewRound,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
} from "../../shared/metaReview/metaReviewSnapshot.js";
import {
  MetaReviewError,
  type MetaReviewErrorReasonCode
} from "../../shared/metaReview/metaReviewError.js";
import { asMetaReviewError as throwAsMetaReviewError } from "../../shared/metaReview/metaReviewCommandErrorMapping.js";
import { resolveMetaReviewRunnerMode } from "../../shared/metaReview/liveRun/metaReviewLiveRunnerConfig.js";
import {
  runMetaReview as runMetaReviewShared
} from "../../shared/metaReview/liveRun/metaReviewLiveRunRuntime.js";
import {
  runCodexAgentLiveReview,
  runCodexPaneLiveReview
} from "../../infrastructure/executor/sessionRuntime/metaReviewLiveRunnerRuntime.js";
import type {
  MetaReviewDependencies,
  MetaReviewResult,
  MetaReviewRunInput
} from "../../shared/metaReview/liveRun/metaReviewLiveRunContract.js";

export type {
  MetaReviewDepth,
  MetaReviewLastReportView,
  MetaReviewLiveRunnerInput,
  MetaReviewReadInput,
  MetaReviewReviewerVerdict,
  MetaReviewRunWarning,
  MetaReviewStatusView,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "../../shared/metaReview/liveRun/metaReviewLiveRunContract.js";
export type { MetaReviewErrorReasonCode };
export {
  extractMetaReviewDelimitedBlock,
  parseMetaReviewRunnerOutput
} from "../../shared/metaReview/liveRun/metaReviewLiveRunner.js";
export {
  getMetaReviewLastReportV11 as getMetaReviewLastReport,
  getMetaReviewStatusV11 as getMetaReviewStatus,
  submitMetaReviewResultV11 as submitMetaReviewResult,
  toMetaReviewErrorV11 as toMetaReviewError
} from "../../application/metaReview/emitMetaReviewV11.js";
export {
  clearLiveMetaReviewSnapshot,
  hasCanonicalSubmitForActiveMetaReviewRound,
  MetaReviewError,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
};

export async function runMetaReview(
  input: MetaReviewRunInput,
  dependencies: MetaReviewDependencies = {}
): Promise<MetaReviewResult> {
  const runLiveReview =
    dependencies.runLiveReview ??
    (async (liveInput) => {
      const mode = resolveMetaReviewRunnerMode();
      if (mode === "unavailable") {
        throw new MetaReviewError({
          reasonCode: "META_REVIEW_UNKNOWN_ERROR",
          message: "Meta-review runner adapter is unavailable.",
          context: {
            source: "meta_review_api",
            reason: "runner_adapter_unavailable"
          }
        });
      }
      if (mode === "agent") {
        return runCodexAgentLiveReview(liveInput);
      }
      return runCodexPaneLiveReview(liveInput);
    });

  return runMetaReviewShared(input, {
    readFile: dependencies.readFile ?? readFile,
    writeFile: dependencies.writeFile ?? writeFile,
    removeFile:
      dependencies.removeFile ??
      (async (artifactPath: string) => {
        await rm(artifactPath, { force: true });
      }),
    ...dependencies,
    runLiveReview
  });
}

export function asMetaReviewError(error: unknown): never {
  return throwAsMetaReviewError(error);
}
