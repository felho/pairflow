import { readFile, writeFile } from "node:fs/promises";

import {
  MetaReviewError,
  submitMetaReviewResult,
  toMetaReviewError
} from "../../shared/metaReview/metaReviewCommandApi.js";
export type {
  MetaReviewSubmitResult as MetaReviewSubmitResultV11
} from "./metaReviewCommandContract.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "../../shared/metaReview/metaReviewCommandContract.js";

let metaReviewDefaultsPromise:
  | Promise<{
    emitTmuxDeliveryNotification: NonNullable<
      MetaReviewCommandDependencies["emitDeliveryNotification"]
    >;
    resolveDeliveryMessageRef: NonNullable<
      MetaReviewCommandDependencies["buildDeliveryMessageRef"]
    >;
  }>
  | undefined;

async function loadMetaReviewDefaults() {
  metaReviewDefaultsPromise ??= import(
    "../../defaults/metaReview/metaReviewDefaults.js"
  ).then(({ metaReviewDefaults }) => metaReviewDefaults);
  return metaReviewDefaultsPromise;
}

async function withMetaReviewDefaults(
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewCommandDependencies> {
  const metaReviewDefaults = await loadMetaReviewDefaults();
  return {
    readFile,
    writeFile,
    emitDeliveryNotification: metaReviewDefaults.emitTmuxDeliveryNotification,
    buildDeliveryMessageRef: metaReviewDefaults.resolveDeliveryMessageRef,
    ...dependencies
  };
}

export { MetaReviewError as MetaReviewErrorV11, toMetaReviewError as toMetaReviewErrorV11 };

export async function submitMetaReviewResultV11(
  input: MetaReviewSubmitInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewSubmitResult> {
  return submitMetaReviewResult(input, await withMetaReviewDefaults(dependencies));
}
