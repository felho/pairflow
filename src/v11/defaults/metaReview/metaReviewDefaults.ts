import {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import {
  runPassValidationCommand
} from "../../infrastructure/executor/validation/passValidationCommandRunner.js";
import {
  readRuntimeSessionsRegistry
} from "../runtimeSessions/runtimeSessionsDefaults.js";

export const metaReviewDefaults = {
  emitDeliveryNotificationAck,
  readRuntimeSessionsRegistry,
  resolveDeliveryMessageRef,
  runPassValidationCommand
} as const;
