import { metaReviewGateDependencyDefaults } from "../../../core/bubble/metaReviewGateDefaults.js";

import {
  applyMetaReviewGateOnConvergence,
  asMetaReviewGateError,
  MetaReviewGateError,
  recoverMetaReviewGateFromSnapshot,
  toMetaReviewGateError
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewGateResult,
  RecoverMetaReviewGateFromSnapshotDependencies,
  RecoverMetaReviewGateFromSnapshotInput
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import { notifyMetaReviewerSubmissionRequest } from "./metaReviewGateNotify.js";
import { resolveMetaReviewerPaneWarning } from "./metaReviewGatePaneBinding.js";

function withMetaReviewGateApplyDefaults(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): ApplyMetaReviewGateOnConvergenceDependencies {
  return {
    appendProtocolEnvelope:
      metaReviewGateDependencyDefaults.appendProtocolEnvelope,
    readStateSnapshot: metaReviewGateDependencyDefaults.readStateSnapshot,
    resolveBubbleById: metaReviewGateDependencyDefaults.resolveBubbleById,
    setMetaReviewerPaneBinding:
      metaReviewGateDependencyDefaults.setMetaReviewerPaneBinding,
    writeStateSnapshot: metaReviewGateDependencyDefaults.writeStateSnapshot,
    readFile: metaReviewGateDependencyDefaults.readFile,
    runTmux: metaReviewGateDependencyDefaults.runTmux,
    notifyMetaReviewerSubmissionRequest,
    resolveMetaReviewerPaneWarning,
    ...dependencies
  };
}

function withMetaReviewGateRecoveryDefaults(
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): RecoverMetaReviewGateFromSnapshotDependencies {
  return {
    readFile: metaReviewGateDependencyDefaults.readFile,
    writeFile: metaReviewGateDependencyDefaults.writeFile,
    ...dependencies
  };
}

export {
  asMetaReviewGateError as asMetaReviewGateErrorV11,
  MetaReviewGateError as MetaReviewGateErrorV11,
  toMetaReviewGateError as toMetaReviewGateErrorV11
};
export {
  notifyMetaReviewerSubmissionRequest as notifyMetaReviewerSubmissionRequestV11
};
export type {
  ApplyMetaReviewGateOnConvergenceDependencies as ApplyMetaReviewGateOnConvergenceV11Dependencies,
  ApplyMetaReviewGateOnConvergenceInput as ApplyMetaReviewGateOnConvergenceV11Input,
  MetaReviewGateReasonCode as MetaReviewGateReasonCodeV11,
  MetaReviewGateResult as MetaReviewGateResultV11,
  MetaReviewGateRoute as MetaReviewGateRouteV11,
  NotifyMetaReviewerSubmissionRequestDependencies as NotifyMetaReviewerSubmissionRequestV11Dependencies,
  NotifyMetaReviewerSubmissionRequestInput as NotifyMetaReviewerSubmissionRequestV11Input,
  RecoverMetaReviewGateFromSnapshotDependencies as RecoverMetaReviewGateFromSnapshotV11Dependencies,
  RecoverMetaReviewGateFromSnapshotInput as RecoverMetaReviewGateFromSnapshotV11Input
} from "./metaReviewGateCommandContract.js";

export async function applyMetaReviewGateOnConvergenceV11(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  return applyMetaReviewGateOnConvergence(
    input,
    withMetaReviewGateApplyDefaults(dependencies)
  );
}

export async function recoverMetaReviewGateFromSnapshotV11(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): Promise<MetaReviewGateResult> {
  return recoverMetaReviewGateFromSnapshot(
    input,
    withMetaReviewGateRecoveryDefaults(dependencies)
  );
}
