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
  submitMetaReviewResult as submitMetaReviewResultImpl
} from "../../application/metaReview/metaReviewCommandSubmitRuntime.js";
import {
  toMetaReviewError
} from "../../application/metaReview/internal/submit/metaReviewCommandErrorMapping.js";
import {
  notifyMetaReviewerSubmissionRequest
} from "../metaReviewGate/metaReviewGateApi.js";
import {
  metaReviewGateDependencyDefaults
} from "../metaReviewGate/metaReviewGateCommandDefaults.js";
import {
  metaReviewDefaults
} from "./metaReviewDefaults.js";

export { toMetaReviewError };
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
      notifyMetaReviewerSubmissionRequest,
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
  return submitMetaReviewResultImpl(input, withMetaReviewDefaults(dependencies));
}
