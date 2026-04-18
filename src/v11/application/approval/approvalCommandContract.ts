import type {
  DeliveryAck,
  EmitDeliveryAckLikePort
} from "../../shared/ports/tmuxDelivery.js";
import type {
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  ApprovalDecision,
  ProtocolEnvelope
} from "../../../types/protocol.js";

export interface EmitApprovalDecisionDependencies {
  emitTmuxDeliveryNotification?: EmitDeliveryAckLikePort;
}

export interface ApprovalDecisionDeliverySignal {
  status: DeliveryAck["status"];
  delivered?: boolean;
  message: string;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: NonNullable<
    DeliveryAck["deliveryTargetReasonCode"]
  >;
  reason?: Extract<DeliveryAck, { status: "rejected" }>["reason"];
  reason_code?: Extract<DeliveryAck, { status: "rejected" }>["reason_code"];
}

export interface ApprovalDecisionDeliverySignalsResult {
  statusDelivery: ApprovalDecisionDeliverySignal;
  implementerDelivery?: ApprovalDecisionDeliverySignal;
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
