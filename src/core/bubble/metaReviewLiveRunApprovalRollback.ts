import { rm } from "node:fs/promises";

import { StateStoreConflictError, type LoadedStateSnapshot } from "../state/stateStore.js";
import type { MetaReviewDependencies } from "./metaReviewLiveRunContract.js";

type GateReasonCode =
  | "META_REVIEW_GATE_STATE_CONFLICT"
  | "META_REVIEW_GATE_TRANSITION_INVALID";

type RollbackReasonCode =
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_NOT_ATTEMPTED"
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_APPLIED"
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_STATE_CONFLICT"
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_TRANSITION_INVALID";

type ArtifactRestoreReasonCode =
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_NOT_ATTEMPTED"
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_APPLIED"
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_FAILED";

export interface RollingArtifactBackupEntry {
  artifactPath: string;
  existed: boolean;
  contents: string | null;
}

export interface ApprovalRefreshRollbackContext {
  gateReasonCode: GateReasonCode;
  rollbackReasonCode: RollbackReasonCode;
  rollbackContext: string;
  artifactRestoreReasonCode: ArtifactRestoreReasonCode;
  artifactRestoreContext: string;
}

export async function restoreRollingArtifactBackup(
  artifactBackup: RollingArtifactBackupEntry[],
  writeFileFn: NonNullable<MetaReviewDependencies["writeFile"]>
): Promise<void> {
  await Promise.all(
    artifactBackup.map((artifact) =>
      artifact.existed
        ? writeFileFn(artifact.artifactPath, artifact.contents ?? "", "utf8")
        : rm(artifact.artifactPath, { force: true })
    )
  );
}

export async function resolveApprovalRefreshRollbackContext(input: {
  statePath: string;
  loadedState: LoadedStateSnapshot;
  written: LoadedStateSnapshot;
  artifactBackup: RollingArtifactBackupEntry[];
  writeStateFn: NonNullable<MetaReviewDependencies["writeStateSnapshot"]>;
  writeFileFn: NonNullable<MetaReviewDependencies["writeFile"]>;
}): Promise<ApprovalRefreshRollbackContext> {
  let rollbackReasonCode: RollbackReasonCode =
    "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_NOT_ATTEMPTED";
  let rollbackContext = "rollback_outcome=not_attempted";
  let artifactRestoreReasonCode: ArtifactRestoreReasonCode =
    "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_NOT_ATTEMPTED";
  let artifactRestoreContext = "artifact_restore_outcome=not_attempted";
  let gateReasonCode: GateReasonCode = "META_REVIEW_GATE_TRANSITION_INVALID";

  try {
    await input.writeStateFn(input.statePath, input.loadedState.state, {
      expectedFingerprint: input.written.fingerprint,
      expectedState: input.written.state.state
    });
    rollbackReasonCode = "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_APPLIED";
    rollbackContext = "rollback_outcome=applied";
  } catch (rollbackError) {
    const rollbackReason =
      rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
    rollbackContext = `rollback_outcome=failed rollback_error=${rollbackReason}`;
    if (rollbackError instanceof StateStoreConflictError) {
      gateReasonCode = "META_REVIEW_GATE_STATE_CONFLICT";
      rollbackReasonCode =
        "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_STATE_CONFLICT";
    } else {
      rollbackReasonCode =
        "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_TRANSITION_INVALID";
    }
  }

  if (rollbackReasonCode === "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_APPLIED") {
    try {
      await restoreRollingArtifactBackup(input.artifactBackup, input.writeFileFn);
      artifactRestoreReasonCode =
        "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_APPLIED";
      artifactRestoreContext = "artifact_restore_outcome=applied";
    } catch (artifactRestoreError) {
      const artifactRestoreReason =
        artifactRestoreError instanceof Error
          ? artifactRestoreError.message
          : String(artifactRestoreError);
      artifactRestoreReasonCode =
        "META_REVIEW_GATE_REFRESH_APPROVAL_ARTIFACT_RESTORE_FAILED";
      artifactRestoreContext =
        `artifact_restore_outcome=failed artifact_restore_error=${artifactRestoreReason}`;
    }
  }

  return {
    gateReasonCode,
    rollbackReasonCode,
    rollbackContext,
    artifactRestoreReasonCode,
    artifactRestoreContext
  };
}

export function buildApprovalRefreshFailureMessage(input: {
  gateReasonCode: GateReasonCode;
  appendReason: string;
  rollbackReasonCode: RollbackReasonCode;
  rollbackTargetState: string;
  rollbackContext: string;
  artifactRestoreReasonCode: ArtifactRestoreReasonCode;
  artifactRestoreContext: string;
}): string {
  return `${input.gateReasonCode}: approval refresh append failed after state/artifact writes (append_error=${input.appendReason}; rollback_reason_code=${input.rollbackReasonCode}; rollback_target_state=${input.rollbackTargetState}; ${input.rollbackContext}; artifact_restore_reason_code=${input.artifactRestoreReasonCode}; ${input.artifactRestoreContext}).`;
}

