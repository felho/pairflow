import type {
  NormalizedApprovalDecisionInput,
  NormalizedRequestReworkInput
} from "../../shared/approval/approvalCommandInputNormalization.js";

export interface RunApprovalDecisionFlowInput extends NormalizedApprovalDecisionInput {
  createError: (message: string) => Error;
}

export interface RunRequestReworkFlowInput extends NormalizedRequestReworkInput {
  createError: (message: string) => Error;
}
