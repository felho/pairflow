import {
  resolveBubbleById
} from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import type { BubbleRemotePointer } from "../../../types/bubble.js";

let remoteExecutionArtifactsModulePromise:
  | Promise<{
      readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
    }>
  | undefined;

function getRemoteExecutionArtifactsModulePath(): string {
  return [
    "..",
    "..",
    "infrastructure",
    "artifact",
    "bubble",
    "remoteExecutionArtifacts.js"
  ].join("/");
}

async function loadRemoteExecutionArtifactsModule(): Promise<{
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
}> {
  remoteExecutionArtifactsModulePromise ??=
    import(getRemoteExecutionArtifactsModulePath()) as Promise<{
      readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
    }>;
  return remoteExecutionArtifactsModulePromise;
}

const readRemotePointer = async (
  path: string
): Promise<BubbleRemotePointer | null> => {
  const module = await loadRemoteExecutionArtifactsModule();
  return module.readRemotePointer(path);
};

export const openBubbleDefaults = {
  resolveBubbleById,
  readRemotePointer
} as const;
