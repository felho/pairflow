import {
  type LoadedStateSnapshot
} from "../../ports/stateSnapshots.js";
import type {
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import { isNamedError } from "../../errors/namedError.js";

type GateReasonCode =
  | "META_REVIEW_GATE_STATE_CONFLICT"
  | "META_REVIEW_GATE_TRANSITION_INVALID";

type RollbackReasonCode =
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_NOT_ATTEMPTED"
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_APPLIED"
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_STATE_CONFLICT"
  | "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_TRANSITION_INVALID";

export interface ApprovalRefreshRollbackContext {
  gateReasonCode: GateReasonCode;
  rollbackReasonCode: RollbackReasonCode;
  rollbackContext: string;
}

export async function resolveApprovalRefreshRollbackContext(input: {
  statePath: string;
  loadedState: LoadedStateSnapshot;
  written: LoadedStateSnapshot;
  writeStateFn: WriteStateSnapshotPort;
}): Promise<ApprovalRefreshRollbackContext> {
  let rollbackReasonCode: RollbackReasonCode =
    "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_NOT_ATTEMPTED";
  let rollbackContext = "rollback_outcome=not_attempted";
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
    if (isNamedError(rollbackError, "StateStoreConflictError")) {
      gateReasonCode = "META_REVIEW_GATE_STATE_CONFLICT";
      rollbackReasonCode =
        "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_STATE_CONFLICT";
    } else {
      rollbackReasonCode =
        "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_TRANSITION_INVALID";
    }
  }

  return {
    gateReasonCode,
    rollbackReasonCode,
    rollbackContext
  };
}

export function buildApprovalRefreshFailureMessage(input: {
  gateReasonCode: GateReasonCode;
  appendReason: string;
  rollbackReasonCode: RollbackReasonCode;
  rollbackTargetState: string;
  rollbackContext: string;
}): string {
  return `${input.gateReasonCode}: approval refresh append failed after state update (append_error=${input.appendReason}; rollback_reason_code=${input.rollbackReasonCode}; rollback_target_state=${input.rollbackTargetState}; ${input.rollbackContext}).`;
}
