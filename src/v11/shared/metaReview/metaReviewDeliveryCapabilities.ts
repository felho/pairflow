import type {
  DeliveryAck,
  EmitDeliveryNotificationInput,
  ResolveDeliveryMessageRefInput
} from "../delivery/tmuxDeliveryContract.js";

export type MetaReviewDeliveryEmitter = (
  input: EmitDeliveryNotificationInput
) => Promise<DeliveryAck>;

export type MetaReviewDeliveryMessageRefBuilder = (
  input: ResolveDeliveryMessageRefInput
) => string;
