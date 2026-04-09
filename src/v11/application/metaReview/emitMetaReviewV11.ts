import { readFile, writeFile } from "node:fs/promises";

import { metaReviewDefaults } from "../../../core/runtime/metaReviewDefaults.js";
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

function withMetaReviewDefaults(
  dependencies: MetaReviewCommandDependencies = {}
): MetaReviewCommandDependencies {
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
  return getMetaReviewStatus(input, withMetaReviewDefaults(dependencies));
}

export async function getMetaReviewLastReportV11(
  input: MetaReviewReadInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewLastReportView> {
  return getMetaReviewLastReport(input, withMetaReviewDefaults(dependencies));
}

export async function submitMetaReviewResultV11(
  input: MetaReviewSubmitInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewSubmitResult> {
  return submitMetaReviewResult(input, withMetaReviewDefaults(dependencies));
}
