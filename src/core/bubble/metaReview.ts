import {
  toMetaReviewError as toMetaReviewErrorV11
} from "../../v11/shared/metaReview/metaReviewCommandRuntime.js";
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

export type {
  MetaReviewDepth,
  MetaReviewDependencies,
  MetaReviewLastReportView,
  MetaReviewLiveRunnerInput,
  MetaReviewReadInput,
  MetaReviewResult,
  MetaReviewReviewerVerdict,
  MetaReviewRunInput,
  MetaReviewRunWarning,
  MetaReviewStatusView,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "../../v11/shared/metaReview/liveRun/metaReviewLiveRunContract.js";
export type { MetaReviewErrorReasonCode };
export { runMetaReview } from "../../v11/shared/metaReview/liveRun/metaReviewLiveRunRuntime.js";
export {
  extractMetaReviewDelimitedBlock,
  parseMetaReviewRunnerOutput
} from "../../v11/shared/metaReview/liveRun/metaReviewLiveRunner.js";
export {
  getMetaReviewLastReport,
  getMetaReviewStatus,
  submitMetaReviewResult,
  toMetaReviewError
} from "../../v11/shared/metaReview/metaReviewCommandRuntime.js";
export {
  clearLiveMetaReviewSnapshot,
  hasCanonicalSubmitForActiveMetaReviewRound,
  MetaReviewError,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
};

export function asMetaReviewError(error: unknown): never {
  throw toMetaReviewErrorV11(error);
}
