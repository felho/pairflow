import type {
  StartBubbleDependencyDefaults
} from "../../defaults/start/startBubbleDefaults.js";

let startBubbleDependencyDefaultsPromise:
  | Promise<StartBubbleDependencyDefaults>
  | undefined;

export async function loadStartBubbleDependencyDefaults():
  Promise<StartBubbleDependencyDefaults> {
  startBubbleDependencyDefaultsPromise ??= import(
    "../../defaults/start/startBubbleDefaults.js"
  ).then(({ startBubbleDependencyDefaults }) => ({
    bootstrapWorktreeWorkspace:
      startBubbleDependencyDefaults.bootstrapWorktreeWorkspace,
    cleanupWorktreeWorkspace:
      startBubbleDependencyDefaults.cleanupWorktreeWorkspace,
    launchBubbleSessionAck:
      startBubbleDependencyDefaults.launchBubbleSessionAck,
    terminateBubbleTmuxSession:
      startBubbleDependencyDefaults.terminateBubbleTmuxSession,
    readRuntimeSessionsRegistry:
      startBubbleDependencyDefaults.readRuntimeSessionsRegistry,
    claimRuntimeSession:
      startBubbleDependencyDefaults.claimRuntimeSession,
    upsertRuntimeSession:
      startBubbleDependencyDefaults.upsertRuntimeSession,
    removeRuntimeSession:
      startBubbleDependencyDefaults.removeRuntimeSession,
    writeStateSnapshot:
      startBubbleDependencyDefaults.writeStateSnapshot,
    loadPairflowGlobalConfig:
      startBubbleDependencyDefaults.loadPairflowGlobalConfig,
    runGitCommand:
      startBubbleDependencyDefaults.runGitCommand,
    readRemotePointer:
      startBubbleDependencyDefaults.readRemotePointer,
    writeRemotePointer:
      startBubbleDependencyDefaults.writeRemotePointer,
    writeRemoteStateCache:
      startBubbleDependencyDefaults.writeRemoteStateCache,
    removeRemoteStateCache:
      startBubbleDependencyDefaults.removeRemoteStateCache,
    executeRemoteBubbleStart:
      startBubbleDependencyDefaults.executeRemoteBubbleStart
  }));
  return startBubbleDependencyDefaultsPromise;
}
