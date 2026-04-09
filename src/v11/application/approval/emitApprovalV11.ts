export {
  ApprovalCommandError as ApprovalCommandErrorV11,
  asApprovalCommandError as asApprovalCommandErrorV11,
  emitApprovalDecision as emitApprovalDecisionV11,
  emitApprove as emitApproveV11,
  emitRequestRework as emitRequestReworkV11
} from "./approvalCommandApi.js";
export type {
  ApprovalCommandDependencies,
  ApprovalCommandDefaultDependencies,
  EmitApprovalDecisionDependencies as EmitApprovalDecisionV11Dependencies,
  EmitApprovalDecisionInput as EmitApprovalDecisionV11Input,
  EmitApprovalDecisionResult as EmitApprovalDecisionV11Result,
  EmitApproveInput as EmitApproveV11Input,
  EmitRequestReworkImmediateResult as EmitRequestReworkImmediateV11Result,
  EmitRequestReworkInput as EmitRequestReworkV11Input,
  EmitRequestReworkQueuedResult as EmitRequestReworkQueuedV11Result,
  EmitRequestReworkResult as EmitRequestReworkV11Result,
  ResolvedApprovalCommandDependencies
} from "./approvalCommandApi.js";
