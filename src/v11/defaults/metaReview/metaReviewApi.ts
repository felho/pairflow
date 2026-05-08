import { readFile } from "node:fs/promises";

import {
  clearLiveMetaReviewSnapshot,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
} from "../../shared/metaReview/metaReviewSnapshot.js";
import {
  MetaReviewError,
  type MetaReviewErrorReasonCode
} from "../../shared/metaReview/metaReviewError.js";
export type { MetaReviewErrorReasonCode };
export type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "../../shared/metaReview/metaReviewCommandContract.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewSubmitInput,
  MetaReviewSubmitResult
} from "../../shared/metaReview/metaReviewCommandContract.js";
import {
  resolveMetaReviewerPaneWarning
} from "../../application/metaReviewGate/metaReviewGatePaneBinding.js";
import {
  submitMetaReviewResultV11,
  toMetaReviewErrorV11
} from "../../application/metaReview/emitMetaReviewV11.js";
import {
  notifyMetaReviewerSubmissionRequestV11
} from "../metaReviewGate/metaReviewGateApi.js";
import {
  metaReviewGateDependencyDefaults
} from "../metaReviewGate/metaReviewGateCommandDefaults.js";
import {
  metaReviewDefaults
} from "./metaReviewDefaults.js";

export {
  submitMetaReviewResult as submitMetaReviewResultV11,
  toMetaReviewErrorV11 as toMetaReviewError
};
export { toMetaReviewErrorV11 };
export type {
  MetaReviewSubmitResultV11
} from "../../application/metaReview/emitMetaReviewV11.js";
export {
  clearLiveMetaReviewSnapshot,
  MetaReviewError,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
};

function withMetaReviewDefaults(
  dependencies: MetaReviewCommandDependencies = {}
): MetaReviewCommandDependencies {
  return {
    readFile,
    emitDeliveryNotification: metaReviewDefaults.emitDeliveryNotificationAck,
    buildDeliveryMessageRef: metaReviewDefaults.resolveDeliveryMessageRef,
    readRuntimeSessionsRegistry: metaReviewDefaults.readRuntimeSessionsRegistry,
    readTranscriptEnvelopes: metaReviewGateDependencyDefaults.readTranscriptEnvelopes,
    setMetaReviewerPaneBinding:
      metaReviewGateDependencyDefaults.setMetaReviewerPaneBinding,
    notifyMetaReviewerSubmissionRequest:
      notifyMetaReviewerSubmissionRequestV11,
    resolveMetaReviewerPaneWarning,
    runMetaReviewApproveValidationCommand:
      metaReviewDefaults.runPassValidationCommand,
    runtime: metaReviewGateDependencyDefaults.runtime,
    ...dependencies
  };
}

export async function submitMetaReviewResult(
  input: MetaReviewSubmitInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewSubmitResult> {
  return submitMetaReviewResultV11(input, withMetaReviewDefaults(dependencies));
}
