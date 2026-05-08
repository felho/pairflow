import type { BubbleConfig } from "../config/bubbleConfigTypes.js";

export type BubbleNotificationKind = "waiting-human" | "converged";

export interface BubbleNotificationResult {
  kind: BubbleNotificationKind;
  attempted: boolean;
  delivered: boolean;
  soundPath: string | null;
  reason:
    | null
    | "disabled"
    | "no_sound_configured"
    | "sound_missing"
    | "play_failed";
}

export type EmitBubbleNotification = (
  config: BubbleConfig,
  kind: BubbleNotificationKind
) => Promise<BubbleNotificationResult>;
