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
  TmuxDeliveryFailureReason
} from "../delivery/tmuxDeliveryContract.js";

export type EmitTmuxDeliveryNotificationPort = (
  input: EmitTmuxDeliveryNotificationInput
) => Promise<EmitTmuxDeliveryNotificationResult>;

export type ResolveDeliveryMessageRefPort = (
  input: ResolveDeliveryMessageRefInput
) => string;
