import { readFile, rm, writeFile } from "node:fs/promises";

import {
  toMetaReviewErrorV11
} from "../../v11/application/metaReview/emitMetaReviewV11.js";
import {
  clearLiveMetaReviewSnapshot,
  hasCanonicalSubmitForActiveMetaReviewRound,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
} from "../../v11/shared/metaReview/metaReviewSnapshot.js";
import {
  MetaReviewError,
  type MetaReviewErrorReasonCode
} from "../../v11/shared/metaReview/metaReviewError.js";
import { resolveMetaReviewRunnerMode } from "../../v11/shared/metaReview/liveRun/metaReviewLiveRunnerConfig.js";
import {
  runMetaReview as runMetaReviewShared
} from "../../v11/shared/metaReview/liveRun/metaReviewLiveRunRuntime.js";
import {
  runCodexAgentLiveReview,
  runCodexPaneLiveReview
} from "../../v11/infrastructure/executor/sessionRuntime/metaReviewLiveRunnerRuntime.js";
import type {
  MetaReviewDependencies,
  MetaReviewResult,
  MetaReviewRunInput
} from "../../v11/shared/metaReview/liveRun/metaReviewLiveRunContract.js";

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
} from "../../v11/shared/metaReview/liveRun/metaReviewLiveRunContract.js";
export type { MetaReviewErrorReasonCode };
export {
  extractMetaReviewDelimitedBlock,
  parseMetaReviewRunnerOutput
} from "../../v11/shared/metaReview/liveRun/metaReviewLiveRunner.js";
export {
  getMetaReviewLastReportV11 as getMetaReviewLastReport,
  getMetaReviewStatusV11 as getMetaReviewStatus,
  submitMetaReviewResultV11 as submitMetaReviewResult,
  toMetaReviewErrorV11 as toMetaReviewError
} from "../../v11/application/metaReview/emitMetaReviewV11.js";
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
        throw new Error("Meta-review runner adapter is unavailable.");
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
  throw toMetaReviewErrorV11(error);
}
