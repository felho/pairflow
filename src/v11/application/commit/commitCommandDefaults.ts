import { writeFile } from "node:fs/promises";

import { ensureBubbleInstanceIdForMutation } from "../../defaults/bubbleIdentity/bubbleIdentityDefaults.js";
import { runGit } from "../../defaults/git/gitDefaults.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import { readRemotePointer } from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { executeRemoteBubbleCommitCommand } from "../../infrastructure/executor/ssh/sshBubbleCommitCommand.js";
import { statusCommandDependencyDefaults } from "../../shared/status/statusCommandDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../shared/transcript/transcriptDependencyDefaults.js";

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
