import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer,
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import type {
  StartBubbleDependencies,
  ExecuteRemoteBubbleStartInput,
  ExecuteRemoteBubbleStartResult
} from "./startCommandContract.js";

export interface StartBubbleDependencyDefaults {
  bootstrapWorktreeWorkspace:
    NonNullable<StartBubbleDependencies["bootstrapWorktreeWorkspace"]>;
  cleanupWorktreeWorkspace:
    NonNullable<StartBubbleDependencies["cleanupWorktreeWorkspace"]>;
  launchBubbleSessionAck:
    NonNullable<StartBubbleDependencies["launchBubbleSessionAck"]>;
  terminateBubbleTmuxSession:
    NonNullable<StartBubbleDependencies["terminateBubbleTmuxSession"]>;
  readRuntimeSessionsRegistry:
    NonNullable<StartBubbleDependencies["readRuntimeSessionsRegistry"]>;
  claimRuntimeSession:
    NonNullable<StartBubbleDependencies["claimRuntimeSession"]>;
  upsertRuntimeSession:
    NonNullable<StartBubbleDependencies["upsertRuntimeSession"]>;
  removeRuntimeSession:
    NonNullable<StartBubbleDependencies["removeRuntimeSession"]>;
  writeStateSnapshot:
    NonNullable<StartBubbleDependencies["writeStateSnapshot"]>;
  loadPairflowGlobalConfig: () => Promise<PairflowGlobalConfig>;
  runGitCommand: NonNullable<StartBubbleDependencies["runGitCommand"]>;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  writeRemotePointer: (
    path: string,
    value: BubbleRemotePointer
  ) => Promise<void>;
  writeRemoteStateCache: (
    path: string,
    value: BubbleRemoteStateCache
  ) => Promise<void>;
  removeRemoteStateCache: (path: string) => Promise<void>;
  executeRemoteBubbleStart: (
    input: ExecuteRemoteBubbleStartInput
  ) => Promise<ExecuteRemoteBubbleStartResult>;
  readReviewerBriefArtifact:
    NonNullable<StartBubbleDependencies["readReviewerBriefArtifact"]>;
  readReviewerFocusArtifact:
    NonNullable<StartBubbleDependencies["readReviewerFocusArtifact"]>;
  resolveDocContractGateArtifactPath:
    NonNullable<StartBubbleDependencies["resolveDocContractGateArtifactPath"]>;
  resolveReviewerTestExecutionDirective:
    NonNullable<StartBubbleDependencies["resolveReviewerTestExecutionDirective"]>;
}

interface StartBubbleDependencyDefaultsModule {
  startBubbleDependencyDefaults: StartBubbleDependencyDefaults;
}

let startBubbleDependencyDefaultsPromise:
  | Promise<StartBubbleDependencyDefaults>
  | undefined;

function getStartBubbleDependencyDefaultsModulePath(): string {
  return "../../defaults/start/startBubbleDefaults.js";
}

export async function loadStartBubbleDependencyDefaults():
  Promise<StartBubbleDependencyDefaults> {
  startBubbleDependencyDefaultsPromise ??= import(
    getStartBubbleDependencyDefaultsModulePath()
  ).then(
    (module) =>
      (module as StartBubbleDependencyDefaultsModule).startBubbleDependencyDefaults
  );
  return startBubbleDependencyDefaultsPromise;
}
