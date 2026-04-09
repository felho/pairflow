export {
  ApprovalCommandErrorV11 as ApprovalCommandError,
  asApprovalCommandErrorV11 as asApprovalCommandError,
  emitApprovalDecisionV11 as emitApprovalDecision,
  emitApproveV11 as emitApprove,
  emitRequestReworkV11 as emitRequestRework
} from "../../v11/application/approval/emitApprovalV11.js";
export type {
  ApprovalCommandDependencies,
  ApprovalCommandDefaultDependencies,
  EmitApprovalDecisionV11Dependencies as EmitApprovalDecisionDependencies,
  EmitApprovalDecisionV11Input as EmitApprovalDecisionInput,
  EmitApprovalDecisionV11Result as EmitApprovalDecisionResult,
  EmitApproveV11Input as EmitApproveInput,
  EmitRequestReworkImmediateV11Result as EmitRequestReworkImmediateResult,
  EmitRequestReworkV11Input as EmitRequestReworkInput,
  EmitRequestReworkQueuedV11Result as EmitRequestReworkQueuedResult,
  EmitRequestReworkV11Result as EmitRequestReworkResult,
  ResolvedApprovalCommandDependencies
} from "../../v11/application/approval/emitApprovalV11.js";
