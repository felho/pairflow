import type {
  DeliveryAck,
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
