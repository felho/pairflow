import type {
  loadPairflowGlobalConfig
} from "../../../config/pairflowConfig.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type { ProcessSpawnPort } from "../../ports/processSpawn.js";
import type {
  BubbleRemotePointer
} from "../../shared/remote/remoteExecutionTypes.js";

export interface OpenBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface OpenCommandExecutionInput {
  command: string;
  cwd: string;
}

export interface OpenCommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type OpenCommandExecutor = (
  input: OpenCommandExecutionInput
) => Promise<OpenCommandExecutionResult>;

export interface OpenBubbleDependencies {
  executeOpenCommand?: OpenCommandExecutor;
  processSpawn?: ProcessSpawnPort;
  resolveBubbleById?: ResolveBubbleByIdPort;
  assertWorktreeExists?: (worktreePath: string) => Promise<void>;
  loadPairflowGlobalConfig?: () => ReturnType<typeof loadPairflowGlobalConfig>;
  readRemotePointer?: (
    path: string
  ) => Promise<BubbleRemotePointer | null>;
}
