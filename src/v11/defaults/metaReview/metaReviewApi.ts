import { readFile, rm, writeFile } from "node:fs/promises";

import {
  clearLiveMetaReviewSnapshot,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
} from "../../shared/metaReview/metaReviewSnapshot.js";
import {
  MetaReviewError,
  type MetaReviewErrorReasonCode
} from "../../shared/metaReview/metaReviewError.js";
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
  MetaReviewLiveRunnerInput,
  MetaReviewReviewerVerdict,
  MetaReviewRunWarning,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "../../shared/metaReview/liveRun/metaReviewLiveRunContract.js";
export type { MetaReviewErrorReasonCode };
export {
  extractMetaReviewDelimitedBlock,
  parseMetaReviewRunnerOutput
} from "../../shared/metaReview/liveRun/metaReviewLiveRunner.js";
export {
  submitMetaReviewResultV11 as submitMetaReviewResult,
  toMetaReviewErrorV11 as toMetaReviewError
} from "../../application/metaReview/emitMetaReviewV11.js";
export {
  clearLiveMetaReviewSnapshot,
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
