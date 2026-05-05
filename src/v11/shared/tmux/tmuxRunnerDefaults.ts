import type { TmuxRunner } from "../ports/tmuxSessions.js";
import { runTmux as runTmuxDefaults } from "../../defaults/tmux/tmuxRunnerDefaults.js";

export const runTmux: TmuxRunner = async (...args) => runTmuxDefaults(...args);
