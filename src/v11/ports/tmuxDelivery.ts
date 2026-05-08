import type {
  DeliveryAck,
  EmitDeliveryNotificationInput,
  ResolveDeliveryMessageRefInput
} from "../shared/delivery/tmuxDeliveryContract.js";
import type * as TmuxDeliveryContract from "../shared/delivery/tmuxDeliveryContract.js";

export type {
  AcceptedDeliveryAck,
  DeliveryAck,
  DeliveryAckReasonCode,
  DeliveryAckStatus,
  DeliveryFailureReason,
  DeliveryTargetReasonCode,
  EmitDeliveryNotificationInput,
  RejectedDeliveryAck,
  ResolveDeliveryMessageRefInput,
  RetryStuckAgentInputOptions,
  RetryStuckAgentInputResult
} from "../shared/delivery/tmuxDeliveryContract.js";

export type EmitDeliveryNotificationAckPort = (
  input: EmitDeliveryNotificationInput
) => Promise<DeliveryAck>;

export type ResolveDeliveryMessageRefPort = (
  input: ResolveDeliveryMessageRefInput
) => string;

export type RetryStuckAgentInputPort = (
  input: TmuxDeliveryContract.RetryStuckAgentInputOptions
) => Promise<TmuxDeliveryContract.RetryStuckAgentInputResult>;
