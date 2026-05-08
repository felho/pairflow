import type { BubbleConfig } from "../../shared/config/bubbleConfigTypes.js";

export type AskHumanBubbleNotificationKind = "waiting-human" | "converged";

export type EmitAskHumanBubbleNotificationPort = (
  config: BubbleConfig,
  kind: AskHumanBubbleNotificationKind
) => Promise<unknown>;
