import {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import {
  runPassValidationCommand
} from "../../infrastructure/executor/validation/passValidationCommandRunner.js";

export const metaReviewDefaults = {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef,
  runPassValidationCommand
} as const;
