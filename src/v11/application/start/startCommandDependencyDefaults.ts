import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDependencyDefaults.js";
import {
  resolveBubbleById
} from "../bubbleLookup/bubbleLookupDependencyDefaults.js";
import { loadStartBubbleDependencyDefaults } from "./startBubbleDependencyDefaults.js";
import type { TmuxRunner } from "../../shared/ports/tmuxSessions.js";

type RunTmuxPort = TmuxRunner;

export async function runTmux(
  ...args: Parameters<RunTmuxPort>
): Promise<Awaited<ReturnType<RunTmuxPort>>> {
  const defaults = await loadStartBubbleDependencyDefaults();
  return defaults.runTmux(...args);
}

export async function resolveBubbleFromWorkspaceCwd(
  ...args: Parameters<
    Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["resolveBubbleFromWorkspaceCwd"]
  >
): Promise<
  Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["resolveBubbleFromWorkspaceCwd"]
    >
  >
> {
  const defaults = await loadStartBubbleDependencyDefaults();
  return defaults.resolveBubbleFromWorkspaceCwd(...args);
}

export async function ensureBubbleInstanceIdForMutation(
  ...args: Parameters<
    Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["ensureBubbleInstanceIdForMutation"]
  >
): Promise<
  Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["ensureBubbleInstanceIdForMutation"]
    >
  >
> {
  const defaults = await loadStartBubbleDependencyDefaults();
  return defaults.ensureBubbleInstanceIdForMutation(...args);
}

export const startCommandContextDefaults = {
  resolveBubbleById,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} as const;

export { readTranscriptEnvelopes };
