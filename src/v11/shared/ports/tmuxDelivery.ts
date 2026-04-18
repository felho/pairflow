import type {
  DeliveryAck,
  DeliveryAckReasonCode,
  DeliveryAckStatus,
  DeliveryFailureReason,
  DeliveryTargetReasonCode,
  EmitDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationResult,
  ResolveDeliveryMessageRefInput
} from "../delivery/tmuxDeliveryContract.js";
import type * as TmuxDeliveryContract from "../delivery/tmuxDeliveryContract.js";

export type {
  AcceptedDeliveryAck,
  AcceptedTmuxDeliveryAck,
  DeliveryAck,
  DeliveryAckReasonCode,
  DeliveryAckStatus,
  DeliveryFailureReason,
  DeliveryTargetReasonCode,
  EmitDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationResult,
  RejectedTmuxDeliveryAck,
  RejectedDeliveryAck,
  ResolveDeliveryMessageRefInput,
  RetryStuckAgentInputOptions,
  RetryStuckAgentInputResult,
  TmuxDeliveryAck,
  TmuxDeliveryAckReasonCode,
  TmuxDeliveryAckStatus,
  TmuxDeliveryFailureReason
} from "../delivery/tmuxDeliveryContract.js";

export type EmitDeliveryNotificationAckPort = (
  input: EmitDeliveryNotificationInput
) => Promise<DeliveryAck>;

export interface AcceptedDeliveryAckCompatShape {
  status: "accepted";
  delivered?: true;
  sessionName: string;
  targetPaneIndex: number;
  message: string;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  reason?: never;
  reason_code?: never;
}

export interface RejectedDeliveryAckCompatShape {
  status: "rejected";
  delivered?: false;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: DeliveryFailureReason;
  reason_code?: DeliveryAckReasonCode;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

export interface LegacyDeliveryAckCompatShape {
  status?: DeliveryAckStatus;
  delivered: boolean;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: DeliveryFailureReason;
  reason_code?: DeliveryAckReasonCode;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

export type DeliveryAckCompatShape =
  | AcceptedDeliveryAckCompatShape
  | RejectedDeliveryAckCompatShape
  | LegacyDeliveryAckCompatShape;

export type DeliveryAckLike =
  | DeliveryAck
  | EmitTmuxDeliveryNotificationResult
  | DeliveryAckCompatShape;

export type EmitDeliveryAckLikePort = (
  input: EmitDeliveryNotificationInput
) => Promise<DeliveryAckLike>;

export type EmitTmuxDeliveryNotificationAckPort = EmitDeliveryNotificationAckPort;

export type EmitTmuxDeliveryNotificationPort = (
  input: EmitTmuxDeliveryNotificationInput
) => Promise<EmitTmuxDeliveryNotificationResult>;

export type ResolveDeliveryMessageRefPort = (
  input: ResolveDeliveryMessageRefInput
) => string;

export type RetryStuckAgentInputPort = (
  input: TmuxDeliveryContract.RetryStuckAgentInputOptions
) => Promise<TmuxDeliveryContract.RetryStuckAgentInputResult>;
