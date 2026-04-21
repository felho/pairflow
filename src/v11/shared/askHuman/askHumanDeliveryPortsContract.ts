import type { BubbleConfig } from "../../../types/bubble.js";

export type AskHumanBubbleNotificationKind = "waiting-human" | "converged";

export type EmitAskHumanBubbleNotificationPort = (
  config: BubbleConfig,
  kind: AskHumanBubbleNotificationKind
) => Promise<unknown>;
