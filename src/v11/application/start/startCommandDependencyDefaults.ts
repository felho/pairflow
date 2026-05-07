import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";
import { loadStartBubbleDependencyDefaults } from "./startBubbleDependencyDefaults.js";
import type { TmuxRunner } from "../../shared/ports/tmuxSessions.js";
import type { WriteStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";

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

export async function resolveBubbleById(
  ...args: Parameters<
    Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["resolveBubbleById"]
  >
): Promise<
  Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["resolveBubbleById"]
    >
  >
> {
  const defaults = await loadStartBubbleDependencyDefaults();
  return defaults.resolveBubbleById(...args);
}

export async function inspectStateSnapshot(
  ...args: Parameters<
    Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["inspectStateSnapshot"]
  >
): Promise<
  Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["inspectStateSnapshot"]
    >
  >
> {
  const defaults = await loadStartBubbleDependencyDefaults();
  return defaults.inspectStateSnapshot(...args);
}

export async function readStateSnapshot(
  ...args: Parameters<
    Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["readStateSnapshot"]
  >
): Promise<
  Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["readStateSnapshot"]
    >
  >
> {
  const defaults = await loadStartBubbleDependencyDefaults();
  return defaults.readStateSnapshot(...args);
}

export const writeStateSnapshot: WriteStateSnapshotPort = async (...args) => {
  const defaults = await loadStartBubbleDependencyDefaults();
  const { writeStateSnapshot: persistStateSnapshot } = defaults;
  return persistStateSnapshot(...args);
};

export const startCommandContextDefaults = {
  resolveBubbleById,
  ensureBubbleInstanceIdForMutation,
  inspectStateSnapshot,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd,
  writeStateSnapshot
} as const;

export { readTranscriptEnvelopes };
