import type {
  EmitTmuxDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationResult,
  ResolveDeliveryMessageRefInput
} from "../delivery/tmuxDeliveryContract.js";

export type MetaReviewDeliveryEmitter = (
  input: EmitTmuxDeliveryNotificationInput
) => Promise<EmitTmuxDeliveryNotificationResult>;

export type MetaReviewDeliveryMessageRefBuilder = (
  input: ResolveDeliveryMessageRefInput
) => string;
