import type {
  emitTmuxDeliveryNotification,
  EmitTmuxDeliveryNotificationResult
} from "../../../core/runtime/tmuxDelivery.js";
import type {
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  ApprovalDecision,
  ProtocolEnvelope
} from "../../../types/protocol.js";

export interface EmitApprovalDecisionDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
}

export interface ApprovalDecisionDeliverySignalsResult {
  statusDelivery: EmitTmuxDeliveryNotificationResult;
  implementerDelivery?: EmitTmuxDeliveryNotificationResult;
}

export interface EmitApprovalDecisionInput {
  bubbleId: string;
  decision: ApprovalDecision;
  overrideNonApprove?: boolean | undefined;
  overrideReason?: string | undefined;
  message?: string | undefined;
  refs?: string[] | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface EmitApprovalDecisionResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: ApprovalDecisionDeliverySignalsResult;
}

export interface EmitApproveInput {
  bubbleId: string;
  overrideNonApprove?: boolean | undefined;
  overrideReason?: string | undefined;
  refs?: string[] | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface EmitRequestReworkInput {
  bubbleId: string;
  message: string;
  refs?: string[] | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface EmitRequestReworkImmediateResult extends EmitApprovalDecisionResult {
  mode: "immediate";
}

export interface EmitRequestReworkQueuedResult {
  mode: "queued";
  bubbleId: string;
  intentId: string;
  state: BubbleStateSnapshot;
  supersededIntentId?: string;
}

export type EmitRequestReworkResult =
  | EmitRequestReworkImmediateResult
  | EmitRequestReworkQueuedResult;
