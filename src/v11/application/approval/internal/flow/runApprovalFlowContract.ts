import type {
  NormalizedApprovalDecisionInput,
  NormalizedRequestReworkInput
} from "../command/approvalCommandInputNormalization.js";

export interface RunApprovalDecisionFlowInput extends NormalizedApprovalDecisionInput {
  createError: PairflowCreateCommandError;
}

export interface RunRequestReworkFlowInput extends NormalizedRequestReworkInput {
  createError: PairflowCreateCommandError;
}
