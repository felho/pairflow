import type {
  EmitApprovalDecisionResult,
  EmitRequestReworkResult
} from "../../approvalCommandContract.js";
import type { ResolvedApprovalCommandDependencies } from "../command/approvalCommandDependencies.js";
import type {
  NormalizedApprovalDecisionInput,
  NormalizedRequestReworkInput
} from "../command/approvalCommandInputNormalization.js";

export interface ApprovalCommandPipelineDecisionInput
  extends NormalizedApprovalDecisionInput {
  intent: "approval_decision";
  overrideNonApprove?: boolean | undefined;
  createError: PairflowCreateCommandError;
}

export interface ApprovalCommandPipelineRequestReworkInput
  extends NormalizedRequestReworkInput {
  intent: "request_rework";
  createError: PairflowCreateCommandError;
}

export type ApprovalCommandPipelineInput =
  | ApprovalCommandPipelineDecisionInput
  | ApprovalCommandPipelineRequestReworkInput;

export type ApprovalCommandPipelineDependencies =
  ResolvedApprovalCommandDependencies;

export type ApprovalCommandPipelineResult =
  | EmitApprovalDecisionResult
  | EmitRequestReworkResult;
