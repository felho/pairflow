import type { emitTmuxDeliveryNotification } from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface EmitHumanReplyInput {
  bubbleId: string;
  message: string;
  refs?: string[];
  repoPath?: string;
  cwd?: string;
  now?: Date;
}

export interface EmitHumanReplyResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
}

export interface EmitHumanReplyDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
}
