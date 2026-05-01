import { readFile } from "node:fs/promises";

import {
  MetaReviewError,
  submitMetaReviewResult,
  toMetaReviewError
} from "../../shared/metaReview/metaReviewCommandApi.js";
import { resolveMetaReviewGateDependencyDefaults } from "../metaReviewGate/metaReviewGateDependencyDefaults.js";
import { resolveMetaReviewerPaneWarning } from "../metaReviewGate/metaReviewGatePaneBinding.js";
import {
  notifyMetaReviewerSubmissionRequestV11
} from "../metaReviewGate/emitMetaReviewGateV11.js";
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
    emitDeliveryNotificationAck: NonNullable<
      MetaReviewCommandDependencies["emitDeliveryNotification"]
    >;
    resolveDeliveryMessageRef: NonNullable<
      MetaReviewCommandDependencies["buildDeliveryMessageRef"]
    >;
  }>
  | undefined;

async function loadMetaReviewDefaults(): Promise<NonNullable<
  Awaited<typeof metaReviewDefaultsPromise>
>> {
  metaReviewDefaultsPromise ??= import(
    "../../defaults/metaReview/metaReviewDefaults.js"
  ).then(({ metaReviewDefaults }) => metaReviewDefaults);
  return metaReviewDefaultsPromise;
}

async function withMetaReviewDefaults(
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewCommandDependencies> {
  const metaReviewDefaults = await loadMetaReviewDefaults();
  const metaReviewGateDefaults = await resolveMetaReviewGateDependencyDefaults();
  return {
    readFile,
    emitDeliveryNotification: metaReviewDefaults.emitDeliveryNotificationAck,
    buildDeliveryMessageRef: metaReviewDefaults.resolveDeliveryMessageRef,
    readTranscriptEnvelopes: metaReviewGateDefaults.readTranscriptEnvelopes,
    setMetaReviewerPaneBinding: metaReviewGateDefaults.setMetaReviewerPaneBinding,
    notifyMetaReviewerSubmissionRequest:
      notifyMetaReviewerSubmissionRequestV11,
    resolveMetaReviewerPaneWarning,
    runtime: metaReviewGateDefaults.runtime,
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
