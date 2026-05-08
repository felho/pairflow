import type { BubbleConfig } from "../../v11/shared/config/bubbleConfigTypes.js";
import type { ValidationError } from "../../v11/shared/validation/primitives.js";
import { readBoolean, readString } from "./readers.js";

export function validateBubbleNotifications(
  notifications: Record<string, unknown> | undefined,
  errors: ValidationError[]
): BubbleConfig["notifications"] {
  const notificationsEnabled = notifications
    ? (readBoolean(
        notifications,
        "enabled",
        "notifications.enabled",
        errors,
        false
      ) ?? true)
    : true;
  const waitingHumanSound = notifications
    ? readString(
        notifications,
        "waiting_human_sound",
        "notifications.waiting_human_sound",
        errors,
        false
      )
    : undefined;
  const convergedSound = notifications
    ? readString(
        notifications,
        "converged_sound",
        "notifications.converged_sound",
        errors,
        false
      )
    : undefined;

  return {
    enabled: notificationsEnabled,
    ...(waitingHumanSound !== undefined
      ? { waiting_human_sound: waitingHumanSound }
      : {}),
    ...(convergedSound !== undefined
      ? { converged_sound: convergedSound }
      : {})
  };
}
