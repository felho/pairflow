import { readFile, writeFile } from "node:fs/promises";

import {
  getMetaReviewLastReport,
  getMetaReviewStatus,
  MetaReviewError,
  submitMetaReviewResult,
  toMetaReviewError
} from "../../shared/metaReview/metaReviewCommandApi.js";
export type {
  MetaReviewLastReportView as MetaReviewLastReportViewV11,
  MetaReviewStatusView as MetaReviewStatusViewV11,
  MetaReviewSubmitResult as MetaReviewSubmitResultV11
} from "./metaReviewCommandContract.js";
export type {
  MetaReviewReadInput as MetaReviewReadInputV11,
  MetaReviewSubmitInput as MetaReviewSubmitInputV11
} from "../../shared/metaReview/metaReviewCommandContract.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewLastReportView,
  MetaReviewReadInput,
  MetaReviewStatusView,
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

export async function getMetaReviewStatusV11(
  input: MetaReviewReadInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewStatusView> {
  return getMetaReviewStatus(input, await withMetaReviewDefaults(dependencies));
}

export async function getMetaReviewLastReportV11(
  input: MetaReviewReadInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewLastReportView> {
  return getMetaReviewLastReport(input, await withMetaReviewDefaults(dependencies));
}

export async function submitMetaReviewResultV11(
  input: MetaReviewSubmitInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewSubmitResult> {
  return submitMetaReviewResult(input, await withMetaReviewDefaults(dependencies));
}
