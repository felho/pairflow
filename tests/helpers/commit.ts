import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../../src/v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { readRemotePointer } from "../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { executeRemoteBubbleCommitCommand } from "../../src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.js";
import { importRemoteBubbleCommitContinuity } from "../../src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.js";
import { resolveBubbleById } from "../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import {
  readStateSnapshot as readStateSnapshotPersisted,
  writeStateSnapshot as writeStateSnapshotPersisted
} from "../../src/v11/infrastructure/state/stateStore.js";
import {
} from "../../src/v11/shared/mutation/mutationBoundaryIO.js";
import { runGit } from "../../src/v11/infrastructure/workspace/git.js";
import { statusCommandDependencyDefaults } from "../../src/v11/defaults/status/statusCommandDependencyDefaults.js";
import type { CommitBubbleDependencies } from "../../src/v11/application/commit/commitCommandApiContract.js";
import { rename, writeFile } from "node:fs/promises";

export function buildCommitBubbleDependencies(): CommitBubbleDependencies {
  return {
    appendProtocolEnvelope,
    executeRemoteBubbleCommitCommand,
    importRemoteBubbleCommitContinuity,
    ensureBubbleInstanceIdForMutation,
    readRemotePointer,
    readStateSnapshot: readStateSnapshotPersisted,
    readTranscriptEnvelopes,
    resolveRemoteBubbleStatusTarget:
      statusCommandDependencyDefaults.resolveRemoteBubbleStatusTarget,
    resolveBubbleById,
    runGit,
    renamePath: rename,
    writeTextFile: async (path: string, content: string) => {
      await writeFile(path, content, "utf8");
    },
    writeStateSnapshot: writeStateSnapshotPersisted
  };
}
