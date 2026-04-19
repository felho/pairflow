import type {
  DeliveryAckReasonCode,
  DeliveryAckStatus,
  DeliveryFailureReason,
  DeliveryTargetReasonCode
} from "./tmuxDelivery.js";

export interface UiAcceptedDeliverySignal {
  status: Extract<DeliveryAckStatus, "accepted">;
  message: string;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  reason?: never;
  reason_code?: never;
}

export interface UiRejectedDeliverySignal {
  status: Extract<DeliveryAckStatus, "rejected">;
  message: string;
  reason?: DeliveryFailureReason;
  reason_code?: DeliveryAckReasonCode;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

export type UiApprovalDecisionDeliverySignal =
  | UiAcceptedDeliverySignal
  | UiRejectedDeliverySignal;

export interface UiApprovalDecisionDeliverySignals {
  statusDelivery: UiApprovalDecisionDeliverySignal;
  implementerDelivery?: UiApprovalDecisionDeliverySignal;
}
