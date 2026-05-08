import {
  toMetaReviewError
} from "../../shared/metaReview/metaReviewCommandErrorMapping.js";
import { MetaReviewError } from "../../shared/metaReview/metaReviewError.js";
import { submitMetaReviewResult } from "./metaReviewCommandSubmitRuntime.js";
export type {
  MetaReviewSubmitResult as MetaReviewSubmitResultV11
} from "./metaReviewCommandContract.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "../../shared/metaReview/metaReviewCommandContract.js";

export {
  MetaReviewError as MetaReviewErrorV11,
  toMetaReviewError as toMetaReviewErrorV11
};

export async function submitMetaReviewResultV11(
  input: MetaReviewSubmitInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewSubmitResult> {
  return submitMetaReviewResult(input, dependencies);
}
