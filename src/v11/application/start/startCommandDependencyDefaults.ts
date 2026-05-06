import { readTranscriptEnvelopes } from "../../shared/transcript/transcriptDependencyDefaults.js";
import { ensureBubbleInstanceIdForMutation } from "../../shared/bubbleIdentity/bubbleIdentityDefaults.js";
import { runTmux as runTmuxDefaults } from "../../shared/tmux/tmuxRunnerDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDependencyDefaults.js";
import {
  resolveBubbleById
} from "../bubbleLookup/bubbleLookupDependencyDefaults.js";
import {
  registerRepoInRegistry
} from "../../shared/repoRegistry/repoRegistryDefaults.js";
import type { TmuxRunner } from "../../shared/ports/tmuxSessions.js";

type RunTmuxPort = TmuxRunner;

export async function runTmux(
  ...args: Parameters<RunTmuxPort>
): Promise<Awaited<ReturnType<RunTmuxPort>>> {
  return runTmuxDefaults(...args);
}

export const startCliDependencyDefaults = {
  resolveBubbleById,
  registerRepoInRegistry
} as const;

export const startCommandContextDefaults = {
  resolveBubbleById,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;

export { readTranscriptEnvelopes };
