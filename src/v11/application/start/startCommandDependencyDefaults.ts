import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";
import { ensureBubbleInstanceIdForMutation } from "../bubbleIdentity/bubbleIdentityDependencyDefaults.js";
import { runTmux as runTmuxDefaults } from "../tmux/tmuxRunnerDependencyDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDependencyDefaults.js";
import {
  resolveBubbleById
} from "../bubbleLookup/bubbleLookupDependencyDefaults.js";
import type { TmuxRunner } from "../../shared/ports/tmuxSessions.js";

type RunTmuxPort = TmuxRunner;

export async function runTmux(
  ...args: Parameters<RunTmuxPort>
): Promise<Awaited<ReturnType<RunTmuxPort>>> {
  return runTmuxDefaults(...args);
}

export const startCommandContextDefaults = {
  resolveBubbleById,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;

export { readTranscriptEnvelopes };
