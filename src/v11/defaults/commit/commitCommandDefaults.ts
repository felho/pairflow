import { writeFile } from "node:fs/promises";

import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { runGit } from "../../infrastructure/workspace/git.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { statusCommandDependencyDefaults } from "../status/statusCommandDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../transcript/transcriptDependencyDefaults.js";
import type { CommitBubbleDependencies } from "../../application/commit/commitCommandApiContract.js";

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
let remoteCommitContinuityImportCommandModulePromise:
  | Promise<{
      importRemoteBubbleCommitContinuity:
        CommitBubbleDependencies["importRemoteBubbleCommitContinuity"];
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

function getRemoteCommitContinuityImportCommandModulePath(): string {
  return [
    "..",
    "..",
    "infrastructure",
    "executor",
    "ssh",
    "sshBubbleCommitContinuityImportCommand.js"
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

async function loadRemoteCommitContinuityImportCommandModule(): Promise<{
  importRemoteBubbleCommitContinuity:
    CommitBubbleDependencies["importRemoteBubbleCommitContinuity"];
}> {
  remoteCommitContinuityImportCommandModulePromise ??=
    import(getRemoteCommitContinuityImportCommandModulePath()) as Promise<{
      importRemoteBubbleCommitContinuity:
        CommitBubbleDependencies["importRemoteBubbleCommitContinuity"];
    }>;
  return remoteCommitContinuityImportCommandModulePromise;
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

const importRemoteBubbleCommitContinuity:
  CommitBubbleDependencies["importRemoteBubbleCommitContinuity"] =
    async (input) => {
      const module = await loadRemoteCommitContinuityImportCommandModule();
      return module.importRemoteBubbleCommitContinuity(input);
    };

export const commitBubbleDependencyDefaults = {
  appendProtocolEnvelope,
  executeRemoteBubbleCommitCommand,
  importRemoteBubbleCommitContinuity,
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
