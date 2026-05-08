import type { TmuxRunner } from "../../ports/tmuxSessions.js";
import { runTmux as runTmuxCanonical } from "../../infrastructure/channel/tmux/tmuxRunner.js";

export const runTmux: TmuxRunner = async (...args) => runTmuxCanonical(...args);
