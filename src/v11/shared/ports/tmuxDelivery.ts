import type {
  EmitTmuxDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationResult,
  ResolveDeliveryMessageRefInput
} from "../delivery/tmuxDeliveryContract.js";

export type {
  DeliveryTargetReasonCode,
  EmitTmuxDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationResult,
  ResolveDeliveryMessageRefInput,
  RetryStuckAgentInputOptions,
  RetryStuckAgentInputResult,
  TmuxDeliveryFailureReason
} from "../delivery/tmuxDeliveryContract.js";

export type EmitTmuxDeliveryNotificationPort = (
  input: EmitTmuxDeliveryNotificationInput
) => Promise<EmitTmuxDeliveryNotificationResult>;

export type ResolveDeliveryMessageRefPort = (
  input: ResolveDeliveryMessageRefInput
) => string;

export type RetryStuckAgentInputPort = (
  input: import("../delivery/tmuxDeliveryContract.js").RetryStuckAgentInputOptions
) => Promise<import("../delivery/tmuxDeliveryContract.js").RetryStuckAgentInputResult>;
