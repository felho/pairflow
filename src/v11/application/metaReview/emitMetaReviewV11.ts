import {
  MetaReviewError,
  submitMetaReviewResult,
  toMetaReviewError
} from "./metaReviewCommandApi.js";
export type {
  MetaReviewSubmitResult as MetaReviewSubmitResultV11
} from "./metaReviewCommandContract.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "../../shared/metaReview/metaReviewCommandContract.js";

export { MetaReviewError as MetaReviewErrorV11, toMetaReviewError as toMetaReviewErrorV11 };

export async function submitMetaReviewResultV11(
  input: MetaReviewSubmitInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewSubmitResult> {
  return submitMetaReviewResult(input, dependencies);
}
