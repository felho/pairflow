import { terminateBubbleTmuxSession as terminateBubbleTmuxSessionCanonical } from "../../infrastructure/channel/tmux/tmuxManager.js";
import type { TerminateBubbleTmuxSessionPort } from "../../shared/ports/tmuxSessions.js";

export const terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort = async (
  ...args
) => terminateBubbleTmuxSessionCanonical(...args);
