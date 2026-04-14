import type {
  EmitTmuxDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationResult,
  ResolveDeliveryMessageRefInput
} from "../delivery/tmuxDeliveryContract.js";
import type * as TmuxDeliveryContract from "../delivery/tmuxDeliveryContract.js";

export type {
  DeliveryTargetReasonCode,
  EmitTmuxDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationResult,
  ResolveDeliveryMessageRefInput,
  RetryStuckAgentInputOptions,
  RetryStuckAgentInputResult,
  TmuxDeliveryAck,
  TmuxDeliveryAckReasonCode,
  TmuxDeliveryAckStatus,
  TmuxDeliveryFailureReason
} from "../delivery/tmuxDeliveryContract.js";

export type EmitTmuxDeliveryNotificationPort = (
  input: EmitTmuxDeliveryNotificationInput
) => Promise<EmitTmuxDeliveryNotificationResult>;

export type ResolveDeliveryMessageRefPort = (
  input: ResolveDeliveryMessageRefInput
) => string;

export type RetryStuckAgentInputPort = (
  input: TmuxDeliveryContract.RetryStuckAgentInputOptions
) => Promise<TmuxDeliveryContract.RetryStuckAgentInputResult>;
