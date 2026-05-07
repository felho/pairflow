import { readFile } from "node:fs/promises";

import {
  MetaReviewError,
  submitMetaReviewResult,
  toMetaReviewError
} from "./metaReviewCommandApi.js";
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

interface MetaReviewDefaultsModule {
  metaReviewDefaults: {
    emitDeliveryNotificationAck: NonNullable<
      MetaReviewCommandDependencies["emitDeliveryNotification"]
    >;
    readRuntimeSessionsRegistry: NonNullable<
      MetaReviewCommandDependencies["readRuntimeSessionsRegistry"]
    >;
    resolveDeliveryMessageRef: NonNullable<
      MetaReviewCommandDependencies["buildDeliveryMessageRef"]
    >;
    runPassValidationCommand: NonNullable<
      MetaReviewCommandDependencies["runMetaReviewApproveValidationCommand"]
    >;
  };
}

async function loadMetaReviewDefaults(): Promise<{
  emitDeliveryNotificationAck: NonNullable<
    MetaReviewCommandDependencies["emitDeliveryNotification"]
  >;
  readRuntimeSessionsRegistry: NonNullable<
    MetaReviewCommandDependencies["readRuntimeSessionsRegistry"]
  >;
  resolveDeliveryMessageRef: NonNullable<
    MetaReviewCommandDependencies["buildDeliveryMessageRef"]
  >;
  runPassValidationCommand: NonNullable<
    MetaReviewCommandDependencies["runMetaReviewApproveValidationCommand"]
  >;
}> {
  const defaultsModulePath = "../../defaults/metaReview/metaReviewDefaults.js";
  const { metaReviewDefaults } = await import(
    defaultsModulePath
  ) as MetaReviewDefaultsModule;
  return metaReviewDefaults;
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
    readRuntimeSessionsRegistry:
      metaReviewDefaults.readRuntimeSessionsRegistry,
    readTranscriptEnvelopes: metaReviewGateDefaults.readTranscriptEnvelopes,
    setMetaReviewerPaneBinding: metaReviewGateDefaults.setMetaReviewerPaneBinding,
    notifyMetaReviewerSubmissionRequest:
      notifyMetaReviewerSubmissionRequestV11,
    resolveMetaReviewerPaneWarning,
    runMetaReviewApproveValidationCommand:
      metaReviewDefaults.runPassValidationCommand,
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
