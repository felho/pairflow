import { readTranscriptEnvelopes } from "../../shared/transcript/transcriptDependencyDefaults.js";

type StartCliDependencyDefaults = typeof import("../../../core/bubble/startCliDefaults.js").startCliDependencyDefaults;
type StartCommandContextDefaults = typeof import("../../../core/bubble/startCommandContextDefaults.js").startCommandContextDefaults;
type RunTmuxPort = typeof import("../../../core/runtime/tmuxManager.js").runTmux;

let startCliDependencyDefaultsPromise: Promise<StartCliDependencyDefaults> | undefined;
let startCommandContextDefaultsPromise:
  | Promise<StartCommandContextDefaults>
  | undefined;
let tmuxManagerPromise:
  | Promise<{ runTmux: RunTmuxPort }>
  | undefined;

async function loadStartCliDependencyDefaults(): Promise<StartCliDependencyDefaults> {
  startCliDependencyDefaultsPromise ??= import(
    "../../../core/bubble/startCliDefaults.js"
  ).then(({ startCliDependencyDefaults }) => startCliDependencyDefaults);
  return startCliDependencyDefaultsPromise;
}

async function loadStartCommandContextDefaults(): Promise<StartCommandContextDefaults> {
  startCommandContextDefaultsPromise ??= import(
    "../../../core/bubble/startCommandContextDefaults.js"
  ).then(({ startCommandContextDefaults }) => startCommandContextDefaults);
  return startCommandContextDefaultsPromise;
}

async function loadTmuxManager(): Promise<{ runTmux: RunTmuxPort }> {
  tmuxManagerPromise ??= import("../../../core/runtime/tmuxManager.js");
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
