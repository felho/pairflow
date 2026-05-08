import type {
  DeliveryAck,
  EmitDeliveryNotificationAckPort
} from "../../ports/tmuxDelivery.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  ApprovalDecision,
  ProtocolEnvelope
} from "../../../types/protocol.js";

export interface EmitApprovalDecisionDependencies {
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
}

export interface AcceptedApprovalDecisionDeliverySignal {
  status: Extract<DeliveryAck["status"], "accepted">;
  message: string;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: NonNullable<
    DeliveryAck["deliveryTargetReasonCode"]
  >;
  reason?: never;
  reason_code?: never;
}

export interface RejectedApprovalDecisionDeliverySignal {
  status: Extract<DeliveryAck["status"], "rejected">;
  message: string;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: NonNullable<
    DeliveryAck["deliveryTargetReasonCode"]
  >;
  reason?: Extract<DeliveryAck, { status: "rejected" }>["reason"];
  reason_code?: Extract<DeliveryAck, { status: "rejected" }>["reason_code"];
}

export type ApprovalDecisionDeliverySignal =
  | AcceptedApprovalDecisionDeliverySignal
  | RejectedApprovalDecisionDeliverySignal;

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
