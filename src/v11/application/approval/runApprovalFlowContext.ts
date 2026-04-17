import type {
  BubbleRemotePointerStarted,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { RemoteBubbleStatusTarget } from "../../infrastructure/executor/ssh/sshBubbleStatus.js";
import type { ResolvedApprovalCommandDependencies } from "./approvalCommandDependencyResolution.js";

export interface LocalApprovalFlowExecutionContext {
  route: "local";
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  loadedState: Awaited<ReturnType<ResolvedApprovalCommandDependencies["readStateSnapshot"]>>;
  state: BubbleStateSnapshot;
  nowIso: string;
  lockPath: string;
}

export interface RemoteApprovalFlowExecutionContext {
  route: "remote";
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  remotePointer: BubbleRemotePointerStarted;
  remoteTarget: RemoteBubbleStatusTarget;
  nowIso: string;
  lockPath: string;
}

export type ApprovalFlowExecutionContext =
  | LocalApprovalFlowExecutionContext
  | RemoteApprovalFlowExecutionContext;

export async function initializeApprovalFlowExecutionContext(input: {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now: Date;
  createError: PairflowCreateCommandError;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<ApprovalFlowExecutionContext> {
  const resolved = await input.dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const nowIso = input.now.toISOString();
  const lockPath = `${resolved.bubblePaths.locksDir}/${resolved.bubbleId}.lock`;

  if (resolved.bubbleConfig.executor?.type === "ssh") {
    const remotePointer = await input.dependencies.readRemotePointer(
      resolved.bubblePaths.remotePointerPath
    );

    if (remotePointer?.kind !== "started") {
      throw input.createError({
        reasonCode: "APPROVAL_REMOTE_START_REQUIRED",
        message:
          `Remote approval for '${resolved.bubbleId}' requires a started remote pointer. Run \`pairflow bubble start --id ${resolved.bubbleId}\` first.`,
        context: {
          command_name: "approval",
          bubble_id: resolved.bubbleId,
          remote_pointer_kind: remotePointer?.kind ?? "missing"
        }
      });
    }

    const remoteTarget = await input.dependencies.resolveRemoteBubbleStatusTarget({
      bubbleId: resolved.bubbleId,
      remoteAlias: resolved.bubbleConfig.executor.remote,
      expectedHost: remotePointer.host
    });

    return {
      route: "remote",
      resolved,
      remotePointer,
      remoteTarget,
      nowIso,
      lockPath
    };
  }

  const loadedState = await input.dependencies.readStateSnapshot(
    resolved.bubblePaths.statePath
  );

  return {
    route: "local",
    resolved,
    loadedState,
    state: loadedState.state,
    nowIso,
    lockPath
  };
}
