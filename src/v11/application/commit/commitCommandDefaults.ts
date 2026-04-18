import { writeFile } from "node:fs/promises";

import { ensureBubbleInstanceIdForMutation } from "../../defaults/bubbleIdentity/bubbleIdentityDefaults.js";
import { runGit } from "../../defaults/git/gitDefaults.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import { statusCommandDependencyDefaults } from "../../shared/status/statusCommandDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../shared/transcript/transcriptDependencyDefaults.js";
import type { CommitBubbleDependencies } from "./commitCommandApiContract.js";

let remoteExecutionArtifactsModulePromise:
  | Promise<{
      readRemotePointer: CommitBubbleDependencies["readRemotePointer"];
    }>
  | undefined;
let remoteCommitCommandModulePromise:
  | Promise<{
      executeRemoteBubbleCommitCommand:
        CommitBubbleDependencies["executeRemoteBubbleCommitCommand"];
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

function getRemoteCommitCommandModulePath(): string {
  return [
    "..",
    "..",
    "infrastructure",
    "executor",
    "ssh",
    "sshBubbleCommitCommand.js"
  ].join("/");
}

async function loadRemoteExecutionArtifactsModule(): Promise<{
  readRemotePointer: CommitBubbleDependencies["readRemotePointer"];
}> {
  remoteExecutionArtifactsModulePromise ??=
    import(getRemoteExecutionArtifactsModulePath()) as Promise<{
      readRemotePointer: CommitBubbleDependencies["readRemotePointer"];
    }>;
  return remoteExecutionArtifactsModulePromise;
}

async function loadRemoteCommitCommandModule(): Promise<{
  executeRemoteBubbleCommitCommand:
    CommitBubbleDependencies["executeRemoteBubbleCommitCommand"];
}> {
  remoteCommitCommandModulePromise ??=
    import(getRemoteCommitCommandModulePath()) as Promise<{
      executeRemoteBubbleCommitCommand:
        CommitBubbleDependencies["executeRemoteBubbleCommitCommand"];
    }>;
  return remoteCommitCommandModulePromise;
}

const readRemotePointer: CommitBubbleDependencies["readRemotePointer"] =
  async (path) => {
    const module = await loadRemoteExecutionArtifactsModule();
    return module.readRemotePointer(path);
  };

const executeRemoteBubbleCommitCommand:
  CommitBubbleDependencies["executeRemoteBubbleCommitCommand"] =
    async (input) => {
      const module = await loadRemoteCommitCommandModule();
      return module.executeRemoteBubbleCommitCommand(input);
    };

export const commitBubbleDependencyDefaults = {
  appendProtocolEnvelope,
  executeRemoteBubbleCommitCommand,
  ensureBubbleInstanceIdForMutation,
  readRemotePointer,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveRemoteBubbleStatusTarget:
    statusCommandDependencyDefaults.resolveRemoteBubbleStatusTarget,
  resolveBubbleById,
  runGit,
  writeTextFile: async (path: string, content: string) => {
    await writeFile(path, content, "utf8");
  },
  writeStateSnapshot
} as const;
