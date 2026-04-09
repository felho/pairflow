import { readTranscriptEnvelopes } from "../../shared/transcript/transcriptDependencyDefaults.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type { RegisterRepoInRegistryPort } from "../../shared/ports/repoRegistry.js";
import type { ReadStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";
import type { TmuxRunner } from "../../shared/ports/tmuxSessions.js";

interface StartCliDependencyDefaults {
  resolveBubbleById: ResolveBubbleByIdPort;
  registerRepoInRegistry: RegisterRepoInRegistryPort;
}

interface StartCommandContextDefaults {
  resolveBubbleById: ResolveBubbleByIdPort;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  readStateSnapshot: ReadStateSnapshotPort;
}

type RunTmuxPort = TmuxRunner;

let startCliDependencyDefaultsPromise:
  | Promise<StartCliDependencyDefaults>
  | undefined;
let startCommandContextDefaultsPromise:
  | Promise<StartCommandContextDefaults>
  | undefined;
let tmuxManagerPromise: Promise<{ runTmux: RunTmuxPort }> | undefined;

async function loadStartCliDependencyDefaults(): Promise<
  StartCliDependencyDefaults
> {
  startCliDependencyDefaultsPromise ??= import(
    "../../../core/bubble/startCliDefaults.js"
  ).then(({ startCliDependencyDefaults }) => startCliDependencyDefaults);
  return startCliDependencyDefaultsPromise;
}

async function loadStartCommandContextDefaults(): Promise<
  StartCommandContextDefaults
> {
  startCommandContextDefaultsPromise ??= import(
    "../../../core/bubble/startCommandContextDefaults.js"
  ).then(({ startCommandContextDefaults }) => startCommandContextDefaults);
  return startCommandContextDefaultsPromise;
}

async function loadTmuxManager(): Promise<{ runTmux: RunTmuxPort }> {
  tmuxManagerPromise ??= import("../../../core/runtime/tmuxManager.js").then(
    ({ runTmux }) => ({ runTmux })
  );
  return tmuxManagerPromise;
}

export async function runTmux(
  ...args: Parameters<RunTmuxPort>
): Promise<Awaited<ReturnType<RunTmuxPort>>> {
  const { runTmux: runTmuxImpl } = await loadTmuxManager();
  return runTmuxImpl(...args);
}

export const startCliDependencyDefaults = {
  async resolveBubbleById(
    ...args: Parameters<StartCliDependencyDefaults["resolveBubbleById"]>
  ) {
    const defaults = await loadStartCliDependencyDefaults();
    return defaults.resolveBubbleById(...args);
  },
  async registerRepoInRegistry(
    ...args: Parameters<StartCliDependencyDefaults["registerRepoInRegistry"]>
  ) {
    const defaults = await loadStartCliDependencyDefaults();
    return defaults.registerRepoInRegistry(...args);
  }
} as const;

export const startCommandContextDefaults = {
  async resolveBubbleById(
    ...args: Parameters<StartCommandContextDefaults["resolveBubbleById"]>
  ) {
    const defaults = await loadStartCommandContextDefaults();
    return defaults.resolveBubbleById(...args);
  },
  async ensureBubbleInstanceIdForMutation(
    ...args: Parameters<StartCommandContextDefaults["ensureBubbleInstanceIdForMutation"]>
  ) {
    const defaults = await loadStartCommandContextDefaults();
    return defaults.ensureBubbleInstanceIdForMutation(...args);
  },
  async readStateSnapshot(
    ...args: Parameters<StartCommandContextDefaults["readStateSnapshot"]>
  ) {
    const defaults = await loadStartCommandContextDefaults();
    return defaults.readStateSnapshot(...args);
  }
} as const;

export { readTranscriptEnvelopes };
