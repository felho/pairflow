import { terminateBubbleTmuxSession as terminateBubbleTmuxSessionCanonical } from "../../infrastructure/channel/tmux/tmuxManager.js";
import type { TerminateBubbleTmuxSessionPort } from "../../ports/tmuxSessions.js";

export const terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort = async (
  ...args
) => terminateBubbleTmuxSessionCanonical(...args);
