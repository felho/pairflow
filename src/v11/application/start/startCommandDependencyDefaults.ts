import { readTranscriptEnvelopes } from "../../shared/transcript/transcriptDependencyDefaults.js";
import { runTmux as runTmuxShared } from "../../shared/tmux/tmuxRunner.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type { RegisterRepoInRegistryPort } from "../../shared/ports/repoRegistry.js";
import type { ReadStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";
import type { TmuxRunner } from "../../shared/ports/tmuxSessions.js";
import {
  resolveBubbleById
} from "../../shared/bubbleLookup/bubbleLookupDefaults.js";

interface StartCliDependencyDefaults {
  registerRepoInRegistry: RegisterRepoInRegistryPort;
}

interface StartCommandContextDefaults {
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

export async function runTmux(
  ...args: Parameters<RunTmuxPort>
): Promise<Awaited<ReturnType<RunTmuxPort>>> {
  return runTmuxShared(...args);
}

export const startCliDependencyDefaults = {
  resolveBubbleById,
  async registerRepoInRegistry(
    ...args: Parameters<StartCliDependencyDefaults["registerRepoInRegistry"]>
  ) {
    const defaults = await loadStartCliDependencyDefaults();
    return defaults.registerRepoInRegistry(...args);
  }
} as const;

export const startCommandContextDefaults = {
  resolveBubbleById,
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
