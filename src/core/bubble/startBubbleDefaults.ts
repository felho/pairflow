import {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace
} from "../../v11/infrastructure/workspace/worktreeManager.js";
import {
  launchBubbleTmuxSession,
  terminateBubbleTmuxSession
} from "../runtime/tmuxManager.js";
import { claimRuntimeSession, removeRuntimeSession } from "../runtime/sessionsRegistry.js";
import { writeStateSnapshot } from "../state/stateStore.js";
import type { StartBubbleDependencies } from "../../v11/application/start/startCommandContract.js";

export interface StartBubbleDependencyDefaults {
  bootstrapWorktreeWorkspace: NonNullable<
    StartBubbleDependencies["bootstrapWorktreeWorkspace"]
  >;
  cleanupWorktreeWorkspace: NonNullable<
    StartBubbleDependencies["cleanupWorktreeWorkspace"]
  >;
  launchBubbleTmuxSession: NonNullable<
    StartBubbleDependencies["launchBubbleTmuxSession"]
  >;
  terminateBubbleTmuxSession: NonNullable<
    StartBubbleDependencies["terminateBubbleTmuxSession"]
  >;
  claimRuntimeSession: NonNullable<
    StartBubbleDependencies["claimRuntimeSession"]
  >;
  removeRuntimeSession: NonNullable<
    StartBubbleDependencies["removeRuntimeSession"]
  >;
  writeStateSnapshot: NonNullable<
    StartBubbleDependencies["writeStateSnapshot"]
  >;
}

export const startBubbleDependencyDefaults: StartBubbleDependencyDefaults = {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace,
  launchBubbleTmuxSession,
  terminateBubbleTmuxSession,
  claimRuntimeSession,
  removeRuntimeSession,
  writeStateSnapshot
};
