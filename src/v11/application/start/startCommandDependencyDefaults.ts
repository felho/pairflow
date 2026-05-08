import { loadStartBubbleDependencyDefaults } from "./startBubbleDependencyDefaults.js";
import type { TmuxRunner } from "../../ports/tmuxSessions.js";
import type { WriteStateSnapshotPort } from "../../ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../ports/transcript.js";

type RunTmuxPort = TmuxRunner;

export async function runTmux(
  ...args: Parameters<RunTmuxPort>
): Promise<Awaited<ReturnType<RunTmuxPort>>> {
  const defaults = loadStartBubbleDependencyDefaults();
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
  const defaults = loadStartBubbleDependencyDefaults();
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
  const defaults = loadStartBubbleDependencyDefaults();
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
  const defaults = loadStartBubbleDependencyDefaults();
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
  const defaults = loadStartBubbleDependencyDefaults();
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
  const defaults = loadStartBubbleDependencyDefaults();
  return defaults.readStateSnapshot(...args);
}

export async function readRemotePointer(
  ...args: Parameters<
    Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["readRemotePointer"]
  >
): Promise<
  Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["readRemotePointer"]
    >
  >
> {
  const defaults = loadStartBubbleDependencyDefaults();
  return defaults.readRemotePointer(...args);
}

export async function resolveRemoteBubbleStatusTarget(
  ...args: Parameters<
    Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["resolveRemoteBubbleStatusTarget"]
  >
): Promise<
  Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadStartBubbleDependencyDefaults>>["resolveRemoteBubbleStatusTarget"]
    >
  >
> {
  const defaults = loadStartBubbleDependencyDefaults();
  return defaults.resolveRemoteBubbleStatusTarget(...args);
}

export const writeStateSnapshot: WriteStateSnapshotPort = async (...args) => {
  const defaults = loadStartBubbleDependencyDefaults();
  const { writeStateSnapshot: persistStateSnapshot } = defaults;
  return persistStateSnapshot(...args);
};

export const appendProtocolEnvelope: AppendProtocolEnvelopePort = async (...args) => {
  const defaults = loadStartBubbleDependencyDefaults();
  const { appendProtocolEnvelope: appendEnvelope } = defaults;
  return appendEnvelope(...args);
};

export const readTranscriptEnvelopes: ReadTranscriptEnvelopesPort = async (...args) => {
  const defaults = loadStartBubbleDependencyDefaults();
  return defaults.readTranscriptEnvelopes(...args);
};

export const startCommandContextDefaults = {
  appendProtocolEnvelope,
  resolveBubbleById,
  ensureBubbleInstanceIdForMutation,
  inspectStateSnapshot,
  readRemotePointer,
  readTranscriptEnvelopes,
  readStateSnapshot,
  resolveRemoteBubbleStatusTarget,
  resolveBubbleFromWorkspaceCwd,
  writeStateSnapshot
} as const;
